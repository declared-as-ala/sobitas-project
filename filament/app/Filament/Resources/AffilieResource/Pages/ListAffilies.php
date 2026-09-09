<?php

namespace App\Filament\Resources\AffilieResource\Pages;

use App\Filament\Resources\AffilieResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListAffilies extends ListRecords
{
    protected static string $resource = AffilieResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
