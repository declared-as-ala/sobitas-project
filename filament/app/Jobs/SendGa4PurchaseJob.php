<?php

namespace App\Jobs;

use App\Models\Commande;
use App\Models\NotificationDelivery;
use App\Services\Analytics\Ga4MeasurementProtocol;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Sends one order's GA4 `purchase` through the Measurement Protocol, at most once.
 *
 * The once-only boundary is the notification_deliveries ledger (event_key `ga4:purchase:{id}`, or
 * `ga4:purchase-debug:{id}` for a debug validation run), the same claim pattern as
 * SendOrderConfirmationEmailJob: a second run, a duplicate dispatch or a concurrent worker finds the
 * row and sends nothing.
 *
 * THE SECRET NEVER LEAVES THIS CLASS: the request URL carries the API secret in its query string, so
 * it is never logged, and every error message is redacted before it is stored or rethrown (a
 * connection error's message usually quotes the URL, and the queue would record it).
 */
class SendGa4PurchaseJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [30, 120];

    public function __construct(
        public int $commandeId,
        public string $clientId,
        public ?string $sessionId = null,
        // Pinned at dispatch (Ga4MeasurementProtocol::maybeQueuePurchase); null = read the config now.
        public ?bool $debug = null,
    ) {}

    public function handle(Ga4MeasurementProtocol $ga4): void
    {
        if (! $ga4->enabled()) {
            return;
        }

        $commande = Commande::find($this->commandeId);
        if (! $commande) {
            return;
        }

        $debug = $this->debug ?? $ga4->debug();

        // A debug validation claims its own key, so it never blocks the order's real send later.
        $delivery = $this->claim(Ga4MeasurementProtocol::ledgerKey((int) $commande->id, $debug), $this->clientId);
        if (! $delivery) {
            return; // already sent, or another worker is sending it right now
        }

        try {
            $payload = $ga4->purchasePayload($commande, $this->clientId, $this->sessionId);

            $response = Http::connectTimeout(3)
                ->timeout(5)
                ->acceptJson()
                ->asJson()
                ->post($ga4->collectUrl($debug), $payload);

            if (! $response->successful()) {
                throw new RuntimeException('GA4 Measurement Protocol answered HTTP '.$response->status().'.');
            }

            if ($debug) {
                // The validation endpoint records nothing; it only says what GA4 would have rejected.
                Log::info('GA4 Measurement Protocol debug validation', [
                    'commande_id' => $commande->id,
                    'validation_messages' => $response->json('validationMessages', []),
                ]);
            }

            $delivery->forceFill([
                'status' => 'sent',
                'sent_at' => now(),
                'last_error' => null,
                'provider_reference' => $debug ? 'debug-validation' : null,
            ])->save();

            Log::info('GA4 purchase sent', [
                'commande_id' => $commande->id,
                'debug' => $debug,
            ]);
        } catch (\Throwable $e) {
            $message = $ga4->redact(get_class($e).': '.$e->getMessage());

            $delivery->forceFill([
                'status' => 'failed',
                'last_error' => mb_substr($message, 0, 2000),
            ])->save();

            // Rethrown so the queue retries — as a fresh exception WITHOUT the original as `previous`,
            // because the queue stores the whole chain and the original may quote the URL (the secret).
            throw new RuntimeException($message);
        }
    }

    private function claim(string $eventKey, string $clientId): ?NotificationDelivery
    {
        try {
            return NotificationDelivery::create([
                'event_key' => $eventKey,
                'channel' => 'ga4',
                'recipient_hash' => hash('sha256', $clientId),
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
