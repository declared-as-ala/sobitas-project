<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'designation_fr',
        'slug',
        'description',
        'cover',
        'alt_cover',
        'description_cover',
        'prix',
        'promo',
        'promo_expiration_date',
        'qte',
        'new_product',
        'best_seller',
        'pack',
        'publier',
        'rupture',
        'note',
        'brand_id',
        'sous_categorie_id',
        'meta_title',
        'meta_description',
    ];

    protected function casts(): array
    {
        return [
            'prix' => 'decimal:2',
            'promo' => 'decimal:2',
            'promo_expiration_date' => 'date',
            'new_product' => 'boolean',
            'best_seller' => 'boolean',
            'pack' => 'boolean',
            'publier' => 'boolean',
            'rupture' => 'boolean',
            'qte' => 'integer',
        ];
    }

    public function sousCategorie(): BelongsTo
    {
        return $this->belongsTo(SousCategory::class, 'sous_categorie_id');
    }

    // Keep snake_case alias for API backward compatibility
    public function sous_categorie(): BelongsTo
    {
        return $this->sousCategorie();
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'product_tags');
    }

    public function aromes(): BelongsToMany
    {
        return $this->belongsToMany(Aroma::class, 'product_aromas');
    }

    // Keep snake_case alias for API backward compatibility
    public function aromas(): BelongsToMany
    {
        return $this->aromes();
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class)->where('publier', 1);
    }

    public function allReviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    // Scopes
    public function scopePublished($query)
    {
        return $query->where('publier', 1);
    }

    public function scopeInStock($query)
    {
        return $query->where('qte', '>', 0);
    }

    public function scopeFlashSale($query)
    {
        return $query->whereNotNull('promo')
            ->where('publier', 1)
            ->whereDate('promo_expiration_date', '>', now());
    }

    public function scopeNewProducts($query)
    {
        return $query->where('new_product', 1)->published();
    }

    public function scopeBestSellers($query)
    {
        return $query->where('best_seller', 1)->published();
    }

    public function scopePacks($query)
    {
        return $query->where('pack', 1)->published();
    }
}
