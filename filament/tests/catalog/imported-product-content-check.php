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
 *   · nothing this class emits — frame, title or meta description — may assert an import, a
 *     distribution, an availability, a stock, a price, a review, or the existence of anything the
 *     input never named. Sentences doing all of those shipped in this file's subject; they read
 *     perfectly well, which is precisely why the check is mechanical
 *   · every frame must carry a placeholder that varies BETWEEN TWO PRODUCTS OF THE SAME BRAND IN
 *     THE SAME RAYON. The rule used to be "a placeholder that is not {site}", which accepted
 *     {brand}-only and {sub}-only frames — and those are constants inside that cohort, so whole
 *     paragraphs came out byte-identical across it while every whole body still counted as distinct
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
 *   · `description_fr` must read the same as HTML and as plain text. Its consumers strip tags
 *     without decoding entities, so an entity in the column IS a literal "&amp;" in a snippet
 *   · and so must `seo_title` and `seo_description`, which is where that check was NOT being made.
 *     markupFree() was applied to the body's placeholders and to neither metadata field, so the two
 *     columns a crawler reads verbatim — the title tag, the meta description, the og/twitter
 *     description, the JSON-LD description — carried entities and markup the same page's body had
 *     already decoded. Section 3 now asserts all three fields from one entity-encoded fixture
 *
 * ── THE DISTINCTNESS NUMBERS ARE COMPUTED HERE, NOT REMEMBERED THERE ──────────────────────
 * The class docblock used to carry measured distinctness figures and say this harness reproduced
 * them. It did not — nothing here computed one. Section 7 now does, from compose()'s `arrangements`
 * (the exact size of the phrasing space for a fact set) and the collision formula
 * S·(1−(1−1/S)^N). Nothing is hard-coded: change a bank and both the space and the prediction move
 * together, and the assertion is on the RATIO between what the hash realised and what independent
 * selection predicts. That is the property that mattered all along — it is what crc32 failed.
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

/**
 * The ampersand product, and it is not a contrived one.
 *
 * Three of this shop's own rayon labels contain "&" — "Sommeil & Stress", "Santé & Vitalité",
 * "Barres & Snacks Protéinés" — so whatever the composer does with that character, it does on every
 * page of those rayons. Section 3 is the reason this sample is the capsule product rather than a
 * separate fixture nobody would think to keep in sync.
 */
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
    'all '.count(ImportedProductContent::allFrames()).' frames clean: no health claim, dosage, figure, '
        .'unsupported assertion, or frame whose only placeholders are constant within a brand-and-rayon cohort',
    $problems === [],
    implode("\n        ", $problems)
);

/**
 * The rayon slug the classifier really produces for this family is mixed-case.
 *
 * config/catalog.php maps into `['sub' => 'Intra-Workout', ...]` and the live rayon is served at
 * /Intra-Workout, so `sous_categories.slug` carries capitals — while every other slug in the map is
 * lower-case. A lookup that is not case-insensitive on BOTH sides silently drops one whole family
 * onto `default`, which is a working plan and therefore a failure that produces no error anywhere.
 */
check(
    'a mixed-case subcategory slug resolves to its family, not to `default`',
    ImportedProductContent::compose(array_merge($whey, [
        'sub_category_slug' => 'Intra-Workout',
    ]))['family'] === 'performance'
        && ImportedProductContent::compose(array_merge($whey, [
            'sub_category_slug' => 'intra-workout',
        ]))['family'] === 'performance'
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

/**
 * The rule applied to the half of the output that has no frame bank.
 *
 * seo_title and seo_description are assembled in PHP from clauses that appear nowhere in FRAMES, and
 * that is where the worst two claims this class ever shipped lived: a tail ending "importateur en
 * Tunisie", and a padding clause reading "Référence importée, disponible sur Protéine Tunisie en
 * Tunisie" — printed in the SERP snippet of a page whose own badge says RUPTURE, because promotion
 * writes qte = 0. selfCheck() cannot see either. This does.
 */
$vocabularySample = [$whey, $caps, $doseFacts, $noRefFacts, $noCatFacts];
$assertions = [];
foreach ($vocabularySample as $facts) {
    $result = ImportedProductContent::compose($facts);
    $plain = trim(preg_replace('~\s+~u', ' ', strip_tags((string) $result['description_fr'])) ?? '');
    foreach (['description_fr' => $plain, 'seo_title' => (string) $result['seo_title'], 'seo_description' => (string) $result['seo_description']] as $field => $text) {
        foreach (ImportedProductContent::unsupportedAssertions($text) as $why) {
            $assertions[] = $field.' ('.$why.'): '.$text;
        }
    }
}
check(
    'no composed body, title or meta description asserts an import, a stock, a price or a review',
    $assertions === [],
    implode("\n        ", $assertions)
);

// ── 3. HTML in, plain text out ────────────────────────────────────────────────────────────
echo "\nEscaping\n";

/**
 * `description_fr` has to read identically as HTML and as plain text.
 *
 * The column is consumed by strip_tags (ProductFeedController) and by tag regexes that do not decode
 * entities. htmlspecialchars(ENT_NOQUOTES) — what this used to use — leaves `&` encoded, so
 * "Sommeil & Stress" was stored as "Sommeil &amp; Stress" and arrived in a meta description with the
 * entity spelled out. Encoding cannot be the fix, because any entity survives strip_tags by
 * construction; the composer therefore neutralises `<` and `>` and encodes nothing.
 */
$ampersand = ImportedProductContent::compose($caps);
$ampersandBody = (string) $ampersand['description_fr'];
check(
    'no HTML entity survives into description_fr',
    preg_match('~&(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#x[0-9a-fA-F]+);~', $ampersandBody) !== 1,
    $ampersandBody
);
check(
    'a rayon label containing "&" reaches plain text as "&", not as "&amp;"',
    str_contains(strip_tags($ampersandBody), 'Sommeil & Stress'),
    strip_tags($ampersandBody)
);
check(
    'the apostrophe in a brand name survives as an apostrophe',
    str_contains(strip_tags($ampersandBody), "Doctor's Best"),
    strip_tags($ampersandBody)
);

/**
 * The values are a third party's. Markup arriving inside one must not reach the column.
 *
 * `<` and `>` are replaced by a space rather than deleted, so a title cannot silently glue two words
 * together, and nothing is entity-encoded — the previous line is the reason.
 */
$markup = ImportedProductContent::compose(array_merge($whey, [
    'name' => 'Acme Turbo <script>alert(1)</script> Complex',
    'brand' => 'Acme',
    'identity' => 'ACME-1',
]));
check(
    'markup inside a third-party value reaches the column neither as a tag nor as an entity',
    $markup['description_fr'] !== null
        && ! str_contains($markup['description_fr'], '<script')
        && ! str_contains($markup['description_fr'], '&lt;')
        && str_contains($markup['description_fr'], 'alert(1)'),
    (string) $markup['description_fr']
);

/**
 * THE SAME RULE ON seo_title AND seo_description, WHICH IS WHERE IT WAS NOT BEING APPLIED.
 *
 * markupFree() was reaching every {placeholder} in the body and NEITHER metadata field: compose()
 * built $values through it and then handed seoTitle()/seoDescription() the raw self::text() strings.
 * Everything above passed while both leaked, because everything above looked only at description_fr.
 *
 * The fixture is entity-encoded on the way IN, which the source strings really are — iHerb ships
 * "Nature&#039;s Way" and our own rayon labels ship "Vitamines &amp; Minéraux". Those two columns are
 * the ones x-crawler/product/[slug] emits verbatim as the title tag and the meta description, and
 * that ProductSchemaBuilder puts in JSON-LD, so an entity here is an entity in the SERP.
 */
$encoded = ImportedProductContent::compose([
    'name' => 'Nature&#039;s Way Alive! Women&#039;s Energy – 50 comprimés',
    'brand' => 'Nature&#039;s Way',
    'sub_category_slug' => 'vitamines',
    'sub_category_label' => 'Vitamines &amp; Minéraux',
    'category_label' => 'Sant&eacute; &amp; Vitalité',
    'pack_size' => 50,
    'pack_unit' => 'comprimés',
    'identity' => 'NWY-14930',
]);
foreach (['seo_title', 'seo_description', 'description_fr'] as $field) {
    $value = (string) $encoded[$field];
    check(
        'no HTML entity survives into '.$field,
        $value !== '' && preg_match('~&(?:[a-zA-Z][a-zA-Z0-9]*|#[0-9]+|#x[0-9a-fA-F]+);~', $value) !== 1,
        $value
    );
}
check(
    'seo_description carries the decoded rayon label, not "&amp;"',
    str_contains((string) $encoded['seo_description'], '&')
        && str_contains((string) $encoded['seo_description'], "Nature's Way"),
    (string) $encoded['seo_description']
);

/**
 * Markup in a third-party value must not reach the metadata either.
 *
 * The body neutralised "Acme Turbo <b>Ultra</b> Complex" and seo_title kept the tags, which the
 * crawler route then emitted inside <title>. Same value, same row, two different strings.
 */
$markupMeta = ImportedProductContent::compose(array_merge($whey, [
    'name' => 'Acme Turbo <b>Ultra</b> Complex Formula Avancée',
    'brand' => 'Acme',
    'identity' => 'ACME-2',
]));
check(
    'no markup survives into seo_title or seo_description',
    ! str_contains((string) $markupMeta['seo_title'], '<')
        && ! str_contains((string) $markupMeta['seo_title'], '>')
        && ! str_contains((string) $markupMeta['seo_description'], '<')
        && ! str_contains((string) $markupMeta['seo_description'], '>'),
    (string) $markupMeta['seo_title'].' | '.(string) $markupMeta['seo_description']
);

// ── 4. The brand is stated once ───────────────────────────────────────────────────────────
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

// ── 5. Determinism ────────────────────────────────────────────────────────────────────────
echo "\nDeterminism\n";
$a = ImportedProductContent::compose($whey);
$b = ImportedProductContent::compose($whey);
check('same input -> byte-identical output', $a === $b);

$other = ImportedProductContent::compose(array_merge($whey, ['identity' => 'ON-99999']));
check(
    'a different identity -> a different arrangement (the variation is real, not decorative)',
    $other['description_fr'] !== $a['description_fr']
);

// ── 6. Metadata windows ───────────────────────────────────────────────────────────────────
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

// ── 7. Distinctness, computed rather than remembered ──────────────────────────────────────
echo "\nDistinctness\n";

/**
 * How many different bodies did the hash actually realise, against how many it could have?
 *
 * `arrangements` is the exact size of the phrasing space for a fact set — the product of the bank
 * sizes of the slots the plan filled. Draw N identities from S arrangements independently and the
 * expected number of DISTINCT results is S·(1−(1−1/S)^N); anything materially below that means the
 * hash is correlating its inputs, which is what crc32 did here (its low bits — the ones `% 4` reads
 * — stay related across sequential part numbers, and part numbers are sequential).
 *
 * Nothing below is hard-coded. Edit a bank and S moves, the prediction moves with it, and the
 * assertion — on the RATIO, not on a remembered count — still means the same thing.
 */
$cohortDistinct = static function (array $facts, int $n): array {
    // Keyed by the body itself, so the count is a set size rather than a sort over N long strings.
    $bodies = [];
    for ($i = 0; $i < $n; $i++) {
        // Sequential identities on purpose: real part numbers are sequential, and a hash that
        // handles random input well can still fail on that. crc32 did.
        $body = (string) ImportedProductContent::compose(
            array_merge($facts, ['identity' => 'SEQ-'.(1000000 + $i)])
        )['description_fr'];
        $bodies[$body] = true;
    }

    $space = ImportedProductContent::compose($facts)['arrangements'];
    $expected = $space * (1 - ($space > 0 ? (1 - 1 / $space) ** $n : 1));

    return ['space' => $space, 'expected' => $expected, 'distinct' => count($bodies)];
};

$n = 5000;

/**
 * The worst realistic cohort: one subcategory, one brand, one pack size, one flavour state. Every
 * fact identical — only the identity differs. This is not a contrived input; it is what a single
 * brand's single product line looks like after promotion, and it is the cohort where near-duplicate
 * bodies do their damage, because those pages also compete with each other.
 */
$worst = $cohortDistinct($whey, $n);
printf(
    "  INFO  worst-case cohort: %d arrangements, %d identities -> %d distinct bodies (independent selection predicts %.0f)\n",
    $worst['space'],
    $n,
    $worst['distinct'],
    $worst['expected']
);
check(
    'the hash realises essentially all the variation the banks contain (>= 95% of prediction)',
    $worst['expected'] > 0 && $worst['distinct'] >= 0.95 * $worst['expected'],
    sprintf('%d distinct vs %.0f predicted', $worst['distinct'], $worst['expected'])
);
check(
    'and never more than the space allows (the arrangement count is an upper bound, not an estimate)',
    $worst['distinct'] <= $worst['space'],
    sprintf('%d distinct vs %d arrangements', $worst['distinct'], $worst['space'])
);

/**
 * The sparsest product this pipeline can emit: name, brand and rayon, nothing else. No pack, no
 * flavour, no galenic form, no parent category, no reference. Its space is far smaller, and that is
 * a fact about the DATA rather than about the hash — worth printing, because it is the cohort a
 * promotion wave should be most reluctant to index.
 */
$sparse = $cohortDistinct([
    'name' => 'Generic Brand Basic Complex',
    'brand' => 'Generic Brand',
    'sub_category_label' => 'Rayon test',
], $n);
printf(
    "  INFO  sparsest cohort:   %d arrangements, %d identities -> %d distinct bodies (independent selection predicts %.0f)\n",
    $sparse['space'],
    $n,
    $sparse['distinct'],
    $sparse['expected']
);
check(
    'the sparsest fact set still realises its whole (much smaller) space',
    $sparse['expected'] > 0 && $sparse['distinct'] >= 0.95 * $sparse['expected'],
    sprintf('%d distinct vs %.0f predicted', $sparse['distinct'], $sparse['expected'])
);

/**
 * Axis 1, isolated: the FAMILY alone must change the page.
 *
 * Same identity, same brand, same rayon LABEL, same pack, same flavour — only the subcategory slug
 * differs, so the only thing that can differ in the output is the plan and the family-keyed banks.
 * If two families produce the same body here, one of them is decoration.
 */
$familyProbe = [
    'name' => 'Testbrand Alpha Complex',
    'brand' => 'Testbrand',
    'sub_category_label' => 'Rayon test',
    'category_label' => 'Catégorie test',
    'pack_size' => 60,
    'pack_unit' => 'gélules végétales',
    'flavour' => 'Vanille',
    'reference' => 'TB-1',
    'identity' => 'TB-1',
];
$familySlugs = [
    'whey-proteine',      // proteines
    'creatine',           // performance
    'cla',                // silhouette
    'vitamines',          // micronutrition
    'ashwagandha',        // plantes
    'probiotiques',       // bienetre
    'barres-proteinees',  // snacking
    'un-rayon-inconnu',   // default
];
$familyBodies = [];
$familyNames = [];
foreach ($familySlugs as $slug) {
    $result = ImportedProductContent::compose(array_merge($familyProbe, ['sub_category_slug' => $slug]));
    $familyBodies[] = (string) $result['description_fr'];
    $familyNames[] = $result['family'];
}
check(
    'each of the '.count($familySlugs).' families produces its own body from identical facts',
    count(array_unique($familyBodies)) === count($familySlugs)
        && count(array_unique($familyNames)) === count($familySlugs),
    implode(', ', $familyNames)
);

// ── 8. Word count, reported rather than asserted ──────────────────────────────────────────
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
echo "        seo_robots_index accordingly. These counts are LOWER than they once were, on purpose:\n";
echo "        the import and brand-range sentences that used to pad them asserted facts we do not\n";
echo "        hold, and a shorter true page beats a longer plausible one.\n";

echo "\n".($failed === 0 ? 'ALL PASS' : $failed.' FAILED')." ({$checks} checks)\n\n";

exit($failed === 0 ? 0 : 1);
