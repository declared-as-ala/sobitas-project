<?php

/**
 * Standalone check for App\Services\Catalog\ImportedProductContent — no vendor/, no DB, no network.
 *
 *     php filament/tests/catalog/imported-product-content-check.php
 *
 * ── WHAT THIS FILE IS DEFENDING ───────────────────────────────────────────────────────────
 * The composer writes the BODY of up to 20,000 product pages. The failure that matters is not a
 * crash — it is a sentence that is subtly untrue, or 20,000 bodies that turn out to be one body with
 * a noun swapped. Neither shows up in a type check and neither shows up in a word count, so both are
 * asserted here by name:
 *
 *   · no frame may state a health claim, a dosage, or a hardcoded figure — checked against
 *     ProductContentGenerator's OWN exported patterns, not a copy of them, so the two writers into
 *     `description_fr` cannot drift apart on what counts as a violation
 *   · a per-unit dose (mg/µg) reaching `pack_unit` must produce NO conditionnement sentence. Reading
 *     "500 mg" as a pack size turns a 180-capsule bottle into a 500 mg product, and it is the same
 *     trap IHerbNormalizer::packSize already documents one layer upstream
 *   · a product with no brand must produce NULLS, not a sentence with a hole in it
 *   · the brand must be stated ONCE. `normalized_title` already leads with the brand, so a frame
 *     built on the full title renders "… Gold Standard 100% Whey, signé Optimum Nutrition"
 *   · the same input must produce the same output, forever. This copy is written to a database
 *     column and then indexed; a composer that reshuffles its own phrasing on re-run would rewrite
 *     live pages for no reason
 *   · title 30-60 chars, meta description at most 160 — the windows frontend/scripts/verify-seo.js
 *     already enforces on the rendered page
 *
 * ── WHY IT REQUIRES ProductContentGenerator DIRECTLY ──────────────────────────────────────
 * That file imports Illuminate facades, but only as `use` aliases — nothing in it is resolved at
 * parse time, and claimPatterns()/dosagePatterns() only return const arrays. So it loads under a
 * bare `php` with no autoloader, which is exactly what makes "use the same patterns, do not copy
 * them" possible in a harness that has no framework.
 */

require __DIR__.'/../../app/Services/Content/ProductContentGenerator.php';
require __DIR__.'/../../app/Services/Catalog/ImportedProductContent.php';

use App\Services\Catalog\ImportedProductContent;

if (! function_exists('env')) {
    function env(string $key, mixed $default = null): mixed
    {
        return $default;
    }
}

$failed = 0;
$checks = 0;

function check(string $label, bool $ok, string $detail = ''): void
{
    global $failed, $checks;
    $checks++;
    if (! $ok) {
        $failed++;
    }
    printf("  %s  %s%s\n", $ok ? 'PASS' : 'FAIL', $label, $ok || $detail === '' ? '' : "\n        ".$detail);
}

/** Products shaped the way IHerbNormalizer actually produces them. */
$whey = [
    'name' => 'Optimum Nutrition Gold Standard 100% Whey – Double Rich Chocolate – 2,27 kg',
    'brand' => 'Optimum Nutrition',
    'sub_category_slug' => 'whey-proteine',
    'sub_category_label' => 'Whey protéine',
    'category_label' => 'Protéines',
    'pack_size' => 2.27,
    'pack_unit' => 'kg',
    'flavour' => 'Double Rich Chocolate',
    'reference' => 'ON-02046',
    'identity' => 'ON-02046',
];

$caps = [
    'name' => "Doctor's Best 5-HTP – 60 gélules végétales",
    'brand' => "Doctor's Best",
    'sub_category_slug' => 'sommeil-stress',
    'sub_category_label' => 'Sommeil & Stress',
    'category_label' => 'Santé & Vitalité',
    'pack_size' => 60,
    'pack_unit' => 'gélules végétales',
    'flavour' => null,
    'reference' => 'DRB-00171',
    'identity' => 'DRB-00171',
];

echo "\nImportedProductContent — standalone checks\n\n";

// ── 1. The template bank obeys the project's content rules ────────────────────────────────
echo "Template bank\n";
$problems = ImportedProductContent::selfCheck();
check(
    'no health claim, dosage or hardcoded figure in any of '.count(ImportedProductContent::allFrames()).' frames',
    $problems === [],
    implode("\n        ", $problems)
);

// ── 2. Facts only ─────────────────────────────────────────────────────────────────────────
echo "\nGrounding\n";

$noBrand = ImportedProductContent::compose(['name' => 'Mystery Powder', 'sub_category_label' => 'Créatine']);
check(
    'no brand -> every field null (a page with no identity sentence is not worth writing)',
    $noBrand['description_fr'] === null && $noBrand['seo_title'] === null && $noBrand['seo_description'] === null
);

$noSub = ImportedProductContent::compose(['name' => 'Mystery Powder', 'brand' => 'NOW Foods']);
check('no subcategory -> every field null (the rayon is the URL and half the copy)', $noSub['description_fr'] === null);

/**
 * These stay FACT arrays, not results.
 *
 * They were results at first — `$dose = ImportedProductContent::compose(...)` — and were then reused
 * in the metadata sample below, where compose() was called on them a second time. A result array has
 * no `name` key, so those three products returned nulls and contributed nothing: the title/description
 * length checks silently ran over five products instead of eight. A harness that quietly measures
 * less than it claims is the failure mode this project has a memory entry about.
 */
$doseFacts = array_merge($caps, [
    'pack_size' => 1000, 'pack_unit' => 'µg', 'name' => 'Jarrow Formulas Methyl B-12 1000 mcg', 'brand' => 'Jarrow Formulas',
]);
$noRefFacts = array_merge($whey, ['reference' => null]);
$noCatFacts = array_merge($whey, ['category_label' => null]);

$dose = ImportedProductContent::compose($doseFacts);
check(
    'a per-unit dose in pack_unit prints NO conditionnement sentence',
    $dose['description_fr'] !== null
        && ! str_contains($dose['description_fr'], 'conditionnement annoncé')
        && ! str_contains($dose['description_fr'], '1000 µg')
        && ! str_contains($dose['description_fr'], 'µg.'),
    (string) $dose['description_fr']
);

$noRef = ImportedProductContent::compose($noRefFacts);
check(
    'no reference -> no "Référence" sentence, rather than an empty one',
    $noRef['description_fr'] !== null && ! str_contains($noRef['description_fr'], 'éférence catalogue')
        && ! str_contains($noRef['description_fr'], 'éférence interne')
);

$noCat = ImportedProductContent::compose($noCatFacts);
check(
    'no parent category -> the placement sentence degrades instead of naming an empty category',
    $noCat['description_fr'] !== null && ! str_contains($noCat['description_fr'], 'catégorie .')
        && ! preg_match('~catégorie\s*[.,]~u', $noCat['description_fr'])
);

$all = ImportedProductContent::compose($whey)['description_fr'] ?? '';
check('no unfilled {placeholder} survives into the output', preg_match('~\{[a-z_]+\}~', $all) !== 1, $all);

// ── 3. The brand is stated once ───────────────────────────────────────────────────────────
echo "\nReadability\n";
$wheyBody = ImportedProductContent::compose($whey)['description_fr'] ?? '';
$firstSentence = explode('.', strip_tags($wheyBody))[0] ?? '';
check(
    'the opening sentence names the brand exactly once',
    substr_count($firstSentence, 'Optimum Nutrition') === 1,
    $firstSentence
);

/**
 * The title whose head is nothing BUT the brand.
 *
 * IHerbNormalizer::frenchTitle builds its head as trim(brand.' '.product), and `product` is empty
 * whenever stripLeadingBrand() consumed the whole displayName — so "NOW Foods – 454 g" is a title
 * this pipeline really can produce. productCore() used to hand the brand back as the product name
 * for it, which rendered "<strong>NOW Foods</strong>, de la marque NOW Foods" and put the doubled
 * brand into seo_title and seo_description too. There is no true identity sentence to write here,
 * so the correct output is the same nulls a missing brand produces.
 */
$brandOnly = ImportedProductContent::compose([
    'name' => 'NOW Foods – 454 g',
    'brand' => 'NOW Foods',
    'sub_category_slug' => 'whey-proteine',
    'sub_category_label' => 'Whey protéine',
    'pack_size' => 454,
    'pack_unit' => 'g',
    'identity' => 'NOW-02000',
]);
check(
    'a title that is only the brand -> nulls, never the brand twice in one clause',
    $brandOnly['description_fr'] === null && $brandOnly['seo_title'] === null && $brandOnly['seo_description'] === null,
    (string) $brandOnly['description_fr'].' | '.(string) $brandOnly['seo_title']
);

/**
 * Every size and every flavour is its own part number, its own product and its own URL.
 *
 * seo_title was built from $full, which productCore() has already stripped of exactly the two
 * segments that tell those URLs apart — so a brand's whole variant family shipped one shared
 * <title>. These four are the same product in four SKUs; four distinct titles is the requirement.
 */
$variants = [
    array_merge($whey, ['flavour' => 'Double Rich Chocolate', 'pack_size' => 2.27, 'identity' => 'ON-1']),
    array_merge($whey, ['flavour' => 'Vanilla Ice Cream', 'pack_size' => 2.27, 'identity' => 'ON-2']),
    array_merge($whey, ['flavour' => 'Double Rich Chocolate', 'pack_size' => 907, 'pack_unit' => 'g', 'identity' => 'ON-3']),
    array_merge($whey, ['flavour' => 'Sans arôme', 'pack_size' => 907, 'pack_unit' => 'g', 'identity' => 'ON-4']),
];
$variantTitles = array_map(static fn (array $f): string => (string) ImportedProductContent::compose($f)['seo_title'], $variants);
check(
    'each flavour/size variant gets its OWN seo_title (4 SKUs -> 4 distinct titles)',
    count(array_unique($variantTitles)) === count($variantTitles),
    implode("\n        ", $variantTitles)
);
check(
    'every variant seo_title is still at most 60 characters',
    array_filter($variantTitles, static fn (string $t): bool => mb_strlen($t) > 60) === [],
    implode("\n        ", array_map(static fn (string $t): string => mb_strlen($t).': '.$t, $variantTitles))
);

// ── 4. Determinism ────────────────────────────────────────────────────────────────────────
echo "\nDeterminism\n";
$a = ImportedProductContent::compose($whey);
$b = ImportedProductContent::compose($whey);
check('same input -> byte-identical output', $a === $b);

$other = ImportedProductContent::compose(array_merge($whey, ['identity' => 'ON-99999']));
check(
    'a different identity -> a different arrangement (the variation is real, not decorative)',
    $other['description_fr'] !== $a['description_fr']
);

// ── 5. Metadata windows ───────────────────────────────────────────────────────────────────
echo "\nMetadata\n";
$badTitle = [];
$badDesc = [];
$wordCounts = [];

$sample = [$whey, $caps, $doseFacts, $noRefFacts, $noCatFacts,
    array_merge($caps, ['sub_category_slug' => 'vitamines', 'sub_category_label' => 'Vitamines']),
    array_merge($whey, ['sub_category_slug' => 'barres-proteinees', 'sub_category_label' => 'Barres & Snacks Protéinés', 'pack_unit' => 'barres', 'pack_size' => 12]),
    array_merge($whey, ['name' => 'X Y', 'brand' => 'X', 'sub_category_label' => 'CLA', 'sub_category_slug' => 'cla']),
    // A very long brand+name, so the title ladder's truncation branch is actually entered rather
    // than merely present. Without this the 60-char cap is untested on the case it exists for.
    array_merge($whey, [
        'name' => 'California Gold Nutrition SPORT Performance Whey Protein Isolate Complex – Vanilla – 2,27 kg',
        'brand' => 'California Gold Nutrition',
    ]),
];

foreach ($sample as $facts) {
    $result = ImportedProductContent::compose($facts);
    if ($result['seo_title'] !== null && mb_strlen($result['seo_title']) > 60) {
        $badTitle[] = mb_strlen($result['seo_title']).': '.$result['seo_title'];
    }
    if ($result['seo_description'] !== null && mb_strlen($result['seo_description']) > 160) {
        $badDesc[] = mb_strlen($result['seo_description']).': '.$result['seo_description'];
    }
    if ($result['description_fr'] !== null) {
        $wordCounts[] = $result['word_count'];
    }
}

check('every seo_title is at most 60 characters', $badTitle === [], implode("\n        ", $badTitle));
check('every seo_description is at most 160 characters', $badDesc === [], implode("\n        ", $badDesc));
check(
    'the meta description never advertises reviews the page does not have',
    ! str_contains(mb_strtolower((string) ImportedProductContent::compose($whey)['seo_description']), 'avis')
);

// ── 6. Word count, reported rather than asserted ──────────────────────────────────────────
echo "\nVolume\n";
sort($wordCounts);
printf(
    "  INFO  word_count over %d sample products: min %d, median %d, max %d\n",
    count($wordCounts),
    $wordCounts[0] ?? 0,
    $wordCounts[intdiv(count($wordCounts), 2)] ?? 0,
    $wordCounts[count($wordCounts) - 1] ?? 0
);
echo "        This is DELIBERATELY not asserted against 250 (audit-pdp-content.mjs MIN_NEW_PRODUCT_WORDS).\n";
echo "        No honest arrangement of the columns we hold reaches 250, and a check that forced it\n";
echo "        would be a check that rewards padding. Promotion should read word_count and set\n";
echo "        seo_robots_index accordingly.\n";

echo "\n".($failed === 0 ? 'ALL PASS' : $failed.' FAILED')." ({$checks} checks)\n\n";

exit($failed === 0 ? 0 : 1);
