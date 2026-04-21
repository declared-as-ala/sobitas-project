<?php

namespace App\Filament\Resources\ProductPriceListResource\Pages;

use App\Filament\Resources\ProductPriceListResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables;

class ListProductPriceLists extends ListRecords
{
    protected static string $resource = ProductPriceListResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Tables\Actions\CreateAction::make()
                ->modalHeading('Create Product Price List'),
        ];
    }
}
