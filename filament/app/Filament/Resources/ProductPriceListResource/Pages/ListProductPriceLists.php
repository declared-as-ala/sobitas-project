<?php

namespace App\Filament\Resources\ProductPriceListResource\Pages;

use App\Filament\Resources\ProductPriceListResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListProductPriceLists extends ListRecords
{
    protected static string $resource = ProductPriceListResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
