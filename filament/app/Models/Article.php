<?php

namespace App\Models;

use App\Enums\BlogArticleType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Support\Facades\Schema;

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
