<?php

namespace App\Filament\Resources\MarketingTemplateResource\Pages;

use App\Filament\Resources\MarketingTemplateResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditMarketingTemplate extends EditRecord
{
    protected static string $resource = MarketingTemplateResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()];
    }
}
