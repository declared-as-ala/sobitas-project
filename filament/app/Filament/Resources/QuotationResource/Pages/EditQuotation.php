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

    public function getPageClasses(): array
    {
        return array_merge(parent::getPageClasses(), ['fi-page-edit-quotation']);
    }

    public function getHeaderWidgets(): array
    {
        return [DocumentTimelineWidget::class];
    }

    public function getHeading(): string
    {
        return 'Devis #' . $this->record->numero;
    }

    public function getSubheading(): ?\Illuminate\Contracts\Support\Htmlable
    {
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $details = $this->record->details->map(fn ($d) => [
            'qte' => $d->qte ?? $d->quantite ?? 1,
            'prix_unitaire' => $d->prix_unitaire ?? 0,
            'tva_pct' => $d->tva ?? $defaultTva,
        ])->toArray();
        
        $calc = \App\Services\InvoiceCalculator::calculate(
            $details, 
            (float)($this->record->remise ?? 0), 
            (float)($this->record->timbre ?? 0), 
            $defaultTva
        );
        
        $net = number_format($calc['net_a_payer'], 3, ',', ' ') . ' TND';

        $html = '<style>
            .fi-header { position: relative !important; top: auto !important; z-index: 0 !important; }
        </style>';
        $html .= '<div class="flex flex-wrap items-center gap-2 mt-2">';
        $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700">👤 Client : ' . e($client) . '</span>';
        $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 shadow-sm border border-gray-200 dark:border-gray-700">📅 Date : ' . e($date) . '</span>';
        $html .= '<span class="inline-flex items-center px-4 py-1.5 rounded-full text-[15px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400 shadow-sm border border-orange-200 dark:border-orange-500/30">💰 Net à payer : ' . e($net) . '</span>';
        
        $statut = $this->getStatutLabel($this->record->statut ?? null);
        if ($statut) {
            $statusClass = match ($this->record->statut) {
                'valide' => 'bg-green-100 text-green-800 border-green-200',
                'refuse' => 'bg-red-100 text-red-800 border-red-200',
                'en_attente' => 'bg-yellow-100 text-yellow-800 border-yellow-200',
                default => 'bg-gray-100 text-gray-800 border-gray-200'
            };
            $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border shadow-sm ' . $statusClass . '">' . e($statut) . '</span>';
        }

        $html .= '</div>';

        return new \Illuminate\Support\HtmlString($html);
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['client_adresse'] = $this->record->client?->adresse ?? '';
        $data['client_phone']   = $this->record->client?->phone_1 ?? '';
        $data['client_email']   = $this->record->client?->email ?? '';
        
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $data['details']        = $this->record->details->map(fn ($d) => [
            'produit_id'    => $d->produit_id,
            'qte'           => $d->qte ?? $d->quantite ?? 0,
            'prix_unitaire' => $d->prix_unitaire,
            'tva_pct'       => $d->tva ?? $defaultTva,
        ])->toArray();
        if (empty($data['details'])) {
            $data['details'] = [['produit_id' => null, 'qte' => 1, 'prix_unitaire' => 0, 'tva_pct' => $defaultTva]];
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
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte          = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            $tvaPct       = (float) ($row['tva_pct'] ?? $defaultTva);
            
            DetailsQuotation::create([
                'quotation_id'  => $this->record->id,
                'produit_id'    => $row['produit_id'],
                'qte'           => $qte,
                'quantite'      => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ttc'      => $qte * $prixUnitaire * (1 + ($tvaPct / 100)),
                'tva'           => $tvaPct
            ]);
            Product::where('id', $row['produit_id'])->decrement('qte', $qte);
        }

        $state = $this->form->getState();
        $remise = (float) ($state['remise'] ?? 0);
        $timbre = (float) ($state['timbre'] ?? 0);
        
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $calcTotals = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);
        
        $this->record->update([
            'prix_ht' => $calcTotals['total_ht_brut'],
            'remise' => $calcTotals['remise'],
            'pourcentage_remise' => $calcTotals['pourcentage_remise'],
            'prix_ht_apres_remise' => $calcTotals['prix_ht_apres_remise'],
            'tva' => $calcTotals['tva'],
            'timbre' => $calcTotals['timbre'],
            'prix_ttc' => $calcTotals['prix_ttc'],
            'net_a_payer' => $calcTotals['net_a_payer'],
            'prix_total' => $calcTotals['prix_ttc'], // Backwards compatibility if used elsewhere
        ]);
    }

    /**
     * Barcode scan — called via $wire.addProductByBarcode(code) from Alpine.
     * Keep simple void return — Alpine calls fire-and-forget.
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
            $coordinate = \App\Models\Coordinate::getCached();
            $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
            $details[] = [
                'produit_id'    => $product->id,
                'qte'           => 1,
                'prix_unitaire' => $product->getEffectivePriceHt(),
                'tva_pct'       => $defaultTva,
            ];
        }

        Notification::make()
            ->title('Produit ajouté : ' . $product->designation_fr)
            ->success()
            ->send();

        $this->form->fill(array_merge($state, ['details' => $details]));
        
        $remise = (float) ($state['remise'] ?? 0);
        $timbre = (float) ($state['timbre'] ?? 0);
        $calcTotals = \App\Services\InvoiceCalculator::calculate($details, $remise, $timbre, $coordinate->tva ?? 19);
        
        $this->form->fill(array_merge($this->form->getState(), [
            'prix_ht' => $calcTotals['total_ht_brut'],
            'pourcentage_remise' => $calcTotals['pourcentage_remise'],
            'prix_ht_apres_remise' => $calcTotals['prix_ht_apres_remise'],
            'tva' => $calcTotals['tva'],
            'prix_ttc' => $calcTotals['prix_ttc'],
            'net_a_payer' => $calcTotals['net_a_payer'],
        ]));
    }

    // -------------------------------------------------------------------------
    // Header actions — Filament v4 (SPA mode)
    // IMPORTANT: Save/Cancel are native in getFormActions() (footer).
    // -------------------------------------------------------------------------
    protected function getHeaderActions(): array
    {
        return [
            // Conversion group dropdown
            ActionGroup::make([
                Actions\Action::make('convertToTicket')
                    ->label('Transformer en Ticket')
                    ->icon('heroicon-o-ticket')
                    ->requiresConfirmation()
                    ->modalHeading('Convertir en Ticket ?')
                    ->modalDescription('Un nouveau ticket sera créé à partir de ce devis.')
                    ->modalSubmitActionLabel('Confirmer')
                    ->modalCancelActionLabel('Annuler')
                    ->action(function (QuotationConversionService $service) {
                        $ticket = $service->convertToTicket($this->record);
                        Notification::make()->title('Ticket #' . $ticket->numero . ' créé.')->success()->send();
                        $this->redirect(TicketResource::getUrl('edit', ['record' => $ticket]));
                    }),
                Actions\Action::make('convertToFactureTva')
                    ->label('Transformer en Facture TVA')
                    ->icon('heroicon-o-document-duplicate')
                    ->requiresConfirmation()
                    ->modalHeading('Convertir en Facture TVA ?')
                    ->modalDescription('Une nouvelle Facture TVA sera créée à partir de ce devis.')
                    ->modalSubmitActionLabel('Confirmer')
                    ->modalCancelActionLabel('Annuler')
                    ->action(function (QuotationConversionService $service) {
                        $invoice = $service->convertToFactureTva($this->record);
                        Notification::make()->title('Facture TVA #' . $invoice->numero . ' créée.')->success()->send();
                        $this->redirect(FactureTvaResource::getUrl('edit', ['record' => $invoice]));
                    }),
                Actions\Action::make('convertToBl')
                    ->label('Transformer en Bon de Livraison')
                    ->icon('heroicon-o-document-text')
                    ->requiresConfirmation()
                    ->modalHeading('Convertir en Bon de Livraison ?')
                    ->modalDescription('Un nouveau BL sera créé à partir de ce devis.')
                    ->modalSubmitActionLabel('Confirmer')
                    ->modalCancelActionLabel('Annuler')
                    ->action(function (QuotationConversionService $service) {
                        $bl = $service->convertToBl($this->record);
                        Notification::make()->title('BL #' . $bl->numero . ' créé.')->success()->send();
                        $this->redirect(FactureResource::getUrl('edit', ['record' => $bl]));
                    }),
            ])
            ->label('Transformer en…')
            ->icon('heroicon-o-arrow-path')
            ->color('success')
            ->dropdownPlacement('bottom-start'),

            // Envoyer par email (Modal)
            Actions\Action::make('envoyer_email')
                ->label('Envoyer')
                ->icon('heroicon-o-paper-airplane')
                ->color('primary')
                ->form([
                    \Filament\Forms\Components\TextInput::make('email')
                        ->label('Adresse Email')
                        ->email()
                        ->required()
                        ->default(fn () => $this->record->client?->email ?? ''),
                    \Filament\Forms\Components\Textarea::make('message')
                        ->label('Message optionnel')
                        ->rows(3)
                        ->default("Bonjour,\n\nVeuillez trouver ci-joint notre devis.\n\nCordialement,")
                ])
                ->modalHeading('Envoyer le Devis par Email')
                ->modalDescription('Le devis sera généré en PDF et envoyé en pièce jointe.')
                ->modalSubmitActionLabel('Envoyer maintenant')
                ->action(function (array $data) {
                    try {
                        \Illuminate\Support\Facades\Mail::to($data['email'])->send(
                            new \App\Mail\QuotationSent($this->record, $data['message'])
                        );
                        Notification::make()
                            ->title('Email envoyé avec succès !')
                            ->success()
                            ->send();
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::error('Failed to send quotation', ['error' => $e->getMessage()]);
                        Notification::make()
                            ->title('Erreur lors de l\'envoi')
                            ->body('Vérifiez la configuration SMTP.')
                            ->danger()
                            ->send();
                    }
                }),

            // Imprimer — new tab (safest in SPA mode)
            Actions\Action::make('imprimer')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->color('gray')
                ->url(fn () => route('quotations.print', ['quotation' => $this->record->id]))
                ->openUrlInNewTab(),

            // More actions
            ActionGroup::make([
                Actions\DeleteAction::make()
                    ->label('Supprimer ce devis')
                    ->modalHeading('Supprimer le devis ?')
                    ->modalDescription('Cette action est irréversible.')
                    ->modalSubmitActionLabel('Oui, supprimer')
                    ->modalCancelActionLabel('Annuler'),
            ])->label('Autres actions')->icon('heroicon-o-ellipsis-vertical'),
        ];
    }

    /**
     * Native Filament form footer actions with French labels.
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
