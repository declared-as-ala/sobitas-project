<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Enums\PaymentStatus;
use App\Filament\Resources\CreditNoteResource;
use App\Filament\Resources\FactureTvaResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Models\DetailsFactureTva;
use App\Models\Product;
use App\Services\PaymentService;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Forms;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

class EditFactureTva extends EditRecord
{
    protected static string $resource = FactureTvaResource::class;

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
        $data['details'] = $this->record->details->map(fn ($d) => [
            'produit_id' => $d->produit_id,
            'qte' => $d->qte ?? $d->quantite ?? 0,
            'prix_unitaire' => $d->prix_unitaire,
            'tva_pct' => $d->tva ?? 19,
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
    }

    protected function getHeaderActions(): array
    {
        return array_merge(parent::getHeaderActions(), [
            Actions\Action::make('recordPayment')
                ->label('Enregistrer paiement')
                ->icon('heroicon-o-banknotes')
                ->color('success')
                ->form([
                    Forms\Components\TextInput::make('amount')
                        ->label('Montant (DT)')
                        ->numeric()
                        ->required()
                        ->minValue(0.001)
                        ->default(fn () => (float) ($this->record->prix_ttc ?? $this->record->prix_total ?? 0)),
                    Forms\Components\Select::make('method')
                        ->label('Méthode')
                        ->options([
                            'COD' => 'Espèces / COD',
                            'Stripe' => 'Stripe',
                            'PayPal' => 'PayPal',
                            'Virement' => 'Virement',
                            'Chèque' => 'Chèque',
                        ])
                        ->default('COD')
                        ->required(),
                    Forms\Components\TextInput::make('provider_ref')
                        ->label('Référence (optionnel)')
                        ->placeholder('ID transaction'),
                    Forms\Components\DateTimePicker::make('paid_at')
                        ->label('Date de paiement')
                        ->default(now()),
                ])
                ->action(function (array $data, PaymentService $service) {
                    $service->recordPayment(
                        $this->record,
                        (float) $data['amount'],
                        $data['method'],
                        $data['provider_ref'] ?? null,
                        $data['paid_at'] ?? null
                    );
                    Notification::make()->title('Paiement enregistré')->success()->send();
                    $this->refreshFormData(['status']);
                }),
            Actions\Action::make('createCreditNote')
                ->label('Créer un avoir')
                ->icon('heroicon-o-document-minus')
                ->visible(fn () => Route::has('filament.admin.resources.credit-notes.create'))
                ->url(fn () => Route::has('filament.admin.resources.credit-notes.create')
                    ? CreditNoteResource::getUrl('create') . '?facture_tva_id=' . $this->record->id
                    : '#'),
            ActionGroup::make([
                Actions\Action::make('print')
                    ->label('Imprimer')
                    ->icon('heroicon-o-printer')
                    ->modalHeading('Aperçu d\'impression')
                    ->modalContent(fn () => view('filament.components.print-modal', [
                        'printUrl' => route('facture-tvas.print', ['factureTva' => $this->record->id]),
                        'title' => 'Facture ' . $this->record->numero,
                    ]))
                    ->modalSubmitAction(false),
                Actions\DeleteAction::make(),
            ])->label('Autres actions')->icon('heroicon-o-ellipsis-vertical'),
        ]);
    }
}
