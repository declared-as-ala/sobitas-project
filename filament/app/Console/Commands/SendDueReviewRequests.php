<?php

namespace App\Console\Commands;

use App\Mail\ReviewRequestMail;
use App\Models\Commande;
use App\Services\PointsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Send the post-delivery review request to orders that became DUE today.
 *
 * This is the routine path. It replaces the old send-on-status-change behaviour, which asked for
 * a review the instant an admin flipped the order to "livree" — i.e. about a product still in its
 * box. Owner asked for a couple of days' grace; config('reviews.request_delay_days') is the knob.
 *
 * WHY A DAILY SWEEP AND NOT A DELAYED QUEUE JOB
 * A `->delay(now()->addDays(3))` job is the obvious alternative and is worse here. It lives only
 * in Redis, so a flush, an eviction or a queue rename loses every pending request silently, and
 * there is no way to tell afterwards which customers were skipped. This sweep re-derives the due
 * set from the database on every run, so it is idempotent, self-healing, and a missed day simply
 * sends the next day instead of losing the request forever.
 *
 * Safety — this mails REAL customers:
 *   - Idempotent: review_request_sent_at is stamped per order, so no order is ever asked twice.
 *   - Windowed: only orders delivered between `delay` and `max_age` days ago. Turning this on can
 *     never quietly email the back catalogue — that stays behind reviews:backfill-requests, which
 *     is manual and has its own --dry-run.
 *   - Capped: request_daily_limit per run, so sends read as transactional, not as a blast.
 *   - Honours the reviews.request_emails_enabled kill-switch.
 *   - --dry-run prints the batch with masked addresses and sends nothing.
 */
class SendDueReviewRequests extends Command
{
    protected $signature = 'reviews:send-due-requests
                            {--limit= : Override the per-run cap (default: reviews.request_daily_limit)}
                            {--sleep=2 : Seconds to pause between sends}
                            {--dry-run : Report what would be sent without sending}';

    protected $description = 'Email the "leave a review" request to orders delivered long enough ago to be due';

    public function handle(): int
    {
        $dryRun  = (bool) $this->option('dry-run');
        $delay   = max(0, (int) config('reviews.request_delay_days', 3));
        $maxAge  = max($delay + 1, (int) config('reviews.request_max_age_days', 21));
        $limit   = max(1, (int) ($this->option('limit') ?: config('reviews.request_daily_limit', 40)));
        $sleep   = max(0, (int) $this->option('sleep'));

        if (! $dryRun && ! (bool) config('reviews.request_emails_enabled', true)) {
            $this->error('reviews.request_emails_enabled is false — aborting.');

            return self::FAILURE;
        }

        if ($delay === 0) {
            $this->info('reviews.request_delay_days is 0 — the observer sends on delivery, nothing is due here.');

            return self::SUCCESS;
        }

        // Ask MySQL directly rather than Schema::hasColumn, which has twice reported false for
        // columns that exist on this database and silently turned guarded code into a no-op.
        if (! $this->hasColumn('commandes', 'delivered_at')) {
            $this->error('commandes.delivered_at is missing — run migrations first.');

            return self::FAILURE;
        }

        $due = Commande::query()
            ->whereIn('etat', PointsService::DELIVERED_STATUSES)
            ->whereNull('review_request_sent_at')
            ->whereNotNull('order_token')
            ->where('order_token', '!=', '')
            ->whereNotNull('delivered_at')
            ->where('delivered_at', '<=', now()->subDays($delay))
            ->where('delivered_at', '>=', now()->subDays($maxAge))
            // Oldest first: the closest to falling out of the max-age window goes first, so a
            // backlog drains without anyone ageing out unasked.
            ->orderBy('delivered_at')
            ->get();

        $sendable = $due->filter(fn (Commande $c) => $this->emailFor($c) !== null)->values();

        $this->info(sprintf(
            'Delivered %d–%d days ago, never asked: %d (%d with a usable email).',
            $delay,
            $maxAge,
            $due->count(),
            $sendable->count()
        ));

        if ($sendable->isEmpty()) {
            $this->line('Nothing due.');

            return self::SUCCESS;
        }

        $batch = $sendable->take($limit);

        // Say out loud what this run is NOT covering. A cap that truncates silently reads as
        // "everyone was asked" in the log a week later.
        if ($sendable->count() > $batch->count()) {
            $this->warn(sprintf(
                'Capped at %d; %d due orders wait for the next run.',
                $batch->count(),
                $sendable->count() - $batch->count()
            ));
        }

        if ($dryRun) {
            $this->warn(sprintf('DRY RUN — nothing sent. Would email %d:', $batch->count()));
            foreach ($batch as $c) {
                $this->line(sprintf(
                    '  #%s  delivered %s  %s',
                    $c->numero ?? $c->id,
                    $c->delivered_at ? $c->delivered_at->format('Y-m-d') : '?',
                    $this->mask($this->emailFor($c))
                ));
            }

            return self::SUCCESS;
        }

        $sent = 0;
        $failed = 0;

        foreach ($batch as $commande) {
            try {
                Mail::to($this->emailFor($commande))->send(new ReviewRequestMail($commande));
                // saveQuietly so this write does not re-fire observer events.
                $commande->forceFill(['review_request_sent_at' => now()])->saveQuietly();
                $sent++;
            } catch (\Throwable $e) {
                $failed++;
                Log::error('Due review-request send failed', [
                    'commande_id' => $commande->id,
                    'error'       => $e->getMessage(),
                ]);
            }
            if ($sleep > 0) {
                sleep($sleep);
            }
        }

        $summary = sprintf('reviews:send-due-requests — sent %d, failed %d, still due %d', $sent, $failed, max(0, $sendable->count() - $sent));
        $this->info($summary);
        // Logged as well as printed: this runs unattended in the scheduler container, where
        // console output goes nowhere anyone reads.
        Log::info($summary);

        return self::SUCCESS;
    }

    private function hasColumn(string $table, string $column): bool
    {
        try {
            return ! empty(DB::select("SHOW COLUMNS FROM `{$table}` LIKE ?", [$column]));
        } catch (\Throwable $e) {
            return false;
        }
    }

    /** Valid delivery/billing email for the order, or null when unusable. */
    private function emailFor(Commande $commande): ?string
    {
        $email = $commande->livraison_email ?? $commande->email;
        $email = is_string($email) ? trim($email) : '';

        return ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) ? $email : null;
    }

    /** Mask an address for console output — never print full customer emails. */
    private function mask(?string $email): string
    {
        if (! $email) {
            return '—';
        }
        [$user, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return mb_substr($user, 0, 2) . str_repeat('*', max(1, mb_strlen($user) - 2)) . '@' . $domain;
    }
}
