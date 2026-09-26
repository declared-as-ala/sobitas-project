<?php

namespace App\Filament\Resources\ProductResource\Pages;

use App\Filament\Resources\ProductResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class EditProduct extends EditRecord
{
    /** @var array<string, bool> */
    private static array $productColumnsCache = [];

    protected static string $resource = ProductResource::class;

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

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('viewShop')
                ->label('Voir le produit')
                ->icon('heroicon-o-arrow-top-right-on-square')
                ->color('info')
                ->url(function (): string {
                    $slug = trim((string) ($this->form->getRawState()['slug'] ?? $this->record->slug ?? ''));
                    if ($slug === '') {
                        return ProductResource::SHOP_PUBLIC_BASE_URL;
                    }

                    return rtrim(ProductResource::SHOP_PUBLIC_BASE_URL, '/') . '/' . $slug;
                })
                ->openUrlInNewTab(),

            Actions\DeleteAction::make(),
        ];
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['_slug_auto_source'] = $data['designation_fr'] ?? '';
        $data['description_fr'] = (string) ($data['description_fr'] ?? '');
        $data['faq'] = $data['faq'] ?? [];

        // Aligner l’affichage avec la qté (qté 0 ⇒ Rupture), comme le modèle au save.
        $qte = (int) ($data['qte'] ?? 0);
        $data['rupture'] = $qte <= 0 ? 1 : 0;

        // ── WHY THE ROBOTS TOGGLES ARE COERCED HERE ──────────────────────────────────────────
        // `seo_robots_index` / `seo_robots_follow` are NULLABLE and NULL on every product that
        // predates the 2026-04-21 SEO contract migration. The API reads NULL as "index, follow"
        // (Product::getEffectiveSeoRobotsIndexAttribute) — but a Filament Toggle hydrates NULL as
        // OFF and dehydrates OFF as `false`, so saving ANY edit (a price, a stock figure) on such a
        // product silently wrote `noindex, nofollow`. Measured on the 14/09/2026 dump: 95 legacy
        // products at seo_robots_index = 0, all with updated_at in the last four weeks, all
        // sitting at exactly (0, 1) — the toggle-bug signature after seo:products-robots-audit
        // repaired follow — and 0 of the 205 never-edited legacy products at 0. The form must show
        // the value the site actually serves, so an untouched toggle round-trips to the same page.
        foreach (['seo_robots_index', 'seo_robots_follow'] as $flag) {
            if (array_key_exists($flag, $data) && $data[$flag] === null) {
                $data[$flag] = true;
            }
        }

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
