<?php

namespace App\Console\Commands;

use App\Services\AramexTrackingSync;
use Illuminate\Console\Command;

/**
 * Poll Aramex for shipments in flight, and mark the matching orders delivered.
 *
 * Run it by hand first, with --dry-run, and read the table before you believe it:
 *
 *     php artisan aramex:sync-tracking --dry-run
 *
 * That prints every shipment whose status moved and, in the last column, every order it WOULD
 * promote to "livrée" — without writing anything. The promotion is what fires the customer SMS,
 * the loyalty points and the review request, so it is worth seeing once before it runs itself.
 */
class SyncAramexTracking extends Command
{
    protected $signature = 'aramex:sync-tracking
                            {--limit=200 : Maximum shipments to poll in one pass}
                            {--dry-run : Report what would change without writing}';

    protected $description = 'Refresh Aramex tracking and mark delivered orders as livrée';

    public function handle(AramexTrackingSync $sync): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limit  = max(1, (int) $this->option('limit'));

        $result = $sync->sync($limit, $dryRun);

        if ($result['checked'] === 0) {
            $this->info('No shipments in flight.');

            return self::SUCCESS;
        }

        $moved = array_values(array_filter($result['rows'], fn (array $r) => $r['from'] !== $r['to'] || $r['promotes']));

        if ($moved) {
            $this->table(
                ['BL', 'HAWB', 'De', 'Vers', 'Description', 'Commande', 'Livrée'],
                array_map(fn (array $r) => [
                    $r['bl'],
                    $r['hawb'],
                    $r['from'] ?? '—',
                    $r['to'],
                    mb_strimwidth((string) ($r['description'] ?? ''), 0, 40, '…'),
                    $r['commande_id'] ?? '—',
                    $r['promotes'] ? 'OUI' : '',
                ], $moved)
            );
        }

        $this->info(sprintf(
            '%s%d polled · %d status change(s) · %d delivered · %d order(s) marked livrée · %d error(s).',
            $dryRun ? '[dry-run] ' : '',
            $result['checked'],
            $result['status_changed'],
            $result['delivered'],
            $result['orders_updated'],
            $result['errors']
        ));

        // A delivered shipment whose order could not be found is worth saying out loud: it means a
        // BL with no commande_id, and that customer will never get a review request.
        $orphans = count(array_filter($result['rows'], fn (array $r) => ! $r['promotes'] && empty($r['commande_id'])));
        if ($orphans > 0) {
            $this->warn($orphans . ' shipment(s) have no linked commande — no order status was changed for them.');
        }

        return self::SUCCESS;
    }
}
