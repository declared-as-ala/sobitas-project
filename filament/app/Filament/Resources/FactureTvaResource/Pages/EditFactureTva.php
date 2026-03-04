<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Enums\PaymentStatus;
use App\Filament\Resources\CreditNoteResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Mail\InvoiceMail;
use App\Models\DetailsFactureTva;
use App\Models\Product;
use App\Models\FactureTva;
use App\Models\Coordinate;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

class EditFactureTva extends EditRecord
{
    protected static string $resource = FactureTvaResource::class;

    /**
     * Disable sticky page header for this page.
     * Filament 4: set this property to prevent the header from sticking.
     */
    protected bool $hasStickyHeader = false;

    public function getHeaderWidgets(): array
    {
        return [DocumentTimelineWidget::class];
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
        $state   = $this->form->getState();
        $details = $state['details'] ?? [];
        $details[] = [
            'produit_id'    => $product->id,
            'qte'           => 1,
            'prix_unitaire' => (float) ($product->prix ?? 0),
            'tva_pct'       => $this->record->details->first()?->tva ?? 19,
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
        $date   = $this->record->created_at?->format('d/m/Y') ?? '—';
        $total  = number_format((float) ($this->record->prix_ttc ?? 0), 3, ',', ' ') . ' TND';
        $parts  = ["Client : {$client}", "Date : {$date}", "Total : {$total}"];

        if (Schema::hasColumn('facture_tvas', 'facture_id') && $this->record->facture_id) {
            $parts[] = 'BL : #' . $this->record->facture?->numero;
        }
        if (Schema::hasTable('payments')) {
            $paid = (float) $this->record->payments()
                ->where('status', PaymentStatus::Succeeded)
                ->sum('amount');
            if ($paid > 0) {
                $parts[] = 'Encaissé : ' . number_format($paid, 3, ',', ' ') . ' DT';
            }
        }

        return implode(' · ', $parts);
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['client_adresse'] = $this->record->client?->adresse ?? '';
        $data['client_phone']   = $this->record->client?->phone_1 ?? '';
        $data['client_email']   = $this->record->client?->email ?? '';
        $data['details']        = $this->record->details->map(fn ($d) => [
            'produit_id'    => $d->produit_id,
            'qte'           => $d->qte ?? $d->quantite ?? 0,
            'prix_unitaire' => $d->prix_unitaire,
            'tva_pct'       => $d->tva ?? 19,
        ])->toArray();
        if (empty($data['details'])) {
            $data['details'] = [['produit_id' => null, 'qte' => 1, 'prix_unitaire' => 0, 'tva_pct' => 19]];
        }
        return $data;
    }

    protected function afterSave(): void
    {
        foreach ($this->record->details as $old) {
            Product::where('id', $old->produit_id)->increment('qte', $old->qte ?? $old->quantite ?? 0);
        }
        $this->record->details()->delete();

        $coordinate = Coordinate::getCached();
        $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
        $details    = $this->form->getState()['details'] ?? [];

        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte          = (int) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            $tvaPct       = (float) ($row['tva_pct'] ?? $defaultTva);
            $prixHt       = $qte * $prixUnitaire;
            $tvaAmount    = $prixHt * $tvaPct / 100;
            DetailsFactureTva::create([
                'facture_tva_id' => $this->record->id,
                'produit_id'     => $row['produit_id'],
                'qte'            => $qte,
                'prix_unitaire'  => $prixUnitaire,
                'prix_ht'        => $prixHt,
                'tva'            => $tvaPct,
                'prix_ttc'       => $prixHt + $tvaAmount,
            ]);
            Product::where('id', $row['produit_id'])->decrement('qte', $qte);
        }
    }

    protected function getHeaderActions(): array
    {
        return [
            // ── Envoyer (email with PDF) ──────────────────────────────────
            Actions\Action::make('envoyer')
                ->label('Envoyer')
                ->icon('heroicon-o-paper-airplane')
                ->color('warning')
                ->requiresConfirmation()
                ->modalHeading('Envoyer la facture par email')
                ->modalDescription(fn () => 'Envoyer la facture #' . $this->record->numero . ' au client par email avec le PDF en pièce jointe.')
                ->modalSubmitActionLabel('Envoyer')
                ->modalCancelActionLabel('Annuler')
                ->action(function () {
                    $record = $this->record->load('client');
                    $client = $record->client;

                    if (! $client) {
                        Notification::make()
                            ->title('Aucun client associé à cette facture.')
                            ->danger()
                            ->send();
                        return;
                    }

                    if (empty($client->email)) {
                        Notification::make()
                            ->title('Le client n\'a pas d\'email enregistré.')
                            ->body('Veuillez d\'abord ajouter un email au client "' . $client->name . '".')
                            ->danger()
                            ->actions([
                                \Filament\Notifications\Actions\Action::make('edit_client')
                                    ->label('Modifier le client')
                                    ->url(\App\Filament\Resources\ClientResource::getUrl('edit', ['record' => $client]))
                                    ->openUrlInNewTab(),
                            ])
                            ->send();
                        return;
                    }

                    try {
                        Mail::to($client->email)->send(new InvoiceMail($record));

                        Log::channel('single')->info('Facture TVA envoyée par email', [
                            'facture_id' => $record->id,
                            'numero'     => $record->numero,
                            'to'         => $client->email,
                            'at'         => now()->toDateTimeString(),
                        ]);

                        Notification::make()
                            ->title('Facture envoyée avec succès !')
                            ->body('Email envoyé à ' . $client->email)
                            ->success()
                            ->send();
                    } catch (\Throwable $e) {
                        Log::error('Erreur envoi Facture TVA #' . $record->numero, [
                            'error' => $e->getMessage(),
                        ]);
                        Notification::make()
                            ->title('Erreur lors de l\'envoi.')
                            ->body($e->getMessage())
                            ->danger()
                            ->send();
                    }
                }),

            // ── PDF download ─────────────────────────────────────────────
            Actions\Action::make('pdf')
                ->label('PDF')
                ->icon('heroicon-o-arrow-down-tray')
                ->color('gray')
                ->url(fn () => route('facture-tvas.download', ['factureTva' => $this->record->id]))
                ->openUrlInNewTab(),

            // ── Imprimer (new tab, auto window.print()) ──────────────────
            Actions\Action::make('imprimer')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->color('gray')
                ->url(fn () => route('facture-tvas.print', ['factureTva' => $this->record->id]))
                ->openUrlInNewTab(),

            // ── More actions ─────────────────────────────────────────────
            ActionGroup::make([
                Actions\DeleteAction::make()
                    ->label('Supprimer cette facture')
                    ->modalHeading('Supprimer la facture TVA ?')
                    ->modalDescription('Cette action est irréversible.')
                    ->modalSubmitActionLabel('Oui, supprimer')
                    ->modalCancelActionLabel('Annuler'),
            ])->label('')->icon('heroicon-o-ellipsis-vertical')->color('gray'),
        ];
    }

    /**
     * Footer: localized save + cancel labels, orange save button.
     */
    protected function getFormActions(): array
    {
        return [
            $this->getSaveFormAction()
                ->label('Enregistrer les modifications')
                ->icon('heroicon-o-check-circle'),
            $this->getCancelFormAction()
                ->label('Annuler')
                ->icon('heroicon-o-x-circle'),
        ];
    }
}
