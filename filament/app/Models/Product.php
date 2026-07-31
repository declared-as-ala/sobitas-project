<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class Product extends Model
{
    protected $table = 'products';

    protected $fillable = [
        'designation_fr', 'slug', 'description_fr', 'faq', 'nutrition_values', 'nutrition_images', 'cover', 'alt_cover', 'description_cover',
        'images', 'prix', 'prix_ht', 'promo', 'promo_ht', 'promo_expiration_date',
        'qte', 'low_stock_threshold', 'publier', 'rupture', 'force_out_of_stock', 'new_product', 'best_seller', 'pack', 'note',
        'meta_title', 'meta_description', 'seo_schema_description', 'seo_review', 'seo_aggregate_rating',
        'seo_title', 'seo_description', 'seo_excerpt', 'seo_canonical_url', 'seo_robots_index', 'seo_robots_follow',
        'sku', 'gtin', 'mpn', 'item_condition', 'availability_override', 'price_valid_until', 'seo_image_alt',
        'sous_categorie_id', 'brand_id', 'code_product',
        // AI-drafted copy awaiting approval. Never rendered to customers or Googlebot — publishing
        // copies these into description_fr / faq via the "Publier le contenu IA" bulk action.
        'ai_description_draft', 'ai_faq_draft', 'ai_generated_at', 'ai_review_status', 'ai_model',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'og_title',
        'og_description',
        'og_image',
        'twitter_title',
        'twitter_description',
        'twitter_image',
        'twitter_card',
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
        'force_out_of_stock' => 'boolean',
        'new_product' => 'boolean',
        'best_seller' => 'boolean',
        'pack' => 'boolean',
        'note' => 'integer',
        'images' => 'array',
        'faq' => 'array',
        'ai_faq_draft' => 'array',
        'ai_generated_at' => 'datetime',
        'nutrition_images' => 'array',
        'seo_robots_index' => 'boolean',
        'seo_robots_follow' => 'boolean',
        'price_valid_until' => 'date',
    ];

    /**
     * Boot method for model events.
     */
    protected static function booted(): void
    {
        static::saving(function (Product $product): void {
            $qte = (int) $product->qte;
            if ($qte < 0) {
                $qte = 0;
            }
            $product->qte = $qte;

            // A manual "hard" out-of-stock (force_out_of_stock) always wins: it lets
            // the owner keep a product unavailable even with quantity > 0, and it
            // SURVIVES bulk re-saves (imports / enrichment commands) that would
            // otherwise reset rupture to in-stock. Column may be absent on older DBs
            // (null → falsy) → behaviour is unchanged until the migration adds it.
            if ($product->force_out_of_stock) {
                $product->rupture = true;
            } elseif ($qte > 0) {
                $product->rupture = false;
            } else {
                $product->rupture = true;
            }
        });
    }

    /**
     * Re-derive the `rupture` (out-of-stock) flag for the given product ids.
     *
     * Admin document pages mutate `qte` via raw query-builder decrement()/increment()
     * calls that BYPASS the saving() hook above, leaving `rupture` stale. Call this
     * after such mutations to keep the flag consistent.
     *
     * Uses a single query-builder UPDATE (fires NO model events) so it is cheap and
     * safe to call in bulk. RESPECTS the manual hard out-of-stock override:
     * rupture = 1 when force_out_of_stock = 1 OR qte <= 0, else 0. When the
     * force_out_of_stock column is absent (older DBs) it falls back to qte <= 0 only.
     */
    public static function syncRuptureFlags(array $productIds): void
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $productIds))));
        if (empty($ids)) {
            return;
        }

        $case = Schema::hasColumn('products', 'force_out_of_stock')
            ? 'CASE WHEN force_out_of_stock = 1 OR qte <= 0 THEN 1 ELSE 0 END'
            : 'CASE WHEN qte <= 0 THEN 1 ELSE 0 END';

        static::query()
            ->whereIn('id', $ids)
            ->update(['rupture' => DB::raw($case)]);
    }

    // ── Relationships ──────────────────────────────────

    /**
     * Legacy single subcategory relationship (kept for backward compatibility).
     */
    public function sousCategorie(): BelongsTo
    {
        return $this->belongsTo(SousCategory::class, 'sous_categorie_id');
    }

    /**
     * Multiple subcategories relationship (new many-to-many).
     */
    public function sousCategories(): BelongsToMany
    {
        return $this->belongsToMany(SousCategory::class, 'product_sous_category')
            ->withTimestamps()
            ->orderBy('designation_fr');
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
     * Whether the product has an active (non-expired) promo.
     * Promo is active when: promo is set and > 0, and (no expiration or expiration >= today).
     */
    public function hasActivePromo(): bool
    {
        $promo = (float) ($this->promo ?? 0);
        if ($promo <= 0) {
            return false;
        }
        if (! $this->promo_expiration_date) {
            return true;
        }
        // Expiration date >= today (inclusive): still valid for the whole day
        return $this->promo_expiration_date->format('Y-m-d') >= now()->format('Y-m-d');
    }

    /**
     * Effective unit price TTC for storefront/API and admin (Ticket, Commande): promo if active, else prix.
     * Source of truth for "selling price" when document works in TTC.
     */
    public function getEffectiveUnitPrice(): float
    {
        if ($this->hasActivePromo()) {
            return (float) ($this->promo ?? 0);
        }

        return (float) ($this->prix ?? 0);
    }

    /**
     * Effective unit price HT for admin documents (Devis, Facture, BL) that work in HT + TVA.
     * Uses promo_ht when promo active, else prix_ht; fallback to promo/prix if HT not set.
     */
    public function getEffectivePriceHt(): float
    {
        if ($this->hasActivePromo()) {
            $ht = (float) ($this->promo_ht ?? 0);
            if ($ht > 0) {
                return $ht;
            }

            return (float) ($this->promo ?? 0);
        }
        $ht = (float) ($this->prix_ht ?? 0);
        if ($ht > 0) {
            return $ht;
        }

        return (float) ($this->prix ?? 0);
    }

    /**
     * Label for select options: designation + effective price (and "promo") + stock.
     */
    public function getEffectivePriceLabel(): string
    {
        $name = $this->designation_fr ?? '';
        $price = $this->getEffectiveUnitPrice();
        $suffix = $this->hasActivePromo() ? ' (promo)' : '';
        $stock = (int) ($this->qte ?? 0);

        return $name . ' — ' . number_format($price, 3, ',', ' ') . ' DT' . $suffix . ' — ' . $stock . ' en stock';
    }

    public function effectiveSeoTitle(): ?string
    {
        $seoTitle = trim((string) ($this->attributes['seo_title'] ?? ''));
        if ($seoTitle !== '') {
            return $seoTitle;
        }

        $metaTitle = trim((string) ($this->attributes['meta_title'] ?? ''));
        if ($metaTitle !== '') {
            return $metaTitle;
        }

        return $this->designation_fr ?: null;
    }

    public function effectiveSeoDescription(): ?string
    {
        $seoDescription = trim((string) ($this->attributes['seo_description'] ?? ''));
        if ($seoDescription !== '') {
            return $seoDescription;
        }

        $metaDescription = trim((string) ($this->attributes['meta_description'] ?? ''));
        if ($metaDescription !== '') {
            return $metaDescription;
        }

        $legacy = trim((string) ($this->attributes['description_cover'] ?? ''));
        if ($legacy !== '') {
            return $legacy;
        }

        if (filled($this->description_fr)) {
            return str((string) $this->description_fr)
                ->replaceMatches('/<[^>]*>/', ' ')
                ->squish()
                ->limit(500, '')
                ->toString();
        }

        return null;
    }

    public function getEffectiveSkuAttribute(): ?string
    {
        foreach (['sku', 'code_product'] as $field) {
            $value = trim((string) ($this->attributes[$field] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        return $this->id ? (string) $this->id : null;
    }

    public function getEffectiveSeoImagePathAttribute(): ?string
    {
        foreach (['cover'] as $field) {
            $value = trim((string) ($this->attributes[$field] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }

    public function getEffectiveSeoImageAltAttribute(): ?string
    {
        foreach (['seo_image_alt', 'alt_cover', 'designation_fr'] as $field) {
            $value = trim((string) ($this->attributes[$field] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }

    public function getEffectiveAvailabilitySchemaAttribute(): string
    {
        $override = strtolower(trim((string) ($this->attributes['availability_override'] ?? '')));

        if ($override !== '') {
            return $this->normalizeAvailabilitySchema($override);
        }

        return $this->is_available
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock';
    }

    public function getEffectiveItemConditionSchemaAttribute(): string
    {
        $condition = strtolower(trim((string) ($this->attributes['item_condition'] ?? '')));

        return match ($condition) {
            'new', 'newcondition' => 'https://schema.org/NewCondition',
            'used', 'usedcondition' => 'https://schema.org/UsedCondition',
            'refurbished', 'refurbishedcondition' => 'https://schema.org/RefurbishedCondition',
            default => 'https://schema.org/NewCondition',
        };
    }

    public function getEffectivePriceValidUntilAttribute(): ?string
    {
        $date = $this->price_valid_until;
        if ($date instanceof CarbonInterface) {
            return $date->format('Y-m-d');
        }

        if ($this->promo_expiration_date instanceof CarbonInterface) {
            return $this->promo_expiration_date->format('Y-m-d');
        }

        return null;
    }

    public function getEffectiveSeoRobotsIndexAttribute(): bool
    {
        $value = $this->attributes['seo_robots_index'] ?? null;
        return $value === null ? true : (bool) $value;
    }

    public function getEffectiveSeoRobotsFollowAttribute(): bool
    {
        $value = $this->attributes['seo_robots_follow'] ?? null;
        return $value === null ? true : (bool) $value;
    }

    // ── Filament select search (performance: minimal columns, no N+1) ─────

    /** Columns needed for search results and option label (no images, no description). */
    public static function getSelectSearchColumns(): array
    {
        return ['id', 'designation_fr', 'qte', 'prix', 'promo', 'promo_expiration_date', 'prix_ht', 'promo_ht'];
    }

    /**
     * Optimized query for Filament product select: minimal columns, filtered, ordered, limited.
     * Use with getSearchOptionsForFilament() for searchable dropdowns.
     */
    public static function scopeForSelectSearch($query, string $search = '', int $limit = 30)
    {
        $query->select(self::getSelectSearchColumns())
            ->orderBy('designation_fr')
            ->limit($limit);

        if ($search !== '') {
            $term = '%' . $search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('designation_fr', 'like', $term)
                    ->orWhere('code_product', 'like', $term);
            });
        }

        return $query;
    }

    /**
     * Returns [id => label] for Filament Select getSearchResultsUsing.
     * Single query, limit 30, no N+1. Label uses only loaded attributes.
     */
    public static function getSearchOptionsForFilament(string $search = '', int $limit = 30): array
    {
        return self::query()
            ->forSelectSearch($search, $limit)
            ->get()
            ->mapWithKeys(fn (Product $p) => [$p->id => $p->getEffectivePriceLabel()])
            ->all();
    }

    /**
     * Single-product label for getOptionLabelUsing (one lightweight query by id).
     */
    public static function getOptionLabelForId(mixed $id): ?string
    {
        $id = $id ? (int) $id : null;
        if (! $id) {
            return null;
        }

        $p = self::query()->select(self::getSelectSearchColumns())->find($id);

        return $p?->getEffectivePriceLabel();
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

    private function normalizeAvailabilitySchema(string $value): string
    {
        return match ($value) {
            'instock', 'in_stock' => 'https://schema.org/InStock',
            'outofstock', 'out_of_stock' => 'https://schema.org/OutOfStock',
            'preorder', 'pre_order' => 'https://schema.org/PreOrder',
            'backorder', 'back_order' => 'https://schema.org/BackOrder',
            'limitedavailability', 'limited_availability' => 'https://schema.org/LimitedAvailability',
            'discontinued' => 'https://schema.org/Discontinued',
            default => str_starts_with($value, 'http') ? $value : 'https://schema.org/InStock',
        };
    }
}
