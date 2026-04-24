<?php

namespace App\Filament\Resources\PartnerPayoutResource\Pages;

use App\Filament\Resources\PartnerPayoutResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListPartnerPayouts extends ListRecords
{
    protected static string $resource = PartnerPayoutResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }
}
