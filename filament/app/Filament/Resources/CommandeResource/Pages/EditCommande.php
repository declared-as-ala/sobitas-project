<?php

namespace App\Filament\Resources\CommandeResource\Pages;

use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\ClientResource;
use App\Filament\Resources\FactureResource;
use App\Filament\Resources\TicketResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Services\DocumentConversion\CommandeToInvoiceService;
use App\Services\DocumentConversion\OrderToBlService;
use App\Services\DocumentConversion\OrderToTicketBlService;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditCommande extends EditRecord
{
    protected static string $resource = CommandeResource::class;

    public function getHeaderWidgets(): array
    {
        return [DocumentTimelineWidget::class];
    }

    public function getHeading(): string
    {
        return 'Commande #' . $this->record->numero;
    }

    public function getSubheading(): ?string
    {
        $parts = [];
        if ($this->record->quotation_id) {
            $parts[] = 'Devis : #' . $this->record->quotation?->numero;
        }
        if ($this->record->factures()->exists()) {
            $parts[] = 'BL (Facture) : #' . $this->record->factures->first()?->numero;
        }
        $ticketBl = $this->record->ticketsBl()->first();
        if ($ticketBl) {
            $parts[] = 'BL (Ticket) : #' . $ticketBl->numero;
        }

        return $parts ? implode(' · ', $parts) : null;
    }

    protected function getHeaderActions(): array
    {
        $r = $this->record;
        return array_merge(parent::getHeaderActions(), [
            Actions\Action::make('viewClient')
                ->label('Voir client')
                ->icon('heroicon-o-user')
                ->visible(fn () => (bool) $this->record->user_id)
                ->url(fn () => ClientResource::getUrl('edit', ['record' => $this->record->user_id]))
                ->openUrlInNewTab(),
            Actions\Action::make('createBlTicket')
                ->label('Créer Bon de livraison (Ticket)')
                ->icon('heroicon-o-document-text')
                ->color('success')
                ->visible(fn () => ! $this->record->ticketsBl()->exists())
                ->modalHeading('Créer un Bon de livraison pour cette commande')
                ->modalDescription('Un ticket de type "Bon de livraison" sera créé avec les lignes de la commande. Le BL ne compte pas dans le CA.')
                ->modalSubmitActionLabel('Créer le BL')
                ->modalContent(fn () => view('filament.components.convert-wizard-summary', [
                    'sourceNumber' => $r->numero,
                    'client' => $r->getFullNameAttribute() ?: ($r->nom . ' ' . $r->prenom) ?: '—',
                    'date' => $r->created_at?->format('d/m/Y'),
                    'itemsCount' => $r->details->count(),
                    'totalTtc' => number_format((float)($r->prix_ttc ?? 0), 3, ',', ' ') . ' DT',
                ]))
                ->action(function (OrderToTicketBlService $service) {
                    $bl = $service->createBlFromOrder($this->record);
                    Notification::make()
                        ->title('BL créé')
                        ->body('Bon de livraison #' . $bl->numero . ' (Ticket) créé.')
                        ->success()
                        ->send();
                    $this->redirect(TicketResource::getUrl('edit', ['record' => $bl]));
                }),
            Actions\Action::make('createInvoice')
                ->label('Créer Facture TVA pour cette commande')
                ->icon('heroicon-o-document-duplicate')
                ->color('gray')
                ->modalHeading('Créer une facture TVA (liée à cette commande)')
                ->modalDescription('La facture sera liée à cette commande et ne sera pas comptée une seconde fois dans le CA.')
                ->action(function (CommandeToInvoiceService $service) {
                    $invoice = $service->createInvoiceFromCommande($this->record);
                    Notification::make()
                        ->title('Facture TVA créée')
                        ->body('Facture #' . $invoice->numero . ' créée (liée à cette commande).')
                        ->success()
                        ->send();
                    $this->redirect(\App\Filament\Resources\FactureTvaResource::getUrl('edit', ['record' => $invoice]));
                }),
            Actions\Action::make('createBl')
                ->label('Créer BL (document Facture)')
                ->icon('heroicon-o-document')
                ->visible(fn () => ! $this->record->factures()->exists())
                ->modalHeading('Conversion : Commande → Bon de livraison (Facture)')
                ->modalSubmitActionLabel('Confirmer')
                ->modalContent(fn () => view('filament.components.convert-wizard-summary', [
                    'sourceNumber' => $r->numero,
                    'client' => $r->getFullNameAttribute() ?: ($r->nom . ' ' . $r->prenom) ?: '—',
                    'date' => $r->created_at?->format('d/m/Y'),
                    'itemsCount' => $r->details->count(),
                    'totalTtc' => number_format((float)($r->prix_ttc ?? 0), 3, ',', ' ') . ' DT',
                ]))
                ->action(function (OrderToBlService $service) {
                    $bl = $service->createBlFromOrder($this->record);
                    Notification::make()
                        ->title('BL créé')
                        ->body('BL #' . $bl->numero . ' (Facture) a été créé.')
                        ->success()
                        ->send();
                    $this->redirect(FactureResource::getUrl('edit', ['record' => $bl]));
                }),
            Actions\Action::make('print')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->url(fn () => $this->record->factures()->first() ? route('factures.print', ['facture' => $this->record->factures->first()->id]) : null)
                ->openUrlInNewTab()
                ->visible(fn () => $this->record->factures()->exists()),
            ActionGroup::make([
                Actions\DeleteAction::make(),
            ])->label('Autres actions')->icon('heroicon-o-ellipsis-vertical'),
        ]);
    }
}
