<?php

namespace App\Console\Commands;

use App\Jobs\SendSmsJob;
use App\Mail\ProtinasGiftReminderMail;
use App\Models\NotificationDelivery;
use App\Models\User;
use App\Services\OrderBudget;
use App\Services\PointsService;
use App\Services\ProtinaWalletService;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

/**
 * Remind customers that their gift Protinas expire soon (spec rule 20 + copy D6). Scheduled daily
 * at 10:15.
 *
 *   php artisan protinas:gift-reminders --dry-run   who would be reminded, writes and sends nothing
 *   php artisan protinas:gift-reminders             e-mail (+ SMS only with PROTINAS_SMS_REMINDERS=true)
 *
 * For every reminder day d in loyalty.gift.reminder_days (7 and 1): the gift lots that expire on the
 * calendar day today + d, grouped per customer. ONE message per customer and day, claimed BEFORE it
 * is sent in notification_deliveries under `email:gift-reminder:{lot}:{d}` (`sms:…` for the SMS,
 * through SmsService::sendOnce), lot = the customer's first lot of that day. A second run, or a
 * re-run after a crash, therefore never sends twice. A frozen or blocked gift is not advertised.
 */
class ProtinasGiftReminders extends Command
{
    protected $signature = 'protinas:gift-reminders {--dry-run : List who would be reminded, send nothing}';

    protected $description = 'E-mail (and optionally SMS) customers whose gift Protinas expire in 7 days or tomorrow';

    public function handle(ProtinaWalletService $wallets, OrderBudget $budget): int
    {
        $cols = PointsService::ledgerColumns();
        if (! $cols['bucket'] || ! $cols['remaining'] || ! $cols['expires_at']) {
            $this->warn('Protinas v3 columns are missing (run the migrations): no gift can expire.');

            return self::SUCCESS;
        }
        $dryRun = (bool) $this->option('dry-run');
        if (! $dryRun && ! Schema::hasTable('notification_deliveries')) {
            $this->error('notification_deliveries is missing: refusing to send without a de-duplication key.');

            return self::FAILURE;
        }

        $days = array_values(array_unique(array_filter(array_map('intval',
            (array) config('loyalty.gift.reminder_days', [7, 1])), fn (int $d) => $d > 0)));
        rsort($days);
        $smsOn = (bool) config('loyalty.gift.sms_reminders', false);
        $ppd = PointsService::pointsPerDt();
        $stats = ['customers' => 0, 'emails' => 0, 'already' => 0, 'no_email' => 0, 'blocked' => 0, 'sms' => 0, 'failed' => 0];

        foreach ($days as $d) {
            $from = now()->startOfDay()->addDays($d);
            $lots = $wallets->giftLotsExpiringBetween($from, (clone $from)->addDay());
            foreach ($lots->groupBy('user_id') as $userId => $userLots) {
                $user = User::find($userId);
                if (! $user) {
                    continue;
                }
                $wallet = $wallets->forUser($user);
                $points = min((int) $userLots->sum('remaining'), $wallet->gift);
                if ($points <= 0) {
                    continue;
                }
                if ($wallet->usableGift() <= 0) {
                    $stats['blocked']++; // frozen, in debt or unverified: telling them to spend it would be false

                    continue;
                }
                $stats['customers']++;
                $expiresAt = Carbon::parse($userLots->min('expires_at'));
                $key = 'gift-reminder:'.(int) $userLots->min('id').':'.$d;
                $fullFrom = $budget->giftFullFromDt($points);

                if ($dryRun) {
                    $this->line(sprintf('  J-%d  user #%d  %d Protinas (%s) expirent le %s%s', $d, $userId, $points,
                        ProtinasGiftReminderMail::amountLabel($points, $ppd), $expiresAt->format('d/m/Y'),
                        $smsOn ? ' · SMS' : ''));

                    continue;
                }

                $this->sendEmail($user, $key, new ProtinasGiftReminderMail($user, $points, $expiresAt, $d, $fullFrom), $stats);
                if ($smsOn && ! empty($user->phone_verified_at) && trim((string) $user->phone) !== '') {
                    SendSmsJob::dispatch((string) $user->phone, $this->smsText($points, $ppd, $expiresAt, $d, $fullFrom), 'sms:'.$key);
                    $stats['sms']++;
                }
            }
        }

        $this->info(sprintf('Reminder days: %s · customers: %d · e-mails sent: %d · already sent: %d · no e-mail: %d · gift not usable: %d · SMS queued: %d%s · failed: %d.',
            implode(', ', $days), $stats['customers'], $stats['emails'], $stats['already'], $stats['no_email'],
            $stats['blocked'], $stats['sms'], $smsOn ? '' : ' (SMS off: PROTINAS_SMS_REMINDERS=false)', $stats['failed']));
        if ($dryRun) {
            $this->comment('Dry run: nothing was sent or written.');
        }

        return $stats['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }

    /** Claim the e-mail in notification_deliveries, then send it. Never throws. */
    private function sendEmail(User $user, string $key, ProtinasGiftReminderMail $mail, array &$stats): void
    {
        $email = trim((string) $user->email);
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $stats['no_email']++;

            return;
        }
        $eventKey = 'email:'.$key;
        try {
            $delivery = NotificationDelivery::create([
                'event_key' => $eventKey,
                'channel' => 'email',
                'recipient_hash' => hash('sha256', strtolower($email)),
                'status' => 'sending',
                'attempts' => 1,
            ]);
        } catch (QueryException $e) {
            if (NotificationDelivery::where('event_key', $eventKey)->exists()) {
                $stats['already']++;

                return;
            }
            $stats['failed']++;
            $this->warn(sprintf('user #%d: could not claim %s: %s', $user->id, $eventKey, $e->getMessage()));

            return;
        }

        try {
            Mail::to($email)->send($mail);
            $delivery->forceFill(['status' => 'sent', 'sent_at' => now()])->save();
            $stats['emails']++;
        } catch (\Throwable $e) {
            $delivery->forceFill(['status' => 'failed', 'last_error' => mb_substr($e->getMessage(), 0, 2000)])->save();
            $stats['failed']++;
            $this->warn(sprintf('user #%d: e-mail failed: %s', $user->id, $e->getMessage()));
        }
    }

    /** D6 SMS copy, GSM-7 (no accents). */
    private function smsText(int $points, int $ppd, Carbon $expiresAt, int $daysLeft, ?int $fullFrom): string
    {
        $amount = ProtinasGiftReminderMail::amountLabel($points, $ppd);
        if ($daysLeft <= 1) {
            return 'protein.tn : dernier jour pour vos '.$amount.' offerts ('.$points.' Protinas). protein.tn';
        }

        return 'protein.tn : vos '.$amount.' offerts expirent le '.$expiresAt->format('d/m').'.'
            .($fullFrom ? ' En entier des '.$fullFrom.' DT d\'articles, ils reglent aussi la livraison : protein.tn'
                : ' Ils reglent aussi la livraison : protein.tn');
    }
}
