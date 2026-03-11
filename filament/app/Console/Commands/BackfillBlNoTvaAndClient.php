<?php

namespace App\Console\Commands;

use App\Models\Facture;
use App\Services\InvoiceCalculator;
use Illuminate\Console\Command;

class BackfillBlNoTvaAndClient extends Command
{
    protected $signature = 'facture:backfill-bl-no-tva-and-client
                            {--tva-only : Only set TVA to 0 and recalculate totals}
                            {--client-only : Only backfill client_id from commande}';

    protected $description = 'Backfill BL: set TVA=0 and recalculate net_a_payer (HT+timbre); fill client_id from commande (user_id ?? client_id) when missing.';

    public function handle(): int
    {
        $tvaOnly = $this->option('tva-only');
        $clientOnly = $this->option('client-only');

        if (! $tvaOnly && ! $clientOnly) {
            $this->info('Backfilling TVA (0) + totals and client_id from commande...');
        } elseif ($tvaOnly) {
            $this->info('Backfilling TVA (0) + totals only...');
        } else {
            $this->info('Backfilling client_id from commande only...');
        }

        $query = Facture::with('details', 'commande');
        $factures = $query->get();
        $countTva = 0;
        $countClient = 0;

        foreach ($factures as $facture) {
            if (! $clientOnly) {
                $detailsArray = $facture->details->map(fn ($d) => [
                    'produit_id' => $d->produit_id,
                    'qte' => $d->qte ?? $d->quantite ?? 1,
                    'prix_unitaire' => $d->prix_unitaire ?? 0,
                    'tva_pct' => 0,
                ])->toArray();

                $remise = (float) ($facture->remise ?? 0);
                $timbre = (float) ($facture->timbre ?? 0);
                $calcTotals = InvoiceCalculator::calculate($detailsArray, $remise, $timbre, 0);

                $facture->update([
                    'tva' => 0,
                    'prix_ht' => $calcTotals['total_ht_brut'],
                    'remise' => $calcTotals['remise'],
                    'pourcentage_remise' => $calcTotals['pourcentage_remise'],
                    'prix_ht_apres_remise' => $calcTotals['prix_ht_apres_remise'],
                    'timbre' => $timbre,
                    'prix_ttc' => $calcTotals['prix_ttc'],
                    'net_a_payer' => $calcTotals['net_a_payer'],
                ]);
                $countTva++;
            }

            if (! $tvaOnly && $facture->client_id === null && $facture->commande_id !== null) {
                $commande = $facture->commande;
                if ($commande) {
                    $clientId = $commande->user_id ?? $commande->client_id;
                    if ($clientId !== null) {
                        $facture->update(['client_id' => $clientId]);
                        $countClient++;
                    }
                }
            }
        }

        if (! $clientOnly) {
            $this->info("TVA=0 + totals recalculated for {$countTva} BL(s).");
        }
        if (! $tvaOnly) {
            $this->info("Client backfilled from commande for {$countClient} BL(s).");
        }

        return self::SUCCESS;
    }
}
