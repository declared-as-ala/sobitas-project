<?php

namespace App\Services;

use App\Jobs\SendOrderConfirmationEmailJob;
use App\Jobs\SendSmsJob;
use App\Models\Commande;
use App\Models\Message;
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

        $nom = trim((string) ($commande->livraison_nom ?: $commande->nom));
        $prenom = trim((string) ($commande->livraison_prenom ?: $commande->prenom));
        $numero = (string) ($commande->numero ?? '');
        $total = number_format((float) ($commande->prix_ttc ?? 0), 3, '.', ' ');
        $products = $commande->details
            ->take(4)
            ->map(fn ($detail) => $detail->product->designation_fr ?? 'Produit')
            ->filter()
            ->implode(', ');
        $more = $commande->details->count() > 4
            ? ' (+' . ($commande->details->count() - 4) . ')'
            : '';

        $template = trim((string) (Message::getCached()?->msg_passez_commande ?? ''));
        if ($template !== '') {
            $sms = str_replace(
                ['[nom]', '[prenom]', '[num_commande]', '[etat]', '[produits]', '[total]'],
                [$nom, $prenom, $numero, Commande::getStatusLabel((string) $commande->etat), trim($products . $more), $total],
                $template
            );
        } else {
            $greeting = $nom !== '' ? "Bonjour {$nom}" : 'Bonjour';
            $sms = "{$greeting}, votre commande #{$numero} est confirmee.\n"
                . "Produits: {$products}{$more}\n"
                . "Total: {$total} TND. Paiement a la livraison.\n"
                . 'Nous vous appelons pour confirmer. Protein.tn';
        }

        if (trim($sms) !== '') {
            SendSmsJob::dispatch($phone, $sms, 'order:' . $commande->id . ':confirmation');
        }
    }
}
