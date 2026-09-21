<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Catalog\PromotionGate;
use App\Services\Seo\LegacyProductPage;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;

/**
 * Re-measure the LEGACY (hand-built, never imported) published products held at
 * seo_robots_index = 0 and index the ones whose page clears catalog.promotion.min_body_words.
 *
 * ── THE GAP THIS FILLS ────────────────────────────────────────────────────────────────────────
 * `catalog:iherb:promote --reindex` is the sanctioned way to shrink the noindexed population: it
 * re-measures each held-back body and flips only what earns it. But it iterates the STAGING table
 * (external_catalog_products) and joins to the product — so a product with no staging row can never
 * be reached by it, whatever its body says. The ~300 hand-built products that predate the import are
 * exactly those rows.
 *
 * That mattered on 14/09/2026: 95 of them were sitting at seo_robots_index = 0 — 69 in stock, and
 * the store's actual best sellers by order lines (Serious Mass 5.45 kg, Gold Standard Whey 2.27 kg,
 * Levro Legendary Mass, every in-stock creatine). Not an operator's decision: the columns are
 * nullable and NULL on every pre-April-2026 product, the model reads NULL as indexable, and the
 * Filament Toggle hydrated NULL as OFF and wrote a hard 0 on any save (fixed since in
 * EditProduct::mutateFormDataBeforeFill). `seo:products-robots-audit --apply` then repaired
 * `follow` and — by design — left `index` alone. This is the tool that repairs `index`, with the
 * same gate the import applies, so no thin page is submitted.
 *
 * ── WHAT COUNTS AS THE BODY ───────────────────────────────────────────────────────────────────
 * The page Googlebot is served: description (or cover) + nutrition + FAQ, measured by
 * App\Services\Seo\LegacyProductPage exactly as frontend/scripts/audit-pdp-content.mjs measures the
 * rendered page — see that class for why ImportedSourceContent::renderedWordCount() is the wrong
 * ruler for a hand-written body. tests/catalog/legacy-product-page-check.php pins the definition.
 *
 * ── WHY EACH FLIP IS A MODEL SAVE AND NOT ONE UPDATE ──────────────────────────────────────────
 * A query-builder UPDATE fires no model event. Assigning `seo_robots_index` and saving is what
 * makes ProductSeoObserver::saved see `wasChanged(['seo_robots_index'])` and hand the product to
 * SeoNotifier: the page is revalidated (the cached HTML stops serving `<meta robots="noindex">`),
 * the sitemap cache is busted (coalesced, once per process) and — only now that the URL is
 * indexable — it is submitted to IndexNow. Same mechanism, same reasons, as --reindex.
 *
 *   php artisan seo:products-legacy-reindex             # report only: what would flip, and why not
 *   php artisan seo:products-legacy-reindex --apply     # flip the ones that clear the gate
 *   php artisan seo:products-legacy-reindex --ids=545,461 --apply   # only these ids, still gated
 *
 * Idempotent: a product already at index = 1 is not selected, so a second run reports nothing and
 * writes nothing. A product below the gate is listed with its word count and left exactly as it
 * is — write its copy, re-run, and it graduates on its own.
 */
class SeoProductsLegacyReindex extends Command
{
    protected $signature = 'seo:products-legacy-reindex
                            {--apply : Write seo_robots_index = 1 on the products that clear the gate (report only without it)}
                            {--ids= : Comma-separated product ids to restrict the pass to (still measured against the gate)}
                            {--force : Index every selected product regardless of the word gate. Owner decision 21/09/2026: no published product stays noindex; the word counts are still printed so thin pages remain visible as an enrichment worklist.}';

    protected $description = 'Re-measure legacy (non-imported) published products held at noindex; index the ones whose page clears catalog.promotion.min_body_words';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $force = (bool) $this->option('force');
        $ids = $this->requestedIds();
        if ($ids === false) {
            $this->error('--ids must be a comma-separated list of positive integers, e.g. --ids=545,461');

            return self::INVALID;
        }

        $min = (int) config('catalog.promotion.min_body_words', PromotionGate::DEFAULT_MIN_BODY_WORDS);

        // The complement of --reindex, by construction: published, held back, and with NO staging
        // row. The two passes partition the catalogue with no overlap and no gap.
        $query = Product::query()
            ->where('publier', 1)
            ->where('seo_robots_index', 0)
            ->whereDoesntHave('externalCatalogSource')
            ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids))
            ->orderBy('id');

        // Full rows, deliberately: the model's `saving` hooks (ProductSeoDefaults::apply, the
        // rupture derivation) read other columns, and a partial select would show them as blanks
        // to fill. ~100 rows; the width is irrelevant.
        $candidates = $query->get();

        $this->info(sprintf(
            'LEGACY PRODUCTS HELD AT noindex   %d   (published, seo_robots_index = 0, no import staging row%s)',
            $candidates->count(),
            $ids === null ? '' : ', restricted to '.count($ids).' requested id(s)',
        ));
        $this->line(sprintf(
            '  gate: catalog.promotion.min_body_words = %d  (page body = description + nutrition + FAQ)%s',
            $min,
            $force ? '  — BYPASSED by --force' : '',
        ));

        if ($ids !== null) {
            $missing = array_values(array_diff($ids, $candidates->pluck('id')->all()));
            if ($missing !== []) {
                $this->warn('  not selected (unpublished, already indexable, or an imported product): '.implode(', ', $missing));
            }
        }

        if ($candidates->isEmpty()) {
            $this->line('');
            $this->info('  Nothing is held back. Nothing to do.');

            return self::SUCCESS;
        }

        $clears = [];
        $short = [];
        foreach ($candidates as $product) {
            $words = LegacyProductPage::bodyWords(
                $product->description_fr,
                $product->description_cover,
                $product->nutrition_values,
                $product->faq,
            );
            $row = ['product' => $product, 'words' => $words];
            if ($force || PromotionGate::indexable($words, $min)) {
                $clears[] = $row;
            } else {
                $short[] = $row;
            }
        }

        // In-stock first inside each group: those are the pages whose absence from the index costs
        // sales today, and the ones the operator will "Request indexing" on by hand afterwards.
        $byStock = static fn (array $a, array $b): int => [(int) $b['product']->qte, $b['words']] <=> [(int) $a['product']->qte, $a['words']];
        usort($clears, $byStock);
        usort($short, $byStock);

        $this->line('');
        $this->info(sprintf('CLEAR THE GATE — %d product(s) %s', count($clears), $apply ? 'to index' : 'would be indexed'));
        foreach ($clears as $row) {
            $this->line($this->format($row));
        }

        if ($short !== []) {
            $this->line('');
            $this->warn(sprintf('BELOW THE GATE — %d product(s) left at noindex; write their copy, then re-run', count($short)));
            foreach ($short as $row) {
                $this->line($this->format($row));
            }
        }

        if ($clears === []) {
            $this->line('');
            $this->info('  Nothing clears the gate. Nothing written.');

            return self::SUCCESS;
        }

        if (! $apply) {
            $this->line('');
            $this->warn('  REPORT ONLY. Re-run with --apply to set seo_robots_index = 1 on the products above the gate.');

            return self::SUCCESS;
        }

        $reindexed = 0;
        $failed = 0;
        foreach ($clears as $row) {
            /** @var Product $product */
            $product = $row['product'];

            try {
                // Assigned rather than forceFill()ed so `wasChanged(['seo_robots_index'])` — the
                // condition ProductSeoObserver::saved tests — is unambiguously true. `follow` is left
                // alone: it is the robots audit's column, and every row here already follows.
                $product->seo_robots_index = true;
                $product->save();
            } catch (QueryException $e) {
                $failed++;
                $this->warn(sprintf(
                    '  product %d cleared the gate but could not be re-indexed: %s',
                    $product->id,
                    Str::limit($e->getMessage(), 140),
                ));

                continue;
            }

            $reindexed++;
        }

        $this->line('');
        $this->info(sprintf('  RE-INDEXED: %d product(s) now emit `index`.%s', $reindexed, $failed > 0 ? " {$failed} failed (above)." : ''));
        $this->line('  Page revalidation, the sitemap refresh and the IndexNow submissions are dispatched by');
        $this->line('  ProductSeoObserver and run when this process exits. The storefront sitemap cache is 1 h.');
        $this->line('  Next: Search Console → URL inspection → "Request indexing" on the top in-stock sellers above.');

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * @return list<int>|null|false  null = no restriction; false = malformed option
     */
    private function requestedIds(): array|null|false
    {
        $raw = trim((string) $this->option('ids'));
        if ($raw === '') {
            return null;
        }

        $ids = [];
        foreach (explode(',', $raw) as $token) {
            $token = trim($token);
            if ($token === '' || ! ctype_digit($token) || (int) $token <= 0) {
                return false;
            }
            $ids[] = (int) $token;
        }

        return array_values(array_unique($ids));
    }

    /** @param array{product: Product, words: int} $row */
    private function format(array $row): string
    {
        $p = $row['product'];
        $stock = (int) $p->qte > 0 && ! $p->rupture ? sprintf('stock %-4d', (int) $p->qte) : 'sur cmd  ';

        return sprintf(
            '  #%-5d %5d w   %s  %s',
            $p->id,
            $row['words'],
            $stock,
            Str::limit((string) $p->slug, 64),
        );
    }
}
