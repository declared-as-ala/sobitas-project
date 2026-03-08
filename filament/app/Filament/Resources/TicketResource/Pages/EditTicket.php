<?php

namespace App\Filament\Resources\TicketResource\Pages;

use App\Filament\Resources\FactureTvaResource;
use App\Filament\Resources\TicketResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Models\DetailsTicket;
use App\Models\Ticket;
use App\Services\DocumentConversion\TicketToInvoiceService;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditTicket extends EditRecord
{
    protected static string $resource = TicketResource::class;

    public function getPageClasses(): array
    {
        return array_merge(parent::getPageClasses(), ['fi-page-edit-ticket']);
    }

    public function getHeaderWidgets(): array
    {
        return [DocumentTimelineWidget::class];
    }

    public function getHeading(): string
    {
        return 'Ticket #' . $this->record->numero;
    }

    public function getSubheading(): ?string
    {
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        $total = number_format((float) ($this->record->prix_ttc ?? 0), 2, ',', ' ') . ' TND';

        return "Client : {$client} · Date : {$date} · Total : {$total}";
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
            'prix_unitaire' => $product->getEffectiveUnitPrice(),
        ];
        $this->form->fill(array_merge($state, ['details' => $details]));
        $this->recalculateTotals();
    }

    public function recalculateTotals(): void
    {
        $state = $this->form->getState();
        $details = $state['details'] ?? [];
        $total = 0.0;
        foreach ($details as $d) {
            if (! empty($d['produit_id'])) {
                $total += (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
            }
        }
        $remiseAmount = (float) ($state['remise'] ?? 0);
        $remisePct = (float) ($state['pourcentage_remise'] ?? 0);
        if ($remisePct > 0 && $total > 0) {
            $remiseAmount = $total * $remisePct / 100;
        }
        $net = max(0, $total - $remiseAmount);
        $this->form->fill(array_merge($state, [
            'prix_ht' => $total,
            'prix_ttc' => $net,
        ]));
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['details'] = $this->record->details->map(fn ($d) => [
            'produit_id' => $d->produit_id,
            'qte' => (float) $d->qte,
            'prix_unitaire' => (float) ($d->prix_unitaire ?? 0),
        ])->toArray();
        if ($this->record->client_id && $this->record->client) {
            $data['client_adresse'] = $this->record->client->adresse ?? '';
            $data['client_phone'] = $this->record->client->phone_1 ?? '';
        }
        return $data;
    }

    protected function getFormActions(): array
    {
        return [
            $this->getSaveFormAction()->label('Enregistrer'),
            $this->getCancelFormAction()->label('Annuler'),
        ];
    }

    protected function afterSave(): void
    {
        $details = $this->form->getState()['details'] ?? [];
        $total = 0.0;
        foreach ($details as $d) {
            if (! empty($d['produit_id'])) {
                $total += (float) ($d['qte'] ?? 0) * (float) ($d['prix_unitaire'] ?? 0);
            }
        }
        $remiseAmount = (float) ($this->form->getState()['remise'] ?? 0);
        $remisePct = (float) ($this->form->getState()['pourcentage_remise'] ?? 0);
        if ($remisePct > 0 && $total > 0) {
            $remiseAmount = $total * $remisePct / 100;
        }
        $net = max(0, $total - $remiseAmount);

        $this->record->update([
            'prix_ht' => $total,
            'remise' => $remiseAmount,
            'prix_ttc' => $net,
        ]);

        $this->record->details()->delete();
        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            $qte = (float) ($row['qte'] ?? 1);
            $prixUnitaire = (float) ($row['prix_unitaire'] ?? 0);
            $lineTotal = $qte * $prixUnitaire;
            DetailsTicket::create([
                'ticket_id' => $this->record->id,
                'produit_id' => $row['produit_id'],
                'qte' => $qte,
                'prix_unitaire' => $prixUnitaire,
                'prix_ht' => $lineTotal,
                'prix_ttc' => $lineTotal,
            ]);
        }
    }

    protected function getHeaderActions(): array
    {
        return array_merge(parent::getHeaderActions(), [
            Actions\Action::make('print')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->modalHeading('Aperçu d\'impression')
                ->modalContent(fn () => view('filament.components.print-modal', [
                    'printUrl' => route('tickets.print', ['ticket' => $this->record->id]),
                    'title' => 'Ticket ' . $this->record->numero,
                    'documentType' => 'ticket',
                ]))
                ->modalSubmitAction(false),
            ActionGroup::make([
                Actions\DeleteAction::make(),
            ])->label('Autres actions')->icon('heroicon-o-ellipsis-vertical'),
        ]);
    }
}
