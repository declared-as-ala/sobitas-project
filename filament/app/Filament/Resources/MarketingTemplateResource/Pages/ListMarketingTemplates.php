<?php

namespace App\Filament\Resources\MarketingTemplateResource\Pages;

use App\Filament\Resources\MarketingTemplateResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListMarketingTemplates extends ListRecords
{
    protected static string $resource = MarketingTemplateResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }
}
