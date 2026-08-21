<?php

namespace App\Console\Commands;

use App\Jobs\SendSmsJob;
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
            $this->error('commandes.delivered_at cannot be read — run migrations first.');
            $this->line('Si les migrations sont à jour, cherchez « could not probe a column » dans le log Laravel :');
            $this->line('la colonne existe et c’est la base qui refuse la lecture pour une autre raison.');

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

        $smsEnabled = (bool) config('reviews.request_sms_enabled', false);
        $smsSent = 0;

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

            /*
             * The SMS is a SEPARATE try, deliberately, and it runs even when the email above
             * failed. They are two independent channels to the same person; letting an SMTP
             * timeout suppress the text message would mean one broken mail server costs this shop
             * every review it was going to get that day.
             *
             * It does not have its own "sent" marker either — `review_request_sent_at` is stamped
             * by the email branch and gates the whole order out of the next sweep, so the SMS is
             * asked for at most once per order for exactly the same reason.
             */
            if ($smsEnabled) {
                try {
                    if ($this->sendReviewSms($commande)) {
                        $smsSent++;
                    }
                } catch (\Throwable $e) {
                    Log::warning('Review-request SMS failed', [
                        'commande_id' => $commande->id,
                        'error'       => $e->getMessage(),
                    ]);
                }
            }

            if ($sleep > 0) {
                sleep($sleep);
            }
        }

        $summary = sprintf(
            'reviews:send-due-requests — sent %d, failed %d, still due %d%s',
            $sent,
            $failed,
            max(0, $sendable->count() - $sent),
            $smsEnabled ? sprintf(' (+%d SMS)', $smsSent) : ''
        );
        $this->info($summary);
        // Logged as well as printed: this runs unattended in the scheduler container, where
        // console output goes nowhere anyone reads.
        Log::info($summary);

        return self::SUCCESS;
    }

    /**
     * Can this command read `$table.$column`?
     *
     * ── THIS METHOD TURNED THE WHOLE FEATURE OFF FOR AS LONG AS IT EXISTED ──────────────────
     * It was `SHOW COLUMNS FROM \`{$table}\` LIKE ?` with the column BOUND as a parameter, and it
     * returned false for `commandes.delivered_at` on 21/08/2026 — on the same afternoon that
     * AramexTrackingSync wrote that exact column, successfully, on forty orders, with the values
     * visible in the production log. The column plainly exists.
     *
     * So `reviews:send-due-requests` exited at its first line — *"commandes.delivered_at is
     * missing — run migrations first."* — every single day at 10:00, and the `catch` turned the
     * database's explanation into `false` on the way past. The one occurrence of this query
     * elsewhere in the codebase (LoyaltyCard, `LIKE 'status'`) passes the column as a LITERAL and
     * works, which is the difference.
     *
     * ── SO IT NO LONGER ASKS A PROXY QUESTION ──────────────────────────────────────────────
     * Two metadata checks in a row have now voted "missing" on a column that exists: first
     * `Schema::hasColumn` (per the note that introduced this method), then this one. Rather than
     * replace it with a third way of asking the database about itself, this asks the question the
     * command actually has — *can I select this column?* — because a SELECT that touches it cannot
     * be wrong about whether it is there.
     *
     * `LIMIT 1` and no ordering, so the cost is one index-free row on a table of ~1,100.
     *
     * A genuine absence returns false, as before. Any OTHER database failure is logged with its
     * message instead of being silently rewritten as "the feature is off", which is the specific
     * behaviour that hid this for as long as it did.
     */
    private function hasColumn(string $table, string $column): bool
    {
        try {
            DB::table($table)->select($column)->limit(1)->get();

            return true;
        } catch (\Throwable $e) {
            $message = strtolower($e->getMessage());
            $missing = str_contains($message, '42s22') || str_contains($message, 'unknown column');

            if (! $missing) {
                Log::error('reviews:send-due-requests could not probe a column, and it is NOT a missing column', [
                    'table'  => $table,
                    'column' => $column,
                    'error'  => $e->getMessage(),
                ]);
            }

            return false;
        }
    }

    /**
     * The review request as a text message. Returns false when there is nothing sendable.
     *
     * ── WRITTEN TO FIT IN ONE SEGMENT, AND TO SOUND LIKE A PERSON ───────────────────────────
     * Owner, 20/08/2026: *"make the review message humanized."*
     *
     * Two constraints pull against each other here. A message that sounds human needs a greeting,
     * a reason and a sign-off; a message that costs one credit has 160 GSM-7 characters for all of
     * it INCLUDING the link. That is why the short `review_code` exists — at 34 characters for the
     * whole URL instead of 88, there is room left for a sentence.
     *
     * No emoji, no "!!", no "OFFRE": those are what a Tunisian phone user has learned to associate
     * with bulk marketing, and this message has to read as coming from the shop that just
     * delivered their parcel. The order number is in it for the same reason — it is the detail no
     * spammer would have.
     */
    private function sendReviewSms(Commande $commande): bool
    {
        $phone = trim((string) ($commande->livraison_phone ?? $commande->phone ?? ''));
        if ($phone === '') {
            return false;
        }

        // Backfill the short code for orders created before the column existed, rather than
        // falling back to the 64-character token and silently sending a 3-segment message.
        if (empty($commande->review_code)) {
            // `$this->hasColumn`, not Schema::hasColumn — see its docblock: Schema has twice
            // reported false for columns that exist on this database, which would silently turn
            // the SMS off rather than backfilling the code.
            if (! $this->hasColumn('commandes', 'review_code')) {
                return false;
            }
            $commande->forceFill(['review_code' => Commande::generateReviewCode()])->saveQuietly();
        }

        $base = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $url  = $base . '/avis/' . $commande->review_code;

        $prenom = trim((string) ($commande->livraison_prenom ?? $commande->prenom ?? ''));
        $hello  = $prenom !== '' ? "Bonjour {$prenom}," : 'Bonjour,';

        $text = "{$hello} votre commande #{$commande->numero} de Protein.tn est bien arrivee ?"
            . " Votre avis aiderait vraiment les prochains clients : {$url}"
            . ' Merci !';

        SendSmsJob::dispatch($phone, $text);

        return true;
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
