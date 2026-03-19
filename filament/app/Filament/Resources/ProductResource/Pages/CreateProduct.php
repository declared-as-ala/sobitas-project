<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Resources\ProductResource;
use App\Services\Media\ConvertUploadedImageToWebp;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Str;

class CreateProduct extends CreateRecord
{
    protected static string $resource = ProductResource::class;

    /**
     * When rupture is true, force qte = 0 so it persists on create.
     * Slug fallback; convert uploaded images to WebP after Filament stores them.
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        if ((int) ($data['rupture'] ?? 0) === 1) {
            $data['qte'] = 0;
        }

        $qte = (int) ($data['qte'] ?? 0);
        if ($qte <= 0) {
            $data['qte'] = 0;
            $data['rupture'] = 1;
        }

        $data['slug'] = isset($data['slug']) ? (string) $data['slug'] : '';
        if ($data['slug'] === '' && ! empty($data['designation_fr'])) {
            $data['slug'] = Str::slug((string) $data['designation_fr']);
        }

        unset($data['_slug_auto_source']);

        $converter = app(ConvertUploadedImageToWebp::class);
        if (! empty($data['cover'])) {
            $data['cover'] = $converter->convertStoredPathToWebp((string) $data['cover']);
        }
        if (! empty($data['images']) && is_array($data['images'])) {
            $data['images'] = $converter->convertStoredPathsToWebp($data['images']);
        }

        return $data;
    }
}
