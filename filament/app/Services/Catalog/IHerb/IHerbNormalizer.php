<?php

namespace App\Services\Catalog\IHerb;

/**
 * Turn an iHerb product record into the fields protein.tn stores.
 *
 * ── DELIBERATELY FRAMEWORK-FREE ───────────────────────────────────────────────────────────
 * No Laravel imports, no facades, no container. This class holds every decision that can be wrong
 * in a way a customer notices — the pack size, the flavour, the French title — and it has to be
 * runnable in a standalone harness, because there is no `vendor/` on this machine and
 * `php artisan test` cannot execute here. Same pattern as Gtin, Figures and NutrientNames.
 *
 * ── THE RULE THAT SHAPES ALL OF IT: TRANSCRIBE, NEVER CONVERT ─────────────────────────────
 * "1.32 lb (600 g)" yields 600 g because the label PRINTS 600 g, not because 1.32 × 453.6 was
 * computed. A record that gives only pounds keeps pounds. Nothing here multiplies a quantity by a
 * conversion factor, for the same reason NutritionPanelBuilder does not: a derived number is one
 * that appears on no packaging anywhere, and on a supplement that is the failure mode that matters.
 *
 * ── AND WHERE IT IS UNSURE, IT RETURNS NULL ───────────────────────────────────────────────
 * A missing flavour is a blank field. A guessed flavour is a wrong product title on a page that
 * takes money. Every extractor below prefers null to a plausible answer.
 *
 * Verified against real payloads from /ugc/api/product/v2/{id} on 10/08/2026:
 *   id 1      "5-HTP, 100 mg, 60 Veggie Caps"                                  Doctor's Best
 *   id 68616  "Micronized Creatine Powder, Unflavored, 1.32 lb (600 g)"        Optimum Nutrition
 *   id 46873  "Curcumin Phytosome™, 180 Veggie Caps (500 mg per Capsule)"      Doctor's Best
 *
 * ── WHAT THE SOURCE DOES NOT CARRY, SAID OUT LOUD ─────────────────────────────────────────
 * /ugc/api/product/v2/{id} is an IDENTITY AND PRICE record. Every key it is known to return is
 * listed in KNOWN_PAYLOAD_KEYS below, and none of them is a description, an ingredient list, a
 * Supplement Facts panel, a video, an image COUNT or a second image URL. So there is no unread
 * "rich data" sitting in `source_payload` waiting to be mapped: an imported row genuinely arrives
 * with a name, a brand, a price, a category, one image index and two booleans.
 *
 * That is a fact about the source, not a gap in this class, and the honest response to it is
 * `source_unmapped_keys`: every key the payload carried that this class did NOT consume is recorded
 * on the row. If iHerb ever starts returning a description, a nutrition block or a media array, it
 * shows up there on the next hydrate (and on every existing row after
 * `catalog:iherb:hydrate --renormalize`, which costs no HTTP request) instead of being silently
 * discarded. `catalog:iherb:payload-audit` prints the same thing across the whole staging table.
 */
class IHerbNormalizer
{
    /**
     * Every payload key this class reads. Anything else lands in `source_unmapped_keys`.
     *
     * This list IS the definition of "captured", which is why unmappedKeys() derives from it rather
     * than from a second hand-written list: a key added to normalize() and forgotten here would be
     * reported as unmapped forever, and the reverse — a key listed here and read nowhere — is caught
     * by the harness, which asserts every entry is actually referenced in this file.
     */
    public const KNOWN_PAYLOAD_KEYS = [
        'brandCode',
        'brandName',
        'discountPrice',
        'displayName',
        'id',
        'isAvailableToPurchase',
        'isDiscontinued',
        'listPrice',
        'partNumber',
        'primaryImageIndex',
        'rootCategoryId',
        'rootCategoryName',
        'url',
        'urlName',
    ];

    /** Image variants iHerb serves. Mirrors the set IHerbClient::imageUrl() accepts. */
    private const IMAGE_SIZES = ['s', 'm', 'l', 'k', 'r'];

    /**
     * Pack units that measure a PER-UNIT DOSE rather than the pack.
     *
     * Same rule, and the same reason, as ImportedProductContent::UNIT_GROUPS' `dose` group: "500 mg"
     * reaching `pack_unit` is the strength of one capsule, so printing it as the conditionnement
     * turns a 180-capsule bottle into a 500 mg product. packLabel() returns null for these, which is
     * what keeps the specification table and the composed body saying the same thing.
     */
    private const DOSE_UNITS = ['mg', 'µg', 'mcg'];
    /**
     * Units that denote a pack size, mapped to how protein.tn writes them in French.
     *
     * Order matters in the matching regex: longer forms first, so "Veggie Capsules" is not matched
     * as "Capsules" and "Soft Gels" is not matched as "Gels".
     */
    private const UNITS = [
        'vegetarian capsules' => 'gélules végétales',
        'veggie capsules' => 'gélules végétales',
        'vegan capsules' => 'gélules véganes',
        'veg capsules' => 'gélules végétales',
        'veggie caps' => 'gélules végétales',
        'vegan caps' => 'gélules véganes',
        'veg caps' => 'gélules végétales',
        'soft gels' => 'capsules molles',
        'softgels' => 'capsules molles',
        'softgel' => 'capsules molles',
        'capsules' => 'gélules',
        'capsule' => 'gélule',
        'caps' => 'gélules',
        'tablets' => 'comprimés',
        'tablet' => 'comprimé',
        'tabs' => 'comprimés',
        'gummies' => 'gommes',
        'lozenges' => 'pastilles',
        'packets' => 'sachets',
        'packet' => 'sachet',
        'servings' => 'portions',
        'serving' => 'portion',
        'fl oz' => 'fl oz',
        'oz' => 'oz',
        'lbs' => 'lb',
        'lb' => 'lb',
        'kg' => 'kg',
        'mg' => 'mg',
        'mcg' => 'µg',
        'ml' => 'ml',
        'l' => 'l',
        'g' => 'g',
    ];

    /**
     * Flavour vocabulary. High precision, deliberately incomplete.
     *
     * A comma-segment counts as a flavour only if it contains one of these. That misses exotic
     * flavours, which costs a blank field — whereas treating any unrecognised segment as a flavour
     * would put "Advanced Growth Formula" or "Children 8+ & Teens" in the flavour slot and print it
     * on the product title.
     */
    private const FLAVOUR_TOKENS = [
        'chocolate', 'vanilla', 'strawberry', 'banana', 'cookies', 'cream', 'caramel', 'coffee',
        'mocha', 'peanut butter', 'cinnamon', 'mint', 'berry', 'berries', 'blueberry', 'raspberry',
        'cherry', 'citrus', 'orange', 'lemon', 'lime', 'grape', 'apple', 'mango', 'peach', 'punch',
        'watermelon', 'pineapple', 'coconut', 'cookie', 'brownie', 'birthday cake', 'rocky road',
        'salted', 'unflavored', 'unflavoured', 'natural flavor', 'tropical', 'fruit', 'melon',
        'blue razz', 'bubblegum', 'candy', 'marshmallow', 'hazelnut', 'pistachio', 'honey',
    ];

    private const FLAVOUR_FR = [
        'unflavored' => 'Sans arôme',
        'unflavoured' => 'Sans arôme',
    ];

    /**
     * Normalise one hydrated product.
     *
     * @param  array<string, mixed>  $payload  a /ugc/api/product/v2/{id} response
     * @return array<string, mixed>
     */
    public function normalize(array $payload): array
    {
        $sourceTitle = trim((string) ($payload['displayName'] ?? ''));
        $brandName = trim((string) ($payload['brandName'] ?? ''));

        // The v2 endpoint's displayName excludes the brand, but the catalog feed's `Name` includes
        // it. Strip defensively so a title never reads "Optimum Nutrition Optimum Nutrition ...".
        $productPart = $this->stripLeadingBrand($sourceTitle, $brandName);

        $pack = $this->packSize($sourceTitle);
        $flavour = $this->flavour($productPart);
        $listPrice = $this->price($payload['listPrice'] ?? null);
        $discountPrice = $this->price($payload['discountPrice'] ?? null);

        return [
            'external_product_id' => (string) ($payload['id'] ?? ''),
            'external_part_number' => trim((string) ($payload['partNumber'] ?? '')) ?: null,
            'external_url' => trim((string) ($payload['url'] ?? '')) ?: null,
            'external_url_name' => trim((string) ($payload['urlName'] ?? '')) ?: null,

            'source_title' => $sourceTitle ?: null,
            'source_brand_name' => $brandName ?: null,
            'source_brand_code' => trim((string) ($payload['brandCode'] ?? '')) ?: null,
            'source_root_category_id' => isset($payload['rootCategoryId']) ? (string) $payload['rootCategoryId'] : null,
            'source_root_category_name' => trim((string) ($payload['rootCategoryName'] ?? '')) ?: null,
            'source_list_price' => $listPrice['amount'] ?? null,
            'source_discount_price' => $discountPrice['amount'] ?? null,
            'source_currency' => $listPrice['currency'] ?? $discountPrice['currency'] ?? null,
            'source_available' => (bool) ($payload['isAvailableToPurchase'] ?? false),
            /**
             * Derived HERE and not in HydrateExternalProductJob::store().
             *
             * store() used to add it alongside the normalised array, which meant
             * `catalog:iherb:hydrate --renormalize` — the command whose entire purpose is to
             * re-derive every payload-derived column with no HTTP request — could not refresh it.
             * One payload key, two derivations, one of them unreachable from the recovery path.
             * (PHP's `+` already gave this array precedence over store()'s literal, so moving it
             * changes no stored value on any existing row; it changes which command can fix it.)
             */
            'source_discontinued' => (bool) ($payload['isDiscontinued'] ?? false),
            'source_primary_image_index' => isset($payload['primaryImageIndex']) ? (int) $payload['primaryImageIndex'] : null,
            /**
             * The cover URL, resolved once and stored.
             *
             * CatalogIHerbPromote::coverUrl() rebuilds this from the part number and the image index
             * at promotion time, which is fine and stays. Storing it here is what lets the staging
             * row, the Filament admin and any report show the exact URL a promotion WOULD use —
             * before anything is promoted — instead of each caller re-deriving it. Still a single
             * primary image; see unmappedKeys() for why there is no gallery.
             */
            'source_image_url' => self::imageUrl(
                trim((string) ($payload['partNumber'] ?? '')) ?: null,
                isset($payload['primaryImageIndex']) ? (int) $payload['primaryImageIndex'] : null,
            ),
            /** Everything the source sent that nothing above reads. See the class docblock. */
            'source_unmapped_keys' => self::unmappedKeys($payload),

            'normalized_title' => $this->frenchTitle($brandName, $productPart, $flavour, $pack),
            'normalized_brand_key' => $this->brandKey($brandName),
            'flavour' => $flavour,
            'pack_size' => $pack['quantity'] ?? null,
            'pack_unit' => $pack['unit'] ?? null,
        ];
    }

    /**
     * The payload keys nothing in this class reads, sorted.
     *
     * ── WHY THIS IS A STORED COLUMN AND NOT A COMMENT ─────────────────────────────────────
     * The question the owner actually asked is "are we getting the full rich data". A docblock
     * listing fifteen keys answers it for the day it was written and never again: the moment iHerb
     * adds a `description`, an `ingredients` or a `media` array, this class keeps mapping the same
     * fourteen fields and throws the new one away on every one of ~19,000 rows, silently, forever.
     *
     * Recording what was NOT consumed makes that visible without storing anything twice — the full
     * response is already in `source_payload`, so this is an index into it, not a copy of it. An
     * empty array is a real answer ("the source carried nothing we ignored"); NULL means the row has
     * not been re-normalised since this column existed, which is a different statement.
     *
     * @param  array<string, mixed>  $payload
     * @return list<string>
     */
    public static function unmappedKeys(array $payload): array
    {
        $unknown = array_values(array_diff(array_keys($payload), self::KNOWN_PAYLOAD_KEYS));
        sort($unknown);

        return $unknown;
    }

    /**
     * The product-image URL iHerb serves — the same construction as IHerbClient::imageUrl().
     *
     * ── WHY THIS IS A SECOND COPY, DELIBERATELY ───────────────────────────────────────────
     * IHerbClient imports PoliteFetcher and Log, so a class that `use`s it cannot be loaded by a
     * standalone harness — and this class exists precisely because there is no vendor/ here and its
     * decisions have to be runnable under a bare `php`. PromotionGate already carries the same copy
     * for the same reason and documents it, and promotion-gate-check.php asserts the two agree case
     * by case rather than trusting that they do. normalizer-payload-capture-check.php does the same
     * for this one, against the identical case table: a copy nobody checks is a copy that drifts.
     *
     * Recorded as a reference, not mirrored — see the media notes in config/catalog.php.
     */
    public static function imageUrl(?string $partNumber, ?int $imageIndex, string $size = 'l'): ?string
    {
        $part = strtolower(trim((string) $partNumber));
        if ($part === '' || $imageIndex === null || ! in_array($size, self::IMAGE_SIZES, true)) {
            return null;
        }

        // "OPN-02385" → brand folder "opn", asset folder "opn02385"
        if (preg_match('~^([a-z]{2,4})-?(\w+)$~', $part, $m) !== 1) {
            return null;
        }

        return sprintf(
            'https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/%s/%s%s/%s/%d.jpg',
            $m[1], $m[1], $m[2], $size, $imageIndex
        );
    }

    /**
     * The pack, written the way a French page prints it — "600 g", "60 gélules végétales" — or null.
     *
     * Null for a dose unit (see DOSE_UNITS) and null for a missing or non-positive quantity. This is
     * the string the product page's specification row shows, and it is built with the SAME number
     * formatting and the SAME dose rule as the composed description, so a page cannot say "600 g" in
     * one place and something else three paragraphs down.
     */
    public static function packLabel(mixed $size, mixed $unit): ?string
    {
        $unitText = trim((string) ($unit ?? ''));
        if ($unitText === '') {
            return null;
        }

        if (in_array(mb_strtolower($unitText), self::DOSE_UNITS, true)) {
            return null;
        }

        if (! is_numeric($size)) {
            return null;
        }

        $quantity = (float) $size;
        if ($quantity <= 0) {
            return null;
        }

        return self::frenchNumber($quantity).' '.$unitText;
    }

    /**
     * `"$138.03"` → `['amount' => 138.03, 'currency' => 'USD']`.
     *
     * Thousands separators are stripped before parsing: `(float) "1,234.56"` is 1.0 in PHP, so a
     * $1,234 product would silently become a $1 product and, once the pricing formula ran, a
     * catastrophically underpriced one.
     *
     * @return array{amount: float, currency: string}|null
     */
    public function price(mixed $raw): ?array
    {
        $text = trim((string) $raw);
        if ($text === '') {
            return null;
        }

        $currency = match (true) {
            str_contains($text, '$') => 'USD',
            str_contains($text, '€') => 'EUR',
            str_contains($text, '£') => 'GBP',
            default => 'USD',
        };

        $digits = preg_replace('~[^0-9.]~', '', str_replace(',', '', $text)) ?? '';
        if ($digits === '' || ! is_numeric($digits)) {
            return null;
        }

        $amount = (float) $digits;

        return $amount > 0 ? ['amount' => round($amount, 2), 'currency' => $currency] : null;
    }

    /**
     * The pack size, preferring the metric value the label already prints.
     *
     * "1.32 lb (600 g)"                → 600 g      — metric is printed in the parentheses
     * "5.05 lb (2.29 kg)"              → 2.29 kg
     * "60 Veggie Caps"                 → 60 gélules végétales
     * "180 Veggie Caps (500 mg per Capsule)" → 180 gélules végétales, NOT 500 mg
     * "16 oz"                          → 16 oz     — no metric given, so pounds/ounces are kept
     *
     * The per-unit strength trap is real: "(500 mg per Capsule)" is the dose in ONE capsule, not the
     * pack. Reading it as the pack size would turn a 180-capsule bottle into a 500 mg product.
     *
     * ── THE COMMA IS A THOUSANDS SEPARATOR, NOT A DECIMAL POINT ───────────────────────────
     * iHerb writes US-formatted numbers, so "1,361 g" is 1361 grams and "1,000 Tablets" is a bottle
     * of a thousand. This method used to do `str_replace(',', '.')` — reading that comma as a French
     * decimal point — while price() twelve lines above does `str_replace(',', '')` and documents
     * exactly why. Two methods in one class, parsing numbers from the same payload, disagreeing about
     * what a comma means.
     *
     * The result was a factual error 1000x in size, printed in the H1 and baked into the permanent
     * URL: "NOW Foods Vitamin C Crystals – 1,361 g" is 1.361 grams in French, which is not a product
     * anybody sells. Caught in a promotion dry run on 10/08/2026, before any row was promoted.
     * `pack_size` is also what the completeness score and the description's "Conditionnement" line
     * read, so the same wrong figure reached three places from one parse.
     *
     * ── AND AN AMBIGUOUS NUMBER NOW YIELDS NOTHING ────────────────────────────────────────
     * The leading `(?<![\d,])` is what makes a European-formatted "1,36 g" match NOTHING rather than
     * quietly matching the "36". Without it the engine simply restarts after the comma and returns a
     * confident wrong answer — the failure mode this class's own docblock says it exists to avoid.
     * A blank pack size costs 10 completeness points; a wrong one is on the page.
     *
     * @return array{quantity: float, unit: string}|null
     */
    public function packSize(string $title): ?array
    {
        if ($title === '') {
            return null;
        }

        // "per Capsule" / "per Serving" qualifies a dose, never a pack. Remove those spans first.
        $clean = preg_replace('~\([^)]*\bper\b[^)]*\)~i', ' ', $title) ?? $title;

        $units = implode('|', array_map(
            static fn (string $u): string => preg_quote($u, '~'),
            array_keys(self::UNITS)
        ));

        // Grouped form FIRST: alternation is leftmost-first, so `\d+` would otherwise match the "1"
        // of "1,361" and stop, and the match would fail on the comma that follows.
        $number = '\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?';

        if (! preg_match_all('~(?<![\d,])('.$number.')\s*('.$units.')\b~i', $clean, $matches, PREG_SET_ORDER)) {
            return null;
        }

        $candidates = [];
        foreach ($matches as $match) {
            // Commas are separators between groups of three and carry no value. Same rule as price().
            $quantity = (float) str_replace(',', '', $match[1]);
            $unitRaw = mb_strtolower(trim($match[2]));
            if ($quantity <= 0) {
                continue;
            }
            $candidates[] = ['quantity' => $quantity, 'unit' => self::UNITS[$unitRaw] ?? $unitRaw, 'raw' => $unitRaw];
        }

        if ($candidates === []) {
            return null;
        }

        // Metric mass/volume wins when present — it is what a Tunisian customer reads, and it is
        // printed on the same label, not computed from the imperial figure.
        foreach (['kg', 'g', 'ml', 'l'] as $preferred) {
            foreach ($candidates as $candidate) {
                if ($candidate['raw'] === $preferred) {
                    return ['quantity' => $candidate['quantity'], 'unit' => $candidate['unit']];
                }
            }
        }

        // Otherwise a countable form (capsules, tablets…), which is the pack size for pill products.
        foreach ($candidates as $candidate) {
            if (! in_array($candidate['raw'], ['mg', 'mcg', 'g', 'ml', 'l', 'kg', 'oz', 'fl oz', 'lb', 'lbs'], true)) {
                return ['quantity' => $candidate['quantity'], 'unit' => $candidate['unit']];
            }
        }

        $first = $candidates[0];

        return ['quantity' => $first['quantity'], 'unit' => $first['unit']];
    }

    /**
     * The flavour, or null.
     *
     * Only a comma-segment carrying a known flavour word qualifies. "Advanced Growth Formula" and
     * "Children 8+ & Teens" are comma-segments too, and printing either as a flavour would be worse
     * than printing nothing.
     */
    public function flavour(string $title): ?string
    {
        foreach (array_map('trim', explode(',', $title)) as $segment) {
            if ($segment === '') {
                continue;
            }

            $lower = mb_strtolower($segment);

            // A segment that is essentially a measurement is a size, not a flavour.
            if (preg_match('~^\d+(?:[.,]\d+)?\s*[a-z%°\s]*$~i', $segment) === 1) {
                continue;
            }

            foreach (self::FLAVOUR_TOKENS as $token) {
                if (str_contains($lower, $token)) {
                    foreach (self::FLAVOUR_FR as $needle => $french) {
                        if (str_contains($lower, $needle)) {
                            return $french;
                        }
                    }

                    // Flavours are proper nouns on the packaging; keep the source's own wording and
                    // capitalisation rather than translating "Double Rich Chocolate" into something
                    // that appears on no tub.
                    return $this->tidy($segment);
                }
            }
        }

        return null;
    }

    /**
     * The customer-facing French title.
     *
     * `Optimum Nutrition Gold Standard 100% Whey – Double Rich Chocolate – 2,29 kg`
     *
     * Brand first (how Tunisian customers search), then the product, then flavour and size as
     * separate en-dash segments. Decimal commas, because the rest of the site writes French numbers.
     * The brand's own spelling is never altered.
     *
     * @param  array{quantity: float, unit: string}|null  $pack
     */
    public function frenchTitle(string $brand, string $product, ?string $flavour, ?array $pack): ?string
    {
        $product = $this->stripTrailingDescriptors($product, $flavour, $pack);
        $product = $this->tidy($product);

        if ($product === '' && $brand === '') {
            return null;
        }

        $parts = [trim(trim($brand).' '.$product)];

        if ($flavour !== null && $flavour !== '') {
            $parts[] = $flavour;
        }

        if ($pack !== null) {
            $parts[] = self::frenchNumber($pack['quantity']).' '.$pack['unit'];
        }

        $title = implode(' – ', array_filter($parts, static fn (string $p): bool => trim($p) !== ''));

        // The column is varchar(500); truncate on a word boundary rather than mid-word.
        return mb_strlen($title) <= 500 ? $title : rtrim(mb_substr($title, 0, mb_strrpos(mb_substr($title, 0, 500), ' ') ?: 500));
    }

    /**
     * Remove the segments already promoted to their own fields, so they are not printed twice.
     *
     * "Micronized Creatine Powder, Unflavored, 1.32 lb (600 g)" → "Micronized Creatine Powder"
     *
     * @param  array{quantity: float, unit: string}|null  $pack
     */
    private function stripTrailingDescriptors(string $product, ?string $flavour, ?array $pack): string
    {
        $segments = array_map('trim', explode(',', $product));
        $kept = [];

        foreach ($segments as $index => $segment) {
            if ($segment === '') {
                continue;
            }

            // The first segment is the product name; never drop it, whatever it looks like.
            if ($index === 0) {
                $kept[] = $segment;

                continue;
            }

            // Anything that is purely a size/measurement, or the flavour we already extracted.
            if (preg_match('~\d~', $segment) === 1 && $pack !== null) {
                continue;
            }
            if ($flavour !== null && $this->tidy($segment) === $flavour) {
                continue;
            }
            if ($flavour !== null && mb_strtolower($segment) === 'unflavored') {
                continue;
            }

            $kept[] = $segment;
        }

        return implode(', ', $kept);
    }

    /** Drop a leading brand so the title does not repeat it. */
    private function stripLeadingBrand(string $title, string $brand): string
    {
        $brand = trim($brand);
        if ($brand === '' || $title === '') {
            return $title;
        }

        $pattern = '~^\s*'.preg_quote($brand, '~').'\s*[,\-–:]?\s*~iu';

        return trim(preg_replace($pattern, '', $title) ?? $title);
    }

    /** "2.29" → "2,29"; "600" → "600". French decimals, no rounding. Static so packLabel() shares it. */
    private static function frenchNumber(float $value): string
    {
        $formatted = rtrim(rtrim(number_format($value, 3, '.', ''), '0'), '.');

        return str_replace('.', ',', $formatted === '' ? '0' : $formatted);
    }

    /** Collapse whitespace and strip trademark marks and dangling punctuation. */
    private function tidy(string $text): string
    {
        $clean = str_replace(['®', '™', '©'], '', $text);
        $clean = preg_replace('~\s+~u', ' ', $clean) ?? $clean;

        return trim($clean, " \t\n\r\0\x0B,;:-–");
    }

    /** Mirrors App\Support\BrandKey::for(); duplicated so this class stays framework-free. */
    private function brandKey(string $name): ?string
    {
        if (trim($name) === '') {
            return null;
        }

        $key = mb_strtolower($this->asciiFold($name), 'UTF-8');
        $key = preg_replace('~\b(?:sarl|sa|inc|ltd|limited|llc|gmbh|bv|nv|co|corp|corporation|company)\b~u', ' ', $key) ?? $key;
        $key = preg_replace('~[^a-z0-9]+~', ' ', $key) ?? $key;
        $key = trim(preg_replace('~\s+~', ' ', $key) ?? $key);

        return $key === '' ? null : $key;
    }

    /** Minimal accent folding, so this file needs no Illuminate\Support\Str. */
    private function asciiFold(string $text): string
    {
        $map = [
            'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a', 'æ' => 'ae',
            'ç' => 'c', 'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e', 'ì' => 'i', 'í' => 'i',
            'î' => 'i', 'ï' => 'i', 'ñ' => 'n', 'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o',
            'ö' => 'o', 'ø' => 'o', 'œ' => 'oe', 'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
            'ý' => 'y', 'ÿ' => 'y', 'ß' => 'ss', '®' => '', '™' => '', '©' => '',
        ];

        return strtr(mb_strtolower($text, 'UTF-8'), $map);
    }
}
