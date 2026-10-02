<?php

namespace App\Console\Commands;

use App\Services\PointsService;
use App\Services\ProtinaWalletService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Expire gift Protinas past their date (Protinas v3, rule 20). Scheduled daily at 03:30.
 *
 *   php artisan protinas:expire --dry-run   what is due: lots, Protinas, customers — writes nothing
 *   php artisan protinas:expire             one `expiry` row per lot (key expiry:{lot}), lot closed
 *
 * Idempotent: an expired lot has remaining = 0 and its key is unique, so a second run (or the same
 * run twice the same night) writes nothing. Earned Protinas never expire and are never touched;
 * gifts that existed before v3 have no expiry date and are never touched either.
 */
class ProtinasExpire extends Command
{
    protected $signature = 'protinas:expire
        {--dry-run : Count what is due, write nothing}
        {--limit=5000 : Gift lots processed per run}';

    protected $description = 'Expire gift Protinas past their date (earned Protinas never expire)';

    public function handle(ProtinaWalletService $wallets): int
    {
        $cols = PointsService::ledgerColumns();
        if (! $cols['bucket'] || ! $cols['remaining'] || ! $cols['expires_at'] || ! $cols['gift']) {
            $this->warn('Protinas v3 columns are missing (run the migrations): nothing can expire.');

            return self::SUCCESS;
        }

        $due = DB::table('user_point_transactions')->where('bucket', PointsService::BUCKET_GIFT)
            ->where('remaining', '>', 0)->whereNotNull('expires_at')->where('expires_at', '<=', now());
        $lots = (clone $due)->count();
        $points = (int) (clone $due)->sum('remaining');
        $users = (clone $due)->distinct()->count('user_id');
        $this->info(sprintf('%d gift lot(s) past their date: %d Protinas (%s DT) on %d account(s).',
            $lots, $points, number_format($points / PointsService::pointsPerDt(), 3, ',', ' '), $users));

        if ($this->option('dry-run')) {
            $this->comment('Dry run: nothing was written.');

            return self::SUCCESS;
        }

        $result = $wallets->expireDue(max(1, (int) $this->option('limit')));
        $this->info(sprintf('Expired %d lot(s), %d Protinas · failed %d.', $result['expired_lots'], $result['points'], $result['failed']));

        return $result['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
