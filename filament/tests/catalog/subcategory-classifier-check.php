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

    /*
    | ── A SEVENTH EXPECTATION CHANGED ON 10/08/2026: null → mineraux. WHY IT IS NOT A WEAKENING ──
    |
    | This case asserted null, "'no-iron' disqualifies the mineral rule". That described the rule as
    | written, not the product: Life Minerals is a MULTIMINERAL, it matched on the word `mineral`,
    | and it was then disqualified by its own label for naming the one mineral it leaves out. It was
    | one of the 63 rows the promotion report could not classify.
    |
    | The mineral rule is now two rules — positive mineral words with no `not`, then `iron` alone
    | with the guard — so the product it was always about lands where it belongs. The half of this
    | case that was load-bearing is not dropped, it is MOVED to its own case two lines down, where a
    | product whose ONLY mineral signal is the word "iron" inside "iron-free" is pinned to null. That
    | is the assertion that actually guards the inversion; this one never was.
    |
    | Naming a slug is also a stronger claim than null, for the reason this file already argues
    | above: null would still pass if the classifier broke in some completely different way.
    */
    ['source-naturals-life-minerals-no-iron-120-tablets', 'mineraux', 'an iron-free MULTIMINERAL is still a mineral supplement'],
    ['Source Naturals Life Minerals, No Iron - 120 comprimes', 'mineraux', 'the same product as the report printed it, French pack size and all'],
    ['now-foods-special-two-iron-free-180-tablets', null, 'the guard that matters: "iron" inside "iron-free" must still reach nothing'],
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

    /*
    |=========================================================================================
    | ADDED 10/08/2026 — THE 63 ROWS THAT STILL MATCHED NOTHING
    |=========================================================================================
    | The production promotion report printed twelve of the 63 hydrated rows that no rule reached.
    | Every name in this block is one of those twelve, spelled exactly as the report printed it —
    | French pack sizes and all, because that is the string the classifier is handed. Nine of them
    | now classify; three deliberately still do not.
    |
    | The rule additions they justify are `amino` (exact) on acides-amines, `multiple`/`mega-one` on
    | vitamines, `kudzu`/`petadolex` on plantes-et-herbes, `skin-eternal` on beaute-cheveux, and the
    | split of the mineral rule. Everything AFTER this block exists to prove those five additions do
    | not take a product away from a rule that should have won.
    */

    // ── The "No Iron" cluster. Multivitamins whose label spells "Multiple", not "Multi". ────
    ['Source Naturals Life Force Multiple, No Iron - 120 gelules', 'vitamines', '"Multiple" IS the industry word for a multivitamin'],
    ['Source Naturals Life Force Multiple, No Iron - 120 comprimes', 'vitamines', 'same product, other dose form — both were unclassified'],
    // Front-anchoring is the ONLY thing standing between this and /omega-3/: `-mega-one-` does not
    // contain `-omega`. If `contains()` ever stops anchoring, this case is what says so.
    ['Source Naturals Mega-One, No Iron - 60 comprimes', 'vitamines', 'a named multivitamin line — and NOT omega-3, which "mega" is one letter from'],

    // ── Free amino acids the phrase-only terms could not reach ─────────────────────────────
    ['Source Naturals Super Amino Night - 240 comprimes', 'acides-amines', 'the label says "Amino", not "amino acid" — this is what `exact` amino is for'],
    ['Source Naturals Super Amino Night - 120 gelules', 'acides-amines', 'same product, other dose form'],
    ['NOW Foods Amino Complete - 120 capsules', 'acides-amines', 'another bare "Amino" the phrase list never reached'],

    // ── Named plants ───────────────────────────────────────────────────────────────────────
    ['Planetary Herbals Kudzu Recovery - 120 comprimes', 'plantes-et-herbes', 'kudzu is one named plant — and NOT post-workout, despite "Recovery"'],
    ["Nature's Way Petadolex, Pro-Active - 60 capsules molles", 'plantes-et-herbes', 'Petadolex is butterbur, a named plant'],

    // ── A skin supplement, filed by what the name's head noun says ─────────────────────────
    ['Source Naturals Skin Eternal with DMAE, Lipoic Acid, & C Ester - 120 comprimes', 'beaute-cheveux', 'the rayon already carries hair-skin; this product is called Skin'],

    // ── Three of the twelve that must STAY unclassified ────────────────────────────────────
    // Multi-ingredient formulas with no rayon. Leaving them staged costs nothing; guessing one
    // mints a permanent URL. ADRENergize joins Energy and Thyroid Energy for the same reason.
    ['NOW Foods Energy - 90 gelules vegetales', null, 'as the report printed it — still a judgement, still unclassified'],
    ['NOW Foods Thyroid Energy - 90 gelules vegetales', null, 'as the report printed it — still a judgement, still unclassified'],
    ["Nature's Way ADRENergize, Adrenal Energy - 50 gelules", null, 'adrenal support has no rayon and must not be invented'],

    /*
    |=========================================================================================
    | THE PROOF THAT `amino` STEALS NOTHING — one named product per rule that must win
    |=========================================================================================
    | A bare token tested against ~47,000 names is the most dangerous kind of edit in this file, so
    | each rule it could plausibly take from gets a case, and the case names a product.
    |
    | Two different mechanisms are being proved, and they fail differently:
    |
    |   ORDER   bcaa (13), eaa (14), l-arginine (12), beta-alanine (10), citrulline (11) are ABOVE
    |           acides-amines (18). Nothing can reach it first. These cases fail if anyone reorders.
    |   `not`   glutamine (23), l-carnitine (20), collagene (29), zinc (31), magnesium (32) and
    |           mineraux (44) are all BELOW it, so order protects nothing and the `not` list does.
    |           These cases fail if anyone trims that list.
    |
    | THE FIVE `not` CASES WERE ALREADY FAILING BEFORE `amino` EXISTED. Run against the config as it
    | shipped this morning, all five returned `acides-amines` on the PRE-EXISTING term `amino-acid`:
    | "amino acid chelate" is how a mineral's label states its delivery form, and glutamine,
    | carnitine and collagen are all amino acids with a more specific rayon of their own. They are
    | not hypotheticals guarding a new term; they are products that were being published at the
    | wrong URL and are now not.
    */
    ['Optimum Nutrition BCAA 1000 Caps, Amino Acid Supplement - 200 capsules', 'bcaa', 'ORDER: bcaa is rule 13, acides-amines is 18'],
    ['Optimum Nutrition Essential Amino Energy, Fruit Fusion - 270 g', 'eaa', 'ORDER: essential-amino belongs to eaa at rule 14'],
    ['NOW Foods Sports Beta-Alanine Pure Powder, Amino Acid - 500 g', 'beta-alanine', 'ORDER: beta-alanine is rule 10'],
    ['NOW Foods Sports L-Arginine Powder, Free Form Amino Acid - 454 g', 'l-arginine', 'ORDER: l-arginine is rule 12'],
    ['NOW Foods Sports L-Glutamine Pure Powder, Free Form Amino Acid - 454 g', 'glutamine', 'NOT: glutamine is rule 23, BELOW — order protects nothing here'],
    ['NOW Foods Sports L-Carnitine Liquid, Amino Acid - 473 ml', 'l-carnitine', 'NOT: l-carnitine is rule 20, BELOW'],
    ['Neocell Super Collagen + C, Amino Acid Peptides - 250 comprimes', 'collagene', 'NOT: collagene is rule 29, BELOW'],
    // "Amino acid chelate" is a MINERAL's delivery form, not an amino acid product. Three minerals,
    // three different rules below acides-amines, all three previously landing at /acides-amines/.
    ['Solgar Chelated Zinc, Amino Acid Chelate - 100 comprimes', 'zinc', 'NOT chelate: a zinc supplement, not an amino acid'],
    ['Solgar Chelated Magnesium, Amino Acid Chelate - 250 comprimes', 'magnesium', 'NOT chelate: a magnesium supplement'],
    ['NOW Foods Iron 18 mg, Iron Bisglycinate Amino Acid Chelate - 120 gelules vegetales', 'mineraux', 'NOT chelate: an iron supplement — and mineraux is the LAST rule, so nothing else could catch it'],

    /*
    |=========================================================================================
    | THE PROOF THAT WIDENING `vitamines` STEALS NOTHING
    |=========================================================================================
    | vitamines is rule 43 of 45 and only the two mineral rules follow it, so it can steal from
    | minerals and from nothing else. collagene (29) and digestion (37) are protected by ORDER —
    | which is exactly why they are pinned here: order is a guarantee only for as long as nobody
    | moves a line, and this file is the thing that notices.
    |
    | The `multi-mineral` case is not hypothetical either. Run against the config as it shipped this
    | morning it returned VITAMINES on term `multi`: "Multi Mineral" normalises to `-multi-mineral-`,
    | which contains the whole token `-multi-`, and mineraux comes AFTER vitamines so it never got a
    | chance. A mineral complex with no vitamins in it was being published at /vitamines/…
    */
    ['Ancient Nutrition Multi Collagen Protein - 227 g', 'collagene', 'ORDER: collagene at 29 claims multi-collagen before vitamines at 43'],
    ['Solgar Multi Enzyme Complex - 100 comprimes', 'digestion', 'ORDER: digestion at 37 claims multi-enzyme'],
    ['Country Life Target-Mins Multi Mineral Complex - 90 comprimes', 'mineraux', 'NOT multi-mineral: a mineral complex is not a multivitamin'],
    ['Solaray Multiple Minerals - 200 vegcaps', 'mineraux', 'NOT multiple-mineral: the same trap spelled the other way'],
    // The `not` fires only on multi IMMEDIATELY followed by mineral, so a genuine multivitamin that
    // merely lists minerals in its name is untouched. Without this case the `not` could be widened
    // to "mineral" by someone tidying up, and every multivitamin+mineral would leave the rayon.
    ['Solgar Formula V VM-75 Multiple Vitamins with Chelated Minerals - 90 comprimes', 'vitamines', 'a multivitamin that names minerals is still a multivitamin'],

    /*
    |=========================================================================================
    | `hydrolysate` IS RULE ONE, SO NOTHING PROTECTS ANYTHING FROM IT
    |=========================================================================================
    | Found while proving the collagen case above, and confirmed against the config as it shipped:
    | "Great Lakes Wellness Collagen Hydrolysate" returned WHEY-HYDROLYSEE on term `hydrolysate`.
    | A collagen powder published at /whey-hydrolysee/. Fixed with `not => ['collagen']` on rule 0.
    |
    | Still open and deliberately not patched blind: `hydrolysate` equally matches CASEIN, BEEF and
    | PEA/RICE protein hydrolysates, which have their own rules at 1, 2 and 3 and never get to them.
    | Sizing that needs the production corpus, not a guess in a config file.
    */
    ['Great Lakes Wellness Collagen Hydrolysate, Beef Gelatin - 454 g', 'collagene', 'a collagen powder is not a whey hydrolysate'],
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
