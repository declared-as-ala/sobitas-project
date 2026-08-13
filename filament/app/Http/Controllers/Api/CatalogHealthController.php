<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExternalCatalogProduct;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * THE CONTENT PIPELINE'S STATE, AS A NUMBER, WITHOUT NEEDING A SHELL ON THE SERVER.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────────
 * On 14/08/2026 the question "why are 10,259 products noindexed" took most of a day, and every
 * usable answer had to be reconstructed by sampling the PUBLIC api one product at a time:
 * /product_details for forty slugs, counting body words in a script, inferring the staging state
 * from what did and did not appear in `source_facts`. The commands that answer it directly —
 * `catalog:iherb:content --status`, `catalog:iherb:promote --status` — all require SSH, and SSH to
 * this host has been failing on password auth since 10/08. So the pipeline had a rich, correct,
 * completely unreachable set of diagnostics.
 *
 * Worse than slow: it made a real failure invisible. The content pass writes prose into
 * `source_overview_html`, `source_suggested_use_html` and `source_warnings_html`, and every product
 * sampled had a body of 74-123 words — the composed fact block alone, with no manufacturer copy in
 * it. A stage yielding zero across the whole catalogue is the loudest signal a pipeline can produce
 * and nothing was listening, because listening required a shell.
 *
 * ── WHAT IT IS AND IS NOT ─────────────────────────────────────────────────────────────────────
 * Aggregate counts only. No row is returned, no URL, no slug, no price, no credential — this is
 * "how many rows are in each state", which is the same class of fact as the product count already
 * public on /shop. It is deliberately readable without auth so it can be checked from a phone, from
 * CI, and from a script that has no access to anything else.
 *
 * Cached for five minutes. The counts move on a ten-minute schedule at best, and the origin's
 * php-fpm pool ran out under load on 12/08 — a monitoring endpoint must never be the thing that
 * repeats that.
 *
 * ── THE STAGES ARE ORDERED BECAUSE THEY FEED EACH OTHER ───────────────────────────────────────
 * discovery -> hydration -> page content -> gtin -> label facts -> body words -> indexable.
 * A stage reading zero starves everything after it, so the FIRST zero in that list is the bug, and
 * everything downstream of it is a symptom. `first_starved_stage` names it outright rather than
 * leaving the reader to work it out from eight numbers.
 */
class CatalogHealthController extends Controller
{
    /** Matches catalog.promotion.min_body_words — the gate that decides seo_robots_index. */
    private function minBodyWords(): int
    {
        return (int) config('catalog.promotion.min_body_words', 250);
    }

    public function __invoke(): JsonResponse
    {
        $payload = Cache::remember('catalog_health_v1', 300, fn () => $this->build());

        return response()->json($payload);
    }

    private function build(): array
    {
        $products = $this->products();
        $staging = $this->staging();

        return [
            'generated_at' => now()->toIso8601String(),
            'min_body_words' => $this->minBodyWords(),
            'products' => $products,
            'staging' => $staging,
            'chain' => $this->chain($products, $staging),
        ];
    }

    /**
     * What the storefront actually serves.
     *
     * `body_words` is measured in SQL rather than by loading 10,669 rows into PHP: description_fr is
     * the largest column on the table and hydrating the whole catalogue to count spaces would be a
     * multi-hundred-megabyte read on an endpoint whose entire job is to be cheap.
     *
     * The count is spaces-plus-one over the tag-stripped text, which is an approximation and is
     * stated as one. It agrees with the word counter in ImportedProductContent closely enough to
     * answer the only question asked of it — "is this population near the gate or nowhere near it" —
     * and the two numbers measured on the same rows on 14/08 were 92 and 96.
     */
    private function products(): array
    {
        if (! Schema::hasTable('products')) {
            return ['available' => false];
        }

        $published = Product::query()->where('publier', 1);
        $total = (clone $published)->count();

        $hasRobots = Schema::hasColumn('products', 'seo_robots_index');
        $noindex = $hasRobots ? (clone $published)->where('seo_robots_index', 0)->count() : null;

        // REGEXP_REPLACE is MySQL 8 / MariaDB 10.0.5+. Both are far below what this project runs,
        // but a failure here must degrade to "unknown", never to a 500 on a health endpoint.
        try {
            $words = "(LENGTH(TRIM(REGEXP_REPLACE(COALESCE(description_fr,''), '<[^>]*>', ' ')))"
                ." - LENGTH(REPLACE(TRIM(REGEXP_REPLACE(COALESCE(description_fr,''), '<[^>]*>', ' ')), ' ', '')) + 1)";

            $row = (clone $published)
                ->selectRaw("COUNT(*) AS n, AVG($words) AS avg_words, SUM(CASE WHEN $words >= ? THEN 1 ELSE 0 END) AS over_gate", [$this->minBodyWords()])
                ->first();

            $avgWords = $row?->avg_words === null ? null : (int) round((float) $row->avg_words);
            $overGate = $row?->over_gate === null ? null : (int) $row->over_gate;
        } catch (\Throwable) {
            $avgWords = null;
            $overGate = null;
        }

        return [
            'available' => true,
            'published' => $total,
            'noindex' => $noindex,
            'indexable' => $noindex === null ? null : $total - $noindex,
            'nofollow' => Schema::hasColumn('products', 'seo_robots_follow')
                ? (clone $published)->where('seo_robots_follow', 0)->count()
                : null,
            'avg_body_words' => $avgWords,
            'body_over_gate' => $overGate,
            'imported' => Schema::hasTable('external_catalog_products')
                ? ExternalCatalogProduct::whereNotNull('product_id')->count()
                : null,
            'with_faq' => Schema::hasColumn('products', 'faq')
                ? (clone $published)->whereNotNull('faq')->count()
                : null,
            'with_nutrition' => Schema::hasColumn('products', 'nutrition_values')
                ? (clone $published)->whereNotNull('nutrition_values')->count()
                : null,
            'with_video' => Schema::hasColumn('products', 'official_video')
                ? (clone $published)->whereNotNull('official_video')->count()
                : null,
            'with_gtin' => Schema::hasColumn('products', 'gtin')
                ? (clone $published)->whereNotNull('gtin')->where('gtin', '!=', '')->count()
                : null,
        ];
    }

    /**
     * The acquisition table, which is where a stalled pipeline actually shows.
     *
     * `prose` is the number that was missing all along: how many read pages produced an overview,
     * a suggested-use block or a warnings block. `source_content_status = extracted` says the fetch
     * succeeded; it says nothing about whether the extractor understood the markup. Those are two
     * different failures and only the second one was happening.
     */
    private function staging(): array
    {
        if (! Schema::hasTable('external_catalog_products')) {
            return ['available' => false];
        }

        $byStatus = ExternalCatalogProduct::query()
            ->select('status', DB::raw('COUNT(*) AS n'))
            ->groupBy('status')
            ->pluck('n', 'status')
            ->toArray();

        $byContent = Schema::hasColumn('external_catalog_products', 'source_content_status')
            ? ExternalCatalogProduct::query()
                ->select('source_content_status', DB::raw('COUNT(*) AS n'))
                ->groupBy('source_content_status')
                ->pluck('n', 'source_content_status')
                ->toArray()
            : [];

        $has = fn (string $col) => Schema::hasColumn('external_catalog_products', $col);
        $filled = function (string $col): int {
            return ExternalCatalogProduct::query()
                ->whereNotNull($col)
                ->where($col, '!=', '')
                ->count();
        };

        $prose = null;
        if ($has('source_overview_html') && $has('source_suggested_use_html') && $has('source_warnings_html')) {
            $prose = [
                'overview' => $filled('source_overview_html'),
                'suggested_use' => $filled('source_suggested_use_html'),
                'warnings' => $filled('source_warnings_html'),
                'other_ingredients' => $has('source_other_ingredients_html') ? $filled('source_other_ingredients_html') : null,
                // ANY prose at all. This is the one to read: it is the difference between "the
                // extractor understood the page" and "the fetch returned 200".
                'any' => ExternalCatalogProduct::query()
                    ->where(function ($q) {
                        $q->where('source_overview_html', '!=', '')
                            ->orWhere('source_suggested_use_html', '!=', '')
                            ->orWhere('source_warnings_html', '!=', '');
                    })
                    ->count(),
            ];
        }

        return [
            'available' => true,
            'total' => ExternalCatalogProduct::count(),
            'by_status' => $byStatus,
            'by_content_status' => $byContent,
            'prose' => $prose,
            'gtin' => $has('source_gtin') ? $filled('source_gtin') : null,
            'gallery' => $has('source_gallery_images')
                ? ExternalCatalogProduct::whereNotNull('source_gallery_images')->count()
                : null,
            // Headings the extractor met and did not recognise. A non-empty count here means the
            // source page changed shape and the map needs an entry — exactly the signal that would
            // have named this failure on day one.
            'unmapped_sections' => $has('source_content_unmapped_sections')
                ? ExternalCatalogProduct::whereNotNull('source_content_unmapped_sections')
                    ->where('source_content_unmapped_sections', '!=', '[]')
                    ->count()
                : null,
            'last_content_fetch' => $has('source_content_fetched_at')
                ? optional(ExternalCatalogProduct::max('source_content_fetched_at'))
                : null,
        ];
    }

    /**
     * Name the first starved stage, so the answer is one line rather than eight numbers.
     *
     * Ordered by dependency, not by importance. Reading zero at `page_prose` is why `gtin` is near
     * zero, which is why `label_facts` is zero, which is why `body_over_gate` is zero, which is why
     * everything is noindexed — five symptoms and one cause, and only the cause is worth acting on.
     */
    private function chain(array $products, array $staging): array
    {
        $stages = [];

        if (($staging['available'] ?? false)) {
            $stages['discovered'] = $staging['total'] ?? 0;
            $stages['hydrated'] = (int) ($staging['by_status']['hydrated'] ?? 0) + (int) ($staging['by_status']['promoted'] ?? 0);
            $stages['page_fetched'] = (int) ($staging['by_content_status']['extracted'] ?? 0);
            $stages['page_prose'] = $staging['prose']['any'] ?? null;
            $stages['gtin'] = $staging['gtin'];
        }
        if (($products['available'] ?? false)) {
            $stages['label_facts'] = $products['with_nutrition'];
            $stages['faq'] = $products['with_faq'];
            $stages['official_video'] = $products['with_video'];
            $stages['body_over_gate'] = $products['body_over_gate'];
            $stages['indexable'] = $products['indexable'];
        }

        // Starved = a stage that has essentially nothing while the stage before it has plenty.
        // 1% is the threshold: a genuine trickle reads differently from a dead stage, and using
        // "exactly zero" would miss a stage that produced eleven rows out of forty thousand.
        $first = null;
        $prev = null;
        foreach ($stages as $name => $n) {
            if ($n === null) continue;
            if ($prev !== null && $prev >= 100 && $n < max(1, (int) ($prev * 0.01))) {
                $first = $name;
                break;
            }
            $prev = $n;
        }

        return [
            'stages' => $stages,
            'first_starved_stage' => $first,
        ];
    }
}
