<?php

namespace App\Models;

use App\Enums\BlogArticleType;
use App\Filament\Support\ArticleDescriptionHtml;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Schema;
use JsonException;

class Article extends Model
{
    protected $table = 'articles';

    protected $guarded = ['id'];

    /**
     * True when migration adding `blog_type` has been applied (avoids SQL errors on older DBs).
     */
    public static function hasBlogTypeColumn(): bool
    {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }
        try {
            return $cached = Schema::hasTable('articles') && Schema::hasColumn('articles', 'blog_type');
        } catch (\Throwable) {
            return $cached = false;
        }
    }

    /**
     * Normalize DB `description` for Filament RichEditor form state (TipTap document array, or empty default).
     *
     * @param  mixed  $raw  HTML string, JSON string of a TipTap doc, doc array, or null
     * @return array<string, mixed>|string|null
     */
    public static function prepareDescriptionForRichEditorForm(mixed $raw): mixed
    {
        if ($raw === null || $raw === '') {
            return $raw;
        }

        if (is_array($raw)) {
            return $raw;
        }

        $str = trim((string) $raw);
        if ($str === '') {
            return $raw;
        }

        if (str_starts_with($str, '{')) {
            try {
                $decoded = json_decode($str, true, 512, JSON_THROW_ON_ERROR);
                if (is_array($decoded) && ($decoded['type'] ?? null) === 'doc') {
                    return $decoded;
                }
            } catch (JsonException) {
                // Not JSON — treat as HTML below
            }
        }

        try {
            return ArticleDescriptionHtml::tipTapDocumentFromHtml($str);
        } catch (\Throwable) {
            return $raw;
        }
    }

    protected function casts(): array
    {
        $casts = [];
        if (static::hasBlogTypeColumn()) {
            $casts['blog_type'] = BlogArticleType::class;
        }

        return $casts;
    }

    public function scopePublished($query)
    {
        return $query->where('publier', 1);
    }

    /**
     * Get the cover image URL (local storage)
     */
    protected function coverUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value, $attributes) {
                $cover = $attributes['cover'] ?? null;
                if (!$cover) {
                    return null;
                }

                // If already a full URL, return as-is
                if (str_starts_with($cover, 'http://') || str_starts_with($cover, 'https://')) {
                    return $cover;
                }

                // Local storage URL
                return asset('storage/' . ltrim($cover, '/'));
            }
        );
    }
}
