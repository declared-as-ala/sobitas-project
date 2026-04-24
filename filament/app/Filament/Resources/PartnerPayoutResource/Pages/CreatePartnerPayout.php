<?php

namespace App\Filament\Resources\PartnerPayoutResource\Pages;

use App\Filament\Resources\PartnerPayoutResource;
use Filament\Resources\Pages\CreateRecord;

class CreatePartnerPayout extends CreateRecord
{
    protected static string $resource = PartnerPayoutResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['created_by'] = auth()->id();
        return $data;
    }
}
