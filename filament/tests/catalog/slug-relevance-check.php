<?php

/**
 * Standalone check for App\Services\Catalog\SlugRelevance — no vendor/, no database, no network.
 *
 *     php filament/tests/catalog/slug-relevance-check.php
 *
 * ── WHY THESE CASES AND NOT A COUNT ───────────────────────────────────────────────────────
 * The first draft of the deny list was measured against all 47,537 real iHerb sitemap slugs and the
 * bucket totals looked entirely reasonable — 12.6% denied, three hours of crawl saved. Reading what
 * it had actually caught was a different story: it was deleting Cat's Claw, Hair-Skin-Nails,
 * Petadolex, Skin Eternal and every product from a brand called Ageless Foundation Laboratories.
 *
 * A percentage cannot show that. Each case below is a specific product that was observed being
 * thrown away, or one that must keep being rejected — so a future edit to the lists fails here
 * with a name attached instead of a slightly different total.
 *
 * The lists are REQUIRED from config/catalog.php rather than copied. A copy would let this file
 * pass while the shipped configuration was broken.
 */

require __DIR__.'/../../app/Services/Catalog/SlugRelevance.php';

use App\Services\Catalog\SlugRelevance;

// config/catalog.php calls env(); it is not loaded here, so provide the fallback-only shape.
if (! function_exists('env')) {
    function env(string $key, mixed $default = null): mixed
    {
        return $default;
    }
}

$config = require __DIR__.'/../../config/catalog.php';
$allow = $config['relevance']['slug_allow'];
$deny = $config['relevance']['slug_deny'];

/** @var list<array{0:string,1:string,2:string}> [slug, expected, why] */
$cases = [
    // ── Rescued from the deny list by measurement. Each was observed being wrongly denied. ──
    ['now-foods-cat-s-claw-extract-120-veg-capsules-334-mg-per-capsule', 'keep', "Cat's Claw is a herbal supplement, not cat food"],
    ['nature-s-way-cat-s-claw-175-mg-60-vegan-capsules', 'keep', "Cat's Claw, a second brand"],
    ['country-life-maxi-hair-skin-nails-90-tablets', 'keep', 'Hair-Skin-Nails is a tablet supplement'],
    ['futurebiotics-hair-skin-nails-135-tablets', 'keep', 'Hair-Skin-Nails, a second brand'],
    ['source-naturals-skin-eternal-with-dmae-lipoic-acid-c-ester-120-tablets', 'keep', 'Skin Eternal is a tablet supplement'],
    ['nature-s-way-petadolex-pro-active-50-mg-60-softgels', 'keep', 'Petadolex is butterbur in softgels'],
    ['ageless-foundation-laboratories-ultramax-gold-with-alphaneuro-complex-90-veg-capsules', 'keep', 'the BRAND contains "foundation"'],
    ['lenny-larry-s-the-complete-cookie-chocolate-chip-12-cookies-4-oz-113-g-each', 'keep', 'a protein cookie is a real sports product'],

    // ── Core catalogue. If these ever stop matching, the prefilter is broken outright. ──
    ['optimum-nutrition-gold-standard-100-whey-double-rich-chocolate-5-lb-2-27-kg', 'keep', 'core product'],
    ['now-foods-sports-creatine-monohydrate-powder-2-2-lbs-1-kg', 'keep', 'core product'],

    // ── Must stay denied. Every one of these costs nothing and belongs to another shop. ──
    ['avalon-organics-conditioner-volumizing-rosemary-11-oz-325-g', 'deny', 'hair conditioner'],
    ['now-foods-solutions-xyliwhite-toothpaste-gel-refreshmint-6-4-oz-181-g', 'deny', 'toothpaste'],
    ['wet-n-wild-megalast-liquid-catsuit-matte-lipstick-925b-give-me-mocha-0-21-oz-6-g', 'deny', 'lipstick — "catsuit" must not rescue it'],
    ['grab-green-3-in-1-laundry-powder-detergent-pods-vetiver-24-pods-13-5-oz-384-g', 'deny', 'laundry detergent'],
    ['yogi-tea-ginger-caffeine-free-16-tea-bags-1-12-oz-32-g', 'deny', 'herbal tea'],
    ['j-r-liggett-s-old-fashioned-shampoo-bar-tea-tree-hemp-oil-3-5-oz-99-g', 'deny', 'shampoo'],
    ['cat-man-doo-life-essentials-freeze-dried-chicken-for-cats-and-dogs-2-oz-57-g', 'deny', 'pet food'],

    // ── Word-boundary behaviour. The reason matching is anchored at the front only. ──
    ['carpet-fresh-rug-deodorizer-20-oz', 'keep', '"pet-" must not match inside "carpet" (deny is by phrase now, so this is neutral)'],
    ['pet-naturals-of-vermont-daily-multi-for-dogs-60-chews', 'deny', '"for-dogs" catches it'],
];

$failed = 0;
$width = 0;
foreach ($cases as [$slug]) {
    $width = max($width, min(strlen($slug), 70));
}

echo "\nSlugRelevance — ".count($cases)." named cases\n";
echo '  allow terms: '.count($allow).'   deny terms: '.count($deny)."\n\n";

foreach ($cases as [$slug, $expected, $why]) {
    $verdict = SlugRelevance::decide($slug, $allow, $deny);
    $denied = $verdict['decision'] === SlugRelevance::DENIED;
    $ok = $expected === 'deny' ? $denied : ! $denied;

    if (! $ok) {
        $failed++;
    }

    printf(
        "  %s  %-9s %s\n",
        $ok ? 'PASS' : 'FAIL',
        $verdict['decision'],
        substr($slug, 0, 70),
    );

    if (! $ok) {
        printf("        expected to be %s — %s (matched term: %s)\n", $expected === 'deny' ? 'DENIED' : 'KEPT', $why, $verdict['term'] ?? 'none');
    }
}

echo "\n".($failed === 0 ? 'ALL PASS' : $failed.' FAILED')."\n\n";

exit($failed === 0 ? 0 : 1);
