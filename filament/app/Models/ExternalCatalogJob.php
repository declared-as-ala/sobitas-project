<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One import run — the observability and control surface, not the resume mechanism.
 *
 * Resume lives on `external_catalog_products.status` (see that model). What lives HERE is what a
 * human needs in order to trust a long-running job: what is running, how far it got, what failed and
 * why, and a flag it checks between batches so it can be paused without being killed.
 *
 * The counters exist so progress is MEASURED. "12,847 of 28,430" has to be a fact read from rows,
 * because a progress bar that animates while nothing happens is how a failed import gets reported as
 * a successful one — this project has been bitten by exactly that shape of lie before.
 */
class ExternalCatalogJob extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_DISCOVERING = 'discovering';
    public const STATUS_RUNNING = 'running';
    public const STATUS_PAUSED = 'paused';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    /** Keep the job row small enough to read in the admin; per-row detail lives on the product. */
    private const MAX_RECORDED_ERRORS = 25;

    protected $table = 'external_catalog_jobs';

    protected $guarded = ['id'];

    protected $casts = [
        'errors' => 'array',
        'options' => 'array',
        'started_at' => 'datetime',
        'heartbeat_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public static function start(string $kind, array $options = [], string $provider = 'iherb'): self
    {
        return self::create([
            'provider' => $provider,
            'kind' => $kind,
            'status' => self::STATUS_RUNNING,
            'options' => $options,
            'started_at' => now(),
            'heartbeat_at' => now(),
        ]);
    }

    /**
     * Bump counters and prove the worker is alive in one write.
     *
     * A heartbeat that only updates on success would make a job stuck retrying look identical to a
     * job whose worker died.
     */
    public function progress(array $increments): void
    {
        foreach ($increments as $column => $amount) {
            $this->increment($column, $amount);
        }

        $this->forceFill(['heartbeat_at' => now()])->save();
    }

    public function recordError(string $context, string $message): void
    {
        $errors = $this->errors ?? [];
        $errors[] = ['at' => now()->toIso8601String(), 'context' => $context, 'message' => $message];

        $this->forceFill([
            'errors' => array_slice($errors, -self::MAX_RECORDED_ERRORS),
            'heartbeat_at' => now(),
        ])->save();
    }

    public function finish(string $status = self::STATUS_COMPLETED): void
    {
        $this->forceFill(['status' => $status, 'completed_at' => now()])->save();
    }

    /**
     * Re-read the flag from the database rather than trusting the in-memory model.
     *
     * The whole point is that somebody ELSE — an admin clicking pause — changed it while this
     * process was mid-run, so the copy loaded at start-up is exactly the wrong thing to consult.
     */
    public function shouldStop(): bool
    {
        $status = self::whereKey($this->getKey())->value('status');

        return in_array($status, [self::STATUS_PAUSED, self::STATUS_CANCELLED], true);
    }
}
