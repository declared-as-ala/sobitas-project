<?php

namespace App\Filament\Resources\PartnerPromoCodeResource\Pages;

use App\Filament\Resources\PartnerPromoCodeResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListPartnerPromoCodes extends ListRecords
{
    protected static string $resource = PartnerPromoCodeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
