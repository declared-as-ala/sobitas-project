<?php

namespace App\Console\Commands;

use App\Enums\QuotationStatus;
use App\Models\Coordinate;
use App\Models\Quotation;
use App\Services\InvoiceCalculator;
use Illuminate\Console\Command;

class BackfillDevisTotals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'devis:backfill-totals';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculates all Quotation (Devis) totals with the InvoiceCalculator, generates TVAs safely, and removes Draft statuses.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $quotations = Quotation::with('details')->get();
        $count = $quotations->count();
        
        $this->info("Found {$count} devis to review and backfill...");

        $coordinate = Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

        $updated = 0;

        foreach ($quotations as $quotation) {
            $details = $quotation->details->map(function ($d) use ($defaultTva) {
                return [
                    'qte' => $d->qte ?? $d->quantite ?? 1,
                    'prix_unitaire' => (float) $d->prix_unitaire,
                    'tva_pct' => (float) ($d->tva ?? $defaultTva),
                ];
            })->toArray();

            $remise = (float) $quotation->remise;
            $timbre = (float) $quotation->timbre;

            $calcTotals = InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);
            
            $status = $quotation->status;
            if ($status === QuotationStatus::Draft) {
                $status = QuotationStatus::Accepted; // Force Validated
            }

            $quotation->update([
                'status' => $status,
                'prix_ht' => $calcTotals['total_ht_brut'],
                'remise' => $calcTotals['remise'],
                'pourcentage_remise' => $calcTotals['pourcentage_remise'],
                'prix_ht_apres_remise' => $calcTotals['prix_ht_apres_remise'],
                'tva' => $calcTotals['tva'],
                'timbre' => $calcTotals['timbre'],
                'prix_ttc' => $calcTotals['prix_ttc'],
                'net_a_payer' => $calcTotals['net_a_payer'],
                'prix_total' => $calcTotals['prix_ttc'], // backwards compat
            ]);

            $updated++;
        }

        $this->info("Successfully backfilled and unlocked {$updated} Devis.");
        return static::SUCCESS;
    }
}
