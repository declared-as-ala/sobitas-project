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
 *   · a row with NO PHOTO must be rejected, and — the case that matters most — a row with no photo
 *     that scores 75 on completeness must still be rejected. 30 (title) + 20 (brand) + 25 (price)
 *     already clears the default min_completeness of 60 with BOTH image components of
 *     HydrateExternalProductJob::completeness() missing, so the score cannot stand in for this gate
 *   · `source_discontinued` arriving as the STRING "0" must not read as discontinued — PHP's own
 *     (bool) says "0" is false but "0" from some drivers arrives as a string that other casts get
 *     wrong, and the whole catalogue vanishing is a quiet failure
 *
 * ── FOUR SECTIONS, BECAUSE FOUR DIFFERENT THINGS CAN BE WRONG ─────────────────────────────
 * 1. the gate's verdicts, as named fixtures (above);
 * 2. the image gate's agreement with IHerbClient::imageUrl(). PromotionGate cannot import that
 *    class — it has to load with no autoloader — so it carries a COPY of the part-number pattern,
 *    and a copy nobody checks is a copy that drifts. This section requires BOTH files and asserts
 *    they answer identically for named part numbers, which is the only thing that makes the
 *    duplication safe;
 * 3. two ordering invariants of CatalogIHerbPromote, asserted against its SOURCE. That command
 *    extends Illuminate\Console\Command and cannot be loaded here at all, and the defects in
 *    question are not values a function returns — they are WHERE a statement sits relative to a
 *    COMMIT. There is nothing to call, so the file is read and the order of the statements is
 *    asserted. Crude, and still the difference between "a rolled-back product was submitted to
 *    IndexNow" being a caught regression and being a live 404 in Bing;
 * 4. THE INDEXING GATE — whether a published product is offered to search engines. It is a separate
 *    section rather than more fixtures above because it answers a different question: inspect()
 *    decides whether a row becomes a PRODUCT, indexable() decides whether that product's URL becomes
 *    a SUBMISSION. The second decision had no test and, for the whole life of the import, no
 *    implementation either — publish() hardcoded `seo_robots_index = true` while three separate
 *    docblocks in this repo described `publier = 1 + seo_robots_index = 0` as a state this command
 *    produces. A gate nothing tests is a gate that silently inverts, and inverting THIS one means
 *    ~13,000 thin pages submitted for indexing, which is not an action anybody takes back.
 *
 * The thresholds and rules are REQUIRED from config/catalog.php rather than copied. A copy would let
 * this file pass while the shipped configuration was broken — the same reason slug-relevance-check.php
 * and subcategory-classifier-check.php require the real file.
 */

require __DIR__.'/../../app/Services/Catalog/SubCategoryClassifier.php';
require __DIR__.'/../../app/Services/Catalog/PromotionGate.php';
/*
 * Loads under a bare `php`: its `use` lines are aliases only (PoliteFetcher, the Log facade) and
 * nothing in the file is resolved at parse time — the promoted constructor property is typed, and a
 * type declaration is not resolved until something is instantiated, which this file never does.
 * Same property that lets imported-product-content-check.php require ProductContentGenerator.
 */
require __DIR__.'/../../app/Services/Catalog/IHerb/IHerbClient.php';
/*
 * Section 4 gates a body ImportedProductContent actually composes, rather than an invented integer.
 * Both files load under a bare `php` for the same reason everything else here does — no facades, no
 * container, no config() — and ProductContentGenerator comes first because ImportedProductContent
 * names it (as an alias only, but the order costs nothing and states the dependency).
 */
require __DIR__.'/../../app/Services/Content/ProductContentGenerator.php';
require __DIR__.'/../../app/Services/Catalog/ImportedProductContent.php';

use App\Services\Catalog\IHerb\IHerbClient;
use App\Services\Catalog\ImportedProductContent;
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
    // Created by migration 2026_08_10_000006 from the first promotion dry run's unclassified
    // samples. Present here because they are present in the shop — the whole point of this map is
    // that it mirrors `sous_categories` as it IS, so a slug the classifier can reach and the
    // database cannot is reported as SUBCATEGORY_MISSING rather than passing silently.
    'acides-amines' => 58,
    'glucides-energie' => 59,
];

$context = PromotionGate::contextFrom($config, $subcategoryIds);

/**
 * The same shop with the image requirement switched OFF.
 *
 * `require_image` is not a key in the shipped config/catalog.php, so contextFrom() defaults it to
 * true and the strict behaviour needs no configuration. This second context exists to prove the
 * switch is real in the other direction as well: an owner who sets `'require_image' => false` under
 * `promotion` must actually get coverless products, not a gate that ignores them either way.
 */
$configImageOptional = $config;
$configImageOptional['promotion']['require_image'] = false;
$contextImageOptional = PromotionGate::contextFrom($configImageOptional, $subcategoryIds);

/**
 * A real, complete, promotable row. Every case below is this one with a single thing changed, so a
 * failure can only be caused by the thing the case is named after.
 *
 * `external_part_number` carries the shape IHerbClient documents ("OPN-02385" → brand folder `opn`,
 * asset folder `opn02385`), because without a resolvable cover image the base row is not promotable
 * at all and every other case here would fail for the wrong reason.
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
    'external_part_number' => 'OPN-02385',
    'source_primary_image_index' => 0,
    'completeness' => 90,
    'sous_category_id' => null,
];

/**
 * @var list<array{name: string, row: array<string, mixed>, reason: ?string, why: string,
 *                 sub?: ?string, price?: ?float, failures?: int, context?: array<string, mixed>}>
 */
$cases = [
    [
        'name' => 'Gold Standard 100% Whey — complete, priced, classified, photographed',
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

    // ── The image gate. DEFECT: before it existed, every one of these promoted. ──────────
    [
        'name' => 'a supplement iHerb lists without a single photo',
        'row' => ['source_primary_image_index' => null],
        'reason' => PromotionGate::NO_IMAGE,
        'sub' => 'whey-proteine',
        'why' => 'cover would be null and the page would ship a product photo frame with nothing in it',
    ],
    [
        'name' => 'a hydration whose payload carried no partNumber',
        'row' => ['external_part_number' => null],
        'reason' => PromotionGate::NO_IMAGE,
        'sub' => 'whey-proteine',
        'why' => 'the part number IS the image path — without it there is no URL to build',
    ],
    [
        'name' => 'a part number with a second hyphen, which the URL scheme cannot parse',
        'row' => ['external_part_number' => 'OPN-02385-XL'],
        'reason' => PromotionGate::NO_IMAGE,
        'sub' => 'whey-proteine',
        'why' => 'IHerbClient::imageUrl matches ^[a-z]{2,4}-?\\w+$ and \\w does not include a hyphen',
    ],
    [
        'name' => 'THE DEFECT: a photoless row that scores 75 and cleared min_completeness anyway',
        'row' => [
            // 30 (title) + 20 (brand) + 25 (price). No pack_size, no image index, no part number —
            // the exact score HydrateExternalProductJob::completeness() gives such a row.
            'completeness' => 75,
            'external_part_number' => null,
            'source_primary_image_index' => null,
        ],
        'reason' => PromotionGate::NO_IMAGE,
        'sub' => 'whey-proteine',
        'why' => 'min_completeness 60 cannot stand in for this: image is worth 15 of 100, so a threshold '
            .'strict enough to force it would be above 85 and would also reject every row with no pack size',
    ],
    [
        'name' => 'the same photoless row where the owner set promotion.require_image = false',
        'row' => [
            'completeness' => 75,
            'external_part_number' => null,
            'source_primary_image_index' => null,
        ],
        'context' => $contextImageOptional,
        'reason' => null,
        'sub' => 'whey-proteine',
        'why' => 'the requirement has to be a real switch, or "turn it off" silently means "it was never on"',
    ],
    [
        'name' => 'a photoless row that is ALSO below min_completeness',
        'row' => [
            'completeness' => 30,
            'external_part_number' => null,
            'source_primary_image_index' => null,
        ],
        'reason' => PromotionGate::NO_IMAGE,
        'sub' => 'whey-proteine',
        'failures' => 2,
        'why' => 'report order puts the specific statement ("no photo") ahead of the aggregate one ("scored 30")',
    ],

    [
        'name' => 'a hydration that only got the title and the brand',
        'row' => ['completeness' => 55],
        'reason' => PromotionGate::INCOMPLETE,
        'why' => 'catalog.promotion.min_completeness is what stands in for somebody reading the row',
    ],
    [
        // WAS: expected UNCLASSIFIED, "a supplement protein.tn has no subcategory for". True of the
        // SHOP when it was written, and false since migration 000006 created `acides-amines` — the
        // same staleness that had six cases red in subcategory-classifier-check.php. A free amino
        // acid is now a product this catalogue can file, so the case asserts the outcome that
        // actually matters: it reaches the amino rayon and is promotable.
        'name' => 'Now Foods L-Lysine — a free amino acid, homed by migration 000006',
        'row' => [
            'normalized_title' => 'Now Foods L-Lysine – 250 comprimés',
            'external_url_name' => 'now-foods-l-lysine-500-mg-250-tablets',
        ],
        'reason' => null,
        'sub' => 'acides-amines',
        'why' => 'lysine is an exact token on the acides-amines rule, and the rayon now exists',
    ],
    [
        // The UNCLASSIFIED gate still needs a case, and this is the honest one: a multi-ingredient
        // formula whose category is a judgement nobody has made. It must stay staged rather than be
        // guessed into a rayon, because guessing a subcategory means guessing a permanent URL.
        'name' => 'NOW Foods Thyroid Energy — no rule matched, and none should',
        'row' => [
            'normalized_title' => 'NOW Foods Thyroid Energy – 90 gélules végétales',
            'external_url_name' => 'now-foods-thyroid-energy-90-veg-capsules',
        ],
        'reason' => PromotionGate::UNCLASSIFIED,
        'sub' => null,
        'why' => 'guessing a subcategory means guessing a URL and publishing it',
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
        'name' => 'a discontinued, brandless, unpriced, photoless, unclassifiable row',
        'row' => [
            'source_discontinued' => 1,
            'normalized_brand_key' => null,
            'source_brand_name' => null,
            'source_list_price' => null,
            'external_part_number' => null,
            'source_primary_image_index' => null,
            // Was L-Lysine, which stopped being unclassifiable when migration 000006 created
            // `acides-amines` — so this case silently became a FOUR-gate case while still asserting
            // five. Thyroid Energy is unclassifiable on purpose and stays that way: its rayon is a
            // judgement nobody has made, which is exactly what this slot needs.
            'normalized_title' => 'NOW Foods Thyroid Energy – 90 gélules végétales',
            'external_url_name' => 'now-foods-thyroid-energy-90-veg-capsules',
        ],
        'reason' => PromotionGate::DISCONTINUED,
        'failures' => 5,
        'why' => 'every gate is evaluated; `reason` is the first in report order, not the first coded',
    ],
];

$failed = 0;

/** One assertion outside the fixture table, printed in the same shape. */
function check(string $label, bool $ok, string $detail = ''): void
{
    global $failed;

    if (! $ok) {
        $failed++;
    }

    printf("  %s  %s\n", $ok ? 'PASS' : 'FAIL', $label);

    if (! $ok && $detail !== '') {
        printf("        %s\n", $detail);
    }
}

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
printf(
    "  require_image %s (config key %s)\n",
    $context['require_image'] ? 'true' : 'false',
    array_key_exists('require_image', $config['promotion']) ? 'present' : 'absent — defaulted to required',
);
echo '  '.count($subcategoryIds)." subcategories known (barres-proteinees deliberately absent)\n\n";

foreach ($cases as $case) {
    $verdict = PromotionGate::inspect(array_merge($base, $case['row']), $case['context'] ?? $context);

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

/*
|--------------------------------------------------------------------------
| The copied part-number pattern, held to the original
|--------------------------------------------------------------------------
| PromotionGate::PART_NUMBER is a COPY of the regex inside IHerbClient::imageUrl(), because the gate
| has to load in this file with no autoloader and importing IHerbClient would drag PoliteFetcher and
| the Log facade in with it. A copy is only safe while something proves the two still agree, and
| "the gate says promotable, the writer produces null" is precisely the failure the image gate was
| added to prevent — reintroduced one regex edit later.
|
| Each pair below is asserted three ways: the gate's answer, IHerbClient's own answer, and the answer
| a person would expect. All three must agree.
*/
echo "\nPromotionGate::hasCoverImage vs IHerbClient::imageUrl — the copied pattern\n\n";

/** @var list<array{0:?string,1:?int,2:bool,3:string}> [part number, primary index, has image, why] */
$partNumbers = [
    ['OPN-02385', 0, true, 'the shape IHerbClient documents: brand letters, hyphen, asset id'],
    ['now-01234', 3, true, 'already lower case, and an index that is not the first image'],
    ['NOW01234', 1, true, 'no hyphen at all — the hyphen is optional in the pattern'],
    ['OPN-02385-XL', 0, false, 'a second hyphen; \\w matches no hyphen, so nothing can parse it'],
    ['12345', 0, false, 'no brand letters at the front'],
    ['A-1', 0, false, 'one leading letter where the pattern needs at least two'],
    ['', 0, false, 'no part number at all'],
    [null, 0, false, 'a null part number, which is what the column holds when the payload had none'],
    ['OPN-02385', null, false, 'a perfectly good part number and no primary image index'],
];

foreach ($partNumbers as [$part, $index, $expected, $why]) {
    $row = ['external_part_number' => $part, 'source_primary_image_index' => $index];

    $gate = PromotionGate::hasCoverImage($row);
    // Exactly the expression CatalogIHerbPromote::coverUrl() evaluates, cast included.
    $client = IHerbClient::imageUrl($part, $index === null ? null : (int) $index, 'l') !== null;

    check(
        sprintf('%-14s index %-4s → %s', $part === null ? '(null)' : '"'.$part.'"', $index === null ? '(null)' : (string) $index, $expected ? 'image' : 'no image'),
        $gate === $client && $gate === $expected,
        sprintf('gate says %s, IHerbClient says %s, expected %s — %s', $gate ? 'image' : 'no image', $client ? 'image' : 'no image', $expected ? 'image' : 'no image', $why),
    );
}

/*
|--------------------------------------------------------------------------
| CatalogIHerbPromote: two things that are true only because of WHERE they are written
|--------------------------------------------------------------------------
| Neither of the defects below is a value any function returns. Both are facts about the position of
| a statement relative to a database COMMIT, in a class that extends Illuminate\Console\Command and
| therefore cannot be loaded by this file at all. So the source is read and the ORDER is asserted.
|
| This is a blunt instrument and it is used deliberately: the alternative is no check at all on two
| defects whose symptoms are (a) product URLs that differ between two runs over the same catalogue
| and (b) a URL submitted to IndexNow for a product that was rolled back. Neither shows up in a type
| check, neither reproduces locally without a database, and both are permanent once shipped —
| addresses and index submissions do not get taken back.
*/
echo "\nCatalogIHerbPromote — ordering invariants, asserted against the source\n\n";

$commandPath = __DIR__.'/../../app/Console/Commands/CatalogIHerbPromote.php';
$command = (string) file_get_contents($commandPath);

/**
 * The text of one method, from its parameter list to whatever ends it.
 *
 * A method ends at the next thing written at class-member indentation — another method or another
 * method's docblock. Everything inside a body is indented deeper than four spaces, so this needs no
 * brace counting.
 */
function methodSource(string $source, string $marker): string
{
    $start = strpos($source, $marker);

    if ($start === false) {
        return '';
    }

    $rest = substr($source, $start + strlen($marker));

    return preg_match('~\n    (?:/\*\*|(?:private|protected|public) (?:static )?function )~', $rest, $m, PREG_OFFSET_CAPTURE) === 1
        ? substr($rest, 0, (int) $m[0][1])
        : $rest;
}

$promote = methodSource($command, 'function promote(');
$uniqueSlug = methodSource($command, 'function uniqueSlug(');
$claimSlug = methodSource($command, 'function claimSlug(');
$createProduct = methodSource($command, 'function createProduct(');
$publish = methodSource($command, 'function publish(');

check(
    'the five methods under test were all found in the source',
    $promote !== '' && $uniqueSlug !== '' && $claimSlug !== '' && $createProduct !== '' && $publish !== '',
    'a rename broke this file\'s markers — fix the markers, do not delete the checks',
);

// ── DEFECT: the slug was claimed before the product existed, and never released ──────────
// uniqueSlug() used to record `$this->claimedSlugs[$candidate] = true` and return. Everything
// between that and the COMMIT can still fail — the in-transaction re-read can find the row taken by
// a concurrent run, Brand::create() can hit 1364 on the legacy `brands` table, the INSERT can hit
// 1406 — and the claim was never given back. The next row normalising to the same base then skipped
// a slug nothing owns and took `{base}-{externalId}` instead. Product URLs are permanent, so that
// makes an address depend on whether an unrelated row failed earlier in the same wave.
$writesClaim = '~\$this->claimedSlugs\[[^\]]*\]\s*=~';

check(
    'uniqueSlug() reserves nothing — it only reads the claimed set',
    preg_match_all($writesClaim, $uniqueSlug) === 0,
    'uniqueSlug() writes into $claimedSlugs again; a row that then fails to commit burns that slug for the run',
);

check(
    'claimSlug() is the only place that records a claim',
    preg_match_all($writesClaim, $command) === 1 && preg_match_all($writesClaim, $claimSlug) === 1,
    'there is more than one writer into $claimedSlugs, so "claimed" no longer means "committed"',
);

$dryRunAt = strpos($promote, 'if ($dryRun) {');
$firstClaimAt = strpos($promote, '$this->claimSlug($slug);');
$createAt = strpos($promote, '$product = $this->createProduct(');
$nullGuardAt = strpos($promote, 'if ($product === null) {');
$lastClaimAt = strrpos($promote, '$this->claimSlug($slug);');
// No closing paren in the marker: publish() grew the index mode and the wave's tally as arguments,
// and a marker that pinned the OLD arity made this check report a defect that was actually a
// signature change. It pins what the check is about — the call site, and where it sits.
$publishAt = strpos($promote, '$this->publish($product, $row,');

check(
    'the dry run claims immediately — nothing will ever be inserted to be the authority',
    $dryRunAt !== false && $firstClaimAt !== false && $dryRunAt < $firstClaimAt && $firstClaimAt < $createAt,
    'without a claim in the dry-run branch, two rows sharing a base are both printed as taking it',
);

check(
    'the real run claims only AFTER createProduct() returned a product',
    $createAt !== false && $nullGuardAt !== false && $lastClaimAt !== false
        && $createAt < $nullGuardAt && $nullGuardAt < $lastClaimAt,
    'the claim is recorded before the commit is known to have happened, so a failed row still burns its slug',
);

// ── DEFECT: SeoNotifier was scheduled from inside the promotion transaction ──────────────
// Product::create() fires ProductSeoObserver::saved, which — when `publier` is true — registers an
// afterResponse callback revalidating the product path and submitting the URL to IndexNow. Under
// `php artisan` that callback runs at command termination, whether or not the transaction it was
// scheduled from committed. Creating the product already published therefore meant a rollback left
// no product and still advertised its URL. The fix is structural: the transaction is never told
// whether the wave is publishing, so it cannot make `publier` true.
check(
    'createProduct() cannot know whether the wave is publishing',
    $createProduct !== '' && ! str_contains($createProduct, '$publish'),
    'the publish flag is back inside the transaction — a rolled-back product can be submitted to IndexNow',
);

check(
    'the product is created unpublished and unindexable, whatever --publish says',
    str_contains($createProduct, "'publier' => false,") && str_contains($createProduct, "'seo_robots_index' => false,"),
    'a product created with publier=1 fires SeoNotifier from inside the open transaction',
);

check(
    'publication is a separate save, made after the transaction returned',
    $publishAt !== false && $nullGuardAt !== false && $nullGuardAt < $publishAt
        && ! str_contains($createProduct, '$this->publish('),
    'the publish save is inside the transaction again, which is the whole defect',
);

check(
    'the publish save sets publier so ProductSeoObserver::saved actually fires',
    str_contains($publish, '$product->publier = true;')
        && str_contains($publish, '$product->save();'),
    'deferring the notification is only correct if the deferred save still triggers it',
);

/*
|--------------------------------------------------------------------------
| SECTION 4 — the indexing gate
|--------------------------------------------------------------------------
| `publier` says the product is on the storefront. `seo_robots_index` says its URL is offered to
| Google. Those were the same statement — publish() wrote `$product->seo_robots_index = true` with no
| way to say otherwise — while THREE files described (1, 0) as a state this command produces:
| CatalogIHerbPromote's own docblock, ImportedProductContent's ("a promotion path that wants pages
| indexed should treat a short result as promote with seo_robots_index = 0") and
| frontend/src/util/sitemapData.ts ("the exact state CatalogIHerbPromote creates").
|
| The decision now lives in PromotionGate::indexable(), which is a pure function over two integers
| and a mode precisely so this file can execute it. What follows asserts, in order:
|
|   · the gate's NUMBER is one number in three files, not three numbers that happen to match today;
|   · its verdict on a THIN body and a THICK one, at the boundary from both sides, with both
|     operator overrides and with the gate disabled;
|   · the same verdict on a body ImportedProductContent actually composes, rather than on an
|     invented integer — including that `word_count` and countWords() agree, which is what lets
|     CatalogIHerbPromote store one and measure the other;
|   · that the command still WIRES all of that to the column, from its source.
*/
echo "\nPromotionGate::indexable — the body gate, on a thin body and a thick one\n\n";

/*
 * THE GATE IS frontend/scripts/audit-pdp-content.mjs MIN_NEW_PRODUCT_WORDS, READ FROM THAT FILE.
 *
 * Three places state this number: the .mjs constant (the audit that will FAIL these pages),
 * config/catalog.php `promotion.min_body_words` (what production runs on) and
 * PromotionGate::DEFAULT_MIN_BODY_WORDS (what a deployment whose config predates the key gets).
 * Copying it here would let this harness pass while the shipped configuration published pages the
 * repo's own audit then fails, which is the same reason every threshold above is required from
 * config rather than restated.
 */
$auditPath = __DIR__.'/../../../frontend/scripts/audit-pdp-content.mjs';
$auditSource = is_file($auditPath) ? (string) file_get_contents($auditPath) : '';
$auditGate = preg_match('~const\s+MIN_NEW_PRODUCT_WORDS\s*=\s*(\d+)~', $auditSource, $m) === 1
    ? (int) $m[1]
    : null;

check(
    'frontend/scripts/audit-pdp-content.mjs still declares MIN_NEW_PRODUCT_WORDS',
    $auditGate !== null,
    'the audit constant could not be read from '.$auditPath.' — the gate below is then unanchored, '
        .'and "250" in config becomes a number nobody can point at',
);

$configuredGate = (int) ($config['promotion']['min_body_words'] ?? -1);

check(
    sprintf(
        'the gate is ONE number in three files (audit %s, config %d, PromotionGate %d)',
        $auditGate === null ? '?' : (string) $auditGate,
        $configuredGate,
        PromotionGate::DEFAULT_MIN_BODY_WORDS,
    ),
    $auditGate !== null
        && $configuredGate === $auditGate
        && PromotionGate::DEFAULT_MIN_BODY_WORDS === $auditGate,
    'config/catalog.php and audit-pdp-content.mjs disagree about the bar, so promotion will publish '
        .'as indexable exactly the pages the content audit fails on its next run',
);

check(
    'contextFrom() carries the gate, so the command and the report read one builder',
    ($context['min_body_words'] ?? null) === $configuredGate,
    'min_body_words is missing from the gate context; three call sites will each do their own config() lookup',
);

/**
 * @var list<array{0:int,1:int,2:string,3:bool,4:string}> [body words, gate, mode, indexable, why]
 */
$indexCases = [
    [
        0, 250, PromotionGate::INDEX_MEASURED, false,
        'compose() declined and the spec-block fallback was empty too — there is no body to index',
    ],
    [
        96, 250, PromotionGate::INDEX_MEASURED, false,
        'THE THIN BODY: what this pipeline actually composes today. It publishes, noindexed — visible '
            .'and sellable, out of the sitemap. This is the whole state the three docblocks promised',
    ],
    [
        249, 250, PromotionGate::INDEX_MEASURED, false,
        'the boundary from below: audit-pdp-content.mjs fails a new product at bodyWords < 250, so 249 '
            .'indexed is a page the repo fails itself on the next audit run',
    ],
    [
        250, 250, PromotionGate::INDEX_MEASURED, true,
        'the boundary from above, and the reason the comparison is >= and not >: the audit ACCEPTS 250, '
            .'so holding it back would be a second, stricter bar nobody wrote down',
    ],
    [
        251, 250, PromotionGate::INDEX_MEASURED, true,
        'THE THICK BODY: real copy was written into description_fr, so the URL is offered to Google',
    ],
    [
        4000, 250, PromotionGate::INDEX_MEASURED, true,
        'a hand-written legacy-length body clears it and keeps clearing it',
    ],

    // ── The two overrides. Each must beat the measurement, in its own direction, and only there. ──
    [
        96, 250, PromotionGate::INDEX_FORCED, true,
        '--force-index is the operator overruling the measurement upward; if it consulted the body it '
            .'would not be an override',
    ],
    [
        0, 250, PromotionGate::INDEX_FORCED, true,
        '--force-index on a bodyless product too — the flag means "do not measure", and a half-honoured '
            .'override is worse than none because the summary would still report it as honoured',
    ],
    [
        4000, 250, PromotionGate::INDEX_SUPPRESSED, false,
        '--force-noindex must hold back a body that clears the gate, or "publish this wave noindexed" '
            .'quietly means "publish most of it noindexed"',
    ],
    [
        96, 250, PromotionGate::INDEX_SUPPRESSED, false,
        'and it agrees with the measurement where the measurement already said no',
    ],

    // ── The gate turned off. config/catalog.php documents 0 as "everything published is indexable". ──
    [
        0, 0, PromotionGate::INDEX_MEASURED, true,
        'min_body_words = 0 disables the gate, exactly as config/catalog.php says it does',
    ],
    [
        96, -1, PromotionGate::INDEX_MEASURED, true,
        'a negative gate is off, not inverted — it must never mean "index only what is SHORTER than"',
    ],
];

foreach ($indexCases as [$words, $min, $mode, $expected, $why]) {
    $got = PromotionGate::indexable($words, $min, $mode);

    check(
        sprintf(
            '%5d word(s), gate %-4d, %-10s → %s',
            $words,
            $min,
            $mode,
            $expected ? 'INDEXABLE' : 'noindexed',
        ),
        $got === $expected,
        sprintf('got %s, expected %s — %s', $got ? 'indexable' : 'noindexed', $expected ? 'indexable' : 'noindexed', $why),
    );
}

/*
|--------------------------------------------------------------------------
| The same verdict, on a body this pipeline really composes
|--------------------------------------------------------------------------
| The integers above pin the comparison. They cannot pin the thing that actually decides ~13,000
| pages: what ImportedProductContent produces from the columns we hold, and whether the number it
| REPORTS is the number a reader would count. CatalogIHerbPromote stores compose()'s `word_count` on
| the staging row and later measures the stored body with countWords() — bodyWords() says outright
| that "at promotion time the two numbers are the same string measured twice". If they are not, a
| product can be held back by a measurement of a string it is not serving.
*/
echo "\nImportedProductContent — the composed body, measured and gated\n\n";

$composed = ImportedProductContent::compose([
    // The base fixture above, as the promote path would hand it over: normalized title, brand,
    // resolved rayon, resolved parent category, pack from the staging columns.
    'name' => $base['normalized_title'],
    'brand' => $base['source_brand_name'],
    'sub_category_slug' => 'whey-proteine',
    'sub_category_label' => 'Whey protéine',
    'category_label' => 'Protéines',
    'pack_size' => 2.27,
    'pack_unit' => 'kg',
    'flavour' => 'Double Rich Chocolate',
    'identity' => $base['external_part_number'],
]);

$composedBody = (string) ($composed['description_fr'] ?? '');
$composedWords = (int) $composed['word_count'];

check(
    'compose() produced a body for a complete, promotable row',
    $composedBody !== '' && $composedWords > 0,
    'the fact set of the one row that must always promote produced no copy at all',
);

check(
    sprintf('compose() reports %d words and countWords() counts the same', $composedWords),
    $composedBody !== '' && ImportedProductContent::countWords($composedBody) === $composedWords,
    sprintf(
        'word_count says %d, countWords() on the stored body says %d — CatalogIHerbPromote persists the '
            .'first and measures the second, so the staged number would describe a different string',
        $composedWords,
        ImportedProductContent::countWords($composedBody),
    ),
);

check(
    sprintf(
        'the REAL composed body (%d words) is below the %d-word gate → published NOINDEXED',
        $composedWords,
        $configuredGate,
    ),
    PromotionGate::indexable($composedWords, $configuredGate) === false,
    'this pipeline composes from brand, rayon, pack and flavour and nothing else; if that now clears '
        .'250 words either the gate moved or the composer started saying more than it knows. Both are '
        .'changes to make deliberately, and neither should be discovered in production',
);

check(
    'the same body with --force-index would be INDEXED, and that is the only way it can be',
    PromotionGate::indexable($composedWords, $configuredGate, PromotionGate::INDEX_FORCED) === true,
    'the override does not reach the real composed body, so the escape hatch the summary advertises does not exist',
);

/*
 * A thick body, measured rather than asserted: real copy written into description_fr by whoever
 * reviews the product. This is the ratchet bodyWords() describes — the gate measures the LIVE body,
 * so improving one product's copy indexes that one product on the next wave.
 */
$thickBody = '<p>'.implode(' ', array_fill(0, 300, 'référencé')).'</p>';
$thickWords = ImportedProductContent::countWords($thickBody);

check(
    sprintf('a reviewed body of %d words clears the gate → published INDEXABLE', $thickWords),
    $thickWords >= $configuredGate && PromotionGate::indexable($thickWords, $configuredGate) === true,
    'a product whose copy has been written must become indexable without --force-index, or the gate is '
        .'a wall rather than a ratchet and nobody can ever earn their way past it',
);

/*
|--------------------------------------------------------------------------
| The command still wires the decision to the column
|--------------------------------------------------------------------------
| indexable() being right is worth nothing if publish() goes back to writing a literal. This is the
| exact defect that shipped, so it is asserted against the source the same way the ordering
| invariants above are.
*/
echo "\nCatalogIHerbPromote — the gate is wired to the column, asserted against the source\n\n";

$indexVerdict = methodSource($command, 'function indexVerdict(');
$bodyWords = methodSource($command, 'function bodyWords(');
$indexMode = methodSource($command, 'function indexMode(');
$reportIndexing = methodSource($command, 'function reportIndexing(');

check(
    'the four gate methods were all found in the source',
    $indexVerdict !== '' && $bodyWords !== '' && $indexMode !== '' && $reportIndexing !== '',
    'a rename broke this file\'s markers — fix the markers, do not delete the checks',
);

check(
    'publish() writes the VERDICT into seo_robots_index, never a literal',
    str_contains($publish, '$product->seo_robots_index = $indexable;')
        && preg_match('~seo_robots_index\s*=\s*(?:true|1)\b~', $publish) !== 1,
    'THE DEFECT IS BACK: publish() hardcodes the robots flag again, so publier=1 + seo_robots_index=0 '
        .'is once more a state three docblocks describe and no code can produce',
);

check(
    'the flag publish() writes comes from PromotionGate, not from a second copy of the rule',
    str_contains($indexVerdict, '$this->bodyWords($product, $row)')
        && str_contains($command, 'PromotionGate::indexable('),
    'the command decides indexability by itself again; the rule is then in a class no harness can load',
);

check(
    'the measured gate is the DEFAULT — both overrides have to be typed',
    str_contains($indexMode, 'PromotionGate::INDEX_MEASURED')
        && str_contains($indexMode, 'PromotionGate::INDEX_FORCED')
        && str_contains($indexMode, 'PromotionGate::INDEX_SUPPRESSED')
        && str_contains($command, '{--force-index :')
        && str_contains($command, '{--force-noindex :'),
    'an override that is reachable without being typed is a default, and the failure direction of THIS '
        .'default is thousands of thin pages submitted for indexing',
);

check(
    '--force-index and --force-noindex together are refused, not silently ordered',
    str_contains($indexMode, 'contradict each other'),
    'passing both would resolve by whichever branch is written first, which is a coin flip over the sitemap',
);

check(
    'createProduct() persists the composed word count instead of discarding it',
    str_contains($createProduct, "'composed_word_count' =>")
        && str_contains($createProduct, "\$body['word_count']"),
    'the number compose() computes for exactly this comparison is thrown away again, and the publish '
        .'step has nothing to measure without recomposing',
);

/*
 * ── THIS CHECK USED TO NAME ImportedProductContent::countWords() DIRECTLY ─────────────────
 * It asserted that bodyWords() called that counter on `$product->description_fr`. bodyWords() now
 * calls ImportedSourceContent::renderedWordCount(), which calls that same counter on that same
 * column and ADDS the transcribed suggested-use, ingredients and warnings blocks — which live on
 * the staging row and render as their own sections on both product routes.
 *
 * The old expectation was stale rather than the change wrong, and the reason is the property the
 * check was protecting in the first place: the gate must measure THE PAGE THAT RENDERS. Once the
 * page grew three sections that are not in `description_fr`, a bodyWords() that still measured only
 * that column was measuring a page that does not exist — it would hold a product at
 * seo_robots_index = 0 for being thin while a customer read three more paragraphs of it.
 *
 * So the check is widened rather than relaxed: it still demands the live body and still demands the
 * staged fallback, and it now additionally demands that the staging row reach the measurement at
 * all. Asserting `ImportedProductContent::countWords(` here again would be asserting the OLD
 * behaviour, which is exactly what a stale expectation does.
 */
check(
    'bodyWords() prefers the LIVE product body and falls back to the staged count',
    str_contains($bodyWords, '$product->description_fr')
        && str_contains($bodyWords, '$row->composed_word_count')
        && str_contains($bodyWords, 'ImportedSourceContent::renderedWordCount('),
    'trusting the staged number alone means copy written in the admin never earns the product an index',
);

check(
    'bodyWords() measures the transcribed sections too, not just description_fr',
    str_contains($bodyWords, '$row->getAttributes()'),
    'the suggested-use, ingredients and warnings blocks render on BOTH product routes and are stored '
        .'on the staging row, not in description_fr. A gate that cannot see them measures a page that '
        .'is not the page, and holds back exactly the products the content pass was built to publish',
);

/*
 * The pre-filter that decides which held-back products are even SCANNED has to move with the
 * measurement, and this is the one place where getting it wrong is silent.
 *
 * reindexPublished() cannot pull every body out of the database on every wave, so it pre-filters on
 * character length — a word needs at least one character, so fewer than N characters cannot be N
 * words. That is safe only while it bounds the SAME total bodyWords() computes. The moment the count
 * grew past description_fr, a bound over description_fr alone stopped being a lower bound: a product
 * with a 60-character description and 900 words of transcribed warnings clears the gate and would
 * never have been looked at. The ratchet would have refused, silently and for ever, to index
 * precisely the products this content pass exists to produce.
 */
$lowerBound = methodSource($command, 'function bodyLengthLowerBoundSql(');
// Read here rather than reusing the ratchet section's $reindex, which is not extracted until much
// further down the file — this check belongs beside the measurement it is about, not beside the
// method it constrains.
$reindexSource = methodSource($command, 'function reindexPublished(');

check(
    'the re-index pre-filter bounds the SAME total bodyWords() measures',
    str_contains($reindexSource, '$this->bodyLengthLowerBoundSql()')
        && str_contains($lowerBound, 'products.description_fr')
        && str_contains($lowerBound, 'ImportedSourceContent::SECTION_COLUMNS'),
    'a pre-filter that excludes a product which would have passed is not an optimisation, it is a '
        .'silent refusal — and it must be derived from the section list rather than typed out, or the '
        .'next section added is one the ratchet cannot see',
);

check(
    'the wave reports BOTH counts, and the tally is fed only after a successful save',
    str_contains($reportIndexing, 'INDEXABLE') && str_contains($reportIndexing, 'NOINDEXED')
        && str_contains($publish, '$this->recordIndexVerdict($indexing, $verdict);')
        && strpos($publish, '$product->save();') < strpos($publish, '$this->recordIndexVerdict('),
    'a summary that counts attempts reports N products in a state that N rows are not in',
);

/*
|--------------------------------------------------------------------------
| The pre-flight arithmetic, held to SeoNotifier's own source
|--------------------------------------------------------------------------
| The warning prints a request count an operator plans a maintenance window around. It used to
| promise "three HTTP calls apiece … ~limit*3" and that stopped being true when SeoNotifier learned
| to coalesce the sitemap bust: send() makes TWO per-product posts, and the third goes through
| bustSitemapCache(), which returns without sending if this process sent one inside the last 60s.
| Asserting the multiplier against the notifier's source is what stops a third per-product call being
| added there while this number keeps saying two.
*/
echo "\nCatalogIHerbPromote's pre-flight count vs SeoNotifier::send() — the multiplier\n\n";

$notifierPath = __DIR__.'/../../app/Services/Seo/SeoNotifier.php';
$notifier = is_file($notifierPath) ? (string) file_get_contents($notifierPath) : '';
$send = methodSource($notifier, 'function send(');

check(
    'SeoNotifier::send() was found in the source',
    $send !== '',
    'the notifier could not be read from '.$notifierPath.', so the multiplier below is unanchored',
);

$perProductPosts = preg_match_all('~Http::~', $send);

check(
    sprintf('send() makes %d per-product HTTP call(s), and the bust is not one of them', $perProductPosts),
    $perProductPosts === 2 && str_contains($send, 'self::bustSitemapCache('),
    'send() no longer makes exactly two direct calls per product; the warning\'s multiplier is now wrong '
        .'in whichever direction that changed',
);

check(
    'the sitemap bust really is coalesced, so it is a cost of the wave and not of the product',
    str_contains($notifier, 'SITEMAP_BUST_WINDOW_SECONDS')
        && str_contains(methodSource($notifier, 'function bustSitemapCache('), 'self::$sitemapBustAt'),
    'bustSitemapCache() sends unconditionally again — then it IS a third per-product call and the '
        .'warning is under-counting by one call per product',
);

/*
 * Scoped to the WARNING ITSELF and not to promote(), deliberately. The method's comment quotes the
 * old promise ("three HTTP calls apiece … ~limit*3 requests") to explain what was wrong with it, and
 * a check that forbade those words anywhere in the method would forbid the explanation along with
 * the defect. What must be true is narrower: the string an operator READS says two.
 */
$preflightAt = strpos($promote, 'if ($publish && ! $dryRun) {');
$preflightEnd = $preflightAt === false ? false : strpos($promote, "\n        }", $preflightAt);
$preflight = $preflightAt === false || $preflightEnd === false
    ? ''
    : substr($promote, $preflightAt, $preflightEnd - $preflightAt);

check(
    'the pre-flight warning block was found',
    $preflight !== '',
    'the `if ($publish && ! $dryRun)` warning is gone or was reshaped — the operator now plans a '
        .'maintenance window with no number at all',
);

check(
    'the warning multiplies the wave by 2, and promises no third per-product call',
    str_contains($preflight, 'number_format($limit * 2)')
        && ! str_contains($preflight, '$limit * 3')
        && stripos($preflight, 'three') === false
        && str_contains($preflight, 'bustSitemapCache'),
    sprintf(
        'the pre-flight warning prints a request count SeoNotifier does not make. send() issues %d '
            .'per-product call(s); the warning must multiply by that and name bustSitemapCache() as '
            .'the reason the third one is per-wave',
        $perProductPosts,
    ),
);

/*
|--------------------------------------------------------------------------
| The two channels must agree about what is indexable
|--------------------------------------------------------------------------
| The sitemap channel got a robots filter and the IndexNow channel did not. sitemapData.ts refuses
| to submit a URL whose product carries seo_robots_index = 0 — and ApisController::PRODUCT_LISTING
| was extended with that column specifically so it could — while ProductSeoObserver::saved gated on
| `publier` alone and SeoNotifier::send() posted every published product's URL to /api/indexnow
| unconditionally. So the exact state this command is built to produce, (publier=1,
| seo_robots_index=0), kept a URL OUT of the sitemap and simultaneously asked Bing, Yandex, Seznam,
| Naver and Yep to come and crawl it — where they find <meta robots="noindex">. At the planned
| ~19,000 products that is a standing instruction to five engines to crawl pages we told them not to
| index.
|
| Asserted against the source, like the ordering invariants above, because "which call sits inside
| which `if`" is not a value any function returns.
*/
echo "\nSeoNotifier — IndexNow may only be told about genuinely indexable URLs\n\n";

$shouldSubmit = methodSource($notifier, 'function shouldSubmitToIndexNow(');
$buildContext = methodSource($notifier, 'function buildContext(');

check(
    'SeoNotifier::shouldSubmitToIndexNow() exists',
    $shouldSubmit !== '',
    'the indexability gate is gone; every published product URL is being pushed to IndexNow again, '
        .'including the ones rendering <meta robots="noindex">',
);

check(
    'the gate reads effective_seo_robots_index, the same accessor the PDP renders from',
    str_contains($shouldSubmit, 'effective_seo_robots_index'),
    'reading the raw column instead would treat NULL (never set, therefore indexable) as noindex, or '
        .'let what is submitted disagree with what the page renders',
);

check(
    'the gate also refuses the /shop/ fallback path, which the storefront 301s',
    str_contains($shouldSubmit, "'/shop/'") || str_contains($shouldSubmit, '"/shop/"'),
    'productPath() returns /shop/{slug} when no subcategory resolves; submitting it asks an engine to '
        .'crawl a redirect — the same URL sitemapData.ts deliberately drops',
);

check(
    'buildContext() carries the decision into the context send() reads',
    str_contains($buildContext, 'shouldSubmitToIndexNow(') && str_contains($buildContext, "'submit'"),
    'send() cannot gate on a flag buildContext() does not compute',
);

/*
 * The revalidate call must stay UNCONDITIONAL and the IndexNow call must be the guarded one. A
 * noindexed product is still on the storefront and still sellable, so its cached page must follow
 * its price and stock exactly like any other; it is only the crawl invitation that is wrong.
 * Getting these two the wrong way round would be a stock bug wearing an SEO fix's clothes.
 */
$indexNowAt = strpos($send, '/api/indexnow');
$revalidateAt = strpos($send, '/api/revalidate');
$submitGuardAt = strpos($send, "if (\$ctx['submit'])");

check(
    'send() guards the IndexNow post behind the submit flag',
    $submitGuardAt !== false && $indexNowAt !== false && $submitGuardAt < $indexNowAt,
    'the IndexNow post is not inside the indexability guard',
);

check(
    'send() does NOT guard the page revalidation — a noindexed product still sells',
    $revalidateAt !== false && ($submitGuardAt === false || $revalidateAt < $submitGuardAt),
    'the revalidate call moved inside the indexability guard, so a held-back product would keep '
        .'serving a stale price and a stale stock chip',
);

$observerPath = __DIR__.'/../../app/Observers/ProductSeoObserver.php';
$observer = is_file($observerPath) ? (string) file_get_contents($observerPath) : '';
$savedSource = methodSource($observer, 'function saved(');

check(
    'ProductSeoObserver::saved() fires on seo_robots_index, so the noindex→indexable flip notifies',
    str_contains($savedSource, "'seo_robots_index'"),
    'flipping the robots flag would change the sitemap and the rendered <meta robots> and tell nobody: '
        .'the storefront would keep serving the cached noindex HTML and the sitemap its stale copy for '
        .'up to an hour. It is also the only thing that makes catalog:iherb:promote --reindex visible.',
);

check(
    'ProductSeoObserver::saved() still gates on publier — an unpublished product has no live page',
    str_contains($savedSource, '! $product->publier'),
    'the publier gate is what stops drafts revalidating and submitting URLs that are not on the site',
);

/*
|--------------------------------------------------------------------------
| The ratchet has to exist, and the command has to describe the one that exists
|--------------------------------------------------------------------------
| reportIndexing() told the operator: "Write real copy into description_fr and the next --publish
| wave indexes it — the gate measures the LIVE body." Nothing could do that. publishBacklog()
| selects `publier = 0`; publish() is only reached for a first publication; and seo_robots_index is
| written nowhere else in filament/app but the Filament toggle. A product published at (1, 0) — every
| imported product until somebody writes copy — could never become indexable by any automatic route,
| so following the printed instruction correctly produced nothing.
*/
echo "\nCatalogIHerbPromote — the noindex→indexable ratchet\n\n";

$reindex = methodSource($command, 'function reindexPublished(');

check(
    'reindexPublished() exists — the pass that re-measures an ALREADY-published product',
    $reindex !== '',
    'without it, publish() and publishBacklog() are the only writers of seo_robots_index and neither '
        .'can ever reach a product that is already published',
);

check(
    'it selects publier=1 AND seo_robots_index=0 — the exact pair publish() writes below the gate',
    str_contains($reindex, "where('publier', 1)") && str_contains($reindex, "where('seo_robots_index', 0)"),
    'the selection no longer names the held-back state',
);

check(
    'it treats a NULL robots column as ALREADY indexable, not as a candidate',
    ! preg_match("~whereNull\('seo_robots_index'\)~", $reindex),
    'on an already-published product NULL means "never set", which '
        .'Product::getEffectiveSeoRobotsIndexAttribute() reads as indexable — such a product is already '
        .'in the sitemap and re-saving it would fire a pointless notification for every one of them',
);

check(
    'it can only ever reach IMPORTED products, so the 49 legacy admin-noindexed products are safe',
    str_contains($reindex, 'ExternalCatalogProduct::query()') && str_contains($reindex, 'IHerbClient::PROVIDER'),
    'selection must start at external_catalog_products. The 309 legacy hand-made products have no '
        .'staging row, which is what makes them unreachable by construction rather than by a filter '
        .'somebody could delete — 49 of them are deliberately noindexed by a human today',
);

check(
    'a product that is still short is NOT saved, so a no-op pass costs no requests and no wave',
    str_contains($reindex, "if (! \$verdict['applied'])") && str_contains($reindex, 'continue;'),
    'measuring must be free; only an actual flip may cost a save, two HTTP calls and a slot in the wave',
);

/*
 * Anchored on the CALLS, not on the names. Both methods are also named in promote()'s comments —
 * which explain why the ordering matters — and a check that read those would be asserting the
 * position of the explanation rather than the position of the code.
 */
$reindexAt = strpos($promote, '$this->reindexPublished(');
$backlogAt = strpos($promote, '$this->publishBacklog(');

check(
    'promote() runs the re-measure pass BEFORE the backlog',
    $reindexAt !== false && $backlogAt !== false && $reindexAt < $backlogAt,
    'given a bounded wave, a product that already exists and has just been given real copy is a page '
        .'that is ready now, while a backlog product is one more thin page. Publishing first would '
        .'spend the wave on the thin ones',
);

$reportIndexingSource = methodSource($command, 'function reportIndexing(');

/*
 * Comments are stripped before the negative half, for the same reason the pre-flight check above is
 * scoped to the warning string: the method explains the defect by quoting the sentence it used to
 * print, and a check that forbade those words anywhere in the method would forbid the explanation
 * along with the defect. What must be true is narrower — the string an operator READS names a
 * command that exists.
 */
$reportIndexingCode = preg_replace(['~/\*[\s\S]*?\*/~', '~(^|[^:])//.*$~m'], ['', '$1'], $reportIndexingSource);

check(
    'the instruction printed to the operator names a command that can actually do it',
    str_contains($reportIndexingCode, '--reindex')
        && ! str_contains($reportIndexingCode, 'next --publish wave indexes it'),
    'reportIndexing() is printing the old unreachable promise. Whatever it tells somebody to do has to '
        .'be something this command can do',
);

check(
    'the --reindex flag is declared on the command signature',
    str_contains($command, '{--reindex :'),
    'the summary points at a flag that does not exist',
);

echo "\n".($failed === 0 ? 'ALL PASS' : $failed.' FAILED')."\n\n";

exit($failed === 0 ? 0 : 1);
