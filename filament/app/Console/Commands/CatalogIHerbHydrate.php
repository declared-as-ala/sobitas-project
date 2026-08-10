<?php

namespace App\Console\Commands;

use App\Jobs\HydrateExternalProductJob;
use App\Models\ExternalCatalogProduct;
use Illuminate\Console\Command;

/**
 * Dispatch hydration work for staged products.
 *
 * ── WHY THIS DISPATCHES A WINDOW AND THEN STOPS ───────────────────────────────────────────
 * The obvious version queues all 42,882 jobs at once. It would even work — Redis holds them, the
 * worker drains them at the paced rate. But it also means Redis is the only record of what is left
 * to do, and flushing the queue (something anyone might do to clear an unrelated stuck job) would
 * silently lose the run with no way to tell what had been dropped.
 *
 * Dispatching a bounded window keeps the database authoritative. The queue holds at most `batch`
 * items; the remaining work is rows in a state, which survives a queue flush, a Redis restart and a
 * worker crash equally. Re-running the command — by hand or from the scheduler — refills the
 * window. That is also what makes the whole import restartable without a single line of resume
 * logic.
 *
 * ── ON PACING ─────────────────────────────────────────────────────────────────────────────
 * This command does NOT sleep or throttle. PoliteFetcher owns the pace, in Redis, shared across
 * every worker (0.5 req/s for iherb.com). A second opinion about speed living here would be a
 * second, conflicting limiter — and with two workers running, "each one politely pacing itself"
 * is twice the agreed rate.
 */
class CatalogIHerbHydrate extends Command
{
    protected $signature = 'catalog:iherb:hydrate
                            {--limit= : How many products to dispatch (default: catalog.hydration.batch)}
                            {--include-neutral : Also hydrate rows the slug filter could not decide}
                            {--retry-failed : Return exhausted rows to the queue and stop}
                            {--status : Print the state of the import and exit}';

    protected $description = 'Dispatch hydration jobs for discovered iHerb products';

    public function handle(): int
    {
        if ($this->option('status')) {
            return $this->printStatus();
        }

        if (! config('catalog.enabled', true)) {
            $this->error('catalog.enabled is false — set CATALOG_IMPORT_ENABLED=true to run this.');

            return self::FAILURE;
        }

        if ($this->option('retry-failed')) {
            return $this->retryFailed();
        }

        $limit = (int) ($this->option('limit') ?: config('catalog.hydration.batch', 250));

        $ids = ExternalCatalogProduct::query()
            ->awaitingHydration((bool) $this->option('include-neutral'))
            ->limit($limit)
            ->pluck('id');

        if ($ids->isEmpty()) {
            // Not a failure. A scheduler hitting this every few minutes will find nothing far more
            // often than it finds work, and an empty window must not look like a broken import.
            $this->info('Nothing awaiting hydration.');

            if (! $this->option('include-neutral')) {
                $neutral = ExternalCatalogProduct::where('status', ExternalCatalogProduct::STATUS_DISCOVERED)->count();
                if ($neutral > 0) {
                    $this->line(sprintf(
                        '  %s rows are still undecided by the slug filter — pass --include-neutral to hydrate them.',
                        number_format($neutral),
                    ));
                }
            }

            return self::SUCCESS;
        }

        foreach ($ids as $id) {
            HydrateExternalProductJob::dispatch((int) $id);
        }

        $this->info(sprintf('Dispatched %s hydration job(s).', number_format($ids->count())));
        $this->line(sprintf(
            '  At the configured 0.5 req/s that is about %s minutes of work for the queue worker.',
            round($ids->count() * 2 / 60, 1),
        ));

        return self::SUCCESS;
    }

    /**
     * Give exhausted rows another chance — but only the ones that can benefit.
     *
     * A row that failed 404 is gone from iHerb and will be gone tomorrow; requeueing it burns a
     * request to learn the same thing. Only transient failures are reset, which is exactly why the
     * status code was written into `status_reason` rather than a bare "failed".
     */
    private function retryFailed(): int
    {
        $reset = ExternalCatalogProduct::where('status', ExternalCatalogProduct::STATUS_FAILED)
            ->where('status_reason', 'like', '%transient%')
            ->update([
                'status' => ExternalCatalogProduct::STATUS_QUEUED,
                'attempts' => 0,
                'status_reason' => null,
                'updated_at' => now(),
            ]);

        $permanent = ExternalCatalogProduct::where('status', ExternalCatalogProduct::STATUS_FAILED)->count();

        $this->info(sprintf('%s transient failure(s) returned to the queue.', number_format($reset)));
        $this->line(sprintf('  %s row(s) remain failed permanently (404/410/422) and were left alone.', number_format($permanent)));

        return self::SUCCESS;
    }

    /** Progress as counted rows. Never a percentage of something nobody measured. */
    private function printStatus(): int
    {
        $counts = ExternalCatalogProduct::query()
            ->selectRaw('status, COUNT(*) as n')
            ->groupBy('status')
            ->pluck('n', 'status');

        $total = $counts->sum();

        if ($total === 0) {
            $this->warn('The staging table is empty — run catalog:iherb:discover first.');

            return self::SUCCESS;
        }

        $order = [
            ExternalCatalogProduct::STATUS_QUEUED => 'awaiting hydration (name matched)',
            ExternalCatalogProduct::STATUS_DISCOVERED => 'awaiting hydration (undecided)',
            ExternalCatalogProduct::STATUS_HYDRATING => 'in flight',
            ExternalCatalogProduct::STATUS_HYDRATED => 'hydrated, awaiting promotion',
            ExternalCatalogProduct::STATUS_PROMOTED => 'promoted to a real product',
            ExternalCatalogProduct::STATUS_FILTERED_OUT => 'filtered out',
            ExternalCatalogProduct::STATUS_FAILED => 'failed',
        ];

        $rows = [];
        foreach ($order as $status => $label) {
            $n = (int) ($counts[$status] ?? 0);
            $rows[] = [$status, $label, number_format($n), sprintf('%.1f%%', $total > 0 ? $n / $total * 100 : 0)];
        }
        $rows[] = ['—', 'total staged', number_format($total), ''];

        $this->table(['status', 'meaning', 'rows', 'share'], $rows);

        // A row in `hydrating` for a long time means a worker died mid-fetch. Surfaced rather than
        // left to be discovered by someone wondering why the numbers stopped moving.
        $stuck = ExternalCatalogProduct::where('status', ExternalCatalogProduct::STATUS_HYDRATING)
            ->where('updated_at', '<', now()->subHour())
            ->count();

        if ($stuck > 0) {
            $this->warn(sprintf(
                '%s row(s) have been "hydrating" for over an hour — a worker probably died. '
                .'They are safe to reset to queued.',
                number_format($stuck),
            ));
        }

        return self::SUCCESS;
    }
}
