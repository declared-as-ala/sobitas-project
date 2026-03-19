<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Resources\ProductResource;
use App\Services\Media\ConvertUploadedImageToWebp;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Str;

class EditProduct extends EditRecord
{
    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['_slug_auto_source'] = $data['designation_fr'] ?? '';
        $data['faq'] = $data['faq'] ?? [];

        // Aligner l’affichage avec la qté (qté 0 ⇒ Rupture), comme le modèle au save.
        $qte = (int) ($data['qte'] ?? 0);
        $data['rupture'] = $qte <= 0 ? 1 : 0;

        return $data;
    }

    /**
     * Ensure qte and rupture are persisted correctly: when rupture is true, qte must be 0.
     * (qte is dehydrated even when disabled so it is sent; this is a safety net.)
     */
    protected function mutateFormDataBeforeSave(array $data): array
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
