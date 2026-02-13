<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Article extends Model
{
    protected $table = 'articles';

    protected $guarded = ['id'];

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
