<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Tunisian dinar amounts written out in French, for the « Arrêté(e) … à la somme de : » line of
 * the printed documents.
 *
 * Server-side on purpose: the invoice and the quote are e-mailed and downloaded as DomPDF files,
 * and DomPDF runs no JavaScript — the old in-page script left « calcul… » in every PDF. It also
 * fixes the old script's grammar (« quarante-un » for « quarante et un », « 500 millimes » in
 * figures).
 *
 * Traditional spelling (pre-1990 rules), as on French-language business documents in Tunisia:
 * hyphens only between tens and units below one hundred, « et » for 21, 31 … 71, « quatre-vingts »
 * and « deux cents » plural only when nothing follows (and before « millions »), « mille » invariable.
 *
 *   AmountInWords::fr(1250.5)  -> "Mille deux cent cinquante dinars et cinq cents millimes"
 *   AmountInWords::fr(41651)   -> "Quarante et un mille six cent cinquante et un dinars"
 */
final class AmountInWords
{
    private const UNITS = [
        'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
        'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
        'dix-sept', 'dix-huit', 'dix-neuf',
    ];

    private const TENS = [
        2 => 'vingt', 3 => 'trente', 4 => 'quarante', 5 => 'cinquante', 6 => 'soixante',
    ];

    public static function fr(float|int|string|null $amount): string
    {
        // Integer millimes first: 1250.5 must not become 1250 dinars and 499 millimes.
        $total = (int) round(abs((float) $amount) * 1000);
        $dinars = intdiv($total, 1000);
        $millimes = $total % 1000;

        // « un million de dinars »: a number ending on million(s)/milliard(s) takes « de » before the noun.
        $de = $dinars >= 1_000_000 && $dinars % 1_000_000 === 0 ? 'de ' : '';
        $text = self::number($dinars).' '.$de.($dinars > 1 ? 'dinars' : 'dinar');
        if ($millimes > 0) {
            $text .= ' et '.self::number($millimes).' '.($millimes > 1 ? 'millimes' : 'millime');
        }

        return self::ucfirst($text);
    }

    /** A whole number in words, 0 … 999 999 999 999. */
    public static function number(int $n): string
    {
        if ($n === 0) {
            return 'zéro';
        }

        $parts = [];
        $billions = intdiv($n, 1_000_000_000);
        $millions = intdiv($n % 1_000_000_000, 1_000_000);
        $thousands = intdiv($n % 1_000_000, 1000);
        $rest = $n % 1000;

        // « milliard » and « million » are nouns: they take an « s » and keep « quatre-vingts » / « cents » plural.
        if ($billions > 0) {
            $parts[] = self::belowThousand($billions, true).' milliard'.($billions > 1 ? 's' : '');
        }
        if ($millions > 0) {
            $parts[] = self::belowThousand($millions, true).' million'.($millions > 1 ? 's' : '');
        }
        // « mille » is invariable, and « vingt » / « cent » before it stay singular (« quatre-vingt mille »).
        if ($thousands > 0) {
            $parts[] = $thousands === 1 ? 'mille' : self::belowThousand($thousands, false).' mille';
        }
        if ($rest > 0) {
            $parts[] = self::belowThousand($rest, true);
        }

        return implode(' ', $parts);
    }

    /**
     * 1 … 999. $final says whether this group ends the number (or precedes a noun like « millions »),
     * which is when « quatre-vingts » and « deux cents » take their « s ».
     */
    private static function belowThousand(int $n, bool $final): string
    {
        $hundreds = intdiv($n, 100);
        $rest = $n % 100;
        $words = '';

        if ($hundreds > 0) {
            $words = $hundreds === 1 ? 'cent' : self::UNITS[$hundreds].' cent';
            if ($hundreds > 1 && $rest === 0 && $final) {
                $words .= 's';
            }
        }
        if ($rest > 0) {
            $words .= ($words === '' ? '' : ' ').self::belowHundred($rest, $final);
        }

        return $words;
    }

    /** 1 … 99. */
    private static function belowHundred(int $n, bool $final): string
    {
        if ($n < 20) {
            return self::UNITS[$n];
        }

        $tens = intdiv($n, 10);
        $unit = $n % 10;

        if ($tens === 7) {
            // soixante-dix, soixante et onze, soixante-douze … soixante-dix-neuf
            return $unit === 1 ? 'soixante et onze' : 'soixante-'.self::UNITS[10 + $unit];
        }
        if ($tens === 8) {
            // quatre-vingts (plural only when it ends the group), quatre-vingt-un … quatre-vingt-neuf (no « et »)
            return $unit === 0 ? 'quatre-vingt'.($final ? 's' : '') : 'quatre-vingt-'.self::UNITS[$unit];
        }
        if ($tens === 9) {
            // quatre-vingt-dix … quatre-vingt-dix-neuf (no « et »)
            return 'quatre-vingt-'.self::UNITS[10 + $unit];
        }

        $word = self::TENS[$tens];
        if ($unit === 0) {
            return $word;
        }

        return $unit === 1 ? $word.' et un' : $word.'-'.self::UNITS[$unit];
    }

    private static function ucfirst(string $text): string
    {
        return mb_strtoupper(mb_substr($text, 0, 1)).mb_substr($text, 1);
    }
}
