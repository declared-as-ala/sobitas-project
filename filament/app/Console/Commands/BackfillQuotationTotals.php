<?php

namespace App\Console\Commands;

use App\Models\Quotation;
use App\Services\InvoiceCalculator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class BackfillQuotationTotals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'quotation:backfill-totals';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculates and backfills missing totals (like net_a_payer) for old Devis (Quotation) records.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting backfill of Quotation (Devis) totals...');
        $quotations = Quotation::with('details')->get();
        $count = 0;
        
        $coordinate = \App\Models\Coordinate::first();
        $globalDefaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

        foreach ($quotations as $quotation) {
            $detailsArray = $quotation->details->map(fn ($d) => [
                'produit_id' => $d->produit_id,
                'qte' => $d->qte ?? $d->quantite ?? 1,
                'prix_unitaire' => $d->prix_unitaire ?? 0,
                // Usually quotations don't explicitly store line TVA in legacy data, we approximate with global TVA
                'tva_pct' => $d->tva ?? $globalDefaultTva, 
            ])->toArray();

            $remise = (float) ($quotation->remise ?? 0);
            $timbre = (float) ($quotation->timbre ?? 0);

            $calcTotals = InvoiceCalculator::calculate($detailsArray, $remise, $timbre, $globalDefaultTva);

            $updateData = [
                'prix_ht' => $calcTotals['total_ht_brut'],
                'remise' => $calcTotals['remise'],
                'tva' => $calcTotals['tva'],
                'timbre' => $calcTotals['timbre'],
                'prix_ttc' => $calcTotals['prix_ttc'],
            ];

            if (Schema::hasColumn('quotations', 'prix_ht_apres_remise')) {
                $updateData['prix_ht_apres_remise'] = $calcTotals['prix_ht_apres_remise'];
            }
            if (Schema::hasColumn('quotations', 'pourcentage_remise')) {
                $updateData['pourcentage_remise'] = $calcTotals['pourcentage_remise'];
            }
            if (Schema::hasColumn('quotations', 'net_a_payer')) {
                $updateData['net_a_payer'] = $calcTotals['net_a_payer'];
            }

            $quotation->update($updateData);
            $count++;
        }

        $this->info("Successfully backfilled totals for {$count} Devis records.");
        return static::SUCCESS;
    }
}
