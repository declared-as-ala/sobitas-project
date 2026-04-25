<?php

namespace App\Observers;

use App\Filament\Resources\CommandeResource;
use App\Jobs\SendSmsJob;
use App\Models\Commande;
use App\Models\Message;
use App\Models\User;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class CommandeObserver
{
    /**
     * Notify all panel users when a new commande is created.
     */
    public function created(Commande $commande): void
    {
        $recipients = User::all();
        if ($recipients->isEmpty()) {
            return;
        }

        $url = CommandeResource::getUrl('edit', ['record' => $commande]);
        $title = 'Nouvelle commande';
        $body = 'Commande #' . ($commande->numero ?? $commande->id) . ' – ' . trim(($commande->nom ?? '') . ' ' . ($commande->prenom ?? ''));

        foreach ($recipients as $user) {
            Notification::make()
                ->title($title)
                ->body($body)
                ->success()
                ->actions([
                    Action::make('open')
                        ->label('Ouvrir')
                        ->url($url),
                ])
                ->sendToDatabase($user);
        }
    }

    /**
     * When order status (etat) changes, send SMS to client with status update (unless cancelled).
     */
    public function updated(Commande $commande): void
    {
        if (! $commande->wasChanged('etat')) {
            return;
        }

        if ($commande->etat === 'annuler') {
            return;
        }

        $phone = $commande->livraison_phone ?? $commande->phone ?? null;
        if (empty(trim((string) $phone))) {
            return;
        }

        $msg = Message::getCached();
        $commande->loadMissing('details.product:id,designation_fr');
        $products = $commande->details
            ->take(4)
            ->map(fn ($d) => $d->product->designation_fr ?? 'Produit')
            ->filter()
            ->implode(', ');
        $more = $commande->details->count() > 4 ? ' (+' . ($commande->details->count() - 4) . ')' : '';
        $productsText = trim($products . $more);
        $total = number_format((float) ($commande->prix_ttc ?? 0), 3, '.', ' ');

        if ($msg && ! empty(trim((string) $msg->msg_etat_commande))) {
            $sms = str_replace(
                ['[nom]', '[prenom]', '[num_commande]', '[etat]', '[produits]', '[total]'],
                [
                    $commande->nom ?? '',
                    $commande->prenom ?? '',
                    $commande->numero ?? '',
                    Commande::getStatusLabel($commande->etat),
                    $productsText,
                    $total,
                ],
                $msg->msg_etat_commande
            );
        } else {
            $greeting = trim(($commande->prenom ?? '') . ' ' . ($commande->nom ?? ''));
            $greeting = $greeting !== '' ? "Bonjour {$greeting}," : 'Bonjour,';
            $status = Commande::getStatusLabel($commande->etat);
            $sms = $greeting
                . " votre commande {$commande->numero} est {$status}.\n"
                . "Produits: {$productsText}\n"
                . "Total: {$total} TND.\n"
                . 'Merci pour votre confiance.';
        }

        SendSmsJob::dispatch($phone, $sms);

        Log::info('Order status SMS dispatched', [
            'commande_id' => $commande->id,
            'etat'        => $commande->etat,
        ]);
    }
}
