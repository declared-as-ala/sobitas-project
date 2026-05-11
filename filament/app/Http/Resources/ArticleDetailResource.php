<?php

namespace App\Http\Resources;

use App\Filament\Support\ImagePath;
use App\Models\Article;
use App\Support\MediaLibrary\MediaLibraryPayload;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/** @mixin Article */
class ArticleDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $base = parent::toArray($request);

        $seoTitle = $this->effectiveSeoTitle();
        $seoDescription = $this->effectiveSeoDescription();
        $seoImagePath = $this->og_image ?: $this->twitter_image ?: $this->cover;

        $pathsForLibrary = array_filter([
            ImagePath::normalize($this->cover),
            ImagePath::normalize($this->og_image),
            ImagePath::normalize($this->twitter_image),
        ]);
        $libraryByPath = MediaLibraryPayload::forPaths('public', array_values(array_unique($pathsForLibrary)));
        $coverNorm = ImagePath::normalize($this->cover);
        $coverMedia = $coverNorm ? ($libraryByPath[$coverNorm] ?? null) : null;

        $frontendBase = rtrim((string) config('app.frontend_url', config('app.url', 'https://protein.tn')), '/');
        $shopSlugs = is_array($this->related_shop_category_slugs ?? null) ? $this->related_shop_category_slugs : [];
        $relatedShopCategories = [];
        foreach ($shopSlugs as $slug) {
            if (! is_string($slug)) {
                continue;
            }
            $s = trim($slug);
            if ($s === '') {
                continue;
            }
            $relatedShopCategories[] = [
                'slug' => $s,
                'url' => $frontendBase.'/category/'.rawurlencode($s),
            ];
        }

        return array_merge($base, [
            'cover_media' => $coverMedia,
            'seo' => [
                'title' => $seoTitle,
                'description' => $seoDescription,
                'excerpt' => $this->seo_excerpt,
                'canonical_url' => $this->seo_canonical_url,
                'robots' => [
                    'index' => $this->effectiveSeoRobotsIndex(),
                    'follow' => $this->effectiveSeoRobotsFollow(),
                ],
                'open_graph' => [
                    'title' => $this->og_title ?: $seoTitle,
                    'description' => $this->og_description ?: $seoDescription,
                    'image' => $this->publicUrl($this->og_image ?: $seoImagePath),
                ],
                'twitter' => [
                    'card' => $this->twitter_card ?: 'summary_large_image',
                    'title' => $this->twitter_title ?: $this->og_title ?: $seoTitle,
                    'description' => $this->twitter_description ?: $this->og_description ?: $seoDescription,
                    'image' => $this->publicUrl($this->twitter_image ?: $this->og_image ?: $seoImagePath),
                ],
                'author' => $this->seo_author_name ?: 'Sobitas',
                'image' => $this->publicUrl($seoImagePath),
            ],
            'schema' => [
                'type' => 'BlogPosting',
                'headline' => $seoTitle,
                'description' => $seoDescription,
                'image' => $this->publicUrl($seoImagePath),
                'author' => $this->seo_author_name ?: 'Sobitas',
                'date_published' => optional($this->created_at)?->toIso8601String(),
                'date_modified' => optional($this->updated_at ?: $this->created_at)?->toIso8601String(),
                'section' => $this->categories->pluck('name')->first() ?: (string) ($this->blog_type?->value ?? $this->blog_type ?? ''),
            ],
            'categories' => $this->categories->map(fn ($cat) => [
                'id' => $cat->id,
                'name' => $cat->name,
                'slug' => $cat->slug,
            ])->values(),
            'tags' => $this->tags->map(fn ($tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'slug' => $tag->slug,
            ])->values(),
            'related_shop_categories' => $relatedShopCategories,
        ]);
    }

    private function publicUrl(?string $path): ?string
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

