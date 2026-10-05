<?php

namespace App\Console\Commands;

use App\Jobs\SendSmsJob;
use App\Mail\ReviewRequestMail;
use App\Models\Commande;
use App\Services\PointsService;
use App\Services\SmsService;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
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
 * TWO PASSES SINCE 05/10/2026
 *   1. The first request, exactly as before.
 *   2. ONE reminder, to delivered orders whose first email went out `reviews.reminder_after_days`
 *      ago and that still have no linked review (see reminderPass()). Same daily cap, same
 *      --dry-run, stamped in `review_reminder_sent_at` so it can never go twice.
 *
 * Safety — this mails REAL customers:
 *   - Idempotent: review_request_sent_at / review_reminder_sent_at are stamped per order, so no
 *     order is ever asked more than once plus one reminder.
 *   - Windowed: only orders delivered between `delay` and `max_age` days ago (reminders: at most
 *     `reminder_max_age_days`). Turning this on can never quietly email the back catalogue — that
 *     stays behind reviews:backfill-requests, which is manual and has its own --dry-run.
 *   - Capped: request_daily_limit per run, shared by both passes, so sends read as transactional.
 *   - Honours the reviews.request_emails_enabled kill-switch (and reviews.reminder_enabled).
 *   - The SMS that rides along is skipped for the whole run when WinSMS reports a zero balance or
 *     cannot be reached, and nothing is stamped — see smsBalanceGate().
 *   - --dry-run prints the batch with masked addresses and sends nothing.
 */
class SendDueReviewRequests extends Command
{
    protected $signature = 'reviews:send-due-requests
                            {--limit= : Override the per-run cap (default: reviews.request_daily_limit)}
                            {--sleep=2 : Seconds to pause between sends}
                            {--dry-run : Report what would be sent without sending}';

    protected $description = 'Email the "leave a review" request to orders delivered long enough ago to be due, then one reminder';

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

        $used = 0;

        if ($delay === 0) {
            // The first request is sent inline by CommandeObserver on delivery. The reminder is
            // still this command's job, so the run continues to the second pass.
            $this->info('reviews.request_delay_days is 0 — the observer sends on delivery, nothing is due here.');
        } else {
            // Ask MySQL directly rather than Schema::hasColumn, which has twice reported false for
            // columns that exist on this database and silently turned guarded code into a no-op.
            if (! $this->hasColumn('commandes', 'delivered_at')) {
                $this->error('commandes.delivered_at cannot be read — run migrations first.');
                $this->line('Si les migrations sont à jour, cherchez « could not probe a column » dans le log Laravel :');
                $this->line('la colonne existe et c’est la base qui refuse la lecture pour une autre raison.');

                return self::FAILURE;
            }

            $used = $this->firstRequestPass($dryRun, $delay, $maxAge, $limit, $sleep);
        }

        $this->reminderPass($dryRun, max(0, $limit - $used), $sleep);

        return self::SUCCESS;
    }

    /**
     * The first review request. Returns how many orders it took out of the shared cap.
     */
    private function firstRequestPass(bool $dryRun, int $delay, int $maxAge, int $limit, int $sleep): int
    {
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
            ->when($this->canExcludeAffiliateDesk(), fn ($q) => $q->excludingAffiliateDesk())
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

            return 0;
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

        $smsEnabled = (bool) config('reviews.request_sms_enabled', false);

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

            if ($smsEnabled) {
                $gate = $this->smsBalanceGate();
                $this->line('WinSMS probe: ' . $this->describeGate($gate)
                    . ($gate['ok'] ? ' — the SMS that rides along would be queued.' : ' — the SMS that rides along would be SKIPPED for this run.'));
            }

            return $batch->count();
        }

        $sent = 0;
        $failed = 0;
        $smsSent = 0;
        $smsSkippedForBalance = false;

        /*
         * ── THE BALANCE GATE, ONCE PER RUN, BEFORE ANY SMS ──────────────────────────────────────
         * Measured 05/10/2026: the WinSMS balance was 0, and every review SMS was still dispatched
         * and its order still stamped `review_request_sms_sent_at`. The job then failed in the
         * worker, and the stamp kept the order out of every later run — the text was lost for good.
         * So the run asks WinSMS first. Zero or unreachable: no SMS is dispatched and nothing is
         * stamped, so the same orders are simply due again tomorrow, once the balance is topped up.
         */
        if ($smsEnabled) {
            $gate = $this->smsBalanceGate();
            if (! $gate['ok']) {
                $smsEnabled = false;
                $smsSkippedForBalance = true;
                Log::warning('Review SMS skipped: WinSMS balance is zero or unreachable', [
                    'balance' => $gate['balance'],
                    'error'   => $gate['error'],
                ]);
                $this->warn('Review SMS skipped for this run: ' . $this->describeGate($gate) . ' — nothing dispatched, nothing stamped.');
            }
        }

        foreach ($batch as $commande) {
            try {
                Mail::to($this->emailFor($commande))->send(new ReviewRequestMail($commande));
                // Quietly (no observer re-fire) and without moving updated_at (Commande::stampQuietly).
                $commande->stampQuietly(['review_request_sent_at' => now()]);
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
             * It stamps its OWN marker, `review_request_sms_sent_at`, and not because this sweep
             * needs one — `review_request_sent_at` already gates the order out of the next run.
             * The marker exists because `reviews:send-due-sms-requests` also exists: that command
             * reaches the orders with no email address, which this loop can never see (they are
             * filtered out of `$sendable` before the SMS branch is reached). Without a per-channel
             * marker the two paths would both consider an order untexted and buy the message
             * twice.
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
            $smsEnabled
                ? sprintf(' (+%d SMS)', $smsSent)
                : ($smsSkippedForBalance ? ' (SMS skipped: WinSMS balance zero or unreachable)' : '')
        );
        $this->info($summary);
        // Logged as well as printed: this runs unattended in the scheduler container, where
        // console output goes nowhere anyone reads.
        Log::info($summary);

        return $batch->count();
    }

    /**
     * ── THE ONE REMINDER ────────────────────────────────────────────────────────────────────
     * Measured 05/10/2026: zero attested reviews. A single email, sent once, with no follow-up, is
     * most of why. This pass sends ONE more, and only:
     *
     *   - to a DELIVERED order (same statuses as everything else here);
     *   - whose first email went out at least `reviews.reminder_after_days` days ago
     *     (`review_request_sent_at`, the column the first pass stamps);
     *   - that was never reminded (`review_reminder_sent_at` IS NULL);
     *   - with a real delivery clock: `delivered_at` set and at most `reminder_max_age_days` old.
     *     A legacy row that never stamped it is never reminded — its `updated_at` fallback moves
     *     with every write, so it cannot prove the delivery was « il y a quelques jours »;
     *   - that is not an affiliate-desk order (Commande::isAffiliateDeskOrder);
     *   - that has a usable email and an order_token (the link is built from it);
     *   - with NO review linked to the order at all. One reviewed product is an answer; reminding
     *     somebody who already replied is how a request turns into a nag.
     *
     * It shares the first pass's cap: whatever the first pass used today is not available here.
     * The marker is stamped only after the mailer accepted the message, exactly like the first one.
     */
    private function reminderPass(bool $dryRun, int $budget, int $sleep): void
    {
        if (! (bool) config('reviews.reminder_enabled', true)) {
            $this->line('Reminders: off (reviews.reminder_enabled = false).');

            return;
        }

        // `$this->hasColumn`, not Schema::hasColumn — see its docblock.
        foreach ([['commandes', 'review_reminder_sent_at'], ['commandes', 'review_request_sent_at'], ['reviews', 'commande_id']] as [$table, $column]) {
            if (! $this->hasColumn($table, $column)) {
                $this->warn("Reminders skipped: {$table}.{$column} cannot be read — run migrations first.");

                return;
            }
        }

        $afterDays = max(1, (int) config('reviews.reminder_after_days', 5));
        $maxAge    = max(1, (int) config('reviews.reminder_max_age_days', 45));
        $cutoff    = now()->subDays($maxAge);

        if (! $this->hasColumn('commandes', 'delivered_at')) {
            $this->warn('Reminders skipped: commandes.delivered_at cannot be read — run migrations first.');

            return;
        }

        /** @var Collection<int, Commande> $due */
        $due = Commande::query()
            ->whereIn('etat', PointsService::DELIVERED_STATUSES)
            ->whereNotNull('review_request_sent_at')
            ->where('review_request_sent_at', '<=', now()->subDays($afterDays))
            ->whereNull('review_reminder_sent_at')
            ->whereNotNull('order_token')
            ->where('order_token', '!=', '')
            ->whereNotNull('delivered_at')
            ->where('delivered_at', '>=', $cutoff)
            ->whereNotExists(function ($q): void {
                $q->select(DB::raw(1))
                    ->from('reviews')
                    ->whereColumn('reviews.commande_id', 'commandes.id');
            })
            ->when($this->canExcludeAffiliateDesk(), fn ($q) => $q->excludingAffiliateDesk())
            ->orderBy('review_request_sent_at')
            ->get();
        $sendable = $due->filter(fn (Commande $c) => $this->emailFor($c) !== null)->values();

        $this->info(sprintf(
            'Reminders: first email ≥ %d days ago, delivered ≤ %d days ago, no review yet: %d (%d with a usable email); %d left under today’s cap.',
            $afterDays,
            $maxAge,
            $due->count(),
            $sendable->count(),
            $budget
        ));

        if ($sendable->isEmpty()) {
            $this->line('Reminders: nothing due.');

            return;
        }

        if ($budget <= 0) {
            $this->warn(sprintf('Reminders: today’s cap is used up; %d reminder(s) wait for the next run.', $sendable->count()));

            return;
        }

        $batch = $sendable->take($budget);
        if ($sendable->count() > $batch->count()) {
            $this->warn(sprintf(
                'Reminders capped at %d; %d wait for the next run.',
                $batch->count(),
                $sendable->count() - $batch->count()
            ));
        }

        if ($dryRun) {
            $this->warn(sprintf('DRY RUN — no reminder sent. Would remind %d:', $batch->count()));
            foreach ($batch as $c) {
                $this->line(sprintf(
                    '  #%s  first email %s  %s',
                    $c->numero ?? $c->id,
                    $this->formatDate($c->review_request_sent_at),
                    $this->mask($this->emailFor($c))
                ));
            }

            return;
        }

        $sent = 0;
        $failed = 0;

        foreach ($batch as $commande) {
            try {
                Mail::to($this->emailFor($commande))->send(new ReviewRequestMail($commande, reminder: true));
                // Stamped only after the mailer accepted it; quietly and without moving updated_at.
                $commande->stampQuietly(['review_reminder_sent_at' => now()]);
                $sent++;
            } catch (\Throwable $e) {
                $failed++;
                Log::error('Review reminder send failed', [
                    'commande_id' => $commande->id,
                    'error'       => $e->getMessage(),
                ]);
            }

            if ($sleep > 0) {
                sleep($sleep);
            }
        }

        $summary = sprintf(
            'reviews:send-due-requests reminders — sent %d, failed %d, still due %d',
            $sent,
            $failed,
            max(0, $sendable->count() - $sent)
        );
        $this->info($summary);
        Log::info($summary);
    }

    /**
     * Affiliate-desk orders are never asked for a review (Commande::isAffiliateDeskOrder). The
     * filter needs both columns; without them there is no affiliate desk to exclude.
     */
    private function canExcludeAffiliateDesk(): bool
    {
        return $this->hasColumn('commandes', 'affilie_id')
            && $this->hasColumn('commandes', 'checkout_idempotency_key');
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
            $missing = str_contains($message, '42s22') || str_contains($message, 'unknown column')
                || str_contains($message, 'no such column');

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
     * Ask WinSMS for the balance once, before any review SMS of this run.
     *
     * Skip (ok = false) when the probe throws (no key, HTTP error, refusal) or when it reports a
     * NUMERIC balance at or below zero. A null or non-numeric balance is a response format this
     * code does not understand — not evidence of an empty account — so the run proceeds.
     *
     * @return array{ok:bool, balance:mixed, license:mixed, error:?string}
     */
    private function smsBalanceGate(): array
    {
        try {
            $probe = app(SmsService::class)->probe();
        } catch (\Throwable $e) {
            // Redacted: a connection error quotes the request URL, api_key included (SmsService::redact).
            return ['ok' => false, 'balance' => null, 'license' => null, 'error' => SmsService::redact($e->getMessage())];
        }

        $balance = $probe['balance'] ?? null;
        $license = $probe['license'] ?? null;

        if (is_numeric($balance) && (float) $balance <= 0) {
            return ['ok' => false, 'balance' => $balance, 'license' => $license, 'error' => null];
        }

        return ['ok' => true, 'balance' => $balance, 'license' => $license, 'error' => null];
    }

    /** @param  array{ok:bool, balance:mixed, license:mixed, error:?string}  $gate */
    private function describeGate(array $gate): string
    {
        if ($gate['error'] !== null) {
            return 'unreachable (' . $gate['error'] . ')';
        }

        $balance = $gate['balance'] === null ? 'unknown' : (is_scalar($gate['balance']) ? (string) $gate['balance'] : json_encode($gate['balance']));
        $license = $gate['license'] === null ? '' : ', license ' . (is_scalar($gate['license']) ? (string) $gate['license'] : json_encode($gate['license']));

        return 'balance ' . $balance . $license;
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
     *
     * ── SAME IDEMPOTENCY KEY AS THE SMS-ONLY COMMAND (05/10/2026) ───────────────────────────
     * The job now carries `order:{id}:review-request-sms`, the key reviews:send-due-sms-requests
     * already used. SmsService::sendOnce claims it in notification_deliveries before contacting
     * WinSMS, so (a) the two senders can never buy the same message twice, and (b) a gateway
     * failure is recorded as a `failed` row that `reviews:send-due-sms-requests --retry-failed`
     * can find — before, a failure on this path left no trace at all.
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
            $commande->stampQuietly(['review_code' => Commande::generateReviewCode()]);
        }

        $base = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $url  = $base . '/avis/' . $commande->review_code;

        $text = "Protein.tn: votre commande #{$commande->numero} est bien arrivee?"
            . " Partagez votre avis pour aider nos clients: {$url}. Merci.";

        // Per-channel marker, checked and stamped only when the column is actually readable — on
        // an install where the migration has not run, the SMS-only command bails out anyway, so
        // there is nothing to collide with and this behaves exactly as it did before.
        $tracked = $this->hasColumn('commandes', 'review_request_sms_sent_at');
        if ($tracked && $commande->review_request_sms_sent_at) {
            return false; // already texted by reviews:send-due-sms-requests
        }

        SendSmsJob::dispatch($phone, $text, 'order:' . $commande->id . ':review-request-sms');

        if ($tracked) {
            // Quietly (no observer re-fire) and without moving updated_at (Commande::stampQuietly).
            $commande->stampQuietly(['review_request_sms_sent_at' => now()]);
        }

        return true;
    }

    /** Valid delivery/billing email for the order, or null when unusable. */
    private function emailFor(Commande $commande): ?string
    {
        $email = $commande->livraison_email ?? $commande->email;
        $email = is_string($email) ? trim($email) : '';

        return ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) ? $email : null;
    }

    /** `review_request_sent_at` is not cast on the model, so it may arrive as a string. */
    private function formatDate(mixed $value): string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        $value = trim((string) $value);

        return $value !== '' ? substr($value, 0, 10) : '?';
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
