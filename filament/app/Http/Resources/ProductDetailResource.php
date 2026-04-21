<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin Product */
class ProductDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $base = parent::toArray($request);

        $base['meta_description_fr'] = $this->effectiveSeoDescription();
        $base['review'] = $this->seo_review;
        $base['aggregateRating'] = $this->seo_aggregate_rating;

        return array_merge($base, [
            'seo' => [
                'title' => $this->effectiveSeoTitle(),
                'description' => $this->effectiveSeoDescription(),
                'excerpt' => $this->seo_excerpt,
                'canonical_url' => $this->seo_canonical_url,
                'robots' => [
                    'index' => $this->effective_seo_robots_index,
                    'follow' => $this->effective_seo_robots_follow,
                ],
                'image' => $this->toPublicUrl($this->effective_seo_image_path),
                'image_alt' => $this->effective_seo_image_alt,
                'open_graph' => [
                    'title' => $this->og_title ?: $this->effectiveSeoTitle(),
                    'description' => $this->og_description ?: $this->effectiveSeoDescription(),
                    'image' => $this->toPublicUrl($this->og_image ?: $this->effective_seo_image_path),
                ],
                'twitter' => [
                    'card' => $this->twitter_card ?: 'summary_large_image',
                    'title' => $this->twitter_title ?: $this->og_title ?: $this->effectiveSeoTitle(),
                    'description' => $this->twitter_description ?: $this->og_description ?: $this->effectiveSeoDescription(),
                    'image' => $this->toPublicUrl($this->twitter_image ?: $this->og_image ?: $this->effective_seo_image_path),
                ],
            ],
            'schema' => [
                'sku' => $this->effective_sku,
                'gtin' => $this->gtin,
                'mpn' => $this->mpn,
                'brand' => $this->brand?->designation_fr,
                'price' => (float) $this->getEffectiveUnitPrice(),
                'price_currency' => 'TND',
                'availability' => $this->effective_availability_schema,
                'item_condition' => $this->effective_item_condition_schema,
                'price_valid_until' => $this->effective_price_valid_until,
                'image' => $this->toPublicUrl($this->effective_seo_image_path),
                'image_alt' => $this->effective_seo_image_alt,
                'aggregate_rating' => $this->seo_aggregate_rating,
                'review' => $this->seo_review,
            ],
        ]);
    }

    private function toPublicUrl(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        if (str_starts_with((string) $path, 'http://') || str_starts_with((string) $path, 'https://')) {
            return $path;
        }

        return url(Storage::disk('public')->url((string) $path));
    }
}

