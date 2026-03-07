<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Resources\ProductResource;
use Filament\Resources\Pages\CreateRecord;

class CreateProduct extends CreateRecord
{
    protected static string $resource = ProductResource::class;

    /**
     * When rupture is true, force qte = 0 so it persists on create.
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        if (! empty($data['rupture'])) {
            $data['qte'] = 0;
        }
        return $data;
    }
}
