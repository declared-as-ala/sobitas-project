<?php

/**
 * Standalone check for App\Services\Catalog\PromotionGate — no vendor/, no database, no network.
 *
 *     php filament/tests/catalog/promotion-gate-check.php
 *
 * ── WHY NAMED FIXTURES AND NOT A COUNT ────────────────────────────────────────────────────
 * This gate stands in for a person reading ~13,000 staged rows before they become public pages. The
 * only useful question about it is "which specific thing does it let through, and which does it
 * stop?" — and a pass rate cannot answer that. "10 of 11 gates work" is compatible with the one that
 * does not being the price floor, which is how a $0.75 sample sachet gets published at 4 DT.
 *
 * So every case below is a product with a name and a stated reason, and each pins ONE gate:
 *
 *   · a discontinued product must not become a page for something that can never be restocked
 *   · a $0.75 sachet, and a sachet that prices to EXACTLY the 5 DT floor, must both be rejected —
 *     the floor is `>`, not `>=`, and a boundary that is only ever tested from one side is untested
 *   · a protein bar must be rejected on a database where migration 2026_08_10_000005 has not run,
 *     because the subcategory that would give it a URL does not exist yet
 *   · a brandless row must be rejected, or LegacyColumnDefaults fills brand_id with 0 and the page
 *     ships with a brand relation that resolves to nothing, with no error anywhere
 *   · `source_discontinued` arriving as the STRING "0" must not read as discontinued — PHP's own
 *     (bool) says "0" is false but "0" from some drivers arrives as a string that other casts get
 *     wrong, and the whole catalogue vanishing is a quiet failure
 *
 * The thresholds and rules are REQUIRED from config/catalog.php rather than copied. A copy would let
 * this file pass while the shipped configuration was broken — the same reason slug-relevance-check.php
 * and subcategory-classifier-check.php require the real file.
 */

require __DIR__.'/../../app/Services/Catalog/SubCategoryClassifier.php';
require __DIR__.'/../../app/Services/Catalog/PromotionGate.php';

use App\Services\Catalog\PromotionGate;

// config/catalog.php calls env(); it is not loaded here, so provide the fallback-only shape.
if (! function_exists('env')) {
    function env(string $key, mixed $default = null): mixed
    {
        return $default;
    }
}

$config = require __DIR__.'/../../config/catalog.php';

/**
 * The shop's subcategories as slug => id.
 *
 * `barres-proteinees` is DELIBERATELY ABSENT. It is one of the seven added by migration
 * 2026_08_10_000005, and a database where that migration has not run is exactly the situation the
 * SUBCATEGORY_MISSING gate exists for: the classifier is happy, the slug is real in config, and
 * there is still no row to point `products.sous_categorie_id` at.
 */
$subcategoryIds = [
    'whey-proteine' => 12,
    'whey-isolate' => 13,
    'caseine' => 14,
    'mass-gainers' => 17,
    'creatine' => 21,
    'vitamines' => 44,
    'plantes-et-herbes' => 51,
];

$context = PromotionGate::contextFrom($config, $subcategoryIds);

/**
 * A real, complete, promotable row. Every case below is this one with a single thing changed, so a
 * failure can only be caused by the thing the case is named after.
 */
$base = [
    'status' => 'hydrated',
    'product_id' => null,
    'source_discontinued' => 0,
    'normalized_title' => 'Optimum Nutrition Gold Standard 100% Whey – Double Rich Chocolate – 2,27 kg',
    'external_url_name' => 'optimum-nutrition-gold-standard-100-whey-double-rich-chocolate-5-lb-2-27-kg',
    'normalized_brand_key' => 'optimum nutrition',
    'source_brand_name' => 'Optimum Nutrition',
    'source_list_price' => '79.99',
    'completeness' => 90,
    'sous_category_id' => null,
];

/**
 * @var list<array{name: string, row: array<string, mixed>, reason: ?string, why: string,
 *                 sub?: ?string, price?: ?float, failures?: int}>
 */
$cases = [
    [
        'name' => 'Gold Standard 100% Whey — complete, priced, classified',
        'row' => [],
        'reason' => null,
        'sub' => 'whey-proteine',
        // 79.99 × 3.15 × 1.35 × 1.20 = 408.18897, rounded UP to the nearest dinar.
        'price' => 409.0,
        'why' => 'the one row that must always pass — if this fails, nothing promotes',
    ],
    [
        'name' => 'a row the hydration worker has not finished',
        'row' => ['status' => 'queued'],
        'reason' => PromotionGate::NOT_HYDRATED,
        'why' => 'only `hydrated` rows have been fetched and normalised',
    ],
    [
        'name' => 'a row promoted by yesterday\'s run',
        'row' => ['product_id' => 4211],
        'reason' => PromotionGate::ALREADY_PROMOTED,
        'why' => 'product_id is authoritative — re-running must never create a second product',
    ],
    [
        'name' => 'a row whose product_id survived a crash that left status = hydrated',
        'row' => ['status' => 'hydrated', 'product_id' => '4211'],
        'reason' => PromotionGate::ALREADY_PROMOTED,
        'why' => 'a stale status must not be believed over an existing product',
    ],
    [
        'name' => 'Serious Mass, discontinued by iHerb',
        'row' => ['source_discontinued' => 1],
        'reason' => PromotionGate::DISCONTINUED,
        'why' => 'a page for a product that can never be restocked is a permanent 0-inventory URL',
    ],
    [
        'name' => 'a row whose driver returned source_discontinued as the string "0"',
        'row' => ['source_discontinued' => '0'],
        'reason' => null,
        'sub' => 'whey-proteine',
        'why' => 'PHP would happily read "0" as truthy through the wrong cast and reject the whole catalogue',
    ],
    [
        'name' => 'a payload whose displayName came back empty',
        'row' => ['normalized_title' => '', 'external_url_name' => ''],
        'reason' => PromotionGate::NO_TITLE,
        'sub' => null,
        'why' => 'designation_fr feeds the slug, the H1, the schema name and every SEO default',
    ],
    [
        'name' => 'a 640-character title that did not come from the normaliser',
        'row' => ['normalized_title' => str_repeat('Optimum Nutrition Gold Standard ', 20)],
        'reason' => PromotionGate::TITLE_TOO_LONG,
        // The sitemap slug still classifies it, which is the point: only the length gate fires.
        'sub' => 'whey-proteine',
        'why' => 'products.designation_fr is a legacy column — an over-length insert is SQLSTATE[22001] 1406',
    ],
    [
        'name' => 'a white-label product iHerb lists with no brand',
        'row' => ['normalized_brand_key' => null, 'source_brand_name' => null],
        'reason' => PromotionGate::NO_BRAND,
        'why' => 'a null brand_id becomes 0 via LegacyColumnDefaults and resolves to nothing, silently',
    ],
    [
        'name' => 'a product listed with no list price at all',
        'row' => ['source_list_price' => null],
        'reason' => PromotionGate::NO_PRICE,
        'price' => null,
        'why' => 'ProductSchemaBuilder emits NO Product JSON-LD when the price is not finite',
    ],
    [
        'name' => 'a $0.75 single-serving sachet',
        'row' => ['source_list_price' => '0.75'],
        'reason' => PromotionGate::PRICE_TOO_LOW,
        // 0.75 × 3.15 × 1.35 × 1.20 = 3.82725 → 4 DT, under the 5 DT floor.
        'price' => 4.0,
        'why' => 'a price this low is a parse failure, not a bargain',
    ],
    [
        'name' => 'a $0.90 sachet that prices to EXACTLY the 5 DT floor',
        'row' => ['source_list_price' => '0.90'],
        'reason' => PromotionGate::PRICE_TOO_LOW,
        // 0.90 × 3.15 × 1.35 × 1.20 = 4.5927 → exactly 5.0. The gate is `>`, not `>=`.
        'price' => 5.0,
        'why' => 'the floor is exclusive; a boundary only ever tested from one side is untested',
    ],
    [
        'name' => 'a hydration that only got the title and the brand',
        'row' => ['completeness' => 55],
        'reason' => PromotionGate::INCOMPLETE,
        'why' => 'catalog.promotion.min_completeness is what stands in for somebody reading the row',
    ],
    [
        'name' => 'Now Foods L-Lysine — a supplement protein.tn has no subcategory for',
        'row' => [
            'normalized_title' => 'Now Foods L-Lysine – 250 comprimés',
            'external_url_name' => 'now-foods-l-lysine-500-mg-250-tablets',
        ],
        'reason' => PromotionGate::UNCLASSIFIED,
        'sub' => null,
        'why' => 'no rule matched, and guessing a subcategory means guessing a URL and publishing it',
    ],
    [
        'name' => 'a Quest protein bar on a database where migration 000005 has not run',
        'row' => [
            'normalized_title' => 'Quest Nutrition Protein Bar – Cookies & Cream – 60 g',
            'external_url_name' => 'quest-nutrition-protein-bar-cookies-cream-12-bars-2-12-oz-60-g-each',
        ],
        'reason' => PromotionGate::SUBCATEGORY_MISSING,
        'sub' => 'barres-proteinees',
        'why' => 'the rule matched and the slug is real in config, but no sous_categories row has it',
    ],
    [
        'name' => 'an L-Lysine an admin filed under vitamines by hand',
        'row' => [
            'normalized_title' => 'Now Foods L-Lysine – 250 comprimés',
            'external_url_name' => 'now-foods-l-lysine-500-mg-250-tablets',
            'sous_category_id' => 44,
        ],
        'reason' => null,
        'sub' => 'vitamines',
        'why' => 'an explicit human mapping beats the classifier, including beating "no match"',
    ],
    [
        'name' => 'a row mapped by hand to a subcategory that has since been deleted',
        'row' => ['sous_category_id' => 9999],
        'reason' => PromotionGate::SUBCATEGORY_MISSING,
        'sub' => null,
        'why' => 'a dangling FK makes the crawler route 404 for Googlebot while human URLs still work',
    ],
    [
        'name' => 'a brand-only title whose sitemap slug still says creatine',
        'row' => [
            'normalized_title' => 'Now Foods Sports',
            'external_url_name' => 'now-foods-sports-creatine-monohydrate-powder-2-2-lbs-1-kg',
        ],
        'reason' => null,
        'sub' => 'creatine',
        'why' => 'the second haystack recovers rows whose French title lost the classifying word',
    ],
    [
        'name' => 'a discontinued, brandless, unpriced, unclassifiable row',
        'row' => [
            'source_discontinued' => 1,
            'normalized_brand_key' => null,
            'source_brand_name' => null,
            'source_list_price' => null,
            'normalized_title' => 'Now Foods L-Lysine – 250 comprimés',
            'external_url_name' => 'now-foods-l-lysine-500-mg-250-tablets',
        ],
        'reason' => PromotionGate::DISCONTINUED,
        'failures' => 4,
        'why' => 'every gate is evaluated; `reason` is the first in report order, not the first coded',
    ],
];

$failed = 0;

echo "\nPromotionGate — ".count($cases)." named fixtures\n";
printf(
    "  min_price %.2f   min_completeness %d   usd_to_tnd %.2f   margin %.2f   customs %.2f   round_to %.2f\n",
    (float) $config['pricing']['min_price'],
    (int) $config['promotion']['min_completeness'],
    (float) $config['pricing']['usd_to_tnd'],
    (float) $config['pricing']['margin'],
    (float) $config['pricing']['customs'],
    (float) $config['pricing']['round_to'],
);
echo '  '.count($subcategoryIds)." subcategories known (barres-proteinees deliberately absent)\n\n";

foreach ($cases as $case) {
    $verdict = PromotionGate::inspect(array_merge($base, $case['row']), $context);

    $problems = [];

    if ($verdict['reason'] !== $case['reason']) {
        $problems[] = sprintf(
            'expected %s, got %s (%s)',
            $case['reason'] ?? 'PROMOTABLE',
            $verdict['reason'] ?? 'PROMOTABLE',
            $verdict['detail'] ?? 'no detail',
        );
    }

    if ($verdict['promotable'] !== ($case['reason'] === null)) {
        $problems[] = 'promotable flag disagrees with reason';
    }

    if (array_key_exists('sub', $case) && $verdict['sub_slug'] !== $case['sub']) {
        $problems[] = sprintf('expected subcategory %s, got %s', $case['sub'] ?? 'none', $verdict['sub_slug'] ?? 'none');
    }

    if (array_key_exists('price', $case)) {
        $expected = $case['price'];
        $got = $verdict['price'];
        $same = $expected === null
            ? $got === null
            : ($got !== null && abs($got - $expected) < 0.0005);

        if (! $same) {
            $problems[] = sprintf(
                'expected price %s, got %s',
                $expected === null ? 'null' : sprintf('%.3f', $expected),
                $got === null ? 'null' : sprintf('%.3f', $got),
            );
        }
    }

    if (array_key_exists('failures', $case) && count($verdict['failures']) !== $case['failures']) {
        $problems[] = sprintf('expected %d failing gates, got %d', $case['failures'], count($verdict['failures']));
    }

    if ($problems !== []) {
        $failed++;
    }

    printf(
        "  %s  %-20s %s\n",
        $problems === [] ? 'PASS' : 'FAIL',
        $verdict['reason'] ?? 'promotable',
        substr($case['name'], 0, 68),
    );

    foreach ($problems as $problem) {
        printf("        %s — %s\n", $problem, $case['why']);
    }
}

echo "\n".($failed === 0 ? 'ALL PASS' : $failed.' FAILED')."\n\n";

exit($failed === 0 ? 0 : 1);
