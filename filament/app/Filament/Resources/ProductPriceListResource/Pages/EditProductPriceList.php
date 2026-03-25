<?php

namespace App\Filament\Resources\ProductPriceListResource\Pages;

use App\Filament\Resources\ProductPriceListResource;
use App\Models\DetailsProductPriceList;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Enums\Width;

class EditProductPriceList extends EditRecord
{
    protected static string $resource = ProductPriceListResource::class;

    public function getMaxContentWidth(): Width|string|null
    {
        return Width::Full;
    }

    /**
     * Same layout class as BL / Devis / Facture so shared doc-edit.css topbar rules apply.
     */
    public function getPageClasses(): array
    {
        return array_merge(parent::getPageClasses(), ['fi-page-edit-product-price-list']);
    }

    /**
     * Populate `details` hidden field from the relationship so the custom
     * blade view can hydrate the product rows on edit.
     */
    protected function mutateFormDataBeforeFill(array $data): array
    {
        $this->record->loadMissing('details');

        $data['details'] = $this->record->details->map(fn ($d) => [
            'produit_id'    => $d->product_id,
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

    protected function getFormActions(): array
    {
        return [
            $this->getCancelFormAction()->label('Annuler'),
        ];
    }

    protected function afterSave(): void
    {
        $details = $this->form->getState()['details'] ?? [];
        if (is_string($details)) {
            $details = json_decode($details, true) ?? [];
        }

        $this->record->details()->delete();

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
