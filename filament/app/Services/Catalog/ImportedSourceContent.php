<?php

namespace App\Services\Catalog;

/**
 * What an imported product PUBLISHES out of the content its source page carried.
 *
 * ── WHY THIS EXISTS AT ALL ────────────────────────────────────────────────────────────────
 * Migration 2026_08_10_000009 put the transcribed page on `external_catalog_products`. Three
 * separate places now have to agree about what of it reaches a customer:
 *
 *   · CatalogIHerbPromote — writes `products.description_fr` and measures the indexing gate
 *   · ProductDetailResource — builds the public `source_facts.content` payload
 *   · frontend/src/util/productSourceFacts.ts — renders it on BOTH product routes
 *
 * If those three derive the rule independently they drift, and the specific way they drift is the
 * worst one available: the crawler route renders a fact the human route does not (cloaking) or the
 * reverse (invisible to Google). So the rule lives here once, in a class with no facades, no
 * container, no Eloquent and no config() — which is what lets
 * filament/tests/catalog/imported-product-content-check.php require() it under a bare `php` and
 * assert the decisions against real extractor output.
 *
 * ── THE ONE HARD GATE: LANGUAGE ───────────────────────────────────────────────────────────
 * iHerb serves the same product in 101 locales and `source_content_locale` records verbatim which
 * one the row was read from. www.iherb.com 302s a Tunisian IP to tn.iherb.com, which is Arabic —
 * so "the pipeline stored some text" is NOT the same statement as "the pipeline stored French text".
 *
 * publishable() therefore refuses everything on a row whose stored language is not French. Not the
 * prose only: the specification strings are locale-formatted ("9,7 x 5,1 x 5,1 cm" against
 * "9.7 x 5.1 x 5.1 cm"), and the image gallery is dropped with them purely so that there is ONE
 * rule and one place it is applied rather than a per-field matrix nobody can hold in their head.
 * The cost is small and recoverable — `catalog:iherb:content --refetch` re-reads the row from
 * fr.iherb.com — and the failure it prevents is an Arabic paragraph on a French product page.
 *
 * NULL locale is not French. A row that predates the column publishes nothing.
 *
 * ── WHAT IS NEVER PUBLISHED, AND WHY EACH ONE IS ABSENT ───────────────────────────────────
 *   · `source_content_url` — the page on the shop we sourced the record from. The same decision
 *     ProductDetailResource already records for `external_url`: not on our product page.
 *   · `source_manufacturer_url` — an outbound link nobody reviewed, on ~19,000 pages.
 *   · `source_rating` / `source_rating_count` — another shop's ratings. Internal reference only,
 *     never aggregateRating, never rendered. Nothing here reads those columns.
 *   · `source_spec_shipping_weight` — the SOURCE RETAILER's shipping weight, which measures their
 *     packaging and their carrier, not this product. "0,05 kg" next to an actual weight of
 *     "0,04 kg" is 10 g of their cardboard presented as a fact about the bottle.
 *   · `source_spec_actual_weight` — for the same reason, once measured: on fr-68616 the page's
 *     shipping weight and its `#actual-weight` are the SAME value ("0,68 kg" both), so the second
 *     one is not a second measurement, and the page gives it no label of its own to transcribe.
 *     See SPEC_COLUMNS.
 *   · `source_spec_first_available` — the date the product appeared in THEIR catalogue. It says
 *     nothing about ours and reads like a manufacturing date, which it is not.
 *   · `source_spec_package_quantity` — a duplicate. `source_facts.format` already prints the pack
 *     ("60 gélules végétales") from IHerbNormalizer's reading of the product name; this column is
 *     the same fact in the source's own words ("60 Pièce"), and two specification rows stating the
 *     same quantity differently is how a page looks machine-assembled.
 *   · `source_content_excerpt` — a debugging keep, 4,000 characters of markup, written only when a
 *     page yielded nothing. It is evidence, not copy.
 *
 * ── AND THE ONE THING THAT IS PUBLISHED WITHOUT BEING RENDERED ────────────────────────────
 * `source_gtin`. Promotion copies it to `products.gtin`, where ProductSchemaBuilder already turns it
 * into schema.org `gtin`/`gtin12`/`gtin13` after re-verifying the GS1 check digit. It is structured
 * data about the product read from our own column — not a claim rendered to one audience and not the
 * other — so it is exempt from the parity rule that governs everything else in this file.
 *
 * ── NULL-SAFE BY CONSTRUCTION, WHICH IS WHAT THE 309 DEPEND ON ────────────────────────────
 * Every method here takes a staging-row array. The 309 legacy hand-made products have no row in
 * `external_catalog_products` at all, so the callers hand this class `[]`, every method returns
 * null or [], and every consumer renders exactly what it rendered before this file existed.
 */
final class ImportedSourceContent
{
    /**
     * The language a stored transcription must be in before any of it is published.
     *
     * Matched as a PREFIX of `source_content_locale`, so "fr" and "fr-CA" both pass and "ar-TN",
     * "en-CA" and NULL do not.
     */
    public const PUBLISHABLE_LANGUAGE = 'fr';

    /**
     * Languages that ARE iHerb's source language, so their text is the manufacturer's own.
     *
     * Mirrors IHerbPageExtractor::SOURCE_LANGUAGES. Duplicated rather than imported for the same
     * reason every constant in this layer is: these classes must load under a bare `php` with no
     * autoloader so the standalone harnesses can execute them. The harness requires BOTH files and
     * is what keeps the two lists honest.
     */
    public const SOURCE_LANGUAGES = ['en'];

    /** The manufacturer's own overview prose. Folded into `products.description_fr` by promotion. */
    public const OVERVIEW_COLUMN = 'source_overview_html';

    /**
     * The blocks that render as their own section on the product page, in render order.
     *
     * Column → section key. The ORDER of this array is the order both routes print, which is what
     * makes "the same facts in the same structure on both" a property of one constant rather than of
     * two JSX files somebody has to keep in step.
     */
    public const SECTION_COLUMNS = [
        'source_suggested_use_html' => 'suggested_use',
        'source_other_ingredients_html' => 'other_ingredients',
        'source_warnings_html' => 'warnings',
    ];

    /**
     * Our heading for each block. OUR words, describing what the block is — the block's CONTENT is
     * transcribed verbatim and nothing here rewrites it.
     */
    public const SECTION_HEADINGS = [
        'suggested_use' => "Conseils d'utilisation",
        'other_ingredients' => 'Autres ingrédients',
        'warnings' => 'Avertissements',
    ];

    /**
     * The Supplement Facts panel, which renders in the page's NUTRITION slot and not with the prose.
     *
     * Kept apart from SECTION_COLUMNS because both routes already have a nutrition section with its
     * own heading (`zone3` / "Valeurs nutritionnelles"), and a transcribed panel belongs in it. That
     * placement also means the panel sits beside `nutrition_values`, the column an admin fills in by
     * hand from the physical label — which stays first when both exist, because a panel read off the
     * lot we hold beats a panel transcribed from a retailer's page.
     */
    public const NUTRITION_COLUMN = 'source_supplement_facts_html';

    /**
     * Specification strings we print, column → row key and French label.
     *
     * The labels are the source page's own labels, not an interpretation of them. "Dimensions" is
     * the word the French page prints immediately before `#dimensions`, and it is the only spec row
     * on that page whose label we can transcribe rather than invent.
     *
     * ── WHY `source_spec_actual_weight` IS NO LONGER HERE ─────────────────────────────────
     * It was published as `{key: actual_weight, label: 'Poids réel'}`, and both halves of that were
     * wrong against the repo's own fixtures:
     *
     *   · "Poids réel" appears in NONE of the five committed fixtures. `#actual-weight` sits inside
     *     an <li> whose only visible label is "Dimensions:", so it carries no label of its own —
     *     the label was ours, i.e. a string a customer reads that is neither transcribed from the
     *     source page nor read from our database, which this project forbids.
     *   · The VALUE is not reliably a property of the product either. On
     *     fixtures/iherb/fr-68616-optimum-creatine.html (a 600 g tub) the page prints
     *     `product-shipping-weight-label` = "0,68 kg" and `#actual-weight` = "0,68 kg" — the same
     *     number. This class refuses the shipping weight on the stated ground that it measures the
     *     source retailer's packaging and carrier; publishing the identical figure under another
     *     name published exactly what the refusal was for, directly under "Format : 600 g".
     *
     * The column is still extracted and still stored — it is a measurement of their page and may be
     * useful internally — it is simply not printed, on either route, until there is a page label to
     * transcribe it from. See the class docblock for the other spec columns that are not here.
     */
    public const SPEC_COLUMNS = [
        'source_spec_dimensions' => ['key' => 'dimensions', 'label' => 'Dimensions'],
    ];

    /** The gallery the page listed, as og:image URLs. */
    public const GALLERY_COLUMN = 'source_gallery_images';

    /**
     * Is anything on this row publishable at all?
     *
     * ONE gate, applied to every accessor below, for the reason in the class docblock: the stored
     * text has to be French before a French product page may carry it, and a per-field exemption
     * matrix is a rule nobody can check by reading.
     *
     * @param  array<string, mixed>  $row  an `external_catalog_products` row, or [] for a product
     *                                     that has none (all 309 legacy products, permanently)
     */
    public static function publishable(array $row): bool
    {
        $locale = strtolower(trim((string) ($row['source_content_locale'] ?? '')));

        if ($locale === '') {
            return false;
        }

        return $locale === self::PUBLISHABLE_LANGUAGE
            || str_starts_with($locale, self::PUBLISHABLE_LANGUAGE.'-')
            || str_starts_with($locale, self::PUBLISHABLE_LANGUAGE.'_');
    }

    /**
     * The manufacturer's overview prose, or null.
     *
     * @param  array<string, mixed>  $row
     */
    public static function overviewHtml(array $row): ?string
    {
        return self::publishable($row) ? self::html($row[self::OVERVIEW_COLUMN] ?? null) : null;
    }

    /**
     * The prose blocks that render as their own sections, in render order.
     *
     * @param  array<string, mixed>  $row
     * @return list<array{key: string, heading: string, html: string}>
     */
    public static function sections(array $row): array
    {
        if (! self::publishable($row)) {
            return [];
        }

        $out = [];
        foreach (self::SECTION_COLUMNS as $column => $key) {
            $html = self::html($row[$column] ?? null);
            if ($html !== null) {
                $out[] = ['key' => $key, 'heading' => self::SECTION_HEADINGS[$key], 'html' => $html];
            }
        }

        return $out;
    }

    /**
     * The transcribed Supplement Facts panel, or null.
     *
     * @param  array<string, mixed>  $row
     */
    public static function nutritionHtml(array $row): ?string
    {
        return self::publishable($row) ? self::html($row[self::NUTRITION_COLUMN] ?? null) : null;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return list<array{key: string, label: string, value: string}>
     */
    public static function specs(array $row): array
    {
        if (! self::publishable($row)) {
            return [];
        }

        $out = [];
        foreach (self::SPEC_COLUMNS as $column => $spec) {
            $value = trim((string) ($row[$column] ?? ''));
            if ($value !== '') {
                $out[] = ['key' => $spec['key'], 'label' => $spec['label'], 'value' => $value];
            }
        }

        return $out;
    }

    /**
     * The product photographs the page listed, at the size the cover already uses.
     *
     * ── WHY THE URL IS REWRITTEN, AND HOW NARROWLY ────────────────────────────────────────
     * The og:image run gives the `/s/` (small) variant — a thumbnail. `CatalogIHerbPromote::coverUrl()`
     * already requests `/l/` from the same folder of the same CDN for the same product, via
     * IHerbClient::imageUrl(), so the large variant is not a guess about whether it exists; it is the
     * variant this catalogue is already rendering today.
     *
     * The rewrite is anchored to the exact documented path shape
     * (`/images/{brand}/{folder}/{size}/{n}.jpg`) and a URL that does not match it is passed through
     * UNCHANGED rather than mangled. That is the difference between a scheme change costing us
     * thumbnails and a scheme change costing us broken images.
     *
     * Non-https URLs and hosts outside the CDN allow-list are dropped outright: these strings end up
     * in a next/image `src`, and next/image THROWS on an unlisted host rather than degrading. The
     * allow-list mirrors config/catalog.php `media.external_hosts` and frontend/next.config.js
     * `images.remotePatterns`, both of which must already contain the host for the cover to render.
     *
     * @param  array<string, mixed>  $row
     * @return list<string>
     */
    public static function gallery(array $row): array
    {
        if (! self::publishable($row)) {
            return [];
        }

        $raw = $row[self::GALLERY_COLUMN] ?? null;
        if (is_string($raw)) {
            // The column is cast to array by the model, but a harness (and a raw query) hands over
            // the JSON string. Decoding here keeps both callers honest.
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : null;
        }

        if (! is_array($raw)) {
            return [];
        }

        $out = [];
        foreach ($raw as $url) {
            if (! is_string($url)) {
                continue;
            }

            $url = trim($url);
            if ($url === '' || ! self::allowedImageUrl($url)) {
                continue;
            }

            $large = self::largeVariant($url);
            if (! in_array($large, $out, true)) {
                $out[] = $large;
            }
        }

        return $out;
    }

    /**
     * Where the words on this page came from, said on the page itself.
     *
     * ── WHY THIS IS NOT A COMMENT IN THE CODE ─────────────────────────────────────────────
     * The prose being published is a manufacturer's, transcribed from a retailer's rendering of it,
     * and on fr.iherb.com that rendering is MACHINE TRANSLATED — iHerb says so itself, in a
     * disclaimer the English page does not carry, which is why `source_content_translated` is a
     * column and not a comment. The transcribed sentences include suggested use and contraindications.
     * A customer reading "prenez 1 capsule par jour" is entitled to know that the French is a
     * translation engine's and that the printed label is what governs.
     *
     * It names no retailer and links nowhere. Attribution here is about the RELIABILITY of the text,
     * not about crediting the shop we read it from — and pointing ~19,000 product pages at a
     * competitor is not something to do by way of a footnote.
     *
     * Deliberately free of the vocabulary ImportedProductContent::UNSUPPORTED_VOCABULARY forbids: no
     * price, no stock, no availability, no delivery, no import, no review. The harness asserts that
     * against the same patterns rather than trusting this sentence.
     *
     * @param  array<string, mixed>  $row
     */
    public static function attribution(array $row): ?string
    {
        if (! self::publishable($row)) {
            return null;
        }

        /*
         * Nothing rendered means nothing to attribute — an isolated provenance note under an empty
         * section is noise.
         *
         * ── WHY THE SPEC ROWS AND THE GALLERY COUNT TOO ───────────────────────────────────
         * This used to ask only about the overview, the sections and the panel, and the overview
         * half of that is unanswerable at one of the two call sites: ApisController::productDetails()
         * deliberately does NOT select `source_overview_html` (promotion folds it into
         * description_fr), so overviewHtml() is null there by construction. A page whose source
         * carried an overview and a gallery but no directions, no ingredient list, no warnings and
         * no Supplement Facts panel — routine outside supplements — therefore rendered the
         * transcribed gallery and specification rows with NO provenance sentence, while the same row
         * handed to promotion (which has every column) produced one. The disclosure that the French
         * is a machine translation is the one thing here that must not depend on which caller asked.
         *
         * So the test is now "does this row publish anything at all", which is the same set
         * ProductDetailResource::sourceContent() uses to decide whether there is a content block.
         */
        if (self::overviewHtml($row) === null
            && self::sections($row) === []
            && self::nutritionHtml($row) === null
            && self::specs($row) === []
            && self::gallery($row) === []) {
            return null;
        }

        /*
         * NULL is not false: it means this locale's translation notice is not one the extractor has
         * verified, so the page says nothing about translation rather than asserting there was none.
         *
         * Read through a tolerant test rather than `=== true`, because this class is handed the row
         * from two places with two different levels of casting: ProductDetailResource reads a model
         * whose `source_content_translated` cast has already produced a real bool, while
         * CatalogIHerbPromote hands over Model::getAttributes(), which is what the driver returned —
         * 1, "1" or true depending on the connection. A strict comparison there would silently drop
         * the machine-translation disclosure on every promoted product, which is the one direction
         * this notice must never fail in.
         */
        /*
         * THE DISCLOSURE IS DECIDED BY THE LOCALE, NOT BY THE FLAG.
         *
         * This used to disclose only on a truthy value, so `null` — "not confirmed" — rendered the
         * short attribution, which reads as "these are the manufacturer's words". That is the wrong
         * default here, and the reason is structural rather than cautious:
         *
         *   · publishable() admits ONE language, French (PUBLISHABLE_LANGUAGE)
         *   · French is never iHerb's source language; the source is English
         *
         * So on every row this method can reach, the honest answer is either "translated" or "we
         * could not confirm" — and both must carry the caveat. `false` is reachable only for a
         * SOURCE language, which publishable() rejects before it gets here, so suppressing the
         * caveat on an explicit false costs nothing and keeps the flag meaningful if English is
         * ever published.
         *
         * So the flag is NOT consulted here at all, and that is deliberate. It is a measurement of
         * what iHerb's page declared, recorded on the row and reported by --status; it is not
         * evidence a customer-facing caveat should hang on. Hanging on it made the caveat defeatable
         * three ways: a NULL (notice not confirmed), a reworded notice, or a stray false written by
         * anything. The locale cannot be any of those - it comes from `<html lang>` on the page we
         * actually read, and publishable() has already required it.
         *
         * The `false` branch below is UNREACHABLE today, because publishable() admits only French
         * and French is not in SOURCE_LANGUAGES. It is kept rather than deleted so that publishing
         * an English locale later is a config change and not a correctness change - at which point
         * the caveat correctly disappears instead of becoming boilerplate a reader learns to ignore.
         */
        $language = strtolower(explode('-', strtolower(trim((string) ($row['source_content_locale'] ?? ''))))[0]);
        $isSourceLanguage = $language !== '' && in_array($language, self::SOURCE_LANGUAGES, true);

        if (! $isSourceLanguage) {
            return "Informations transcrites de la fiche d'origine du fabricant. "
                ."La version française provient d'une traduction automatique de la source et peut "
                ."comporter des erreurs. En cas de différence, l'étiquette imprimée sur l'emballage "
                .'fait foi.';
        }

        return "Informations transcrites de la fiche d'origine du fabricant. "
            ."En cas de différence, l'étiquette imprimée sur l'emballage fait foi.";
    }

    /**
     * The body promotion stores in `products.description_fr`.
     *
     * ── THE ORDERING DECISION, AND THE ARGUMENT FOR IT ────────────────────────────────────
     * The manufacturer's overview goes FIRST and the composed block goes after it.
     *
     * ImportedProductContent exists, in its own words, because "an imported product arrives with a
     * brand, a name, a pack size, sometimes a flavour, and nothing else" — it was written to keep a
     * page from being empty, not to be the page. Now the page has real manufacturer prose, and the
     * two are not competing for the same job: the overview says what the product IS and what it is
     * for, in the manufacturer's own sentences; the composed block states the rayon, the pack, the
     * flavour, the label disclaimer and who to ask. That is supporting structure and it reads like
     * supporting structure — after the thing it supports, never in front of it.
     *
     * The alternative ordering (composed first, so every page opens with a sentence naming the shop
     * and the rayon) is exactly the shape Google's scaled-content policy is aimed at: ~19,000 pages
     * whose first paragraph differs by a substituted noun. Putting the manufacturer's paragraph in
     * front means the first thing on the page is the thing that is genuinely different per product.
     *
     * ── WHAT IS NOT DONE HERE ─────────────────────────────────────────────────────────────
     * Nothing is rewritten, summarised, translated or padded. Two strings are concatenated in an
     * order. Either may be null and the result degrades to the other; both null returns null, which
     * is the pre-existing state that makes the storefront fall through to its own fallback.
     */
    public static function body(?string $overviewHtml, ?string $composedHtml): ?string
    {
        $overview = self::html($overviewHtml);
        $composed = self::html($composedHtml);

        if ($overview === null) {
            return $composed;
        }

        if ($composed === null) {
            return $overview;
        }

        return $overview.$composed;
    }

    /**
     * How many words the page actually renders, for the indexing gate.
     *
     * ── WHY THE GATE CANNOT JUST MEASURE description_fr ANY MORE ──────────────────────────
     * It could, while `description_fr` was the only body an imported product had. It is not: the
     * suggested-use, ingredients and warnings blocks render as their own sections on BOTH routes and
     * are stored on the staging row, not in that column. A gate that ignored them would hold a page
     * back at `seo_robots_index = 0` for being thin while serving a customer three more paragraphs —
     * a measurement of a page that is not the page.
     *
     * ── AND WHY THE SUPPLEMENT FACTS PANEL IS DELIBERATELY NOT COUNTED ────────────────────
     * It renders, and it is excluded anyway. countWords() counts every token longer than one
     * character, so a nutrient table contributes its figures, its units and its daily-value
     * percentages as "words" — a multivitamin panel can be 200 tokens of almost no prose. The gate
     * asks "is there enough readable copy here to be worth indexing", and letting a numeric table
     * answer it would clear the gate for pages that have nothing to read.
     *
     * Erring low is the documented safe direction for this number (see
     * CatalogIHerbPromote::bodyWords): a page held back is a page that sells and is not offered to
     * search engines yet, and `--reindex` picks it up the moment the copy grows. A page indexed on an
     * inflated count is a thin page in the index, which is not an action anybody takes back.
     *
     * @param  array<string, mixed>  $row
     */
    public static function renderedWordCount(?string $descriptionFr, array $row): int
    {
        $words = ImportedProductContent::countWords((string) $descriptionFr);

        foreach (self::sections($row) as $section) {
            $words += ImportedProductContent::countWords($section['html']);
        }

        return $words;
    }

    /**
     * Does the page this row produces carry a transcribed nutrition panel?
     *
     * Asked by promotion so ImportedProductContent can DROP its `label_scope` sentence, which reads
     * "Aucune valeur nutritionnelle n'est publiée pour X tant que l'étiquette … n'a pas été relevée".
     * That sentence was true of every imported product until this pipeline existed. Printed on a page
     * that now carries the panel it is simply false — and false in the specific way that class was
     * written to prevent: a stored sentence contradicting the page it is printed on.
     *
     * @param  array<string, mixed>  $row
     */
    public static function hasNutritionPanel(array $row): bool
    {
        return self::nutritionHtml($row) !== null;
    }

    /**
     * The plain-text form of the overview, for `products.seo_schema_description`.
     *
     * ProductSchemaBuilder::plainDescription() prefers `seo_schema_description`, then the 110-160
     * character meta description, then `description_fr`. Left alone, an imported product's JSON-LD
     * `description` would therefore be the composed meta description — a sized SERP string — while
     * the page carries the manufacturer's actual account of the product. This is the one legitimate
     * upgrade the new content makes to the structured data, and it is written only for rows that
     * HAVE an overview, so no legacy product's schema changes.
     *
     * Tags are stripped rather than sanitised: this value is never rendered as markup.
     *
     * @param  array<string, mixed>  $row
     */
    public static function schemaDescription(array $row): ?string
    {
        $overview = self::overviewHtml($row);
        if ($overview === null) {
            return null;
        }

        $plain = html_entity_decode(strip_tags($overview), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $plain = trim(preg_replace('~\s+~u', ' ', $plain) ?? $plain);

        if ($plain === '') {
            return null;
        }

        // The builder itself limits to 5,000 characters; cutting here as well keeps a pathological
        // page out of a legacy TEXT column rather than discovering the limit at INSERT time.
        return mb_substr($plain, 0, 5000);
    }

    // ─────────────────────────────────────────────────────────────────────────────────────
    // Internals
    // ─────────────────────────────────────────────────────────────────────────────────────

    /**
     * A stored HTML block, or null when it holds nothing a reader would see.
     *
     * `'<p></p>'` and `'  '` are both "empty" for rendering purposes and both are values a real
     * extraction can produce. Returning them would render an empty heading with a blank box under it
     * on ~19,000 pages.
     */
    private static function html(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }

        $plain = trim(html_entity_decode(strip_tags($trimmed), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        // A block whose only content is an <img> or a <table> still renders; one whose content is
        // whitespace and tags does not.
        if ($plain === '' && preg_match('~<(img|table|figure)\b~i', $trimmed) !== 1) {
            return null;
        }

        return $trimmed;
    }

    /**
     * Hosts a gallery URL may point at.
     *
     * Mirrors config/catalog.php `media.external_hosts` and frontend/next.config.js
     * `images.remotePatterns`. Read as a constant rather than through config() because this class
     * has to load with no container — and because a URL that is allowed by the config but not by
     * next.config.js renders nothing anyway, so the narrower of the two lists is the honest one.
     */
    private const IMAGE_HOSTS = [
        'cloudinary.images-iherb.com',
        's3.images-iherb.com',
    ];

    /**
     * True for true, 1 and "1"; false for false, 0, "0", "" and NULL.
     *
     * Not filter_var(FILTER_VALIDATE_BOOL): that reads "on" and "yes" as true, which no database
     * driver produces here and which would turn a stray string into a claim about translation.
     */
    private static function truthy(mixed $value): bool
    {
        return $value === true || $value === 1 || $value === '1';
    }

    private static function allowedImageUrl(string $url): bool
    {
        if (! str_starts_with(strtolower($url), 'https://')) {
            return false;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return in_array($host, self::IMAGE_HOSTS, true);
    }

    /**
     * `/s/97.jpg` → `/l/97.jpg`, and anything that is not that exact shape untouched.
     *
     * The size segment is one of iHerb's five (s, m, l, k, r) — the same set IHerbClient::imageUrl()
     * accepts — so the pattern cannot match a folder that happens to be one character long somewhere
     * else in the path.
     */
    private static function largeVariant(string $url): string
    {
        return preg_replace(
            '~(/images/[^/]+/[^/]+)/[smlkr]/(\d+\.jpg)$~',
            '$1/l/$2',
            $url
        ) ?? $url;
    }
}
