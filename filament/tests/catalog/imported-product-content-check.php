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
/*
 * Section 9 — the promotion-time content decision.
 *
 * ImportedSourceContent is the class that decides what of a transcribed source page a product page
 * publishes, and it is framework-free for the same reason everything else here is: it must be
 * checkable before deploy with no vendor/ and no database. Gtin and IHerbPageExtractor come with it
 * so the section can drive REAL extractor output over the committed fixtures rather than a
 * hand-written imitation of it — the whole point of the section is that the two ends of the pipeline
 * agree, and an invented middle would prove nothing about that.
 */
require __DIR__.'/../../app/Services/Catalog/ImportedSourceContent.php';
require_once __DIR__.'/../../app/Support/Gtin.php';
require_once __DIR__.'/../../app/Services/Catalog/IHerb/IHerbPageExtractor.php';

use App\Services\Catalog\IHerb\IHerbPageExtractor;
use App\Services\Catalog\ImportedProductContent;
use App\Services\Catalog\ImportedSourceContent;

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

/*
|--------------------------------------------------------------------------
| 9. THE PROMOTION-TIME CONTENT DECISION — with a source description, and without one
|--------------------------------------------------------------------------
|
| Everything above this line is about the composed copy, which exists because an imported product
| had no description. It now can have one: `source_overview_html` holds the manufacturer's own
| overview, transcribed off the product page. That changes what promotion writes into
| `products.description_fr`, what the API returns, what both product routes render, and what the
| indexing gate measures — four things that must not be able to disagree.
|
| The section is deliberately organised around the two states rather than around the methods:
|
|   ABSENT  — the permanent state of all 309 legacy hand-made products, and the current state of
|             every imported row whose page has not been read yet. The requirement is not "it works";
|             it is that the output is BYTE-IDENTICAL to what it was before any of this existed.
|             Anything else is a change to 309 live pages that earn money.
|
|   PRESENT — the new path. The manufacturer's prose leads, the composed block supports it, and the
|             one composed sentence that the new content makes FALSE is dropped rather than printed
|             above the panel it denies.
|
| The fixtures are the real ones from tests/catalog/fixtures/iherb, driven through the real
| extractor, mapped to columns exactly as ExtractExternalProductContentJob::store() maps them. A
| hand-written row would let this section pass while the pipeline that fills those columns produced
| something else.
*/
echo "\nPromotion-time content decision — source description absent\n";

/** A staging row exactly as it looks before the content pass has ever run against it. */
$rowNoContent = [
    'normalized_title' => 'Optimum Nutrition Gold Standard 100% Whey – Double Rich Chocolate – 2,27 kg',
    'source_brand_name' => 'Optimum Nutrition',
    'pack_size' => 2.27,
    'pack_unit' => 'kg',
    'flavour' => 'Double Rich Chocolate',
    'external_part_number' => 'ON-02046',
];

$composedOnly = ImportedProductContent::fromStagingRow($rowNoContent, [
    'brand' => 'Optimum Nutrition',
    'sub_category_slug' => 'whey-proteine',
    'sub_category_label' => 'Whey protéine',
    'category_label' => 'Protéines',
])['description_fr'];

check(
    'a row with no transcribed content publishes nothing at all',
    ImportedSourceContent::overviewHtml($rowNoContent) === null
        && ImportedSourceContent::sections($rowNoContent) === []
        && ImportedSourceContent::nutritionHtml($rowNoContent) === null
        && ImportedSourceContent::specs($rowNoContent) === []
        && ImportedSourceContent::gallery($rowNoContent) === []
        && ImportedSourceContent::attribution($rowNoContent) === null
        && ImportedSourceContent::schemaDescription($rowNoContent) === null,
    'this is the state of every one of the 309 legacy products, permanently, and of every imported '
        .'row whose page has not been read yet',
);

check(
    'the body is the composed block, byte for byte — no wrapper, no separator, no marker',
    ImportedSourceContent::body(null, $composedOnly) === $composedOnly,
    'promotion must write the SAME string it wrote before this pipeline existed, or every product '
        .'already promoted differs from every product promoted after the deploy for no reason',
);

check(
    'the 309 case: no staging row at all is not an error and produces no body',
    ImportedSourceContent::body(null, null) === null
        && ImportedSourceContent::publishable([]) === false
        && ImportedSourceContent::sections([]) === []
        && ImportedSourceContent::gallery([]) === []
        && ImportedSourceContent::renderedWordCount(null, []) === 0,
    'a hand-made product is handed [] by every caller; every accessor has to answer "nothing" rather '
        .'than reach for a key that is not there',
);

check(
    'the word count with no transcribed sections is exactly the old count of description_fr',
    ImportedSourceContent::renderedWordCount($composedOnly, $rowNoContent)
        === ImportedProductContent::countWords((string) $composedOnly),
    'the indexing gate must not move for a product whose page did not change. A gate that reads '
        .'differently after a deploy re-decides seo_robots_index on products nobody touched',
);

check(
    'without a nutrition panel the label_scope sentence is still composed',
    str_contains((string) $composedOnly, 'valeur nutritionnelle')
        || str_contains((string) $composedOnly, 'tableau nutritionnel')
        || str_contains((string) $composedOnly, 'chiffre nutritionnel')
        || str_contains((string) $composedOnly, 'Les valeurs nutritionnelles ne sont ajoutées'),
    'the sentence explaining why the page carries no nutrition panel is true — and must stay — on a '
        .'product that has no panel. Dropping it unconditionally would remove a true policy statement',
);

echo "\nPromotion-time content decision — source description present\n";

/**
 * The real fixture, through the real extractor, mapped exactly as the job maps it.
 *
 * The map is a copy of ExtractExternalProductContentJob::store()'s, restricted to the columns this
 * section reads. page-extractor-check.php is what holds THAT map to the extractor's FIELDS and to
 * the migration; what matters here is that this section is fed the same vocabulary the database
 * actually receives, so a column renamed on one side cannot pass on the other.
 *
 * @return array<string, mixed>
 */
$stagingRowFromFixture = static function (string $fixture): array {
    $html = (string) file_get_contents(__DIR__.'/fixtures/iherb/'.$fixture);
    $extracted = (new IHerbPageExtractor())->extract($html);

    return [
        'source_overview_html' => $extracted['overview_html'],
        'source_suggested_use_html' => $extracted['suggested_use_html'],
        'source_other_ingredients_html' => $extracted['other_ingredients_html'],
        'source_warnings_html' => $extracted['warnings_html'],
        'source_supplement_facts_html' => $extracted['supplement_facts_html'],
        'source_gallery_images' => $extracted['gallery_image_urls'],
        'source_spec_first_available' => $extracted['spec_first_available'],
        'source_spec_shipping_weight' => $extracted['spec_shipping_weight'],
        'source_spec_package_quantity' => $extracted['spec_package_quantity'],
        'source_spec_dimensions' => $extracted['spec_dimensions'],
        'source_spec_actual_weight' => $extracted['spec_actual_weight'],
        'source_gtin' => $extracted['gtin'],
        'source_content_locale' => $extracted['content_locale'],
        'source_content_translated' => $extracted['content_machine_translated'],
        'source_content_word_count' => $extracted['content_word_count'],
    ];
};

$fr1 = $stagingRowFromFixture('fr-1-doctors-best-5-htp.html');
$fr68616 = $stagingRowFromFixture('fr-68616-optimum-creatine.html');
$fr110000 = $stagingRowFromFixture('fr-110000-sassy-wonder-wheel.html');
$en1 = $stagingRowFromFixture('en-1-doctors-best-5-htp.html');
$ar1 = $stagingRowFromFixture('ar-1-doctors-best-5-htp.html');

check(
    'the fixtures really do carry a source description — otherwise this whole section proves nothing',
    ImportedSourceContent::overviewHtml($fr1) !== null
        && ImportedSourceContent::overviewHtml($fr68616) !== null,
    'extractor output changed shape and this section is now asserting things about nulls',
);

$overviewFr1 = (string) ImportedSourceContent::overviewHtml($fr1);
$bodyFr1 = (string) ImportedSourceContent::body($overviewFr1, $composedOnly);

check(
    "the manufacturer's prose LEADS the body and the composed block follows it",
    str_starts_with($bodyFr1, $overviewFr1)
        && str_ends_with($bodyFr1, (string) $composedOnly)
        && $bodyFr1 === $overviewFr1.$composedOnly,
    'the composed block exists to keep a page from being empty, not to be the page. Leading with it '
        .'means ~19,000 pages open on a sentence that differs by a substituted noun, which is the '
        .'exact shape the scaled-content policy is aimed at',
);

check(
    'nothing is rewritten, summarised or padded — the body is two stored strings concatenated',
    strlen($bodyFr1) === strlen($overviewFr1) + strlen((string) $composedOnly),
    'any transformation of the manufacturer\'s sentences here is a fabrication risk on a supplement page',
);

check(
    'a source description with NO composed block still becomes the body',
    ImportedSourceContent::body($overviewFr1, null) === $overviewFr1,
    'compose() returns nulls for a row with no brand or no rayon; the manufacturer prose must not be '
        .'lost with it',
);

// ── The composed sentence the new content makes FALSE ─────────────────────────────────────
check(
    'the fixture carries a Supplement Facts panel, so the next check is testing something',
    ImportedSourceContent::hasNutritionPanel($fr1) === true,
    'no panel in the fixture means the label_scope suppression below is asserting nothing',
);

$composedWithPanel = ImportedProductContent::fromStagingRow($rowNoContent, [
    'brand' => 'Optimum Nutrition',
    'sub_category_slug' => 'whey-proteine',
    'sub_category_label' => 'Whey protéine',
    'category_label' => 'Protéines',
    'page_has_nutrition_panel' => true,
])['description_fr'];

check(
    'the "no nutrition values are published" sentence is DROPPED when the page carries the panel',
    ! str_contains((string) $composedWithPanel, 'valeur nutritionnelle')
        && ! str_contains((string) $composedWithPanel, 'tableau nutritionnel')
        && ! str_contains((string) $composedWithPanel, 'chiffre nutritionnel')
        && ! str_contains((string) $composedWithPanel, 'valeurs nutritionnelles ne sont ajoutées'),
    'printing "aucune valeur nutritionnelle n\'est publiée" directly above a transcribed Supplement '
        .'Facts table is a stored sentence contradicting the page it is printed on — the same defect '
        .'class as a stored "disponible" beside a RUPTURE badge',
);

check(
    'and the label deferral sentence is KEPT, because it is still true beside a panel',
    str_contains((string) $composedWithPanel, "l'emballage d'origine")
        || str_contains((string) $composedWithPanel, "l'étiquette d'origine"),
    '"la composition figure sur l\'emballage d\'origine" is exactly the right disclaimer to have next '
        .'to a transcribed panel; suppressing it too would throw away a true statement',
);

check(
    'suppressing a slot does not corrupt the rest of the body',
    $composedWithPanel !== null && $composedWithPanel !== '' && $composedWithPanel !== $composedOnly,
    'the plan must still execute; only the one contradicted sentence may disappear',
);

// ── The language gate ─────────────────────────────────────────────────────────────────────
check(
    'a French page publishes; an English one and an Arabic one publish NOTHING',
    ImportedSourceContent::publishable($fr1) === true
        && ImportedSourceContent::publishable($en1) === false
        && ImportedSourceContent::publishable($ar1) === false
        && ImportedSourceContent::sections($ar1) === []
        && ImportedSourceContent::overviewHtml($en1) === null
        && ImportedSourceContent::nutritionHtml($ar1) === null
        && ImportedSourceContent::gallery($ar1) === []
        && ImportedSourceContent::attribution($en1) === null,
    'www.iherb.com 302s a Tunisian IP to tn.iherb.com, which serves Arabic. "The pipeline stored '
        .'text" is not the same statement as "the pipeline stored French text", and the difference is '
        .'an Arabic paragraph on a French product page',
);

check(
    'a regional French locale still publishes',
    ImportedSourceContent::publishable(['source_content_locale' => 'fr-CA']) === true
        && ImportedSourceContent::publishable(['source_content_locale' => 'FR']) === true,
    'the gate matches a LANGUAGE, not one exact tag — fr-CA is French',
);

check(
    'a missing locale is not French',
    ImportedSourceContent::publishable(['source_content_locale' => null]) === false
        && ImportedSourceContent::publishable(['source_content_locale' => '']) === false
        && ImportedSourceContent::publishable(['source_content_locale' => 'french']) === false,
    'a row that predates the column, or one whose language was never recorded, must publish nothing '
        .'rather than be assumed',
);

// ── What is transcribed, and what is refused ──────────────────────────────────────────────
$specKeys = array_column(ImportedSourceContent::specs($fr1), 'key');
$specValues = implode(' | ', array_column(ImportedSourceContent::specs($fr1), 'value'));

/*
 * THIS EXPECTATION WAS DELIBERATELY CHANGED, AND HERE IS WHY IT WAS THE EXPECTATION THAT WAS WRONG.
 *
 * It used to require ['dimensions', 'actual_weight'] — i.e. it PINNED the publication of
 * `source_spec_actual_weight` under the label "Poids réel". Two measurements against the committed
 * fixtures say that row should never have been published:
 *
 *   · grep "Poids réel" over tests/catalog/fixtures/iherb/ returns nothing. The French page labels
 *     `product-shipping-weight-label` "Poids de l'article" and gives `#actual-weight` no label at
 *     all (it shares an <li> whose visible label is "Dimensions:"). "Poids réel" was our invention,
 *     printed to customers on ~19,000 pages.
 *   · fr-68616 (a 600 g creatine tub) prints shipping weight 0,68 kg AND #actual-weight 0,68 kg —
 *     the same number. ImportedSourceContent refuses the first because it measures iHerb's carton;
 *     publishing the identical value as the product's "real weight", directly under
 *     "Format : 600 g", published exactly what that refusal exists to prevent.
 *
 * So the check now asserts the narrower list, and the refusal check below covers the withdrawn
 * column too — the row is still extracted and stored, it is simply not printed.
 */
check(
    'the only specification row published is the one whose label the page itself prints',
    $specKeys === ['dimensions'],
    'got ['.implode(', ', $specKeys).']. The source\'s SHIPPING weight measures their packaging and '
        .'their carrier; "actual weight" is the same figure with a label we would have to invent; '
        .'"first available" is a date in THEIR catalogue; "package quantity" is the pack size we '
        .'already print from the product name, in different words, one row away',
);

check(
    'the refused spec columns are present on the row, so the refusal is a decision and not an absence',
    trim((string) $fr1['source_spec_shipping_weight']) !== ''
        && trim((string) $fr1['source_spec_first_available']) !== ''
        && trim((string) $fr1['source_spec_package_quantity']) !== ''
        && trim((string) $fr1['source_spec_actual_weight']) !== ''
        && ! str_contains($specValues, (string) $fr1['source_spec_shipping_weight'])
        && ! str_contains($specValues, (string) $fr1['source_spec_first_available'])
        && ! str_contains($specValues, (string) $fr1['source_spec_actual_weight']),
    'if the fixture carried no shipping weight the check above would pass for the wrong reason',
);

check(
    'the two weights the source page prints are the SAME number on a real product',
    (function (): bool {
        global $fr68616;

        return trim((string) $fr68616['source_spec_shipping_weight'])
            === trim((string) $fr68616['source_spec_actual_weight']);
    })(),
    'this is the evidence for withdrawing the "Poids réel" row: on a 600 g tub the page reports '
        .'0,68 kg as the shipping weight AND as #actual-weight, so the second is not an independent '
        .'measurement of the product. If iHerb ever makes them differ, revisit the decision — but '
        .'only together with a label transcribed from the page',
);

check(
    'the sections are the three prose blocks, in the order both routes print them',
    array_column(ImportedSourceContent::sections($fr1), 'key')
        === ['suggested_use', 'other_ingredients', 'warnings'],
    'the order of ImportedSourceContent::SECTION_COLUMNS IS the render order on both routes; two JSX '
        .'files cannot be relied on to sort the same way',
);

check(
    'every section carries our heading and the source\'s verbatim markup',
    (function (): bool {
        global $fr1;
        foreach (ImportedSourceContent::sections($fr1) as $section) {
            if (trim($section['heading']) === '' || trim($section['html']) === '') {
                return false;
            }
            if ($section['html'] !== $fr1[array_search($section['key'], ImportedSourceContent::SECTION_COLUMNS, true)]) {
                return false;
            }
        }

        return true;
    })(),
    'a heading is ours; the block is theirs. Rewriting a warnings block is a fabrication on a text a '
        .'customer acts on',
);

check(
    'a product page with no ingredients and no panel simply has fewer sections',
    array_column(ImportedSourceContent::sections($fr110000), 'key') === ['suggested_use', 'warnings']
        && ImportedSourceContent::nutritionHtml($fr110000) === null,
    'fixture 110000 is a toy: no Supplement Facts, no ingredient list. An absent block must be absent, '
        .'never filled from a neighbouring one',
);

// ── The gallery ───────────────────────────────────────────────────────────────────────────
$gallery = ImportedSourceContent::gallery($fr1);

check(
    'the gallery is the enumerated one from the page, not a probe of 1..n',
    count($gallery) > 1 && count($gallery) === count(array_unique($gallery)),
    'got '.count($gallery).' image(s). Migration 2026_08_10_000008 recorded that a gallery was '
        .'impossible against the JSON payload; the PAGE lists them, which is why these are not guesses',
);

check(
    'every gallery URL is https, on an allow-listed CDN host, at the size the cover uses',
    (function () use ($gallery): bool {
        foreach ($gallery as $url) {
            if (! str_starts_with($url, 'https://cloudinary.images-iherb.com/')) {
                return false;
            }
            if (preg_match('~/[smkr]/\d+\.jpg$~', $url) === 1) {
                return false;
            }
        }

        return $gallery !== [];
    })(),
    'these strings go into a next/image `src`, and next/image THROWS on a host that is not in '
        .'images.remotePatterns rather than degrading. The size rewrite is the same /l/ variant '
        .'CatalogIHerbPromote::coverUrl() already requests from the same folder',
);

check(
    'a URL that is not the documented path shape is passed through UNCHANGED, not mangled',
    ImportedSourceContent::gallery([
        'source_content_locale' => 'fr',
        'source_gallery_images' => ['https://cloudinary.images-iherb.com/some/other/shape.jpg'],
    ]) === ['https://cloudinary.images-iherb.com/some/other/shape.jpg'],
    'a scheme change must cost us thumbnails, never broken images',
);

check(
    'a foreign host and a non-https URL are dropped outright',
    ImportedSourceContent::gallery([
        'source_content_locale' => 'fr',
        'source_gallery_images' => [
            'http://cloudinary.images-iherb.com/image/upload/x/images/drb/drb00077/s/97.jpg',
            'https://evil.example.com/image/upload/x/images/drb/drb00077/s/97.jpg',
            '',
            42,
        ],
    ]) === [],
    'an unlisted host does not render, it throws — and a page that throws is worse than a page with '
        .'one photo',
);

check(
    'the gallery survives arriving as a JSON string rather than an array',
    ImportedSourceContent::gallery([
        'source_content_locale' => 'fr',
        'source_gallery_images' => '["https://cloudinary.images-iherb.com/image/upload/f_auto/images/drb/drb00077/s/97.jpg"]',
    ]) === ['https://cloudinary.images-iherb.com/image/upload/f_auto/images/drb/drb00077/l/97.jpg'],
    'the API reads a cast model and promotion reads Model::getAttributes(); one of those hands over '
        .'the raw JSON, and a class that only accepts one of the two silently publishes nothing on '
        .'the other path',
);

// ── The provenance note ───────────────────────────────────────────────────────────────────
$attribution = (string) ImportedSourceContent::attribution($fr1);

check(
    'fr.iherb.com is declared machine translated by the fixture, so the note has to say so',
    $fr1['source_content_translated'] === true
        && str_contains($attribution, 'traduction automatique')
        && str_contains($attribution, 'étiquette'),
    'the transcribed sentences include suggested use and contraindications. A customer reading '
        .'"prenez 1 capsule par jour" is entitled to know the French is a translation engine\'s and '
        .'that the printed label governs',
);

check(
    'an unverified translation state asserts nothing about translation',
    (function (): bool {
        $note = (string) ImportedSourceContent::attribution([
            'source_content_locale' => 'fr',
            'source_content_translated' => null,
            'source_overview_html' => '<p>Texte du fabricant.</p>',
        ]);

        return $note !== '' && ! str_contains($note, 'traduction');
    })(),
    'NULL means "this locale\'s notice is not one the extractor has verified" — saying nothing is '
        .'right; asserting there was no translation is not',
);

check(
    'an un-cast 1 from the driver still produces the translation notice',
    str_contains(
        (string) ImportedSourceContent::attribution([
            'source_content_locale' => 'fr',
            'source_content_translated' => 1,
            'source_overview_html' => '<p>Texte du fabricant.</p>',
        ]),
        'traduction automatique'
    ),
    'promotion hands over Model::getAttributes(), which is whatever the driver returned. A strict '
        .'=== true there would silently drop the disclosure on every promoted product',
);

check(
    'the note is not attached to a page that renders nothing',
    ImportedSourceContent::attribution(['source_content_locale' => 'fr']) === null,
    'a provenance note under an empty section is noise',
);

check(
    'the note breaks none of the rules the composed copy is held to',
    ImportedProductContent::unsupportedAssertions($attribution) === [],
    'it is stored copy on ~19,000 pages like any other: no price, no stock, no availability, no '
        .'delivery, no import, no review',
);

check(
    'the note names no retailer and links nowhere',
    ! str_contains(strtolower($attribution), 'iherb')
        && ! str_contains($attribution, 'http')
        && ! str_contains($attribution, '<a '),
    'attribution here is about the RELIABILITY of the text. Pointing ~19,000 product pages at the '
        .'shop we read them from is a different act, and not one to perform by way of a footnote',
);

// ── What must never be published, asserted against the class source ───────────────────────
$sourceContentSource = (string) file_get_contents(__DIR__.'/../../app/Services/Catalog/ImportedSourceContent.php');
$sourceContentCode = (string) preg_replace(['~/\*[\s\S]*?\*/~', '~(^|[^:])//.*$~m'], ['', '$1'], $sourceContentSource);

check(
    'no rating, no review count, and no link to the shop we sourced from, anywhere in the code',
    ! str_contains($sourceContentCode, 'source_rating')
        && ! str_contains($sourceContentCode, 'source_content_url')
        && ! str_contains($sourceContentCode, 'source_manufacturer_url')
        && ! str_contains($sourceContentCode, 'aggregateRating'),
    'the comments explain each refusal and the CODE must not reach for the column anyway. '
        .'source_rating/source_rating_count are internal reference only and stop at the staging table',
);

check(
    'the refused spec columns are named in the prose and absent from the code',
    str_contains($sourceContentSource, 'source_spec_shipping_weight')
        && ! str_contains($sourceContentCode, 'source_spec_shipping_weight')
        && ! str_contains($sourceContentCode, 'source_spec_first_available')
        && ! str_contains($sourceContentCode, 'source_spec_package_quantity'),
    'a refusal that is only a comment is not a refusal; a refusal with no comment is a mystery in six '
        .'months',
);

// ── The indexing gate, over the real thing ────────────────────────────────────────────────
echo "\nWhat the indexing gate now measures\n";

$gateSamples = [
    'fr-1 (Doctor\'s Best 5-HTP)' => $fr1,
    'fr-68616 (Optimum creatine)' => $fr68616,
    'fr-110000 (a toy)' => $fr110000,
];

$clears = 0;
foreach ($gateSamples as $label => $row) {
    $composed = ImportedProductContent::fromStagingRow($rowNoContent, [
        'brand' => 'Optimum Nutrition',
        'sub_category_slug' => 'whey-proteine',
        'sub_category_label' => 'Whey protéine',
        'category_label' => 'Protéines',
        'page_has_nutrition_panel' => ImportedSourceContent::hasNutritionPanel($row),
    ])['description_fr'];

    $body = ImportedSourceContent::body(ImportedSourceContent::overviewHtml($row), $composed);
    $words = ImportedSourceContent::renderedWordCount($body, $row);
    $composedWords = ImportedProductContent::countWords((string) $composed);

    if ($words >= 250) {
        $clears++;
    }

    printf(
        "  INFO  %-30s %4d words rendered (%d composed + %d transcribed) — %s the 250-word gate\n",
        $label,
        $words,
        $composedWords,
        $words - $composedWords,
        $words >= 250 ? 'CLEARS' : 'below',
    );
}

printf(
    "        %d of %d fixture products clear it. That is a THREE-PRODUCT sample of committed\n",
    $clears,
    count($gateSamples),
);
echo "        fixtures, not a projection over 19,000 — the real proportion is whatever\n";
echo "        `catalog:iherb:promote --publish --dry-run` reports over the actual backlog, and it\n";
echo "        is bounded by how many rows the content pass has reached at all.\n";
echo "        What IS asserted below is that the number moved for the right reason.\n";

check(
    'a transcribed page measures strictly more than the composed block alone',
    (function () use ($fr1, $composedOnly): bool {
        $body = ImportedSourceContent::body(ImportedSourceContent::overviewHtml($fr1), $composedOnly);

        return ImportedSourceContent::renderedWordCount($body, $fr1)
            > ImportedProductContent::countWords((string) $composedOnly);
    })(),
    'if the gate cannot see the new content, every product it was written for still publishes '
        .'noindexed and the whole pass changes nothing a search engine can act on',
);

check(
    'the Supplement Facts table is NOT counted, however large it is',
    (function () use ($fr1): bool {
        $withoutPanel = $fr1;
        $withoutPanel['source_supplement_facts_html'] = null;

        return ImportedSourceContent::renderedWordCount('<p>a</p>', $fr1)
            === ImportedSourceContent::renderedWordCount('<p>a</p>', $withoutPanel);
    })(),
    'countWords() counts every token longer than one character, so a nutrient table contributes its '
        .'figures, units and daily-value percentages as "words". Letting it answer "is there enough '
        .'readable copy here" clears the gate for pages with nothing to read',
);

check(
    'content in a language we do not publish counts as zero, exactly as it renders',
    ImportedSourceContent::renderedWordCount('<p>corps</p>', $ar1)
        === ImportedProductContent::countWords('<p>corps</p>'),
    'the gate must measure the page that renders. Counting words nobody is served would index a page '
        .'on the strength of text it does not carry',
);

echo "\n".($failed === 0 ? 'ALL PASS' : $failed.' FAILED')." ({$checks} checks)\n\n";

exit($failed === 0 ? 0 : 1);
