<?php

namespace App\Services;

use App\Jobs\SendOrderConfirmationEmailJob;
use App\Jobs\SendSmsJob;
use App\Models\Commande;
use Illuminate\Support\Facades\Log;

class OrderConfirmationDispatcher
{
    public function dispatch(int $commandeId): void
    {
        $commande = Commande::with('details.product:id,designation_fr')->findOrFail($commandeId);

        $this->dispatchSms($commande);

        $clientEmail = trim((string) ($commande->livraison_email ?: $commande->email));
        if (filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
            SendOrderConfirmationEmailJob::dispatch($commande->id, $clientEmail, 'customer');
        } else {
            Log::warning('Order customer email skipped: invalid or missing address', [
                'commande_id' => $commande->id,
            ]);
        }

        $adminEmails = array_values(array_unique(array_filter(
            (array) config('mail.admin_emails', []),
            static fn ($email): bool => filter_var($email, FILTER_VALIDATE_EMAIL) !== false
        )));

        if ($adminEmails === []) {
            Log::error('Order admin email skipped: ADMIN_EMAILS is not configured', [
                'commande_id' => $commande->id,
            ]);
        }

        foreach ($adminEmails as $adminEmail) {
            SendOrderConfirmationEmailJob::dispatch($commande->id, $adminEmail, 'admin');
        }
    }

    private function dispatchSms(Commande $commande): void
    {
        $phone = trim((string) ($commande->livraison_phone ?: $commande->phone));
        if ($phone === '') {
            return;
        }

        $sms = TransactionalSmsText::confirmation($commande);

        if (trim($sms) !== '') {
            SendSmsJob::dispatch($phone, $sms, 'order:' . $commande->id . ':confirmation');
        }
    }
}
