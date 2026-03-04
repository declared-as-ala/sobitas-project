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

    public function getSubheading(): ?string
    {
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        $total = number_format((float) ($this->record->prix_ttc ?? 0), 3, ',', ' ') . ' TND';
        $parts = ["Client : {$client}", "Date : {$date}", "Total : {$total}"];
        if (Schema::hasColumn('facture_tvas', 'facture_id') && $this->record->facture_id) {
            $parts[] = 'BL : #' . $this->record->facture?->numero;
        }
        if (Schema::hasTable('payments')) {
            $paid = (float) $this->record->payments()->where('status', PaymentStatus::Succeeded)->sum('amount');
            if ($paid > 0) {
                $parts[] = 'Encaissé : ' . number_format($paid, 3, ',', ' ') . ' DT';
            }
        }

        return implode(' · ', $parts);
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
        
        $coordinate = \App\Models\Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        
        $totalHt = 0.0;
        $totalTva = 0.0;
        foreach ($data['details'] as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            $tvaPct = (float) ($row['tva_pct'] ?? $defaultTva);
            $ht = $qte * $prixUnitaire;
            $totalHt += $ht;
            $totalTva += $ht * $tvaPct / 100;
        }

        $remise = max(0, (float) ($this->record->remise ?? 0));
        $remise = min($remise, $totalHt);
        $timbre = max(0, (float) ($this->record->timbre ?? 0));
        
        $htApresRemise = round($totalHt - $remise, 3);
        $tvaApresRemise = $totalHt > 0 ? round($totalTva - ($totalTva * $remise / $totalHt), 3) : 0.0;
        $net = round($htApresRemise + $tvaApresRemise + $timbre, 3);
        $pourcentageRemise = $totalHt > 0 ? round($remise / $totalHt * 100, 2) : 0;

        if (\Illuminate\Support\Facades\Schema::hasColumn('facture_tvas', 'pourcentage_remise')) {
            $data['pourcentage_remise'] = $pourcentageRemise;
        }
        
        $data['remise'] = $remise;
        $data['timbre'] = $timbre;
        $data['prix_ht'] = round($totalHt, 3);
        $data['prix_ht_apres_remise'] = $htApresRemise;
        $data['tva'] = $tvaApresRemise;
        $data['prix_ttc'] = round($htApresRemise + $tvaApresRemise, 3);
        $data['net_a_payer'] = $net;
        
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
        $totalHt = 0.0;
        $totalTva = 0.0;
        
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            $tvaPct = (float) ($row['tva_pct'] ?? $defaultTva);
            $ht = $qte * $prixUnitaire;
            $totalHt += $ht;
            $totalTva += $ht * $tvaPct / 100;
        }

        $remise = max(0, (float) ($state['remise'] ?? 0));
        $remise = min($remise, $totalHt);
        $timbre = max(0, (float) ($state['timbre'] ?? 0));
        
        $htApresRemise = round($totalHt - $remise, 3);
        $tvaApresRemise = $totalHt > 0 ? round($totalTva - ($totalTva * $remise / $totalHt), 3) : 0.0;
        $net = round($htApresRemise + $tvaApresRemise + $timbre, 3);
        $pourcentageRemise = $totalHt > 0 ? round($remise / $totalHt * 100, 2) : 0;

        $totals = [
            'prix_ht' => round($totalHt, 3),
            'remise' => $remise,
            'tva' => $tvaApresRemise,
            'timbre' => $timbre,
            'prix_ttc' => round($htApresRemise + $tvaApresRemise, 3),
        ];
        if (\Illuminate\Support\Facades\Schema::hasColumn('facture_tvas', 'prix_ht_apres_remise')) {
            $totals['prix_ht_apres_remise'] = $htApresRemise;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('facture_tvas', 'pourcentage_remise')) {
            $totals['pourcentage_remise'] = $pourcentageRemise;
        }
        if (\Illuminate\Support\Facades\Schema::hasColumn('facture_tvas', 'net_a_payer')) {
            $totals['net_a_payer'] = $net;
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
