<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Resources\ProductResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class CreateProduct extends CreateRecord
{
    /** @var array<string, bool> */
    private static array $productColumnsCache = [];

    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('viewShop')
                ->label('Voir le produit')
                ->icon('heroicon-o-arrow-top-right-on-square')
                ->color('info')
                ->url(function (): string {
                    $slug = trim((string) ($this->form->getRawState()['slug'] ?? ''));
                    if ($slug === '') {
                        return ProductResource::SHOP_PUBLIC_BASE_URL;
                    }

                    return rtrim(ProductResource::SHOP_PUBLIC_BASE_URL, '/') . '/' . $slug;
                })
                ->openUrlInNewTab()
                ->disabled(fn (): bool => trim((string) ($this->form->getRawState()['slug'] ?? '')) === ''),
        ];
    }

    private static function hasProductColumn(string $column): bool
    {
        if (array_key_exists($column, self::$productColumnsCache)) {
            return self::$productColumnsCache[$column];
        }

        try {
            return self::$productColumnsCache[$column] = Schema::hasColumn('products', $column);
        } catch (\Throwable) {
            return self::$productColumnsCache[$column] = false;
        }
    }

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

        // Deployment safety: if migrations were skipped, don't write unknown columns.
        foreach ([
            'faq',
            'nutrition_values',
            'seo_schema_description',
            'seo_review',
            'seo_aggregate_rating',
        ] as $column) {
            if (! self::hasProductColumn($column)) {
                unset($data[$column]);
            }
        }

        return $data;
    }
}
