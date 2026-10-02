<?php

namespace App\Console\Commands;

use App\Services\PointsService;
use App\Services\ProtinaWalletService;
use Illuminate\Console\Command;

/**
 * Split every pre-v3 Protinas balance into the earned and gift wallets (spec §E step 3).
 *
 * The deploy migration 2026_10_02_000001 already runs this with --apply, and the scheduler re-runs it
 * hourly (routes/console.php): rows written by old code during a deploy have no bucket. An account is
 * processed only while it has unclassified rows; a re-run adds those rows to the wallet as it stands
 * (the gift column, its lots and points_debt are kept, never recomputed from scratch).
 *
 *   php artisan protinas:split-wallets           dry run: report only, writes nothing
 *   php artisan protinas:split-wallets --apply   classify rows, set gift balances, reconcile drift
 */
class ProtinasSplitWallets extends Command
{
    protected $signature = 'protinas:split-wallets {--apply : Write the split (default: dry run)}';

    protected $description = 'Classify the pre-v3 Protinas ledger into earned and gift wallets';

    public function handle(ProtinaWalletService $wallets): int
    {
        $apply = (bool) $this->option('apply');
        $report = $wallets->splitWallets($apply);
        if ($report['status'] === 'missing_columns') {
            $this->error('The Protinas v3 columns are missing: run the migrations first. Nothing was written.');

            return self::FAILURE;
        }

        $rows = array_map(fn (array $d) => [$d['user_id'], $d['balance'], $d['gift'], $d['earned'], $d['drift']],
            array_slice($report['details'], 0, 100));
        if ($rows !== []) {
            $this->table(['user', 'balance', 'gift', 'earned', 'drift'], $rows);
        }
        $this->info(sprintf(
            '%s: %d accounts considered · %d split · %d skipped (already split) · %d failed. Gift %d pts (%.3f DT) · earned %d pts (%.3f DT) · drift on %d accounts (%+d pts, reconciled by a hidden adjustment).',
            $apply ? 'APPLIED' : 'DRY RUN',
            $report['users'], $report['split'], $report['skipped'], $report['failed'],
            $report['gift_points'], $report['gift_points'] / PointsService::pointsPerDt(),
            $report['earned_points'], $report['earned_points'] / PointsService::pointsPerDt(),
            $report['drift_users'], $report['drift_points'],
        ));
        if ($report['failed'] > 0) {
            $this->warn('Failed accounts: '.implode(', ', $report['failed_user_ids']).'. Their whole balance counts as gift until a re-run succeeds.');
        }
        if (! $apply) {
            $this->comment('Dry run: nothing was written.');
        }

        return $report['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
