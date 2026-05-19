<?php

namespace App\Filament\Resources\SiteNavigationItemResource\Pages;

use App\Filament\Resources\SiteNavigationItemResource;
use Filament\Actions;
use Filament\Resources\Pages\ManageRecords;

class ManageSiteNavigationItems extends ManageRecords
{
    protected static string $resource = SiteNavigationItemResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()->slideOver(),
        ];
    }
}
