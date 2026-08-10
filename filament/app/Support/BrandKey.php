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
