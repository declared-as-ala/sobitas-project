<?php

namespace App\Filament\Resources\CategResource\Pages;

use App\Filament\Resources\CategResource;
use App\Filament\Support\NormalizesCategorySeoRecord;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditCateg extends EditRecord
{
    use NormalizesCategorySeoRecord;

    protected static string $resource = CategResource::class;

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['_slug_auto_source'] = $data['designation_fr'] ?? '';

        return $this->normalizeCategorySeoBeforeFill($data);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeSave(array $data): array
    {
        return $this->normalizeCategorySeoBeforeSave($data);
    }

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()];
    }
}
