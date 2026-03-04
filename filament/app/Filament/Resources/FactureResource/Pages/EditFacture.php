<?php

namespace App\Filament\Resources\FactureResource\Pages;

use App\Filament\Resources\FactureResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Models\DetailsFacture;
use App\Models\Product;
use App\Services\DocumentConversion\BlToInvoiceService;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Schema;

class EditFacture extends EditRecord
{
    protected static string $resource = FactureResource::class;

    public function getHeaderWidgets(): array
    {
        return [DocumentTimelineWidget::class];
    }

    public function getHeading(): string
    {
        return 'Bon de livraison #' . $this->record->numero;
    }

    public function getSubheading(): ?string
    {
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        $total = number_format((float) ($this->record->prix_ttc ?? 0), 2, ',', ' ') . ' TND';
        $parts = ["Client : {$client}", "Date : {$date}", "Total : {$total}"];
        if ($this->record->commande_id) {
            $parts[] = 'Commande : #' . $this->record->commande?->numero;
        }
        if (Schema::hasColumn('facture_tvas', 'facture_id') && $this->record->factureTvas()->exists()) {
            $parts[] = 'Facture TVA : #' . $this->record->factureTvas->first()?->numero;
        }

        return implode(' · ', $parts);
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
        $details = $this->form->getState()['details'] ?? [];
        foreach ($this->record->details as $old) {
            Product::where('id', $old->produit_id)->increment('qte', $old->qte ?? $old->quantite ?? 0);
        }
        $this->record->details()->delete();
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            DetailsFacture::create([
                'facture_id' => $this->record->id,
                'produit_id' => $row['produit_id'],
                'qte' => $qte,
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
            $q->where('code_product', $code)
                ->orWhere('code_product', '0' . $code);
        })->first();

        if (! $product) {
            Notification::make()
                ->title('Produit introuvable')
                ->body('Aucun produit trouvé pour ce code-barres.')
                ->danger()
                ->send();

            return;
        }

        $state = $this->form->getState();
        $details = $state['details'] ?? [];

        $found = false;
        foreach ($details as $index => $row) {
            if (! empty($row['produit_id']) && (int) $row['produit_id'] === (int) $product->id) {
                $currentQty = (int) ($row['qte'] ?? 0);
                $details[$index]['qte'] = $currentQty > 0 ? $currentQty + 1 : 1;
                $found = true;
                break;
            }
        }

        if (! $found) {
            $details[] = [
                'produit_id' => $product->id,
                'qte' => 1,
                'prix_unitaire' => (float) ($product->prix ?? 0),
            ];
        }

        $this->form->fill(array_merge($state, ['details' => $details]));
    }

    protected function getHeaderActions(): array
    {
        $r = $this->record;

        return [
            Actions\Action::make('convertToInvoice')
                ->label('Transformer en facture TVA')
                ->icon('heroicon-o-document-duplicate')
                ->color('success')
                ->visible(fn () => Schema::hasColumn('facture_tvas', 'facture_id') && ! $this->record->factureTvas()->exists())
                ->modalHeading('Conversion : BL → Facture TVA')
                ->modalDescription('Récapitulatif avant création de la facture TVA.')
                ->modalSubmitActionLabel('Confirmer la conversion')
                ->modalContent(fn () => view('filament.components.convert-wizard-summary', [
                    'sourceNumber' => $r->numero,
                    'client' => $r->client?->name ?? '—',
                    'date' => $r->created_at?->format('d/m/Y'),
                    'itemsCount' => $r->details->count(),
                    'totalTtc' => number_format((float)($r->prix_ttc ?? 0), 3, ',', ' ') . ' DT',
                ]))
                ->action(function (BlToInvoiceService $service): void {
                    $invoice = $service->createInvoiceFromBl($this->record);
                    Notification::make()
                        ->title('Conversion réussie')
                        ->body('Facture #' . $invoice->numero . ' a été créée.')
                        ->success()
                        ->send();
                    $this->redirect(FactureTvaResource::getUrl('edit', ['record' => $invoice]));
                }),
            Actions\Action::make('print')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->color('gray')
                ->modalHeading('Aperçu d\'impression')
                ->modalContent(fn () => view('filament.components.print-modal', [
                    'printUrl' => route('factures.print', ['facture' => $this->record->id]),
                    'title' => 'Bon de livraison ' . $this->record->numero,
                ]))
                ->modalSubmitAction(false),
            ActionGroup::make([
                Actions\DeleteAction::make(),
            ])->label('Autres actions')->icon('heroicon-o-ellipsis-vertical'),
        ];
    }
}
