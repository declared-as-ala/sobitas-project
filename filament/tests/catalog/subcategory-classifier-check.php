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
    /*
    | ── THESE SIX EXPECTATIONS WERE UPDATED ON 10/08/2026, AND THE REASON MATTERS ──────────
    |
    | Six cases here asserted `null` "because protein.tn has no subcategory for this". That was a
    | true statement about the SHOP, not about the classifier — and migration 000005 then created
    | plantes-et-herbes and digestion, and 000006 created acides-amines and glucides-energie. The
    | assertions did not change with them, so the harness went red for six products the shop can now
    | file correctly, and stayed red: exactly the "it always fails, ignore it" state that makes a
    | test worse than no test.
    |
    | What each case was really guarding is preserved, and is now guarded MORE strictly, because a
    | named subcategory is a stronger assertion than `null`:
    |
    |   cat's claw / devil's claw  must not reach `cla`      → now pinned to plantes-et-herbes
    |   ecogreen multi IRON-FREE   must not reach `mineraux`  → now pinned to vitamines
    |
    | `null` would have passed if the classifier had broken in a completely different way. The slug
    | it must land on cannot.
    */
    ['now-foods-cat-s-claw-extract-120-veg-capsules', 'plantes-et-herbes', "Cat's Claw is a herb — and above all NOT cla"],
    ['now-foods-devil-s-claw-100-veg-capsules', 'plantes-et-herbes', "Devil's Claw is a herb — and above all NOT cla"],
    ['now-foods-solutions-european-clay-powder-6-oz-170-g', null, 'clay is not CLA, and a cosmetic clay has no home here'],
    ['now-foods-cla-800-mg-180-softgels', 'cla', 'this IS CLA'],
    // The name says "Multi", never "multivitamin" — which is why `multi` is an EXACT token on the
    // vitamines rule. The load-bearing half of this case is unchanged: it must NOT reach mineraux
    // on the strength of the word "iron" inside "iron-free".
    ['now-foods-ecogreen-multi-iron-free-180-veg-capsules', 'vitamines', 'a multivitamin — and NOT mineraux, despite containing "iron"'],
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

    // ── Homed by migrations 000005/000006. Were `null` when the shop had nowhere to put them. ──
    ['doctor-s-best-saw-palmetto-standardized-extract-320-mg-60-softgels', 'plantes-et-herbes', 'a named herb'],
    ['doctor-s-best-ginkgo-120-mg-120-veggie-caps', 'plantes-et-herbes', 'a named herb'],
    ['doctor-s-best-digestive-enzymes-90-veggie-caps', 'digestion', 'digestive enzymes have their own rayon now'],

    // ── The rules added 10/08/2026 from the first promotion dry run's unclassified samples ──
    // Every one of these is a REAL product name the report printed, not an invented case.
    ['jarrow-formulas-taurine-100-capsules', 'acides-amines', 'taurine is a free amino acid'],
    ['now-foods-sports-l-ornithine-powder-227-g', 'acides-amines', 'ornithine likewise'],
    ['now-foods-tri-amino-120-capsules', 'acides-amines', 'an amino blend'],
    ['now-foods-sports-carbo-gain-3-63-kg', 'glucides-energie', 'maltodextrin is a carbohydrate, not a gainer'],
    ['now-foods-sports-d-ribose-120-veg-capsules', 'glucides-energie', 'ribose is a carbohydrate'],

    // ── Still genuinely unclassifiable, and that is the correct outcome ─────────────────────
    // Multi-ingredient formulas whose category is a judgement. A wrong guess here is a permanent
    // URL, so they stay staged rather than being published into a rayon somebody picked.
    ['now-foods-energy-90-veg-capsules', null, 'a multi-ingredient formula — category is a judgement'],
    ['now-foods-thyroid-energy-90-veg-capsules', null, 'thyroid support has no rayon and must not be guessed'],
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
