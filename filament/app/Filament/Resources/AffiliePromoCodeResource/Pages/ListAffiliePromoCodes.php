<?php

namespace App\Filament\Resources\AffiliePromoCodeResource\Pages;

use App\Filament\Resources\AffiliePromoCodeResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListAffiliePromoCodes extends ListRecords
{
    protected static string $resource = AffiliePromoCodeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
