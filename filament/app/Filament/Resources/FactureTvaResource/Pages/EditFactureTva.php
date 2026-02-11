<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Filament\Resources\FactureTvaResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditFactureTva extends EditRecord
{
    protected static string $resource = FactureTvaResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()];
    }
}
