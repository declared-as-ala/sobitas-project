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
                            {--reset-stuck= : Return rows stuck in `hydrating` for N+ minutes to the queue}
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

        if ($this->option('reset-stuck') !== null) {
            return $this->resetStuck((int) $this->option('reset-stuck'));
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

        // The rate is READ from the same policy the fetcher obeys, never written into the
        // arithmetic. This line said "at the configured 0.5 req/s" with 2 seconds hardcoded into
        // the maths, while config/enrichment.php declared iherb.com TWICE and PHP kept the second
        // entry at 0.2 — so the printed estimate was wrong by 2.5x, in a command an operator uses
        // to decide whether to wait or go to lunch. Same defect, same day, in two commands.
        $rps = (float) (app(\App\Services\Enrichment\PoliteFetcher::class)->policy('iherb.com')['rps']
            ?? config('enrichment.fetch.default_requests_per_second', 0.33));

        if ($rps > 0) {
            $this->line(sprintf(
                '  At the configured %s req/s that is about %s minutes of work for the queue worker.',
                rtrim(rtrim(number_format($rps, 2, '.', ''), '0'), '.'),
                round($ids->count() / $rps / 60, 1),
            ));
        }

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

    /**
     * Reclaim rows that were claimed by a worker that then died.
     *
     * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────
     * claim() moves a row to `hydrating` so no second worker takes it, which is correct and is
     * exactly what makes a crash between the claim and the write unrecoverable: the row is no
     * longer selected by awaitingHydration(), so no future run ever picks it up.
     *
     * The job's failed() handler covers crashes Laravel can see. It cannot cover a FATAL error
     * raised while the class is still loading — which is precisely what happened on 10/08/2026,
     * when a static method named `observe()` on an Eloquent model collided with
     * Model::observe() and killed every job at the class-load boundary. 500 jobs produced 0
     * hydrated rows, 0 failures, and a growing pile of rows nothing would ever look at again.
     *
     * A minutes threshold rather than a flag, because "stuck" is a question about TIME: a row
     * legitimately in flight is seconds old, and one untouched for ten minutes is not in flight.
     * The default is deliberately not zero — resetting a row a live worker is mid-fetch on would
     * hand the same product to two workers.
     */
    private function resetStuck(int $minutes): int
    {
        $minutes = max(1, $minutes);

        $reset = ExternalCatalogProduct::where('status', ExternalCatalogProduct::STATUS_HYDRATING)
            ->where('updated_at', '<', now()->subMinutes($minutes))
            ->update([
                'status' => ExternalCatalogProduct::STATUS_QUEUED,
                'status_reason' => 'reclaimed: worker died mid-fetch',
                'updated_at' => now(),
            ]);

        $this->info(sprintf(
            '%s row(s) stuck in "hydrating" for over %d minute(s) returned to the queue.',
            number_format($reset),
            $minutes,
        ));

        $stillInFlight = ExternalCatalogProduct::where('status', ExternalCatalogProduct::STATUS_HYDRATING)->count();
        $this->line(sprintf('  %s row(s) remain in flight and were left alone.', number_format($stillInFlight)));

        return self::SUCCESS;
    }

    /**
     * When will this finish, and is it actually running at the rate it was configured to run at?
     *
     * ── WHY AN ETA IS WORTH COMPUTING AND A PROGRESS BAR IS NOT ───────────────────────────
     * The status table above is honest but it cannot answer the only question anybody asks of a
     * long import: is it going to be done tonight or on Thursday. Two numbers decide that — the
     * rate PoliteFetcher enforces and how much of each scheduler window the dispatched batch
     * actually fills — and both are read here from the SAME places the running system reads them,
     * never from a literal in this file.
     *
     * That second number is the one that hid a 3.4x slowdown for a day. routes/console.php refills
     * the window every ten minutes; a batch covering only 167 seconds of that leaves the worker
     * idle for the remaining 433, and nothing in a row count can show it. `$perWindow` below is
     * `min(rate, batch / window)`, which is the throughput the import will really sustain, and the
     * line is printed loudly when the two disagree.
     *
     * @param  \Illuminate\Support\Collection<string, int>  $counts
     */
    private function printThroughput($counts): void
    {
        $remaining = (int) ($counts[ExternalCatalogProduct::STATUS_QUEUED] ?? 0)
            + (int) ($counts[ExternalCatalogProduct::STATUS_DISCOVERED] ?? 0);

        if ($remaining === 0) {
            $this->info('Nothing left to hydrate. Next step: php artisan catalog:iherb:promote --report');

            return;
        }

        $rps = (float) (app(\App\Services\Enrichment\PoliteFetcher::class)->policy('iherb.com')['rps']
            ?? config('enrichment.fetch.default_requests_per_second', 0.33));

        $batch = (int) config('catalog.hydration.batch', 250);
        $window = max(1, (int) config('catalog.hydration.window_seconds', 600));

        // What the schedule can actually deliver: a window is capped by the rate AND by how many
        // rows were put in it. Whichever is smaller is the truth.
        $perWindow = min($rps, $batch / $window);

        if ($perWindow <= 0) {
            return;
        }

        $hours = $remaining / $perWindow / 3600;

        $this->line(sprintf(
            '  %s row(s) left · %s req/s sustained · about %s to go (finishing around %s).',
            number_format($remaining),
            rtrim(rtrim(number_format($perWindow, 2, '.', ''), '0'), '.'),
            $hours < 1
                ? round($hours * 60).' minutes'
                : round($hours, 1).' hours',
            now()->addSeconds((int) ($hours * 3600))->format('D H:i'),
        ));

        // The batch is derived from the rate in config/catalog.php, so this should never fire. It is
        // here because it DID fire for a day: an explicit CATALOG_HYDRATE_BATCH in the VPS .env
        // overrides the derivation, and an override that silently throttles the import to a third of
        // its configured rate must announce itself rather than be inferred from a finish date.
        if ($perWindow < $rps * 0.95) {
            $this->warn(sprintf(
                'The queue worker is idle most of every window: the batch (%s rows) covers only %ds of '
                .'a %ds schedule at %s req/s, so the import runs at %s req/s instead. '
                .'Raise CATALOG_HYDRATE_BATCH to %s (or unset it and let config/catalog.php derive it).',
                number_format($batch),
                (int) round($batch / $rps),
                $window,
                rtrim(rtrim(number_format($rps, 2, '.', ''), '0'), '.'),
                rtrim(rtrim(number_format($perWindow, 2, '.', ''), '0'), '.'),
                number_format((int) ceil($rps * $window)),
            ));
        }
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

        $this->printThroughput($counts);

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
