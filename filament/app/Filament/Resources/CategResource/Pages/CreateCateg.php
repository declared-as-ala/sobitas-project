<?php

namespace App\Filament\Resources\CategResource\Pages;

use App\Filament\Resources\CategResource;
use App\Filament\Support\NormalizesCategorySeoRecord;
use Filament\Resources\Pages\CreateRecord;

class CreateCateg extends CreateRecord
{
    use NormalizesCategorySeoRecord;

    protected static string $resource = CategResource::class;

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeSave(array $data): array
    {
        return $this->normalizeCategorySeoBeforeSave($data);
    }
}
