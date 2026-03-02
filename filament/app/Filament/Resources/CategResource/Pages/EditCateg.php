<?php

namespace App\Filament\Resources\CategResource\Pages;

use App\Filament\Resources\CategResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditCateg extends EditRecord
{
    protected static string $resource = CategResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()];
    }
}
