<?php

namespace App\Filament\Resources\ProductPriceListResource\Pages;

use App\Filament\Resources\ProductPriceListResource;
use App\Models\DetailsProductPriceList;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditProductPriceList extends EditRecord
{
    protected static string $resource = ProductPriceListResource::class;

    public function getMaxContentWidth(): \Filament\Support\Enums\Width|string|null
    {
        return \Filament\Support\Enums\Width::Full;
    }

    /**
     * Populate `details` hidden field from the relationship so the custom
     * blade view can hydrate the product rows on edit.
     */
    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['details'] = $this->record->details->map(fn ($d) => [
            'produit_id'    => $d->produit_id,
            'prix_unitaire' => $d->prix_unitaire,
            'prix_gros'     => $d->prix_gros ?? 0,
        ])->toArray();

        return $data;
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        unset($data['details']);
        return $data;
    }

    protected function afterSave(): void
    {
        $details = $this->form->getState()['details'] ?? [];
        if (is_string($details)) {
            $details = json_decode($details, true) ?? [];
        }

        $this->record->details()->delete();

        foreach ($details as $row) {
            if (empty($row['produit_id'])) {
                continue;
            }
            DetailsProductPriceList::create([
                'product_price_list_id' => $this->record->id,
                'produit_id'            => $row['produit_id'],
                'prix_unitaire'         => (float) ($row['prix_unitaire'] ?? 0),
                'prix_gros'             => (float) ($row['prix_gros'] ?? 0),
            ]);
        }
    }

    protected function getRedirectUrl(): string
    {
        return route('product-price-lists.print', $this->record->id);
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('print')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->color('warning')
                ->url(route('product-price-lists.print', $this->record->id))
                ->openUrlInNewTab(),
            Actions\DeleteAction::make(),
        ];
    }
}
