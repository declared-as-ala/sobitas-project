<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Enums\PaymentStatus;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Mail\FactureTvaSent;
use App\Models\DetailsFactureTva;
use App\Models\Product;
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

    public function getSubheading(): \Illuminate\Contracts\Support\Htmlable | string | null
    {
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        $total = number_format((float) ($this->record->prix_ttc ?? 0), 3, ',', ' ') . ' TND';
        
        $html = '<div class="flex flex-wrap items-center gap-2 mt-1">';
        $html .= '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400 ring-1 ring-inset ring-primary-600/20"><x-filament::icon icon="heroicon-m-user" class="h-4 w-4" /> ' . e($client) . '</span>';
        $html .= '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-gray-50 text-gray-700 dark:bg-white/10 dark:text-gray-300 ring-1 ring-inset ring-gray-600/20"><x-filament::icon icon="heroicon-m-calendar" class="h-4 w-4" /> ' . $date . '</span>';
        $html .= '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400 ring-1 ring-inset ring-success-600/20"><x-filament::icon icon="heroicon-m-currency-dollar" class="h-4 w-4" /> ' . $total . '</span>';
        
        if (Schema::hasColumn('facture_tvas', 'facture_id') && $this->record->facture_id) {
            $html .= '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-gray-50 text-gray-700 dark:bg-white/10 dark:text-gray-300 ring-1 ring-inset ring-gray-600/20"><x-filament::icon icon="heroicon-m-document-duplicate" class="h-4 w-4" /> BL: #' . $this->record->facture?->numero . '</span>';
        }
        
        if (Schema::hasTable('payments')) {
            $paid = (float) $this->record->payments()->where('status', PaymentStatus::Succeeded)->sum('amount');
            if ($paid > 0) {
                $html .= '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-info-50 text-info-700 dark:bg-info-500/10 dark:text-info-400 ring-1 ring-inset ring-info-600/20"><x-filament::icon icon="heroicon-m-check-circle" class="h-4 w-4" /> Encaissé : ' . number_format($paid, 3, ',', ' ') . ' DT</span>';
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
        $data['resume_statut_display'] = $this->record->status ? $this->record->status->label() : '';
        $data['details'] = $this->record->details->map(fn ($d) => [
            'produit_id' => $d->produit_id,
            'qte' => $d->qte ?? $d->quantite ?? 0,
            'prix_unitaire' => $d->prix_unitaire,
            'tva_pct' => $d->tva ?? 19,
        ])->toArray();
        if (empty($data['details'])) {
            $data['details'] = [['produit_id' => null, 'qte' => 1, 'prix_unitaire' => 0, 'tva_pct' => 19]];
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('facture_tvas', 'pourcentage_remise')) {
            $data['pourcentage_remise'] = $this->record->pourcentage_remise ?? 0;
        }
        $data['remise'] = (float) ($this->record->remise ?? 0);
        $data['timbre'] = (float) ($this->record->timbre ?? 0);
        $data['prix_ht'] = (float) ($this->record->prix_ht ?? 0);
        $data['prix_ht_apres_remise'] = (float) ($this->record->prix_ht_apres_remise ?? $this->record->prix_ht ?? 0);
        $data['tva'] = (float) ($this->record->tva ?? 0);
        $data['prix_ttc'] = (float) ($this->record->prix_ttc ?? 0);
        $data['net_a_payer'] = (float) ($this->record->net_a_payer ?? $this->record->prix_ttc ?? 0);
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
        $totals = [
            'prix_ht' => (float) ($state['prix_ht'] ?? 0),
            'remise' => (float) ($state['remise'] ?? 0),
            'tva' => (float) ($state['tva'] ?? 0),
            'timbre' => (float) ($state['timbre'] ?? 0),
            'prix_ttc' => (float) ($state['prix_ttc'] ?? 0),
        ];
        if (Schema::hasColumn('facture_tvas', 'prix_ht_apres_remise')) {
            $totals['prix_ht_apres_remise'] = (float) ($state['prix_ht_apres_remise'] ?? 0);
        }
        if (Schema::hasColumn('facture_tvas', 'pourcentage_remise')) {
            $totals['pourcentage_remise'] = (float) ($state['pourcentage_remise'] ?? 0);
        }
        if (Schema::hasColumn('facture_tvas', 'net_a_payer')) {
            $totals['net_a_payer'] = (float) ($state['net_a_payer'] ?? 0);
        }
        $this->record->update($totals);
    }

    protected function getRedirectUrl(): string
    {
        return static::getResource()::getUrl('index');
    }

    protected function getSavedNotification(): ?Notification
    {
        return Notification::make()
            ->success()
            ->title('Facture enregistrée')
            ->body('Les modifications ont été sauvegardées avec succès.');
    }

    protected function getFormActions(): array
    {
        return [
            $this->getSaveFormAction()
                ->label('Enregistrer les modifications')
                ->icon('heroicon-o-check'),
            $this->getCancelFormAction()
                ->label('Annuler')
                ->url(static::getResource()::getUrl('index')),
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
                ->action(function () use ($printUrl) {
                    $this->dispatch('open-url-new-tab', url: $printUrl);
                }),
            ActionGroup::make([
                Actions\DeleteAction::make(),
            ])->label('')->icon('heroicon-o-ellipsis-vertical'),
        ]);
    }
}
