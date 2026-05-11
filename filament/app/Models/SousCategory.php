<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SousCategory extends Model
{
    protected $table = 'sous_categories';

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
