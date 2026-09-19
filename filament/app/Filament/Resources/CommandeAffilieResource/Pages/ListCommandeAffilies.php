<?php

namespace App\Filament\Resources\CommandeAffilieResource\Pages;

use App\Filament\Resources\CommandeAffilieResource;
use Filament\Resources\Pages\ListRecords;

class ListCommandeAffilies extends ListRecords
{
    protected static string $resource = CommandeAffilieResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
