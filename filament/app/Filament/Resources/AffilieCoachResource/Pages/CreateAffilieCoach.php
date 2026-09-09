<?php

namespace App\Filament\Resources\AffilieCoachResource\Pages;

use App\Filament\Resources\AffilieCoachResource;
use App\Filament\Resources\AffilieResource\Pages\CreateAffilie;

class CreateAffilieCoach extends CreateAffilie
{
    protected static string $resource = AffilieCoachResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['type'] = \App\Enums\AffilieType::Coach->value;

        return $data;
    }
}
