<?php

namespace App\Jobs;

use App\Models\Commande;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendWhatsAppConfirmationJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    // One attempt only: a WhatsApp send may already have gone through when the HTTP call times out,
    // so an automatic retry risks a duplicate message. The `whatsapp_confirmation_sent_at` stamp is
    // the real idempotency boundary.
    public int $tries = 1;

    public function __construct(
        public int $commandeId,
        public bool $force = false,
    ) {}

    public function handle(WhatsAppService $whatsapp): void
    {
        if (! $whatsapp->enabled()) {
            return;
        }

        $order = Commande::find($this->commandeId);
        if (! $order) {
            return;
        }

        // Idempotent: never message a customer twice for the same order unless a human forced it.
        if (! $this->force && $order->whatsapp_confirmation_sent_at !== null) {
            return;
        }

        $result = $whatsapp->sendOrderConfirmation($order);

        if ($result['ok']) {
            $order->forceFill(['whatsapp_confirmation_sent_at' => now()])->save();
        } else {
            Log::channel('daily')->warning('WhatsApp confirmation not sent', [
                'commande_id' => $order->id,
                'reason'      => $result['message'],
            ]);
        }
    }
}
