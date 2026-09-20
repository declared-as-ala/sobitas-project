<?php

namespace App\Filament\Resources\CommandeAffilieResource\Pages;

use App\Filament\Resources\CommandeAffilieResource;
use App\Filament\Resources\CommandeResource;
use App\Models\Commande;
use App\Services\PointsService;
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

        if ($facture) {
            $actions[] = Action::make('print_bl')
                ->label('Imprimer le BL')
                ->icon('heroicon-o-printer')
                ->url(route('factures.print', ['facture' => $facture->id]))
                ->openUrlInNewTab();
        }

        // Annuler une commande affilié : passe l'état à « annuler », ce qui déclenche
        // CommandeObserver — la commission en attente est retirée (elle réapparaît dans les
        // transactions de l'affilié) et l'affilié est notifié (e-mail + cloche). On masque le
        // bouton si la commande est déjà annulée/retournée.
        $actions[] = Action::make('cancelOrder')
            ->label('Annuler la commande')
            ->icon('heroicon-o-x-circle')
            ->color('danger')
            ->visible(fn () => ! in_array((string) $this->record->etat, PointsService::CANCELLED_STATUSES, true))
            ->requiresConfirmation()
            ->modalIcon('heroicon-o-exclamation-triangle')
            ->modalHeading('Annuler cette commande affilié')
            ->modalDescription(
                'La commande passera au statut « annulée ». La commission en attente de l\'affilié '
                .'sera retirée et apparaîtra dans ses transactions, et l\'affilié en sera informé '
                .'(e-mail + notification). Si un bon de livraison a déjà été créé, l\'expédition '
                .'Aramex n\'est pas annulée automatiquement — gérez-la côté Aramex.'
            )
            ->modalSubmitActionLabel('Confirmer l\'annulation')
            ->modalCancelActionLabel('Retour')
            ->action(function () {
                try {
                    $this->record->etat = 'annuler';
                    $this->record->save();

                    Notification::make()
                        ->title('Commande annulée')
                        ->body('L\'affilié a été notifié et sa commission en attente a été retirée.')
                        ->success()
                        ->send();
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error('Affiliate order cancel failed', [
                        'commande_id' => $this->record->id,
                        'error'       => $e->getMessage(),
                    ]);

                    Notification::make()
                        ->title('Échec de l\'annulation')
                        ->body('La commande n\'a pas pu être annulée. Réessayez.')
                        ->danger()
                        ->send();
                }
            });

        return $actions;
    }
}
