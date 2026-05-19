<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
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
        'extra_json_ld' => 'array',
        'robots_index' => 'boolean',
        'robots_follow' => 'boolean',
        'seo_enabled' => 'boolean',
        'sitemap_include' => 'boolean',
        'sitemap_priority' => 'float',
    ];

    /**
     * Repeater accessors — guarantee Filament always receives an array of rows,
     * even if the DB column holds legacy double-encoded JSON, a comma-separated
     * string, a flat list of scalars, or {question,answer}-shaped FAQ items.
     */
    protected function faq(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => self::decodeFaqRows($value),
            set: fn ($value) => is_array($value) ? json_encode(array_values($value), JSON_UNESCAPED_UNICODE) : $value,
        );
    }

    protected function secondaryKeywords(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => self::decodeRepeaterRows($value, 'term'),
            set: fn ($value) => is_array($value) ? json_encode(array_values($value), JSON_UNESCAPED_UNICODE) : $value,
        );
    }

    protected function seoTags(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => self::decodeRepeaterRows($value, 'tag'),
            set: fn ($value) => is_array($value) ? json_encode(array_values($value), JSON_UNESCAPED_UNICODE) : $value,
        );
    }

    protected function relatedCategorySlugs(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => self::decodeRepeaterRows($value, 'slug'),
            set: fn ($value) => is_array($value) ? json_encode(array_values($value), JSON_UNESCAPED_UNICODE) : $value,
        );
    }

    private static function decodeFaqRows(mixed $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            $value = is_array($decoded) ? $decoded : [];
        }
        if (! is_array($value)) {
            return [];
        }
        $rows = [];
        foreach ($value as $item) {
            if (! is_array($item) && ! is_object($item)) {
                continue;
            }
            $item = (array) $item;
            $q = trim((string) ($item['q'] ?? $item['question'] ?? ''));
            $a = trim((string) ($item['a'] ?? $item['answer'] ?? $item['reponse'] ?? ''));
            if ($q !== '' || $a !== '') {
                $rows[] = ['q' => $q, 'a' => $a];
            }
        }
        return $rows;
    }

    private static function decodeRepeaterRows(mixed $value, string $rowKey): array
    {
        if ($value === null || $value === '') {
            return [];
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = array_values(array_filter(array_map('trim', preg_split('/[,;]/', $value) ?: [])));
            }
        }
        if (! is_array($value)) {
            return [];
        }
        $rows = [];
        foreach ($value as $item) {
            if (is_array($item) || is_object($item)) {
                $rows[] = (array) $item;
                continue;
            }
            if (is_scalar($item) && (string) $item !== '') {
                $rows[] = [$rowKey => (string) $item];
            }
        }
        return $rows;
    }

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
