<?php

namespace App\Http\Resources;

use App\Filament\Support\ImagePath;
use App\Models\Product;
use App\Services\Seo\ProductSchemaBuilder;
use App\Support\MediaLibrary\MediaLibraryPayload;
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

        $pathsForLibrary = [];
        $coverNorm = ImagePath::normalize($this->cover);
        if ($coverNorm) {
            $pathsForLibrary[] = $coverNorm;
        }
        foreach (ImagePath::normalizeArray($this->images ?? null) as $p) {
            $pathsForLibrary[] = $p;
        }
        $libraryByPath = MediaLibraryPayload::forPaths('public', $pathsForLibrary);
        $coverMedia = $coverNorm ? ($libraryByPath[$coverNorm] ?? null) : null;
        $imagesMedia = [];
        foreach (($this->images ?? []) as $img) {
            $n = ImagePath::normalize($img);
            $imagesMedia[] = $n ? ($libraryByPath[$n] ?? null) : null;
        }

        return array_merge($base, [
            'meta_description_fr' => $this->effectiveSeoDescription(),
            'json_ld_product' => $jsonLd,
            'cover_media' => $coverMedia,
            'images_media' => $imagesMedia,
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
                'image_alt' => $this->resolveCoverImageAlt($coverMedia),
            ],
            'schema' => $schemaFacts,
        ]);
    }

    /**
     * @param  array<string, mixed>|null  $coverMedia
     */
    private function resolveCoverImageAlt(?array $coverMedia): ?string
    {
        foreach (['seo_image_alt', 'alt_cover'] as $field) {
            $v = trim((string) ($this->resource->{$field} ?? ''));
            if ($v !== '') {
                return $v;
            }
        }

        $lib = trim((string) ($coverMedia['alt_text'] ?? ''));
        if ($lib !== '') {
            return $lib;
        }

        $designation = trim((string) ($this->designation_fr ?? ''));

        return $designation !== '' ? $designation : null;
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
