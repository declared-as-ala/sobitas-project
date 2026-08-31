<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * One brand, one key — however the source spells it.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 * `brands` has no slug, no normalisation and no `firstOrCreate` anywhere. Lookups are
 * `LIKE '%name%'`. Feed an importer 47,537 products against that and "Optimum Nutrition",
 * "optimum nutrition", "Optimum Nutrition®" and "OPTIMUM NUTRITION, INC." become four rows, each
 * holding a slice of the catalogue, with no error raised anywhere.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ──────────────────────────────────────────────────────
 * No fuzzy matching. No Levenshtein, no soundex, no "close enough". Folding case, accents and
 * punctuation is lossless in the sense that matters: two strings that fold together really are the
 * same brand written two ways. Anything looser starts merging brands that are genuinely different —
 * "Optimum Nutrition" and "Optimum Health" are four edits apart — and an incorrectly merged brand is
 * far harder to notice and unpick than a duplicated one.
 */
final class BrandKey
{
    /**
     * Corporate suffixes that appear in some feeds and not others. "Doctor's Best" and
     * "Doctor's Best, Inc." are the same shop; the suffix is registration trivia, not identity.
     */
    private const LEGAL_SUFFIXES = 'sarl|s\.a\.r\.l|sa|s\.a|inc|ltd|limited|llc|gmbh|bv|nv|co|corp|corporation|company';

    /**
     * The comparison key. Not for display — see displayName() for that.
     *
     * "Optimum Nutrition®"      → "optimum nutrition"
     * "OPTIMUM NUTRITION, INC." → "optimum nutrition"
     * "Doctor's Best"           → "doctor s best"
     * "Nature's Way"            → "nature s way"
     */
    public static function for(?string $name): string
    {
        $key = trim((string) $name);
        if ($key === '') {
            return '';
        }

        // Str::ascii folds é→e, ü→u and drops ® ™ — so accented spellings meet unaccented ones.
        $key = Str::ascii($key);
        $key = mb_strtolower($key, 'UTF-8');

        $key = preg_replace('~\b(?:'.self::LEGAL_SUFFIXES.')\b~u', ' ', $key) ?? $key;

        // Everything non-alphanumeric becomes a space rather than being deleted: deleting would make
        // "Now Foods" and "Nowfoods" collide, which are not reliably the same brand.
        $key = preg_replace('~[^a-z0-9]+~', ' ', $key) ?? $key;

        return trim(preg_replace('~\s+~', ' ', $key) ?? $key);
    }

    /** True when two spellings denote the same brand. Empty never matches empty. */
    public static function sameBrand(?string $a, ?string $b): bool
    {
        $keyA = self::for($a);

        return $keyA !== '' && $keyA === self::for($b);
    }

    /**
     * How confident are we that two brand strings denote the same brand: 2 identical, 1 one contains
     * the other, 0 unrelated.
     *
     * ── WHY sameBrand() IS NOT ENOUGH, AND WHY THIS IS STILL NOT FUZZY MATCHING ────────────────
     * This exists for one caller: choosing which external-database label to attach to a product as a
     * review candidate. Those databases append a product-line word to the manufacturer on a large
     * share of records — measured against DSLD, "Optimum Nutrition" is filed as "ON Optimum
     * Nutrition", "NOW Foods" as "NOW Sports" or plain "NOW", "MuscleTech" as "MuscleTech Performance
     * Series", "California Gold Nutrition" as "California Gold Nutrition SPORT". sameBrand()'s exact
     * key equality rejects every one of those CORRECT labels, so used as the filter it throws away as
     * many right answers as wrong ones.
     *
     * Token containment is the loosest test that is still safe here: every significant token of the
     * shorter folded key must appear in the longer. "optimum nutrition" ⊆ "on optimum nutrition" and
     * "muscletech" ⊆ "muscletech performance series" both pass; "spring valley", "member s mark",
     * "zhou" and "pure prescriptions" — the actual wrong-brand hits this was written to reject, 5 of
     * 30 sampled iHerb products — share no token and score 0.
     *
     * This is deliberately NOT the fuzzy matching for() forbids, and the distinction is load-bearing:
     * nothing here creates, renames or MERGES a brands row. A score of 1 or 2 never publishes anything
     * on its own — the caller still requires a barcode identification before any figure reaches a page
     * (see DsldClient::findFor). It only ranks candidates for a human to confirm, where the failure of
     * a loose match is a rejected review lead, not a wrong brand page.
     */
    public static function affinity(?string $a, ?string $b): int
    {
        $keyA = self::for($a);
        $keyB = self::for($b);

        if ($keyA === '' || $keyB === '') {
            return 0;
        }

        if ($keyA === $keyB) {
            return 2;
        }

        $tokensA = array_values(array_filter(explode(' ', $keyA), static fn (string $t): bool => $t !== ''));
        $tokensB = array_values(array_filter(explode(' ', $keyB), static fn (string $t): bool => $t !== ''));

        if ($tokensA === [] || $tokensB === []) {
            return 0;
        }

        // Whole-token containment, shorter inside longer. Whole tokens, not substrings, so "now" does
        // not match "snow" and "gold" does not match "goldwyn".
        [$short, $long] = count($tokensA) <= count($tokensB) ? [$tokensA, $tokensB] : [$tokensB, $tokensA];

        foreach ($short as $token) {
            if (! in_array($token, $long, true)) {
                return 0;
            }
        }

        return 1;
    }

    /**
     * A display name we are willing to create a brand row with.
     *
     * Trailing punctuation and legal suffixes are dropped, but the brand's own capitalisation and
     * accents are preserved — "L'Oréal" must not become "L Oreal" on a customer-facing page. Only
     * the KEY is folded; the name is left as the source wrote it.
     */
    public static function displayName(?string $name): string
    {
        $clean = trim((string) $name);
        if ($clean === '') {
            return '';
        }

        $clean = preg_replace('~[,\s]+\b(?:'.self::LEGAL_SUFFIXES.')\b\.?\s*$~iu', '', $clean) ?? $clean;

        return trim($clean, " \t\n\r\0\x0B,;-");
    }

    /** The URL slug. Mirrors what App\Support\PublicSlug computes at request time today. */
    public static function slug(?string $name): string
    {
        return Str::slug(self::displayName($name));
    }
}
