<?php

namespace App\Filament\Resources\CommandeResource\Pages;

use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\ClientResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Models\Commande;
use App\Models\Product;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Enums\Width;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Facades\DB;

class EditCommande extends EditRecord
{
    protected static string $resource = CommandeResource::class;

    public function getMaxContentWidth(): Width | string | null
    {
        return Width::Full;
    }

    public function getPageClasses(): array
    {
        return array_merge(parent::getPageClasses(), ['fi-page-edit-commande']);
    }

    public function getHeaderWidgets(): array
    {
        return [DocumentTimelineWidget::class];
    }

    public function getHeading(): string
    {
        return 'Commande #' . $this->record->numero;
    }

    public function getSubheading(): ?\Illuminate\Contracts\Support\Htmlable
    {
        $client = $this->record->getFullNameAttribute() ?: trim(($this->record->nom ?? '') . ' ' . ($this->record->prenom ?? '')) ?: '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        $total = number_format((float) ($this->record->prix_ttc ?? 0), 3, ',', ' ') . ' DT';
        $statut = Commande::getStatusLabel($this->record->etat ?? '');

        $html = '<style>.fi-header { position: relative !important; top: auto !important; z-index: 0 !important; }</style>';
        $html .= '<div class="flex flex-wrap items-center gap-2 mt-2">';
        $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700">👤 ' . e($client) . '</span>';
        $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700">📅 ' . e($date) . '</span>';
        $html .= '<span class="inline-flex items-center px-4 py-1.5 rounded-full text-[15px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 shadow-sm border border-orange-200 dark:border-orange-500/30">💰 ' . e($total) . '</span>';
        $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border shadow-sm">' . e($statut) . '</span>';
        $html .= '</div>';

        return new \Illuminate\Support\HtmlString($html);
    }

    protected function getHeaderActions(): array
    {
        return array_merge(parent::getHeaderActions(), [
            Actions\Action::make('viewClient')
                ->label('Voir client')
                ->icon('heroicon-o-user')
                ->visible(fn () => (bool) $this->record->client_id)
                ->url(fn () => ClientResource::getUrl('edit', ['record' => $this->record->client_id]))
                ->openUrlInNewTab(),
            Actions\Action::make('createBl')
                ->label('Convertir en bon de livraison')
                ->icon('heroicon-o-document-text')
                ->color('success')
                ->requiresConfirmation()
                ->modalHeading('Transformer en Bon de Livraison')
                ->modalDescription('Vérifiez les informations avant de confirmer la conversion.')
                ->modalContent(fn (): View => CommandeResource::buildConversionModalContent($this->record, 'Bon de Livraison', 'amber'))
                ->modalSubmitActionLabel('Confirmer la conversion')
                ->modalCancelActionLabel('Annuler')
                ->visible(fn () => ! $this->record->factures()->exists())
                ->action(function () {
                    $bl = app(\App\Services\DocumentConversion\OrderToBlService::class)->createBlFromOrder($this->record);
                    Notification::make()
                        ->title('Conversion réussie — BL #' . $bl->numero)
                        ->success()
                        ->send();
                    return redirect(route('factures.print', ['facture' => $bl->id]));
                }),
            ActionGroup::make([
                Actions\DeleteAction::make()->label('Supprimer la commande'),
            ])->label('')->icon('heroicon-o-ellipsis-vertical'),
        ]);
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['details'] = $this->record->details->map(fn ($d) => [
            'produit_id'    => $d->produit_id,
            'qte'           => $d->qte ?? $d->quantite ?? 1,
            'prix_unitaire' => $d->prix_unitaire,
        ])->toArray();
        if (empty($data['details'])) {
            $data['details'] = [['produit_id' => null, 'qte' => 1, 'prix_unitaire' => 0]];
        }
        return $data;
    }

    protected function getFormActions(): array
    {
        return [];
    }

    protected function afterSave(): void
    {
        $details = $this->form->getState()['details'] ?? [];

        // GUARD: a partial/empty submit must never silently wipe a populated order.
        // mutateFormDataBeforeFill always injects a placeholder row with a null
        // produit_id, so we key off "are there any VALID product lines?".
        $validRows = array_values(array_filter(
            is_array($details) ? $details : [],
            fn ($row) => ! empty($row['produit_id'])
        ));

        if (empty($validRows) && $this->record->details()->exists()) {
            Notification::make()
                ->title('Commande inchangée')
                ->body('Aucune ligne produit valide n’a été soumise — les lignes existantes ont été conservées.')
                ->warning()
                ->send();

            return;
        }

        $prixHt = 0.0;
        $touchedProductIds = [];

        // Mirror EditFacture::afterSave(): restore stock for the OLD lines, then
        // decrement for the NEW lines, inside a transaction so a mid-loop failure
        // cannot leave order lines and stock out of sync.
        DB::transaction(function () use ($validRows, &$prixHt, &$touchedProductIds): void {
            // Restore stock for the old lines being removed.
            foreach ($this->record->details as $old) {
                Product::where('id', $old->produit_id)
                    ->increment('qte', $old->qte ?? $old->quantite ?? 0);
                $touchedProductIds[] = $old->produit_id;
            }
            $this->record->details()->delete();

            // Recreate the new lines and decrement stock for each.
            foreach ($validRows as $row) {
                $qte          = (float) ($row['qte'] ?? 1);
                $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);

                \App\Models\CommandeDetail::create([
                    'commande_id'   => $this->record->id,
                    'produit_id'    => $row['produit_id'],
                    'qte'           => $qte,
                    'prix_unitaire' => $prixUnitaire,
                ]);
                Product::where('id', $row['produit_id'])->decrement('qte', $qte);
                $touchedProductIds[] = $row['produit_id'];
                $prixHt += $qte * $prixUnitaire;
            }

            // Raw increment()/decrement() bypass the Product saving() hook; re-derive rupture.
            Product::syncRuptureFlags($touchedProductIds);
        });

        $frais = (float) ($this->form->getState()['frais_livraison'] ?? 0);
        $this->record->update([
            'prix_ht'          => round($prixHt, 3),
            'frais_livraison'  => round($frais, 3),
            'prix_ttc'         => round($prixHt + $frais, 3),
        ]);
    }
}
