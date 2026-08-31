<?php

/**
 * BrandKey::affinity() — the brand filter that decides which DSLD label may be attached to a
 * product as a review candidate.
 *
 *     php filament/tests/catalog/brand-affinity-check.php
 *
 * ── THE INCIDENT THIS FILE EXISTS FOR ─────────────────────────────────────────────────────
 * DsldClient::findFor() used to keep the FIRST label the search returned, whatever brand it carried.
 * Measured live against the iHerb catalogue on 11/08/2026, the top hit was a DIFFERENT company's
 * product on 5 of 30 sampled products — a real, complete Supplement Facts panel filed under ZHOU
 * for "NOW Foods Ashwagandha", under Member's Mark for "NOW Vitamin D-3", under Spring Valley for
 * "Sports Research Omega-3". recordObservations() would have attached that panel to our page and
 * proposed that other product's barcode. A wrong candidate barcode is the worst output this pipeline
 * has: once confirmed it points every future lookup at somebody else's trade item.
 *
 * affinity() is the fix. It scores 2 (identical folded key), 1 (one brand's tokens contain the
 * other's), or 0 (unrelated), and findFor() keeps only candidates that score >= 1. The cases below
 * are the exact brand strings DSLD returned in that measurement, so this asserts the real behaviour
 * rather than an invented one.
 *
 * ── WHY THE Str STUB ──────────────────────────────────────────────────────────────────────
 * BrandKey uses Illuminate\Support\Str::ascii to fold accents and drop ® ™. There is no vendor/ on
 * the dev machine, so a minimal Str is declared in its namespace before BrandKey is required — the
 * same standalone pattern the other catalog harnesses use to run under a bare `php`. The fixtures are
 * US brand names (ASCII), so the stub only has to be faithful for that input.
 */

namespace Illuminate\Support {
    if (! class_exists(Str::class, false)) {
        class Str
        {
            public static function ascii(?string $value, string $language = 'en'): string
            {
                // Enough of the real fold for the fixtures: strip the marks BrandKey relies on being
                // gone, and map the couple of accented letters a supplement brand might carry.
                return strtr((string) $value, [
                    '®' => '', '™' => '', '’' => "'",
                    'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
                    'à' => 'a', 'â' => 'a', 'ä' => 'a',
                    'ü' => 'u', ' û' => 'u', 'ö' => 'o', 'ô' => 'o', 'ñ' => 'n', 'ç' => 'c',
                ]);
            }

            public static function slug(?string $title, string $separator = '-'): string
            {
                $title = strtolower(self::ascii($title));

                return trim((string) preg_replace('~[^a-z0-9]+~', $separator, $title), $separator);
            }
        }
    }
}

namespace {
    use App\Support\BrandKey;

    require __DIR__.'/../../app/Support/BrandKey.php';

    $failed = 0;
    $checks = 0;

    function check(string $label, bool $ok, string $detail = ''): void
    {
        global $failed, $checks;
        $checks++;
        if (! $ok) {
            $failed++;
        }
        printf("  %s  %s%s\n", $ok ? 'PASS' : 'FAIL', $label, $ok || $detail === '' ? '' : "\n        ".$detail);
    }

    /** Assert affinity($a,$b) equals $want, and that the score is symmetric (it must be). */
    function affinity(string $a, string $b, int $want, string $why): void
    {
        $got = BrandKey::affinity($a, $b);
        $rev = BrandKey::affinity($b, $a);
        check(
            sprintf('affinity("%s","%s") = %d — %s', $a, $b, $want, $why),
            $got === $want && $rev === $want,
            sprintf('got %d (reverse %d), wanted %d', $got, $rev, $want),
        );
    }

    echo "\nBrandKey::affinity — the DSLD brand filter\n\n";

    echo "  Identical brand, however spelled (score 2)\n";
    affinity('Dymatize', 'Dymatize', 2, 'same string');
    affinity('Nordic Naturals', 'Nordic Naturals', 2, 'same string');
    affinity("Doctor's Best", "Doctor's Best, Inc.", 2, 'legal suffix folds away');
    affinity('Optimum Nutrition®', 'OPTIMUM NUTRITION', 2, 'mark + case fold to one key');

    echo "\n  Correct brand, DSLD appended a product-line word (score 1 by containment)\n";
    affinity('Optimum Nutrition', 'ON Optimum Nutrition', 1, 'our tokens inside theirs');
    affinity('MuscleTech', 'MuscleTech Performance Series', 1, 'our token inside theirs');
    affinity('California Gold Nutrition', 'California Gold Nutrition SPORT', 1, 'suffix word only');
    affinity('Garden of Life', 'Garden of Life Dr. Formulated Probiotics', 1, 'prefix retained');
    affinity('NOW Foods', 'NOW', 1, 'their key is a subset of ours');

    echo "\n  Different company entirely — the wrong-brand hits measured live (score 0)\n";
    affinity('NOW Foods', 'ZHOU', 0, 'top hit for NOW Ashwagandha');
    affinity('NOW Foods', "Member's Mark", 0, 'top hit for NOW Vitamin D-3');
    affinity('Sports Research', 'Spring Valley', 0, 'top hit for SR Omega-3');
    affinity('NOW Foods', 'Pure Prescriptions', 0, 'top hit for NOW Zinc');
    affinity('NOW Foods', 'InnovixLabs', 0, 'top hit for NOW Ultra Omega-3');

    echo "\n  The over-merge trap BrandKey::for was written to avoid stays rejected (score 0)\n";
    affinity('Optimum Nutrition', 'Optimum Health', 0, 'shared word "optimum" is not enough — different second token');
    affinity('NOW Foods', 'NOW Sports', 0, 'each has a distinct non-shared token; safe miss, not a wrong match');

    echo "\n  Empty is never a match\n";
    affinity('', 'Optimum Nutrition', 0, 'empty ours');
    affinity('Solgar', '', 0, 'empty theirs');

    echo "\n  Whole-token containment, never substring\n";
    affinity('NOW Foods', 'Snow Foods', 0, '"now" must not match inside "snow"');

    echo "\n".str_repeat('─', 90)."\n";

    if ($failed > 0) {
        printf("\n%d of %d check(s) FAILED.\n\n", $failed, $checks);
        exit(1);
    }

    printf("\nAll %d checks passed.\n\n", $checks);
    exit(0);
}
