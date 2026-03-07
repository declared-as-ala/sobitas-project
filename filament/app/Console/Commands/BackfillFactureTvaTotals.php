<?php

namespace App\Console\Commands;

use App\Models\FactureTva;
use App\Services\InvoiceCalculator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class BackfillFactureTvaTotals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'facture-tva:backfill-totals {--only-zero : Only update records where net_a_payer is 0 or null}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculates and backfills missing totals (like net_a_payer) for old Facture TVA records.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting backfill of Facture TVA totals...');
        $query = FactureTva::with('details');
        if ($this->option('only-zero')) {
            $query->where(function ($q) {
                $q->whereNull('net_a_payer')->orWhere('net_a_payer', 0);
            });
        }
        $factures = $query->get();
        $count = 0;
        $coordinate = \App\Models\Coordinate::first();
        $globalDefaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

        foreach ($factures as $facture) {
            $detailsArray = $facture->details->map(fn ($d) => [
                'produit_id' => $d->produit_id,
                'qte' => $d->qte ?? $d->quantite ?? 1,
                'prix_unitaire' => $d->prix_unitaire ?? 0,
                'tva_pct' => $d->tva ?? $globalDefaultTva,
            ])->toArray();

            $remise = (float) ($facture->remise ?? 0);
            $timbre = (float) ($facture->timbre ?? 0);

            $calcTotals = InvoiceCalculator::calculate($detailsArray, $remise, $timbre, $globalDefaultTva);

            $updateData = [
                'prix_ht' => $calcTotals['total_ht_brut'],
                'remise' => $calcTotals['remise'],
                'tva' => $calcTotals['tva'],
                'timbre' => $calcTotals['timbre'],
                'prix_ttc' => $calcTotals['prix_ttc'],
            ];

            if (Schema::hasColumn('facture_tvas', 'prix_ht_apres_remise')) {
                $updateData['prix_ht_apres_remise'] = $calcTotals['prix_ht_apres_remise'];
            }
            if (Schema::hasColumn('facture_tvas', 'pourcentage_remise')) {
                $updateData['pourcentage_remise'] = $calcTotals['pourcentage_remise'];
            }
            if (Schema::hasColumn('facture_tvas', 'net_a_payer')) {
                $updateData['net_a_payer'] = $calcTotals['net_a_payer'];
            }

            $facture->update($updateData);
            $count++;
        }

        $this->info("Successfully backfilled totals for {$count} Facture TVA records.");
        return static::SUCCESS;
    }
}
