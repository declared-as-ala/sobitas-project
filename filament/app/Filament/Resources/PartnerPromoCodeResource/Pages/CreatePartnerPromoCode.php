<?php

namespace App\Filament\Resources\PartnerPromoCodeResource\Pages;

use App\Filament\Resources\PartnerPromoCodeResource;
use Filament\Resources\Pages\CreateRecord;

class CreatePartnerPromoCode extends CreateRecord
{
    protected static string $resource = PartnerPromoCodeResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['is_partner_code'] = true;

        return $data;
    }
}
