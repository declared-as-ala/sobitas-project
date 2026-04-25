<?php

namespace App\Console\Commands;

use App\Models\Client;
use App\Models\LoyaltyPointTransaction;
use App\Services\LoyaltyService;
use Illuminate\Console\Command;

class BackfillLoyaltyBalances extends Command
{
    protected $signature = 'loyalty:backfill-balances {--dry-run : Show mismatches without updating}';

    protected $description = 'Rebuild loyalty_points_balance for every client from their transaction history';

    public function handle(LoyaltyService $loyaltyService): int
    {
        $dryRun     = (bool) $this->option('dry-run');
        $fixed      = 0;
        $skipped    = 0;
        $mismatches = [];

        $this->info($dryRun ? '[DRY RUN] Scanning client balances…' : 'Rebuilding client loyalty balances…');

        $bar = $this->output->createProgressBar(Client::count());
        $bar->start();

        Client::query()->chunkById(100, function ($clients) use ($loyaltyService, $dryRun, &$fixed, &$skipped, &$mismatches, $bar) {
            // Load transaction sums for this chunk in one query
            $clientIds = $clients->pluck('id');
            $sums = LoyaltyPointTransaction::query()
                ->selectRaw('client_id, COALESCE(SUM(points), 0) as total')
                ->whereIn('client_id', $clientIds)
                ->groupBy('client_id')
                ->pluck('total', 'client_id');

            foreach ($clients as $client) {
                $computed = max(0, (int) ($sums[$client->id] ?? 0));
                $stored   = (int) $client->loyalty_points_balance;

                if ($computed !== $stored) {
                    $mismatches[] = [
                        'id'       => $client->id,
                        'name'     => $client->name,
                        'stored'   => $stored,
                        'computed' => $computed,
                    ];

                    if (! $dryRun) {
                        $client->update(['loyalty_points_balance' => $computed]);
                        $fixed++;
                    }
                } else {
                    $skipped++;
                }

                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine(2);

        if (! empty($mismatches)) {
            $this->table(
                ['Client ID', 'Name', 'Stored', 'Computed', 'Delta'],
                array_map(fn ($m) => [
                    $m['id'],
                    $m['name'],
                    $m['stored'],
                    $m['computed'],
                    $m['computed'] - $m['stored'],
                ], $mismatches)
            );
        } else {
            $this->info('All balances are correct.');
        }

        if ($dryRun) {
            $this->warn(count($mismatches) . ' mismatch(es) found. Run without --dry-run to fix.');
        } else {
            $this->info("{$fixed} client(s) updated, {$skipped} already correct.");
        }

        return self::SUCCESS;
    }
}
