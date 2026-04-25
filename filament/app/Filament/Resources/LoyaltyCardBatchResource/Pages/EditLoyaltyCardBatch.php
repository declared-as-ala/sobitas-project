<?php

namespace App\Filament\Resources\LoyaltyCardBatchResource\Pages;

use App\Filament\Resources\LoyaltyCardBatchResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditLoyaltyCardBatch extends EditRecord
{
    protected static string $resource = LoyaltyCardBatchResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make()
                ->visible(fn () => !$this->record->isGenerated()),
        ];
    }
}
