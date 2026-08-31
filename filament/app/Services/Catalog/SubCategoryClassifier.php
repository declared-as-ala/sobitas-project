<?php

namespace App\Services\Catalog;

/**
 * Product name → protein.tn subcategory slug. Ordered rules, first match wins.
 *
 * ── WHY THIS DECIDES A URL AND THEREFORE MATTERS MORE THAN IT LOOKS ───────────────────────
 * The public path is `/{sous_category.slug}/{product.slug}`. This class picks the first segment.
 * A product classified into the wrong subcategory does not merely appear in the wrong list — it is
 * published at the wrong address, indexed there, and can only be corrected afterwards with a
 * permanent redirect. So the rules are ordered from specific to general, and anything that matches
 * nothing returns null rather than falling into a default bucket.
 *
 * There is no "misc" or "other" target on purpose. A catch-all would convert every classification
 * failure into a published page nobody chose, which is precisely the outcome the promotion gate
 * exists to prevent.
 *
 * Framework-free: the rules are passed in, so this runs under a bare `php` with no vendor/.
 */
final class SubCategoryClassifier
{
    /**
     * Three kinds of term, because one kind was measurably not enough.
     *
     *   `any`    front-anchored: the term starts a word. "vitamin-" catches "vitamin-d3".
     *   `exact`  whole word, both ends anchored. Required for short terms that are prefixes of
     *            unrelated words — measured on the real catalogue, a front-anchored "cla" matched
     *            CAT'S CLAW, DEVIL'S CLAW and CLAY POWDER, and would have published herbal
     *            supplements and a cosmetic clay at /cla/…
     *   `not`    disqualifies the rule outright. "iron" as a mineral term matched "iron-free" and
     *            "no-iron" — products that advertise the ABSENCE of the thing being matched. A
     *            positive-only matcher cannot express that, and inverting a product's meaning is
     *            not a near miss.
     *
     * @param  list<array{sub: string, any?: list<string>, exact?: list<string>, not?: list<string>}>  $rules
     * @return array{sub: ?string, term: ?string}
     */
    public static function classify(string $name, array $rules): array
    {
        $haystack = self::normalise($name);

        foreach ($rules as $rule) {
            if (self::anyMatches($haystack, $rule['not'] ?? [], false) !== null) {
                continue;
            }

            $term = self::anyMatches($haystack, $rule['exact'] ?? [], true)
                ?? self::anyMatches($haystack, $rule['any'] ?? [], false);

            if ($term !== null) {
                return ['sub' => $rule['sub'], 'term' => $term];
            }
        }

        return ['sub' => null, 'term' => null];
    }

    /** @param  list<string>  $terms */
    private static function anyMatches(string $haystack, array $terms, bool $wholeWord): ?string
    {
        foreach ($terms as $term) {
            if (self::contains($haystack, $term, $wholeWord)) {
                return $term;
            }
        }

        return null;
    }

    /** `-a-slug-like-this-` so terms can be anchored at a word boundary with str_contains. */
    private static function normalise(string $name): string
    {
        $lower = strtolower(trim($name));
        $lower = preg_replace('~[^a-z0-9]+~', '-', $lower) ?? $lower;

        return '-'.trim($lower, '-').'-';
    }

    /**
     * Front-anchored by default; both ends anchored when a whole word is required.
     *
     * Front-anchoring alone lets "vitamin-" match "vitamin-d3" and "collagen" match "collagens",
     * which is what we want, and stops mid-word matches like "environ" satisfying "iron". What it
     * does NOT stop is a short term being the prefix of an unrelated word — which is how "cla"
     * matched "claw" and "clay" across the real catalogue. `$wholeWord` closes that end too.
     */
    private static function contains(string $haystack, string $term, bool $wholeWord = false): bool
    {
        $term = trim(strtolower(trim($term)), '-');

        if ($term === '') {
            return false;
        }

        return str_contains($haystack, '-'.$term.($wholeWord ? '-' : ''));
    }
}
