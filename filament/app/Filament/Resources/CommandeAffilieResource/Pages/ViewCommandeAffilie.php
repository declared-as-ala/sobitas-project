<?php

namespace App\Filament\Resources\CommandeAffilieResource\Pages;

use App\Filament\Resources\CommandeAffilieResource;
use App\Filament\Resources\CommandeResource;
use App\Models\Commande;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ViewRecord;
use Filament\Support\Enums\Width;

class ViewCommandeAffilie extends ViewRecord
{
    protected static string $resource = CommandeAffilieResource::class;

    protected function getHeaderActions(): array
    {
        $facture = $this->getRecord()->factures()->latest('id')->first();

        $actions = [
            Action::make('createBl')
                ->label('Convertir en bon de livraison')
                ->icon('heroicon-o-document-text')
                ->color('success')
                ->visible(fn () => $this->record->fulfillment_mode !== Commande::FULFILLMENT_PICKUP
                    && ! $this->record->factures()->exists())
                ->requiresConfirmation()
                ->modalHeading('Transformer en Bon de Livraison')
                ->modalDescription('Vérifiez les informations avant de confirmer la conversion.')
                ->modalContent(fn () => CommandeResource::buildConversionModalContent($this->record, 'Bon de Livraison', 'amber'))
                ->modalWidth(Width::Large)
                ->modalSubmitActionLabel('Confirmer la conversion')
                ->modalCancelActionLabel('Annuler')
                ->action(function () {
                    $bl = app(\App\Services\DocumentConversion\OrderToBlService::class)->createBlFromOrder($this->record);
                    Notification::make()
                        ->title('Conversion réussie — BL #' . $bl->numero)
                        ->success()
                        ->send();

                    return redirect(route('factures.print', ['facture' => $bl->id]));
                }),
        ];

        return array_merge($actions, $facture ? [
            Action::make('print_bl')
                ->label('Imprimer le BL')
                ->icon('heroicon-o-printer')
                ->url(route('factures.print', ['facture' => $facture->id]))
                ->openUrlInNewTab(),
        ] : []);
    }
}
