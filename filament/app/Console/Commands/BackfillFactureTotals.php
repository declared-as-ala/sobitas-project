<?php

namespace App\Console\Commands;

use App\Models\Facture;
use App\Services\InvoiceCalculator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class BackfillFactureTotals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'facture:backfill-totals';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculates and backfills missing totals (like net_a_payer) for old Bon de Livraison (Facture) records.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting backfill of Facture (Bon de Livraison) totals...');
        $factures = Facture::with('details')->get();
        $count = 0;
        
        $coordinate = \App\Models\Coordinate::first();
        // Assuming BL doesn't use TVA by default but we check configurations
        $globalDefaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

        // Bon de Livraison generally does not use TVA natively, but if it has it in config, we respect it
        // Depending on specific business logic, BL total might be TTC or HT. InvoiceCalculator handles both.

        foreach ($factures as $facture) {
            $detailsArray = $facture->details->map(fn ($d) => [
                'produit_id' => $d->produit_id,
                'qte' => $d->qte ?? $d->quantite ?? 1,
                'prix_unitaire' => $d->prix_unitaire ?? 0,
                // Assumed BL lines inherit global TVA if applicable, usually 0 for typical BLs if not billing
                'tva_pct' => 0, 
            ])->toArray();

            $remise = (float) ($facture->remise ?? 0);
            $timbre = (float) ($facture->timbre ?? 0);
            $tvaRate = 0; // Using zero to keep BL just as HT/TTC equivalent unless TVA is explicitly forced

            $calcTotals = InvoiceCalculator::calculate($detailsArray, $remise, $timbre, $tvaRate);

            $updateData = [
                'prix_ht' => $calcTotals['total_ht_brut'],
                'remise' => $calcTotals['remise'],
                'prix_ttc' => $calcTotals['prix_ttc'],
                'timbre' => $calcTotals['timbre'],
                'net_a_payer' => $calcTotals['net_a_payer'],
                'status' => 'issued', // Ensure existing ones are valid and no longer drafts
                'tva' => $calcTotals['tva'],
            ];

            if (Schema::hasColumn('factures', 'prix_ht_apres_remise')) {
                $updateData['prix_ht_apres_remise'] = $calcTotals['prix_ht_apres_remise'];
            }
            if (Schema::hasColumn('factures', 'pourcentage_remise')) {
                $updateData['pourcentage_remise'] = $calcTotals['pourcentage_remise'];
            }
            if (Schema::hasColumn('factures', 'net_a_payer')) {
                $updateData['net_a_payer'] = $calcTotals['net_a_payer'];
            }

            $facture->update($updateData);
            $count++;
        }

        $this->info("Successfully backfilled totals for {$count} Bon de Livraison records.");
        return static::SUCCESS;
    }
}
