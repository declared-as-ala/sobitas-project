<?php

namespace App\Console\Commands;

use App\Models\ExternalCatalogJob;
use App\Models\ExternalCatalogProduct;
use App\Services\Catalog\IHerb\IHerbClient;
use App\Services\Catalog\SlugRelevance;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Enumerate the iHerb catalogue from its published sitemaps and stage every product.
 *
 * Three HTTP requests for ~47,500 identities, because the numeric product id is the last segment of
 * every `/pr/{slug}/{id}` URL. No per-product request is spent here at all.
 *
 * Measured 10/08/2026 — the counts are facts, not estimates:
 *
 *     products-0-www-0.xml   20,500 products   3.23 MB
 *     products-0-www-1.xml   20,500 products   3.25 MB
 *     products-0-www-2.xml    6,537 products   1.03 MB
 *                            ──────────────
 *                            47,537 products
 *
 * (An earlier estimate of ~61,500 assumed all three files were full. Two are; the third is not.)
 *
 * ── THIS COMMAND WRITES NOTHING A CUSTOMER CAN SEE ────────────────────────────────────────
 * Every row lands in `external_catalog_products`. `products` is not touched, so running this on a
 * live box cannot change the 309 real products, the storefront, or a single URL. Rollback is
 * `DELETE FROM external_catalog_products`.
 */
class CatalogIHerbDiscover extends Command
{
    protected $signature = 'catalog:iherb:discover
                            {--refresh : Re-read sitemaps and refresh URLs for rows already known}
                            {--dry-run : Fetch and report the numbers, write nothing}';

    protected $description = 'Discover the iHerb catalogue from its sitemaps into the staging table';

    public function handle(IHerbClient $client): int
    {
        if (! config('catalog.enabled', true)) {
            $this->error('catalog.enabled is false — set CATALOG_IMPORT_ENABLED=true to run this.');

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        $this->info('Reading the iHerb sitemap index…');
        /**
         * The job row is opened BEFORE the first HTTP request, and that ordering is the fix for a
         * real failure, not a stylistic preference.
         *
         * It used to be created after productSitemaps() returned successfully. So when the fetch
         * failed, this command exited FAILURE having written nothing at all — no job row, no error,
         * no timestamp. Run from the scheduler, where nobody reads the exit code, that is
         * indistinguishable from never having run: the staging table is empty either way.
         *
         * Observed exactly that on 10/08/2026. The hourly bootstrap was live from the 07:44 deploy
         * and by 11:08 `catalog:iherb:hydrate --status` still answered "the staging table is
         * empty". Whether iHerb was unreachable from the VPS, the circuit breaker was open, or the
         * schedule never fired at all, there was no way to tell them apart, because the one code
         * path that could have left evidence ran only on success.
         *
         * Opening the row first means every attempt leaves a record, and a failed attempt leaves
         * the reason. `external_catalog_jobs` becomes the answer to "did it try?", which is a
         * different and more useful question than "did it work?".
         */
        $job = $dryRun ? null : ExternalCatalogJob::start('discover', [
            'refresh' => (bool) $this->option('refresh'),
        ]);

        $sitemaps = $client->productSitemaps();

        // A sitemap index that yields no product sitemaps is a failure, never an empty catalogue.
        // Said plainly because the alternative is the failure mode this project keeps hitting: a
        // command that fetched nothing, wrote nothing, and exited 0 looking like a success.
        if ($sitemaps === []) {
            $message = 'No product sitemaps found. The index was unreachable, blocked, or its shape changed.';

            $this->error($message);
            $this->line('  From the VPS, check in this order:');
            $this->line('   · curl -sI https://www.iherb.com/sitemap_index.xml   (is it reachable at all?)');
            $this->line('   · storage/logs/laravel.log for [PoliteFetcher] lines (robots, size cap, breaker)');
            $this->line('   · whether the circuit breaker is open — 5 x 401/403/429 opens it for 30 minutes');

            $job?->recordError('discover', $message);
            $job?->finish(ExternalCatalogJob::STATUS_FAILED);

            return self::FAILURE;
        }

        $this->line(sprintf('  %d product sitemap(s).', count($sitemaps)));

        $job?->forceFill(['options' => [
            'refresh' => (bool) $this->option('refresh'),
            'sitemaps' => array_column($sitemaps, 'url'),
        ]])->save();

        $allow = (array) config('catalog.relevance.slug_allow', []);
        $deny = (array) config('catalog.relevance.slug_deny', []);
        $chunkSize = (int) config('catalog.discovery.chunk', 500);

        $totals = ['seen' => 0, 'written' => 0, 'relevant' => 0, 'neutral' => 0, 'denied' => 0];

        foreach ($sitemaps as $sitemap) {
            $this->line('Reading '.$sitemap['url'].' …');

            $products = $client->productsIn($sitemap['url']);

            // Same reasoning as above, one level down. A product sitemap that parses to zero rows
            // means the fetch was refused, the body exceeded the size cap, or the format changed —
            // all of which must stop the run. Treating it as "this file happens to be empty" would
            // silently discover a third of the catalogue and report success.
            if ($products === []) {
                $message = 'Sitemap parsed to zero products: '.$sitemap['url'];
                $this->error($message);
                $this->line('  A product sitemap is never legitimately empty. Likely causes:');
                $this->line('   · the response exceeded enrichment.fetch.max_bytes (these files are ~3.3 MB)');
                $this->line('   · the circuit breaker is open for iherb.com');
                $this->line('   · the URL format changed and parseProductUrl no longer matches');

                $job?->recordError('discover', $message);
                $job?->finish(ExternalCatalogJob::STATUS_FAILED);

                return self::FAILURE;
            }

            $this->line(sprintf('  %s products.', number_format(count($products))));
            $totals['seen'] += count($products);

            foreach (array_chunk($products, $chunkSize) as $chunk) {
                $rows = [];

                foreach ($chunk as $product) {
                    $verdict = SlugRelevance::decide($product['slug'], $allow, $deny);

                    $totals[match ($verdict['decision']) {
                        SlugRelevance::RELEVANT => 'relevant',
                        SlugRelevance::DENIED => 'denied',
                        default => 'neutral',
                    }]++;

                    $rows[] = [
                        'provider' => IHerbClient::PROVIDER,
                        'external_product_id' => $product['external_product_id'],
                        'external_url' => $product['url'],
                        'external_url_name' => mb_substr($product['slug'], 0, 190),
                        'status' => self::statusFor($verdict['decision']),
                        'status_reason' => $verdict['term'] === null
                            ? null
                            : $verdict['decision'].':'.$verdict['term'],
                        'first_seen_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                if ($dryRun) {
                    continue;
                }

                $this->upsertChunk($rows);
                $totals['written'] += count($rows);
            }

            $job?->progress(['discovered' => count($products)]);

            if ($job?->shouldStop()) {
                $this->warn('Job paused or cancelled — stopping after this sitemap.');
                break;
            }
        }

        $job?->finish();

        $this->report($totals, $dryRun);

        return self::SUCCESS;
    }

    /**
     * Idempotent by unique key, and deliberately narrow about what a re-run may overwrite.
     *
     * `status` is NOT in the update list, and that omission is the whole point. A second discovery
     * run must not drag a row that is already `hydrated` or `promoted` back to `queued` — that would
     * re-hydrate the entire catalogue on every run and, worse, could reset the state of a row whose
     * product is already live. Only the two source-owned fields refresh; ours are left alone.
     *
     * A bulk upsert is safe HERE precisely because this is not `products`: the staging table has no
     * legacy NOT NULL columns without defaults, so nothing depends on model events firing.
     */
    private function upsertChunk(array $rows): void
    {
        DB::table('external_catalog_products')->upsert(
            $rows,
            ['provider', 'external_product_id'],
            ['external_url', 'external_url_name', 'updated_at'],
        );
    }

    private static function statusFor(string $decision): string
    {
        return match ($decision) {
            // Positively matched a sports/supplement term — hydrate these first.
            SlugRelevance::RELEVANT => ExternalCatalogProduct::STATUS_QUEUED,
            // Matched something we do not sell — never hydrated, one request saved.
            SlugRelevance::DENIED => ExternalCatalogProduct::STATUS_FILTERED_OUT,
            // Undecidable from the name. Kept: the slug is a hint, rootCategoryId is the authority.
            default => ExternalCatalogProduct::STATUS_DISCOVERED,
        };
    }

    private function report(array $totals, bool $dryRun): void
    {
        $this->newLine();
        $this->info($dryRun ? 'Dry run — nothing was written.' : 'Discovery complete.');

        $this->table(
            ['bucket', 'products', 'what happens next'],
            [
                ['queued (name matched)', number_format($totals['relevant']), 'hydrated first'],
                ['discovered (undecided)', number_format($totals['neutral']), 'hydrated after those'],
                ['filtered_out (denied)', number_format($totals['denied']), 'never fetched'],
                ['—', '—', '—'],
                ['total seen', number_format($totals['seen']), ''],
            ],
        );

        $hydratable = $totals['relevant'] + $totals['neutral'];
        // 0.5 req/s for iherb.com, from config/enrichment.php — one request every two seconds.
        $hours = round($hydratable * 2 / 3600, 1);

        $this->line(sprintf(
            'Hydration budget: %s products ≈ %s hours at the configured 0.5 req/s.',
            number_format($hydratable),
            $hours,
        ));
        $this->line(sprintf(
            '  The %s denied rows saved about %s hours of that.',
            number_format($totals['denied']),
            round($totals['denied'] * 2 / 3600, 1),
        ));

        if (! $dryRun) {
            $this->newLine();
            $this->line('`products` is unchanged. Nothing here is customer-visible until promotion.');
        }
    }
}
