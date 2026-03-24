<?php

namespace App\Filament\Resources\ProductPriceListResource\Pages;

use App\Filament\Resources\ProductPriceListResource;
use App\Models\DetailsProductPriceList;
use Filament\Resources\Pages\CreateRecord;

class CreateProductPriceList extends CreateRecord
{
    protected static string $resource = ProductPriceListResource::class;

    public function getMaxContentWidth(): \Filament\Support\Enums\Width|string|null
    {
        return \Filament\Support\Enums\Width::Full;
    }

    public function save(bool $shouldRedirect = true, bool $shouldSendSavedNotification = true): void
    {
        $this->create();
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        unset($data['details']);
        return $data;
    }

    protected function afterCreate(): void
    {
        $details = $this->form->getState()['details'] ?? [];
        if (is_string($details)) {
            $details = json_decode($details, true) ?? [];
        }

        foreach ($details as $row) {
            $productId = $row['produit_id'] ?? $row['product_id'] ?? null;
            if (empty($productId)) {
                continue;
            }
            DetailsProductPriceList::create([
                'product_price_list_id' => $this->record->id,
                'product_id'            => (int) $productId,
                'prix_unitaire'         => (float) ($row['prix_unitaire'] ?? 0),
                'prix_gros'             => (float) ($row['prix_gros'] ?? 0),
            ]);
        }
    }

    protected function getRedirectUrl(): string
    {
        return route('product-price-lists.print', $this->record->id);
    }
}
