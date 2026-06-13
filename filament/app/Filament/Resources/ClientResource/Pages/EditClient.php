<?php

namespace App\Filament\Resources\ClientResource\Pages;

use App\Filament\Resources\ClientResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditClient extends EditRecord
{
    protected static string $resource = ClientResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()];
    }

    protected function afterSave(): void
    {
        $cardNumber = trim((string) ($this->data['scan_card_number'] ?? ''));
        if ($cardNumber !== '') {
            try {
                $service = app(\App\Services\LoyaltyService::class);
                $card = $service->findCardByScanCode($cardNumber);
                if (!$card) {
                    throw new \RuntimeException("La carte '{$cardNumber}' est introuvable.");
                }
                
                $service->assignCardToClient($card, $this->record, true);
                
                \Filament\Notifications\Notification::make()
                    ->title("Carte {$card->card_number} attribuée avec succès.")
                    ->success()
                    ->send();
                
                // Clear the form field value
                $this->fillForm();
            } catch (\Throwable $e) {
                \Filament\Notifications\Notification::make()
                    ->title("Erreur d'attribution de la carte")
                    ->body($e->getMessage())
                    ->danger()
                    ->send();
            }
        }
    }
}
