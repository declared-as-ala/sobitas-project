<?php

namespace App\Filament\Resources\AffilieGymResource\Pages;

use App\Filament\Resources\AffilieGymResource;
use App\Filament\Resources\AffilieResource\Pages\CreateAffilie;

class CreateAffilieGym extends CreateAffilie
{
    protected static string $resource = AffilieGymResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['type'] = \App\Enums\AffilieType::Gym->value;

        return $data;
    }
}
