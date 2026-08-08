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
     * Exact SI scaling within one dimension, so the same quantity written two ways compares equal.
     *
     * "2.25 kg" and "2250 g" are the same tub. Treating them as different figures rejected true,
     * useful answers — while catching nothing, because a wrong pack size differs by far more than a
     * factor of 1000 (908 g against 2.27 kg is 2.5×, not 1000×).
     *
     * ── WHAT IS DELIBERATELY ABSENT ───────────────────────────────────────────────────────
     * kJ ↔ kcal. That conversion needs a physical constant (4.184) and is lossy, and labels print
     * both figures independently — so accepting a converted energy value would mean accepting a
     * number that is not on the label. It is exactly the case this check caught in practice: a
     * researcher turned a per-200 g panel (3268 kJ / 771 kcal) into per-100 g (1634 kJ / 385 kcal)
     * and every figure looked plausible. Scaling by 1000 within a unit is arithmetic-free
     * re-spelling; scaling by a serving size is a claim.
     */
    private const SCALE = [
        'mg' => ['mass', 1.0],
        'g' => ['mass', 1000.0],
        'kg' => ['mass', 1000000.0],
        'µg' => ['mass', 0.001],
        'ml' => ['volume', 1.0],
        'cl' => ['volume', 10.0],
        'l' => ['volume', 1000.0],
    ];

    /**
     * Every figure in a string, canonicalised for comparison.
     *
     * @return list<string>
     */
    public static function in(string $text): array
    {
        return array_values(array_unique(array_column(self::parse($text), 'token')));
    }

    /**
     * Figures present in $text that no approved source vouches for.
     *
     * Reports the figure AS WRITTEN rather than as a canonical token, because the person reading
     * the rejection needs to find it in the sentence.
     *
     * @param  list<string>  $approved  canonical tokens, e.g. from a transcribed panel
     * @return list<string> the offending figures, empty when everything checks out
     */
    public static function ungrounded(string $text, array $approved): array
    {
        $allowed = array_flip($approved);
        $out = [];

        foreach (self::parse($text) as $figure) {
            if (! isset($allowed[$figure['token']])) {
                $out[$figure['raw']] = true;
            }
        }

        return array_keys($out);
    }

    /**
     * @return list<array{raw: string, token: string}>
     */
    private static function parse(string $text): array
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
            $number = self::canonicalNumber($match[1]);
            $unit = self::canonicalUnit($match[2]);

            if (isset(self::SCALE[$unit])) {
                [$dimension, $factor] = self::SCALE[$unit];
                // Trailing zeros trimmed so 2250000 and 2250000.0 are one token.
                $base = rtrim(rtrim(number_format((float) $number * $factor, 6, '.', ''), '0'), '.');
                $token = ($base === '' ? '0' : $base).':'.$dimension;
            } else {
                $token = $number.$unit;
            }

            $out[] = ['raw' => trim($match[1]).' '.$unit, 'token' => $token];
        }

        return $out;
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
