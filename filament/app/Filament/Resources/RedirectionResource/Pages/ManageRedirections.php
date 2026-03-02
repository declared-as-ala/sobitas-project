<?php

namespace App\Filament\Resources\RedirectionResource\Pages;

use App\Filament\Resources\RedirectionResource;
use Filament\Actions;
use Filament\Resources\Pages\ManageRecords;

class ManageRedirections extends ManageRecords
{
    protected static string $resource = RedirectionResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }
}
