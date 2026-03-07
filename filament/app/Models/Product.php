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
        'qte', 'low_stock_threshold', 'publier', 'rupture', 'new_product', 'best_seller', 'pack', 'note',
        'meta_title', 'meta_description', 'sous_categorie_id', 'brand_id', 'code_product',
    ];

    protected $casts = [
        'promo_expiration_date' => 'datetime',
        'prix' => 'float',
        'prix_ht' => 'float',
        'promo' => 'float',
        'promo_ht' => 'float',
        'qte' => 'integer',
        'low_stock_threshold' => 'integer',
        'publier' => 'boolean',
        'rupture' => 'boolean',
        'new_product' => 'boolean',
        'best_seller' => 'boolean',
        'pack' => 'boolean',
        'note' => 'integer',
        'images' => 'array',
    ];

    /**
     * qte = source of truth; rupture = derived out-of-stock flag (1 = out of stock, 0 = in stock).
     * On save: clamp qte to 0 if negative; set rupture from qte only:
     * - qte > 0 => rupture = false (in stock)
     * - qte <= 0 or null => rupture = true (out of stock)
     */
    protected static function booted(): void
    {
        static::saving(function (Product $product): void {
            $qte = (int) $product->qte;
            if ($qte < 0) {
                $product->qte = 0;
                $qte = 0;
            }

            $qte = (int) $product->qte;
            if ($qte > 0) {
                $product->rupture = false;
            } else {
                $product->qte = 0;
                $product->rupture = true;
            }
        });
    }

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

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    // ── Stock helpers (storefront + admin) ──────────────
    // qte = source of truth; rupture = derived out-of-stock flag (1 = out of stock, 0 = in stock).

    public function getStockThresholdAttribute(): int
    {
        return (int) ($this->attributes['low_stock_threshold'] ?? 10);
    }

    /** in_stock | low_stock | out_of_stock | inconsistent (rupture 0 = in stock, rupture 1 = out of stock) */
    public function getStockStatusAttribute(): string
    {
        $qte = (int) $this->qte;
        $rupture = (bool) $this->rupture;
        $threshold = $this->stock_threshold;

        if ($qte > 0 && $rupture) {
            return 'inconsistent';
        }
        if ($qte <= 0 && ! $rupture) {
            return 'inconsistent';
        }
        if ($qte <= 0) {
            return 'out_of_stock';
        }
        if ($qte < $threshold) {
            return 'low_stock';
        }
        return 'in_stock';
    }

    /** Safe for storefront: true when in stock (rupture = false) and qte > 0 */
    public function getIsAvailableAttribute(): bool
    {
        return (int) $this->qte > 0 && (bool) $this->rupture === false;
    }

    /**
     * Effective unit price for storefront/API: promo if active, else prix.
     * Promo is used when promo > 0 and (no expiration or expiration in the future).
     * Server-side only — never trust client-sent prix_unitaire.
     */
    public function getEffectiveUnitPrice(): float
    {
        $promo = (float) ($this->promo ?? 0);
        $prix = (float) ($this->prix ?? 0);
        if ($promo > 0 && (! $this->promo_expiration_date || $this->promo_expiration_date->isFuture())) {
            return $promo;
        }
        return $prix;
    }

    // ── Scopes ──────────────────────────────────────────

    public function scopePublished($query)
    {
        return $query->where('publier', 1);
    }

    public function scopeInStock($query)
    {
        return $query->where('qte', '>', 0)->where('rupture', 0);
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
              ->orWhere('rupture', 1);
        });
    }
}
