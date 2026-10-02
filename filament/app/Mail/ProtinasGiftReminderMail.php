<?php

namespace App\Mail;

use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * « Vos 15 DT vous attendent encore 7 jours » — gift Protinas about to expire (spec D6).
 * Sent by `protinas:gift-reminders` (daily 10:15), once per gift lot and reminder day: the command
 * claims `email:gift-reminder:{lot}:{days}` in notification_deliveries before sending.
 * Earned Protinas never expire and are never mentioned here.
 */
class ProtinasGiftReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public int $points,
        public CarbonInterface $expiresAt,
        public int $daysLeft,
        public ?int $fullFromDt = null,
    ) {
    }

    /** « 15 DT » for a whole amount, « 15,500 DT » otherwise. */
    public static function amountLabel(int $points, int $pointsPerDt): string
    {
        $millimes = intdiv(max(0, $points) * 1000, max(1, $pointsPerDt));

        return $millimes % 1000 === 0
            ? intdiv($millimes, 1000).' DT'
            : number_format($millimes / 1000, 3, ',', ' ').' DT';
    }

    public function build(): static
    {
        $amount = self::amountLabel($this->points, \App\Services\PointsService::pointsPerDt());
        $subject = $this->daysLeft <= 1
            ? 'Dernier jour pour vos '.$amount
            : 'Vos '.$amount.' vous attendent encore '.$this->daysLeft.' jours';

        $contact = \App\Models\Coordinate::getCached();
        $replyTo = ($contact && ! empty($contact->email)) ? $contact->email : 'contact@protein.tn';

        return $this
            ->subject($subject)
            ->replyTo($replyTo, 'Protein.tn')
            ->view('emails.protinas.gift-reminder', [
                'amount' => $amount,
                'shopUrl' => rtrim((string) config('app.frontend_url', config('app.url')), '/'),
            ]);
    }
}
