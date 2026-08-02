<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Resources\ProductResource;
use App\Support\LegacyColumnDefaults;
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

        /*
         * `products` is a LEGACY table with no migration behind it, so it carries columns that are
         * NOT NULL with no DEFAULT and no field anywhere in this form. With MySQL strict mode on
         * (config/database.php), omitting one of those makes the INSERT fail:
         *
         *     SQLSTATE[HY000]: General error: 1364 Field 'xxx' doesn't have a default value
         *
         * That is a QueryException, so Laravel renders its styled 500 page, and Livewire — which
         * expects JSON back — surfaces it to the admin as "Erreur lors du chargement de la page".
         * It hits CREATE only, because an UPDATE writes just the dirty columns; that is exactly
         * why editing a product works and adding one does not.
         *
         * This asks the database which columns are mandatory and supplies the same zero values
         * MySQL itself would have used with strict mode off — rather than turning strict mode off
         * globally, which would also silence real truncation and type errors. See
         * LegacyColumnDefaults; it logs every column it fills, and when that log line stops
         * appearing the schema is finally under migration control and this call can go.
         */
        return LegacyColumnDefaults::fill('products', $data);
    }
}
