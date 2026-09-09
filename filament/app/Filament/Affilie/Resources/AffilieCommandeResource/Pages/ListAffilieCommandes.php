<?php

namespace App\Filament\Affilie\Resources\AffilieCommandeResource\Pages;

use App\Filament\Affilie\Resources\AffilieCommandeResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListAffilieCommandes extends ListRecords
{
    protected static string $resource = AffilieCommandeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // Filament v4.2: actions live in Filament\Actions, not Filament\Tables\Actions.
            Actions\CreateAction::make()->label('Nouvelle commande'),
        ];
    }
}
