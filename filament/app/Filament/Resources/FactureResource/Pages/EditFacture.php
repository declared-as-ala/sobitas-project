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

    public function getPageClasses(): array
    {
        return array_merge(parent::getPageClasses(), ['fi-page-edit-facture']);
    }

    public function getMaxContentWidth(): \Filament\Support\Enums\Width | string | null
    {
        return \Filament\Support\Enums\Width::Full;
    }

    public function getHeaderWidgets(): array
    {
        return [DocumentTimelineWidget::class];
    }

    public function getHeading(): string
    {
        return 'Bon de livraison #' . $this->record->numero;
    }

    public function getSubheading(): ?\Illuminate\Contracts\Support\Htmlable
    {
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';

        $details = $this->record->details->map(fn ($d) => [
            'qte' => $d->qte ?? $d->quantite ?? 1,
            'prix_unitaire' => $d->prix_unitaire ?? 0,
        ])->toArray();

        $calc = \App\Services\InvoiceCalculator::calculate(
            $details,
            (float)($this->record->remise ?? 0),
            0.0,
            0,
            (float)($this->record->frais_livraison ?? 0)
        );

        $net = number_format($calc['net_a_payer'], 3, ',', ' ') . ' TND';

        $html = '<style>
            .fi-header { position: relative !important; top: auto !important; z-index: 0 !important; }
        </style>';
        $html .= '<div class="flex flex-wrap items-center gap-2 mt-2">';
        $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700">👤 Client : ' . e($client) . '</span>';
        $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700">📅 Date : ' . e($date) . '</span>';
        $html .= '<span class="inline-flex items-center px-4 py-1.5 rounded-full text-[15px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 shadow-sm border border-orange-200 dark:border-orange-500/30">💰 Net à payer : ' . e($net) . '</span>';
        
        if ($this->record->commande_id) {
            $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">📦 Cmd #' . e($this->record->commande?->numero ?? $this->record->commande_id) . '</span>';
        }

        if (Schema::hasColumn('facture_tvas', 'facture_id') && $this->record->factureTvas()->exists()) {
            $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">🧾 Fact. TVA #' . e($this->record->factureTvas->first()?->numero) . '</span>';
        }

        $html .= '</div>';

        return new \Illuminate\Support\HtmlString($html);
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['client_adresse'] = $this->record->client?->adresse ?? '';
        $data['client_phone']   = $this->record->client?->phone_1 ?? '';
        $data['client_email']   = $this->record->client?->email ?? '';

        $data['details'] = $this->record->details->map(fn ($d) => [
            'produit_id'    => $d->produit_id,
            'qte'           => $d->qte ?? $d->quantite ?? 0,
            'prix_unitaire' => $d->prix_unitaire,
        ])->toArray();
        if (empty($data['details'])) {
            $data['details'] = [['produit_id' => null, 'qte' => 1, 'prix_unitaire' => 0]];
        }

        $remise = (float) ($this->record->remise ?? 0);
        $timbre = 0.0;
        $fraisLivraison = (float) ($this->record->frais_livraison ?? 0);
        $totals = \App\Services\InvoiceCalculator::calculate($data['details'], $remise, $timbre, 0, $fraisLivraison);

        $data['prix_ht'] = $totals['total_ht_brut'];
        $data['pourcentage_remise'] = $totals['pourcentage_remise'];
        $data['prix_ht_apres_remise'] = $totals['prix_ht_apres_remise'];
        $data['tva'] = $totals['tva'];
        $data['prix_ttc'] = $totals['prix_ttc'];
        $data['net_a_payer'] = $totals['net_a_payer'];
        $data['remise'] = $totals['remise'];
        $data['timbre'] = $totals['timbre'];
        $data['frais_livraison'] = $this->record->frais_livraison ?? 0;
        $data['resume_date_display'] = $this->record->created_at?->format('d/m/Y') ?? '';
        $data['resume_statut_display'] = 'Validée';

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

        $state = $this->form->getState();
        $remise = (float) ($state['remise'] ?? 0);
        $timbre = 0.0;
        $fraisLivraison = (float) ($state['frais_livraison'] ?? 0);

        $calcTotals = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, 0, $fraisLivraison);

        $this->record->update([
            'prix_ht' => $calcTotals['total_ht_brut'],
            'remise' => $calcTotals['remise'],
            'pourcentage_remise' => $calcTotals['pourcentage_remise'],
            'prix_ht_apres_remise' => $calcTotals['prix_ht_apres_remise'],
            'tva' => $calcTotals['tva'],
            'timbre' => $calcTotals['timbre'],
            'frais_livraison' => $calcTotals['frais_livraison'],
            'prix_ttc' => $calcTotals['prix_ttc'],
            'net_a_payer' => $calcTotals['net_a_payer'],
        ]);
    }

    /**
     * Barcode scan — called via $wire.addProductByBarcode(code) from Alpine.
     * Note: Keep this method simple (void return) — Alpine calls it fire-and-forget.
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
                ->body('Aucun produit trouvé pour : ' . $code)
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
                'prix_unitaire' => $product->getEffectivePriceHt(),
            ];
        }

        Notification::make()
            ->title('Produit ajouté : ' . $product->designation_fr)
            ->success()
            ->send();

        $newState = array_merge($state, ['details' => $details]);
        $this->form->fill($newState);

        $remise = (float) ($newState['remise'] ?? 0);
        $timbre = 0.0;
        $fraisLivraison = (float) ($newState['frais_livraison'] ?? 0);
        $calc = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, 0, $fraisLivraison);
        $this->form->fill(array_merge($newState, [
            'prix_ht' => $calc['total_ht_brut'],
            'pourcentage_remise' => $calc['pourcentage_remise'],
            'prix_ht_apres_remise' => $calc['prix_ht_apres_remise'],
            'tva' => $calc['tva'],
            'prix_ttc' => $calc['prix_ttc'],
            'net_a_payer' => $calc['net_a_payer'],
        ]));
    }

    // -------------------------------------------------------------------------
    // Header actions — Filament v4 (SPA mode)
    // IMPORTANT: Save/Cancel are native in getFormActions() (footer).
    // Do NOT add ->action('save') in header — it does NOT work in SPA mode.
    // -------------------------------------------------------------------------
    protected function getHeaderActions(): array
    {
        return [
            // Transformer en Facture TVA (with confirmation modal)
            Actions\Action::make('convertToInvoice')
                ->label('Transformer en facture TVA')
                ->icon('heroicon-o-document-duplicate')
                ->color('success')
                ->visible(fn () => Schema::hasColumn('facture_tvas', 'facture_id') && ! $this->record->factureTvas()->exists())
                ->requiresConfirmation()
                ->modalHeading('Transformer en Facture TVA ?')
                ->modalDescription('Une nouvelle Facture TVA sera créée avec les mêmes produits et client. Cette action ne supprime pas le BL.')
                ->modalSubmitActionLabel('Confirmer')
                ->modalCancelActionLabel('Annuler')
                ->action(function (BlToInvoiceService $service) {
                    $invoice = $service->createInvoiceFromBl($this->record);
                    Notification::make()
                        ->title('Facture TVA #' . $invoice->numero . ' créée.')
                        ->success()
                        ->send();
                    $this->redirect(FactureTvaResource::getUrl('edit', ['record' => $invoice]));
                }),

            // Imprimer — open in new tab (safest in SPA mode, avoids modal dependency)
            Actions\Action::make('imprimer')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->color('gray')
                ->url(fn () => route('factures.print', ['facture' => $this->record->id]))
                ->openUrlInNewTab(),

            // More actions dropdown
            ActionGroup::make([
                Actions\DeleteAction::make()
                    ->label('Supprimer ce document')
                    ->modalHeading('Supprimer le bon de livraison ?')
                    ->modalDescription('Cette action est irréversible. Le stock des produits sera restitué.')
                    ->modalSubmitActionLabel('Oui, supprimer')
                    ->modalCancelActionLabel('Annuler'),
            ])->label('Autres actions')->icon('heroicon-o-ellipsis-vertical'),
        ];
    }

    /**
     * Native Filament form footer actions with French labels.
     * These use the proper Livewire save lifecycle — DO NOT override with custom header buttons.
     */
    protected function getFormActions(): array
    {
        return [
            $this->getSaveFormAction()->label('Enregistrer les modifications')->icon('heroicon-o-check'),
            $this->getCancelFormAction()->label('Annuler'),
        ];
    }
}
