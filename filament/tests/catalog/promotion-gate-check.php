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
 * ── THREE SECTIONS, BECAUSE THREE DIFFERENT THINGS CAN BE WRONG ───────────────────────────
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
 *    IndexNow" being a caught regression and being a live 404 in Bing.
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

use App\Services\Catalog\IHerb\IHerbClient;
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
$publishAt = strpos($promote, '$this->publish($product, $row)');

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
        && str_contains($publish, '$product->seo_robots_index = true;')
        && str_contains($publish, '$product->save();'),
    'deferring the notification is only correct if the deferred save still triggers it',
);

echo "\n".($failed === 0 ? 'ALL PASS' : $failed.' FAILED')."\n\n";

exit($failed === 0 ? 0 : 1);
