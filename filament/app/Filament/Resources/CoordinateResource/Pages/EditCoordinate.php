<?php

namespace App\Filament\Resources\CoordinateResource\Pages;

use App\Filament\Resources\CoordinateResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditCoordinate extends EditRecord
{
    protected static string $resource = CoordinateResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
