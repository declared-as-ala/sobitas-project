<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

/**
 * A small, repeatable release gate for the products customers see first.
 *
 * It deliberately separates CORE commerce data from ENHANCED editorial data. A valid product must
 * never fail because a second gallery photograph is unavailable, but the missing gallery/FAQ still
 * needs to stay visible until an exact official source is found.
 */
class HomepageProductRichAudit extends Command
{
    protected $signature = 'products:homepage-rich-audit {--strict : Return a failure code when core data is missing}';

    protected $description = 'Audit homepage products against the product-page rich-data contract';

    public function handle(): int
    {
        $products = $this->homepageProducts();

        $this->info(sprintf('Homepage rich-data gate — %d produits uniques', $products->count()));

        $rows = [];
        $coreFailures = 0;
        $enhancedFailures = 0;

        foreach ($products as $product) {
            $galleryCount = $this->galleryCount($product);
            $coreGaps = array_values(array_filter([
                $this->effectiveSku($product) === '' ? 'SKU' : null,
                trim((string) $product->cover) === '' ? 'cover' : null,
                trim((string) $product->alt_cover) === '' ? 'alt' : null,
                mb_strlen(trim(strip_tags((string) $product->description_fr))) < 300 ? 'description' : null,
                $product->brand_id === null ? 'marque' : null,
                $product->sous_categorie_id === null ? 'catégorie' : null,
                ! $this->hasNutrition($product) ? 'nutrition' : null,
            ]));
            $enhancedGaps = array_values(array_filter([
                $galleryCount < 2 ? 'galerie' : null,
                ! is_array($product->faq) || $product->faq === [] ? 'FAQ' : null,
            ]));

            $coreFailures += $coreGaps === [] ? 0 : 1;
            $enhancedFailures += $enhancedGaps === [] ? 0 : 1;

            $rows[] = [
                $product->slug,
                $this->effectiveSku($product),
                $coreGaps === [] ? 'OK' : implode(', ', $coreGaps),
                $enhancedGaps === [] ? 'OK' : implode(', ', $enhancedGaps),
                $galleryCount,
            ];
        }

        $this->table(['Produit', 'SKU effectif', 'Données cœur', 'Enrichissement', 'Images'], $rows);
        $this->newLine();
        $this->line("Cœur: {$coreFailures} incomplet(s). Enrichissement: {$enhancedFailures} incomplet(s).");
        $this->line('Le SKU effectif suit le schéma public: sku → code_product → id, comme la fiche de référence.');

        return $this->option('strict') && $coreFailures > 0 ? self::FAILURE : self::SUCCESS;
    }

    /** @return Collection<int, Product> */
    private function homepageProducts(): Collection
    {
        $base = fn (): Builder => Product::query()
            ->where('publier', 1)
            ->where('qte', '>', 0)
            ->when(Schema::hasColumn('products', 'rupture'), fn (Builder $query) => $query->where('rupture', 0))
            ->when(Schema::hasColumn('products', 'force_out_of_stock'), fn (Builder $query) => $query->where('force_out_of_stock', 0));

        $ids = collect()
            ->merge($base()->where('new_product', 1)->latest('created_at')->limit(8)->pluck('id'))
            ->merge($base()->where('best_seller', 1)->latest('created_at')->limit(4)->pluck('id'))
            ->merge($base()
                ->whereNotNull('promo')
                ->where('promo', '>', 0)
                ->whereDate('promo_expiration_date', '>', now())
                ->limit(4)
                ->pluck('id'))
            ->unique()
            ->values();

        return Product::query()
            ->whereIn('id', $ids)
            ->with('externalCatalogSource:id,product_id,source_gallery_images')
            ->get()
            ->sortBy(fn (Product $product) => $ids->search($product->id))
            ->values();
    }

    private function effectiveSku(Product $product): string
    {
        return trim((string) ($product->sku ?: $product->code_product ?: $product->id));
    }

    private function hasNutrition(Product $product): bool
    {
        return (is_array($product->nutrition_facts) && $product->nutrition_facts !== [])
            || trim((string) $product->nutrition_values) !== '';
    }

    private function galleryCount(Product $product): int
    {
        $images = collect([$product->cover]);
        $images = $images->merge(is_array($product->images) ? $product->images : []);

        $sourceGallery = $product->externalCatalogSource?->source_gallery_images;
        $images = $images->merge(is_array($sourceGallery) ? $sourceGallery : []);

        return $images
            ->map(fn ($image) => is_array($image) ? ($image['url'] ?? $image['path'] ?? '') : $image)
            ->map(fn ($image) => trim((string) $image))
            ->filter()
            ->unique()
            ->count();
    }
}
