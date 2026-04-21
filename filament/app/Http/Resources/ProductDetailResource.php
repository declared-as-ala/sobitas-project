<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Services\Seo\ProductSchemaBuilder;
use App\Support\Seo\ProductPublicUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $base = parent::toArray($request);

        unset($base['review'], $base['aggregateRating'], $base['seo_review'], $base['seo_aggregate_rating']);

        $canonical = $this->resolveCanonicalProductUrl();
        $builder = app(ProductSchemaBuilder::class);
        $jsonLd = $builder->buildGraph($this->resource, $canonical);
        $schemaFacts = $builder->buildSchemaFacts($this->resource, $canonical);

        return array_merge($base, [
            'meta_description_fr' => $this->effectiveSeoDescription(),
            'json_ld_product' => $jsonLd,
            'seo' => [
                'title' => $this->effectiveSeoTitle(),
                'description' => $this->effectiveSeoDescription(),
                'excerpt' => $this->seo_excerpt,
                'canonical_url' => $this->seo_canonical_url,
                'robots' => [
                    'index' => $this->effective_seo_robots_index,
                    'follow' => $this->effective_seo_robots_follow,
                ],
                'image' => ProductPublicUrl::fromPath($this->effective_seo_image_path),
                'image_alt' => $this->effective_seo_image_alt,
            ],
            'schema' => $schemaFacts,
        ]);
    }

    private function resolveCanonicalProductUrl(): string
    {
        $custom = trim((string) ($this->seo_canonical_url ?? ''));
        if ($custom !== '' && (str_starts_with($custom, 'http://') || str_starts_with($custom, 'https://'))) {
            return $custom;
        }

        $frontend = rtrim((string) config('app.frontend_url', ''), '/');
        $slug = trim((string) ($this->slug ?? ''));

        return $slug !== '' ? "{$frontend}/shop/{$slug}" : $frontend.'/shop';
    }
}
