<?php

namespace App\Support;

use App\Models\Brand;
use App\Models\Categ;
use App\Models\Page;
use App\Models\SousCategory;
use Illuminate\Support\Str;

class PublicSlug
{
    public static function reservedSlugs(): array
    {
        return [
            'account',
            'admin',
            'api',
            'blog',
            'brand',
            'brands',
            'cart',
            'category',
            'checkout',
            'contact',
            'faqs',
            'favoris',
            'forgot-password',
            'login',
            'manifest',
            'offres',
            'order-confirmation',
            'packs',
            'page',
            'product',
            'products',
            'qui-sommes-nous',
            'register',
            'reset-password',
            'robots',
            'shop',
            'sitemap',
        ];
    }

    /**
     * @param  array{page?: int|null, brand?: int|null, categ?: int|null, sous_category?: int|null}  $ignore
     */
    public static function conflictsForRootSlug(string $slug, array $ignore = []): array
    {
        $slug = Str::slug($slug);
        if ($slug === '') {
            return [];
        }

        $conflicts = [];

        if (in_array($slug, self::reservedSlugs(), true)) {
            $conflicts[] = 'route systeme';
        }

        $categQuery = Categ::where('slug', $slug);
        if (($ignore['categ'] ?? null) !== null) {
            $categQuery->whereKeyNot($ignore['categ']);
        }
        if ($categQuery->exists()) {
            $conflicts[] = 'categorie';
        }

        $sousCategoryQuery = SousCategory::where('slug', $slug);
        if (($ignore['sous_category'] ?? null) !== null) {
            $sousCategoryQuery->whereKeyNot($ignore['sous_category']);
        }
        if ($sousCategoryQuery->exists()) {
            $conflicts[] = 'sous-categorie';
        }

        $pageQuery = Page::where('slug', $slug);
        if (($ignore['page'] ?? null) !== null) {
            $pageQuery->whereKeyNot($ignore['page']);
        }
        if ($pageQuery->exists()) {
            $conflicts[] = 'page';
        }

        $brandConflict = Brand::query()
            ->select('id', 'designation_fr')
            ->get()
            ->contains(fn (Brand $brand): bool => (int) ($ignore['brand'] ?? 0) !== (int) $brand->id
                && Str::slug((string) $brand->designation_fr) === $slug);

        if ($brandConflict) {
            $conflicts[] = 'marque';
        }

        return $conflicts;
    }

    public static function conflictsForPageSlug(string $slug, ?int $ignorePageId = null): array
    {
        return self::conflictsForRootSlug($slug, ['page' => $ignorePageId]);
    }

    public static function conflictsForBrandSlug(string $slug, ?int $ignoreBrandId = null): array
    {
        return self::conflictsForRootSlug($slug, ['brand' => $ignoreBrandId]);
    }

    public static function conflictsForCategorySlug(string $slug, ?int $ignoreCategoryId = null): array
    {
        return self::conflictsForRootSlug($slug, ['categ' => $ignoreCategoryId]);
    }

    public static function conflictsForSousCategorySlug(string $slug, ?int $ignoreSousCategoryId = null): array
    {
        return self::conflictsForRootSlug($slug, ['sous_category' => $ignoreSousCategoryId]);
    }
}
