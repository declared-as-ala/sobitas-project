<?php

namespace App\Services;

use Illuminate\Support\Collection;

/**
 * Calcul des montants par ligne et totaux pour un devis.
 * Une seule source de vérité pour : P.U HT, Total HT (ligne), TVA (ligne), Total TTC (ligne).
 */
class DevisCalculator
{
    /**
     * Construit les lignes enrichies (line_total_ht, line_tva_dt, line_total_ttc) à partir des détails.
     *
     * @param  Collection<int, \App\Models\DetailsQuotation>|array  $details
     * @param  float  $defaultTva  Taux TVA par défaut si non précisé par ligne (ex: 19)
     * @return array{lines: array<int, array{detail: \App\Models\DetailsQuotation, line_total_ht: float, line_tva_pct: float, line_tva_dt: float, line_total_ttc: float}>}
     */
    public static function lines($details, float $defaultTva = 19): array
    {
        $details = $details instanceof Collection ? $details : collect($details);
        $lines = [];

        foreach ($details as $detail) {
            $qte = (int) ($detail->qte ?? $detail->quantite ?? 1);
            $puHt = (float) ($detail->prix_unitaire ?? 0);
            $tvaPct = (float) ($detail->tva ?? $defaultTva);

            $lineTotalHt = round($qte * $puHt, 3);
            $lineTvaDt = round($lineTotalHt * $tvaPct / 100, 3);
            $lineTotalTtc = round($lineTotalHt + $lineTvaDt, 3);

            $lines[] = [
                'detail' => $detail,
                'line_total_ht' => $lineTotalHt,
                'line_tva_pct' => $tvaPct,
                'line_tva_dt' => $lineTvaDt,
                'line_total_ttc' => $lineTotalTtc,
            ];
        }

        return ['lines' => $lines];
    }
}
