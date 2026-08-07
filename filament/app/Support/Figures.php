<?php

namespace App\Support;

/**
 * The shared vocabulary for "is this number real?".
 *
 * A figure on a supplement page is a number wearing a unit: 24 g, 120 kcal, 400 µg, 5000 UI. This
 * class turns any such pair into one canonical token so that a claim written in prose can be matched
 * against a transcribed label — "24 g de protéines", "24g" and "24,0 g" all reduce to `24g`.
 *
 * Both the panel builder and the copy validator depend on this being ONE definition. If they each
 * had their own, the validator would eventually accept a figure the panel never printed, which is
 * precisely the failure it exists to prevent.
 *
 * Note what is deliberately NOT a unit here: DT, h, jours, ans, fois. Prices, delivery windows and
 * frequencies are ordinary copy, and treating them as nutrition figures would reject every honest
 * sentence about free shipping over 300 DT.
 */
final class Figures
{
    /**
     * Units that make a number a nutrition claim.
     *
     * `%` is included: "100 % whey" and "30 % de protéines" are both claims about composition, and
     * the first is grounded by the product's own name while the second must come off a label.
     */
    private const UNIT_PATTERN = 'kcal|kj|mg|mcg|µg|ug|g|kg|ml|cl|l|ui|iu|%';

    /**
     * Every figure in a string, canonicalised.
     *
     * @return list<string>
     */
    public static function in(string $text): array
    {
        if (! preg_match_all(
            '~(\d+(?:[.,]\d+)?)\s*('.self::UNIT_PATTERN.')(?![a-zàâçéèêëîïôûùüÿñæœ])~iu',
            $text,
            $matches,
            PREG_SET_ORDER
        )) {
            return [];
        }

        $out = [];
        foreach ($matches as $match) {
            $out[] = self::canonicalNumber($match[1]).self::canonicalUnit($match[2]);
        }

        return array_values(array_unique($out));
    }

    /**
     * Figures present in $text that no approved source vouches for.
     *
     * @param  list<string>  $approved  canonical tokens, e.g. from a transcribed panel
     * @return list<string> the offending tokens, empty when everything checks out
     */
    public static function ungrounded(string $text, array $approved): array
    {
        $allowed = array_flip($approved);

        return array_values(array_filter(
            self::in($text),
            static fn (string $figure): bool => ! isset($allowed[$figure])
        ));
    }

    /**
     * "24,50" → "24.5"; "0,0125" → "0.0125".
     *
     * Trailing zeros are dropped so formatting differences do not read as different numbers, but no
     * rounding happens: on a microgram row, rounding 0.0125 to 0.01 would be a tenfold error.
     */
    private static function canonicalNumber(string $raw): string
    {
        $value = str_replace(',', '.', $raw);

        if (str_contains($value, '.')) {
            $value = rtrim(rtrim($value, '0'), '.');
        }

        return $value === '' ? '0' : $value;
    }

    /** Spelling variants of one unit must not read as two different figures. */
    private static function canonicalUnit(string $unit): string
    {
        return match (mb_strtolower($unit)) {
            'mcg', 'ug', 'µg' => 'µg',
            'iu', 'ui' => 'ui',
            default => mb_strtolower($unit),
        };
    }
}
