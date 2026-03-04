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

    /**
     * Override subheading: return empty string — we render meta via a custom Blade slot
     * in the header using CSS chips, kept short and clean.
     */
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

        $total = number_format((float) ($this->record->prix_ttc ?? 0), 3, ',', ' ') . ' DT';
        $parts[] = '💰 ' . $total;

        if ($this->record->commande_id) {
            $parts[] = '📦 Cmd #' . ($this->record->commande?->numero ?? $this->record->commande_id);
        }

        if (Schema::hasColumn('facture_tvas', 'facture_id') && $this->record->factureTvas()->exists()) {
            $parts[] = '🧾 Fact. TVA #' . $this->record->factureTvas->first()?->numero;
        }

        return implode('  ·  ', $parts);
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['client_adresse'] = $this->record->client?->adresse ?? '';
        $data['client_phone']   = $this->record->client?->phone_1 ?? '';
        $data['details'] = $this->record->details->map(fn ($d) => [
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
        $details = $this->form->getState()['details'] ?? [];

        // Restore stock for old lines
        foreach ($this->record->details as $old) {
            Product::where('id', $old->produit_id)->increment('qte', $old->qte ?? $old->quantite ?? 0);
        }
        $this->record->details()->delete();

        // Save new lines
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte          = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            DetailsFacture::create([
                'facture_id'    => $this->record->id,
                'produit_id'    => $row['produit_id'],
                'qte'           => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ttc'      => $qte * $prixUnitaire,
            ]);
            Product::where('id', $row['produit_id'])->decrement('qte', $qte);
        }
    }

    /**
     * Barcode: called via $wire.addProductByBarcode(code) from Alpine
     */
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
    // Header actions — all in French, correct Filament v4 lifecycle
    // -------------------------------------------------------------------------
    protected function getHeaderActions(): array
    {
        $r = $this->record;

        return [
            // Primary: Save
            Actions\Action::make('enregistrer')
                ->label('Enregistrer')
                ->icon('heroicon-o-check-circle')
                ->color('primary')
                ->action('save')
                ->keyBindings(['mod+s']),

            // Secondary: Cancel
            Actions\Action::make('annuler')
                ->label('Annuler')
                ->icon('heroicon-o-x-circle')
                ->color('gray')
                ->url(FactureResource::getUrl('index')),

            // Conversion
            Actions\Action::make('convertToInvoice')
                ->label('Transformer en facture TVA')
                ->icon('heroicon-o-document-duplicate')
                ->color('success')
                ->visible(fn () => Schema::hasColumn('facture_tvas', 'facture_id') && ! $this->record->factureTvas()->exists())
                ->modalHeading('Conversion : BL → Facture TVA')
                ->modalDescription('Cette opération créera une nouvelle facture TVA à partir du bon de livraison.')
                ->modalSubmitActionLabel('Confirmer la conversion')
                ->modalCancelActionLabel('Annuler')
                ->modalContent(fn () => view('filament.components.convert-wizard-summary', [
                    'sourceNumber' => $r->numero,
                    'client'       => $r->client?->name ?? '—',
                    'date'         => $r->created_at?->format('d/m/Y'),
                    'itemsCount'   => $r->details->count(),
                    'totalTtc'     => number_format((float) ($r->prix_ttc ?? 0), 3, ',', ' ') . ' DT',
                ]))
                ->action(function (BlToInvoiceService $service): void {
                    $invoice = $service->createInvoiceFromBl($this->record);
                    Notification::make()
                        ->title('Conversion réussie')
                        ->body('Facture TVA #' . $invoice->numero . ' créée avec succès.')
                        ->success()
                        ->send();
                    $this->redirect(FactureTvaResource::getUrl('edit', ['record' => $invoice]));
                }),

            // Print
            Actions\Action::make('imprimer')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->color('gray')
                ->modalHeading('Aperçu d\'impression')
                ->modalContent(fn () => view('filament.components.print-modal', [
                    'printUrl' => route('factures.print', ['facture' => $this->record->id]),
                    'title'    => 'Bon de livraison ' . $this->record->numero,
                ]))
                ->modalSubmitAction(false)
                ->modalCancelActionLabel('Fermer'),

            // More actions
            ActionGroup::make([
                Actions\DeleteAction::make()
                    ->label('Supprimer ce document')
                    ->modalHeading('Supprimer le bon de livraison')
                    ->modalDescription('Cette action est irréversible. Le stock sera restitué.')
                    ->modalSubmitActionLabel('Oui, supprimer')
                    ->modalCancelActionLabel('Annuler'),
            ])->label('Autres actions')->icon('heroicon-o-ellipsis-vertical'),
        ];
    }

    /**
     * Override the default form footer actions with French labels.
     */
    protected function getFormActions(): array
    {
        return [
            $this->getSaveFormAction()->label('Enregistrer')->icon('heroicon-o-check-circle'),
            $this->getCancelFormAction()->label('Annuler')->icon('heroicon-o-x-circle'),
        ];
    }
}
