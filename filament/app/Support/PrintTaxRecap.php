<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The « Taxe | Taux | Base | Montant » recap printed beside the totals of the invoice and the quote.
 *
 * It must agree, to the millime, with the totals table next to it — which comes from
 * App\Services\InvoiceCalculator. That calculator spreads a remise proportionally over the HT and
 * the TVA, so the recap does the same per rate, and puts the rounding remainder on the largest rate:
 * Σ base === HT after remise, Σ montant === TVA of the totals table. Never a second calculation
 * that could print a different TVA than the total below it.
 */
final class PrintTaxRecap
{
    /**
     * @param  array<int, array{tva: float|int, total_ht: float|int, montant_tva?: float|int}>  $rows
     * @return array<string, array{base: float, montant: float}> keyed by rate, ascending
     */
    public static function buckets(array $rows, float $totalHtBrut, float $remise, float $totalTva): array
    {
        $buckets = [];
        foreach ($rows as $row) {
            $rate = (float) ($row['tva'] ?? 0);
            $key = (string) $rate;
            $ht = (float) ($row['total_ht'] ?? 0);
            $buckets[$key] ??= ['base' => 0.0, 'montant' => 0.0];
            $buckets[$key]['base'] += $ht;
            $buckets[$key]['montant'] += $ht * $rate / 100;
        }
        if ($buckets === []) {
            return [];
        }

        $remise = max(0.0, min($remise, $totalHtBrut));
        $factor = $totalHtBrut > 0 ? 1 - $remise / $totalHtBrut : 1.0;
        foreach ($buckets as $key => $b) {
            $buckets[$key] = [
                'base' => round($b['base'] * $factor, 3),
                'montant' => round($b['montant'] * $factor, 3),
            ];
        }

        // Rounding remainder on the largest base, so the recap sums exactly to the totals table.
        $largest = array_keys($buckets, max($buckets))[0] ?? array_key_first($buckets);
        $baseTarget = round($totalHtBrut - $remise, 3);
        $buckets[$largest]['base'] = round($buckets[$largest]['base'] + $baseTarget - array_sum(array_column($buckets, 'base')), 3);
        $buckets[$largest]['montant'] = round($buckets[$largest]['montant'] + round($totalTva, 3) - array_sum(array_column($buckets, 'montant')), 3);

        uksort($buckets, fn ($a, $b) => (float) $a <=> (float) $b);

        return $buckets;
    }
}
