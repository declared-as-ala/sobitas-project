<?php

namespace App\Services\Catalog\IHerb;

use App\Support\Gtin;

/**
 * Read one iHerb PRODUCT PAGE and transcribe what it genuinely carries.
 *
 * ── WHY THIS CLASS EXISTS AT ALL ──────────────────────────────────────────────────────────
 * /ugc/api/product/v2/{id} — the only thing the importer had ever called — returns fifteen keys and
 * not one of them is prose. IHerbNormalizer::KNOWN_PAYLOAD_KEYS is the list and
 * `source_unmapped_keys` is the proof. So every imported product arrived with a name, a brand, a
 * price, one image index and two booleans, and a "rich page" built from that is a warehouse card.
 *
 * The HTML page carries the rest, server-rendered. Measured against real responses on 10/08/2026
 * (see tests/catalog/fixtures/iherb/, which are verbatim slices of those responses):
 *
 *   · an overview / description block                    the section headed "Aperçu" (see HEADINGS)
 *   · suggested use                                      div.prodOverviewDetail
 *   · other ingredients                                  div.prodOverviewIngred
 *   · warnings                                           div.prodOverviewDetail
 *   · the Supplement Facts panel, as a real table        div.supplement-facts-container
 *   · a specifications list                              ul#product-specs-list
 *   · THE BARCODE                                        a bare <span> of 8-14 digits in that list
 *   · the image gallery                                  the og:image run in <head>
 *   · the manufacturer's own website                     section.product-overview-link a[href]
 *
 * ── THERE IS NO STRUCTURED BLOB, AND THAT WAS CHECKED FIRST ───────────────────────────────
 * The brief said to look for __NEXT_DATA__ or JSON-LD before scraping rendered HTML, and it was the
 * first thing looked for. On a 2,084,504-byte response for product 1:
 *
 *     __NEXT_DATA__            0 occurrences
 *     __NUXT__ / window.__     0
 *     __INITIAL_STATE__        0
 *     application/ld+json      1 — and it is a string INSIDE the react-helmet bundle
 *                                  (`F={type:["application/ld+json"]}`), not a script block.
 *                                  The page emits no JSON-LD.
 *
 * So the rendered DOM is not the lazy option here; it is the only option. What makes it survivable
 * is that iHerb's markup is server-rendered with STABLE CLASS NAMES, and this class keys off those
 * rather than off text or position wherever it possibly can.
 *
 * ── THE FAILURE MODE THIS IS SHAPED AROUND ────────────────────────────────────────────────
 * "A regex that works on one page and silently returns null on the other 47,000." Two defences:
 *
 * 1. CLASS FIRST, HEADING ONLY WHEN THE CLASS CANNOT DECIDE. `prodOverviewIngred`, `#disclaimer`,
 *    `#product-specs-list` and `.supplement-facts-container` are unique and identical in every
 *    locale — verified on the same product rendered in French, English and Arabic. Only suggested
 *    use and warnings share one class (`prodOverviewDetail`), and only those two consult the
 *    heading text.
 *
 * 2. AN UNRECOGNISED SECTION IS RECORDED, NEVER GUESSED. Position would "work": on every page seen
 *    so far the order is overview, specs, suggested use, ingredients, warnings, disclaimer. It is
 *    also exactly wrong — product 110000 has no ingredients block at all, so the n-th
 *    `prodOverviewDetail` means a different thing on different products, and a positional rule would
 *    file directions under warnings on a supplement page. Instead, a heading this class does not
 *    know lands in `unmapped_sections`, both fields stay null, and the command says so out loud.
 *    Same contract as IHerbNormalizer's `source_unmapped_keys`: what we did not understand is a
 *    stored fact, not a silent discard.
 *
 * ── DELIBERATELY FRAMEWORK-FREE ───────────────────────────────────────────────────────────
 * No Laravel imports, no facades, no container — same constraint and the same reason as
 * IHerbNormalizer and PromotionGate. It must run under a bare `php` with no vendor/, because that is
 * the only way its decisions can be harnessed on this machine. The single `use` is App\Support\Gtin,
 * which is itself framework-free (zero imports); the harness requires that file directly. It is
 * imported rather than copied precisely because it CAN be — the third copy of a check-digit
 * algorithm is a third thing to drift.
 *
 * DOMDocument is a core PHP extension, not a dependency: ExtractProductFaq and
 * ArticleBodyDocumentNormalizer already parse HTML with it. The 2 MB document is sliced down to the
 * ~10 KB product-overview container with plain string scanning BEFORE the parser sees it, so the
 * memory objection that keeps IHerbClient::sitemapEntries() on regex does not apply here.
 *
 * ── TRANSCRIBE, NEVER GENERATE ────────────────────────────────────────────────────────────
 * Every string this class returns is a contiguous transcription of the source document. Nothing is
 * summarised, translated, reworded or inferred. The only bytes removed are executable ones — see
 * sanitizeHtml() — and the harness asserts that removing them changes no word of the text.
 *
 * ── AND NOT ONE REVIEW ────────────────────────────────────────────────────────────────────
 * There is no review selector in this file and there will not be one. tn.iherb.com/robots.txt
 * disallows /ugc/api/review/ and /ugc/api/product/*&#47;review/summarization; the product page also
 * renders a rating widget, and that widget is not read here either. Ratings and review counts are
 * out of scope by decision, not by oversight, and IHerbClient::assertUrlAllowed() is the structural
 * half of the same rule.
 */
final class IHerbPageExtractor
{
    /**
     * Every key extract() returns. The migration's column list is derived from this, and the harness
     * asserts the two agree — a field added here and forgotten in the schema is an SQL error on a
     * queue worker, discovered when the import stops.
     */
    public const FIELDS = [
        'content_locale',
        'content_canonical_url',
        'content_machine_translated',
        'overview_html',
        'suggested_use_html',
        'other_ingredients_html',
        'warnings_html',
        'supplement_facts_html',
        'manufacturer_url',
        'gallery_image_urls',
        'spec_first_available',
        'spec_shipping_weight',
        'spec_package_quantity',
        'spec_dimensions',
        'spec_actual_weight',
        'spec_part_number',
        'gtin',
        'unmapped_sections',
        'content_word_count',
    ];

    /**
     * Section headings, per locale, for the ONE ambiguity the markup cannot resolve on its own.
     *
     * ── WHY THIS LIST IS SHORT AND WHY THAT IS THE POINT ──────────────────────────────────
     * iHerb publishes 101 hreflang alternates. Three are listed here — fr, en, ar — and those three
     * are exactly the ones a committed fixture proves, captured from the SAME product rendered by
     * fr.iherb.com, ca.iherb.com and tn.iherb.com. Every other locale falls through to
     * `unmapped_sections`, which is a visible zero rather than a silent one.
     *
     * Adding a locale means capturing its page and adding a fixture, not editing this array on the
     * strength of a translation. A wrong entry here files a warning under "directions" on a
     * supplement page, and that is a sentence a customer acts on.
     *
     * Keys are the heading text after normalizeHeading(): lowercased, accent-folded, whitespace
     * collapsed, trailing colon removed.
     */
    private const HEADINGS = [
        // French — fr.iherb.com
        'usage suggere' => 'suggested_use',
        'avertissements' => 'warnings',
        'apercu' => 'overview',
        // English — www./ca./uk.iherb.com
        'suggested use' => 'suggested_use',
        'warnings' => 'warnings',
        'overview' => 'overview',
        // Arabic — tn.iherb.com, which is what a Tunisian IP is redirected to
        'طريقة الاستخدام الموصى بها' => 'suggested_use',
        'تحذيرات' => 'warnings',
        'نظرة عامة' => 'overview',
    ];

    /**
     * iHerb's own notice that the page was machine translated, per locale.
     *
     * ── WHY A BOOLEAN COLUMN AND NOT A COMMENT ────────────────────────────────────────────
     * fr.iherb.com's disclaimer carries a second paragraph the English page does not:
     *
     *     "Ce site web a été traduit automatiquement à titre de courtoisie pour les clients. iHerb
     *      ne garantit pas que les traductions sont complètes ou exemptes d'erreurs..."
     *
     * That is iHerb telling us, in writing, that the French text on the page is machine output and
     * that it does not vouch for it. On a supplement — where the transcribed sentences include
     * dosage and contraindications — whether the words are the manufacturer's or a translation
     * engine's is a fact that has to travel WITH the text, not live in a docblock somebody read
     * once. The English page carries no such notice, and the harness asserts that difference.
     *
     * `null` means "this locale is not in the table", which is not the same statement as `false`.
     */
    private const TRANSLATION_NOTICE = [
        'fr' => 'traduit automatiquement',
        'ar' => 'تم ترجمة',
    ];

    /** Locales that ARE the source language, so the absence of a notice means something. */
    private const SOURCE_LANGUAGES = ['en'];

    /**
     * The gallery lives in the head as a run of og:image tags — real URLs, not probed ones.
     *
     * CatalogIHerbPromote::coverUrl() and migration 2026_08_10_000008 both record that a gallery was
     * impossible because the JSON payload carries a primary index and no count, so building one
     * would mean probing 1..n and storing URLs that 404. That was true of the JSON. The HTML page
     * simply lists them: product 1 emits indices 97, 102, 105-111 — nine images, none guessed.
     *
     * The run also contains iHerb's own marketing furniture, which is not a picture of the product:
     *
     *     .../images/cms/banners/dPDP-ROW-Quality-Promise_007fr-fr.jpg
     *
     * Product assets live under /images/{brandFolder}/{assetFolder}/{size}/{n}.jpg. Anything under
     * /images/cms/ is dropped — putting iHerb's quality-promise banner in a protein.tn gallery would
     * be republishing another shop's advertising as our product photography.
     */
    private const CMS_ASSET_MARKER = '/images/cms/';

    /**
     * How much of a failed page to keep for a human to look at.
     *
     * The brief is explicit that the raw HTML must not be persisted: 47,537 pages at ~2 MB is ~95 GB
     * against ~43 GB free. So nothing is stored on success. On a page that yielded NOTHING, 4,000
     * characters of the region we searched are kept — enough to see whether iHerb changed the markup
     * or whether we were served an interstitial, and small enough that even if every row failed the
     * column costs ~190 MB rather than ~95 GB.
     */
    public const DEBUG_EXCERPT_CHARS = 4000;

    /**
     * Everything the page carries, or nulls where it carries nothing.
     *
     * @param  string  $html  the full response body — this method does the slicing
     * @return array<string, mixed> keyed by FIELDS
     */
    public function extract(string $html): array
    {
        $out = array_fill_keys(self::FIELDS, null);
        $out['gallery_image_urls'] = [];
        $out['unmapped_sections'] = [];
        $out['content_word_count'] = 0;

        $out['content_locale'] = self::htmlLang($html);
        $out['content_canonical_url'] = self::canonical($html);
        $out['gallery_image_urls'] = self::galleryImages($html);

        $region = self::overviewRegion($html);
        if ($region === null) {
            return $out;
        }

        $doc = self::loadFragment($region);
        if ($doc === null) {
            return $out;
        }

        $xpath = new \DOMXPath($doc);

        $sections = $this->sections($xpath);

        foreach (['overview', 'suggested_use', 'other_ingredients', 'warnings'] as $name) {
            $out[$name.'_html'] = $sections[$name] ?? null;
        }

        $out['unmapped_sections'] = $sections['__unmapped'] ?? [];
        $out['supplement_facts_html'] = self::firstByClass($xpath, 'supplement-facts-container');
        $out['manufacturer_url'] = self::manufacturerUrl($xpath);
        $out['content_machine_translated'] = self::machineTranslated(
            $out['content_locale'],
            $sections['__disclaimer'] ?? null,
        );

        foreach (self::specs($xpath) as $key => $value) {
            $out[$key] = $value;
        }

        $out['content_word_count'] = self::wordCount([
            $out['overview_html'],
            $out['suggested_use_html'],
            $out['other_ingredients_html'],
            $out['warnings_html'],
            $out['supplement_facts_html'],
        ]);

        return $out;
    }

    /** True when extract() found no transcribable prose at all — the page is worth a second look. */
    public static function isEmpty(array $extracted): bool
    {
        foreach (['overview_html', 'suggested_use_html', 'other_ingredients_html', 'warnings_html', 'supplement_facts_html'] as $field) {
            if (($extracted[$field] ?? null) !== null) {
                return false;
            }
        }

        return true;
    }

    /**
     * A bounded slice of what we searched, for a page that yielded nothing.
     *
     * Deliberately the product-overview region when it exists and the document head when it does
     * not — those are the two different diagnoses ("iHerb renamed a class" versus "we were served
     * something that is not a product page") and the excerpt should tell them apart.
     */
    public static function debugExcerpt(string $html): string
    {
        $region = self::overviewRegion($html) ?? $html;

        return mb_substr(trim($region), 0, self::DEBUG_EXCERPT_CHARS);
    }

    /**
     * The `#product-overview` container, balanced.
     *
     * Plain string scanning rather than a parse: it runs on the FULL ~2 MB response, and this is the
     * step that keeps DOMDocument away from all but ~10 KB of it. Depth counting on `<div`/`</div`
     * is enough because the container's children are ordinary divs — the fixtures are the evidence,
     * and a malformed count simply returns a longer slice, which the parser then handles.
     */
    public static function overviewRegion(string $html): ?string
    {
        $start = strpos($html, '<div class="container product-overview"');
        if ($start === false) {
            return null;
        }

        $depth = 0;
        $i = $start;
        $n = strlen($html);

        while ($i < $n) {
            if ($html[$i] === '<') {
                if (substr_compare($html, '</div', $i, 5) === 0) {
                    $depth--;
                    $close = strpos($html, '>', $i);
                    if ($close === false) {
                        break;
                    }
                    $i = $close + 1;
                    if ($depth === 0) {
                        return substr($html, $start, $i - $start);
                    }

                    continue;
                }

                if (substr_compare($html, '<div', $i, 4) === 0) {
                    $depth++;
                    $close = strpos($html, '>', $i);
                    if ($close === false) {
                        break;
                    }
                    $i = $close + 1;

                    continue;
                }
            }

            $i++;
        }

        // Unbalanced. Returning the tail is better than returning null: the parser copes, and a
        // null here would report "iHerb removed the section" for what is really a truncated body.
        return substr($html, $start);
    }

    /**
     * Every `div.row.item-row` in the container, classified.
     *
     * ── WHY BOTH CLASSES ARE REQUIRED ─────────────────────────────────────────────────────
     * The container's own wrapper is `<div class="item-row">` with no `row`, and it encloses all the
     * others. Matching `item-row` alone therefore yields the whole block first, whose first h3 is
     * the overview heading — so the overview would be extracted twice and the second copy would be
     * the ENTIRE section list, disclaimer included. Requiring `row` as well selects only the leaves.
     *
     * @return array<string, string|list<string>>
     */
    private function sections(\DOMXPath $xpath): array
    {
        $found = ['__unmapped' => []];

        $blocks = $xpath->query(
            '//div[contains(concat(" ",normalize-space(@class)," ")," row ")]'
            .'[contains(concat(" ",normalize-space(@class)," ")," item-row ")]'
        );

        if ($blocks === false) {
            return $found;
        }

        foreach ($blocks as $block) {
            $headings = $xpath->query('.//h3', $block);
            $heading = $headings === false ? null : $headings->item(0);

            if (! $heading instanceof \DOMElement) {
                // The mobile/desktop manufacturer-link rows carry no heading. Not a section.
                continue;
            }

            $body = self::nextElement($heading);
            if (! $body instanceof \DOMElement) {
                /*
                 * A heading whose body is not its next element sibling — iHerb wrapping the <h3> in
                 * a header div would do it — used to `continue` in silence. Measured on the fr-1
                 * fixture with only the "Avertissements" heading wrapped: warnings_html became NULL,
                 * unmapped_sections stayed [], isEmpty() stayed false, so the row was stored as a
                 * successful transcription with the manufacturer's CONTRAINDICATIONS missing and
                 * `--status` reporting nothing. This class's contract is that what it did not
                 * understand is a stored fact; a section it recognised but could not read is exactly
                 * that, so it is recorded here rather than lost.
                 */
                $found['__unmapped'][] = trim(preg_replace('~\s+~u', ' ', $heading->textContent) ?? '');

                continue;
            }

            $class = ' '.preg_replace('~\s+~', ' ', trim($body->getAttribute('class'))).' ';
            $id = trim($body->getAttribute('id'));

            // ── Locale-free, decided by the markup alone ─────────────────────────────────
            if ($id === 'disclaimer') {
                // Never stored as product copy: it is iHerb's boilerplate, byte-identical on every
                // one of 47,537 pages, and it names iHerb on a protein.tn page. Read only for the
                // machine-translation notice.
                $found['__disclaimer'] = self::plainText($body);

                continue;
            }

            if ($id === 'product-specs-list') {
                continue; // handled by specs(), which keys off the ids and classes inside it
            }

            if (str_contains($class, ' prodOverviewIngred ')) {
                $found['other_ingredients'] ??= self::innerHtml($body);

                continue;
            }

            /*
             * ── EVERYTHING ELSE IS DECIDED BY THE HEADING, INCLUDING THE OVERVIEW ─────────
             *
             * There used to be a rule ABOVE this one that filed any body which happened to be a bare
             * `<div>` with no class and no id as the overview, without ever consulting the heading.
             * That is classification by markup shape, and it broke this class's stated contract in
             * both directions — measured on the committed fr-1 fixture:
             *
             *   · inserting a section headed "Notes de stockage du revendeur" whose body is a bare
             *     div made ITS text the overview — i.e. the product's published description, the
             *     leading paragraph of products.description_fr and seo_schema_description — while
             *     unmapped_sections stayed [] and the command reported 0 unclassified sections;
             *   · stripping only the `prodOverviewDetail` class off the suggested-use body sent it
             *     down the same branch, where `??=` silently discarded it behind the real overview:
             *     suggested_use_html NULL, unmapped_sections [].
             *
             * "apercu" / "overview" / "نظرة عامة" are all in HEADINGS already, so the shape rule was
             * never what found the overview on a page this class supports — it was only what guessed
             * on a page it does not. An unknown heading now lands in unmapped_sections, which is what
             * the docblock has always claimed and what `catalog:iherb:content --status` monitors.
             *
             * Suggested use and warnings still share `prodOverviewDetail`, so they were always
             * decided here; nothing about them changes.
             */
            $key = self::HEADINGS[self::normalizeHeading($heading->textContent)] ?? null;

            if ($key === null) {
                $found['__unmapped'][] = trim(preg_replace('~\s+~u', ' ', $heading->textContent) ?? '');

                continue;
            }

            $found[$key] ??= self::innerHtml($body);
        }

        $found['__unmapped'] = array_values(array_unique(array_filter($found['__unmapped'])));

        return $found;
    }

    /**
     * The specifications list, read by the ids and classes inside it rather than by its labels.
     *
     * "Code produit" / "Code produkt" / "رقم المنتج" is a different string in every locale, so the
     * two rows that matter most — the part number and the barcode — are identified by the SHAPE of
     * their value instead:
     *
     *   part number   BRD-01234    two-to-four letters, a dash, digits
     *   barcode       753950000773 eight to fourteen digits WITH A VALID GS1 CHECK DIGIT
     *
     * The check digit is what makes the second rule safe. Without it, any long number in the list
     * would qualify and a shipping weight in grams could be filed as a barcode; with it, a
     * transcription error fails closed. App\Support\Gtin already owns that algorithm and is
     * imported rather than copied for exactly the reason IHerbNormalizer had to copy imageUrl and
     * regretted it — see that class's note on drifting duplicates.
     *
     * @return array<string, string|null>
     */
    private static function specs(\DOMXPath $xpath): array
    {
        $out = [
            'spec_first_available' => self::firstByClass($xpath, 'product-sale-date', true),
            'spec_shipping_weight' => self::firstByClass($xpath, 'product-shipping-weight-label', true),
            'spec_package_quantity' => self::firstByClass($xpath, 'package-quantity', true),
            'spec_dimensions' => self::firstById($xpath, 'dimensions'),
            'spec_actual_weight' => self::firstById($xpath, 'actual-weight'),
            'spec_part_number' => null,
            'gtin' => null,
        ];

        $spans = $xpath->query('//ul[@id="product-specs-list"]/li/span');
        if ($spans === false) {
            return $out;
        }

        foreach ($spans as $span) {
            if (! $span instanceof \DOMElement || $span->getAttribute('class') !== '' || $span->getAttribute('id') !== '') {
                continue;   // the classed spans are already read above
            }

            $value = trim(preg_replace('~\s+~u', ' ', $span->textContent) ?? '');

            if ($out['spec_part_number'] === null && preg_match('~^[A-Za-z]{2,4}-\d{3,8}$~', $value) === 1) {
                $out['spec_part_number'] = strtoupper($value);

                continue;
            }

            if ($out['gtin'] === null && preg_match('~^\d{8,14}$~', $value) === 1) {
                // Gtin::normalize() returns null unless the check digit verifies, so a number that
                // merely looks like a barcode is dropped rather than published as one.
                $out['gtin'] = Gtin::normalize($value);
            }
        }

        return $out;
    }

    /**
     * Product images from the og:image run, in document order, gallery furniture removed.
     *
     * @return list<string>
     */
    public static function galleryImages(string $html): array
    {
        if (! preg_match_all('~<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']~i', $html, $m)) {
            return [];
        }

        $out = [];
        foreach ($m[1] as $url) {
            $url = html_entity_decode($url, ENT_QUOTES | ENT_HTML5, 'UTF-8');

            if (str_contains($url, self::CMS_ASSET_MARKER)) {
                continue;
            }

            if (! in_array($url, $out, true)) {
                $out[] = $url;
            }
        }

        return $out;
    }

    /** The manufacturer's own site, which is a citable primary source rather than a retailer page. */
    private static function manufacturerUrl(\DOMXPath $xpath): ?string
    {
        $links = $xpath->query(
            '//section[contains(concat(" ",normalize-space(@class)," ")," product-overview-link ")]/a[@href]'
        );

        if ($links === false) {
            return null;
        }

        foreach ($links as $link) {
            $href = trim($link->getAttribute('href'));

            // The "report incorrect information" anchor sits in the same section with no href, and
            // an in-page or javascript: target is not a manufacturer.
            if ($href === '' || ! preg_match('~^https?://~i', $href)) {
                continue;
            }

            return $href;
        }

        return null;
    }

    /**
     * Did iHerb declare this page machine translated?
     *
     * `false` is a POSITIVE CLAIM — "these are the manufacturer's own words" — and only a SOURCE
     * language may make it. Everything else is `true` (notice found) or `null` (not confirmed).
     *
     * ── WHY `null` AND NOT `false` WHEN THE NOTICE IS MISSING ─────────────────────────────
     * This used to end `return mb_stripos($disclaimer, $needle) !== false;`, so a French page whose
     * disclaimer existed but did not contain our exact substring stored `false`. iHerb owns that
     * string and we do not version it: rewording "traduit automatiquement" to "traduit par un
     * moteur automatique", or renaming the element the disclaimer is read from, silently flipped a
     * confirmed translation into an assertion that the text was original. Downstream that dropped
     * the machine-translation caveat from pages carrying transcribed dosage ("prenez 1 capsule par
     * jour") and contraindications ("Ne pas utiliser en cas de prise d'inhibiteurs de monoamine
     * oxydase") — the one direction this disclosure must never fail in.
     *
     * The absence of a notice is not evidence that a page is original. It is the absence of
     * evidence, and the difference matters precisely because nobody re-reads 20,000 pages.
     */
    private static function machineTranslated(?string $locale, ?string $disclaimer): ?bool
    {
        $language = strtolower(explode('-', (string) $locale)[0]);

        if ($language === '') {
            return null;
        }

        // The only case that may answer "not translated": the page IS in the source language.
        if (in_array($language, self::SOURCE_LANGUAGES, true)) {
            return false;
        }

        $needle = self::TRANSLATION_NOTICE[$language] ?? null;

        if ($needle !== null && $disclaimer !== null && mb_stripos($disclaimer, $needle) !== false) {
            return true;
        }

        // A non-source language with no confirmed notice. Unknown — never "original".
        return null;
    }

    /** `<html ... lang="fr">` → `fr`. The locale is a fact about the text we transcribed. */
    public static function htmlLang(string $html): ?string
    {
        if (preg_match('~<html[^>]*\blang=["\']([A-Za-z\-]{2,12})["\']~i', $html, $m) !== 1) {
            return null;
        }

        return $m[1];
    }

    public static function canonical(string $html): ?string
    {
        if (preg_match('~<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']~i', $html, $m) !== 1) {
            return null;
        }

        return html_entity_decode(trim($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /** Words across every transcribed section — what the owner actually asked to increase. */
    public static function wordCount(array $htmlFragments): int
    {
        $text = '';
        foreach ($htmlFragments as $fragment) {
            if (is_string($fragment) && $fragment !== '') {
                $text .= ' '.strip_tags($fragment);
            }
        }

        $text = trim(preg_replace('~\s+~u', ' ', html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '');

        return $text === '' ? 0 : count(preg_split('~\s+~u', $text) ?: []);
    }

    // ─────────────────────────────────────────────────────────────────────────────────────
    // Parsing plumbing
    // ─────────────────────────────────────────────────────────────────────────────────────

    private static function loadFragment(string $fragment): ?\DOMDocument
    {
        $doc = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);

        // The XML declaration is what stops DOMDocument reading UTF-8 as ISO-8859-1 and turning
        // "gélules végétales" into mojibake — the same guard ExtractProductFaq::loadHtml() uses.
        $ok = $doc->loadHTML(
            '<?xml encoding="UTF-8">'.$fragment,
            LIBXML_NOWARNING | LIBXML_NOERROR | LIBXML_NONET
        );

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $ok ? $doc : null;
    }

    private static function nextElement(\DOMNode $node): ?\DOMNode
    {
        $sibling = $node->nextSibling;
        while ($sibling !== null && $sibling->nodeType !== XML_ELEMENT_NODE) {
            $sibling = $sibling->nextSibling;
        }

        return $sibling;
    }

    /**
     * DOMXPath::query() returns `false` on a malformed expression, and `false?->item(0)` is a fatal
     * error, not a null — the nullsafe operator only short-circuits on null. Every query result in
     * this class is therefore checked with `=== false` before it is touched.
     */
    private static function firstByClass(\DOMXPath $xpath, string $class, bool $asText = false): ?string
    {
        $nodes = $xpath->query('//*[contains(concat(" ",normalize-space(@class)," ")," '.$class.' ")]');
        if ($nodes === false) {
            return null;
        }

        $node = $nodes->item(0);
        if (! $node instanceof \DOMElement) {
            return null;
        }

        return $asText ? self::plainText($node) : self::innerHtml($node);
    }

    private static function firstById(\DOMXPath $xpath, string $id): ?string
    {
        $nodes = $xpath->query('//*[@id="'.$id.'"]');
        if ($nodes === false) {
            return null;
        }

        $node = $nodes->item(0);

        return $node instanceof \DOMElement ? self::plainText($node) : null;
    }

    /**
     * The element's children, serialised, with executable markup removed.
     *
     * ── WHAT IS REMOVED AND WHY IT IS NOT EDITING THE TEXT ────────────────────────────────
     * <script>, <style>, <iframe>, <object>, <embed>, <form>, every on*= handler and every
     * javascript: target. None of those is a word the manufacturer wrote; all of them are code that
     * would be stored and later rendered on a page that takes payments. Refusing to store an
     * executable payload is not "improving" the copy, and the harness proves it: it asserts the
     * plain text of the sanitised HTML is identical to the plain text of the raw HTML, so no
     * sentence can be lost to this step without a check failing.
     */
    private static function innerHtml(\DOMElement $element): ?string
    {
        $clone = $element->cloneNode(true);
        if (! $clone instanceof \DOMElement) {
            return null;
        }

        self::sanitize($clone);

        $html = '';
        foreach ($clone->childNodes as $child) {
            $html .= $clone->ownerDocument->saveHTML($child);
        }

        $html = trim($html);

        return $html === '' ? null : $html;
    }

    private static function sanitize(\DOMElement $element): void
    {
        $doc = $element->ownerDocument;
        $xpath = new \DOMXPath($doc);

        foreach (['script', 'style', 'iframe', 'object', 'embed', 'form', 'noscript'] as $tag) {
            $nodes = $xpath->query('.//'.$tag, $element);
            if ($nodes === false) {
                continue;
            }
            // Reverse, because removing from a live NodeList while iterating it skips siblings.
            for ($i = $nodes->length - 1; $i >= 0; $i--) {
                $nodes->item($i)?->parentNode?->removeChild($nodes->item($i));
            }
        }

        $all = $xpath->query('.//*', $element);
        if ($all === false) {
            return;
        }

        foreach ($all as $node) {
            if (! $node instanceof \DOMElement) {
                continue;
            }

            $remove = [];
            foreach ($node->attributes ?? [] as $attribute) {
                $name = strtolower($attribute->nodeName);
                $value = strtolower(trim($attribute->nodeValue ?? ''));

                if (str_starts_with($name, 'on') || str_starts_with($value, 'javascript:')) {
                    $remove[] = $attribute->nodeName;
                }
            }

            foreach ($remove as $name) {
                $node->removeAttribute($name);
            }
        }
    }

    private static function plainText(\DOMElement $element): ?string
    {
        $text = trim(preg_replace('~\s+~u', ' ', $element->textContent) ?? '');

        return $text === '' ? null : $text;
    }

    /** Lowercase, accent-fold, collapse whitespace, drop a trailing colon. Arabic is unaffected. */
    private static function normalizeHeading(string $raw): string
    {
        $text = trim(preg_replace('~\s+~u', ' ', $raw) ?? '');
        $text = rtrim($text, " :：\u{00A0}");
        $text = mb_strtolower($text, 'UTF-8');

        return strtr($text, [
            'à' => 'a', 'á' => 'a', 'â' => 'a', 'ä' => 'a', 'ã' => 'a', 'å' => 'a',
            'ç' => 'c', 'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
            'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i', 'ñ' => 'n',
            'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'ö' => 'o', 'õ' => 'o',
            'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u', 'ý' => 'y', 'ÿ' => 'y',
        ]);
    }
}
