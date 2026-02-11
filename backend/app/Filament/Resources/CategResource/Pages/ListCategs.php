<?php

namespace App\Filament\Resources\CategResource\Pages;

use App\Filament\Resources\CategResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables;

class ListCategs extends ListRecords
{
    protected static string $resource = CategResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Tables\Actions\CreateAction::make()
                ->modalHeading('Create Category'),
        ];
    }
}
