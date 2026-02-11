<?php

namespace App\Filament\Resources\SousCategoryResource\Pages;

use App\Filament\Resources\SousCategoryResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListSousCategories extends ListRecords
{
    protected static string $resource = SousCategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }
}
