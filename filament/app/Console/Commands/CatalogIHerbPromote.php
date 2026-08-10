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
use App\Services\Catalog\ImportedSourceContent;
use App\Services\Catalog\PromotionGate;
use App\Support\Gtin;
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
 * ── AND THAT STATE IS NOW REACHABLE, WHICH IT WAS NOT ─────────────────────────────────────
 * The paragraph above described (1, 0) as a state this command produces. It did not produce it.
 * publish() hardcoded BOTH `publier = true` AND `seo_robots_index = true`, and no flag existed to
 * separate them — so the command could only create (0, 0) or publish (1, 1), while THREE files
 * planned around (1, 0): this docblock, ImportedProductContent's ("a promotion path that wants pages
 * indexed should treat a short result as promote with seo_robots_index = 0") and
 * frontend/src/util/sitemapData.ts ("the exact state CatalogIHerbPromote creates"). Three
 * descriptions of a state the code could not reach is not documentation, it is a plan nobody
 * executed.
 *
 * `seo_robots_index` is now DECIDED, per product, by PromotionGate::indexable() over a MEASURED word
 * count — `catalog.promotion.min_body_words`, which is frontend/scripts/audit-pdp-content.mjs
 * MIN_NEW_PRODUCT_WORDS (250). Below it the product is published and NOINDEXED: on the storefront,
 * sellable, out of the sitemap, `<meta robots="noindex">`. At or above it the product is published
 * indexable. Both counts, and the reason, are printed by summarise(). The overrides are
 * --force-index and --force-noindex, one in each direction, and the DEFAULT is the measured gate —
 * because the failure direction of getting this wrong is thousands of thin pages submitted for
 * indexing, and that is not a decision to make by omission.
 *
 * Where the number comes from is the other half of the fix: ImportedProductContent::compose()
 * already returned `word_count`, computed the way the audit computes `bodyWords` and documented as
 * being for exactly this comparison — and createProduct() read the copy out of that array and threw
 * the number away. It is now persisted on the staging row (`composed_word_count`, migration
 * 2026_08_10_000007) at promotion time, so a publish wave never has to recompose to find out what it
 * is publishing. See bodyWords() for why the LIVE product body still wins when there is one.
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
                            {--publish : Publish a wave (publier=1; seo_robots_index per the measured body gate) — re-measure already-published noindexed products first, then the backlog an earlier run left unpublished, then anything this run creates}
                            {--reindex : Run ONLY the re-measure pass: already-published products held back at seo_robots_index=0 whose body now clears the gate become indexable. Creates and publishes nothing.}
                            {--recompose : Run ONLY the re-compose pass: rewrite the body of ALREADY-PROMOTED products from the page content transcribed since they were created. Creates and publishes nothing, and never touches a body a human has edited.}
                            {--force-index : Publish INDEXABLE even where the body is below catalog.promotion.min_body_words}
                            {--force-noindex : Publish every product of this wave noindexed, whatever it measures}
                            {--dry-run : Print the gate breakdown and write nothing}
                            {--report : Print counts per rejection reason and exit}';

    protected $description = 'Promote hydrated iHerb staging rows into products';

    /**
     * What publish() did to one product. Three outcomes, not a bool, because "published" and
     * "published indexable" stopped being the same event the moment the robots flag became a
     * decision — and a summary that cannot tell them apart is a summary that hides the only thing
     * about this wave anybody needs to check.
     */
    private const PUBLISHED_INDEXABLE = 'indexable';
    private const PUBLISHED_NOINDEX = 'noindex';
    private const PUBLISH_FAILED = 'failed';

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

        // Before the promote path, and alone: it creates nothing, publishes nothing and decides no
        // robots flag, so folding it into a wave would only make it harder to see what it did.
        if ($this->option('recompose')) {
            return $this->recomposePromoted($brandKey, $subcategory);
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
        $reindexOnly = (bool) $this->option('reindex');
        // --reindex writes seo_robots_index on live products and fires the same notifications a
        // publish does, so it is a publishing act for every purpose this method cares about: the
        // wave size, the index mode and the pre-flight arithmetic all apply to it unchanged.
        $publish = (bool) $this->option('publish') || $reindexOnly;
        $limit = $this->waveSize($publish);

        $mode = $this->indexMode($publish);
        if ($mode === false) {
            return self::FAILURE;
        }

        /*
         * THE PRE-FLIGHT ARITHMETIC, AS IT ACTUALLY IS.
         *
         * This used to promise "three HTTP calls apiece (revalidate path, revalidate sitemap tag,
         * IndexNow) … ~limit*3 requests", and it stopped being true when SeoNotifier learned to
         * coalesce the sitemap bust: send() still posts the per-product revalidate and the per-product
         * IndexNow submission, but the third call now goes through bustSitemapCache(), which returns
         * without sending if this process sent one inside the last 60 seconds. Every one of these
         * notifications is an afterResponse callback, and under `php artisan` "after response" is
         * command TERMINATION — so the whole wave's busts happen back-to-back at the end of the run
         * and collapse into one, or one per minute if the tail runs long.
         *
         * A number a warning prints is a number somebody plans a maintenance window around. The
         * multiplier is asserted against SeoNotifier's own source in
         * filament/tests/catalog/promotion-gate-check.php, so a third per-product call cannot be added
         * there without this line failing a harness.
         */
        if ($publish && ! $dryRun) {
            $this->warn(sprintf(
                'Publishing %s product(s). ProductSeoObserver::saved fires SeoNotifier for each one, '
                .'from the post-commit publish and not from inside the transaction — at most TWO '
                .'per-product HTTP calls apiece (revalidate the product path, submit the URL to '
                .'IndexNow). That is ~%s requests at the storefront AT THE UPPER BOUND, plus ONE '
                .'sitemap cache-bust for the whole wave: SeoNotifier::bustSitemapCache() sends at most '
                .'one per 60s per process and every one of these callbacks runs at command '
                .'termination. A product held back at seo_robots_index=0 costs only the FIRST of the '
                .'two — its page is still revalidated because it is still on the storefront, but '
                .'SeoNotifier::shouldSubmitToIndexNow() suppresses the submission, because asking an '
                .'engine to crawl a URL we render <meta robots="noindex"> on is a request we should '
                .'never make.',
                $limit === null ? 'every promotable' : number_format($limit),
                $limit === null ? 'an unbounded number of' : number_format($limit * 2),
            ));
        }

        /**
         * The indexing tally for this wave, filled by the backlog pass and the creation loop alike.
         *
         * `below_gate` is counted from the MEASURED verdict whatever mode is in force, which is what
         * makes the overrides reportable rather than merely obeyed: under --force-index it is the
         * number of thin pages the operator chose to index anyway, and under --force-noindex it is
         * the complement of the pages that would have qualified. min/max words are carried so the
         * summary can state the size of the shortfall instead of asserting one.
         *
         * @var array{indexable:int, noindex:int, below_gate:int, min_words:?int, max_words:?int}
         */
        $indexing = ['indexable' => 0, 'noindex' => 0, 'below_gate' => 0, 'min_words' => null, 'max_words' => null];

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
        /*
         * THE RATCHET, WHICH DID NOT EXIST.
         *
         * reportIndexing() has been telling the operator, in these words: "Write real copy into
         * description_fr and the next --publish wave indexes it — the gate measures the LIVE body."
         * Nothing in this command could do that. publishBacklog() selects products at `publier = 0`;
         * publish() is only ever reached for a product being published for the first time; and
         * `seo_robots_index` is written in exactly two places in filament/app — publish(), and the
         * Filament toggle a human clicks. So a product published at (1, 0) — which is EVERY imported
         * product whose composed body falls short of the 250-word gate, i.e. all of them until
         * somebody writes copy — could never become indexable again by any automatic route. The
         * instruction the command printed was unreachable, and following it correctly produced
         * nothing at all.
         *
         * It runs BEFORE the backlog, and that ordering is the point: a product that already exists
         * and has just been given real copy is a page that is ready NOW, while a backlog product is
         * one more thin page. Given a bounded wave, spend it on the finished work first.
         */
        $reindexed = 0;
        $reindexScanned = 0;
        $reindexFailed = 0;
        if ($publish) {
            $reindex = $this->reindexPublished($brandKey, $subcategorySlug, $limit, $dryRun, $mode, $indexing);
            $reindexed = $reindex['reindexed'];
            $reindexScanned = $reindex['scanned'];
            $reindexFailed = $reindex['failed'];
        }

        $backlogPublished = 0;
        $backlogFailed = 0;
        // --reindex is deliberately ONLY the re-measure pass: it publishes nothing new and creates
        // nothing, so an operator who has just written copy can act on it without also putting a
        // fresh wave of unreviewed products in front of customers.
        if ($publish && ! $reindexOnly) {
            $backlogLimit = $limit === null ? null : max(0, $limit - ($reindexed + $reindexFailed));
            $backlog = $this->publishBacklog($brandKey, $subcategorySlug, $backlogLimit, $dryRun, $mode, $indexing);
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
         * creation costs — TWO per-product HTTP calls (revalidate the path, submit the URL to
         * IndexNow); the third, the sitemap bust, is coalesced by SeoNotifier::bustSitemapCache() to
         * one per 60s per process and is therefore a cost of the WAVE, not of the product. The whole
         * point of the wave is that somebody chose that number. Attempts count, not successes: a
         * failed publish already fired its save.
         */
        $createLimit = $limit;
        if ($publish && $limit !== null) {
            $createLimit = max(0, $limit - ($reindexed + $reindexFailed + $backlogPublished + $backlogFailed));
        }

        // A wave fully spent on the re-measure pass or the backlog creates nothing, and --reindex
        // creates nothing by definition, so the scan is skipped outright rather than opened and then
        // abandoned on its first row.
        /** @var iterable<Collection<int, ExternalCatalogProduct>> $chunks */
        $chunks = ($createLimit === 0 || $reindexOnly) ? [] : $this->chunks($brandKey, true);

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
                        // Fifth cell empty: a rejected row has no body, so it has no word count and
                        // no indexing verdict. The column exists for the rows that do.
                        $samples[] = ['·', $reason, (string) $verdict['detail'], Str::limit($verdict['title'], 46), ''];
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

                        /*
                         * THE DRY RUN FORECASTS THE INDEXING DECISION TOO, because that is now the
                         * part of a --publish wave that cannot be undone. The body is composed here
                         * exactly as createProduct() would compose it, with one difference stated
                         * rather than hidden: the brand string is the RAW `source_brand_name`, not
                         * BrandMatcher's tidied `designation_fr`, because the matcher CREATES brand
                         * rows and --dry-run writes nothing. The two spellings differ by at most a
                         * token or two, so this is a forecast accurate to a word, not a promise.
                         */
                        $words = $this->body($row, $row->source_brand_name, $subcategories, (int) $verdict['sub_id'])['word_count'];
                        $forecast = $this->verdictFor($words, $mode);
                        if ($publish) {
                            $this->recordIndexVerdict($indexing, $forecast);
                        }

                        if (count($samples) < 25) {
                            $samples[] = [
                                '+',
                                sprintf('%.3f DT', (float) $verdict['price']),
                                sprintf('/%s/%s', (string) $verdict['sub_slug'], $slug),
                                Str::limit($verdict['title'], 46),
                                sprintf('%d w %s', $words, $publish ? ($forecast['applied'] ? '→ index' : '→ noindex') : '(not published)'),
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
                if ($publish && $this->publish($product, $row, $mode, $indexing) === self::PUBLISH_FAILED) {
                    $failedPublishes++;
                }
            }
        }

        return $this->summarise(
            $dryRun, $publish, $created, $scanned, $rejected, $failedWrites, $failedPublishes,
            $backlogPublished, $backlogFailed,
            ['reindexed' => $reindexed, 'scanned' => $reindexScanned, 'failed' => $reindexFailed],
            $samples, $limit, $mode, $indexing,
        );
    }

    /**
     * RE-COMPOSE the body of products that were promoted BEFORE their source page was read.
     *
     * ── WHAT WAS BROKEN, AND WHO IT HIT ───────────────────────────────────────────────────────
     * `ImportedSourceContent::body()` folds the manufacturer's overview into `products.description_fr`
     * at exactly one place: inside createProduct(), i.e. `Product::create()`. chunks() only ever
     * yields rows at `status = hydrated AND product_id IS NULL`, so a row that has reached `promoted`
     * can never re-enter that path; --reindex writes only `seo_robots_index`, --rederive recomputes a
     * word count, and `catalog:iherb:content --refetch` re-fills staging columns. Nothing wrote
     * `description_fr`, `gtin` or `seo_schema_description` on a product that already existed.
     *
     * Every one of the 812 imported products already exists. Worse, ExternalCatalogProduct::
     * scopeAwaitingContent orders `promoted` rows FIRST precisely because 100 of them are LIVE pages
     * — so the content pass spends its first requests fetching overviews for the exact products that
     * could never receive one. Those pages gained the sections, the panel and the gallery (the API
     * reads the staging row live) and stayed permanently without the largest block of prose the pass
     * extracts, without a barcode — leaving `products:enrich-dsld` and `seo:enrich-nutrition` with
     * nothing to match on — and without the JSON-LD description. Measured on the fixtures, the
     * overview is ~77-177 words, which is also the difference between clearing the 250-word gate and
     * being held back by it for ever.
     *
     * ── WHAT IT WILL NOT DO: OVERWRITE A HUMAN ────────────────────────────────────────────────
     * The documented workflow is "promote unpublished, REVIEW IN THE ADMIN, then publish in waves",
     * and the whole point of the review is to improve the copy. A pass that rewrote `description_fr`
     * unconditionally would delete that work with no undo, at catalogue scale.
     *
     * So a product is rewritten ONLY when its current body is, byte for byte, a body this command
     * composed: the composed block alone, as createProduct() would have written it with no overview.
     * Both variants are accepted — with and without the `label_scope` sentence — because whether that
     * sentence was printed depends on a nutrition panel the row may have gained since. Anything else
     * (a hand-edited body, a body that already leads with the overview) is counted and left alone.
     *
     * `gtin` and `seo_schema_description` are written only when the product's own value is blank, for
     * the same reason and with the same result: nothing a human entered is replaced.
     *
     * ── AND WHAT IT COSTS ─────────────────────────────────────────────────────────────────────
     * Nothing at the storefront. ProductSeoObserver::saved fires on `prix, promo, qte, rupture,
     * force_out_of_stock, publier, slug, designation_fr, seo_robots_index` — `description_fr` is in
     * none of them — so this save sends no revalidate, no IndexNow submission and no sitemap bust.
     * The new body reaches the page on the storefront's own revalidation, and the indexing decision
     * is a separate, deliberate act: `--reindex` measures it.
     *
     * THE 309 LEGACY PRODUCTS ARE UNREACHABLE HERE BY CONSTRUCTION, not by a filter: selection starts
     * at `external_catalog_products` and they have no row in it.
     */
    private function recomposePromoted(?string $brandKey, ?string $subcategorySlug): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit = $this->option('limit') === null ? null : max(0, (int) $this->option('limit'));

        $subId = $subcategorySlug === null ? null : ($this->subcategories()['ids'][$subcategorySlug] ?? -1);

        $scanned = 0;
        $rewritten = 0;
        $unchanged = 0;
        $handEdited = 0;
        $noContent = 0;
        $gtins = 0;
        $schemas = 0;
        $failed = 0;
        $wordsBefore = 0;
        $wordsAfter = 0;

        $chunk = max(1, (int) config('catalog.promotion.chunk', 100));
        $cursor = 0;

        while ($limit === null || $rewritten + $failed < $limit) {
            $rows = ExternalCatalogProduct::query()
                ->with(['product', 'product.brand'])
                ->where('provider', IHerbClient::PROVIDER)
                ->where('status', ExternalCatalogProduct::STATUS_PROMOTED)
                ->whereNotNull('product_id')
                ->where('id', '>', $cursor)
                ->when($brandKey !== null, fn ($q) => $q->where('normalized_brand_key', $brandKey))
                ->when($subId !== null, fn ($q) => $q->where('sous_category_id', $subId))
                // The pass is only ever useful for a row whose page HAS been read; a row with no
                // transcribed overview would recompose to exactly what it already holds.
                ->whereNotNull('source_overview_html')
                ->orderBy('id')
                ->limit($chunk)
                ->get();

            if ($rows->isEmpty()) {
                break;
            }

            $cursor = (int) $rows->last()->id;
            $subcategories = $this->subcategories();

            foreach ($rows as $row) {
                if ($limit !== null && $rewritten + $failed >= $limit) {
                    break 2;
                }

                $product = $row->product;
                if ($product === null) {
                    continue;
                }

                $scanned++;

                $rowSubId = (int) ($row->sous_category_id ?: $product->sous_categorie_id);
                $brandName = $product->brand?->designation_fr ?? $row->source_brand_name;

                $body = $this->body($row, $brandName, $subcategories, $rowSubId);

                if (! $body['has_source_body']) {
                    // The row carries an overview column but nothing publishable came out of it —
                    // the language gate, or markup that sanitises to nothing. Not an error.
                    $noContent++;

                    continue;
                }

                $current = (string) $product->description_fr;
                $next = (string) $body['description_fr'];

                if (trim($current) === trim($next)) {
                    $unchanged++;

                    continue;
                }

                if (! $this->bodyIsMachineComposed($current, $row, $brandName, $subcategories, $rowSubId)) {
                    $handEdited++;

                    continue;
                }

                $wordsBefore += ImportedSourceContent::renderedWordCount($current, $row->getAttributes());
                $wordsAfter += $body['word_count'];

                $gtin = Gtin::normalize($row->source_gtin);
                $writesGtin = $gtin !== null && blank($product->gtin);
                $writesSchema = $body['schema_description'] !== null && blank($product->seo_schema_description);

                if ($dryRun) {
                    $rewritten++;
                    $gtins += $writesGtin ? 1 : 0;
                    $schemas += $writesSchema ? 1 : 0;

                    continue;
                }

                try {
                    $product->description_fr = $next;
                    if ($writesGtin) {
                        $product->gtin = $gtin;
                    }
                    if ($writesSchema) {
                        $product->seo_schema_description = $body['schema_description'];
                    }
                    $product->save();

                    // The staged figure is what the admin's staging view shows and what bodyWords()
                    // falls back to; leaving it describing the old body would make the two disagree
                    // about the same product. Same clamp createProduct() applies.
                    $row->forceFill(['composed_word_count' => max(0, min(65535, $body['word_count']))])->save();
                } catch (QueryException $e) {
                    $failed++;
                    $this->warn(sprintf(
                        '  row %d: product %d could not be re-composed: %s',
                        $row->id,
                        $product->id,
                        Str::limit($e->getMessage(), 140),
                    ));

                    continue;
                }

                $rewritten++;
                $gtins += $writesGtin ? 1 : 0;
                $schemas += $writesSchema ? 1 : 0;
            }
        }

        $this->line('');
        $this->info(sprintf(
            '%s%s promoted product(s) inspected · %s re-composed · %s already current · %s left alone (body edited since promotion) · %s carried nothing publishable · %s failed.',
            $dryRun ? '[dry run] ' : '',
            number_format($scanned),
            number_format($rewritten),
            number_format($unchanged),
            number_format($handEdited),
            number_format($noContent),
            number_format($failed),
        ));

        if ($rewritten > 0) {
            $this->line(sprintf(
                '  %s product(s) gained a barcode (products.gtin) · %s gained a JSON-LD description.',
                number_format($gtins),
                number_format($schemas),
            ));
            $this->line(sprintf(
                '  Rendered words across those products: %s → %s.',
                number_format($wordsBefore),
                number_format($wordsAfter),
            ));
            $this->line('  Nothing was published and no robots flag moved. Run '
                .'`php artisan catalog:iherb:promote --reindex` to let the ones that now clear the '
                .'gate become indexable.');
        }

        if ($handEdited > 0) {
            $this->warn(sprintf(
                '%s product(s) were skipped because their body is no longer the one this command '
                .'composed — a human edited it. They are never overwritten; add the manufacturer '
                .'overview by hand if you want it there.',
                number_format($handEdited),
            ));
        }

        return self::SUCCESS;
    }

    /**
     * Is this body still exactly what promotion wrote, i.e. safe to replace?
     *
     * The composed block is deterministic in the row, the brand name and the subcategory, so it can
     * be recomposed and compared. Two variants are accepted because ONE sentence in it depends on a
     * fact that can change after promotion: ImportedProductContent drops the "no nutrition values are
     * published" line when the page carries a transcribed Supplement Facts panel, and a row promoted
     * before the content pass had no panel. Both are bodies this command wrote; neither is a human's.
     *
     * A body that is anything else — edited in the admin, or already re-composed with the overview in
     * front — returns false and is left untouched.
     *
     * @param  array{ids: array<string, int>, labels: array<int, string>, slugs: array<int, string>, categories: array<int, string>}  $subcategories
     */
    private function bodyIsMachineComposed(
        string $current,
        ExternalCatalogProduct $row,
        ?string $brandName,
        array $subcategories,
        int $subId,
    ): bool {
        $current = trim($current);

        if ($current === '') {
            // An empty body is not a human's work either, and leaving it empty is what makes
            // CrawlerProductView fall through to the storefront's identical-for-every-product
            // boilerplate. Safe to write.
            return true;
        }

        $attributes = $row->getAttributes();
        $fallback = $this->description($row, $brandName, $subcategories['labels'][$subId] ?? null);

        foreach ([true, false] as $hasPanel) {
            $composed = ImportedProductContent::fromStagingRow($attributes, [
                'brand' => $brandName,
                'sub_category_slug' => $subcategories['slugs'][$subId] ?? null,
                'sub_category_label' => $subcategories['labels'][$subId] ?? null,
                'category_label' => $subcategories['categories'][$subId] ?? null,
                'page_has_nutrition_panel' => $hasPanel,
            ])['description_fr'] ?? $fallback;

            if ($composed !== null && trim((string) $composed) === $current) {
                return true;
            }
        }

        return false;
    }

    /**
     * RE-MEASURE products that are already published but were held back at seo_robots_index = 0, and
     * make the ones whose body now clears the gate indexable. The ratchet the command has been
     * promising in print and could not perform.
     *
     * ── WHAT WAS BROKEN, EXACTLY ──────────────────────────────────────────────────────────────
     * reportIndexing() prints: "Write real copy into description_fr and the next --publish wave
     * indexes it — the gate measures the LIVE body." Every clause of that is true about
     * bodyWords(); none of it was reachable. The only two callers of publish() are the creation loop
     * (a product that did not exist a second ago) and publishBacklog(), whose selection is
     * `publier = 0 OR NULL`. A product sitting at (1, 0) matches neither, and `seo_robots_index` is
     * written nowhere else in filament/app except the Filament toggle. So the documented workflow —
     * publish the wave noindexed, write the copy, let the next wave index it — terminated after
     * step one, permanently, for every imported product.
     *
     * ── WHAT IT SELECTS, AND WHAT IT CANNOT REACH ─────────────────────────────────────────────
     * `status = promoted AND product_id IS NOT NULL`, joined to a product that is `publier = 1` AND
     * `seo_robots_index = 0` — the exact pair publish() writes for a body below the gate.
     *
     * `= 0`, never `IS NULL`: on an ALREADY-PUBLISHED product a NULL robots column means "never
     * set", which Product::getEffectiveSeoRobotsIndexAttribute() reads as INDEXABLE. Such a product
     * is already in the sitemap and there is nothing to ratchet. (publishBacklog() treats NULL as a
     * match for the opposite reason — there, an unpublished product with NULL has simply never been
     * decided about.)
     *
     * THE 309 LEGACY HAND-MADE PRODUCTS ARE UNREACHABLE FROM HERE BY CONSTRUCTION, not by a filter
     * that could be edited out: selection starts at `external_catalog_products` and they have no
     * staging row, so no query this method can issue names one of them. That matters concretely —
     * measured 2026-08-10, 49 of the 410 published products carry seo_robots_index = 0 and every one
     * of them is a legacy product an admin deliberately noindexed. A pass that "helpfully" re-indexed
     * everything noindexed would overturn 49 human decisions on its first run.
     *
     * ── THE CAVEAT, STATED RATHER THAN HIDDEN ─────────────────────────────────────────────────
     * An owner who uses the Filament robots toggle to noindex an IMPORTED product that has a long
     * body puts it into exactly the state this selects, and the next run will re-index it. The
     * columns cannot distinguish "held back by the gate" from "rejected by a human", and inventing a
     * staging column to encode that is a schema change for a case the admin can express by
     * unpublishing or deleting the product. This is the same trade publishBacklog() already documents
     * for `publier`.
     *
     * ── WHY THE SCAN IS CHEAP ─────────────────────────────────────────────────────────────────
     * At 19,000 imported products, measuring every held-back body on every wave would mean pulling
     * every `description_fr` out of the database each run. So the query pre-filters on
     * CHAR_LENGTH(description_fr): a word needs at least one character plus a separator, so a body of
     * fewer than `min_body_words` characters cannot possibly contain `min_body_words` words. It is a
     * strict LOWER bound — it can never exclude a product that would have passed — and it removes
     * essentially the whole backlog from the scan, because the composed bodies are short by exactly
     * the amount that put them here.
     *
     * Only a product that ACTUALLY FLIPS costs anything: a row that is scanned and still falls short
     * is not saved, fires no observer, sends no HTTP call, and does not consume the wave. So this
     * pass drains itself and is a no-op on a catalogue nobody has written copy for.
     *
     * @param  array{indexable:int, noindex:int, below_gate:int, min_words:?int, max_words:?int}  $indexing
     * @return array{reindexed: int, scanned: int, failed: int}
     */
    private function reindexPublished(
        ?string $brandKey,
        ?string $subcategorySlug,
        ?int $limit,
        bool $dryRun,
        string $mode,
        array &$indexing,
    ): array {
        $reindexed = 0;
        $scanned = 0;
        $failed = 0;

        // --force-noindex means "hold everything back", so a re-measure pass under it can only ever
        // decide to change nothing. Skipping it outright keeps the summary honest instead of
        // reporting a scan that was incapable of an outcome.
        if ($mode === PromotionGate::INDEX_SUPPRESSED) {
            return ['reindexed' => 0, 'scanned' => 0, 'failed' => 0];
        }

        $subId = $subcategorySlug === null ? null : ($this->subcategories()['ids'][$subcategorySlug] ?? -1);
        $minWords = $this->minBodyWords();
        // Under --force-index the gate is not consulted at all, so the length pre-filter must not
        // exclude anything either — 0 keeps every held-back product in the scan.
        $minChars = $mode === PromotionGate::INDEX_FORCED ? 0 : max(0, $minWords);

        $chunk = max(1, (int) config('catalog.promotion.chunk', 100));
        $cursor = 0;

        while ($limit === null || $reindexed + $failed < $limit) {
            $rows = ExternalCatalogProduct::query()
                ->with('product')
                ->where('provider', IHerbClient::PROVIDER)
                ->where('status', ExternalCatalogProduct::STATUS_PROMOTED)
                ->whereNotNull('product_id')
                ->where('id', '>', $cursor)
                ->when($brandKey !== null, fn ($q) => $q->where('normalized_brand_key', $brandKey))
                ->when($subId !== null, fn ($q) => $q->where('sous_category_id', $subId))
                ->whereHas('product', function ($q) use ($minChars): void {
                    $q->where('publier', 1)
                        ->where('seo_robots_index', 0)
                        ->whereRaw($this->bodyLengthLowerBoundSql().' >= ?', [$minChars]);
                })
                ->orderBy('id')
                // The cursor only ever moves forward, so rows dropping out of the result set as they
                // are re-indexed cannot make this loop repeat or stall. The chunk is NOT bounded by
                // the remaining wave, because most rows in it will not flip and must not be counted
                // against it.
                ->limit($chunk)
                ->get();

            if ($rows->isEmpty()) {
                break;
            }

            $cursor = (int) $rows->last()->id;

            foreach ($rows as $row) {
                if ($limit !== null && $reindexed + $failed >= $limit) {
                    break 2;
                }

                $product = $row->product;
                if ($product === null) {
                    continue;
                }

                $scanned++;

                $verdict = $this->indexVerdict($product, $row, $mode);
                if (! $verdict['applied']) {
                    // Still short. No save, no notification, no wave spent — see the docblock.
                    continue;
                }

                if ($dryRun) {
                    $reindexed++;
                    $this->recordIndexVerdict($indexing, $verdict);

                    continue;
                }

                try {
                    // Assigned rather than forceFill()ed so `wasChanged(['seo_robots_index'])` — which
                    // ProductSeoObserver::saved now tests — is unambiguously true, and this save is
                    // what revalidates the page, busts the sitemap and (only now that the product is
                    // indexable) submits the URL to IndexNow.
                    $product->seo_robots_index = true;
                    $product->save();
                } catch (QueryException $e) {
                    $failed++;
                    $this->warn(sprintf(
                        '  row %d: product %d cleared the gate but could not be re-indexed: %s',
                        $row->id,
                        $product->id,
                        Str::limit($e->getMessage(), 140),
                    ));

                    continue;
                }

                $reindexed++;
                $this->recordIndexVerdict($indexing, $verdict);
            }
        }

        return ['reindexed' => $reindexed, 'scanned' => $scanned, 'failed' => $failed];
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
     * That caveat GREW when publish() started writing (1, 0) for a body below the gate. A product
     * held back at noindex which the owner then unpublishes with the Filament `publier` toggle alone
     * lands in (0, 0) — indistinguishable from "never published" — and the next wave republishes it,
     * noindexed. Before the gate existed, publish() always wrote (1, 1), so that same toggle left
     * (0, 1) and the rejection stuck. The remedy is the one already named above: delete the product,
     * or leave it unpublished only in a state the pair can express. Worth knowing exactly, because
     * the products this now applies to are ALL of them until real copy exists.
     *
     * The 309 pre-existing products are unreachable from here by construction, not by a filter that
     * could be edited out: selection starts at `external_catalog_products` and they have no staging
     * row, so no query this method can issue names one of them.
     *
     * The cursor is on `external_catalog_products.id` and only moves forward, so rows dropping out
     * of the result set as they are published cannot make this loop repeat or stall.
     *
     * @param  array{indexable:int, noindex:int, below_gate:int, min_words:?int, max_words:?int}  $indexing
     *         by reference: the wave's indexing tally is one tally across both passes, and the
     *         summary has to be able to say "of the 100 published, 12 indexable" without the
     *         operator adding up two separate reports
     * @return array{published: int, failed: int}
     */
    private function publishBacklog(
        ?string $brandKey,
        ?string $subcategorySlug,
        ?int $limit,
        bool $dryRun,
        string $mode,
        array &$indexing,
    ): array {
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
                $product = $row->product;
                if ($product === null) {
                    // whereHas matched but the eager load did not: the product was deleted between
                    // the two. Nothing to publish and nothing to repair.
                    continue;
                }

                if ($dryRun) {
                    // Same promise --dry-run makes everywhere else in this command: it reports and
                    // writes nothing. No save means no ProductSeoObserver, no IndexNow.
                    //
                    // The indexing verdict IS computed, and it is exact here rather than a forecast
                    // — the product exists, so the body being measured is the one that would be
                    // served. This is the number to look at before running the wave for real.
                    $published++;
                    $this->recordIndexVerdict($indexing, $this->indexVerdict($product, $row, $mode));

                    continue;
                }

                if ($this->publish($product, $row, $mode, $indexing) === self::PUBLISH_FAILED) {
                    $failed++;
                } else {
                    $published++;
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
     * ── PUBLISHING AND INDEXING ARE TWO DECISIONS, AND ONLY ONE OF THEM IS THIS COMMAND'S ──
     * `publier = true` is the operator's decision, made by typing --publish. `seo_robots_index` is a
     * MEASUREMENT: does the body this product ships with clear catalog.promotion.min_body_words?
     * This method used to assert both — `$product->seo_robots_index = true` with no way to say
     * otherwise — which is how the (1, 0) state three separate docblocks describe came to be
     * unreachable. Now the flag is whatever PromotionGate::indexable() returns, and the two
     * overrides are the operator's way of overruling the measurement in either direction, in
     * writing, with the count printed in the summary.
     *
     * Below the gate the product is still PUBLISHED: on the storefront, in the listings, sellable.
     * It is simply not offered to search engines — out of the sitemap (sitemapData.ts filters on
     * this exact column) and rendered `<meta robots="noindex">`. That is a weaker claim than
     * "unpublished", and it is the right one for a page whose only defect is that nobody has written
     * its copy yet.
     *
     * Guarded like every other per-row write in this command: one product whose UPDATE fails must
     * not abort the wave and lose the counters for everything already created. The product survives
     * as an unpublished, complete row, so the repair is a publish in the admin and not a re-import.
     *
     * @param  array{indexable:int, noindex:int, below_gate:int, min_words:?int, max_words:?int}  $indexing
     * @return self::PUBLISHED_INDEXABLE|self::PUBLISHED_NOINDEX|self::PUBLISH_FAILED
     */
    private function publish(Product $product, ExternalCatalogProduct $row, string $mode, array &$indexing): string
    {
        $verdict = $this->indexVerdict($product, $row, $mode);
        $indexable = $verdict['applied'];

        try {
            // Assigned rather than forceFill()ed so `wasChanged(['publier'])` — the condition
            // ProductSeoObserver::saved actually tests — is unambiguously true here.
            $product->publier = true;
            $product->seo_robots_index = $indexable;
            $product->save();
        } catch (QueryException $e) {
            $this->warn(sprintf(
                '  row %d: product %d was created but could not be published: %s',
                $row->id,
                $product->id,
                Str::limit($e->getMessage(), 140),
            ));

            return self::PUBLISH_FAILED;
        }

        // Counted only after the save succeeded. A wave that reports "88 published noindexed" must
        // mean 88 rows in that state, not 88 attempts.
        $this->recordIndexVerdict($indexing, $verdict);

        return $indexable ? self::PUBLISHED_INDEXABLE : self::PUBLISHED_NOINDEX;
    }

    /*
    |--------------------------------------------------------------------------
    | The indexing gate
    |--------------------------------------------------------------------------
    */

    /**
     * Should THIS product be indexable, and what did it measure?
     *
     * `measured` is the verdict the body alone gives and is recorded whatever mode is in force;
     * `applied` is what actually gets written. They differ exactly when an override is in play,
     * which is what lets the summary print "12 were indexed below the gate because --force-index was
     * given" instead of silently obeying.
     *
     * @return array{words:int, measured:bool, applied:bool}
     */
    private function indexVerdict(Product $product, ExternalCatalogProduct $row, string $mode): array
    {
        return $this->verdictFor($this->bodyWords($product, $row), $mode);
    }

    /**
     * The same decision from a bare word count — the form the dry run needs, where no product exists
     * yet. One implementation, so a forecast and a real run cannot disagree about the same number.
     *
     * @return array{words:int, measured:bool, applied:bool}
     */
    private function verdictFor(int $words, string $mode): array
    {
        $min = $this->minBodyWords();

        return [
            'words' => $words,
            'measured' => PromotionGate::indexable($words, $min, PromotionGate::INDEX_MEASURED),
            'applied' => PromotionGate::indexable($words, $min, $mode),
        ];
    }

    /**
     * How many words the page this product will serve actually carries.
     *
     * ── THE LIVE BODY WINS OVER THE STAGED NUMBER, AND THAT IS THE POINT ──────────────────
     * `external_catalog_products.composed_word_count` is what promotion measured when it wrote the
     * copy, and it exists so a publish wave never has to recompose (see the migration). But the
     * documented workflow between the two steps is "review them in the admin, THEN publish in
     * waves", and the whole reason to review an imported product is to improve its copy. Trusting
     * the staged number would mean an operator could write 400 words of real French into
     * description_fr and still watch the product publish noindexed, with the only escape being a
     * --force-index that then also indexes every untouched product in the wave. Measuring the column
     * that will actually be served makes the gate a ratchet that opens as the copy improves, one
     * product at a time.
     *
     * At promotion time the two numbers are the same string measured twice, because createProduct()
     * writes both in one transaction — promotion-gate-check.php asserts that equivalence on a real
     * composed body rather than assuming it.
     *
     * The staged count is the fallback for the one case the live body cannot answer: a product whose
     * description_fr is empty. And a NULL staged count — every row promoted before migration
     * 2026_08_10_000007, which is all 812 currently sitting at publier = 0 — reads as 0, i.e. below
     * any positive gate, i.e. published noindexed. That is the safe direction, and in practice those
     * rows never reach it: they all have a description_fr, so they are measured properly.
     */
    private function bodyWords(Product $product, ExternalCatalogProduct $row): int
    {
        $body = trim((string) $product->description_fr);

        if ($body !== '') {
            /*
             * The audit's own definition of a word, so this number and the number
             * frontend/scripts/audit-pdp-content.mjs will report for the rendered page are the same
             * kind of number. It is a deliberate UNDER-estimate of the finished page: the crawler
             * view also renders the title, the spec list and the price/availability section, none of
             * which are counted. Erring low means the gate holds back a page it could have indexed;
             * erring high would mean indexing a page the audit then fails.
             *
             * ── IT NOW REACHES PAST description_fr, BECAUSE THE PAGE DOES ────────────────────
             * The suggested-use, ingredients and warnings blocks are stored on the staging row and
             * render as their own sections on BOTH product routes. Measuring the column alone would
             * hold a product back for being thin while a customer reads three more paragraphs of it,
             * and would make the gate a measurement of a page that does not exist.
             *
             * The staging row is already loaded at every call site — publish() and
             * reindexPublished() both have it in hand — so this costs no query.
             */
            return ImportedSourceContent::renderedWordCount($body, $row->getAttributes());
        }

        $staged = $row->composed_word_count;

        return $staged === null ? 0 : max(0, (int) $staged);
    }

    /**
     * A STRICT LOWER BOUND, in SQL, on the number of words the page renders.
     *
     * ── WHY THE PRE-FILTER HAD TO GROW ────────────────────────────────────────────────────
     * reindexPublished() cannot afford to pull every held-back body out of the database on every
     * wave, so it pre-filters on character length: a word needs at least one character, therefore a
     * body of fewer than `min_body_words` CHARACTERS cannot hold `min_body_words` words. That is a
     * bound that can never exclude a product which would have passed — which is the only property
     * that makes a pre-filter safe.
     *
     * It stopped being that bound the moment bodyWords() started counting the transcribed sections
     * as well. A product with a 60-character description_fr and 900 words of suggested use,
     * ingredients and warnings clears the gate and would never have been SCANNED: the ratchet would
     * have silently refused to index exactly the products this whole content pass was built for.
     *
     * So every column the word count reads is summed here, and the list is derived from
     * ImportedSourceContent::SECTION_COLUMNS rather than typed out — add a section there and this
     * bound follows it, instead of quietly excluding it.
     *
     * The Supplement Facts column is absent for the same reason it is absent from the count: it is
     * not counted, so including its length would make the bound looser than it needs to be (still
     * safe, but it would scan rows that cannot flip).
     *
     * ── THE TABLE NAMES ARE EXPLICIT ON PURPOSE ───────────────────────────────────────────
     * This expression is used inside whereHas('product'), i.e. a correlated EXISTS subquery over
     * `products` nested in a query over `external_catalog_products`. Both tables are in scope there
     * and only one of them is the subquery's own — an unqualified `description_fr` happens to
     * resolve, an unqualified `source_warnings_html` would too, and relying on either is how this
     * breaks the day a column name is added to the other table.
     */
    private function bodyLengthLowerBoundSql(): string
    {
        $terms = ["CHAR_LENGTH(COALESCE(products.description_fr, ''))"];

        foreach (array_keys(ImportedSourceContent::SECTION_COLUMNS) as $column) {
            $terms[] = sprintf("CHAR_LENGTH(COALESCE(external_catalog_products.%s, ''))", $column);
        }

        return '('.implode(' + ', $terms).')';
    }

    /**
     * The gate, from config, with PromotionGate's constant as the strict fallback.
     *
     * Read here rather than passed down from contextFrom() because publishBacklog() builds no gate
     * context at all — it never inspects a staging row, it publishes products an earlier run already
     * accepted.
     */
    private function minBodyWords(): int
    {
        return (int) config('catalog.promotion.min_body_words', PromotionGate::DEFAULT_MIN_BODY_WORDS);
    }

    /**
     * Which of the three index modes this run is in, or false when the operator asked for two
     * contradictory things.
     *
     * The DEFAULT IS THE MEASURED GATE, deliberately and not merely conventionally: this decides
     * whether URLs are offered to search engines, the failure direction is thousands of thin pages
     * in the index, and an index submission is not something that gets taken back. Both overrides
     * therefore have to be typed, and both are named in the summary next to their counts.
     *
     * @return string|false
     */
    private function indexMode(bool $publish): string|false
    {
        $force = (bool) $this->option('force-index');
        $suppress = (bool) $this->option('force-noindex');

        if ($force && $suppress) {
            $this->error('--force-index and --force-noindex contradict each other. Pass one, or neither to use the measured gate.');

            return false;
        }

        if (($force || $suppress) && ! $publish) {
            // Not fatal — the run is still a valid promote — but silence here would let somebody
            // believe a wave had been forced when nothing was published at all.
            $this->warn('--force-index/--force-noindex only affect publication and this run has no --publish. Products will be created at publier=0, seo_robots_index=0 as usual.');
        }

        if ($force) {
            return PromotionGate::INDEX_FORCED;
        }

        return $suppress ? PromotionGate::INDEX_SUPPRESSED : PromotionGate::INDEX_MEASURED;
    }

    /**
     * Fold one product's verdict into the wave's tally.
     *
     * @param  array{indexable:int, noindex:int, below_gate:int, min_words:?int, max_words:?int}  $indexing
     * @param  array{words:int, measured:bool, applied:bool}  $verdict
     */
    private function recordIndexVerdict(array &$indexing, array $verdict): void
    {
        $indexing[$verdict['applied'] ? 'indexable' : 'noindex']++;

        // From `measured`, NOT from `applied` — under an override these two are exactly the number
        // the operator overruled, and reporting `applied` would make every forced wave claim it had
        // nothing below the gate.
        if (! $verdict['measured']) {
            $indexing['below_gate']++;
        }

        $indexing['min_words'] = $indexing['min_words'] === null ? $verdict['words'] : min($indexing['min_words'], $verdict['words']);
        $indexing['max_words'] = $indexing['max_words'] === null ? $verdict['words'] : max($indexing['max_words'], $verdict['words']);
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
             * The page body, its metadata, and the length of the body that will be stored.
             *
             * The BRAND ROW's display name is passed, not the source's: BrandKey::displayName() has
             * already tidied it, and it is the spelling the brand page and the PDP print. The raw
             * source name is the fallback for the (config-permitted) no-brand case.
             *
             * body() is shared with the dry run so a forecast and a real run compose the same
             * sentences; see it for what compose() does when too few facts survive, and for why the
             * word count has to be measured on the string that is actually written rather than taken
             * from compose() unconditionally.
             */
            $body = $this->body($row, $brand?->designation_fr ?? $row->source_brand_name, $subcategories, $subId);
            $content = $body['content'];

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
                'description_fr' => $body['description_fr'],
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

            /*
             * THE BARCODE. The single most valuable field the page carries, and the only one here
             * that is structured data rather than rendered copy.
             *
             * App\Support\Gtin's own docblock records that `products:enrich-dsld` and
             * `seo:enrich-nutrition` have been scheduled for months and enrich nothing, because both
             * match on a GTIN and no product carries one. IHerbPageExtractor only stores a barcode
             * whose GS1 check digit verifies; Gtin::normalize() re-verifies it here rather than
             * trusting that, because this value goes straight into schema.org — ProductSchemaBuilder
             * emits it as `gtin` plus the length-correct `gtin12`/`gtin13`/`gtin14`, and Merchant
             * Center disapproves an item outright for a wrong one.
             *
             * The key is OMITTED when there is no verified barcode, exactly like seo_title above:
             * writing an explicit NULL over a legacy column is not the same act as leaving it alone.
             */
            $gtin = Gtin::normalize($row->source_gtin);
            if ($gtin !== null) {
                $attributes['gtin'] = $gtin;
            }

            /*
             * The one legitimate upgrade the new content makes to the Product schema.
             *
             * ProductSchemaBuilder::plainDescription() prefers `seo_schema_description`, then the
             * 110-160 character meta description, then `description_fr`. Without this the JSON-LD
             * `description` of a product with a real manufacturer overview would still be the sized
             * SERP string compose() wrote. Written ONLY when an overview exists, so no product
             * without one — which is all 309 legacy products, permanently — has its schema touched.
             *
             * Deliberately NOT accompanied by aggregateRating or review markup. `source_rating` and
             * `source_rating_count` are on the staging row, they are internal reference only, and
             * nothing in this command reads them.
             */
            if ($body['schema_description'] !== null) {
                $attributes['seo_schema_description'] = $body['schema_description'];
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
                /*
                 * THE MEASUREMENT THE PUBLISH STEP EXISTS TO READ.
                 *
                 * ImportedProductContent::compose() has always returned this number, computed the
                 * way frontend/scripts/audit-pdp-content.mjs computes `bodyWords` and documented as
                 * being for exactly this comparison — and this method used to read the copy out of
                 * that array and discard it, leaving publish() with nothing to measure and a
                 * hardcoded `seo_robots_index = true`. Written inside the same transaction as the
                 * body it describes, so the two can never disagree about the same product.
                 *
                 * Clamped to the column's range (unsignedSmallInteger) rather than trusted: a
                 * pathological body must cost a wrong number, not SQLSTATE[22003] in the middle of a
                 * wave.
                 *
                 * ── WHAT THIS NUMBER COUNTS WIDENED, AND THE COLUMN COMMENT WITH IT ───────────
                 * It used to be "words in `products.description_fr`". It is now words in everything
                 * the PAGE renders as prose: that column plus the suggested-use, ingredients and
                 * warnings sections, which live on this staging row and render as their own sections
                 * on both product routes. The Supplement Facts table is excluded on purpose — see
                 * ImportedSourceContent::renderedWordCount(). bodyWords() measures the same total at
                 * publish time, so the staged figure and the live measurement still describe the
                 * same page.
                 */
                'composed_word_count' => max(0, min(65535, $body['word_count'])),
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
     * The body this row gets, and how many words it is.
     *
     * ── ONE COMPOSER FOR THE REAL RUN AND THE FORECAST ────────────────────────────────────
     * createProduct() calls it inside its transaction; the --dry-run branch calls it with the raw
     * source brand name, because BrandMatcher WRITES and a dry run must not. Splitting it out is
     * what makes "the dry run tells you how many of this wave would be indexable" a claim about the
     * same sentences the real run will store, rather than a second, drifting derivation.
     *
     * compose() returns nulls when too few facts survive to write a true identity sentence (no
     * brand, no rayon, or a title whose head is nothing but the brand). That is not an error, so the
     * old spec block stays as the fallback for exactly those rows — an empty description_fr makes
     * the storefront fall through to generateProductFallbackDescription() and emit the same
     * boilerplate on every product.
     *
     * ── THE COUNT IS MEASURED ON THE STRING THAT IS ACTUALLY STORED ───────────────────────
     * Not taken from compose() unconditionally. On the rows compose() declines, its `word_count` is
     * 0 while `description_fr` is the spec block — so trusting it would record 0 words for a body
     * that has some, and publish() would hold a product back on a measurement of a string it is not
     * serving. Where compose() DID produce the body, its own number is used verbatim: it is the same
     * counter over the same string, and re-running countWords() would only invite the two to drift.
     *
     * ── AND THE MANUFACTURER'S OWN PROSE NOW LEADS IT ─────────────────────────────────────
     * `source_overview_html` is the transcribed overview from the product page — the first real
     * description this pipeline has ever had. It goes in FRONT of the composed block, and
     * ImportedSourceContent::body() carries the argument for that ordering. What matters here is the
     * degradation: an overview that is absent, empty, or in a language we do not publish leaves this
     * method doing EXACTLY what it did before — compose, or fall back to the spec block.
     *
     * Composing still happens either way, and its output is still kept. The composed block is
     * supporting structure (rayon, pack, flavour, the label disclaimer, who to ask), and it also
     * produces `seo_title`/`seo_description`, which the overview does not: those two are sized to
     * the 30-60 / 110-160 SERP windows verify-seo.js checks, and a machine-translated marketing
     * paragraph is neither sized nor written to be a meta description.
     *
     * One thing the overview DOES change about composition: it is told when the page will carry a
     * Supplement Facts panel, so the `label_scope` sentence — "aucune valeur nutritionnelle n'est
     * publiée … tant que l'étiquette n'a pas été relevée" — is dropped instead of being printed
     * directly above the panel it denies.
     *
     * @param  ?string  $brandName  the display name the copy should print, or null
     * @param  array{ids: array<string, int>, labels: array<int, string>, slugs: array<int, string>, categories: array<int, string>}  $subcategories
     * @return array{content: array<string, mixed>, description_fr: ?string, word_count: int, schema_description: ?string, has_source_body: bool}
     */
    private function body(ExternalCatalogProduct $row, ?string $brandName, array $subcategories, int $subId): array
    {
        // getAttributes(), not attributesToArray(): the same raw row fromStagingRow() has always
        // been given. ImportedSourceContent is written to tolerate the driver's un-cast values for
        // exactly this call site.
        $attributes = $row->getAttributes();

        $overview = ImportedSourceContent::overviewHtml($attributes);

        $content = ImportedProductContent::fromStagingRow($attributes, [
            'brand' => $brandName,
            'sub_category_slug' => $subcategories['slugs'][$subId] ?? null,
            'sub_category_label' => $subcategories['labels'][$subId] ?? null,
            'category_label' => $subcategories['categories'][$subId] ?? null,
            // No `reference`: promotion writes no code_product, so the product page prints no
            // "Référence : …" line and a sentence quoting one would describe a field the page does
            // not show.
            'page_has_nutrition_panel' => ImportedSourceContent::hasNutritionPanel($attributes),
        ]);

        // compose() returns nulls when too few facts survive to write a true identity sentence. The
        // spec block is the fallback for exactly those rows, unchanged — and it is now a fallback
        // for the SUPPORTING half of the body rather than for the whole of it.
        $composed = $content['description_fr']
            ?? $this->description($row, $brandName, $subcategories['labels'][$subId] ?? null);

        $description = ImportedSourceContent::body($overview, $composed);

        return [
            'content' => $content,
            'description_fr' => $description,
            /*
             * Measured over what the PAGE renders, not over this column alone.
             *
             * The suggested-use, ingredients and warnings blocks render as their own sections on
             * both product routes and live on the staging row, so counting `description_fr` by
             * itself would hold a product at seo_robots_index = 0 for being thin while serving a
             * customer three more paragraphs. renderedWordCount() carries the full argument,
             * including why the Supplement Facts table is deliberately excluded from the count.
             */
            'word_count' => ImportedSourceContent::renderedWordCount($description, $attributes),
            'schema_description' => ImportedSourceContent::schemaDescription($attributes),
            'has_source_body' => $overview !== null,
        ];
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
     *
     * ── IT TAKES THE BRAND NAME, NOT THE BRAND ROW ────────────────────────────────────────
     * It only ever read `$brand?->designation_fr`, and the dry run has no Brand model to offer —
     * BrandMatcher creates missing brands, so a dry run cannot call it. A string is what both
     * callers actually have.
     */
    private function description(ExternalCatalogProduct $row, ?string $brandName, ?string $subcategoryLabel): ?string
    {
        $facts = [];

        if (filled($brandName)) {
            $facts['Marque'] = (string) $brandName;
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

        $lead = filled($brandName)
            ? sprintf('<p><strong>%s</strong> de %s.</p>', e((string) $row->normalized_title), e((string) $brandName))
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
     * `--publish` is the opposite: every product PUBLISHED fires two per-product HTTP calls at the
     * storefront — revalidate the path, submit the URL to IndexNow — plus one sitemap bust coalesced
     * across the whole wave (SeoNotifier::bustSitemapCache), and it puts a URL in front of Google.
     * So it defaults to one chunk, and you raise it on purpose.
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
     * @param  array{reindexed:int, scanned:int, failed:int}  $reindex
     * @param  list<array{0:string,1:string,2:string,3:string,4:string}>  $samples
     * @param  array{indexable:int, noindex:int, below_gate:int, min_words:?int, max_words:?int}  $indexing
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
        array $reindex,
        array $samples,
        ?int $limit,
        string $mode,
        array $indexing,
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
        if ($scanned === 0 && $backlogPublished === 0 && $backlogFailed === 0 && $reindex['reindexed'] === 0 && $reindex['scanned'] === 0) {
            $this->warn($publish
                ? 'Nothing to do: no published product is waiting to be re-indexed (publier=1 AND '
                    .'seo_robots_index=0 with a body long enough to clear the gate), no product from an '
                    .'earlier run is still waiting to be published (publier=0 AND seo_robots_index=0), '
                    .'and no hydrated row matched. '
                    .'Run catalog:iherb:hydrate --status to see where the import is.'
                : 'No hydrated rows matched. Run catalog:iherb:hydrate --status to see where the import is.');

            return self::SUCCESS;
        }

        // Printed before everything else because it is the pass that acts on work somebody has just
        // finished, and because for two files' worth of docblocks it was the pass that did not exist.
        if ($reindex['scanned'] > 0 || $reindex['reindexed'] > 0) {
            $stillShort = max(0, $reindex['scanned'] - $reindex['reindexed'] - $reindex['failed']);
            $this->info(sprintf(
                '%s already-published product(s) %s RE-INDEXED — their body now clears the %s-word gate, '
                    .'so they enter the sitemap and lose <meta robots="noindex">%s.',
                number_format($reindex['reindexed']),
                $dryRun ? 'would be' : 'were',
                number_format($this->minBodyWords()),
                $dryRun ? '. NOTHING WAS WRITTEN' : ' and are submitted to IndexNow',
            ));
            if ($stillShort > 0) {
                $this->line(sprintf(
                    '  %s more were measured and are still short; nothing was written for them and they cost no requests.',
                    number_format($stillShort),
                ));
            }
            if ($reindex['failed'] > 0) {
                $this->warn(sprintf(
                    '%s product(s) cleared the gate but the save failed — they are unchanged at '
                        .'seo_robots_index=0 and the next run will try them again.',
                    number_format($reindex['failed']),
                ));
            }
        }

        if ($samples !== []) {
            $this->line('');
            $this->table(['', 'price / reason', 'URL / detail', 'product', 'body / robots'], $samples);
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

            if ($publish) {
                $this->reportIndexing($mode, $indexing, true);
            }

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

        if ($publish) {
            $this->reportIndexing($mode, $indexing, false);
        }

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

    /**
     * What this wave did to `seo_robots_index`, with the counts and the reason.
     *
     * ── WHY THIS IS NOT ONE LINE ──────────────────────────────────────────────────────────
     * "N published" is the number the operator asked for and therefore the number they will not
     * check. The number worth printing is the split: how many of those N are actually offered to
     * search engines, how many are sitting on the storefront noindexed waiting for copy, and on what
     * evidence. Under an override it also has to say that the measurement was overruled and by which
     * flag — a wave that indexed 100 thin pages because somebody typed --force-index must not read
     * identically to a wave that indexed 100 good ones.
     *
     * The word range is printed rather than described. `catalog.promotion.min_body_words` is 250 and
     * the composed bodies measure in the low hundreds, so "74-116 words against a 250 gate" tells the
     * operator in one line why nothing cleared it and roughly how far off it is — which is a content
     * decision to take, not a flag to flip.
     *
     * @param  array{indexable:int, noindex:int, below_gate:int, min_words:?int, max_words:?int}  $indexing
     */
    private function reportIndexing(string $mode, array $indexing, bool $dryRun): void
    {
        $total = $indexing['indexable'] + $indexing['noindex'];

        if ($total === 0) {
            return;
        }

        $min = $this->minBodyWords();
        $verb = $dryRun ? 'would be' : 'were';

        $this->line('');
        $this->line(sprintf(
            '  Indexing gate: catalog.promotion.min_body_words = %s word(s)%s.',
            number_format($min),
            $min <= 0 ? ' — DISABLED, everything published is indexable' : ' (audit-pdp-content.mjs MIN_NEW_PRODUCT_WORDS)',
        ));

        $this->line(sprintf(
            '    %s %s published INDEXABLE  — in the sitemap, seo_robots_index=1',
            str_pad(number_format($indexing['indexable']), 7, ' ', STR_PAD_LEFT),
            $verb,
        ));
        $this->line(sprintf(
            '    %s %s published NOINDEXED  — visible to customers and sellable, out of the sitemap, <meta robots="noindex">',
            str_pad(number_format($indexing['noindex']), 7, ' ', STR_PAD_LEFT),
            $verb,
        ));

        if ($indexing['min_words'] !== null) {
            $this->line(sprintf(
                '    bodies measured %s-%s words against a %s-word gate.',
                number_format((int) $indexing['min_words']),
                number_format((int) $indexing['max_words']),
                number_format($min),
            ));
        }

        // The reason, and it names the flag when a flag is what decided it.
        if ($mode === PromotionGate::INDEX_FORCED) {
            $this->warn(sprintf(
                '  --force-index: the measured gate was OVERRULED. %s of the %s indexed %s below %s words '
                .'and %s indexed anyway. Nothing else in this repo will hold them back — sitemapData.ts '
                .'submits them and audit-pdp-content.mjs will fail them on its next run.',
                number_format($indexing['below_gate']),
                number_format($total),
                $indexing['below_gate'] === 1 ? 'is' : 'are',
                number_format($min),
                $dryRun ? 'would be' : 'were',
            ));
        } elseif ($mode === PromotionGate::INDEX_SUPPRESSED) {
            $this->line(sprintf(
                '  --force-noindex: the measured gate was not consulted. %s of these clear it and %s held back anyway.',
                number_format($total - $indexing['below_gate']),
                $dryRun ? 'would be' : 'were',
            ));
        } elseif ($indexing['noindex'] > 0) {
            /*
             * THIS SENTENCE IS NOW TRUE, AND IT NAMES THE COMMAND THAT MAKES IT TRUE.
             *
             * It used to end "…and the next --publish wave indexes it", which was unreachable:
             * nothing in this command could re-measure a product that was already published. That is
             * reindexPublished(), which --publish now runs first and which --reindex runs alone. The
             * instruction printed here is the one an operator will follow, so it has to be an
             * instruction that works.
             */
            $this->line(
                '  Held back because the body is below the gate, which is the intended state and not an error: '
                .'the product sells, the URL is simply not offered to search engines yet. Write real copy into '
                .'description_fr, then run:'
            );
            $this->line('     php artisan catalog:iherb:promote --reindex');
            $this->line(
                '  which re-measures the LIVE body of every published-but-noindexed product and indexes the ones '
                .'that now clear the gate (--publish does the same pass first). --force-index overrides the '
                .'measurement for a whole wave, and says so here when it does.'
            );
            $this->line(
                '  If these products were promoted BEFORE `catalog:iherb:content` read their pages, the '
                .'manufacturer overview is on the staging row and not in description_fr — it is folded in at '
                .'creation and nowhere else. Fold it in first with:'
            );
            $this->line('     php artisan catalog:iherb:promote --recompose --dry-run');
            $this->line(
                '  which also writes the barcode and the JSON-LD description, refuses to touch a body a human '
                .'has edited, and publishes nothing.'
            );
        }
    }
}
