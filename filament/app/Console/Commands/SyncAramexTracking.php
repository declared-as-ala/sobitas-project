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
 *
 * And when nothing is being promoted at all, this is the question to ask:
 *
 *     php artisan aramex:sync-tracking --codes
 *
 * which lists every distinct update code the account is actually returning, with a sample
 * description and whether it currently counts as a delivery. `delivered_codes` defaults to
 * ['SH006'] — inherited from the old dashboard widget and never verified against the live account
 * — and if it is wrong this whole pipeline is a silent no-op: polls everything, promotes nothing,
 * exits 0, hourly, forever.
 */
class SyncAramexTracking extends Command
{
    protected $signature = 'aramex:sync-tracking
                            {--limit=200 : Maximum shipments to poll in one pass}
                            {--dry-run : Report what would change without writing}
                            {--codes : List the distinct update codes seen, and write nothing}';

    protected $description = 'Refresh Aramex tracking and mark delivered orders as livrée';

    public function handle(AramexTrackingSync $sync): int
    {
        // `--codes` implies `--dry-run`. It is a question, not an operation, and the whole reason
        // to reach for it is uncertainty about which code means delivered — which is the worst
        // possible moment to also be writing order statuses.
        $codesOnly = (bool) $this->option('codes');
        $dryRun    = $codesOnly || (bool) $this->option('dry-run');
        $limit     = max(1, (int) $this->option('limit'));

        $result = $sync->sync($limit, $dryRun);

        if ($result['checked'] === 0) {
            $this->info('No shipments in flight.');

            return self::SUCCESS;
        }

        /*
         * ── THE CODE TABLE ────────────────────────────────────────────────────────────────
         * `delivered_codes` defaults to ['SH006'], inherited from the dashboard widget and never
         * verified against this account. If it is wrong, the sweep polls everything, promotes
         * nothing and exits 0 — forever, with no error anywhere. This is how you check, without
         * having to find a parcel you know was delivered and read a dashboard beside it.
         */
        if ($codesOnly) {
            if (empty($result['codes'])) {
                $this->warn('No update codes returned — either nothing is in flight, or every HAWB is too fresh for Aramex to have an update.');

                return self::SUCCESS;
            }

            $configured = array_map('strtoupper', (array) config('aramex.delivered_codes', ['SH006']));
            $this->table(
                ['Code', 'Occurrences', 'Description', 'Compté comme livré ?'],
                array_map(
                    fn (string $code, array $info) => [
                        $code,
                        $info['count'],
                        mb_strimwidth((string) $info['description'], 0, 48, '…'),
                        $info['delivered'] ? 'OUI' : '',
                    ],
                    array_keys($result['codes']),
                    array_values($result['codes'])
                )
            );
            $this->line('delivered_codes actuellement configurés : ' . implode(', ', $configured));

            if (! empty($result['unrecognised_delivery'])) {
                $this->newLine();
                $this->error('ATTENTION — ces codes ressemblent à une livraison mais ne promeuvent aucune commande :');
                $this->error('  ' . implode(', ', $result['unrecognised_delivery']));
                $this->line('Ajoutez-les à config/aramex.php → delivered_codes après vérification auprès d’Aramex.');
            }

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

        /*
         * The blind-spot warning, on the NORMAL path too — not only under `--codes`.
         *
         * This is the single most useful line this command can print, because it is the one that
         * fires while everything else reports success. A run that says "0 orders marked livrée"
         * looks identical whether nothing was delivered today or the configured code is wrong.
         */
        if (! empty($result['unrecognised_delivery'])) {
            $this->error(
                'Code(s) ressemblant à une livraison mais NON configurés : '
                . implode(', ', $result['unrecognised_delivery'])
                . ' — voir `aramex:sync-tracking --codes` et config/aramex.php.'
            );
        }

        // A delivered shipment whose order could not be found is worth saying out loud: it means a
        // BL with no commande_id, and that customer will never get a review request.
        $orphans = count(array_filter($result['rows'], fn (array $r) => ! $r['promotes'] && empty($r['commande_id'])));
        if ($orphans > 0) {
            $this->warn($orphans . ' shipment(s) have no linked commande — no order status was changed for them.');
        }

        return self::SUCCESS;
    }
}
