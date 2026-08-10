<?php

/**
 * The SEO contract for imported products, asserted over source text — no vendor/, no database.
 *
 *     php filament/tests/catalog/imported-product-seo-check.php
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────
 * "meta_title / meta_description / alt_cover are empty on imported products" was reported, and the
 * obvious suspect was that ProductSeoObserver had never been registered. That failure is not
 * hypothetical here: App\Observers\ProductImageObserver exists in this repository and appears
 * NOWHERE in AppServiceProvider — declared, never registered, silently doing nothing since the day
 * it shipped. An observer's registration is one line in one file that no test has ever read, which
 * is exactly the kind of line that goes missing in a merge and produces a defect with no stack
 * trace and no log entry.
 *
 * So the registration is asserted here, mechanically, along with the two other things that make
 * CatalogIHerbPromote's "leave them blank, the observer fills them" comment TRUE rather than merely
 * intended:
 *
 *   · the promote path must set brand_id and sous_categorie_id INSIDE the create array, because
 *     ProductSeoDefaults::apply() runs on that same save (Eloquent fires `saving` before `creating`,
 *     and the observer is on `saving`) and reads $product->brand and $product->sousCategorie. Patch
 *     them on after the create and all three columns come out brandless and categoryless — and
 *     because they are then no longer blank, nothing ever regenerates them;
 *   · ProductSeoDefaults must stay the ONLY definition of those three columns. A second template
 *     bank inside the promote path is the "divergent house style" its own comment warns about.
 *
 * ── AND THE SCOPE GUARANTEE OF THE REPAIR COMMAND ─────────────────────────────────────────
 * catalog:iherb:seo-audit writes to products. The 309 hand-made products are protected by
 * construction — its fill loop's only source of products is external_catalog_products.product_id —
 * and "by construction" is worth nothing if a later edit can quietly add a Product::query() to that
 * method. That is asserted too, as is the blanks-only rule and the refusal to write identifier
 * columns we cannot verify.
 *
 * Source-text assertions, in the same style as promotion-gate-check.php, for the same reason: these
 * are properties of code that cannot be executed here (Eloquent, a container and a database are all
 * required) but CAN be read.
 */

$root = dirname(__DIR__, 2);

$read = static function (string $relative) use ($root): string {
    $path = $root.'/'.$relative;
    if (! is_file($path)) {
        echo "\n  MISSING FILE: {$relative}\n";
        exit(1);
    }

    return (string) file_get_contents($path);
};

$provider = $read('app/Providers/AppServiceProvider.php');
$observer = $read('app/Observers/ProductSeoObserver.php');
$defaults = $read('app/Services/Seo/ProductSeoDefaults.php');
$promote = $read('app/Console/Commands/CatalogIHerbPromote.php');
$audit = $read('app/Console/Commands/CatalogIHerbSeoAudit.php');

$failed = 0;
$passed = 0;

$check = static function (string $what, bool $ok, string $why = '') use (&$failed, &$passed): void {
    if ($ok) {
        $passed++;
        echo "  ok    {$what}\n";

        return;
    }
    $failed++;
    echo "  FAIL  {$what}\n";
    if ($why !== '') {
        echo "        {$why}\n";
    }
};

/** The body of one method, from its signature to the next one at the same indentation. */
$method = static function (string $source, string $signature): string {
    $at = strpos($source, $signature);
    if ($at === false) {
        return '';
    }
    $next = strpos($source, "\n    }\n", $at);

    return $next === false ? substr($source, $at) : substr($source, $at, $next - $at);
};

echo "\nImported-product SEO contract\n\n";

/*
|--------------------------------------------------------------------------
| SECTION 1 — the observer is REGISTERED
|--------------------------------------------------------------------------
*/

$check(
    'ProductSeoObserver is registered on Product in AppServiceProvider',
    // Anchored to the start of a line so a COMMENTED-OUT registration fails. The first version of
    // this check was not, and `// Product::observe(...)` passed it — an audit that cannot tell a
    // statement from a comment reports green for looking at nothing.
    (bool) preg_match('~^[ \t]*Product::observe\(\s*ProductSeoObserver::class\s*\);~m', $provider),
    'without this line the observer is inert and every product created outside the admin ships with no meta_title, '
    .'no meta_description and no alt_cover — the exact state ProductImageObserver is in today',
);

$check(
    'the registration is inside boot(), not register()',
    strpos($provider, 'Product::observe(ProductSeoObserver::class)') > strpos($provider, 'public function boot(): void'),
    'observers registered in register() run before the container is ready',
);

$check(
    'ProductSeoObserver hooks `saving`, which is the only event that can still change the INSERT',
    (bool) preg_match('~public function saving\(Product \$product\)~', $observer),
    'on `created` the row is already written; on `saved` it is too late for the same statement',
);

$check(
    'the observer delegates to ProductSeoDefaults rather than carrying its own templates',
    str_contains($observer, 'ProductSeoDefaults::apply($product)')
        && ! preg_match('~Prix Tunisie|Livraison~', $observer),
    'a second copy of the templates is how the observer and the backfill drift apart',
);

/*
|--------------------------------------------------------------------------
| SECTION 2 — ORDER: the templates must be able to SEE the brand and the rayon
|--------------------------------------------------------------------------
| ProductSeoDefaults::apply() reads $product->brand?->designation_fr and
| $product->sousCategorie?->designation_fr. Both relations resolve from foreign keys that must
| already be set when `saving` fires — i.e. they have to be in the create array. Assigned after the
| create, the three columns are written brandless and categoryless AND are no longer blank, so the
| self-healing layer (which only ever fills blanks) can never repair them.
*/

$createProduct = $method($promote, 'private function createProduct(');

$check(
    'ProductSeoDefaults reads the brand and the subcategory relations',
    str_contains($defaults, '$product->brand?->designation_fr')
        && str_contains($defaults, '$product->sousCategorie?->designation_fr'),
    'if this stops being true the ordering requirement below is no longer the reason it is there',
);

$check(
    'createProduct() sets brand_id in the create array',
    (bool) preg_match("~'brand_id'\s*=>~", $createProduct),
    'patched on after Product::create(), the meta_* templates render with an empty brand and never regenerate',
);

$check(
    'createProduct() sets sous_categorie_id in the create array',
    (bool) preg_match("~'sous_categorie_id'\s*=>~", $createProduct),
    'patched on after Product::create(), meta_description loses its category clause permanently',
);

$check(
    'createProduct() leaves meta_title, meta_description and alt_cover blank for the observer',
    (bool) preg_match("~'meta_title'\s*=>\s*null~", $createProduct)
        && (bool) preg_match("~'meta_description'\s*=>\s*null~", $createProduct)
        && (bool) preg_match("~'alt_cover'\s*=>\s*null~", $createProduct),
    'writing them here produces a second house style that ProductSeoDefaults can never correct, because they are not blank',
);

$check(
    'createProduct() goes through Product::create(), so model events fire at all',
    str_contains($createProduct, 'Product::create(')
        // Matched on the CALL form (`->insert(`), never the bare word: the method's own docblock
        // contains the sentence "never insert()/upsert()/the query builder", and a check that a
        // comment can fail is a check nobody trusts.
        && ! preg_match('~->(?:insert|insertGetId|upsert|updateOrInsert)\(|DB::table\([\'"]products~', $createProduct),
    'insert()/upsert()/the query builder fire no events: no LegacyColumnDefaults, no ProductSeoObserver',
);

/*
|--------------------------------------------------------------------------
| SECTION 3 — the repair command cannot reach the 309 hand-made products
|--------------------------------------------------------------------------
*/

$fill = $method($audit, 'private function fill(): int');

$check(
    'catalog:iherb:seo-audit writes nothing without --apply',
    (bool) preg_match('~\{--apply~', $audit)
        && (bool) preg_match('~if \(! \$apply\) \{~', $audit),
    'a repair command whose default writes is one nobody can safely run to find out what it would do',
);

$check(
    'the fill loop takes its products ONLY from external_catalog_products',
    str_contains($fill, 'ExternalCatalogProduct::query()')
        && str_contains($fill, '$row->product')
        // Anchored so `ExternalCatalogProduct::query()` — which is the ALLOWED source — does not
        // match as a substring of `Product::query(`.
        && ! preg_match('~(?<![A-Za-z])Product::(?:query|where|whereIn|find|all)\(~', $fill),
    'the moment the fill loop can select a Product directly, "the 309 are unreachable by construction" stops being true',
);

$check(
    'the fill loop is blanks-only',
    str_contains($fill, '$this->isBlank($product, $column)')
        && str_contains($fill, 'ProductSeoDefaults::apply($product)'),
    'ProductSeoDefaults::apply() fills blanks only; the seo_* writes beside it must do the same',
);

$check(
    'the fill loop uses saveQuietly()',
    str_contains($fill, '$product->saveQuietly()'),
    'a plain save() fires ProductSeoObserver::saved — one revalidate plus one IndexNow submission per published product',
);

/*
 * The identifier columns are REPORTED and never written. `external_part_number` is the SOURCE's
 * catalogue code: declaring it as `mpn` asserts it is the manufacturer's part number, and no UPC is
 * captured anywhere, so `gtin` would be invented outright. ProductSchemaBuilder's own comment is the
 * rule being enforced here — "A malformed identifier is worse than none".
 */
foreach (['sku', 'gtin', 'mpn', 'code_product', 'seo_canonical_url', 'seo_image_alt'] as $column) {
    $check(
        "catalog:iherb:seo-audit never assigns {$column}",
        preg_match('~\$product->'.$column.'\s*=~', $audit) !== 1,
        "{$column} has no verified factual source on the staging row, or is deliberately left null so a documented fallback owns it",
    );
}

echo "\n  {$passed} passed, {$failed} failed\n\n";

exit($failed === 0 ? 0 : 1);
