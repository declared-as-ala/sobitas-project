<?php

namespace App\Filament\Resources\ProductPriceListResource\Pages;

use App\Filament\Resources\ProductPriceListResource;
use App\Models\DetailsProductPriceList;
use Filament\Resources\Pages\CreateRecord;
use Filament\Support\Enums\Width;

class CreateProductPriceList extends CreateRecord
{
    protected static string $resource = ProductPriceListResource::class;

    public function getMaxContentWidth(): Width|string|null
    {
        return Width::Full;
    }

    public function getPageClasses(): array
    {
        return array_merge(parent::getPageClasses(), ['fi-page-edit-product-price-list']);
    }

    public function save(bool $shouldRedirect = true, bool $shouldSendSavedNotification = true): void
    {
        $this->create();
    }

    protected function getFormActions(): array
    {
        return [];
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

        $this->dispatch('open-url-new-tab', url: route('product-price-lists.print', $this->record->id));
    }
}
