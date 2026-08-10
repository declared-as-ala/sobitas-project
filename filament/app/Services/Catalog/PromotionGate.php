<?php

namespace App\Services\Catalog;

/**
 * May this staged row become a real, publishable product?
 *
 * ── THIS CLASS IS THE REVIEWER ────────────────────────────────────────────────────────────
 * Roughly 13,000 hydrated rows are heading for promotion. Nobody is going to read them. So the
 * question this class answers is not "is this row plausible?" but "is publishing this row, unread,
 * safe?" — and those two have different answers often enough that the difference is the whole
 * design. Every gate below rejects on absence, never on suspicion: a row is promotable only when
 * each fact a product page needs is actually present, and anything missing keeps the row in staging,
 * which costs nothing and is reversible.
 *
 * ── REJECTIONS ARE DATA ───────────────────────────────────────────────────────────────────
 * Nothing here throws. A rejection is a value with a machine-readable reason and a sentence carrying
 * the measured number that caused it, so `catalog:iherb:promote --report` can say "8,412 rows are
 * unclassified" instead of "8,412 rows were not promoted". The first is a worklist — add
 * classification rules and re-run. The second is a shrug.
 *
 * Every gate is evaluated, not just the first failing one. `reason` is the first failure in the
 * order below (the one a report should count a row against), `failures` is all of them (so a row
 * that fails four gates is not mistaken for one that fails one and would promote after a small fix).
 *
 * ── FRAMEWORK-FREE, DELIBERATELY ──────────────────────────────────────────────────────────
 * No Laravel imports, no facades, no container, no Eloquent. Everything it needs — the classification
 * rules, the pricing figures, the set of subcategory slugs that exist — arrives as plain arrays from
 * the caller. That is what lets filament/tests/catalog/promotion-gate-check.php execute it under a
 * bare `php` with no vendor/, on a machine where `artisan` and `phpunit` cannot run at all. Same
 * constraint, and the same solution, as IHerbNormalizer and SubCategoryClassifier.
 */
final class PromotionGate
{
    /**
     * Mirrors App\Models\ExternalCatalogProduct::STATUS_HYDRATED.
     *
     * Duplicated rather than imported, for the reason above: referencing the model would drag
     * Eloquent in and make this class unloadable in the standalone harness. IHerbNormalizer
     * duplicates App\Support\BrandKey for exactly the same reason. Two constants, one string, and
     * the harness is what keeps them honest.
     */
    public const STATUS_HYDRATED = 'hydrated';

    /**
     * The staging column is varchar(500) and IHerbNormalizer::frenchTitle() already truncates to it.
     * A longer value here means the title did not come from the normaliser, which is a reason to
     * stop rather than to trim: `products.designation_fr` is a legacy column of unknown length and
     * an over-length insert is SQLSTATE[22001] 1406, not a silent truncation.
     */
    public const MAX_TITLE = 500;

    // ── Rejection reasons ─────────────────────────────────────────────────────────────────
    public const NOT_HYDRATED = 'not_hydrated';
    public const ALREADY_PROMOTED = 'already_promoted';
    public const DISCONTINUED = 'discontinued';
    public const NO_TITLE = 'no_title';
    public const TITLE_TOO_LONG = 'title_too_long';
    public const NO_BRAND = 'no_brand';
    public const NO_PRICE = 'no_price';
    public const PRICE_TOO_LOW = 'price_too_low';
    public const INCOMPLETE = 'incomplete';
    public const UNCLASSIFIED = 'unclassified';
    public const SUBCATEGORY_MISSING = 'subcategory_missing';

    /**
     * Evaluation order, and the order a report should print.
     *
     * Chosen so the counts are actionable rather than merely accurate. State comes first because a
     * row in the wrong state was never a candidate. Then the facts the source either gave us or did
     * not (title, brand, price) — nothing we can do about those. Classification is LAST on purpose:
     * it is the only gate whose failures the owner can fix in bulk, by adding a rule to
     * config/catalog.classification, so it is the number worth reading at the bottom of the report.
     *
     * @var array<string, string>
     */
    public const REASONS = [
        self::NOT_HYDRATED => 'not in the `hydrated` state',
        self::ALREADY_PROMOTED => 'already promoted — a product exists for this row',
        self::DISCONTINUED => 'discontinued at the source',
        self::NO_TITLE => 'no normalised title',
        self::TITLE_TOO_LONG => 'title longer than '.self::MAX_TITLE.' characters',
        self::NO_BRAND => 'no brand could be identified',
        self::NO_PRICE => 'no source list price, so no Tunisian price',
        self::PRICE_TOO_LOW => 'price at or below catalog.pricing.min_price',
        self::INCOMPLETE => 'below catalog.promotion.min_completeness',
        self::UNCLASSIFIED => 'no classification rule matched the product name',
        self::SUBCATEGORY_MISSING => 'classified subcategory does not exist in sous_categories',
    ];

    /**
     * Turn config/catalog.php plus the shop's current subcategory slugs into the context inspect()
     * wants.
     *
     * A single builder so the command and the standalone harness cannot drift into evaluating
     * against two different sets of thresholds — the harness `require`s the real config file rather
     * than copying numbers out of it, which is what makes it able to fail when the SHIPPED
     * configuration is wrong instead of only when the test's copy is.
     *
     * @param  array<string, mixed>  $catalog  the whole config('catalog') array
     * @param  array<string, int>  $subcategoryIdsBySlug  sous_categories.slug => id, as it is NOW
     * @return array<string, mixed>
     */
    public static function contextFrom(array $catalog, array $subcategoryIdsBySlug): array
    {
        $promotion = (array) ($catalog['promotion'] ?? []);
        $pricing = (array) ($catalog['pricing'] ?? []);

        return [
            'rules' => (array) ($catalog['classification'] ?? []),
            'subcategory_ids' => $subcategoryIdsBySlug,
            'pricing' => $pricing,
            'min_price' => (float) ($pricing['min_price'] ?? 0),
            'min_completeness' => (int) ($promotion['min_completeness'] ?? 0),
            'require_brand' => (bool) ($promotion['require_brand'] ?? true),
            'require_price' => (bool) ($promotion['require_price'] ?? true),
        ];
    }

    /**
     * Inspect one staged row. Never throws, never touches the database, never mutates anything.
     *
     * @param  array<string, mixed>  $row  the staging row's attributes. Reads: status, product_id,
     *                                     source_discontinued, normalized_title, external_url_name,
     *                                     normalized_brand_key, source_brand_name,
     *                                     source_list_price, completeness, sous_category_id.
     *                                     Raw DB values are fine — every read is cast defensively.
     * @param  array<string, mixed>  $context  from contextFrom()
     * @return array{
     *     promotable: bool,
     *     reason: ?string,
     *     detail: ?string,
     *     failures: list<array{reason: string, detail: string}>,
     *     sub_slug: ?string,
     *     sub_id: ?int,
     *     sub_term: ?string,
     *     sub_source: ?string,
     *     price: ?float,
     *     title: string
     * }
     */
    public static function inspect(array $row, array $context): array
    {
        $subcategoryIds = (array) ($context['subcategory_ids'] ?? []);
        $minPrice = (float) ($context['min_price'] ?? 0);
        $minCompleteness = (int) ($context['min_completeness'] ?? 0);

        $title = trim((string) ($row['normalized_title'] ?? ''));
        $completeness = (int) ($row['completeness'] ?? 0);

        // Resolved before the gates run, because two other things depend on it: the price may carry
        // a per-subcategory margin, and a rejection has to be able to name the subcategory it could
        // not find rather than reporting a bare "none".
        $sub = self::resolveSubCategory($row, (array) ($context['rules'] ?? []), $subcategoryIds);
        $price = self::tunisianPrice($row['source_list_price'] ?? null, (array) ($context['pricing'] ?? []), $sub['id']);

        $failures = [];

        $add = static function (string $reason, string $detail) use (&$failures): void {
            $failures[] = ['reason' => $reason, 'detail' => $detail];
        };

        // ── State. A row in any other state was never a candidate ─────────────────────────
        $status = (string) ($row['status'] ?? '');
        if ($status !== self::STATUS_HYDRATED) {
            $add(self::NOT_HYDRATED, sprintf('status is `%s`, not `%s`', $status === '' ? '(none)' : $status, self::STATUS_HYDRATED));
        }

        // `product_id` is authoritative, not `status`. If a previous run created the product and
        // then died before writing `promoted`, the status is stale and the product is real —
        // re-promoting on the strength of the status alone is how you get two pages for one product.
        $productId = $row['product_id'] ?? null;
        if ($productId !== null && $productId !== '' && (int) $productId > 0) {
            $add(self::ALREADY_PROMOTED, sprintf('product_id is %d', (int) $productId));
        }

        // ── Source facts ──────────────────────────────────────────────────────────────────
        // A discontinued product is one iHerb has stopped selling. Importing it creates a page for
        // something that cannot be restocked, which is a permanent 0-inventory URL and, in time, a
        // thin page Google has to be told about twice.
        if (self::truthy($row['source_discontinued'] ?? false)) {
            $add(self::DISCONTINUED, 'source_discontinued is true');
        }

        if ($title === '') {
            $add(self::NO_TITLE, 'normalized_title is empty');
        } elseif (mb_strlen($title) > self::MAX_TITLE) {
            $add(self::TITLE_TOO_LONG, sprintf('normalized_title is %d characters (max %d)', mb_strlen($title), self::MAX_TITLE));
        }

        // ── Brand ─────────────────────────────────────────────────────────────────────────
        // What is checked is a brand IDENTITY, not an existing `brands` row. BrandMatcher creates
        // the row when it has a name to create it from, and that is intended — a new supplier brand
        // is a normal outcome of an import, which is why BrandMatcher::pendingNewBrands() exists to
        // preview them. Requiring a pre-existing row would reject nearly the whole catalogue for
        // being new. What must NOT happen is a nameless product collecting into a "" brand, and that
        // is exactly what this rejects.
        if ((bool) ($context['require_brand'] ?? true) && ! self::hasBrandIdentity($row)) {
            $add(self::NO_BRAND, 'neither normalized_brand_key nor source_brand_name carries a name');
        }

        // ── Price ─────────────────────────────────────────────────────────────────────────
        // Presence is checked even when require_price is false. That flag is a policy about the
        // MINIMUM; the presence of a price is structural, because `products.prix` is what the offer
        // in the JSON-LD and the add-to-cart button are built from, and ProductSchemaBuilder emits
        // no Product schema at all when the price is not finite.
        if ($price === null) {
            $add(self::NO_PRICE, 'source_list_price is missing or not positive');
        } elseif ((bool) ($context['require_price'] ?? true) && $price <= $minPrice) {
            $add(self::PRICE_TOO_LOW, sprintf('computed price %.3f is not above the %.3f floor', $price, $minPrice));
        }

        if ($completeness < $minCompleteness) {
            $add(self::INCOMPLETE, sprintf('completeness %d is below %d', $completeness, $minCompleteness));
        }

        // ── Subcategory. The gate that decides the URL ────────────────────────────────────
        // `require_mapped_category` is not consulted, and that is not an oversight. The public path
        // is /{sous_category.slug}/{product.slug}; a product with no subcategory renders at
        // /shop/{slug}, which middleware 301s away. There is no version of this import in which an
        // unclassified product can be published, so the flag has nothing to switch off. It stays in
        // config as a statement of intent.
        if ($sub['slug'] === null && $sub['source'] === null) {
            $add(self::UNCLASSIFIED, sprintf('no rule matched "%s"', self::excerpt($title !== '' ? $title : (string) ($row['external_url_name'] ?? ''))));
        } elseif ($sub['id'] === null) {
            $add(self::SUBCATEGORY_MISSING, $sub['source'] === 'explicit'
                ? sprintf('staging sous_category_id %d is not a known subcategory', (int) ($row['sous_category_id'] ?? 0))
                : sprintf('classified as `%s` (term "%s") but no sous_categories row has that slug', (string) $sub['slug'], (string) $sub['term']));
        }

        // Ordered, so `reason` is deterministic whichever order the gates were appended in above.
        $failures = self::inReportOrder($failures);

        return [
            'promotable' => $failures === [],
            'reason' => $failures[0]['reason'] ?? null,
            'detail' => $failures[0]['detail'] ?? null,
            'failures' => $failures,
            'sub_slug' => $sub['slug'],
            'sub_id' => $sub['id'],
            'sub_term' => $sub['term'],
            'sub_source' => $sub['source'],
            'price' => $price,
            'title' => $title,
        ];
    }

    /**
     * iHerb's list price → the Tunisian selling price.
     *
     *     prix = source_list_price × usd_to_tnd × (1 + margin) × (1 + customs), rounded UP to round_to
     *
     * ── LIST PRICE ONLY ───────────────────────────────────────────────────────────────────
     * Never the discount price, and there is no fallback to it. A discount is a promotion on THEIR
     * shop, on their timetable; pricing off it bakes a competitor's sale into our permanent price
     * and, when the sale ends, leaves us selling below cost with nothing in our own data to explain
     * why. A product iHerb lists with no list price simply fails the NO_PRICE gate and stays staged.
     *
     * Note this diverges from HydrateExternalProductJob::tunisianPrice(), which DOES fall back to the
     * discount price when computing the staged `computed_price`. That figure is a preview for the
     * admin; this one is the price a customer pays, and only this one is written to `products.prix`.
     * The promote command writes the result back over `computed_price`, so the two agree from the
     * moment a row is promoted.
     *
     * ── ROUNDING UP ───────────────────────────────────────────────────────────────────────
     * `ceil`, because rounding a computed cost DOWN eats the margin the formula was configured to
     * produce — across 13,000 products, half a dinar each way is not a rounding error, it is the
     * margin.
     *
     * @param  array<string, mixed>  $pricing  config('catalog.pricing')
     * @param  ?int  $sousCategoryId  when set, `pricing.per_category[$id]` overrides the margin
     */
    public static function tunisianPrice(mixed $listPrice, array $pricing, ?int $sousCategoryId = null): ?float
    {
        if ($listPrice === null || $listPrice === '' || ! is_numeric($listPrice)) {
            return null;
        }

        $base = (float) $listPrice;
        if ($base <= 0) {
            return null;
        }

        $perCategory = (array) ($pricing['per_category'] ?? []);
        $margin = $sousCategoryId !== null && array_key_exists($sousCategoryId, $perCategory)
            ? (float) $perCategory[$sousCategoryId]
            : (float) ($pricing['margin'] ?? 0);

        $price = $base
            * (float) ($pricing['usd_to_tnd'] ?? 3.15)
            * (1 + $margin)
            * (1 + (float) ($pricing['customs'] ?? 0));

        $step = (float) ($pricing['round_to'] ?? 0);

        // Identical arithmetic to HydrateExternalProductJob::tunisianPrice(), deliberately — a
        // different rounding here would make the admin's staged preview disagree with the price on
        // the page, and the disagreement would only ever be noticed by a customer.
        return $step > 0 ? ceil($price / $step) * $step : round($price, 3);
    }

    /**
     * Which subcategory, and on what evidence.
     *
     * ── EXPLICIT BEATS INFERRED ───────────────────────────────────────────────────────────
     * A `sous_category_id` already on the staging row is a human decision — an admin filling in an
     * ExternalCategoryMapping. It wins over the classifier unconditionally, including over a
     * confident classification, because a person who mapped a category meant it.
     *
     * ── TWO HAYSTACKS, BOTH THE PRODUCT'S OWN NAME ────────────────────────────────────────
     * `normalized_title` first: it is the French title we will actually publish, and it is what the
     * product IS. `external_url_name` second: the sitemap slug, which is the exact form the
     * classification rules were measured against over all 47,537 products. Neither is a guess — both
     * are the source's own name for the same product — and trying the second only when the first
     * matched nothing recovers the rows whose title lost the classifying word to normalisation
     * (frenchTitle() strips flavour and size segments, and occasionally that is where the word was).
     *
     * @param  array<string, mixed>  $row
     * @param  list<array<string, mixed>>  $rules
     * @param  array<string, int>  $subcategoryIds
     * @return array{slug: ?string, id: ?int, term: ?string, source: ?string}
     */
    private static function resolveSubCategory(array $row, array $rules, array $subcategoryIds): array
    {
        $explicit = $row['sous_category_id'] ?? null;

        if ($explicit !== null && $explicit !== '' && (int) $explicit > 0) {
            $id = (int) $explicit;
            $slug = array_search($id, array_map('intval', $subcategoryIds), true);

            // A slug is returned only when the id really exists. An admin mapping pointing at a
            // deleted subcategory has to surface as SUBCATEGORY_MISSING, not be silently believed:
            // `products.sous_categorie_id` would then hold an id that resolves to nothing, and the
            // crawler route answers Googlebot with a 404 while every human URL still works.
            return [
                'slug' => $slug === false ? null : (string) $slug,
                'id' => $slug === false ? null : $id,
                'term' => null,
                'source' => 'explicit',
            ];
        }

        $haystacks = [
            'title' => (string) ($row['normalized_title'] ?? ''),
            'url_name' => (string) ($row['external_url_name'] ?? ''),
        ];

        foreach ($haystacks as $source => $haystack) {
            if (trim($haystack) === '') {
                continue;
            }

            $result = SubCategoryClassifier::classify($haystack, $rules);

            if ($result['sub'] !== null) {
                $slug = (string) $result['sub'];
                $id = $subcategoryIds[$slug] ?? null;

                return [
                    'slug' => $slug,
                    'id' => $id === null ? null : (int) $id,
                    'term' => $result['term'],
                    'source' => $source,
                ];
            }
        }

        return ['slug' => null, 'id' => null, 'term' => null, 'source' => null];
    }

    /** A name to create or match a brand from. BrandMatcher folds it; this only asks that it exists. */
    private static function hasBrandIdentity(array $row): bool
    {
        foreach (['normalized_brand_key', 'source_brand_name'] as $column) {
            if (trim((string) ($row[$column] ?? '')) !== '') {
                return true;
            }
        }

        return false;
    }

    /**
     * Raw DB values are 0/1, "0"/"1", true/false or null depending on driver and on whether the row
     * came through Eloquent's casts. "0" is truthy in PHP's own `(bool)`, which would mark every
     * product discontinued on a driver that returns strings.
     */
    private static function truthy(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool) $value;
    }

    /**
     * @param  list<array{reason: string, detail: string}>  $failures
     * @return list<array{reason: string, detail: string}>
     */
    private static function inReportOrder(array $failures): array
    {
        $order = array_flip(array_keys(self::REASONS));

        usort($failures, static fn (array $a, array $b): int => ($order[$a['reason']] ?? 99) <=> ($order[$b['reason']] ?? 99));

        return array_values($failures);
    }

    private static function excerpt(string $text, int $length = 80): string
    {
        return mb_strlen($text) <= $length ? $text : mb_substr($text, 0, $length).'…';
    }
}
