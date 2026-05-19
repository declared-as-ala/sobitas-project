<?php

namespace App\Filament\Resources\SousCategoryResource\Pages;

use App\Filament\Resources\SousCategoryResource;
use App\Filament\Support\NormalizesCategorySeoRecord;
use Filament\Resources\Pages\CreateRecord;

class CreateSousCategory extends CreateRecord
{
    use NormalizesCategorySeoRecord;

    protected static string $resource = SousCategoryResource::class;

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        return $this->normalizeCategorySeoBeforeSave($data);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeSave(array $data): array
    {
        return $this->normalizeCategorySeoBeforeSave($data);
    }
}
