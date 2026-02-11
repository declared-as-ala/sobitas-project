<?php

namespace App\Filament\Resources\SousCategoryResource\Pages;

use App\Filament\Resources\SousCategoryResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables;

class ListSousCategories extends ListRecords
{
    protected static string $resource = SousCategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Tables\Actions\CreateAction::make()
                ->modalHeading('Create Sous Category'),
        ];
    }
}
