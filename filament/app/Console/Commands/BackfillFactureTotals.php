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
    protected $signature = 'facture:backfill-totals {--only-zero : Only update records where net_a_payer is 0 or null}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculates and backfills missing totals (net_a_payer, prix_ttc, tva, etc.) for Bon de Livraison records, including BLs created from order conversion that have net_a_payer=0.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting backfill of Facture (Bon de Livraison) totals...');
        $query = Facture::with('details');
        if ($this->option('only-zero')) {
            $query->where(function ($q) {
                $q->whereNull('net_a_payer')->orWhere('net_a_payer', 0);
            });
        }
        $factures = $query->get();
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
                'tva_pct' => $globalDefaultTva,
            ])->toArray();

            $remise = (float) ($facture->remise ?? 0);
            $timbre = (float) ($facture->timbre ?? 0);

            $calcTotals = InvoiceCalculator::calculate($detailsArray, $remise, $timbre, $globalDefaultTva);

            $updateData = [
                'prix_ht' => $calcTotals['total_ht_brut'],
                'remise' => $calcTotals['remise'],
                'pourcentage_remise' => $calcTotals['pourcentage_remise'],
                'prix_ht_apres_remise' => $calcTotals['prix_ht_apres_remise'],
                'tva' => $calcTotals['tva'],
                'timbre' => $calcTotals['timbre'],
                'prix_ttc' => $calcTotals['prix_ttc'],
                'net_a_payer' => $calcTotals['net_a_payer'],
            ];

            $facture->update($updateData);
            $count++;
        }

        $this->info("Successfully backfilled totals for {$count} Bon de Livraison records.");
        return static::SUCCESS;
    }
}
