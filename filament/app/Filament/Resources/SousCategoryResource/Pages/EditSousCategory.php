<?php

namespace App\Filament\Resources\SousCategoryResource\Pages;

use App\Filament\Resources\SousCategoryResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditSousCategory extends EditRecord
{
    protected static string $resource = SousCategoryResource::class;

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['_slug_auto_source'] = $data['designation_fr'] ?? '';
        $sk = $data['secondary_keywords'] ?? null;
        if (is_array($sk) && $sk !== [] && array_is_list($sk) && isset($sk[0]) && is_string($sk[0])) {
            $data['secondary_keywords'] = array_map(static fn (string $t): array => ['term' => $t], $sk);
        }

        return $data;
    }

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

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()];
    }
}
