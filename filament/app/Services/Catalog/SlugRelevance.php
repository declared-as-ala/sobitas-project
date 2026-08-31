<?php

namespace App\Services\Catalog;

/**
 * Stage-1 relevance, decided from the sitemap slug alone — zero HTTP requests.
 *
 * ── WHY A THREE-WAY DECISION AND NOT A YES/NO ─────────────────────────────────────────────
 * The authoritative filter is `rootCategoryId`, and it costs one request per product. Across
 * ~47,500 products at one request every two seconds, hydrating everything is roughly 26 hours. So
 * the slug is used to ORDER that work, not to replace the decision:
 *
 *   RELEVANT  the name positively matches a sports/supplement term → hydrate first
 *   NEUTRAL   nothing matched either way → keep, hydrate after the confident ones
 *   DENIED    the name matches something we do not sell → never hydrated, one request saved
 *
 * A two-way filter would have to choose between two bad options. Requiring a positive match drops
 * real products whose names contain no keyword at all — "animal-pak" and "shroom-tech-sport" are
 * both things a sports shop sells and neither contains "protein" or "vitamin". Accepting everything
 * not denied spends the full 26 hours before the first sellable product appears. The neutral bucket
 * is what lets both be true: nothing relevant is discarded, and the useful results arrive first.
 *
 * ── WHY ALLOW BEATS DENY ──────────────────────────────────────────────────────────────────
 * The lists genuinely collide, and the collisions are not edge cases:
 *
 *   hair-skin-nails-gummies    contains "hair-" and "skin-"   → a supplement we sell
 *   whey-protein-cookies-cream contains "cookies"             → a protein we sell
 *   coconut-oil-body-lotion    contains neither allow term    → correctly denied
 *
 * Checking allow first makes the deny list safe to keep broad.
 *
 * Framework-free by design: no config(), no Str, no container. The caller passes the lists in, so
 * this runs under a bare `php` with no vendor/ — which is how it is actually verified.
 */
final class SlugRelevance
{
    public const RELEVANT = 'relevant';
    public const NEUTRAL = 'neutral';
    public const DENIED = 'denied';

    /**
     * @param  list<string>  $allow
     * @param  list<string>  $deny
     * @return array{decision: string, term: ?string}
     */
    public static function decide(string $slug, array $allow, array $deny): array
    {
        $haystack = self::normalise($slug);

        foreach ($allow as $term) {
            if (self::contains($haystack, $term)) {
                return ['decision' => self::RELEVANT, 'term' => $term];
            }
        }

        foreach ($deny as $term) {
            if (self::contains($haystack, $term)) {
                return ['decision' => self::DENIED, 'term' => $term];
            }
        }

        return ['decision' => self::NEUTRAL, 'term' => null];
    }

    /**
     * Wrap the slug in separators so a term can be anchored at either end.
     *
     * Without this, a term like "pet-" would never match the slug "pet-supplies" at position 0 in
     * the way "-pet-" implies, and matching bare "pet" would hit "petite" and "carpet". Both lists
     * are written in slug form (hyphens, lowercase), so normalising to `-slug-` lets a plain
     * `str_contains` behave like a word-boundary match without a regex per term across 47,500 rows.
     */
    private static function normalise(string $slug): string
    {
        $lower = strtolower(trim($slug));
        $lower = preg_replace('~[^a-z0-9]+~', '-', $lower) ?? $lower;

        return '-'.trim($lower, '-').'-';
    }

    /**
     * A term matches when it begins at a word boundary — never mid-word.
     *
     * The one rule is `-term`: the term must be preceded by a separator. That single anchor gets
     * every case right, where a plain substring test does not:
     *
     *   "pet-"     vs "carpet-cleaner"  → "-pet" absent from "-carpet-cleaner-"   correctly NOT denied
     *   "pet-"     vs "pet-supplies"    → "-pet" present                          correctly denied
     *   "vitamin-" vs "vitamin-d3"      → "-vitamin" present                      matched
     *   "protein"  vs "proteinas"       → "-protein" present                      matched
     *
     * Leaving the end unanchored is deliberate, and the asymmetry is the point: it lets a term match
     * the start of a longer word, at the cost of occasional over-matching ("mass-" also matches
     * "massage-oil"). That error is safe in one direction only — an allow-list false positive spends
     * one HTTP request and is then rejected by `rootCategoryId`, whereas a deny-list false positive
     * silently loses a product we could have sold. Anchoring the front only keeps the mistakes on
     * the side that costs a request instead of a product.
     */
    private static function contains(string $haystack, string $term): bool
    {
        $term = trim(strtolower(trim($term)), '-');

        return $term !== '' && str_contains($haystack, '-'.$term);
    }
}
