<?php

namespace App\Support;

/**
 * GS1 Global Trade Item Number — normalisation and check-digit validation.
 *
 * ── WHY THIS MATTERS HERE ─────────────────────────────────────────────────────────────────
 * Every external product-data source worth using is keyed on the barcode: NIH DSLD (Supplement
 * Facts), Open Food Facts, USDA FoodData Central, GS1. `EnrichNutritionFromOpenFoodFacts` has been
 * scheduled weekly since March and enriches nothing, because it matches on a GTIN and no product
 * carries one. Google also treats gtin as a strong product identifier for merchant listings.
 *
 * ── WHAT A VALID CHECK DIGIT DOES AND DOES NOT PROVE ──────────────────────────────────────
 * It proves the identifier is well-formed — that it was transcribed without a typo. It does NOT
 * prove the barcode belongs to the product we are selling, nor that we own it. Only a GS1 record or
 * a trusted supplier feed can establish that. So a passing check digit is permission to *look the
 * product up*, never permission to publish what comes back unreviewed.
 *
 * ── WHERE BARCODES ALREADY LIVE ───────────────────────────────────────────────────────────
 * `products.code_product` is the de-facto barcode column: the POS (`TicketPosPage::525`), the BL
 * and the Facture TVA pages all resolve a physical scan against it, each with an `'0' . $code`
 * fallback — that fallback is a 12-digit UPC-A being matched against a 13-digit EAN-13 record, and
 * it is why zero-padding is handled explicitly below rather than being treated as a different code.
 *
 * Mirrored in JS by frontend/scripts/audit-pdp-content.mjs `isValidGtin`. Change both together.
 */
final class Gtin
{
    /** GTIN-8, UPC-A/GTIN-12, EAN-13/GTIN-13, GTIN-14 (case/pallet). */
    public const VALID_LENGTHS = [8, 12, 13, 14];

    /**
     * Strip separators and confirm the check digit.
     *
     * @return string|null the digits-only GTIN, or null when it is not a well-formed one.
     */
    public static function normalize(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }

        $digits = preg_replace('/\D/', '', $raw) ?? '';

        // A short numeric value is a database id, not a barcode. products.code_product holds
        // 2-3 digit ids on 297 of 309 rows, so this is the common case, not an edge case.
        if (! in_array(strlen($digits), self::VALID_LENGTHS, true)) {
            return null;
        }

        return self::checkDigitMatches($digits) ? $digits : null;
    }

    public static function isValid(?string $raw): bool
    {
        return self::normalize($raw) !== null;
    }

    /**
     * The schema.org property name for this identifier's length.
     *
     * Google rejects a gtin13 that is 12 digits long, so the property has to follow the value
     * rather than being hard-coded per site.
     */
    public static function schemaProperty(string $gtin): ?string
    {
        return match (strlen($gtin)) {
            8 => 'gtin8',
            12 => 'gtin12',
            13 => 'gtin13',
            14 => 'gtin14',
            default => null,
        };
    }

    /**
     * The same trade item expressed as 14 digits — the canonical form for comparison.
     *
     * A UPC-A (12) and the EAN-13 formed by prefixing it with a zero are the SAME product. Comparing
     * the raw strings says they differ, which would create a duplicate product and send two lookups
     * to two different records at Open Food Facts. Compare on this instead.
     */
    public static function toGtin14(?string $raw): ?string
    {
        $gtin = self::normalize($raw);

        return $gtin === null ? null : str_pad($gtin, 14, '0', STR_PAD_LEFT);
    }

    /** Do two identifiers denote the same trade item, ignoring zero-padding? */
    public static function sameItem(?string $a, ?string $b): bool
    {
        $x = self::toGtin14($a);

        return $x !== null && $x === self::toGtin14($b);
    }

    /**
     * Mod-10: weights alternate 3,1 starting from the rightmost digit of the body, and the check
     * digit is whatever brings the weighted sum up to the next multiple of ten.
     */
    private static function checkDigitMatches(string $digits): bool
    {
        $body = str_split(substr($digits, 0, -1));
        $expected = (int) substr($digits, -1);

        $sum = 0;
        foreach (array_reverse($body) as $i => $digit) {
            $sum += ((int) $digit) * ($i % 2 === 0 ? 3 : 1);
        }

        return (10 - ($sum % 10)) % 10 === $expected;
    }
}
