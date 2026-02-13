<?php

namespace App\Filament\Resources\AromaResource\Pages;

use App\Filament\Resources\AromaResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables;

class ListAromas extends ListRecords
{
    protected static string $resource = AromaResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Tables\Actions\CreateAction::make()
                ->modalHeading('Create Aroma'),
        ];
    }
}
