<?php

namespace App\Filament\Resources\ProductPriceListResource\Pages;

use App\Filament\Resources\ProductPriceListResource;
use App\Models\Product;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;

class CreateProductPriceList extends CreateRecord
{
    protected static string $resource = ProductPriceListResource::class;

    public function getMaxContentWidth(): \Filament\Support\Enums\Width|string|null
    {
        return \Filament\Support\Enums\Width::Full;
    }

    /**
     * Called from the barcode scanner input via Alpine.js / $wire.
     */
    public function addProductByBarcode(string $code): void
    {
        $code = trim($code);
        if ($code === '') {
            return;
        }

        $product = Product::where(function ($q) use ($code) {
            $q->where('code_product', $code)
              ->orWhere('code_product', '0' . $code);
        })->first();

        if (! $product) {
            Notification::make()->title('Aucun produit trouvé')->warning()->send();
            return;
        }

        $state   = $this->form->getState();
        $details = $state['details'] ?? [];

        $details[] = [
            'produit_id'  => $product->id,
            'prix_unitaire' => $product->prix ?? 0,
            'prix_gros'   => 0,
            '_code_barre' => $product->code_product ?? '',
        ];

        $this->form->fill(array_merge($state, ['details' => $details]));
    }

    /**
     * After create → redirect directly to the print page (matches Voyager behavior).
     */
    protected function getRedirectUrl(): string
    {
        return route('product-price-lists.print', $this->record->id);
    }
}
