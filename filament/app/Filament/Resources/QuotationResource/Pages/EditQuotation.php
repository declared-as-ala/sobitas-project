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
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        $total = number_format((float) ($this->record->prix_ttc ?? 0), 2, ',', ' ') . ' TND';
        $statut = $this->getStatutLabel($this->record->statut ?? null);

        return "Client : {$client} · Date : {$date} · Total : {$total}" . ($statut ? " · Statut : {$statut}" : '');
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['client_adresse'] = $this->record->client?->adresse ?? '';
        $data['client_phone'] = $this->record->client?->phone_1 ?? '';
        $data['details'] = $this->record->details->map(fn ($d) => [
            'produit_id' => $d->produit_id,
            'qte' => $d->qte ?? $d->quantite ?? 0,
            'prix_unitaire' => $d->prix_unitaire,
        ])->toArray();
        if (empty($data['details'])) {
            $data['details'] = [['produit_id' => null, 'qte' => 1, 'prix_unitaire' => 0]];
        }
        return $data;
    }

    protected function afterSave(): void
    {
        foreach ($this->record->details as $old) {
            Product::where('id', $old->produit_id)->increment('qte', $old->qte ?? $old->quantite ?? 0);
        }
        $this->record->details()->delete();
        $details = $this->form->getState()['details'] ?? [];
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            DetailsQuotation::create([
                'quotation_id' => $this->record->id,
                'produit_id' => $row['produit_id'],
                'qte' => $qte,
                'quantite' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ttc' => $qte * $prixUnitaire,
            ]);
            Product::where('id', $row['produit_id'])->decrement('qte', $qte);
        }
    }

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
            \Filament\Notifications\Notification::make()->title('Aucun produit trouvé pour ce code')->warning()->send();
            return;
        }
        $state = $this->form->getState();
        $details = $state['details'] ?? [];
        $details[] = ['produit_id' => $product->id, 'qte' => 1, 'prix_unitaire' => (float) ($product->prix ?? 0)];
        $this->form->fill(array_merge($state, ['details' => $details]));
    }

    protected function getHeaderActions(): array
    {
        $r = $this->record;
        return array_merge(parent::getHeaderActions(), [
            ActionGroup::make([
                Actions\Action::make('convertToTicket')
                    ->label('en Ticket')
                    ->icon('heroicon-o-ticket')
                    ->requiresConfirmation()
                    ->modalSubmitActionLabel('Confirmer')
                    ->action(function (QuotationConversionService $service) {
                        $ticket = $service->convertToTicket($this->record);
                        Notification::make()->title('Ticket #' . $ticket->numero . ' créé')->success()->send();
                        $this->redirect(TicketResource::getUrl('edit', ['record' => $ticket]));
                    }),
                Actions\Action::make('convertToFactureTva')
                    ->label('en Facture TVA')
                    ->icon('heroicon-o-document-duplicate')
                    ->requiresConfirmation()
                    ->modalSubmitActionLabel('Confirmer')
                    ->action(function (QuotationConversionService $service) {
                        $invoice = $service->convertToFactureTva($this->record);
                        Notification::make()->title('Facture TVA #' . $invoice->numero . ' créée')->success()->send();
                        $this->redirect(FactureTvaResource::getUrl('edit', ['record' => $invoice]));
                    }),
                Actions\Action::make('convertToBl')
                    ->label('en Bon de livraison')
                    ->icon('heroicon-o-document-text')
                    ->requiresConfirmation()
                    ->modalSubmitActionLabel('Confirmer')
                    ->action(function (QuotationConversionService $service) {
                        $bl = $service->convertToBl($this->record);
                        Notification::make()->title('BL #' . $bl->numero . ' créé')->success()->send();
                        $this->redirect(FactureResource::getUrl('edit', ['record' => $bl]));
                    }),
            ])->label('Transformer')->icon('heroicon-o-arrow-path')->color('success')->dropdownPlacement('bottom-start'),
            Actions\Action::make('print')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->modalHeading('Aperçu d\'impression')
                ->modalContent(fn () => view('filament.components.print-modal', [
                    'printUrl' => route('quotations.print', ['quotation' => $this->record->id]),
                    'title' => 'Devis ' . $this->record->numero,
                ]))
                ->modalSubmitAction(false),
            ActionGroup::make([
                Actions\Action::make('printDuplicate')->label('Dupliquer')->icon('heroicon-o-document-duplicate'),
                Actions\DeleteAction::make(),
            ])->label('Autres actions')->icon('heroicon-o-ellipsis-vertical'),
        ]);
    }

    private function getStatutLabel(?string $statut): string
    {
        return match ($statut) {
            'brouillon' => 'Brouillon',
            'valide' => 'Validé',
            'refuse' => 'Refusé',
            'en_attente' => 'En attente',
            default => '',
        };
    }
}
