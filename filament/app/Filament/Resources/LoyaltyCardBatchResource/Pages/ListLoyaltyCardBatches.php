<?php

namespace App\Filament\Resources\LoyaltyCardBatchResource\Pages;

use App\Filament\Resources\LoyaltyCardBatchResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListLoyaltyCardBatches extends ListRecords
{
    protected static string $resource = LoyaltyCardBatchResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()->label('Nouveau lot'),
        ];
    }
}
