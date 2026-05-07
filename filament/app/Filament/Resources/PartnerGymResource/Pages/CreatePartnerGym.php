<?php

namespace App\Filament\Resources\PartnerGymResource\Pages;

use App\Filament\Resources\PartnerGymResource;
use App\Filament\Resources\PartnerResource\Pages\CreatePartner;

class CreatePartnerGym extends CreatePartner
{
    protected static string $resource = PartnerGymResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['type'] = \App\Enums\PartnerType::Gym->value;

        return $data;
    }
}
