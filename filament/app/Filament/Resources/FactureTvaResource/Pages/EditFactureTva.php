<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Filament\Resources\FactureTvaResource;
use App\Filament\Widgets\DocumentTimelineWidget;
use App\Models\DetailsFactureTva;
use App\Models\Product;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

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

    public function getTitle(): string
    {
        $num = $this->record?->numero ?? '—';
        return "Facture #{$num}";
    }

    public function getHeading(): string
    {
        return $this->getTitle();
    }

    public function getSubheading(): ?string
    {
        $client = $this->record?->client?->name ?? '—';
        $date = optional($this->record?->created_at)->format('d/m/Y') ?? '—';
        $total = number_format((float) ($this->record?->prix_ttc ?? 0), 3, '.', ' ') . ' TND';

        return "Client : {$client} · Date : {$date} · Total : {$total}";
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
        return [
            Actions\Action::make('cancel')
                ->label('Annuler')
                ->color('gray')
                ->url($this->getResource()::getUrl('index')),

            Actions\Action::make('save')
                ->label('Enregistrer')
                ->color('primary')
                ->action('save'),
        ];
    }
}
