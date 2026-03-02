<?php

namespace App\Filament\Resources\SeoPageResource\Pages;

use App\Filament\Resources\SeoPageResource;
use Filament\Actions;
use Filament\Resources\Pages\ManageRecords;

class ManageSeoPages extends ManageRecords
{
    protected static string $resource = SeoPageResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }
}
