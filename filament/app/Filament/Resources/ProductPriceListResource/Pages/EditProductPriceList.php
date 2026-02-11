<?php

namespace App\Filament\Resources\ProductPriceListResource\Pages;

use App\Filament\Resources\ProductPriceListResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditProductPriceList extends EditRecord
{
    protected static string $resource = ProductPriceListResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
