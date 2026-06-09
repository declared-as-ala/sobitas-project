<?php

namespace App\Filament\Resources\SiteNavigationItemResource\Pages;

use App\Filament\Pages\MenuNavbarOrderPage;
use App\Filament\Resources\SiteNavigationItemResource;
use Filament\Actions;
use Filament\Resources\Pages\ManageRecords;

class ManageSiteNavigationItems extends ManageRecords
{
    protected static string $resource = SiteNavigationItemResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('menuOrder')
                ->label('Ordre des catégories')
                ->icon('heroicon-o-queue-list')
                ->color('gray')
                ->url(MenuNavbarOrderPage::getUrl()),
            Actions\CreateAction::make()->slideOver(),
        ];
    }
}
