<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\WelcomeBonusService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Release every RESERVED welcome bonus at once: credit it now, no delivery needed.
 *
 * For the day the owner turns WELCOME_BONUS_UNLOCK_ON_DELIVERY off. Claims reserved while it was on
 * would otherwise stay pending until each customer clicks 'Recevoir mes 15 DT' or re-verifies.
 * Refuses to write while the switch is still on. Idempotent: WelcomeBonusService::creditPending()
 * skips credited claims and its ledger key (welcome:{user}:unlock:0) is unique.
 *
 *   php artisan protinas:welcome-release-pending           dry run: counts only, writes nothing
 *   php artisan protinas:welcome-release-pending --apply   credits every pending claim
 */
class WelcomeReleasePending extends Command
{
    protected $signature = 'protinas:welcome-release-pending {--apply : Credit the pending claims (default: dry run)}';

    protected $description = 'Credit every reserved (pending) welcome bonus once the unlock-on-delivery switch is off';

    public function handle(WelcomeBonusService $welcome): int
    {
        if (! Schema::hasTable('welcome_bonus_claims') || ! Schema::hasColumn('welcome_bonus_claims', 'credited_at')) {
            $this->error('welcome_bonus_claims.credited_at is missing: run the migrations first.');

            return self::FAILURE;
        }
        $switchOn = (bool) config('welcome_bonus.unlock_on_first_delivery', true);
        $pending = DB::table('welcome_bonus_claims')->whereNull('credited_at')
            ->orderBy('user_id')->get(['user_id', 'points']);
        $this->info(sprintf('%d pending welcome claims, %d Protinas in total. Unlock on delivery: %s.',
            $pending->count(), (int) $pending->sum('points'), $switchOn ? 'ON' : 'OFF'));

        if (! $this->option('apply')) {
            $this->comment('Dry run: nothing was written.');

            return self::SUCCESS;
        }
        if ($switchOn) {
            $this->error('WELCOME_BONUS_UNLOCK_ON_DELIVERY is still on: set it to false and run config:clear first. Nothing was written.');

            return self::FAILURE;
        }

        $credited = 0;
        $skipped = 0;
        $failed = 0;
        foreach ($pending as $row) {
            $user = User::find($row->user_id);
            if (! $user) {
                $skipped++;
                continue;
            }
            try {
                // Protinas v3: a claim still pending was reserved under the old delivery-unlock terms
                // (the deploy migration releases them the same way): grandfathered, no expiry.
                if ($welcome->creditPending($user, true)) {
                    $credited++;
                } else {
                    $skipped++;
                }
            } catch (\Throwable $e) {
                $failed++;
                $this->warn(sprintf('user #%d not credited: %s', $row->user_id, $e->getMessage()));
            }
        }
        $this->info(sprintf('Credited %d · skipped %d · failed %d.', $credited, $skipped, $failed));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
