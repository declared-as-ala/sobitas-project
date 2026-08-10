<?php

namespace App\Console\Commands;

use App\Models\ExternalCatalogProduct;
use App\Models\Product;
use App\Services\Catalog\IHerb\IHerbClient;
use App\Services\Catalog\ImportedProductContent;
use App\Services\Seo\ProductSeoDefaults;
use App\Services\Seo\SeoNotifier;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Which SEO columns are actually empty on imported products — counted, per column, per cohort.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 * The owner reported "not all fields are filled like seo and those stufs" on imported products, and
 * the obvious suspect was ProductSeoObserver: this repo has already shipped an observer that was
 * declared and never registered (ProductImageObserver, still absent from AppServiceProvider today).
 * That is NOT what is happening here. ProductSeoObserver IS registered — AppServiceProvider::boot()
 * line 79, `Product::observe(ProductSeoObserver::class)`, and AppServiceProvider is in
 * config/app.php's providers array — and Eloquent fires `saving` BEFORE `creating`, so
 * ProductSeoDefaults::apply() runs on the same Product::create() that CatalogIHerbPromote issues,
 * with `brand_id` and `sous_categorie_id` already set in the create array. meta_title,
 * meta_description and alt_cover are therefore part of the INSERT on every imported product, built
 * from the real brand and the real rayon.
 *
 * What is empty is a DIFFERENT set of columns, and the reason nobody could say which is that nobody
 * could count them. "Not all fields are filled" is unfalsifiable until it is a number per column, so
 * that is what this prints — for imported products AND, read-only, for the 309 hand-made ones, which
 * is the comparison that separates "the import skipped it" from "this column has always been an
 * optional override nobody fills".
 *
 * ── AND IT REPAIRS THE ONE GAP THAT IS REPAIRABLE ─────────────────────────────────────────
 * `seo_title` and `seo_description` are the two columns Product::effectiveSeoTitle() /
 * effectiveSeoDescription() PREFER over the meta_* pair, and the two x-crawler/product/[slug] emits
 * verbatim. Nothing in the self-healing layer owns them: ProductSeoDefaults defines three columns,
 * `seo:self-heal` (scheduled 04:30) and `seo:backfill-product-meta` both delegate to it, and the
 * only writer of products.seo_title anywhere in app/ is CatalogIHerbPromote — once, at promotion,
 * and only when ImportedProductContent::compose() returns them. compose() declines by design when a
 * row has no brand, no rayon label, or a normalized_title whose head is nothing but the brand
 * (IHerbNormalizer produces "NOW Foods – 454 g" whenever stripLeadingBrand() consumes the whole
 * display name). Those rows keep NULL in both columns for ever: no observer, no sweep, no command
 * revisits them, and if the brand row or the rayon label is fixed in the admin afterwards, nothing
 * notices. `--apply` re-composes them through the SAME class promotion uses, so a filled value is
 * byte-identical to the one promotion would have written (pick() is md5-seeded and deterministic).
 *
 * ── WHAT IT WILL NOT WRITE, AND WHY ───────────────────────────────────────────────────────
 * · sku / gtin / mpn — the staging row carries `external_part_number`, which is the SOURCE's
 *   catalogue code. Declaring it as `mpn` asserts it is the manufacturer's part number, which we
 *   have not verified, and there is no UPC column at all so `gtin` would be invention.
 *   ProductSchemaBuilder already says it out loud: "A malformed identifier is worse than none".
 *   Reported as empty, deliberately not filled.
 * · seo_canonical_url — must stay NULL. ProductDetailResource::resolveCanonicalProductUrl() derives
 *   the canonical from the slug; a stored value overrides it and freezes a URL.
 * · seo_image_alt — deliberately NULL. ProductDetailResource treats a non-empty value as
 *   admin-authored and returns it verbatim, suppressing the storefront's richer builder. alt_cover
 *   (which IS filled) is the column that layer reads next.
 * · seo_excerpt / seo_schema_description / description_cover / og_* / twitter_* — optional
 *   overrides with documented fallbacks and no factual source on the staging row. Filling them
 *   would be generated marketing copy, which is the one thing this pipeline may never produce.
 *
 * ── THE 309 HAND-MADE PRODUCTS CANNOT BE WRITTEN BY THIS COMMAND ──────────────────────────
 * Not by a filter that could be edited out — by construction. The fill loop's only source of
 * products is `external_catalog_products.product_id`: it iterates staging rows and saves
 * `$row->product`. A hand-made product has no staging row, so no query in the fill path can name
 * one. The legacy figures in the report come from a separate SELECT that never instantiates a model
 * for writing. Same guarantee CatalogIHerbPromote::publishBacklog() documents, for the same reason.
 *
 * Blanks only, everywhere. Nothing here overwrites a value that exists, on either cohort.
 *
 *   php artisan catalog:iherb:seo-audit            # count, write nothing (the default)
 *   php artisan catalog:iherb:seo-audit --apply    # fill the blanks it can fill honestly
 */
class CatalogIHerbSeoAudit extends Command
{
    protected $signature = 'catalog:iherb:seo-audit
                            {--apply : Fill the blanks this command can fill. Without it NOTHING is written}
                            {--limit=0 : Stop the fill pass after N imported products (0 = every one)}';

    protected $description = 'Count empty SEO columns on imported vs hand-made products, and fill the ones that can be filled from facts we hold';

    /**
     * Every SEO-ish column on `products`, and what owns it.
     *
     * Enumerated from the migrations that created them — 2026_02_08_221300 (meta_title,
     * meta_description), 2026_03_20_000001 (seo_schema_description, seo_review,
     * seo_aggregate_rating) and 2026_04_21_120000 (the seo_* / og_* / twitter_* / identifier block)
     * — plus the legacy columns `alt_cover` and `description_cover`, which predate migration control
     * entirely. Written down here rather than remembered, because the whole point of the report is
     * that "which columns are empty" stops being a matter of opinion.
     *
     * `owner` is who fills it on an imported product today. `fill` is whether --apply may write it.
     *
     * @var array<string, array{owner: string, fill: bool}>
     */
    private const COLUMNS = [
        'meta_title' => ['owner' => 'ProductSeoObserver (on create)', 'fill' => true],
        'meta_description' => ['owner' => 'ProductSeoObserver (on create)', 'fill' => true],
        'alt_cover' => ['owner' => 'ProductSeoObserver (on create)', 'fill' => true],
        'seo_title' => ['owner' => 'CatalogIHerbPromote, when compose() yields one', 'fill' => true],
        'seo_description' => ['owner' => 'CatalogIHerbPromote, when compose() yields one', 'fill' => true],
        'seo_excerpt' => ['owner' => 'nobody — optional override', 'fill' => false],
        'seo_canonical_url' => ['owner' => 'nobody — MUST stay null (canonical is derived)', 'fill' => false],
        'seo_image_alt' => ['owner' => 'nobody — deliberately null (alt_cover is the one that is used)', 'fill' => false],
        'seo_schema_description' => ['owner' => 'nobody — optional override', 'fill' => false],
        'description_cover' => ['owner' => 'nobody — legacy optional override', 'fill' => false],
        'sku' => ['owner' => 'nobody — no verified identifier on the staging row', 'fill' => false],
        'gtin' => ['owner' => 'nobody — no UPC is captured at all', 'fill' => false],
        'mpn' => ['owner' => 'nobody — part number is the SOURCE\'s code, not the manufacturer\'s', 'fill' => false],
        'code_product' => ['owner' => 'nobody — POS reference, not ours to invent', 'fill' => false],
    ];

    public function handle(): int
    {
        if (! Schema::hasTable('external_catalog_products')) {
            $this->error('external_catalog_products does not exist — run the catalog migrations first.');

            return self::FAILURE;
        }

        $apply = (bool) $this->option('apply');

        $this->report();

        if (! $apply) {
            $this->line('');
            $this->line('Nothing was written. Add --apply to fill the columns marked "fillable" above.');

            return self::SUCCESS;
        }

        return $this->fill();
    }

    /*
    |--------------------------------------------------------------------------
    | Report
    |--------------------------------------------------------------------------
    */

    /**
     * Blank counts per column, imported beside hand-made.
     *
     * Both figures matter and neither is meaningful alone. A column blank on 812 imported products
     * AND on 309 hand-made ones was never filled by anybody and is not something the import broke;
     * a column blank on the imported cohort and populated on the hand-made one is a real gap in the
     * promotion path. Printing them side by side is the difference between "the import is missing
     * things" and knowing which things.
     */
    private function report(): void
    {
        // Counted on `products`, not on the staging table: a staging row whose product has since
        // been deleted still carries a product_id, and a total that includes rows with no product
        // would make every "blank / total" fraction understate itself.
        $imported = Product::query()->whereIn('id', $this->importedProductIds())->count();
        if ($imported === 0) {
            $this->warn('No promoted products found. Run catalog:iherb:promote first.');
        }

        $legacy = Product::query()->whereNotIn('id', $this->importedProductIds())->count();

        $this->line('');
        $this->info(sprintf(
            '%s imported product(s) (they have a row in external_catalog_products) · %s hand-made product(s) (they do not).',
            number_format($imported),
            number_format($legacy),
        ));
        $this->line('');

        $rows = [];
        foreach (self::COLUMNS as $column => $meta) {
            if (! Schema::hasColumn('products', $column)) {
                $rows[] = [$column, 'COLUMN ABSENT', '—', '—', $meta['owner']];

                continue;
            }

            $importedBlank = $this->blankCount($column, true);
            $legacyBlank = $this->blankCount($column, false);

            $rows[] = [
                $column,
                $meta['fill'] ? 'fillable' : 'reported only',
                $imported === 0 ? '—' : sprintf('%s / %s', number_format($importedBlank), number_format($imported)),
                $legacy === 0 ? '—' : sprintf('%s / %s', number_format($legacyBlank), number_format($legacy)),
                $meta['owner'],
            ];
        }

        $this->table(['column', '--apply', 'blank: imported', 'blank: hand-made', 'who fills it today'], $rows);
    }

    /** Blank = NULL or the empty string. A legacy column can hold either and both mean "nothing". */
    private function blankCount(string $column, bool $importedCohort): int
    {
        return Product::query()
            ->when(
                $importedCohort,
                fn ($q) => $q->whereIn('id', $this->importedProductIds()),
                fn ($q) => $q->whereNotIn('id', $this->importedProductIds()),
            )
            ->where(fn ($q) => $q->whereNull($column)->orWhere($column, ''))
            ->count();
    }

    /**
     * The id set that DEFINES "imported". A sub-query, never a materialised list of ids: at ~19,000
     * rows a whereIn() over a PHP array is a query the database has to parse before it can plan it.
     */
    private function importedProductIds(): \Illuminate\Database\Query\Builder
    {
        return DB::table('external_catalog_products')
            ->where('provider', IHerbClient::PROVIDER)
            ->whereNotNull('product_id')
            ->select('product_id');
    }

    /*
    |--------------------------------------------------------------------------
    | Fill
    |--------------------------------------------------------------------------
    */

    /**
     * Fill blanks on imported products, and only on imported products.
     *
     * The loop's source is `external_catalog_products`, so a hand-made product is not reachable from
     * here — see the class docblock. Every write is guarded on the column being blank, so a value an
     * admin typed is never touched either.
     *
     * saveQuietly(), for the same reason seo:backfill-product-meta uses it: ProductSeoObserver::saved
     * hands every published product to SeoNotifier, which is one revalidate plus one IndexNow
     * submission apiece. A backfill over 812 products would be ~1,600 outbound calls for a change no
     * URL structure depends on. The sitemap is refreshed ONCE at the end instead.
     */
    private function fill(): int
    {
        $limit = max(0, (int) $this->option('limit'));

        $filled = array_fill_keys(array_keys(array_filter(self::COLUMNS, fn (array $m): bool => $m['fill'])), 0);
        $touched = 0;
        $scanned = 0;
        $failed = 0;
        $cursor = 0;

        while (true) {
            $take = $limit === 0 ? 200 : min(200, $limit - $scanned);
            if ($take <= 0) {
                break;
            }

            $rows = ExternalCatalogProduct::query()
                ->with(['product.brand', 'product.sousCategorie.categorie'])
                ->where('provider', IHerbClient::PROVIDER)
                ->whereNotNull('product_id')
                ->where('id', '>', $cursor)
                ->orderBy('id')
                ->limit($take)
                ->get();

            if ($rows->isEmpty()) {
                break;
            }

            $cursor = (int) $rows->last()->id;

            foreach ($rows as $row) {
                $scanned++;

                $product = $row->product;
                if ($product === null) {
                    // The staging row points at a product that has since been deleted. Not an error
                    // and not ours to repair here.
                    continue;
                }

                $before = $product->getAttributes();
                $changed = [];

                // 1. seo_title / seo_description, through the same composer promotion uses, so a
                //    value written here is the value promotion would have written. Done BEFORE
                //    ProductSeoDefaults so a row that gains a seo_description still gets its
                //    meta_description from the templates — the two are independent columns and the
                //    storefront prefers the seo_* pair.
                foreach ($this->composed($product, $row) as $column => $value) {
                    if ($this->isBlank($product, $column) && $value !== null) {
                        $product->{$column} = $value;
                        $changed[] = $column;
                    }
                }

                // 2. meta_title / meta_description / alt_cover, from the single definition every
                //    other product on the site uses. Blanks only — apply() enforces that itself.
                if (ProductSeoDefaults::apply($product)) {
                    $after = $product->getAttributes();
                    foreach (['meta_title', 'meta_description', 'alt_cover'] as $column) {
                        if (($before[$column] ?? null) !== ($after[$column] ?? null)) {
                            $changed[] = $column;
                        }
                    }
                }

                if ($changed === []) {
                    continue;
                }

                try {
                    $product->saveQuietly();
                } catch (QueryException $e) {
                    // One bad row must not take the sweep with it, and the counters for everything
                    // already written must survive.
                    $failed++;
                    $this->warn(sprintf('  product %d could not be saved: %s', $product->id, Str::limit($e->getMessage(), 140)));

                    continue;
                }

                $touched++;
                foreach ($changed as $column) {
                    $filled[$column] = ($filled[$column] ?? 0) + 1;
                }
            }
        }

        $this->line('');
        $this->info(sprintf('Filled %s imported product(s) of %s scanned.', number_format($touched), number_format($scanned)));
        foreach ($filled as $column => $n) {
            if ($n > 0) {
                $this->line(sprintf('  %-22s %s', $column, number_format($n)));
            }
        }

        if ($failed > 0) {
            $this->warn(sprintf('%s product(s) failed to save — see the lines above.', number_format($failed)));
        }

        if ($touched > 0) {
            // One refresh for the whole sweep, exactly like seo:backfill-product-meta.
            app(SeoNotifier::class)->sitemapChanged();
            $this->info('Sitemap refresh requested.');
        }

        return self::SUCCESS;
    }

    /**
     * The seo_title / seo_description this product would have been given, recomposed now.
     *
     * Composed from the PRODUCT's live relations rather than from the staging row's raw strings: the
     * brand row's `designation_fr` is what the brand page and the PDP print (BrandKey::displayName()
     * has already tidied it), and the subcategory is whatever the product is filed under TODAY, which
     * may have been corrected in the admin since promotion. That is the whole reason a re-run can
     * produce a value where promotion produced none.
     *
     * Returns nulls when compose() still declines. That is not a failure and must not become one —
     * an invented title is worse than a NULL, because Product::effectiveSeoTitle() already falls back
     * to meta_title, which is filled.
     *
     * @return array{seo_title: ?string, seo_description: ?string}
     */
    private function composed(Product $product, ExternalCatalogProduct $row): array
    {
        $sub = $product->sousCategorie;

        $content = ImportedProductContent::fromStagingRow($row->getAttributes(), [
            // The live designation, so the composed metadata describes the same product the h1 does.
            'name' => trim((string) $product->designation_fr) ?: null,
            'brand' => trim((string) ($product->brand?->designation_fr ?? '')) ?: null,
            'sub_category_slug' => $sub?->slug,
            'sub_category_label' => $sub?->designation_fr,
            'category_label' => $sub?->categorie?->designation_fr,
            // No `reference`: promotion writes no code_product, so the page prints no "Référence : …"
            // line and a sentence quoting one would describe a field the page does not show.
        ]);

        return [
            'seo_title' => $content['seo_title'],
            'seo_description' => $content['seo_description'],
        ];
    }

    /** NULL and '' are the same thing on these columns; both are what "not filled" looks like. */
    private function isBlank(Product $product, string $column): bool
    {
        return trim((string) ($product->getAttributes()[$column] ?? '')) === '';
    }
}
