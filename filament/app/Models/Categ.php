<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Categ extends Model
{
    protected $table = 'categs';

    protected $fillable = [
        'sort_order',
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
    ];

    protected function casts(): array
    {
        return [
            'extra_json_ld' => 'array',
            'robots_index' => 'boolean',
            'robots_follow' => 'boolean',
            'seo_enabled' => 'boolean',
            'sitemap_include' => 'boolean',
            'sitemap_priority' => 'float',
        ];
    }

    /**
     * FAQ accessor — guarantees the Filament Repeater always receives an
     * array of {q, a} rows, no matter how the legacy DB column is shaped
     * (double-encoded JSON, comma-separated string, {question,answer} keys, etc.).
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
            } elseif (is_string($decoded) && trim($decoded, " \t\n\r\0\x0B\"'") === '[]') {
                return [];
            } elseif (trim($value, " \t\n\r\0\x0B\"'") === '[]') {
                return [];
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
