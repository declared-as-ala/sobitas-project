<?php

namespace App\Services;

class InvoiceCalculator
{
    /**
     * Calcule tous les totaux d'une facture sous forme de tableau standardisé.
     * Cette méthode garantit une seule source de vérité pour le "Net à payer".
     *
     * @param array $details Tableau des lignes (contenant au moins 'qte', 'prix_unitaire', 'tva_pct')
     * @param float $remise Montant de la remise (sera capé au total HT)
     * @param float $timbre Montant du timbre fiscal
     * @param float $defaultTva Taux de TVA par défaut (ex: 19) si non précisé par ligne
     * @param float $fraisLivraison Frais de livraison (ex: pour BL depuis commande)
     * @return array
     */
    public static function calculate(array $details, float $remise = 0, float $timbre = 0, float $defaultTva = 19, float $fraisLivraison = 0): array
    {
        $totalHt = 0.0;
        $totalTva = 0.0;

        // Étape 1 : Calcul par ligne
        foreach ($details as $row) {
            // Ignorer si ligne vide
            if (empty($row['produit_id']) && !isset($row['prix_unitaire'])) {
                continue;
            }

            $qte = (int) ($row['qte'] ?? $row['quantite'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            $tvaPct = (float) ($row['tva_pct'] ?? $row['tva'] ?? $defaultTva);

            $htLigne = $qte * $prixUnitaire;
            $tvaLigne = $htLigne * $tvaPct / 100;

            $totalHt += $htLigne;
            $totalTva += $tvaLigne;
        }

        // Étape 2 : Remise (capée au montant HT total)
        $remise = max(0, $remise);
        $remise = min($remise, $totalHt);

        // Étape 3 : Application proportionnelle de la remise sur les totaux
        $htApresRemise = $totalHt - $remise;
        $tvaApresRemise = $totalTva;

        if ($totalHt > 0 && $remise > 0) {
            // La TVA diminue proportionnellement à la remise sur le HT global
            $tvaApresRemise = $totalTva - ($totalTva * $remise / $totalHt);
        }

        // Étape 4 : Timbre
        $timbre = max(0, $timbre);

        // Étape 5 : Frais de livraison (ex. pour BL)
        $fraisLivraison = max(0, $fraisLivraison);

        // Arrondis finaux (3 décimales pour les TND)
        $htApresRemiseArrondi = round($htApresRemise, 3);
        $tvaApresRemiseArrondi = round($tvaApresRemise, 3);
        $ttcArrondi = round($htApresRemiseArrondi + $tvaApresRemiseArrondi, 3);

        // Le NET À PAYER est la somme TTC + Timbre + Frais de livraison
        $netAPayer = round($ttcArrondi + $timbre + $fraisLivraison, 3);

        $pourcentageRemise = $totalHt > 0 ? round(($remise / $totalHt) * 100, 2) : 0;

        return [
            'total_ht_brut'        => round($totalHt, 3), // Sous-total HT (avant remise)
            'total_tva_brut'       => round($totalTva, 3), // Total TVA théorique (avant remise)

            'remise'               => $remise,
            'pourcentage_remise'   => $pourcentageRemise,

            'prix_ht_apres_remise' => $htApresRemiseArrondi, // Base HT finale
            'tva'                  => $tvaApresRemiseArrondi, // Base TVA finale
            'timbre'               => $timbre,
            'frais_livraison'      => $fraisLivraison,

            'prix_ttc'             => $ttcArrondi, // Total TTC avant timbre
            'net_a_payer'          => $netAPayer, // Valeur finale absolue
        ];
    }
}
