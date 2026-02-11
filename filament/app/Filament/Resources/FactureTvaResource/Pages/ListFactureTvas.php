<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Filament\Resources\FactureTvaResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListFactureTvas extends ListRecords
{
    protected static string $resource = FactureTvaResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }
}
