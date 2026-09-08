<?php

namespace App\Console\Commands;

use App\Jobs\SendSmsJob;
use App\Models\Commande;
use App\Services\PointsService;
use App\Services\SmsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Send the post-delivery review request BY SMS to orders that are due for one.
 *
 * ── WHY THIS EXISTS ALONGSIDE reviews:send-due-requests ─────────────────────────────────────
 * The email sweep already carries a text message (see SendDueReviewRequests::sendReviewSms), but
 * it rides along INSIDE the email loop: the batch is `$sendable`, which is the due set filtered
 * down to orders with a valid email address. An order with no email is never in that collection,
 * so it never reaches the SMS branch either.
 *
 * That is not an edge case here, it is the majority. Measured on the live database on 08/09/2026:
 *
 *     Delivered 3–21 days ago, never asked: 3 (1 with a usable email).
 *
 * Two of three delivered customers are unreachable by the existing pipeline. This is a cash-on-
 * delivery shop: the phone number is the field that gets confirmed out loud before dispatch, the
 * email is the one left blank or mistyped. Email is the side channel here, not the main one.
 *
 * So this command takes the SAME due set — same statuses, same window, same token requirement —
 * drops the email filter, and requires a valid Tunisian mobile instead.
 *
 * Safety — this SENDS PAID MESSAGES to real customers:
 *   - OFF by default: honours reviews.request_sms_enabled (REVIEW_REQUEST_SMS_ENABLED), which is
 *     false unless someone sets it. Nothing goes out on deploy.
 *   - Idempotent twice over: `review_request_sms_sent_at` is stamped per order and gates the next
 *     run, and the dispatch carries the idempotency key `order:{id}:review-request-sms`, which
 *     SmsService::sendOnce claims in `notification_deliveries` (unique index on event_key) BEFORE
 *     contacting WinSMS. Two runs racing each other cannot buy the same message twice.
 *   - Windowed: only orders delivered between `reviews.request_delay_days` and
 *     `reviews.request_max_age_days` days ago, exactly like the email sweep. Turning this on can
 *     never text the back catalogue.
 *   - Capped and paced: --limit (25) and --sleep (2), so a run reads as transactional traffic.
 *   - Skips rather than guesses: a number that is not an 8-digit Tunisian mobile is reported and
 *     left alone. A wrong number is a credit spent on nobody.
 *   - --dry-run prints the batch with masked numbers, the exact message, its GSM-7 length, and
 *     sends nothing.
 *
 * Usage:
 *   php artisan reviews:send-due-sms-requests --dry-run
 *   php artisan reviews:send-due-sms-requests --limit=25
 */
class SendDueReviewRequestSms extends Command
{
    protected $signature = 'reviews:send-due-sms-requests
                            {--limit=25 : Maximum messages to send in this run}
                            {--sleep=2 : Seconds to pause between sends}
                            {--dry-run : Report what would be sent without sending}';

    protected $description = 'Text the "leave a review" request to delivered orders that have a mobile but no request yet';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $delay  = max(0, (int) config('reviews.request_delay_days', 3));
        $maxAge = max($delay + 1, (int) config('reviews.request_max_age_days', 21));
        $limit  = max(1, (int) $this->option('limit'));
        $sleep  = max(0, (int) $this->option('sleep'));

        if (! $dryRun && ! (bool) config('reviews.request_sms_enabled', false)) {
            $this->error('reviews.request_sms_enabled is false — aborting. Set REVIEW_REQUEST_SMS_ENABLED=true to send.');

            return self::FAILURE;
        }

        /*
         * Deliberately NOT mirroring the email sweep's `if ($delay === 0) return` bail-out.
         *
         * That bail-out is correct for email, because at delay 0 CommandeObserver mails the
         * request inline on delivery and the sweep would duplicate it. The observer sends NO SMS —
         * it never has — so bailing here would mean that setting the delay to 0 silently switches
         * the text message off entirely rather than making it immediate. At delay 0 the window
         * below simply starts at "now".
         */

        // Ask MySQL by SELECTing the column, not Schema::hasColumn — see the docblock on
        // SendDueReviewRequests::hasColumn: metadata checks have twice voted "missing" on columns
        // that exist on this database and turned the whole feature into a silent no-op.
        foreach (['delivered_at', 'review_request_sms_sent_at', 'review_code'] as $column) {
            if (! $this->hasColumn('commandes', $column)) {
                $this->error("commandes.{$column} cannot be read — run migrations first.");
                $this->line('Si les migrations sont à jour, cherchez « could not probe a column » dans le log Laravel :');
                $this->line('la colonne existe et c’est la base qui refuse la lecture pour une autre raison.');

                return self::FAILURE;
            }
        }

        // The eligibility query is a copy of SendDueReviewRequests', with one substitution:
        // review_request_sent_at -> review_request_sms_sent_at. Everything else must stay
        // identical, because "due for a review request" is one definition, not two.
        $due = Commande::query()
            ->whereIn('etat', PointsService::DELIVERED_STATUSES)
            ->whereNull('review_request_sms_sent_at')
            ->whereNotNull('order_token')
            ->where('order_token', '!=', '')
            ->whereNotNull('delivered_at')
            ->where('delivered_at', '<=', now()->subDays($delay))
            ->where('delivered_at', '>=', now()->subDays($maxAge))
            // Oldest first: the closest to falling out of the max-age window goes first, so a
            // backlog drains without anyone ageing out unasked.
            ->orderBy('delivered_at')
            ->get();

        $sendable = $due->filter(fn (Commande $c) => $this->mobileFor($c) !== null)->values();
        $unreachable = $due->count() - $sendable->count();

        $this->info(sprintf(
            'Delivered %d–%d days ago, never texted: %d (%d with a usable Tunisian mobile).',
            $delay,
            $maxAge,
            $due->count(),
            $sendable->count()
        ));

        // Name what is being dropped. A number that fails validation is usually a typo in the
        // order, i.e. something an admin can fix — but only if it is reported instead of skipped
        // in silence.
        if ($unreachable > 0) {
            $this->warn(sprintf('%d skipped: no phone, or not an 8-digit Tunisian mobile.', $unreachable));
            foreach ($due as $c) {
                if ($this->mobileFor($c) === null) {
                    $this->line(sprintf(
                        '  #%s  delivered %s  raw=%s',
                        $c->numero ?? $c->id,
                        $c->delivered_at ? $c->delivered_at->format('Y-m-d') : '?',
                        $this->maskRaw((string) ($c->livraison_phone ?? $c->phone ?? ''))
                    ));
                }
            }
        }

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
            $this->warn(sprintf('DRY RUN — nothing sent, nothing charged. Would text %d:', $batch->count()));
            foreach ($batch as $c) {
                // Built with the SAME review_code the real send would use, except that a missing
                // code is shown as a placeholder rather than generated: a dry run must not write.
                $text = $this->reviewSmsText($c, $c->review_code ?: '__nouveau__');
                $gsm7 = SmsService::toGsm7($text);
                $this->line(sprintf(
                    '  #%s  delivered %s  %s  %d chars / %d segment(s)',
                    $c->numero ?? $c->id,
                    $c->delivered_at ? $c->delivered_at->format('Y-m-d') : '?',
                    $this->mask($this->mobileFor($c)),
                    mb_strlen($gsm7),
                    max(1, (int) ceil(mb_strlen($gsm7) / 160))
                ));
                $this->line('      ' . $gsm7);
            }
            $this->newLine();
            $this->info(sprintf(
                'Run without --dry-run to send (needs REVIEW_REQUEST_SMS_ENABLED=true; remaining after this batch: %d).',
                max(0, $sendable->count() - $batch->count())
            ));

            return self::SUCCESS;
        }

        $sent = 0;
        $failed = 0;

        foreach ($batch as $commande) {
            try {
                $phone = $this->mobileFor($commande);
                if ($phone === null) {
                    continue; // re-checked here because the collection was built before the loop
                }

                // Backfill the short code for orders created before the column existed, rather
                // than falling back to the 64-character order_token and silently paying for a
                // 3-segment message. saveQuietly so this write does not re-fire observer events.
                if (empty($commande->review_code)) {
                    $commande->forceFill(['review_code' => Commande::generateReviewCode()])->saveQuietly();
                }

                // Queued, not sent inline: SendSmsJob is where WinSMS failures are already logged
                // and where `tries = 1` stops an ambiguous gateway timeout from billing twice.
                // The event key is the second idempotency boundary — SmsService::sendOnce claims
                // it in notification_deliveries before spending a credit.
                SendSmsJob::dispatch(
                    $phone,
                    $this->reviewSmsText($commande, (string) $commande->review_code),
                    'order:' . $commande->id . ':review-request-sms'
                );

                $commande->forceFill(['review_request_sms_sent_at' => now()])->saveQuietly();
                $sent++;
            } catch (\Throwable $e) {
                $failed++;
                Log::error('Due review-request SMS dispatch failed', [
                    'commande_id' => $commande->id,
                    'error'       => $e->getMessage(),
                ]);
            }

            if ($sleep > 0) {
                sleep($sleep);
            }
        }

        // "queued" and not "sent", deliberately: this loop hands the message to the queue, and the
        // worker is what talks to WinSMS. A green line here means the request left this command,
        // not that a phone rang — the delivery outcome is in notification_deliveries and the log.
        $summary = sprintf(
            'reviews:send-due-sms-requests — queued %d, failed %d, still due %d, unreachable %d',
            $sent,
            $failed,
            max(0, $sendable->count() - $sent),
            $unreachable
        );
        $this->info($summary);
        // Logged as well as printed: this is meant to run unattended, where console output goes
        // nowhere anyone reads.
        Log::info($summary);

        return self::SUCCESS;
    }

    /**
     * The review request as a text message.
     *
     * ── THE COPY IS A VERBATIM COPY, ON PURPOSE ─────────────────────────────────────────────
     * Identical to SendDueReviewRequests::sendReviewSms, because a customer with both an email and
     * a phone can be reached by either path and the two must not read as two different shops.
     * Owner's brief for the original, 20/08/2026: *"make the review message humanized."*
     *
     * It fits one segment: a GSM-7 segment is 160 characters INCLUDING the link, which is why the
     * short `review_code` exists (34 characters for the whole URL instead of 88 for the
     * order_token one the email uses). No emoji, no "!!", no "OFFRE" — those are what a Tunisian
     * phone user has learned to read as bulk marketing, and this has to look like it came from the
     * shop that just delivered their parcel. The order number is in it for the same reason: it is
     * the detail no spammer would have.
     */
    private function reviewSmsText(Commande $commande, string $reviewCode): string
    {
        $base   = rtrim((string) config('app.frontend_url', config('app.url')), '/');
        $url    = $base . '/avis/' . $reviewCode;
        $numero = trim((string) ($commande->numero ?? $commande->id));

        return "Protein.tn: votre commande #{$numero} est bien arrivee?"
            . " Partagez votre avis pour aider nos clients: {$url}. Merci.";
    }

    /**
     * The order's phone as WinSMS wants it (`216XXXXXXXX`), or null when it is not a mobile.
     *
     * ── WHY VALIDATE HERE AT ALL, GIVEN SmsService ALREADY DOES ─────────────────────────────
     * SmsService::normalizeTunisianPhone THROWS on a bad number, from inside the queue worker,
     * after this command has already stamped `review_request_sms_sent_at` and reported the order
     * as done. So a bad number would be recorded as asked, never asked again, and the failure
     * would only exist in a worker log. Validating up front turns that into a visible skip, and
     * the row stays eligible for the next run once someone fixes the number.
     *
     * That service is also LOOSER than this: it accepts any 8 digits, so `71234567` (a Tunis
     * landline) and `80100xxx` (a premium/toll line) both pass and both cost a credit to reach
     * nobody. `^[2459]\d{7}$` is the house rule for "Tunisian mobile" — it is what
     * PhoneVerificationService::normalize enforces on the storefront, and this deliberately uses
     * the same one so a number that can receive a verification code can receive this too. 3x is
     * excluded with the landlines: it is fixed-wireless/VoIP range, not a handset.
     *
     * Accepted input shapes, because the `commandes` table has all of them: `20 123 456`,
     * `+216 20-123-456`, `00216 20123456`, `216 20123456`, `(20) 123 456`. Anything else —
     * including the two-numbers-in-one-field pattern (`20123456 / 55123456`) — is ambiguous and
     * skipped rather than guessed at.
     */
    private function mobileFor(Commande $commande): ?string
    {
        $raw = trim((string) ($commande->livraison_phone ?? $commande->phone ?? ''));
        if ($raw === '') {
            return null;
        }

        $digits = (string) preg_replace('/\D/', '', $raw);

        if (str_starts_with($digits, '00216')) {
            $digits = substr($digits, 5);
        } elseif (strlen($digits) === 11 && str_starts_with($digits, '216')) {
            $digits = substr($digits, 3);
        }

        if (! preg_match('/^[2459]\d{7}$/', $digits)) {
            return null;
        }

        // Handed to the gateway already in international form. SmsService would prefix 216 itself,
        // but passing the finished number means this command and the worker cannot disagree about
        // which number was validated.
        return '216' . $digits;
    }

    /** Mask a validated number for console output — never print a full customer phone. */
    private function mask(?string $phone): string
    {
        if (! $phone) {
            return '—';
        }

        return '+216 ****' . substr($phone, -4);
    }

    /** Mask an UNVALIDATED field, whose length and shape are unknown, for the skip report. */
    private function maskRaw(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return '(vide)';
        }

        $digits = (string) preg_replace('/\D/', '', $raw);
        // Length is the useful signal when diagnosing a bad row (7 digits = truncated, 16 = two
        // numbers in one field), and it leaks nothing on its own.
        return sprintf('%d chiffres, finit par %s', strlen($digits), substr($digits, -2) ?: '??');
    }

    /**
     * Can this command read `$table.$column`?
     *
     * Lifted from SendDueReviewRequests::hasColumn — read its docblock before changing this. The
     * short version: `Schema::hasColumn` and `SHOW COLUMNS ... LIKE ?` have each reported false
     * for a column that demonstrably exists on this database, which turned the daily review sweep
     * into a no-op for as long as it was deployed. A SELECT that touches the column cannot be
     * wrong about whether it is there.
     *
     * A genuine absence returns false. Any OTHER failure is logged with its message rather than
     * being silently rewritten as "the feature is off".
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
                Log::error('reviews:send-due-sms-requests could not probe a column, and it is NOT a missing column', [
                    'table'  => $table,
                    'column' => $column,
                    'error'  => $e->getMessage(),
                ]);
            }

            return false;
        }
    }
}
