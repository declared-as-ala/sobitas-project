<?php

namespace App\Filament\Resources\CommandeResource\Pages;

use App\Filament\Resources\CommandeResource;
use App\Filament\Resources\ClientResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\TicketResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Models\Commande;
use App\Services\DocumentConversion\CommandeToInvoiceService;
use App\Services\DocumentConversion\OrderToTicketBlService;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Enums\Width;

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
        $r = $this->record;
        return array_merge(parent::getHeaderActions(), [
            Actions\Action::make('saveTop')
                ->label('Sauvegarder les modifications')
                ->icon('heroicon-o-check')
                ->color('primary')
                ->action(function (): void {
                    $this->save();
                }),
            Actions\Action::make('cancelTop')
                ->label('Annuler')
                ->icon('heroicon-o-x-mark')
                ->color('gray')
                ->url(CommandeResource::getUrl('index')),
            Actions\Action::make('viewClient')
                ->label('Voir client')
                ->icon('heroicon-o-user')
                ->visible(fn () => (bool) $this->record->user_id)
                ->url(fn () => ClientResource::getUrl('edit', ['record' => $this->record->user_id]))
                ->openUrlInNewTab(),
            Actions\Action::make('createBlTicket')
                ->label('Créer Bon de livraison')
                ->icon('heroicon-o-document-text')
                ->color('success')
                ->visible(fn () => ! $this->record->factures()->exists())
                ->modalHeading('Créer un Bon de livraison pour cette commande')
                ->modalDescription('Un bon de livraison sera créé avec les lignes de la commande.')
                ->modalSubmitActionLabel('Créer le BL')
                ->modalContent(fn () => view('filament.components.convert-wizard-summary', [
                    'sourceNumber' => $r->numero,
                    'client' => $r->getFullNameAttribute() ?: trim(($r->nom ?? '') . ' ' . ($r->prenom ?? '')) ?: '—',
                    'date' => $r->created_at?->format('d/m/Y'),
                    'itemsCount' => $r->details->count(),
                    'totalTtc' => number_format((float) ($r->prix_ttc ?? 0), 3, ',', ' ') . ' DT',
                ]))
                ->action(function (\App\Services\DocumentConversion\OrderToBlService $service) {
                    $bl = $service->createBlFromOrder($this->record);
                    Notification::make()
                        ->title('Conversion réussie — téléchargement du Bon de livraison en cours')
                        ->success()
                        ->send();
                    $this->redirect(route('factures.download', ['facture' => $bl->id]));
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
        $this->record->details()->delete();

        $prixHt = 0.0;
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte          = (float) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            
            \App\Models\CommandeDetail::create([
                'commande_id'   => $this->record->id,
                'produit_id'    => $row['produit_id'],
                'qte'           => $qte,
                'prix_unitaire' => $prixUnitaire,
            ]);
            $prixHt += $qte * $prixUnitaire;
        }

        $frais = (float) ($this->form->getState()['frais_livraison'] ?? 0);
        $this->record->update([
            'prix_ht'          => round($prixHt, 3),
            'frais_livraison'  => round($frais, 3),
            'prix_ttc'         => round($prixHt + $frais, 3),
        ]);
    }
}
