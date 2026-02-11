<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'designation_fr', 'slug', 'description_fr', 'cover', 'alt_cover', 'description_cover',
        'images', 'prix', 'prix_ht', 'promo', 'promo_ht', 'promo_expiration_date',
        'qte', 'publier', 'rupture', 'new_product', 'best_seller', 'pack', 'note',
        'meta_title', 'meta_description', 'sous_categorie_id', 'brand_id',
    ];

    protected $casts = [
        'promo_expiration_date' => 'datetime',
        'prix' => 'float',
        'prix_ht' => 'float',
        'promo' => 'float',
        'promo_ht' => 'float',
        'qte' => 'integer',
        'publier' => 'boolean',
        'rupture' => 'boolean',
        'new_product' => 'boolean',
        'best_seller' => 'boolean',
        'pack' => 'boolean',
        'note' => 'integer',
        'images' => 'array',
    ];

    // ── Relationships ──────────────────────────────────

    public function sousCategorie(): BelongsTo
    {
        return $this->belongsTo(SousCategory::class, 'sous_categorie_id');
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'product_tags');
    }

    public function aromes(): BelongsToMany
    {
        return $this->belongsToMany(Aroma::class, 'product_aromas');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class)->where('publier', 1);
    }

    public function allReviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function commandeDetails(): HasMany
    {
        return $this->hasMany(CommandeDetail::class, 'produit_id');
    }

    public function detailsFactures(): HasMany
    {
        return $this->hasMany(DetailsFacture::class, 'produit_id');
    }

    public function detailsFactureTvas(): HasMany
    {
        return $this->hasMany(DetailsFactureTva::class, 'produit_id');
    }

    public function detailsTickets(): HasMany
    {
        return $this->hasMany(DetailsTicket::class, 'produit_id');
    }

    // ── Scopes ──────────────────────────────────────────

    public function scopePublished($query)
    {
        return $query->where('publier', 1);
    }

    public function scopeInStock($query)
    {
        return $query->where('rupture', 1);
    }

    public function scopeNewProducts($query)
    {
        return $query->where('new_product', 1);
    }

    public function scopeBestSellers($query)
    {
        return $query->where('best_seller', 1);
    }

    public function scopePacks($query)
    {
        return $query->where('pack', 1);
    }

    public function scopeFlashSales($query)
    {
        return $query->whereNotNull('promo')
            ->whereDate('promo_expiration_date', '>', now());
    }

    public function scopeLowStock($query, int $threshold = 10)
    {
        return $query->where('qte', '<', $threshold)
            ->where('qte', '>', 0);
    }

    public function scopeOutOfStock($query)
    {
        return $query->where(function ($q) {
            $q->where('qte', '<=', 0)
              ->orWhere('rupture', 0);
        });
    }
}
