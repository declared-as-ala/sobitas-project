<?php

namespace App\Jobs;

use App\Mail\OrderConfirmedAdminMail;
use App\Mail\OrderConfirmedCustomerMail;
use App\Models\Commande;
use App\Models\NotificationDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use InvalidArgumentException;

class SendOrderConfirmationEmailJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 4;

    /** @var array<int, int> */
    public array $backoff = [15, 60, 300];

    public function __construct(
        public int $commandeId,
        public string $recipientEmail,
        public string $audience,
    ) {}

    public function handle(): void
    {
        $recipient = strtolower(trim($this->recipientEmail));
        if (! filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Invalid order confirmation recipient.');
        }
        if (! in_array($this->audience, ['customer', 'admin'], true)) {
            throw new InvalidArgumentException('Invalid order confirmation audience.');
        }

        $eventKey = sprintf(
            'email:order:%d:confirmation:%s:%s',
            $this->commandeId,
            $this->audience,
            hash('sha256', $recipient)
        );
        $delivery = $this->claim($eventKey, $recipient);
        if (! $delivery) {
            return;
        }

        try {
            $commande = Commande::with('details.product')->findOrFail($this->commandeId);
            $mailable = $this->audience === 'admin'
                ? new OrderConfirmedAdminMail($commande)
                : new OrderConfirmedCustomerMail($commande);

            Mail::to($recipient)->send($mailable);
            $delivery->forceFill(['status' => 'sent', 'sent_at' => now(), 'last_error' => null])->save();

            Log::info('Order confirmation email sent', [
                'commande_id' => $this->commandeId,
                'audience' => $this->audience,
                'recipient_hash' => hash('sha256', $recipient),
            ]);
        } catch (\Throwable $e) {
            $delivery->forceFill([
                'status' => 'failed',
                'last_error' => mb_substr($e->getMessage(), 0, 2000),
            ])->save();

            throw $e;
        }
    }

    private function claim(string $eventKey, string $recipient): ?NotificationDelivery
    {
        try {
            return NotificationDelivery::create([
                'event_key' => $eventKey,
                'channel' => 'email',
                'recipient_hash' => hash('sha256', $recipient),
                'status' => 'sending',
                'attempts' => 1,
            ]);
        } catch (QueryException $e) {
            $delivery = DB::transaction(function () use ($eventKey): ?NotificationDelivery {
                $existing = NotificationDelivery::where('event_key', $eventKey)->lockForUpdate()->first();
                if (! $existing) {
                    return null;
                }
                if ($existing->status === 'sent') {
                    return null;
                }
                if ($existing->status === 'sending' && $existing->updated_at?->gt(now()->subMinutes(10))) {
                    return null;
                }

                $existing->forceFill([
                    'status' => 'sending',
                    'attempts' => ((int) $existing->attempts) + 1,
                    'last_error' => null,
                ])->save();

                return $existing;
            });

            if ($delivery || NotificationDelivery::where('event_key', $eventKey)->exists()) {
                return $delivery;
            }

            throw $e;
        }
    }
}
