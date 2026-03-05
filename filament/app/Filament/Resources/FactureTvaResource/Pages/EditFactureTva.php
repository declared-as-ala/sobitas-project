<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Enums\PaymentStatus;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Mail\FactureTvaSent;
use App\Models\DetailsFactureTva;
use App\Models\Product;
use App\Services\InvoiceCalculator;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class EditFactureTva extends EditRecord
{
    protected static string $resource = FactureTvaResource::class;

    public function getHeaderWidgets(): array
    {
        return [DocumentTimelineWidget::class];
    }

    public function getPageClasses(): array
    {
        return array_merge(parent::getPageClasses(), ['fi-page-edit-facture-tva']);
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
            Notification::make()->title('Aucun produit trouvé pour ce code')->warning()->send();
            return;
        }
        $state = $this->form->getState();
        $details = $state['details'] ?? [];
        $details[] = [
            'produit_id' => $product->id,
            'qte' => 1,
            'prix_unitaire' => (float) ($product->prix ?? 0),
            'tva_pct' => $this->record->details->first()?->tva ?? 19,
        ];
        $this->form->fill(array_merge($state, ['details' => $details]));
    }

    public function getHeading(): string
    {
        return 'Facture #' . $this->record->numero;
    }

    public function getSubheading(): ?\Illuminate\Contracts\Support\Htmlable
    {
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        
        // Use the calculator for the header too, ensuring parity with the totals panel
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        $details = $this->record->details->map(fn ($d) => [
            'qte' => $d->qte ?? $d->quantite ?? 1,
            'prix_unitaire' => $d->prix_unitaire ?? 0,
            'tva_pct' => $d->tva ?? $defaultTva,
        ])->toArray();
        
        $calc = InvoiceCalculator::calculate(
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

        if (Schema::hasColumn('facture_tvas', 'facture_id') && $this->record->facture_id) {
            $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">BL : #' . e($this->record->facture?->numero) . '</span>';
        }

        if (Schema::hasTable('payments')) {
            $paid = (float) $this->record->payments()->where('status', PaymentStatus::Succeeded)->sum('amount');
            if ($paid > 0) {
                $html .= '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">Encaissé : ' . number_format($paid, 3, ',', ' ') . ' DT</span>';
            }
        }

        $html .= '</div>';

        return new \Illuminate\Support\HtmlString($html);
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['client_adresse'] = $this->record->client?->adresse ?? '';
        $data['client_phone'] = $this->record->client?->phone_1 ?? '';
        $data['client_email'] = $this->record->client?->email ?? '';
        $data['numero_display'] = $this->record->numero ?? '';
        $data['resume_date_display'] = $this->record->date_facture
            ? $this->record->date_facture->format('d/m/Y')
            : ($this->record->created_at?->format('d/m/Y') ?? '');
        $data['resume_statut_display'] = 'Validée';
        $data['details'] = $this->record->details->map(fn ($d) => [
            'produit_id' => $d->produit_id,
            'qte' => $d->qte ?? $d->quantite ?? 0,
            'prix_unitaire' => $d->prix_unitaire,
            'tva_pct' => $d->tva ?? 19,
        ])->toArray();
        if (empty($data['details'])) {
            $data['details'] = [['produit_id' => null, 'qte' => 1, 'prix_unitaire' => 0, 'tva_pct' => 19]];
        }
        
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $remise = (float) ($this->record->remise ?? 0);
        $timbre = (float) ($this->record->timbre ?? 0);
        
        $totals = InvoiceCalculator::calculate($data['details'], $remise, $timbre, $defaultTva);

        if (\Illuminate\Support\Facades\Schema::hasColumn('facture_tvas', 'pourcentage_remise')) {
            $data['pourcentage_remise'] = $totals['pourcentage_remise'];
        }
        
        $data['remise'] = $totals['remise'];
        $data['timbre'] = $totals['timbre'];
        $data['prix_ht'] = $totals['total_ht_brut'];
        $data['prix_ht_apres_remise'] = $totals['prix_ht_apres_remise'];
        $data['tva'] = $totals['tva'];
        $data['prix_ttc'] = $totals['prix_ttc'];
        $data['net_a_payer'] = $totals['net_a_payer'];
        
        return $data;
    }

    protected function afterSave(): void
    {
        foreach ($this->record->details as $old) {
            Product::where('id', $old->produit_id)->increment('qte', $old->qte ?? $old->quantite ?? 0);
        }
        $this->record->details()->delete();
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        $details = $this->form->getState()['details'] ?? [];
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            $tvaPct = (float) ($row['tva_pct'] ?? $defaultTva);
            $prixHt = $qte * $prixUnitaire;
            $tvaAmount = $prixHt * $tvaPct / 100;
            DetailsFactureTva::create([
                'facture_tva_id' => $this->record->id,
                'produit_id' => $row['produit_id'],
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ht' => $prixHt,
                'tva' => $tvaPct,
                'prix_ttc' => $prixHt + $tvaAmount,
            ]);
            Product::where('id', $row['produit_id'])->decrement('qte', $qte);
        }

        $state = $this->form->getState();
        $remise = (float) ($state['remise'] ?? 0);
        $timbre = (float) ($state['timbre'] ?? 0);
        $calcTotals = InvoiceCalculator::calculate($details, $remise, $timbre, $defaultTva);

        $totals = [
            'prix_ht' => $calcTotals['total_ht_brut'],
            'remise' => $calcTotals['remise'],
            'tva' => $calcTotals['tva'],
            'timbre' => $calcTotals['timbre'],
            'prix_ttc' => $calcTotals['prix_ttc'],
        ];
        
        if (\Illuminate\Support\Facades\Schema::hasColumn('facture_tvas', 'prix_ht_apres_remise')) {
            $totals['prix_ht_apres_remise'] = $calcTotals['prix_ht_apres_remise'];
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('facture_tvas', 'pourcentage_remise')) {
            $totals['pourcentage_remise'] = $calcTotals['pourcentage_remise'];
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('facture_tvas', 'net_a_payer')) {
            $totals['net_a_payer'] = $calcTotals['net_a_payer'];
        }
        $this->record->update($totals);
    }

    protected function getFormActions(): array
    {
        return [
            $this->getSaveFormAction()->label('Enregistrer les modifications')->icon('heroicon-o-check'),
            $this->getCancelFormAction()->label('Annuler'),
        ];
    }

    protected function getHeaderActions(): array
    {
        $pdfUrl = route('facture-tvas.download', ['factureTva' => $this->record->id]);
        $printUrl = route('facture-tvas.print', ['factureTva' => $this->record->id]);

        return array_merge(parent::getHeaderActions(), [
            Actions\Action::make('send')
                ->label('Envoyer')
                ->icon('heroicon-o-paper-airplane')
                ->color('primary')
                ->modalHeading('Envoyer la facture')
                ->modalSubmitActionLabel('Envoyer')
                ->modalCancelActionLabel('Annuler')
                ->modalAutofocus()
                ->form([
                    Forms\Components\TextInput::make('email')
                        ->label('Email')
                        ->email()
                        ->required()
                        ->default(fn () => $this->record->client?->email ?? '')
                        ->rule('email'),
                ])
                ->action(function (array $data) {
                    $email = trim((string) ($data['email'] ?? ''));
                    if ($email === '') {
                        throw ValidationException::withMessages(['email' => ['L\'adresse email est requise.']]);
                    }
                    try {
                        Mail::to($email)->send(new FactureTvaSent($this->record));
                        Log::info('FactureTva sent by email', [
                            'facture_tva_id' => $this->record->id,
                            'numero' => $this->record->numero,
                            'to' => $email,
                            'ok' => true,
                        ]);
                        Notification::make()
                            ->title('Facture envoyée par email.')
                            ->success()
                            ->send();
                    } catch (\Throwable $e) {
                        Log::error('FactureTva send email failed', [
                            'facture_tva_id' => $this->record->id,
                            'error' => $e->getMessage(),
                        ]);
                        Notification::make()
                            ->title('Erreur lors de l\'envoi de l\'email.')
                            ->body($e->getMessage())
                            ->danger()
                            ->send();
                        throw $e;
                    }
                }),
            Actions\Action::make('print')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->url($printUrl)
                ->openUrlInNewTab(),
            ActionGroup::make([
                Actions\DeleteAction::make(),
            ])->label('')->icon('heroicon-o-ellipsis-vertical'),
        ]);
    }
}
