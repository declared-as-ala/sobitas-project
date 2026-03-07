<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Resources\ProductResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditProduct extends EditRecord
{
    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    /**
     * Ensure qte and rupture are persisted correctly: when rupture is true, qte must be 0.
     * (qte is dehydrated even when disabled so it is sent; this is a safety net.)
     */
    protected function mutateFormDataBeforeSave(array $data): array
    {
        if (! empty($data['rupture'])) {
            $data['qte'] = 0;
        }
        return $data;
    }
}
