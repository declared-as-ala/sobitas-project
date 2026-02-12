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
     * Get the cover image URL (Cloudinary or local storage)
     */
    protected function coverUrl(): Attribute
    {
        return Attribute::make(
            get: function ($value, $attributes) {
                $cover = $attributes['cover'] ?? null;
                if (!$cover) {
                    return null;
                }

                // If already a full URL (Cloudinary), return as-is
                if (str_starts_with($cover, 'http://') || str_starts_with($cover, 'https://')) {
                    return $cover;
                }

                // If it's a Cloudinary public_id (no slashes), construct Cloudinary URL
                if (!str_contains($cover, '/') && config('filesystems.default') === 'cloudinary') {
                    $cloudName = config('cloudinary.cloud_name');
                    if ($cloudName) {
                        return "https://res.cloudinary.com/{$cloudName}/image/upload/{$cover}";
                    }
                }

                // Fallback: local storage URL
                return asset('storage/' . ltrim($cover, '/'));
            }
        );
    }
}
