<?php

namespace App\Filament\Resources\PartnerCoachResource\Pages;

use App\Filament\Resources\PartnerCoachResource;
use App\Filament\Resources\PartnerResource\Pages\CreatePartner;

class CreatePartnerCoach extends CreatePartner
{
    protected static string $resource = PartnerCoachResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['type'] = \App\Enums\PartnerType::Coach->value;

        return $data;
    }
}
