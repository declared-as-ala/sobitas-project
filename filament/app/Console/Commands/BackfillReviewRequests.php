<?php

namespace App\Console\Commands;

use App\Mail\ReviewRequestMail;
use App\Models\Commande;
use App\Services\PointsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

/**
 * One-off / periodic backfill of the post-delivery "leave a review" email.
 *
 * The automatic request only fires when an order TRANSITIONS to a delivered
 * status (App\Observers\CommandeObserver), so every order delivered before that
 * feature shipped never got one. Those past customers are the fastest legitimate
 * source of real reviews — and reviews are what unlock the aggregateRating
 * (star) rich result in Google, which products currently lack.
 *
 * Safety (this sends mail to REAL customers):
 *   - --dry-run  : count + preview only, sends nothing. ALWAYS run this first.
 *   - --limit    : hard cap per run (default 25) so sends stay in small batches
 *                  and never look like a blast to spam filters.
 *   - --days     : only orders delivered recently enough for a review to make
 *                  sense (default 180). Asking about a 2-year-old order is odd.
 *   - --sleep    : seconds between sends (default 2) to respect SMTP limits.
 *   - Idempotent : review_request_sent_at is stamped per order, so an order can
 *                  never receive two requests, even across repeated runs.
 *   - Honours the reviews.request_emails_enabled kill-switch.
 *
 * Usage:
 *   php artisan reviews:backfill-requests --dry-run
 *   php artisan reviews:backfill-requests --limit=25
 */
class BackfillReviewRequests extends Command
{
    protected $signature = 'reviews:backfill-requests
                            {--days=180 : Only orders delivered within this many days}
                            {--limit=25 : Maximum emails to send in this run}
                            {--sleep=2 : Seconds to pause between sends}
                            {--dry-run : Report what would be sent without sending}';

    protected $description = 'Send the post-delivery review-request email to past delivered orders that never received one';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $days   = max(1, (int) $this->option('days'));
        $limit  = max(1, (int) $this->option('limit'));
        $sleep  = max(0, (int) $this->option('sleep'));

        if (! $dryRun && ! (bool) config('reviews.request_emails_enabled', true)) {
            $this->error('reviews.request_emails_enabled is false — aborting. Set REVIEW_REQUEST_EMAILS_ENABLED=true to send.');

            return self::FAILURE;
        }

        if (! Schema::hasColumn('commandes', 'review_request_sent_at')) {
            $this->error('commandes.review_request_sent_at is missing — run migrations first.');

            return self::FAILURE;
        }

        $candidates = Commande::query()
            ->whereIn('etat', PointsService::DELIVERED_STATUSES)
            ->whereNull('review_request_sent_at')
            ->whereNotNull('order_token')
            ->where('order_token', '!=', '')
            ->where('created_at', '>=', now()->subDays($days))
            ->orderByDesc('created_at')
            ->get();

        // Only rows with a usable address are actually sendable.
        $sendable = $candidates->filter(fn (Commande $c) => $this->emailFor($c) !== null)->values();

        $this->info(sprintf(
            'Delivered orders in the last %d days with no review request: %d (of which %d have a valid email).',
            $days,
            $candidates->count(),
            $sendable->count()
        ));

        if ($sendable->isEmpty()) {
            $this->line('Nothing to do.');

            return self::SUCCESS;
        }

        $batch = $sendable->take($limit);

        if ($dryRun) {
            $this->warn(sprintf('DRY RUN — nothing sent. Would email the first %d:', $batch->count()));
            foreach ($batch as $c) {
                $this->line(sprintf('  #%s  %s  %s', $c->numero ?? $c->id, $c->created_at?->format('Y-m-d'), $this->mask($this->emailFor($c))));
            }
            $this->newLine();
            $this->info(sprintf('Run without --dry-run to send (remaining after this batch: %d).', max(0, $sendable->count() - $batch->count())));

            return self::SUCCESS;
        }

        $sent = 0;
        $failed = 0;
        $bar = $this->output->createProgressBar($batch->count());
        $bar->start();

        foreach ($batch as $commande) {
            $email = $this->emailFor($commande);
            try {
                Mail::to($email)->send(new ReviewRequestMail($commande));
                // saveQuietly so this write does not re-fire observer events.
                $commande->forceFill(['review_request_sent_at' => now()])->saveQuietly();
                $sent++;
            } catch (\Throwable $e) {
                $failed++;
                Log::error('Review-request backfill send failed', [
                    'commande_id' => $commande->id,
                    'error'       => $e->getMessage(),
                ]);
            }
            $bar->advance();
            if ($sleep > 0) {
                sleep($sleep);
            }
        }

        $bar->finish();
        $this->newLine(2);
        $this->info(sprintf('Sent: %d   Failed: %d   Remaining: %d', $sent, $failed, max(0, $sendable->count() - $sent)));

        return self::SUCCESS;
    }

    /** Valid delivery/billing email for the order, or null when unusable. */
    private function emailFor(Commande $commande): ?string
    {
        $email = $commande->livraison_email ?? $commande->email;
        $email = is_string($email) ? trim($email) : '';

        return ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) ? $email : null;
    }

    /** Mask an address for console output (never print full customer emails). */
    private function mask(?string $email): string
    {
        if (! $email) {
            return '—';
        }
        [$user, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $keep = mb_substr($user, 0, 2);

        return $keep . str_repeat('*', max(1, mb_strlen($user) - 2)) . '@' . $domain;
    }
}
