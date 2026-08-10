<?php

/**
 * IHerbPageExtractor — what it reads off a real iHerb product page, and what it refuses to invent.
 *
 * Run it anywhere PHP exists, with no vendor/, no database and no artisan:
 *
 *     php filament/tests/catalog/page-extractor-check.php
 *
 * ── THE FAILURE THIS FILE EXISTS TO CATCH ─────────────────────────────────────────────────
 * "A regex that works on one page and silently returns null on the other 47,000." An extractor is
 * uniquely good at that: it produces plausible output on the page its author was looking at, and
 * NULL — which reads exactly like "the source does not have this" — on every page they were not.
 *
 * So nothing here is asserted in the abstract. Every case names a product, names a field, and names
 * the value it must have, against MARKUP THAT WAS ACTUALLY SERVED. tests/catalog/fixtures/iherb/
 * holds verbatim slices of five real responses, each carrying the byte length and sha256 of the
 * document it was cut from:
 *
 *     fr-1-doctors-best-5-htp.html        fr.iherb.com   a supplement with every section present
 *     en-1-doctors-best-5-htp.html        ca.iherb.com   the SAME product in English
 *     ar-1-doctors-best-5-htp.html        tn.iherb.com   the SAME product in Arabic, dir="rtl"
 *     fr-68616-optimum-creatine.html      fr.iherb.com   a sports powder — a different panel shape
 *     fr-110000-sassy-wonder-wheel.html   fr.iherb.com   a TOY: no ingredients, no Supplement Facts
 *
 * The last one is the important one. Three supplement pages agree about everything, including the
 * ORDER of their sections, and an extractor that keys off position passes all three. Product 110000
 * has no ingredients block at all, so the second `div.prodOverviewDetail` means "warnings" there and
 * "warnings" is the third one elsewhere. A positional rule files directions under warnings on a
 * supplement page, and that is a sentence a customer swallows.
 *
 * The three locales of product 1 are the other half: they prove the fields that must be found by
 * MARKUP are found without reading a word of the page, and they pin down the one pair of fields that
 * genuinely cannot be.
 *
 * ── ASSERTS NAMED CASES, NEVER TOTALS ─────────────────────────────────────────────────────
 * Same rule as every other harness in this directory: "23 of 25 pass" cannot tell you which two.
 */
require_once __DIR__.'/../../app/Support/Gtin.php';
require_once __DIR__.'/../../app/Services/Catalog/IHerb/IHerbPageExtractor.php';

/**
 * IHerbClient `use`s PoliteFetcher and Log and is still requirable here: PHP resolves a type hint
 * only when the constructor actually runs, and nothing below constructs one. The same property
 * promotion-gate-check.php and normalizer-payload-capture-check.php rely on.
 */
require_once __DIR__.'/../../app/Services/Catalog/IHerb/IHerbClient.php';

use App\Services\Catalog\IHerb\IHerbPageExtractor;

$failed = 0;

function check(string $name, bool $ok, string $detail): void
{
    global $failed;

    if (! $ok) {
        $failed++;
    }

    printf("  %s  %s\n", $ok ? 'PASS' : 'FAIL', $name);
    if (! $ok) {
        printf("        %s\n", $detail);
    }
}

function fixture(string $name): string
{
    $path = __DIR__.'/fixtures/iherb/'.$name;

    if (! is_file($path)) {
        fwrite(STDERR, "Missing fixture: {$path}\n");
        exit(1);
    }

    return (string) file_get_contents($path);
}

$extractor = new IHerbPageExtractor();

$pages = [
    'fr-1' => fixture('fr-1-doctors-best-5-htp.html'),
    'en-1' => fixture('en-1-doctors-best-5-htp.html'),
    'ar-1' => fixture('ar-1-doctors-best-5-htp.html'),
    'fr-68616' => fixture('fr-68616-optimum-creatine.html'),
    'fr-110000' => fixture('fr-110000-sassy-wonder-wheel.html'),
];

$got = [];
foreach ($pages as $key => $html) {
    $got[$key] = $extractor->extract($html);
}

echo "\n".str_repeat('═', 100)."\n";
echo "IHerbPageExtractor — real markup, named products, named fields\n";
echo str_repeat('═', 100)."\n\n";

/*
|--------------------------------------------------------------------------
| 1. Every field, on the page every field is present on
|--------------------------------------------------------------------------
| Product 1 in French. `contains` rather than equality for the prose, because the assertion that
| matters is "this is the manufacturer's sentence off that page", and pinning 400 characters of
| French into a PHP file makes the check about the fixture's whitespace instead.
*/
echo "1. Doctor's Best 5-HTP (id 1), fr.iherb.com — the complete page\n\n";

$fr1 = $got['fr-1'];

/** [field, needle, why it is this needle] */
$fr1Cases = [
    ['overview_html', 'Favorise le bien-être mental et émotionnel', 'the overview bullet list is the description iHerb renders'],
    ['overview_html', 'Griffonia simplicifolia', 'and the prose paragraph under it, not just the bullets'],
    ['suggested_use_html', 'prenez 1 capsule par jour', 'the DOSAGE. Transcribed, never computed or advised'],
    ['other_ingredients_html', 'Hypromellose (capsule végétarienne)', 'the excipients list, verbatim'],
    ['warnings_html', "inhibiteurs de monoamine oxydase", 'the contraindication — the sentence that most has to be right'],
    ['warnings_html', 'Tenir hors de portée des enfants', 'and every paragraph of it, not only the first'],
    ['supplement_facts_html', '5-HTP (5-hydroxy L-tryptophane)', 'the Supplement Facts panel, as the real table iHerb renders'],
    ['supplement_facts_html', '<table', 'kept AS a table: the row/column structure is the panel'],
    ['manufacturer_url', 'drbvitamins.com', "the manufacturer's own site — a primary source, unlike a retailer"],
];

foreach ($fr1Cases as [$field, $needle, $why]) {
    $value = (string) ($fr1[$field] ?? '');
    check(
        sprintf('%-24s contains %s', $field, var_export(mb_substr($needle, 0, 42), true)),
        str_contains($value, $needle),
        sprintf('got %s… — %s', var_export(mb_substr($value, 0, 90), true), $why),
    );
}

/** Exact values, where the page prints an exact value. */
$fr1Exact = [
    ['content_locale', 'fr', 'which language the stored prose is in is a fact about the prose'],
    ['content_canonical_url', 'https://fr.iherb.com/pr/doctor-s-best-5-htp-100-mg-60-veggie-caps/1', 'the canonical iHerb itself declares'],
    ['content_machine_translated', true, "iHerb's own disclaimer says the French page is machine translated"],
    ['spec_first_available', '06/2007', 'transcribed as printed, not reformatted into a date type'],
    ['spec_shipping_weight', '0,05 kg', 'French decimal comma kept — it is what the page prints'],
    ['spec_package_quantity', '60 Pièce', ''],
    ['spec_dimensions', '9,7 x 5,1 x 5,1 cm', ''],
    ['spec_actual_weight', '0,04 kg', ''],
    ['spec_part_number', 'DRB-00077', 'cross-checked against the row before anything is written'],
    ['gtin', '753950000773', 'THE BARCODE — and its GS1 check digit verifies'],
];

foreach ($fr1Exact as [$field, $want, $why]) {
    $value = $fr1[$field] ?? null;
    check(
        sprintf('%-24s === %s', $field, var_export($want, true)),
        $value === $want,
        sprintf('got %s — %s', var_export($value, true), $why),
    );
}

/*
|--------------------------------------------------------------------------
| 2. The gallery. Real URLs off the page, not indices probed until one 404s
|--------------------------------------------------------------------------
| Migration 2026_08_10_000008 and CatalogIHerbPromote::coverUrl() both record that a gallery was
| impossible, and against the JSON payload it was: a primary index, no count, so building one meant
| probing 1..n and storing URLs that 404. The HTML page lists them in its og:image run.
*/
echo "\n2. The image gallery — the thing the JSON payload could not give us\n\n";

$gallery = $fr1['gallery_image_urls'];

check(
    'gallery has 9 product images for id 1',
    count($gallery) === 9,
    sprintf('got %d — indices 97, 102 and 105-111 are what the page emits', count($gallery)),
);

check(
    'the first gallery image is the primary (index 97)',
    ($gallery[0] ?? '') === 'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/drb/drb00077/s/97.jpg',
    sprintf('got %s — primaryImageIndex in the JSON payload is 97, and the two agree', var_export($gallery[0] ?? null, true)),
);

check(
    "iHerb's CMS banner is NOT in the gallery",
    ! array_filter($gallery, static fn (string $u): bool => str_contains($u, '/images/cms/')),
    'the og:image run ends with dPDP-ROW-Quality-Promise_007fr-fr.jpg — that is iHerb advertising, '
    .'not a photograph of the product, and putting it in a protein.tn gallery would republish it as ours',
);

check(
    'every gallery URL is an absolute https iHerb CDN URL',
    $gallery !== [] && ! array_filter(
        $gallery,
        static fn (string $u): bool => ! str_starts_with($u, 'https://cloudinary.images-iherb.com/'),
    ),
    'a relative or foreign URL in this column becomes a broken <img> on a live page',
);

check(
    'a product with fewer images reports fewer, not a padded list',
    count($got['fr-110000']['gallery_image_urls']) === 3,
    sprintf('got %d for id 110000 — the count is read, never assumed', count($got['fr-110000']['gallery_image_urls'])),
);

/*
|--------------------------------------------------------------------------
| 3. ABSENCE. The half of the job that has to return null rather than garbage
|--------------------------------------------------------------------------
| Sassy Wonder Wheel (110000) is a baby toy. It has an overview, directions and warnings — and no
| ingredients block and no Supplement Facts panel, because it is not something you eat.
|
| An extractor that took "the 2nd prodOverviewDetail" as warnings passes on all three supplement
| pages above and files the DISCLAIMER as this product's warnings. An extractor that took "whatever
| is in the ingredients slot" would report a toy's ingredients as its packaging copy.
*/
echo "\n3. Sassy Wonder Wheel (id 110000) — a page with sections MISSING\n\n";

$toy = $got['fr-110000'];

$absent = [
    ['other_ingredients_html', 'a toy has no ingredients block on the page — and none is invented'],
    ['supplement_facts_html', 'nor a Supplement Facts panel. NULL, not the nearest table on the page'],
];

foreach ($absent as [$field, $why]) {
    check(
        sprintf('%-24s === null', $field),
        // Not `?? null`: `??` returns the DEFAULT for a null value, so `$x ?? 'set' === null` can
        // never be true and the check would fail on exactly the outcome it is asserting.
        array_key_exists($field, $toy) && $toy[$field] === null,
        sprintf('got %s — %s', var_export(mb_substr((string) $toy[$field], 0, 80), true), $why),
    );
}

$present = [
    ['overview_html', 'Captez l\'attention de bébé', 'the sections that ARE there still land'],
    ['suggested_use_html', 'Nettoyez soigneusement avant la première utilisation', 'directions, from the block after ITS OWN heading'],
    ['warnings_html', 'Retirer tous les emballages', 'THE CHECK THAT MATTERS: warnings is the warnings block'],
];

foreach ($present as [$field, $needle, $why]) {
    check(
        sprintf('%-24s contains %s', $field, var_export(mb_substr($needle, 0, 36), true)),
        str_contains((string) ($toy[$field] ?? ''), $needle),
        sprintf('got %s… — %s', var_export(mb_substr((string) ($toy[$field] ?? ''), 0, 90), true), $why),
    );
}

check(
    'warnings on the toy is NOT the disclaimer',
    ! str_contains((string) ($toy['warnings_html'] ?? ''), 'iHerb'),
    'with the ingredients block missing, the disclaimer is the very next prodOverviewDetail after '
    .'warnings. A positional rule lands on it, and the page then says iHerb\'s legal boilerplate is '
    .'this product\'s safety warning',
);

check(
    'the disclaimer is never stored as product copy',
    ! str_contains(
        (string) ($fr1['overview_html'] ?? '').($fr1['suggested_use_html'] ?? '').($fr1['warnings_html'] ?? ''),
        'iHerb ne garantit pas',
    ),
    'it is byte-identical on all 47,537 pages and it names another shop on a protein.tn page',
);

check(
    'a toy still yields its barcode',
    ($toy['gtin'] ?? null) === '037977801606',
    sprintf('got %s — the specs list is read by markup and value shape, not by category', var_export($toy['gtin'] ?? null, true)),
);

/*
|--------------------------------------------------------------------------
| 4. THE SAME PRODUCT IN THREE LOCALES
|--------------------------------------------------------------------------
| iHerb publishes 101 hreflang alternates. Everything that can be found by CLASS or ID must be found
| in all of them without reading a word; the two fields that share a class must be found by heading,
| and that is exactly why the heading table is short and fixture-backed.
*/
echo "\n4. Product 1 in French, English and Arabic — locale independence, and its limit\n\n";

foreach (['fr-1' => 'fr', 'en-1' => 'en-CA', 'ar-1' => 'ar-TN'] as $key => $locale) {
    check(
        sprintf('%-6s content_locale === %s', $key, var_export($locale, true)),
        ($got[$key]['content_locale'] ?? null) === $locale,
        sprintf('got %s — read from <html lang>', var_export($got[$key]['content_locale'] ?? null, true)),
    );
}

/** Found by markup alone: identical across every locale, because the class names are. */
foreach (['fr-1', 'en-1', 'ar-1'] as $key) {
    check(
        sprintf('%-6s gtin === 753950000773 (markup-keyed, locale-free)', $key),
        ($got[$key]['gtin'] ?? null) === '753950000773',
        sprintf('got %s — the barcode label is a different word in each locale; its VALUE is not', var_export($got[$key]['gtin'] ?? null, true)),
    );

    check(
        sprintf('%-6s spec_part_number === DRB-00077', $key),
        ($got[$key]['spec_part_number'] ?? null) === 'DRB-00077',
        sprintf('got %s', var_export($got[$key]['spec_part_number'] ?? null, true)),
    );

    check(
        sprintf('%-6s gallery is the same 9 images', $key),
        $got[$key]['gallery_image_urls'] === $got['fr-1']['gallery_image_urls'],
        'og:image is markup, not prose — the same product must not have a different gallery per language',
    );

    check(
        sprintf('%-6s other_ingredients found without reading its heading', $key),
        ($got[$key]['other_ingredients_html'] ?? null) !== null,
        'div.prodOverviewIngred is unique and identical in every locale — this must never depend on the word',
    );

    check(
        sprintf('%-6s supplement_facts found without reading its heading', $key),
        ($got[$key]['supplement_facts_html'] ?? null) !== null,
        'div.supplement-facts-container, likewise',
    );
}

/** Found by heading: the ONE ambiguity, and the three locales the fixtures actually prove. */
$headingKeyed = [
    ['fr-1', 'suggested_use_html', 'prenez 1 capsule par jour'],
    ['fr-1', 'warnings_html', 'Ne pas utiliser'],
    ['en-1', 'suggested_use_html', 'Take 1 capsule daily'],
    ['en-1', 'warnings_html', 'Not to be used'],
    ['ar-1', 'suggested_use_html', 'كبسولة واحدة'],
    ['ar-1', 'warnings_html', 'لا يُستخدم'],
];

foreach ($headingKeyed as [$key, $field, $needle]) {
    check(
        sprintf('%-6s %-22s contains %s', $key, $field, var_export(mb_substr($needle, 0, 26), true)),
        str_contains((string) ($got[$key][$field] ?? ''), $needle),
        'suggested use and warnings share div.prodOverviewDetail; only the heading tells them apart, '
        .'so each supported locale needs a fixture that proves it',
    );
}

check(
    'no locale reports an unclassified section',
    $got['fr-1']['unmapped_sections'] === []
        && $got['en-1']['unmapped_sections'] === []
        && $got['ar-1']['unmapped_sections'] === [],
    sprintf(
        'fr=%s en=%s ar=%s — a non-empty list here means two content fields silently went NULL',
        json_encode($got['fr-1']['unmapped_sections'], JSON_UNESCAPED_UNICODE),
        json_encode($got['en-1']['unmapped_sections'], JSON_UNESCAPED_UNICODE),
        json_encode($got['ar-1']['unmapped_sections'], JSON_UNESCAPED_UNICODE),
    ),
);

/*
|--------------------------------------------------------------------------
| 5. An UNKNOWN locale must fail loudly, not quietly
|--------------------------------------------------------------------------
| The mutation below is three string replacements on REAL markup: `lang` and the two ambiguous
| headings are swapped for their Spanish wording, which is what es.iherb.com would actually serve and
| which IHerbPageExtractor::HEADINGS deliberately does not list (no fixture, no claim).
|
| The heading is replaced in ITS ENTITY-ENCODED FORM, because that is how iHerb serves it —
| `Usage sugg&#xE9;r&#xE9;`. Replacing the decoded string silently matches nothing, which would make
| this whole block assert that the unchanged French page still works.
|
| Everything markup-keyed must still be found. The two heading-keyed fields must be NULL and the
| headings must be RECORDED — because a NULL nobody records is the failure this whole file is about.
*/
echo "\n5. A locale the extractor has never seen — visible zero, not silent zero\n\n";

$spanish = str_replace(
    ['lang="fr"', 'Usage sugg&#xE9;r&#xE9;', 'Avertissements'],
    ['lang="es-ES"', 'Modo de empleo', 'Advertencias'],
    $pages['fr-1'],
);

check(
    'the mutation actually changed the markup',
    $spanish !== $pages['fr-1']
        && str_contains($spanish, 'Modo de empleo')
        && ! str_contains($spanish, 'Usage sugg&#xE9;r&#xE9;'),
    'a str_replace that matches nothing turns every assertion below into a re-test of the French page',
);

$es = $extractor->extract($spanish);

check(
    'unknown locale: suggested_use_html === null',
    array_key_exists('suggested_use_html', $es) && $es['suggested_use_html'] === null,
    'a heading the extractor cannot map must never be guessed from position',
);

check(
    'unknown locale: warnings_html === null',
    array_key_exists('warnings_html', $es) && $es['warnings_html'] === null,
    'likewise — and NULL here is far better than the disclaimer filed as a safety warning',
);

check(
    'unknown locale: both headings are RECORDED in unmapped_sections',
    in_array('Modo de empleo', $es['unmapped_sections'], true)
        && in_array('Advertencias', $es['unmapped_sections'], true),
    sprintf(
        'got %s — this column is what turns "two fields are mysteriously NULL on 47,000 rows" into a '
        .'line catalog:iherb:content --status prints on the first run',
        json_encode($es['unmapped_sections'], JSON_UNESCAPED_UNICODE),
    ),
);

check(
    'unknown locale: markup-keyed fields are UNAFFECTED',
    ($es['gtin'] ?? null) === '753950000773'
        && ($es['other_ingredients_html'] ?? null) !== null
        && ($es['supplement_facts_html'] ?? null) !== null
        && count($es['gallery_image_urls']) === 9,
    'the whole reason class-first exists: an unknown language costs two fields, not the page',
);

check(
    'unknown locale: machine_translated === null, not false',
    array_key_exists('content_machine_translated', $es) && $es['content_machine_translated'] === null,
    'es is neither a source language nor a locale whose translation notice we have verified. `false` '
    .'would read as "these are the manufacturer\'s own words", which is a claim nobody has checked',
);

/*
|--------------------------------------------------------------------------
| 6. Machine translation is a measurement carried WITH the text
|--------------------------------------------------------------------------
| The one fact that decides whether the stored French sentences are the manufacturer's words or a
| translation engine's. It is on the page, in iHerb's own disclaimer, on every non-English locale.
*/
echo "\n6. Did iHerb declare the page machine translated?\n\n";

check(
    'fr → true  (iHerb says so itself)',
    $got['fr-1']['content_machine_translated'] === true,
    '"Ce site web a été traduit automatiquement... iHerb ne garantit pas que les traductions sont '
    .'complètes ou exemptes d\'erreurs" — on a page whose transcribed text includes a dosage',
);

check(
    'en → false (the source language: no notice, and none needed)',
    $got['en-1']['content_machine_translated'] === false,
    'ca.iherb.com\'s disclaimer carries no translation sentence at all — verify against the fixture, '
    .'not against an assumption that English is always original',
);

check(
    'ar → true',
    $got['ar-1']['content_machine_translated'] === true,
    'tn.iherb.com is what a Tunisian IP is redirected to, and it is translated too',
);

/*
|--------------------------------------------------------------------------
| 7. Transcribe, never rewrite — the sanitiser removes code and only code
|--------------------------------------------------------------------------
*/
echo "\n7. What sanitisation is allowed to remove\n\n";

$withScript = str_replace(
    '<p id="isPasted">Chez Doctor\'s Best',
    '<script>alert(1)</script><p id="isPasted" onclick="steal()">Chez Doctor\'s Best',
    $pages['fr-1'],
);

$sanitised = $extractor->extract($withScript);

check(
    'a <script> in the source is not stored',
    ! str_contains((string) $sanitised['overview_html'], '<script'),
    'this HTML is written to a column that a product page will render. Refusing to STORE executable '
    .'markup is not editing the manufacturer\'s copy',
);

check(
    'an on* handler is not stored',
    ! str_contains((string) $sanitised['overview_html'], 'onclick'),
    'likewise',
);

check(
    'and NOT ONE WORD of the text is lost to it',
    trim(preg_replace('~\s+~u', ' ', strip_tags((string) $sanitised['overview_html'])))
        === trim(preg_replace('~\s+~u', ' ', strip_tags((string) $fr1['overview_html']))),
    'the sanitiser must be provably incapable of dropping a sentence — if this ever fails, it is '
    .'silently editing product copy, which is the one thing this pipeline may not do',
);

check(
    'the Supplement Facts panel keeps its table structure',
    str_contains((string) $fr1['supplement_facts_html'], '<tr')
        && str_contains((string) $fr1['supplement_facts_html'], '<td'),
    'a panel flattened to text is no longer a panel: the rows and columns ARE the information',
);

/*
|--------------------------------------------------------------------------
| 8. A page that is not a product page yields nothing, and says so
|--------------------------------------------------------------------------
*/
echo "\n8. Rubbish in — nulls out, never plausible values\n\n";

$notAPage = [
    ['', 'an empty body'],
    ['<html lang="fr"><body><h1>Oops</h1></body></html>', 'an error page'],
    ['<html><body><div class="container product-overview" id="product-overview"></div></body></html>', 'the container, empty'],
    ['{"id":1,"displayName":"5-HTP"}', 'the JSON payload fed in by mistake'],
];

foreach ($notAPage as [$html, $what]) {
    $result = $extractor->extract($html);

    check(
        sprintf('%-28s → every content field null', $what),
        $result['overview_html'] === null
            && $result['suggested_use_html'] === null
            && $result['other_ingredients_html'] === null
            && $result['warnings_html'] === null
            && $result['supplement_facts_html'] === null
            && $result['gtin'] === null,
        'a plausible-looking value from a page like this is worse than no value at all',
    );

    check(
        sprintf('%-28s → isEmpty() is true', $what),
        IHerbPageExtractor::isEmpty($result) === true,
        'this is what routes the row to CONTENT_EMPTY with a bounded excerpt instead of silently '
        .'recording a successful extraction of nothing',
    );
}

check(
    'a real page is NOT reported as empty',
    IHerbPageExtractor::isEmpty($fr1) === false,
    'the guard has to be able to tell the two apart, or it reports green for looking at nothing',
);

/*
|--------------------------------------------------------------------------
| 9. A bad barcode is dropped, not stored
|--------------------------------------------------------------------------
| App\Support\Gtin's own docblock: a valid check digit is permission to LOOK the product up, never
| permission to publish what comes back. A wrong barcode is worse than none — it is a key that
| matches somebody else's product in DSLD and Open Food Facts.
*/
echo "\n9. The barcode fails closed\n\n";

$badGtin = str_replace('<span>753950000773</span>', '<span>753950000774</span>', $pages['fr-1']);
$bad = $extractor->extract($badGtin);

check(
    'a barcode whose check digit does not verify → null',
    $bad['gtin'] === null,
    sprintf('got %s — one digit changed. It still LOOKS like a UPC, which is the point', var_export($bad['gtin'], true)),
);

check(
    '...and the rest of the page is still extracted',
    $bad['overview_html'] !== null && $bad['spec_part_number'] === 'DRB-00077',
    'one bad field must not cost the page',
);

/*
|--------------------------------------------------------------------------
| 10. The extractor's fields and the database columns are the same list
|--------------------------------------------------------------------------
| Parsed out of the migration rather than written down here: a hand-maintained copy of a schema is a
| copy that drifts, and drift is what this directory exists to catch. A field added to the extractor
| and forgotten in the migration is an SQL error on a queue worker, found when the import stops.
*/
echo "\n10. Extractor fields ↔ migration columns\n\n";

$migration = (string) file_get_contents(
    __DIR__.'/../../database/migrations/2026_08_10_000009_add_source_content_to_external_catalog_products_table.php'
);

preg_match_all("~'(source_[a-z0-9_]+)'~", $migration, $m);
$columns = array_values(array_unique($m[1]));

/** extractor field => the column ExtractExternalProductContentJob::store() writes it to. */
$map = [
    'content_locale' => 'source_content_locale',
    'content_canonical_url' => 'source_content_url',
    'content_machine_translated' => 'source_content_translated',
    'overview_html' => 'source_overview_html',
    'suggested_use_html' => 'source_suggested_use_html',
    'other_ingredients_html' => 'source_other_ingredients_html',
    'warnings_html' => 'source_warnings_html',
    'supplement_facts_html' => 'source_supplement_facts_html',
    'manufacturer_url' => 'source_manufacturer_url',
    'gallery_image_urls' => 'source_gallery_images',
    'spec_first_available' => 'source_spec_first_available',
    'spec_shipping_weight' => 'source_spec_shipping_weight',
    'spec_package_quantity' => 'source_spec_package_quantity',
    'spec_dimensions' => 'source_spec_dimensions',
    'spec_actual_weight' => 'source_spec_actual_weight',
    'spec_part_number' => null,   // cross-check only: the row already has external_part_number
    'gtin' => 'source_gtin',
    'unmapped_sections' => 'source_content_unmapped_sections',
    'content_word_count' => 'source_content_word_count',
];

check(
    'every FIELDS entry is accounted for in the map above',
    array_values(IHerbPageExtractor::FIELDS) === array_keys($map),
    sprintf(
        'FIELDS has %s, the map has %s — a field added to the extractor with no decision about where '
        .'it is stored is a field that is silently thrown away on every row',
        json_encode(array_values(array_diff(IHerbPageExtractor::FIELDS, array_keys($map)))),
        json_encode(array_values(array_diff(array_keys($map), IHerbPageExtractor::FIELDS))),
    ),
);

foreach ($map as $field => $column) {
    if ($column === null) {
        continue;
    }

    check(
        sprintf('%-24s → column %s exists in the migration', $field, $column),
        in_array($column, $columns, true),
        'the job hands these keys to forceFill()->save(); a name that is not a column is an SQL error '
        .'on a queue worker at 3am, not a no-op',
    );
}

check(
    'the job reads only keys the extractor actually returns',
    (function (): array {
        $job = (string) file_get_contents(__DIR__.'/../../app/Jobs/ExtractExternalProductContentJob.php');
        preg_match_all("~\\\$extracted\['([a-z0-9_]+)'\]~", $job, $m);

        return array_values(array_diff(array_unique($m[1]), IHerbPageExtractor::FIELDS));
    })() === [],
    sprintf(
        'unknown keys: %s — a typo here is not an error, it is a NULL written to a content column on '
        .'every one of ~19,000 rows, and the only symptom is a page that stays thin',
        json_encode((function (): array {
            $job = (string) file_get_contents(__DIR__.'/../../app/Jobs/ExtractExternalProductContentJob.php');
            preg_match_all("~\\\$extracted\['([a-z0-9_]+)'\]~", $job, $m);

            return array_values(array_diff(array_unique($m[1]), IHerbPageExtractor::FIELDS));
        })()),
    ),
);

check(
    'the job writes the same column names this check asserts',
    (function () use ($map): bool {
        $job = (string) file_get_contents(__DIR__.'/../../app/Jobs/ExtractExternalProductContentJob.php');
        foreach ($map as $column) {
            if ($column !== null && ! str_contains($job, "'".$column."'")) {
                return false;
            }
        }

        return true;
    })(),
    'otherwise this block asserts the agreement of two lists nothing actually uses',
);

/*
|--------------------------------------------------------------------------
| 11. The URL this pass will request
|--------------------------------------------------------------------------
| /pr/{urlName}/{id} — confirmed against the stored external_url and against IHerbClient, not
| assumed. And confirmed against robots.txt: no Disallow line covers it.
*/
echo "\n11. IHerbClient::pageUrl() — the address, and the paths robots.txt forbids\n\n";

/** [externalId, urlName, storedUrl, expected, why] */
$urlCases = [
    [
        '1', 'doctor-s-best-5-htp-100-mg-60-veggie-caps',
        'https://www.iherb.com/pr/doctor-s-best-5-htp-100-mg-60-veggie-caps/1',
        'https://fr.iherb.com/pr/doctor-s-best-5-htp-100-mg-60-veggie-caps/1',
        'the PATH comes from the URL iHerb published in its own sitemap; only the host is the locale',
    ],
    [
        '68616', 'optimum-nutrition-micronized-creatine-powder-unflavored-1-32-lb-600-g', null,
        'https://fr.iherb.com/pr/optimum-nutrition-micronized-creatine-powder-unflavored-1-32-lb-600-g/68616',
        'composed from urlName when no stored URL exists — the fallback, not the first choice',
    ],
    [
        '1', 'doctor-s-best-5-htp-100-mg-60-veggie-caps',
        'https://www.iherb.com/c/doctors-best',
        'https://fr.iherb.com/pr/doctor-s-best-5-htp-100-mg-60-veggie-caps/1',
        'a stored URL that is not a /pr/ path is ignored rather than requested',
    ],
    ['1', null, null, null, 'no slug and no stored URL — there is no page to ask for, and none is invented'],
    ['', 'some-slug', null, null, 'no id, no URL'],
    ['abc', 'some-slug', null, null, 'a non-numeric id is not an iHerb product id'],
];

foreach ($urlCases as [$id, $slug, $stored, $want, $why]) {
    // contentHost() reads config(), which does not exist under a bare php. The fixture-backed
    // default is asserted through a locally reconstructed call instead of skipping the case.
    $got_ = (function () use ($id, $slug, $stored): ?string {
        $host = 'fr.iherb.com';
        $s = trim((string) $stored);
        if ($s !== '') {
            $path = parse_url($s, PHP_URL_PATH);
            if (is_string($path) && preg_match('~^/pr/[^/]+/\d+/?$~', $path) === 1) {
                return 'https://'.$host.$path;
            }
        }
        $slug = trim((string) $slug);
        $id = trim($id);
        if ($slug === '' || $id === '' || preg_match('~^\d+$~', $id) !== 1) {
            return null;
        }

        return 'https://'.$host.'/pr/'.rawurlencode($slug).'/'.$id;
    })();

    check(
        sprintf('pageUrl(%s, %s, %s)', var_export($id, true), var_export($slug, true), $stored === null ? 'null' : "'…'"),
        $got_ === $want,
        sprintf('got %s, want %s — %s', var_export($got_, true), var_export($want, true), $why),
    );
}

check(
    'the reconstruction above matches IHerbClient::pageUrl() line for line',
    (function (): bool {
        $client = (string) file_get_contents(__DIR__.'/../../app/Services/Catalog/IHerb/IHerbClient.php');

        // The three decisions the cases above depend on. A copy nobody checks is a copy that drifts
        // — the exact defect IHerbNormalizer::imageUrl() documents about ITS copy.
        return str_contains($client, "preg_match('~^/pr/[^/]+/\\d+/?\$~', \$path) === 1")
            && str_contains($client, "preg_match('~^\\d+\$~', \$id) !== 1")
            && str_contains($client, "'https://'.\$host.'/pr/'.rawurlencode(\$slug).'/'.\$id");
    })(),
    'this harness cannot call the real method (it reads config()), so it must at least prove it is '
    .'asserting the same rules the real method applies',
);

/**
 * robots.txt, read in full on 10/08/2026 before a single fetch was written.
 * tn.iherb.com and www.iherb.com serve byte-identical files (3,581 bytes).
 */
$robotsRules = [
    '/pr/*/lib/*',      // JS bundles under a product — three segments, not two
    '/pr/i/',
    '/pr/p/',
    '/product/*',       // a different route entirely
    '/*discontinued',   // THIS ONE BITES — see below
];

$productPath = '/pr/doctor-s-best-5-htp-100-mg-60-veggie-caps/1';
$discontinued = '/pr/jarrow-formulas-glucosamine-sulfate-500-670-mg-200-capsules-discontinued-item/200';

/** The same matcher PoliteFetcher::pathMatchesRule() implements — asserted, not assumed. */
$matches = static function (string $path, string $rule): bool {
    if (! str_contains($rule, '*') && ! str_ends_with($rule, '$')) {
        return str_starts_with($path, $rule);
    }
    $anchored = str_ends_with($rule, '$');
    $body = $anchored ? substr($rule, 0, -1) : $rule;
    $pattern = str_replace('\*', '.*', preg_quote($body, '~'));

    return preg_match('~^'.$pattern.($anchored ? '$' : '').'~', $path) === 1;
};

foreach ($robotsRules as $rule) {
    check(
        sprintf('robots rule %-16s does NOT cover a product page', $rule),
        $matches($productPath, $rule) === false,
        'if this ever fires, the pass is requesting a path iHerb told crawlers to leave alone',
    );
}

check(
    'robots rule /*discontinued DOES cover a "-discontinued-item" product',
    $matches($discontinued, '/*discontinued') === true,
    'a large share of iHerb urlNames end in "-discontinued-item" — five of the six ids that returned '
    .'a product at all, out of seven probed at random on 10/08/2026. The URL above is one of them '
    .'(id 200). Those pages are forbidden to us, PoliteFetcher refuses them before the '
    .'wire, and the job files them as `blocked` rather than retrying thousands of them for ever',
);

/*
|--------------------------------------------------------------------------
| 12. The number the owner actually asked to move
|--------------------------------------------------------------------------
*/
echo "\n12. Words of real transcribed content per page\n\n";

foreach ([['fr-1', 150], ['fr-68616', 250], ['fr-110000', 120]] as [$key, $floor]) {
    $words = $got[$key]['content_word_count'];
    check(
        sprintf('%-10s content_word_count >= %d', $key, $floor),
        $words >= $floor,
        sprintf(
            'got %d. The JSON identity endpoint yields ZERO words of prose; the floors here are '
            .'below what these fixtures measure so an extractor regression shows up as a drop, not '
            .'as a number nobody reads',
            $words,
        ),
    );
}

check(
    'a page with nothing on it counts 0 words, not null',
    $extractor->extract('<html lang="fr"><body></body></html>')['content_word_count'] === 0,
    '0 is a measurement; the column is nullable so that "never measured" stays a different statement',
);

echo "\n".str_repeat('─', 100)."\n";

if ($failed > 0) {
    printf("\n%d check(s) FAILED.\n\n", $failed);
    exit(1);
}

echo "\nAll checks passed.\n\n";
exit(0);
