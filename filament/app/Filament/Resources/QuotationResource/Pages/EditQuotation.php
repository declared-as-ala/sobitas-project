<?php

namespace App\Filament\Resources\QuotationResource\Pages;

use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\QuotationResource;
use App\Filament\Resources\TicketResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Models\DetailsQuotation;
use App\Models\Product;
use App\Services\DocumentConversion\QuotationConversionService;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditQuotation extends EditRecord
{
    protected static string $resource = QuotationResource::class;

    public function getHeaderWidgets(): array
    {
        return [DocumentTimelineWidget::class];
    }

    public function getHeading(): string
    {
        return 'Devis #' . $this->record->numero;
    }

    public function getSubheading(): ?string
    {
        $parts = [];

        $client = $this->record->client?->name;
        if ($client) {
            $parts[] = '👤 ' . $client;
        }

        $date = $this->record->created_at?->format('d/m/Y');
        if ($date) {
            $parts[] = '📅 ' . $date;
        }

        $total  = number_format((float) ($this->record->prix_ttc ?? 0), 3, ',', ' ') . ' DT';
        $parts[] = '💰 ' . $total;

        $statut = $this->getStatutLabel($this->record->statut ?? null);
        if ($statut) {
            $parts[] = '📌 ' . $statut;
        }

        return implode('  ·  ', $parts);
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['client_adresse'] = $this->record->client?->adresse ?? '';
        $data['client_phone']   = $this->record->client?->phone_1 ?? '';
        $data['details']        = $this->record->details->map(fn ($d) => [
            'produit_id'    => $d->produit_id,
            'qte'           => $d->qte ?? $d->quantite ?? 0,
            'prix_unitaire' => $d->prix_unitaire,
        ])->toArray();
        if (empty($data['details'])) {
            $data['details'] = [['produit_id' => null, 'qte' => 1, 'prix_unitaire' => 0]];
        }
        return $data;
    }

    protected function afterSave(): void
    {
        // Restore old stock
        foreach ($this->record->details as $old) {
            Product::where('id', $old->produit_id)->increment('qte', $old->qte ?? $old->quantite ?? 0);
        }
        $this->record->details()->delete();

        // Save new lines
        $details = $this->form->getState()['details'] ?? [];
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte          = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            DetailsQuotation::create([
                'quotation_id'  => $this->record->id,
                'produit_id'    => $row['produit_id'],
                'qte'           => $qte,
                'quantite'      => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ttc'      => $qte * $prixUnitaire,
            ]);
            Product::where('id', $row['produit_id'])->decrement('qte', $qte);
        }
    }

    /**
     * Barcode scan handler: called via $wire.addProductByBarcode(code) from Alpine
     */
    public function addProductByBarcode(string $code): void
    {
        $code = trim($code);
        if ($code === '') {
            return;
        }

        $product = \App\Models\Product::where(function ($q) use ($code) {
            $q->where('code_product', $code)->orWhere('code_product', '0' . $code);
        })->first();

        if (! $product) {
            Notification::make()
                ->title('Code-barres introuvable')
                ->body('Aucun produit trouvé pour ce code : ' . $code)
                ->danger()
                ->send();
            return;
        }

        $state   = $this->form->getState();
        $details = $state['details'] ?? [];
        $found   = false;

        foreach ($details as $index => $row) {
            if (! empty($row['produit_id']) && (int) $row['produit_id'] === (int) $product->id) {
                $currentQty             = (int) ($row['qte'] ?? 0);
                $details[$index]['qte'] = $currentQty > 0 ? $currentQty + 1 : 1;
                $found                  = true;
                break;
            }
        }

        if (! $found) {
            $details[] = [
                'produit_id'    => $product->id,
                'qte'           => 1,
                'prix_unitaire' => (float) ($product->prix ?? 0),
            ];
        }

        Notification::make()
            ->title('Produit ajouté : ' . $product->designation_fr)
            ->success()
            ->send();

        $this->form->fill(array_merge($state, ['details' => $details]));
    }

    // -------------------------------------------------------------------------
    // Header actions — all French, proper Filament v4 lifecycle
    // -------------------------------------------------------------------------
    protected function getHeaderActions(): array
    {
        return [
            // Primary: Save
            Actions\Action::make('enregistrer')
                ->label('Enregistrer')
                ->icon('heroicon-o-check-circle')
                ->color('primary')
                ->action('save')
                ->keyBindings(['mod+s']),

            // Cancel
            Actions\Action::make('annuler')
                ->label('Annuler')
                ->icon('heroicon-o-x-circle')
                ->color('gray')
                ->url(QuotationResource::getUrl('index')),

            // Conversion group
            ActionGroup::make([
                Actions\Action::make('convertToTicket')
                    ->label('Transformer en Ticket')
                    ->icon('heroicon-o-ticket')
                    ->requiresConfirmation()
                    ->modalHeading('Convertir en Ticket')
                    ->modalDescription('Un nouveau ticket sera créé à partir de ce devis.')
                    ->modalSubmitActionLabel('Confirmer')
                    ->modalCancelActionLabel('Annuler')
                    ->action(function (QuotationConversionService $service) {
                        $ticket = $service->convertToTicket($this->record);
                        Notification::make()->title('Ticket #' . $ticket->numero . ' créé avec succès')->success()->send();
                        $this->redirect(TicketResource::getUrl('edit', ['record' => $ticket]));
                    }),
                Actions\Action::make('convertToFactureTva')
                    ->label('Transformer en Facture TVA')
                    ->icon('heroicon-o-document-duplicate')
                    ->requiresConfirmation()
                    ->modalHeading('Convertir en Facture TVA')
                    ->modalDescription('Une nouvelle facture TVA sera créée à partir de ce devis.')
                    ->modalSubmitActionLabel('Confirmer')
                    ->modalCancelActionLabel('Annuler')
                    ->action(function (QuotationConversionService $service) {
                        $invoice = $service->convertToFactureTva($this->record);
                        Notification::make()->title('Facture TVA #' . $invoice->numero . ' créée avec succès')->success()->send();
                        $this->redirect(FactureTvaResource::getUrl('edit', ['record' => $invoice]));
                    }),
                Actions\Action::make('convertToBl')
                    ->label('Transformer en Bon de Livraison')
                    ->icon('heroicon-o-document-text')
                    ->requiresConfirmation()
                    ->modalHeading('Convertir en Bon de Livraison')
                    ->modalDescription('Un nouveau bon de livraison sera créé à partir de ce devis.')
                    ->modalSubmitActionLabel('Confirmer')
                    ->modalCancelActionLabel('Annuler')
                    ->action(function (QuotationConversionService $service) {
                        $bl = $service->convertToBl($this->record);
                        Notification::make()->title('BL #' . $bl->numero . ' créé avec succès')->success()->send();
                        $this->redirect(FactureResource::getUrl('edit', ['record' => $bl]));
                    }),
            ])
            ->label('Transformer en…')
            ->icon('heroicon-o-arrow-path')
            ->color('success')
            ->dropdownPlacement('bottom-start'),

            // Print
            Actions\Action::make('imprimer')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->color('gray')
                ->modalHeading('Aperçu d\'impression')
                ->modalContent(fn () => view('filament.components.print-modal', [
                    'printUrl' => route('quotations.print', ['quotation' => $this->record->id]),
                    'title'    => 'Devis ' . $this->record->numero,
                ]))
                ->modalSubmitAction(false)
                ->modalCancelActionLabel('Fermer'),

            // More
            ActionGroup::make([
                Actions\DeleteAction::make()
                    ->label('Supprimer ce devis')
                    ->modalHeading('Supprimer le devis')
                    ->modalDescription('Cette action est irréversible.')
                    ->modalSubmitActionLabel('Oui, supprimer')
                    ->modalCancelActionLabel('Annuler'),
            ])->label('Autres actions')->icon('heroicon-o-ellipsis-vertical'),
        ];
    }

    /**
     * French form footer actions
     */
    protected function getFormActions(): array
    {
        return [
            $this->getSaveFormAction()->label('Enregistrer')->icon('heroicon-o-check-circle'),
            $this->getCancelFormAction()->label('Annuler')->icon('heroicon-o-x-circle'),
        ];
    }

    private function getStatutLabel(?string $statut): string
    {
        return match ($statut) {
            'brouillon'  => 'Brouillon',
            'valide'     => 'Validé',
            'refuse'     => 'Refusé',
            'en_attente' => 'En attente',
            default      => '',
        };
    }
}
