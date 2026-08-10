<?php

/**
 * Standalone check for App\Services\Catalog\SubCategoryClassifier — no vendor/, no DB, no network.
 *
 *     php filament/tests/catalog/subcategory-classifier-check.php
 *
 * ── WHY THIS FILE IS WORTH MORE THAN A COVERAGE PERCENTAGE ────────────────────────────────
 * This classifier picks the FIRST SEGMENT OF THE PUBLIC URL: `/{subcategory}/{product}`. A wrong
 * answer is not a mis-filed product, it is a product published at the wrong address, indexed
 * there, and correctable only with a permanent redirect.
 *
 * Measured against all 47,537 real iHerb product names, the first draft classified 28.6% of the
 * catalogue and every order check passed. It was still wrong in two ways that no total could show:
 *
 *   "cla"   matched CAT'S CLAW, DEVIL'S CLAW and CLAY POWDER — 426 hits where ~34 are real CLA.
 *           Herbal supplements and a cosmetic clay would have been published under /cla/.
 *   "iron"  matched "iron-free" and "no-iron" — products advertising the ABSENCE of the thing
 *           being matched. Filing an iron-free multivitamin under minerals inverts the label.
 *
 * Both are fixed with `exact` (whole-word) and `not` (disqualifying) terms, and both are pinned
 * below by name. The ordering cases matter just as much: if "whey" were tested before
 * "whey-isolate", every isolate in the catalogue would get the wrong URL.
 */

require __DIR__.'/../../app/Services/Catalog/SubCategoryClassifier.php';

use App\Services\Catalog\SubCategoryClassifier;

if (! function_exists('env')) {
    function env(string $key, mixed $default = null): mixed
    {
        return $default;
    }
}

$config = require __DIR__.'/../../config/catalog.php';
$rules = $config['classification'];

/** @var list<array{0:string,1:?string,2:string}> [product name, expected subcategory or null, why] */
$cases = [
    // ── The two bugs the 47,537-name run exposed ────────────────────────────────────────
    ['now-foods-cat-s-claw-extract-120-veg-capsules', null, "Cat's Claw is a herb, not CLA"],
    ['now-foods-devil-s-claw-100-veg-capsules', null, "Devil's Claw is a herb, not CLA"],
    ['now-foods-solutions-european-clay-powder-6-oz-170-g', null, 'clay is not CLA'],
    ['now-foods-cla-800-mg-180-softgels', 'cla', 'this IS CLA'],
    // Unclassified, not "vitamines": the name says "multi", never "multivitamin" or "vitamin". The
    // point of the case is that it must not reach MINERAUX on the strength of the word "iron" in
    // "iron-free". Staying unclassified is the safe outcome — it is simply not published.
    ['now-foods-ecogreen-multi-iron-free-180-veg-capsules', null, 'iron-FREE must not be filed under minerals'],
    ['source-naturals-life-minerals-no-iron-120-tablets', null, '"no-iron" disqualifies the mineral rule'],
    ['now-foods-iron-18-mg-120-veg-capsules', 'mineraux', 'an actual iron supplement'],

    // ── Order. Each of these would get the wrong URL if the rules were reordered. ────────
    ['optimum-nutrition-gold-standard-100-whey-double-rich-chocolate-5-lb', 'whey-proteine', 'plain whey'],
    ['dymatize-iso-100-hydrolyzed-whey-protein-isolate-gourmet-chocolate-5-lb', 'whey-hydrolysee', 'hydrolysed beats isolate and whey'],
    ['optimum-nutrition-gold-standard-100-isolate-rich-vanilla-3-lb', 'whey-isolate', 'isolate beats whey'],
    ['optimum-nutrition-serious-mass-chocolate-12-lb', 'mass-gainers', 'mass gainer beats gainer and protein'],
    ['now-foods-sports-creatine-monohydrate-powder-2-2-lbs-1-kg', 'creatine', 'core product'],
    ['now-foods-sports-beta-alanine-powder-500-g', 'beta-alanine', 'beta-alanine must not fall to amino/eaa'],

    // ── Whole-word behaviour ────────────────────────────────────────────────────────────
    ['navitas-organics-organic-maca-powder-16-oz-454-g', 'boosters-hormonaux', 'maca is a hormone-support herb here'],
    ['now-foods-real-food-organic-macadamia-nuts-9-oz', null, '"macadamia" must not match "maca"'],

    // ── Genuinely unclassifiable. These MUST stay null and therefore unpublished. ────────
    ['doctor-s-best-saw-palmetto-standardized-extract-320-mg-60-softgels', null, 'no protein.tn subcategory for saw palmetto'],
    ['doctor-s-best-ginkgo-120-mg-120-veggie-caps', null, 'no subcategory for ginkgo'],
    ['doctor-s-best-digestive-enzymes-90-veggie-caps', null, 'no subcategory for digestive enzymes'],
];

$failed = 0;

echo "\nSubCategoryClassifier — ".count($cases)." named cases against ".count($rules)." rules\n\n";

foreach ($cases as [$name, $expected, $why]) {
    $result = SubCategoryClassifier::classify($name, $rules);
    $got = $result['sub'];
    $ok = $got === $expected;

    if (! $ok) {
        $failed++;
    }

    printf(
        "  %s  %-22s %s\n",
        $ok ? 'PASS' : 'FAIL',
        $got ?? '(unclassified)',
        substr($name, 0, 62),
    );

    if (! $ok) {
        printf("        expected %s — %s (matched term: %s)\n", $expected ?? '(unclassified)', $why, $result['term'] ?? 'none');
    }
}

echo "\n".($failed === 0 ? 'ALL PASS' : $failed.' FAILED')."\n\n";

exit($failed === 0 ? 0 : 1);
