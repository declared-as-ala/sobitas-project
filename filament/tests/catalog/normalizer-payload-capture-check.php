<?php

/**
 * IHerbNormalizer — what it captures from a payload, and what it admits it did not.
 *
 * Run it anywhere PHP exists, with no vendor/, no database and no artisan:
 *
 *     php filament/tests/catalog/normalizer-payload-capture-check.php
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────
 * normalizer-pack-size-check.php covers packSize() and price() — the two parsers that had already
 * produced a wrong number on a live page. It does not touch normalize() itself, so the mapping from
 * payload key to database column was asserted by nothing at all: a renamed key, a typo'd column or a
 * field quietly dropped would have been found by a customer, or not at all.
 *
 * Three things are checked here, and each one has a specific failure it is aimed at.
 *
 * 1. EVERY MAPPED FIELD, on the three payloads the normaliser's docblock names as verified. A field
 *    that stops being captured fails by name.
 *
 * 2. EVERY KEY normalize() RETURNS IS A REAL COLUMN. The keys are handed to forceFill()->save(), so
 *    a typo is not a silent no-op — it is an SQL error on a queue worker, discovered when the import
 *    stops. The column list is PARSED OUT OF THE MIGRATIONS rather than written down here, because a
 *    hand-maintained copy of a schema is a copy that drifts, and this whole harness exists because
 *    of drift.
 *
 * 3. THE TWO COPIES OF THE IMAGE URL AGREE. IHerbNormalizer::imageUrl() is a deliberate copy of
 *    IHerbClient::imageUrl(): the client imports PoliteFetcher and Log and therefore cannot be a
 *    dependency of a class that has to load with no autoloader. PromotionGate carries the same copy
 *    for the same reason, and promotion-gate-check.php asserts ITS agreement case by case. This does
 *    the same for the normaliser's, over the same case table. A copy nobody checks is a copy that
 *    drifts, and this one decides the URL in `products.cover`.
 *
 * ── ASSERTS NAMED CASES, NEVER TOTALS ─────────────────────────────────────────────────────
 * Same rule as the other harnesses in this directory: "23 of 25 pass" cannot tell you which two.
 */
require_once __DIR__.'/../../app/Services/Catalog/IHerb/IHerbNormalizer.php';

/**
 * IHerbClient `use`s PoliteFetcher and Log and is still requirable here: PHP resolves a type hint
 * only when the constructor actually runs, and nothing below constructs one. Exactly the property
 * promotion-gate-check.php relies on to require the same file.
 */
require_once __DIR__.'/../../app/Services/Catalog/IHerb/IHerbClient.php';

use App\Services\Catalog\IHerb\IHerbClient;
use App\Services\Catalog\IHerb\IHerbNormalizer;

$normalizer = new IHerbNormalizer();
$failed = 0;

function check(string $name, bool $ok, string $detail): void
{
    global $failed;

    if (! $ok) {
        $failed++;
    }

    printf("  %s  %s\n", $ok ? 'PASS' : 'FAIL', $name);
    if (! $ok) {
        printf("        %s\n", $detail);
    }
}

/**
 * The three payloads.
 *
 * ── WHAT IS MEASURED HERE AND WHAT IS SHAPE ───────────────────────────────────────────────
 * `id`, `displayName` and `brandName` are the values IHerbNormalizer's docblock records as verified
 * live against /ugc/api/product/v2/{id} on 10/08/2026, quoted verbatim. The remaining keys are the
 * SHAPES the same source documents — `partNumber` "OPN-02385" is the example IHerbClient::imageUrl()
 * carries in its own comment and the case promotion-gate-check.php asserts against — and they are
 * here to exercise the mapping, not to claim a measurement nobody took. The prices are round numbers
 * for that reason: no assertion below depends on them being real.
 */
$payloads = [
    'id 1 — Doctor\'s Best 5-HTP' => [
        'id' => 1,
        'partNumber' => 'DRB-00082',
        'url' => 'https://www.iherb.com/pr/doctor-s-best-5-htp-100-mg-60-veggie-caps/1',
        'urlName' => 'doctor-s-best-5-htp-100-mg-60-veggie-caps',
        'displayName' => '5-HTP, 100 mg, 60 Veggie Caps',
        'brandName' => "Doctor's Best",
        'brandCode' => 'DRB',
        'rootCategoryId' => 1855,
        'rootCategoryName' => 'Supplements',
        'listPrice' => '$12.00',
        'discountPrice' => '$9.60',
        'isAvailableToPurchase' => true,
        'isDiscontinued' => false,
        'primaryImageIndex' => 1,
    ],
    'id 68616 — Optimum Nutrition Micronized Creatine' => [
        'id' => 68616,
        'partNumber' => 'OPN-02385',
        'url' => 'https://www.iherb.com/pr/optimum-nutrition-micronized-creatine-powder/68616',
        'urlName' => 'optimum-nutrition-micronized-creatine-powder',
        'displayName' => 'Micronized Creatine Powder, Unflavored, 1.32 lb (600 g)',
        'brandName' => 'Optimum Nutrition',
        'brandCode' => 'OPN',
        'rootCategoryId' => 101046,
        'rootCategoryName' => 'Sports',
        'listPrice' => '$35.00',
        'discountPrice' => '$28.00',
        'isAvailableToPurchase' => true,
        'isDiscontinued' => false,
        'primaryImageIndex' => 0,
    ],
    'id 46873 — Doctor\'s Best Curcumin Phytosome' => [
        'id' => 46873,
        'partNumber' => 'DRB-00171',
        'url' => 'https://www.iherb.com/pr/doctor-s-best-curcumin-phytosome/46873',
        'urlName' => 'doctor-s-best-curcumin-phytosome',
        'displayName' => 'Curcumin Phytosome™, 180 Veggie Caps (500 mg per Capsule)',
        'brandName' => "Doctor's Best",
        'brandCode' => 'DRB',
        'rootCategoryId' => 1855,
        'rootCategoryName' => 'Supplements',
        'listPrice' => '$40.00',
        'discountPrice' => '',
        'isAvailableToPurchase' => false,
        'isDiscontinued' => true,
        'primaryImageIndex' => 3,
    ],
];

/** [payload key in $payloads, [column => expected value]] */
$expectations = [
    'id 1 — Doctor\'s Best 5-HTP' => [
        'external_product_id' => '1',
        'external_part_number' => 'DRB-00082',
        'source_brand_name' => "Doctor's Best",
        'source_root_category_id' => '1855',
        'source_list_price' => 12.0,
        'source_discount_price' => 9.6,
        'source_currency' => 'USD',
        'source_available' => true,
        'source_discontinued' => false,
        'source_primary_image_index' => 1,
        'source_image_url' => 'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/drb/drb00082/l/1.jpg',
        'source_unmapped_keys' => [],
        'normalized_title' => "Doctor's Best 5-HTP – 60 gélules végétales",
        // brandKey() replaces every non-alphanumeric run with a SPACE, so an apostrophe splits the word:
        // "Doctor's Best" folds to "doctor s best". Asserted as it behaves, because this string is the
        // key BrandMatcher joins on — a change here silently splits one brand page into two.
        'normalized_brand_key' => 'doctor s best',
        'flavour' => null,
        'pack_size' => 60.0,
        'pack_unit' => 'gélules végétales',
    ],
    'id 68616 — Optimum Nutrition Micronized Creatine' => [
        'external_product_id' => '68616',
        'external_part_number' => 'OPN-02385',
        'source_brand_name' => 'Optimum Nutrition',
        'source_root_category_id' => '101046',
        'source_list_price' => 35.0,
        'source_discount_price' => 28.0,
        'source_currency' => 'USD',
        'source_available' => true,
        'source_discontinued' => false,
        'source_primary_image_index' => 0,
        // Index 0 is a real index and must produce a URL. `if (! $imageIndex)` instead of
        // `=== null` would drop the cover of every product whose primary photo is the first one.
        'source_image_url' => 'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/opn/opn02385/l/0.jpg',
        'source_unmapped_keys' => [],
        'normalized_title' => 'Optimum Nutrition Micronized Creatine Powder – Sans arôme – 600 g',
        'normalized_brand_key' => 'optimum nutrition',
        'flavour' => 'Sans arôme',
        'pack_size' => 600.0,
        'pack_unit' => 'g',
    ],
    'id 46873 — Doctor\'s Best Curcumin Phytosome' => [
        'external_product_id' => '46873',
        'external_part_number' => 'DRB-00171',
        'source_brand_name' => "Doctor's Best",
        'source_root_category_id' => '1855',
        'source_list_price' => 40.0,
        // An empty discountPrice is not a zero-price product; price() must return null.
        'source_discount_price' => null,
        'source_currency' => 'USD',
        'source_available' => false,
        'source_discontinued' => true,
        'source_primary_image_index' => 3,
        'source_image_url' => 'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/drb/drb00171/l/3.jpg',
        'source_unmapped_keys' => [],
        'normalized_title' => "Doctor's Best Curcumin Phytosome – 180 gélules végétales",
        // brandKey() replaces every non-alphanumeric run with a SPACE, so an apostrophe splits the word:
        // "Doctor's Best" folds to "doctor s best". Asserted as it behaves, because this string is the
        // key BrandMatcher joins on — a change here silently splits one brand page into two.
        'normalized_brand_key' => 'doctor s best',
        'flavour' => null,
        'pack_size' => 180.0,
        'pack_unit' => 'gélules végétales',
    ],
];

echo "\nIHerbNormalizer::normalize() — every mapped field, on the three verified payloads\n\n";

foreach ($expectations as $label => $expected) {
    echo "  ".$label."\n";
    $actual = $normalizer->normalize($payloads[$label]);

    foreach ($expected as $column => $want) {
        $got = $actual[$column] ?? null;

        $ok = match (true) {
            is_float($want) => is_numeric($got) && abs((float) $got - $want) < 0.0005,
            is_array($want) => $got === $want,
            default => $got === $want,
        };

        check(
            '  '.$column,
            $ok,
            sprintf('expected %s, got %s', var_export($want, true), var_export($got, true)),
        );
    }
    echo "\n";
}

/*
|--------------------------------------------------------------------------
| Unmapped keys — the mechanism that notices the source growing
|--------------------------------------------------------------------------
|
| The owner asked for "the full rich data". The measured answer is that this endpoint carries none:
| no description, no ingredient list, no Supplement Facts, no video, no image count. That is a fact
| about the SOURCE, and the only honest engineering response to it is to guarantee we find out the
| day it stops being true — otherwise a payload that starts carrying a description is discarded on
| every one of ~19,000 rows, silently, forever.
|
| So a key nothing reads must be RECORDED, not ignored. These cases assert that it is.
*/
echo "IHerbNormalizer::unmappedKeys() — what the source sent that we do not read\n\n";

$known = $payloads['id 68616 — Optimum Nutrition Micronized Creatine'];

check(
    'a payload of known keys only reports nothing unmapped',
    IHerbNormalizer::unmappedKeys($known) === [],
    'expected [], got '.var_export(IHerbNormalizer::unmappedKeys($known), true),
);

$richer = $known + ['description' => 'Some day iHerb may send this.', 'ingredients' => ['a', 'b']];

check(
    'a payload carrying a description and an ingredient list reports BOTH as unmapped',
    IHerbNormalizer::unmappedKeys($richer) === ['description', 'ingredients'],
    'expected [description, ingredients], got '.var_export(IHerbNormalizer::unmappedKeys($richer), true),
);

check(
    'the unmapped keys reach the normalised row, not just the helper',
    ($normalizer->normalize($richer)['source_unmapped_keys'] ?? null) === ['description', 'ingredients'],
    'normalize() must surface the same list unmappedKeys() computes',
);

check(
    'an empty payload reports nothing unmapped rather than crashing',
    IHerbNormalizer::unmappedKeys([]) === [],
    'expected []',
);

/*
| Every entry in KNOWN_PAYLOAD_KEYS must actually be READ by the class. A key listed as known and
| consumed by nothing is worse than an unknown key: it is silently excluded from the very report
| that exists to reveal what we are throwing away.
*/
$source = (string) file_get_contents(__DIR__.'/../../app/Services/Catalog/IHerb/IHerbNormalizer.php');

foreach (IHerbNormalizer::KNOWN_PAYLOAD_KEYS as $key) {
    check(
        sprintf('"%s" is declared known AND read by normalize()', $key),
        substr_count($source, "\$payload['".$key."']") > 0,
        'declared in KNOWN_PAYLOAD_KEYS but never read — it would be hidden from source_unmapped_keys',
    );
}

echo "\n";

/*
|--------------------------------------------------------------------------
| Every returned key is a real column
|--------------------------------------------------------------------------
|
| normalize()'s output goes to forceFill()->save() in HydrateExternalProductJob::store() and in
| catalog:iherb:hydrate --renormalize. A key that is not a column is an SQL error on a queue worker
| — the import stops and the reason is in a log nobody is reading.
|
| The column list is parsed from the migrations rather than written here, so adding a column to the
| table is enough and this file needs no edit. That also means a field mapped WITHOUT its migration
| fails here, which is the sequencing error worth catching.
*/
echo "normalize() writes only columns that exist in external_catalog_products\n\n";

$columns = [];
foreach (glob(__DIR__.'/../../database/migrations/*external_catalog_products*.php') ?: [] as $migration) {
    if (preg_match_all(
        '~\$table->[a-zA-Z]+\(\s*\'([a-z0-9_]+)\'~',
        (string) file_get_contents($migration),
        $m
    )) {
        foreach ($m[1] as $column) {
            $columns[$column] = true;
        }
    }
}
// `id` and the timestamps come from ->id() / ->timestamps(), which carry no name argument.
$columns += ['id' => true, 'created_at' => true, 'updated_at' => true];

check(
    'the migrations were found and parsed',
    count($columns) > 20,
    sprintf('only %d column names parsed — the glob or the regex is wrong, so every check below is vacuous', count($columns)),
);

foreach (array_keys($normalizer->normalize($known)) as $field) {
    check(
        sprintf('"%s" is a column', $field),
        isset($columns[$field]),
        'normalize() returns a key with no matching column; forceFill()->save() would throw',
    );
}

echo "\n";

/*
|--------------------------------------------------------------------------
| The image URL copy agrees with IHerbClient's
|--------------------------------------------------------------------------
|
| Same case table as promotion-gate-check.php's "PromotionGate::hasCoverImage vs
| IHerbClient::imageUrl" section, deliberately: three copies of one rule, each cross-checked against
| the original, is the pattern this codebase already chose for a class that must load without an
| autoloader. What must never happen is a copy that is only checked against itself.
*/
echo "IHerbNormalizer::imageUrl() vs IHerbClient::imageUrl() — the copied pattern\n\n";

/** [partNumber, imageIndex, why this case is here] */
$imageCases = [
    ['OPN-02385', 0, 'the shape IHerbClient documents: brand letters, hyphen, asset id'],
    ['now-01234', 3, 'already lower-case, and a non-zero index'],
    ['NOW01234', 1, 'no hyphen at all — the regex has to split it anyway'],
    ['OPN-02385-XL', 0, 'a second hyphen: \\w does not include one, so there is no image'],
    ['12345', 0, 'digits only — no brand folder can be derived'],
    ['A-1', 0, 'one brand letter is below the {2,4} floor'],
    ['', 0, 'empty part number'],
    [null, 0, 'null part number'],
    ['OPN-02385', null, 'null index — a product whose primary image we were never told'],
];

foreach ($imageCases as [$part, $index, $why]) {
    $mine = IHerbNormalizer::imageUrl($part, $index === null ? null : (int) $index, 'l');
    $theirs = IHerbClient::imageUrl($part, $index === null ? null : (int) $index, 'l');

    check(
        sprintf('%-14s index %-4s', var_export($part, true), $index === null ? 'null' : (string) $index),
        $mine === $theirs,
        sprintf('normalizer says %s, client says %s — %s', var_export($mine, true), var_export($theirs, true), $why),
    );
}

// The size argument is part of the contract too: an unrecognised variant must be refused by both,
// not silently turned into a URL that 404s.
foreach (['l', 'm', 's', 'k', 'r', 'xl', ''] as $size) {
    check(
        sprintf('size "%s" is treated the same way by both', $size),
        IHerbNormalizer::imageUrl('OPN-02385', 0, $size) === IHerbClient::imageUrl('OPN-02385', 0, $size),
        'the accepted size set has drifted between the two copies',
    );
}

echo "\n";

/*
|--------------------------------------------------------------------------
| packLabel() — the string the product page prints as "Conditionnement"
|--------------------------------------------------------------------------
|
| This value is rendered on the human product page AND on /x-crawler/product/[slug], which is the
| only view Googlebot is served. It must agree with the "Conditionnement" sentence the composed
| description already carries, and the rule that matters most is the one about doses:
| ImportedProductContent::UNIT_GROUPS maps mg and µg to `dose` and refuses to describe them, because
| "500 mg" reaching pack_unit is the strength of ONE capsule. A specification row saying
| "Conditionnement : 500 mg" on a 180-capsule bottle is false in the most legible place on the page.
*/
echo "IHerbNormalizer::packLabel() — the printed conditionnement\n\n";

/** [size, unit, expected, why] */
$labelCases = [
    [600.0, 'g', '600 g', 'a whole number keeps no decimal tail'],
    [2.29, 'kg', '2,29 kg', 'French decimal comma, and no rounding of the transcribed figure'],
    [60.0, 'gélules végétales', '60 gélules végétales', 'a countable pack prints its French unit'],
    ['1361', 'g', '1361 g', 'a string from a decimal column is numeric and must parse'],
    [500.0, 'mg', null, 'THE RULE: mg is a per-unit dose, never a pack size'],
    [400.0, 'µg', null, 'the same for micrograms'],
    [500.0, 'MG', null, 'the dose rule is case-insensitive, or one row of capitals defeats it'],
    [0.0, 'g', null, 'a zero quantity is an absent one, not a 0 g product'],
    [-5.0, 'g', null, 'a negative quantity is absent'],
    [null, 'g', null, 'no quantity — the row is dropped rather than printed half-empty'],
    [600.0, null, null, 'no unit — a bare number is not a conditionnement'],
    [600.0, '   ', null, 'whitespace is not a unit'],
];

foreach ($labelCases as [$size, $unit, $want, $why]) {
    $got = IHerbNormalizer::packLabel($size, $unit);
    check(
        sprintf('%-10s %-20s → %s', var_export($size, true), var_export($unit, true), var_export($want, true)),
        $got === $want,
        sprintf('got %s — %s', var_export($got, true), $why),
    );
}

echo "\n".str_repeat('─', 100)."\n";

if ($failed > 0) {
    printf("\n%d check(s) FAILED.\n\n", $failed);
    exit(1);
}

echo "\nAll checks passed.\n\n";
exit(0);
