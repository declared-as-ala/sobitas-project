<?php

/**
 * IHerbNormalizer::packSize() — the number that reaches the H1 and the URL.
 *
 * Run it anywhere PHP exists, with no vendor/, no database and no artisan:
 *
 *     php filament/tests/catalog/normalizer-pack-size-check.php
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────────────────────
 * packSize() parsed "1,361 g" as 1.361 g, because it treated the comma as a French decimal point
 * while price(), twelve lines above it in the same class, correctly treats the same comma in the
 * same payload as a US thousands separator. The error was 1000x, it was silent, and it landed in
 * three places at once: the product title, the `Conditionnement` line of the description, and the
 * completeness score. It was caught by eye in a promotion dry run — which is not a mechanism.
 *
 * This is the mechanism. Every case below is a real iHerb `displayName` shape.
 *
 * ── ASSERTS NAMED PRODUCTS, NEVER TOTALS ──────────────────────────────────────────────────
 * Same rule as slug-relevance-check.php: "18 of 20 pass" cannot tell you that the two failures are
 * the thousands-separator cases. Each row is asserted by name and prints its own verdict.
 */
require_once __DIR__.'/../../app/Services/Catalog/IHerb/IHerbNormalizer.php';

use App\Services\Catalog\IHerb\IHerbNormalizer;

$normalizer = new IHerbNormalizer();

/** [displayName, expected quantity or null, expected unit or null, why this case is here] */
$cases = [
    // ── The defect, and its neighbours ────────────────────────────────────────────────────
    ['Vitamin C Crystals, 3 lb (1,361 g)', 1361.0, 'g',
        'THE BUG: a US thousands separator read as a decimal point gave 1.361 g'],
    ['Whey Protein Isolate, Chocolate, 5 lb (2,268 g)', 2268.0, 'g',
        'the same shape on a protein tub — 2.268 g would be a rounding error, not a product'],
    ['Vitamin D3, 5,000 IU, 1,000 Softgels', 1000.0, 'capsules molles',
        'countable packs carry the separator too; 1 softgel is not a bottle'],

    // ── Ambiguity must yield NOTHING, not a confident wrong answer ────────────────────────
    ['Magnesium Glycinate, 1,36 g', null, null,
        'European decimal comma: the lookbehind must stop the engine matching the bare "36"'],

    // ── The cases that already worked, pinned so the fix cannot regress them ──────────────
    ['Micronized Creatine Powder, Unflavored, 1.32 lb (600 g)', 600.0, 'g',
        'metric in parentheses wins over the imperial figure, and is never computed from it'],
    ['Gold Standard 100% Whey, Vanilla, 5.05 lb (2.29 kg)', 2.29, 'kg',
        'a genuine decimal point still parses as a decimal'],
    ['5-HTP, 100 mg, 60 Veggie Caps', 60.0, 'gélules végétales',
        'the countable pack, not the 100 mg dose'],
    ['Curcumin Phytosome, 180 Veggie Caps (500 mg per Capsule)', 180.0, 'gélules végétales',
        'the "per Capsule" span is a dose and must be removed before matching'],
    ['Organic Coconut Oil, 16 oz', 16.0, 'oz',
        'no metric given, so the imperial figure is kept rather than converted'],
    ['Vitamin C-1000, 250 Tablets', 250.0, 'comprimés',
        'a number welded to the product name is not a pack size'],
    ['Omega-3, 1,200 mg, 100 Softgels', 100.0, 'capsules molles',
        'mg is a strength; the countable form is the pack even when the mg carries a comma'],
    ['Collagen Peptides, Unflavored', null, null,
        'no size in the name at all — null, never a guess'],
];

$failed = 0;

echo "\nIHerbNormalizer::packSize()\n";
echo str_repeat('─', 100)."\n";

foreach ($cases as [$title, $expectedQty, $expectedUnit, $why]) {
    $result = $normalizer->packSize($title);

    $actualQty = $result['quantity'] ?? null;
    $actualUnit = $result['unit'] ?? null;

    // Floats compared with a tolerance, not ===: 2.29 through a parse is not bit-identical to the
    // literal 2.29 on every platform, and a test that fails for that reason teaches people to
    // ignore it.
    $qtyOk = $expectedQty === null
        ? $actualQty === null
        : ($actualQty !== null && abs($actualQty - $expectedQty) < 0.0005);

    $ok = $qtyOk && $actualUnit === $expectedUnit;

    if (! $ok) {
        $failed++;
    }

    printf(
        "%s  %s\n      expected %-28s got %s\n      %s\n",
        $ok ? ' ok ' : 'FAIL',
        $title,
        $expectedQty === null ? 'null' : rtrim(rtrim(number_format($expectedQty, 3, '.', ''), '0'), '.').' '.$expectedUnit,
        $actualQty === null ? 'null' : rtrim(rtrim(number_format($actualQty, 3, '.', ''), '0'), '.').' '.$actualUnit,
        $why,
    );
}

echo str_repeat('─', 100)."\n";

/*
 * The invariant behind the whole file, asserted rather than described: packSize() and price() must
 * agree about what a comma is. They read the same payload, and the day they disagreed cost a 1000x
 * error in a product title. A future edit to either one that breaks the agreement fails here.
 */
$price = $normalizer->price('$1,361.00');
$pack = $normalizer->packSize('Something, 1,361 g');

$agree = $price !== null
    && abs($price['amount'] - 1361.00) < 0.005
    && $pack !== null
    && abs($pack['quantity'] - 1361.0) < 0.0005;

if (! $agree) {
    $failed++;
}

printf(
    "%s  price() and packSize() agree that \"1,361\" is 1361 (price: %s, pack: %s)\n",
    $agree ? ' ok ' : 'FAIL',
    $price === null ? 'null' : (string) $price['amount'],
    $pack === null ? 'null' : (string) $pack['quantity'],
);

echo str_repeat('─', 100)."\n";

if ($failed > 0) {
    printf("\n%d case(s) FAILED.\n\n", $failed);
    exit(1);
}

printf("\nAll %d cases passed.\n\n", count($cases) + 1);
exit(0);
