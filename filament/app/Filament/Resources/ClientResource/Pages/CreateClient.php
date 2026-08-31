<?php

namespace App\Filament\Resources\ClientResource\Pages;

use App\Filament\Resources\ClientResource;
use App\Jobs\SendSmsJob;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;

class CreateClient extends CreateRecord
{
    protected static string $resource = ClientResource::class;

    protected function afterCreate(): void
    {
        $client = $this->record;

        if ($client->sms && $client->phone_1) {
            $message = 'Protein.tn: bienvenue! Votre espace client est pret. Suivez vos commandes et profitez de vos avantages sur protein.tn.';

            SendSmsJob::dispatch($client->phone_1, $message);

            Notification::make()
                ->title('SMS de bienvenue envoyé')
                ->body("Un SMS de bienvenue a été mis en file d'attente pour {$client->name}.")
                ->success()
                ->send();
        }

        $cardNumber = trim((string) ($this->data['scan_card_number'] ?? ''));
        if ($cardNumber !== '') {
            try {
                $service = app(\App\Services\LoyaltyService::class);
                $card = $service->findCardByScanCode($cardNumber);
                if (!$card) {
                    throw new \RuntimeException("La carte '{$cardNumber}' est introuvable.");
                }
                
                $service->assignCardToClient($card, $client, true);
                
                Notification::make()
                    ->title("Carte {$card->card_number} attribuée avec succès.")
                    ->success()
                    ->send();
            } catch (\Throwable $e) {
                Notification::make()
                    ->title("Erreur d'attribution de la carte")
                    ->body($e->getMessage())
                    ->danger()
                    ->send();
            }
        }
    }
}
