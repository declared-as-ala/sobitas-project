<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\Categ;
use App\Models\ExternalCatalogProduct;
use App\Models\Product;
use App\Models\SousCategory;
use App\Services\Catalog\BrandMatcher;
use App\Services\Catalog\IHerb\IHerbClient;
use App\Services\Catalog\ImportedProductContent;
use App\Services\Catalog\PromotionGate;
use App\Support\BrandKey;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Turn hydrated staging rows into real products. The one customer-visible step of the import.
 *
 * ── WHY THIS IS A COMMAND SOMEBODY RUNS AND NOT A SCHEDULED JOB ───────────────────────────
 * Discovery and hydration are scheduled (config/catalog.php `autorun`) because they cannot hurt
 * anything: both write only to `external_catalog_products`, no product is created, no URL appears.
 * This one creates rows in `products`. It is deliberately absent from routes/console.php and should
 * stay absent — an import that publishes itself is an import nobody decided to run.
 *
 * ── THE TWO STEPS ARE SEPARATE ON PURPOSE ─────────────────────────────────────────────────
 * By default a promoted product is created with `publier = 0` and `seo_robots_index = 0`. It exists,
 * it is complete, it can be reviewed in the admin, and it is invisible to both customers and Google.
 * Publishing is `--publish`, in waves bounded by `--limit`, and that is the step where somebody is
 * accepting responsibility for what goes live.
 *
 * ── AND THE SECOND STEP HAS TO BE ABLE TO REACH THE FIRST STEP'S OUTPUT ───────────────────
 * It could not. `--publish` used to be nothing but a post-commit save inside the CREATION loop, and
 * that loop selects `status = hydrated AND product_id IS NULL` — which createProduct() then moves to
 * `promoted` with a product_id. So the workflow this file prints and describes ("promote everything
 * unpublished, review it, then `--publish --limit=100` in waves") did nothing at all: the second
 * command found zero hydrated rows, warned "No hydrated rows matched", and returned SUCCESS having
 * published none of the ~20,000 products the first command created. A green exit code for a no-op,
 * and every one of those products invisible forever unless published by hand.
 *
 * `--publish` therefore drains the BACKLOG first — products an earlier run promoted and left
 * unpublished — and only then spends whatever is left of the wave on creating new ones. See
 * publishBacklog().
 *
 * `publier = 0` is the first thing that keeps a promoted product out of the sitemap: /api/all_products
 * filters on `publier`. `seo_robots_index = 0` is the second, and it is now load-bearing too — the
 * listing projection carried no robots column at all until ApisController::PRODUCT_LISTING was given
 * `seo_robots_index`, so sitemapData.ts's noindex filter was reading `undefined` and excluding
 * nothing. That is what makes "publish the wave, but noindexed until the copy is reviewed" an actual
 * state rather than a comment: publier = 1 + seo_robots_index = 0 now renders a noindex page AND
 * keeps the URL out of the sitemap, instead of submitting a URL marked noindex.
 *
 * ── ATOMICITY ─────────────────────────────────────────────────────────────────────────────
 * Product creation, the subcategory pivot row and the staging row's `promoted` bookkeeping happen in
 * one transaction. A half-promotion — a product with no pivot row, or a staging row pointing at a
 * product that was rolled back — is not a state this command can leave behind. Re-running is safe by
 * construction: the row is claimed with `whereNull('product_id')` inside the transaction, so two
 * concurrent runs cannot both create a product for the same source id, and `product_id` (never
 * `status`) is what decides whether a row has already been promoted.
 *
 * Two things are deliberately kept OUTSIDE that transaction because they are irreversible in a way
 * a rollback cannot undo: the slug claim (recorded once the commit has happened, so a failed row
 * releases the slug it was going to take) and publication itself (a second save after the commit,
 * because ProductSeoObserver fires SeoNotifier from wherever `publier` first becomes true — and
 * inside a transaction that means IndexNow can be told about a URL that then rolls back). Both are
 * documented at their call sites.
 *
 * ── WHAT IT NEVER WRITES ──────────────────────────────────────────────────────────────────
 * `note`, `seo_review`, `seo_aggregate_rating`, `promo`, `promo_ht`, `promo_expiration_date`. The
 * first three would put a rating on the page that no customer of ours gave — the staging table's
 * `source_rating` is internal reference only and stops here. The promo columns are left null because
 * `hasActivePromo()` is true whenever `promo > 0` and the expiry is null, and `getEffectiveUnitPrice()`
 * then silently returns the promo instead of `prix`, including inside the JSON-LD offer.
 */
class CatalogIHerbPromote extends Command
{
    protected $signature = 'catalog:iherb:promote
                            {--limit= : Maximum products to CREATE in this run (default: all; with --publish, catalog.promotion.chunk)}
                            {--brand= : Only rows of this brand (any spelling — it is folded through BrandKey)}
                            {--subcategory= : Only rows that resolve to this sous_categories slug}
                            {--publish : Publish a wave (publier=1, seo_robots_index=1) — the backlog an earlier run left unpublished first, then anything this run creates}
                            {--dry-run : Print the gate breakdown and write nothing}
                            {--report : Print counts per rejection reason and exit}';

    protected $description = 'Promote hydrated iHerb staging rows into products';

    /**
     * Slugs already handed out in THIS run — and only ones that were actually TAKEN.
     *
     * The database is the real authority, but a dry run writes nothing, so without this two rows
     * with the same base slug would both be reported as taking it and the dry run would describe an
     * outcome the real run cannot produce.
     *
     * ── WHY A CLAIM IS NEVER RECORDED BY uniqueSlug() ─────────────────────────────────────
     * It used to be: the method marked its candidate here and returned, before anything existed to
     * own it. Everything between that line and the COMMIT can still fail — the transaction's own
     * re-read can find the row claimed by a concurrent run, Brand::create() can hit 1364 on the
     * legacy `brands` table, the INSERT can hit 1406 — and the claim was never released. The next
     * row normalising to the same base then skipped a base that nothing holds and took
     * `{base}-{externalId}` instead. Product URLs are permanent, so that is not a cosmetic
     * difference: it is a URL decided by whether an unrelated row happened to fail earlier in the
     * same wave, which means the same catalogue promoted twice produces two different sets of
     * addresses.
     *
     * So the claim is recorded by claimSlug(), at the two points where the slug is genuinely gone:
     * after a successful commit, and immediately in a dry run (where no commit will ever come and
     * this array is the only authority there is).
     *
     * @var array<string, true>
     */
    private array $claimedSlugs = [];

    public function handle(): int
    {
        if (! config('catalog.enabled', true)) {
            $this->error('catalog.enabled is false — set CATALOG_IMPORT_ENABLED=true to run this.');

            return self::FAILURE;
        }

        $brandKey = $this->brandFilter();
        if ($brandKey === false) {
            return self::FAILURE;
        }

        $subcategory = $this->subcategoryFilter();
        if ($subcategory === false) {
            return self::FAILURE;
        }

        if ($this->option('report')) {
            return $this->report($brandKey, $subcategory);
        }

        return $this->promote($brandKey, $subcategory);
    }

    /*
    |--------------------------------------------------------------------------
    | Report
    |--------------------------------------------------------------------------
    */

    /**
     * Why the rows that are not promotable are not promotable. Read-only, always.
     *
     * Deliberately scans every `hydrated` row rather than a window: the point of the report is the
     * shape of the whole backlog, and a sample of 100 cannot tell the owner that 8,000 products are
     * waiting on one missing classification rule.
     *
     * `--limit` is ignored here, and so is the `product_id IS NULL` filter that the promote path
     * applies — a row that is still `hydrated` while carrying a `product_id` is a half-promotion the
     * transaction is supposed to make impossible, and surfacing it is worth more than tidying it out
     * of the count.
     */
    private function report(?string $brandKey, ?string $subcategorySlug): int
    {
        $reasons = [];
        $gateHits = [];
        $perSubcategory = [];
        $unclassified = [];
        $promotable = 0;
        $scanned = 0;
        $noImage = 0;

        foreach ($this->chunks($brandKey, false) as $rows) {
            $subcategories = $this->subcategories();
            $context = PromotionGate::contextFrom((array) config('catalog'), $subcategories['ids']);

            foreach ($rows as $row) {
                $verdict = PromotionGate::inspect($row->getAttributes(), $context);

                if ($subcategorySlug !== null && $verdict['sub_slug'] !== $subcategorySlug) {
                    continue;
                }

                $scanned++;

                foreach ($verdict['failures'] as $failure) {
                    $gateHits[$failure['reason']] = ($gateHits[$failure['reason']] ?? 0) + 1;
                }

                // The same post-gate brand check the promote path applies, so the report's
                // "promotable" total is the number of products a run will actually create. A report
                // that promises 5,000 and delivers 4,900 is worse than no report.
                if ($verdict['promotable'] && $this->brandUnusable($row)) {
                    $reasons[PromotionGate::NO_BRAND] = ($reasons[PromotionGate::NO_BRAND] ?? 0) + 1;
                    $gateHits[PromotionGate::NO_BRAND] = ($gateHits[PromotionGate::NO_BRAND] ?? 0) + 1;

                    continue;
                }

                // Likewise for the cover. PromotionGate has already run its own NO_IMAGE gate on the
                // row's columns; this re-asks the question of the exact function whose return value
                // is written to `products.cover`, so the report can never promise a product the
                // promote path will refuse for a reason the report did not model.
                if ($verdict['promotable'] && $this->coverUnusable($row)) {
                    $reasons[PromotionGate::NO_IMAGE] = ($reasons[PromotionGate::NO_IMAGE] ?? 0) + 1;
                    $gateHits[PromotionGate::NO_IMAGE] = ($gateHits[PromotionGate::NO_IMAGE] ?? 0) + 1;

                    continue;
                }

                if ($verdict['promotable']) {
                    $promotable++;
                    $slug = (string) $verdict['sub_slug'];
                    $perSubcategory[$slug] = ($perSubcategory[$slug] ?? 0) + 1;

                    if ($this->coverUrl($row) === null) {
                        $noImage++;
                    }

                    continue;
                }

                $reason = (string) $verdict['reason'];
                $reasons[$reason] = ($reasons[$reason] ?? 0) + 1;

                if ($reason === PromotionGate::UNCLASSIFIED && count($unclassified) < 12) {
                    $unclassified[] = (string) ($row->normalized_title ?: $row->external_url_name);
                }
            }
        }

        if ($scanned === 0) {
            $this->warn('No hydrated rows matched. Run catalog:iherb:hydrate --status to see where the import is.');

            return self::SUCCESS;
        }

        $this->line('');
        $this->info(sprintf('%s hydrated row(s) inspected.', number_format($scanned)));
        $this->line('');

        // First-failure counts. Every row appears exactly once, so these sum to the scan total and
        // "how many products am I one fix away from?" is answerable.
        $table = [];
        foreach (PromotionGate::REASONS as $reason => $meaning) {
            $n = (int) ($reasons[$reason] ?? 0);
            $all = (int) ($gateHits[$reason] ?? 0);
            if ($n === 0 && $all === 0) {
                continue;
            }
            $table[] = [$reason, $meaning, number_format($n), number_format($all)];
        }
        $table[] = ['promotable', 'passes every gate', number_format($promotable), '—'];

        $this->table(['reason', 'meaning', 'rows blocked here first', 'rows failing this gate'], $table);

        if ($perSubcategory !== []) {
            arsort($perSubcategory);
            $this->line('');
            $this->info('Promotable products by subcategory — this is what the URLs would be:');
            foreach ($perSubcategory as $slug => $n) {
                $this->line(sprintf('  %-28s %s   →  /%s/{slug}', $slug, str_pad(number_format($n), 7, ' ', STR_PAD_LEFT), $slug));
            }
        }

        // Only reachable when catalog.promotion.require_image has been turned OFF — with the default
        // (required) every such row was counted against NO_IMAGE above and is not promotable at all.
        // Kept because that opt-out is exactly the situation somebody needs telling the size of.
        if ($noImage > 0) {
            $this->line('');
            $this->warn(sprintf(
                '%s promotable product(s) have no cover image — no part number, no primary image index, '
                .'or a part number the image URL scheme does not cover. catalog.promotion.require_image '
                .'is false, so they WOULD be created with an empty cover while ProductSeoObserver still '
                .'writes an alt_cover describing a photo that is not there.',
                number_format($noImage),
            ));
        }

        if ($unclassified !== []) {
            $this->line('');
            $this->info('Unclassified samples — each one is a missing rule in config/catalog.classification:');
            foreach ($unclassified as $name) {
                $this->line('  '.Str::limit($name, 90));
            }
        }

        $this->line('');
        $this->line('Nothing was written. Add --dry-run to see what a real run would create.');

        return self::SUCCESS;
    }

    /*
    |--------------------------------------------------------------------------
    | Promote
    |--------------------------------------------------------------------------
    */

    private function promote(?string $brandKey, ?string $subcategorySlug): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $publish = (bool) $this->option('publish');
        $limit = $this->waveSize($publish);

        if ($publish && ! $dryRun) {
            $this->warn(sprintf(
                'Publishing %s product(s). ProductSeoObserver::saved fires SeoNotifier for each one, '
                .'from the post-commit publish and not from inside the transaction — three HTTP calls '
                .'apiece (revalidate path, revalidate sitemap tag, IndexNow). '
                .'That is ~%s requests at the storefront.',
                $limit === null ? 'every promotable' : number_format($limit),
                $limit === null ? 'unbounded' : number_format($limit * 3),
            ));
        }

        $created = 0;
        $scanned = 0;
        $rejected = [];
        $failedWrites = 0;
        $failedPublishes = 0;
        $samples = [];

        /*
         * THE BACKLOG FIRST — the products the documented workflow was silently skipping.
         *
         * `--publish` used to publish only what the same run created, because the only publish that
         * existed was the post-commit save at the bottom of the creation loop below, and that loop
         * selects `status = hydrated AND product_id IS NULL`. The default run turns every such row
         * into `promoted` + product_id, so the follow-up `--publish --limit=100` matched nothing,
         * fell into summarise()'s "$scanned === 0" branch and reported success having published
         * zero of the products it was run to publish.
         *
         * Running it first, rather than after the creation loop, is deliberate: with `--limit=100`
         * and a 20,000-product backlog, publishing last would mean every wave created 100 MORE
         * unpublished products and the backlog would grow faster than it drained.
         */
        $backlogPublished = 0;
        $backlogFailed = 0;
        if ($publish) {
            $backlog = $this->publishBacklog($brandKey, $subcategorySlug, $limit, $dryRun);
            $backlogPublished = $backlog['published'];
            // Kept apart from $failedPublishes, which counts the creation loop's own failures: the
            // summary subtracts THAT one from $created, and a backlog failure has no created
            // product behind it to subtract.
            $backlogFailed = $backlog['failed'];
        }

        /*
         * `--limit` bounds what this run PUBLISHES, so the backlog spends the same wave.
         *
         * A product published out of the backlog costs the storefront exactly what one published at
         * creation costs — three HTTP calls and one URL handed to IndexNow — and the whole point of
         * the wave is that somebody chose that number. Attempts count, not successes: a failed
         * publish already fired its save.
         */
        $createLimit = $limit;
        if ($publish && $limit !== null) {
            $createLimit = max(0, $limit - ($backlogPublished + $backlogFailed));
        }

        // A wave fully spent on the backlog creates nothing, so the scan is skipped outright rather
        // than opened and then abandoned on its first row.
        /** @var iterable<Collection<int, ExternalCatalogProduct>> $chunks */
        $chunks = $createLimit === 0 ? [] : $this->chunks($brandKey, true);

        foreach ($chunks as $rows) {
            // ── Per-chunk caches ──────────────────────────────────────────────────────────
            // Reloaded per chunk rather than once per run so a subcategory created while a long run
            // is going is picked up, and so a very long run cannot hold a stale brand memo forever.
            // BrandMatcher memoises internally, so a fresh instance IS the per-chunk brand cache.
            $subcategories = $this->subcategories();
            $context = PromotionGate::contextFrom((array) config('catalog'), $subcategories['ids']);
            $matcher = new BrandMatcher();

            foreach ($rows as $row) {
                // $createLimit, not $limit: under --publish the backlog has already spent part of
                // the wave, and a run that published 100 backlog products and then created 100 more
                // would double the number of URLs the operator asked for.
                if ($createLimit !== null && $created >= $createLimit) {
                    break 2;
                }

                $verdict = PromotionGate::inspect($row->getAttributes(), $context);

                // A subcategory filter is a selection, not a rejection: rows for other subcategories
                // are simply not part of this wave and must not pollute the reason counts.
                if ($subcategorySlug !== null && $verdict['sub_slug'] !== $subcategorySlug) {
                    continue;
                }

                $scanned++;

                if (! $verdict['promotable']) {
                    $reason = (string) $verdict['reason'];
                    $rejected[$reason] = ($rejected[$reason] ?? 0) + 1;

                    if ($dryRun && count($samples) < 25) {
                        $samples[] = ['·', $reason, (string) $verdict['detail'], Str::limit($verdict['title'], 46)];
                    }

                    continue;
                }

                if ($this->brandUnusable($row)) {
                    $rejected[PromotionGate::NO_BRAND] = ($rejected[PromotionGate::NO_BRAND] ?? 0) + 1;

                    continue;
                }

                /*
                 * The cover, asked of the function that actually writes it.
                 *
                 * PromotionGate::NO_IMAGE has already rejected this row's columns if they could not
                 * yield a URL, so under normal circumstances this never fires. It is here for the
                 * one circumstance that matters: the gate reproduces IHerbClient's part-number
                 * pattern rather than importing it (it must load with no autoloader), and if those
                 * two ever drift, the gate's "promotable" and the value handed to
                 * `Product::create(['cover' => …])` stop describing the same row. Re-asking
                 * coverUrl() itself means the drift costs a row that stays staged, instead of an
                 * indexable product page with no photo and an alt_cover describing one.
                 */
                if ($this->coverUnusable($row)) {
                    $rejected[PromotionGate::NO_IMAGE] = ($rejected[PromotionGate::NO_IMAGE] ?? 0) + 1;

                    continue;
                }

                /*
                 * EVERY per-row database interaction lives inside this guard, not just the INSERT.
                 *
                 * It used to start at createProduct(), which left the two calls that precede it
                 * outside it — and both of them can throw for exactly the reasons the guard exists:
                 *
                 *   · uniqueSlug() runs `Product::where('slug', …)->exists()` (a QueryException is
                 *     possible) and throws \RuntimeException when every candidate is taken;
                 *   · BrandMatcher::resolve() calls Brand::create(). `brands` is a legacy table with
                 *     no migration history, App\Models\Brand has NO `creating` hook running
                 *     LegacyColumnDefaults::fill() (unlike Product), and BrandMatcher only swallows
                 *     SQLSTATE '23…' — so 1364 (NOT NULL, no DEFAULT) and 1406 (value too long) on
                 *     the first product of a brand that is not in `brands` yet were rethrown.
                 *
                 * The consequence was that row 401 of a 500-row wave could abort handle() with a
                 * stack trace: summarise() never ran, so the counters for the 400 successes were
                 * lost, no status_reason was written for the offending row, and every remaining row
                 * was left unprocessed. The identical error one line later was caught and skipped.
                 * One bad row must not take the wave with it — wherever in the row it happens.
                 */
                try {
                    $slug = $this->uniqueSlug((string) $verdict['title'], (string) $row->external_product_id);

                    if ($dryRun) {
                        // A dry run is the ONE case where the claim is taken before anything exists,
                        // because nothing ever will: no row is inserted, so this run's own memory is
                        // the only authority on what the previous rows took. Without it two rows
                        // sharing a base would both be printed as taking it, and the dry run would
                        // describe URLs the real run cannot produce.
                        $this->claimSlug($slug);

                        $created++;
                        if (count($samples) < 25) {
                            $samples[] = [
                                '+',
                                sprintf('%.3f DT', (float) $verdict['price']),
                                sprintf('/%s/%s', (string) $verdict['sub_slug'], $slug),
                                Str::limit($verdict['title'], 46),
                            ];
                        }

                        continue;
                    }

                    // Resolved OUTSIDE the transaction on purpose. BrandMatcher creates the brand when
                    // it does not exist; doing that inside a transaction that later rolls back would
                    // leave its in-memory memo pointing at an id the database no longer has, and every
                    // subsequent product of that brand in the same chunk would be filed under a dead
                    // id. A brand row briefly holding no products is harmless and is reused next run.
                    $brand = $matcher->resolve($row->source_brand_name, $row->source_brand_code)['brand'];

                    if ($brand === null && (bool) config('catalog.promotion.require_brand', true)) {
                        // brandUnusable() already ruled this out; reaching here means the INSERT lost
                        // a race and the winning row could not be re-read. Skip rather than file the
                        // product under brand_id 0.
                        $rejected[PromotionGate::NO_BRAND] = ($rejected[PromotionGate::NO_BRAND] ?? 0) + 1;

                        continue;
                    }

                    $product = $this->createProduct($row, $verdict, $brand, $subcategories, $slug);
                } catch (QueryException|\RuntimeException $e) {
                    // The row stays `hydrated` with the database's own words on it, so a fix plus a
                    // re-run picks it up — and the message is kept because 1364/1406/23000 and "no
                    // free slug" are four completely different repairs.
                    $failedWrites++;
                    // …but a dry run still writes NOTHING. Recording status_reason here would make
                    // --dry-run mutate the staging table, which is the one promise it makes.
                    if (! $dryRun) {
                        $row->forceFill(['status_reason' => Str::limit('promote:'.$e->getMessage(), 240, '')])->save();
                    }
                    $this->warn(sprintf('  row %d failed to write: %s', $row->id, Str::limit($e->getMessage(), 140)));

                    continue;
                }

                if ($product === null) {
                    // Another run claimed it between the read and the transaction. Not an error —
                    // and note that $slug was NOT claimed, so the base is released back to the next
                    // row that normalises to it rather than being burned by a product that does not
                    // exist. Same for the catch above: a rolled-back row leaves no claim behind.
                    continue;
                }

                // Claimed only now, because only now is there a row to claim it. From this point the
                // database is the authority again — the next uniqueSlug() will see this product with
                // its own `where('slug', …)->exists()` — so this is belt-and-braces rather than the
                // mechanism. The mechanism is that a FAILED promotion records nothing.
                $this->claimSlug($slug);

                $created++;

                /*
                 * PUBLICATION IS A POST-COMMIT ACT, and that is the whole point of it living here.
                 *
                 * Product::create() fires ProductSeoObserver::saved, which — when `publier` is true
                 * — hands the product to SeoNotifier, which registers an afterResponse callback that
                 * revalidates the product path, busts the sitemap tag and submits the URL to
                 * IndexNow. Under `php artisan`, "after response" is application termination: the
                 * callback runs at the END of the command, long after this row's transaction has
                 * been decided, and it runs whether that transaction COMMITTED OR ROLLED BACK.
                 *
                 * So creating the product already published meant a rollback here produced no
                 * product and still advertised its URL to Bing/Yandex and told the storefront to
                 * cache it — a 404 submitted for indexing, by a command whose own summary reported
                 * the row as failed. Nothing in the observer, the notifier or the transaction can
                 * see that; the only place with the knowledge is this line, after DB::transaction()
                 * has returned a product, which means the row is committed.
                 *
                 * The product is therefore ALWAYS created unpublished and published by a second
                 * save. The trade-off, stated rather than hidden: a crash between the commit and
                 * this save leaves the product existing and unpublished. That is the safe direction
                 * — invisible to customers and to Google, fixable in the admin — and it is the
                 * opposite of the direction the old code failed in.
                 */
                if ($publish && ! $this->publish($product, $row)) {
                    $failedPublishes++;
                }
            }
        }

        return $this->summarise($dryRun, $publish, $created, $scanned, $rejected, $failedWrites, $failedPublishes, $backlogPublished, $backlogFailed, $samples, $limit);
    }

    /**
     * Publish products a PREVIOUS run promoted and left unpublished. The missing half of --publish.
     *
     * ── WHAT WAS BROKEN ───────────────────────────────────────────────────────────────────
     * Nothing in this command could publish a product it had not just created. chunks() selects
     * `status = hydrated` and `product_id IS NULL`; createProduct() writes STATUS_PROMOTED and a
     * product_id in the same transaction, so a promoted row is never selected again. The workflow
     * the command prints — promote the backlog unpublished, review it, then
     * `catalog:iherb:promote --publish --limit=100` — therefore published nothing at all: the second
     * command matched zero rows and exited SUCCESS. ~20,000 complete products, invisible to
     * customers and to Google, with the summary saying the run was fine.
     *
     * ── WHAT IT SELECTS, AND WHAT IT DELIBERATELY LEAVES ALONE ────────────────────────────
     * `status = promoted AND product_id IS NOT NULL` (the row half), joined to a product that is
     * still `publier = 0` AND still `seo_robots_index = 0` (the product half). Both flags, not just
     * `publier`, and that is the whole safety property: createProduct() writes the pair (0, 0) and
     * publish() writes the pair (1, 1), so a product the OWNER unpublished in the admin after
     * reviewing it comes back as (0, 1) — Filament's publier toggle does not touch the robots
     * column — and is not selected here. A deliberate rejection stays rejected instead of being
     * re-published by the next wave.
     *
     * Stated rather than hidden: an owner who unpublishes AND noindexes a product puts it back into
     * (0, 0) and this will publish it again. The columns cannot tell that apart from "never
     * published", and inventing a staging column to encode it is a schema change for a case the
     * admin can express by deleting the product.
     *
     * The 309 pre-existing products are unreachable from here by construction, not by a filter that
     * could be edited out: selection starts at `external_catalog_products` and they have no staging
     * row, so no query this method can issue names one of them.
     *
     * The cursor is on `external_catalog_products.id` and only moves forward, so rows dropping out
     * of the result set as they are published cannot make this loop repeat or stall.
     *
     * @return array{published: int, failed: int}
     */
    private function publishBacklog(?string $brandKey, ?string $subcategorySlug, ?int $limit, bool $dryRun): array
    {
        $published = 0;
        $failed = 0;

        // Resolved once: unlike the creation loop this writes no subcategories and creates no
        // brands, so there is nothing a per-chunk reload would pick up.
        $subId = $subcategorySlug === null ? null : ($this->subcategories()['ids'][$subcategorySlug] ?? -1);

        $chunk = max(1, (int) config('catalog.promotion.chunk', 100));
        $cursor = 0;

        while ($limit === null || $published + $failed < $limit) {
            $take = $limit === null ? $chunk : min($chunk, $limit - ($published + $failed));

            $rows = ExternalCatalogProduct::query()
                ->with('product')
                ->where('provider', IHerbClient::PROVIDER)
                ->where('status', ExternalCatalogProduct::STATUS_PROMOTED)
                ->whereNotNull('product_id')
                ->where('id', '>', $cursor)
                ->when($brandKey !== null, fn ($q) => $q->where('normalized_brand_key', $brandKey))
                ->when($subId !== null, fn ($q) => $q->where('sous_category_id', $subId))
                ->whereHas('product', function ($q): void {
                    // Null-tolerant on both columns: `products` is legacy, LegacyColumnDefaults
                    // fills what it knows about, and a NULL here means "never set", which is
                    // exactly the state we are looking for — not a reason to skip the row.
                    $q->where(fn ($p) => $p->whereNull('publier')->orWhere('publier', 0))
                        ->where(fn ($p) => $p->whereNull('seo_robots_index')->orWhere('seo_robots_index', 0));
                })
                ->orderBy('id')
                ->limit($take)
                ->get();

            if ($rows->isEmpty()) {
                return ['published' => $published, 'failed' => $failed];
            }

            $cursor = (int) $rows->last()->id;

            foreach ($rows as $row) {
                if ($dryRun) {
                    // Same promise --dry-run makes everywhere else in this command: it reports and
                    // writes nothing. No save means no ProductSeoObserver, no IndexNow.
                    $published++;

                    continue;
                }

                $product = $row->product;
                if ($product === null) {
                    // whereHas matched but the eager load did not: the product was deleted between
                    // the two. Nothing to publish and nothing to repair.
                    continue;
                }

                if ($this->publish($product, $row)) {
                    $published++;
                } else {
                    $failed++;
                }
            }
        }

        return ['published' => $published, 'failed' => $failed];
    }

    /**
     * Flip an ALREADY-COMMITTED product to published. This save, and nothing before it, is what
     * fires ProductSeoObserver::saved → SeoNotifier → revalidate + IndexNow.
     *
     * Two callers, on purpose: the creation loop (a product committed seconds ago) and
     * publishBacklog() (a product committed by an earlier run). They are the same act — the whole
     * defect publishBacklog() exists to fix was that only the first of them existed.
     *
     * Guarded like every other per-row write in this command: one product whose UPDATE fails must
     * not abort the wave and lose the counters for everything already created. The product survives
     * as an unpublished, complete row, so the repair is a publish in the admin and not a re-import.
     */
    private function publish(Product $product, ExternalCatalogProduct $row): bool
    {
        try {
            // Assigned rather than forceFill()ed so `wasChanged(['publier'])` — the condition
            // ProductSeoObserver::saved actually tests — is unambiguously true here.
            $product->publier = true;
            $product->seo_robots_index = true;
            $product->save();

            return true;
        } catch (QueryException $e) {
            $this->warn(sprintf(
                '  row %d: product %d was created but could not be published: %s',
                $row->id,
                $product->id,
                Str::limit($e->getMessage(), 140),
            ));

            return false;
        }
    }

    /**
     * Create the product, its pivot row and the staging bookkeeping — all or nothing.
     *
     * The product is created UNPUBLISHED whatever `--publish` says. Publication is a separate save
     * that promote() performs after this transaction has committed, because ProductSeoObserver fires
     * SeoNotifier from inside whatever transaction is open and a rollback would then have advertised
     * a URL that does not exist. See the comment at that call site.
     *
     * @param  array<string, mixed>  $verdict  a PromotionGate::inspect() result
     * @param  array{ids: array<string, int>, labels: array<int, string>, slugs: array<int, string>, categories: array<int, string>}  $subcategories
     */
    private function createProduct(
        ExternalCatalogProduct $row,
        array $verdict,
        ?Brand $brand,
        array $subcategories,
        string $slug,
    ): ?Product {
        return DB::transaction(function () use ($row, $verdict, $brand, $subcategories, $slug): ?Product {
            // Re-read under a row lock and re-assert the precondition. This is the guarantee that
            // re-running — or running two copies at once — cannot produce two products for one
            // source id. `product_id IS NULL` is the claim; `status` is only a label.
            $fresh = ExternalCatalogProduct::whereKey($row->id)
                ->where('status', ExternalCatalogProduct::STATUS_HYDRATED)
                ->whereNull('product_id')
                ->lockForUpdate()
                ->first();

            if ($fresh === null) {
                return null;
            }

            $subId = (int) $verdict['sub_id'];

            /**
             * The page body and its metadata, composed from the facts on the row.
             *
             * This call is the whole point of App\Services\Catalog\ImportedProductContent, and it
             * was missing: createProduct() built its own four-item spec block (~25 words) via
             * $this->description() and set seo_title/seo_description nowhere, so the class shipped
             * as dead code and not one imported product ever received the copy it composes. A
             * service nothing calls is a deliverable that did not ship.
             *
             * compose() returns nulls when too few facts survive to write a true identity sentence
             * (no brand, no rayon, or a title whose head is nothing but the brand). That is not an
             * error, so the old spec block stays as the fallback for exactly those rows — it is
             * still better than an empty description_fr, which makes the storefront fall through to
             * generateProductFallbackDescription() and emit the same boilerplate on every product.
             */
            $content = ImportedProductContent::fromStagingRow($row->getAttributes(), [
                // The BRAND ROW's display name, not the source's: BrandKey::displayName() has
                // already tidied it, and it is the spelling the brand page and the PDP print. The
                // raw source name is the fallback for the (config-permitted) no-brand case.
                'brand' => $brand?->designation_fr ?? $row->source_brand_name,
                'sub_category_slug' => $subcategories['slugs'][$subId] ?? null,
                'sub_category_label' => $subcategories['labels'][$subId] ?? null,
                'category_label' => $subcategories['categories'][$subId] ?? null,
                // No `reference`: promotion writes no code_product, so the product page prints no
                // "Référence : …" line and a sentence quoting one would describe a field the page
                // does not show.
            ]);

            /**
             * Product::create(), never insert()/upsert()/the query builder.
             *
             * `products` has no create-migration and carries NOT NULL columns with no DEFAULT; only
             * the `creating` model event runs LegacyColumnDefaults::fill() to supply them. Any
             * non-Eloquent write path dies with SQLSTATE[HY000] 1364 naming a column that appears in
             * no file in this repository.
             *
             * `brand_id` and `sous_categorie_id` are set HERE, in the create array, and not patched
             * on afterwards — ProductSeoObserver::saving runs ProductSeoDefaults::apply() on this
             * same save and reads `$product->brand?->designation_fr` and
             * `$product->sousCategorie?->designation_fr` to build meta_title, meta_description and
             * alt_cover. Set them later and those three come out brandless and categoryless, and
             * because they are then no longer blank they are never regenerated.
             */
            $attributes = [
                'designation_fr' => $verdict['title'],
                'slug' => $slug,
                'description_fr' => $content['description_fr']
                    ?? $this->description($row, $brand, $subcategories['labels'][$subId] ?? null),
                'cover' => $this->coverUrl($row),
                'prix' => $verdict['price'],
                'qte' => (int) config('catalog.promotion.initial_qte', 0),
                // FALSE even under --publish. Not a default — a sequencing decision: while this
                // transaction is open the product may still be rolled back, and a `publier` of true
                // right here is what makes ProductSeoObserver::saved schedule an IndexNow submission
                // for a URL that may never exist. promote() sets both flags after the commit.
                'publier' => false,
                'sous_categorie_id' => $subId,
                'brand_id' => $brand?->id,
                // Two independent brakes on indexing, and both are now real. `publier` keeps the
                // product out of /api/all_products entirely; `seo_robots_index` is what the crawler
                // route reads AND — since ApisController::PRODUCT_LISTING started returning it —
                // what sitemapData.ts's noindex filter reads, so publishing a wave noindexed no
                // longer submits URLs marked noindex. follow stays true so a noindex page still
                // passes its links on.
                'seo_robots_index' => false,
                'seo_robots_follow' => true,
                // Left blank so ProductSeoObserver fills them from the templates every other product
                // on the site uses. Writing them here would produce a second, divergent house style.
                'meta_title' => null,
                'meta_description' => null,
                'alt_cover' => null,
            ];

            /*
             * seo_title / seo_description are added only when compose() produced them.
             *
             * They are the fields the crawler route emits as `title: { absolute: … }` and the meta
             * description, and ImportedProductContent sizes them to the 30-60 / 110-160 windows
             * frontend/scripts/verify-seo.js checks. The keys are OMITTED rather than set to null
             * when it returns nothing, so a row that falls back to the spec block leaves the columns
             * untouched and ProductSeoObserver's meta_* templates remain the only thing describing
             * it — rather than us writing an explicit NULL over a legacy column.
             */
            if ($content['seo_title'] !== null) {
                $attributes['seo_title'] = $content['seo_title'];
            }
            if ($content['seo_description'] !== null) {
                $attributes['seo_description'] = $content['seo_description'];
            }

            $product = Product::create($attributes);

            /**
             * BOTH sides of the subcategory, always.
             *
             * The canonical is derived from `sous_categories[0]` (the pivot) on every list payload
             * and in SeoNotifier::productPath(), but from `sous_categorie` (the FK) in
             * /api/product_details, which is the only relation productDetails() eager-loads. Write
             * one without the other and the sitemap says /A/slug while the page's rel=canonical says
             * /B/slug — Search Console's "Google chose a different canonical", on every imported
             * product at once.
             */
            $product->sousCategories()->syncWithoutDetaching([$subId]);

            $fresh->forceFill([
                'status' => ExternalCatalogProduct::STATUS_PROMOTED,
                'status_reason' => null,
                'product_id' => $product->id,
                'promoted_at' => now(),
                'brand_id' => $brand?->id,
                'sous_category_id' => $subId,
                // The staged figure was a preview computed at hydration time, and it falls back to
                // the discount price where PromotionGate deliberately does not. Overwriting it with
                // the price actually charged means the admin's staging view and the product page can
                // never disagree about what this product costs.
                'computed_price' => $verdict['price'],
            ])->save();

            return $product;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Slug
    |--------------------------------------------------------------------------
    */

    /**
     * The public URL segment. Generated here because nothing else will.
     *
     * There is no slug observer, no HasSlug trait and no model hook on Product. Slug generation
     * exists in exactly two Filament-only places (ProductResource's afterStateUpdated and
     * CreateProduct::mutateFormDataBeforeCreate), and uniqueness is a Filament form rule
     * (`->unique(ignoreRecord: true)`) that does not run on Product::create(). Lookups assume
     * uniqueness anyway — ApisController::productDetails() does ->first() — so a duplicate slug
     * silently shadows one product forever.
     *
     * ── BASE: THE STRATEGY ALREADY IN THE CODEBASE ────────────────────────────────────────
     * Str::slug($designation), identical to both Filament paths, so an imported product's URL is
     * indistinguishable from a hand-created one.
     *
     * ── COLLISION: THE EXTERNAL ID, NOT Str::random(4) ────────────────────────────────────
     * ProductResource's duplicate action suffixes with `Str::lower(Str::random(4))`. That is right
     * for a human duplicating one product and wrong here: a random suffix makes the slug depend on
     * WHEN the row was promoted, so a re-run after a rollback would mint a different URL for the same
     * product, and a dry run would print a URL the real run will not produce. iHerb's numeric product
     * id is stable, unique per source product, and already the row's identity — the same input
     * always yields the same slug, which is what "deterministic" has to mean for something that
     * becomes a permanent address.
     *
     * ── PURE BY DESIGN ────────────────────────────────────────────────────────────────────
     * This method RESERVES NOTHING. It answers "which slug is free right now?" and the caller
     * records the answer with claimSlug() once the product owning it has committed. See the
     * $claimedSlugs docblock for the URLs that were at stake when it did both.
     */
    private function uniqueSlug(string $title, string $externalId): string
    {
        $base = Str::slug($title);

        if ($base === '') {
            $base = 'produit';
        }

        // `products.slug` is a legacy column of unknown length (the table has no create-migration).
        // 180 characters leaves room for the suffix inside a conventional varchar(255) and inside
        // InnoDB's utf8mb4 index limit, and cuts on a hyphen so the tail is never half a word.
        if (strlen($base) > 180) {
            $cut = strrpos(substr($base, 0, 181), '-');
            $base = rtrim(substr($base, 0, $cut === false ? 180 : $cut), '-');
        }

        foreach ($this->slugCandidates($base, $externalId) as $candidate) {
            if (isset($this->claimedSlugs[$candidate])) {
                continue;
            }

            if (! Product::where('slug', $candidate)->exists()) {
                return $candidate;
            }
        }

        // Unreachable in practice — it would need the base, the base plus the external id, and 20
        // numbered variants all taken. Failing loudly beats returning a slug that shadows a product.
        throw new \RuntimeException('Could not find a free slug for "'.$base.'" (external id '.$externalId.')');
    }

    /**
     * Record that a slug is now genuinely taken.
     *
     * Called after the commit that created the product holding it, or immediately in a dry run.
     * Never from uniqueSlug(), which is what makes a failed promotion release the slug it was going
     * to use instead of burning it for the rest of the run.
     */
    private function claimSlug(string $slug): void
    {
        $this->claimedSlugs[$slug] = true;
    }

    /** @return iterable<string> */
    private function slugCandidates(string $base, string $externalId): iterable
    {
        yield $base;
        yield $base.'-'.$externalId;

        for ($n = 2; $n <= 20; $n++) {
            yield $base.'-'.$externalId.'-'.$n;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Product content
    |--------------------------------------------------------------------------
    */

    /**
     * The cover image, referenced rather than mirrored.
     *
     * The full Cloudinary URL is stored: ImagePath::normalize() passes it through untouched because
     * the host is in config('catalog.media.external_hosts'), and next/image renders it because the
     * same host is in frontend/next.config.js images.remotePatterns. Both lists are required; a host
     * in one and not the other is a 200 that renders nothing.
     *
     * Only the PRIMARY image index is used. iHerb serves further indexes under the same path, but we
     * have not been told how many exist for a given product — probing 1..n would either 404 or, worse,
     * store URLs that 404 later. `images` therefore stays null rather than holding guesses.
     */
    private function coverUrl(ExternalCatalogProduct $row): ?string
    {
        return IHerbClient::imageUrl(
            $row->external_part_number,
            $row->source_primary_image_index === null ? null : (int) $row->source_primary_image_index,
            'l',
        );
    }

    /**
     * FALLBACK description, built ONLY from facts already on the row.
     *
     * Since ImportedProductContent was wired into createProduct() this is no longer the normal path:
     * it runs only for the rows compose() declines (no brand, no rayon label, or a title whose head
     * is nothing but the brand). It is kept, rather than deleted, because those rows still need a
     * description_fr — an empty one makes CrawlerProductView fall through to the storefront's
     * identical-for-every-product boilerplate.
     *
     * ── WHAT IS DELIBERATELY NOT HERE ─────────────────────────────────────────────────────
     * No benefits, no dosage advice, no health claims, no marketing copy, nothing translated from a
     * source description we do not have (the /ugc/api/product/v2 payload carries fifteen keys and a
     * description is not among them). Every line below is a value we measured or were told: the
     * brand, the pack size the label prints, the flavour, the subcategory. A supplement page that
     * invents a benefit is both a fabrication and a regulated claim.
     *
     * ── AND WHY IT IS STILL WORTH WRITING ─────────────────────────────────────────────────
     * The alternative is an empty `description_fr`, which makes CrawlerProductView fall through to
     * generateProductFallbackDescription() — boilerplate assembled in the frontend, identical across
     * every product. A short spec block is at least specific to the product. It is a placeholder for
     * real copy, not a substitute for it: these pages are created unpublished precisely because
     * thin content at 13,000-page scale is a ranking problem, and the publish step is where that
     * judgement gets made.
     */
    private function description(ExternalCatalogProduct $row, ?Brand $brand, ?string $subcategoryLabel): ?string
    {
        $facts = [];

        if (filled($brand?->designation_fr)) {
            $facts['Marque'] = (string) $brand->designation_fr;
        }

        if ($row->pack_size !== null && filled($row->pack_unit)) {
            $facts['Conditionnement'] = $this->frenchNumber((float) $row->pack_size).' '.$row->pack_unit;
        }

        if (filled($row->flavour)) {
            $facts['Goût'] = (string) $row->flavour;
        }

        if (filled($subcategoryLabel)) {
            $facts['Catégorie'] = (string) $subcategoryLabel;
        }

        if ($facts === []) {
            return null;
        }

        $items = '';
        foreach ($facts as $label => $value) {
            $items .= '<li><strong>'.e($label).'</strong> : '.e($value).'</li>';
        }

        $lead = filled($brand?->designation_fr)
            ? sprintf('<p><strong>%s</strong> de %s.</p>', e((string) $row->normalized_title), e((string) $brand->designation_fr))
            : sprintf('<p><strong>%s</strong>.</p>', e((string) $row->normalized_title));

        return $lead.'<ul>'.$items.'</ul>';
    }

    /** "2.29" → "2,29"; "600" → "600". Mirrors IHerbNormalizer's own French formatting. */
    private function frenchNumber(float $value): string
    {
        $formatted = rtrim(rtrim(number_format($value, 3, '.', ''), '0'), '.');

        return str_replace('.', ',', $formatted === '' ? '0' : $formatted);
    }

    /*
    |--------------------------------------------------------------------------
    | Selection
    |--------------------------------------------------------------------------
    */

    /**
     * Hydrated rows, in id order, an explicit cursor at a time.
     *
     * An id cursor rather than chunk()/chunkById(): the loop MUTATES the very column the query
     * filters on (`status` becomes `promoted`), so an offset-paginated chunk would skip exactly as
     * many rows as it promoted on the previous page. Ordering by id and asking for `id > cursor` is
     * immune to that, because the rows the query stops matching are all behind the cursor already.
     *
     * @return iterable<Collection<int, ExternalCatalogProduct>>
     */
    private function chunks(?string $brandKey, bool $unpromotedOnly): iterable
    {
        $chunk = max(1, (int) config('catalog.promotion.chunk', 100));
        $cursor = 0;

        while (true) {
            $rows = ExternalCatalogProduct::query()
                ->where('provider', IHerbClient::PROVIDER)
                ->where('status', ExternalCatalogProduct::STATUS_HYDRATED)
                ->where('id', '>', $cursor)
                ->when($unpromotedOnly, fn ($q) => $q->whereNull('product_id'))
                ->when($brandKey !== null, fn ($q) => $q->where('normalized_brand_key', $brandKey))
                ->orderBy('id')
                ->limit($chunk)
                ->get();

            if ($rows->isEmpty()) {
                return;
            }

            $cursor = (int) $rows->last()->id;

            yield $rows;
        }
    }

    /**
     * The shop's subcategories, as the four maps the run needs. One pair of queries, reloaded per
     * chunk.
     *
     *   ids        slug → id     what PromotionGate matches a classification against
     *   labels     id  → label   the rayon name the copy prints ("Whey protéine")
     *   slugs      id  → slug    ImportedProductContent keys its content FAMILY off the slug, not
     *                            the label — the slug is the URL segment and the stable identifier
     *   categories id  → parent category label ("Protéines"), for the placement sentence; absent
     *                            when the subcategory has no parent, which degrades the sentence
     *                            rather than printing an empty category name
     *
     * @return array{ids: array<string, int>, labels: array<int, string>, slugs: array<int, string>, categories: array<int, string>}
     */
    private function subcategories(): array
    {
        $rows = SousCategory::query()
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->get(['id', 'slug', 'designation_fr', 'categorie_id']);

        $categoryLabels = Categ::query()
            ->whereIn('id', $rows->pluck('categorie_id')->filter()->unique()->all())
            ->pluck('designation_fr', 'id');

        $categories = [];
        foreach ($rows as $row) {
            $label = $categoryLabels[$row->categorie_id] ?? null;
            if (filled($label)) {
                $categories[(int) $row->id] = (string) $label;
            }
        }

        return [
            'ids' => $rows->pluck('id', 'slug')->map(fn ($id) => (int) $id)->all(),
            'labels' => $rows->pluck('designation_fr', 'id')->all(),
            'slugs' => $rows->pluck('slug', 'id')->all(),
            'categories' => $categories,
        ];
    }

    /**
     * The one thing PromotionGate cannot check for itself: whether BrandMatcher will actually be
     * able to produce a brand.
     *
     * The gate accepts a brand IDENTITY — `normalized_brand_key` OR `source_brand_name`. BrandMatcher
     * can only match or create from the display NAME, and returns a null brand when BrandKey::for()
     * folds that name to nothing. Left unchecked, the null becomes `brand_id => null`,
     * LegacyColumnDefaults fills the NOT NULL column with 0, and the product ships with a brand
     * relation that resolves to nothing — silently, because the row inserts and the admin looks fine.
     *
     * Answered from BrandKey rather than by calling the matcher, because the matcher WRITES (it
     * creates missing brands) and both --dry-run and --report must not.
     */
    private function brandUnusable(ExternalCatalogProduct $row): bool
    {
        return (bool) config('catalog.promotion.require_brand', true)
            && BrandKey::for($row->source_brand_name) === '';
    }

    /**
     * The cover equivalent of brandUnusable(): would this row be created with an empty `cover`?
     *
     * PromotionGate::NO_IMAGE answers the same question from the row's columns, and that is the
     * answer the report counts and the gate blocks on. This one asks coverUrl() — the exact
     * expression whose result is written to `products.cover` — so the two derivations drifting apart
     * costs a staged row rather than a published product page with no photo. Read-only, so --report
     * and --dry-run may both call it.
     *
     * The config key is read here as well as through PromotionGate::contextFrom() on purpose: they
     * are the same switch, and a `false` must silence BOTH checks or turning the requirement off
     * would leave rows rejected by a gate the owner believes they disabled.
     */
    private function coverUnusable(ExternalCatalogProduct $row): bool
    {
        return (bool) config('catalog.promotion.require_image', true)
            && $this->coverUrl($row) === null;
    }

    /** @return string|null|false false = the user asked for something that cannot match */
    private function brandFilter(): string|null|false
    {
        $raw = $this->option('brand');

        if ($raw === null || trim((string) $raw) === '') {
            return null;
        }

        $key = BrandKey::for((string) $raw);

        if ($key === '') {
            $this->error(sprintf('--brand="%s" folds to an empty key and cannot match anything.', $raw));

            return false;
        }

        $this->line(sprintf('Brand filter: "%s" → normalized_brand_key "%s"', $raw, $key));

        return $key;
    }

    /** @return string|null|false */
    private function subcategoryFilter(): string|null|false
    {
        $raw = $this->option('subcategory');

        if ($raw === null || trim((string) $raw) === '') {
            return null;
        }

        $slug = trim((string) $raw);

        if (! SousCategory::where('slug', $slug)->exists()) {
            $this->error(sprintf('--subcategory="%s" is not a slug in sous_categories.', $slug));

            return false;
        }

        return $slug;
    }

    /**
     * How many products this run may create.
     *
     * No limit by default, because the default run creates UNPUBLISHED products: nothing appears on
     * the storefront, nothing enters the sitemap, and ProductSeoObserver::saved skips SeoNotifier
     * entirely when `publier` is falsy — so promoting the whole backlog costs the storefront nothing.
     *
     * `--publish` is the opposite: every product PUBLISHED fires three HTTP calls at the storefront
     * and puts a URL in front of Google. So it defaults to one chunk, and you raise it on purpose.
     * The number it returns bounds publications, not creations — publishBacklog() spends it first and
     * the creation loop gets whatever is left, because a wave that published 100 backlog products and
     * then created 100 more would put twice the URLs in front of Google that were asked for.
     */
    private function waveSize(bool $publish): ?int
    {
        $limit = $this->option('limit');

        if ($limit !== null && trim((string) $limit) !== '') {
            return max(1, (int) $limit);
        }

        return $publish ? max(1, (int) config('catalog.promotion.chunk', 100)) : null;
    }

    /*
    |--------------------------------------------------------------------------
    | Output
    |--------------------------------------------------------------------------
    */

    /**
     * @param  array<string, int>  $rejected
     * @param  list<array{0:string,1:string,2:string,3:string}>  $samples
     */
    private function summarise(
        bool $dryRun,
        bool $publish,
        int $created,
        int $scanned,
        array $rejected,
        int $failedWrites,
        int $failedPublishes,
        int $backlogPublished,
        int $backlogFailed,
        array $samples,
        ?int $limit,
    ): int {
        /*
         * "Nothing was scanned" is no longer the same question as "nothing happened".
         *
         * This branch used to test $scanned alone, which is what turned the broken --publish into a
         * SILENT no-op: a run whose whole job was publishing already-promoted products scanned zero
         * hydrated rows by construction, took this branch, and printed advice about hydration. Now
         * that a wave can be spent entirely on the backlog, the early return has to mean "this run
         * did nothing at all", so it tests the backlog too — and says which of the two wells is dry.
         */
        if ($scanned === 0 && $backlogPublished === 0 && $backlogFailed === 0) {
            $this->warn($publish
                ? 'Nothing to do: no product from an earlier run is still waiting to be published '
                    .'(publier=0 AND seo_robots_index=0), and no hydrated row matched. '
                    .'Run catalog:iherb:hydrate --status to see where the import is.'
                : 'No hydrated rows matched. Run catalog:iherb:hydrate --status to see where the import is.');

            return self::SUCCESS;
        }

        if ($samples !== []) {
            $this->line('');
            $this->table(['', 'price / reason', 'URL / detail', 'product'], $samples);
            if (count($samples) === 25) {
                $this->line('  … first 25 rows only. Use --report for the full breakdown.');
            }
        }

        if ($rejected !== []) {
            $this->line('');
            $rows = [];
            foreach (PromotionGate::REASONS as $reason => $meaning) {
                if (($rejected[$reason] ?? 0) > 0) {
                    $rows[] = [$reason, $meaning, number_format($rejected[$reason])];
                }
            }
            $this->table(['blocked by', 'meaning', 'rows'], $rows);
        }

        $this->line('');

        if ($dryRun) {
            if ($backlogPublished > 0) {
                $this->info(sprintf(
                    '%s product(s) promoted by an earlier run would be PUBLISHED. NOTHING WAS WRITTEN.',
                    number_format($backlogPublished),
                ));
            }
            $this->info(sprintf(
                '%s of %s row(s) would be promoted%s. NOTHING WAS WRITTEN.',
                number_format($created),
                number_format($scanned),
                $publish ? ' AND PUBLISHED' : ' (unpublished)',
            ));
            $this->line('  Drop --dry-run to run it.');

            return self::SUCCESS;
        }

        // Reported separately from the creation count, because they are two different things that
        // happened to the catalogue and only one of them added a product. Before publishBacklog()
        // existed this line could not be written at all — the number was always zero.
        if ($backlogPublished > 0) {
            $this->info(sprintf(
                '%s product(s) promoted by an earlier run were PUBLISHED and submitted to IndexNow.',
                number_format($backlogPublished),
            ));
        }

        $this->info(sprintf(
            '%s product(s) created%s.',
            number_format($created),
            $publish
                ? sprintf(', %s PUBLISHED and submitted to IndexNow', number_format($created - $failedPublishes))
                : ' — unpublished (publier=0, seo_robots_index=0)',
        ));

        if ($failedPublishes > 0) {
            $this->warn(sprintf(
                '%s product(s) were created and committed but the publish save failed. They exist, '
                .'complete and unpublished (publier=0, seo_robots_index=0), and no URL was submitted '
                .'for them. They are now part of the backlog, so the next --publish run retries them '
                .'once the error above is understood; the admin works too.',
                number_format($failedPublishes),
            ));
        }

        if ($backlogFailed > 0) {
            $this->warn(sprintf(
                '%s product(s) from the backlog could not be published — the save failed. They are '
                .'unchanged (publier=0, seo_robots_index=0) and no URL was submitted for them; the '
                .'next --publish run will try them again.',
                number_format($backlogFailed),
            ));
        }

        if ($failedWrites > 0) {
            $this->warn(sprintf(
                '%s row(s) could not be written and are still `hydrated` with the database error in status_reason.',
                number_format($failedWrites),
            ));
        }

        // This instruction is the reason the missing publish path mattered so much: the command told
        // the operator to run something that did nothing, so following it correctly produced 20,000
        // invisible products and a success message. It stays, and now it is true.
        if (! $publish && $created > 0) {
            $this->line('  Review them in the admin, then publish in waves:');
            $this->line('     php artisan catalog:iherb:promote --publish --limit=100');
        }

        // The wave is what this run PUBLISHED, backlog and freshly-created together — the same total
        // $createLimit was computed from. Comparing $created alone said "there is more to do" only
        // when the wave had been spent on creation, and stayed silent on the run that spent all 100
        // on a backlog of 20,000.
        if ($publish && $limit !== null && ($backlogPublished + $backlogFailed + $created) >= $limit) {
            $this->line('  The wave filled up. Re-run the same command to publish the next one.');
        }

        return self::SUCCESS;
    }
}
