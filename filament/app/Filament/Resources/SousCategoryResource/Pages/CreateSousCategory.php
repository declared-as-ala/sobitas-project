<?php

namespace App\Filament\Resources\SousCategoryResource\Pages;

use App\Filament\Resources\SousCategoryResource;
use Filament\Resources\Pages\CreateRecord;

class CreateSousCategory extends CreateRecord
{
    protected static string $resource = SousCategoryResource::class;

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeSave(array $data): array
    {
        $rows = $data['secondary_keywords'] ?? [];
        if (is_array($rows)) {
            $terms = [];
            foreach ($rows as $row) {
                if (is_array($row) && isset($row['term'])) {
                    $t = trim((string) $row['term']);
                    if ($t !== '') {
                        $terms[] = $t;
                    }
                }
            }
            $data['secondary_keywords'] = $terms;
        }

        return $data;
    }
}
