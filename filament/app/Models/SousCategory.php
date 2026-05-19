<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SousCategory extends Model
{
    protected $table = 'sous_categories';

    protected $fillable = [
        'designation_fr',
        'slug',
        'cover',
        'alt_cover',
        'description_cover',
        'description_fr',
        'categorie_id',
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
        'seo_tags',
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
        'nutrition_values',
        'more_details',
    ];

    protected $guarded = ['id'];

    protected $casts = [
        'faq' => 'array',
        'secondary_keywords' => 'array',
        'seo_tags' => 'array',
        'related_category_slugs' => 'array',
        'extra_json_ld' => 'array',
        'robots_index' => 'boolean',
        'robots_follow' => 'boolean',
        'seo_enabled' => 'boolean',
        'sitemap_include' => 'boolean',
        'sitemap_priority' => 'float',
    ];

    public function categorie(): BelongsTo
    {
        return $this->belongsTo(Categ::class, 'categorie_id');
    }

    /**
     * Legacy single products relationship.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'sous_categorie_id');
    }

    /**
     * Many-to-many relationship with products (new).
     */
    public function manyProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_sous_category')
            ->withTimestamps();
    }
}
