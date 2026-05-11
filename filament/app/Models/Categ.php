<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Categ extends Model
{
    protected $table = 'categs';

    protected $fillable = [
        'designation_fr',
        'slug',
        'cover',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'h1_title',
        'short_intro',
        'long_bottom_content',
        'canonical_url',
        'og_title',
        'og_description',
        'og_image',
        'og_image_alt',
        'twitter_title',
        'twitter_description',
        'twitter_image',
        'breadcrumb_label',
        'primary_keyword',
        'secondary_keywords',
        'robots_index',
        'robots_follow',
        'seo_enabled',
        'seo_banner_desktop',
        'seo_banner_mobile',
        'sitemap_include',
        'sitemap_priority',
        'sitemap_changefreq',
        'extra_json_ld',
        'related_category_slugs',
        'faq',
    ];

    protected function casts(): array
    {
        return [
            'secondary_keywords' => 'array',
            'related_category_slugs' => 'array',
            'faq' => 'array',
            'extra_json_ld' => 'array',
            'robots_index' => 'boolean',
            'robots_follow' => 'boolean',
            'seo_enabled' => 'boolean',
            'sitemap_include' => 'boolean',
            'sitemap_priority' => 'float',
        ];
    }

    public function sousCategories(): HasMany
    {
        return $this->hasMany(SousCategory::class, 'categorie_id');
    }

    public function products()
    {
        return Product::whereIn('sous_categorie_id', $this->sousCategories()->pluck('id'));
    }

    /**
     * Get the cover image URL attribute.
     * Normalizes full URLs to relative paths and generates correct storage URL.
     */
    public function getCoverUrlAttribute(): ?string
    {
        if (! $this->cover) {
            return null;
        }

        if (filter_var($this->cover, FILTER_VALIDATE_URL)) {
            $path = parse_url($this->cover, PHP_URL_PATH);
            $path = ltrim($path, '/');
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, 8);
            }

            return Storage::disk('public')->url($path);
        }

        return Storage::disk('public')->url($this->cover);
    }

    /**
     * Mutator to normalize cover path to relative path only.
     */
    public function setCoverAttribute($value): void
    {
        if ($value && filter_var($value, FILTER_VALIDATE_URL)) {
            $path = parse_url($value, PHP_URL_PATH);
            $path = ltrim($path, '/');
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, 8);
            }
            $this->attributes['cover'] = $path;
        } else {
            $this->attributes['cover'] = $value;
        }
    }
}
