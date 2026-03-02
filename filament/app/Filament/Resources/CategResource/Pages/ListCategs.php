<?php

namespace App\Filament\Resources\CategResource\Pages;

use App\Filament\Resources\CategResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListCategs extends ListRecords
{
    protected static string $resource = CategResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }
}
