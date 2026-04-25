<?php

namespace App\Filament\Resources\LoyaltyCardBatchResource\Pages;

use App\Filament\Resources\LoyaltyCardBatchResource;
use Filament\Resources\Pages\CreateRecord;

class CreateLoyaltyCardBatch extends CreateRecord
{
    protected static string $resource = LoyaltyCardBatchResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['created_by'] = auth()->id();
        return $data;
    }
}
