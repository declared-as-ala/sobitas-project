<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Categ extends Model
{
    protected $table = 'categs';

    protected $fillable = [
        'designation_fr',
        'slug',
        'cover',
        'meta_title',
        'meta_description',
    ];

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
        if (!$this->cover) {
            return null;
        }

        // If it's already a full URL, extract the relative path
        if (filter_var($this->cover, FILTER_VALIDATE_URL)) {
            // Extract path from URL (e.g., https://admin.sobitas.tn/storage/categories/image.webp -> categories/image.webp)
            $path = parse_url($this->cover, PHP_URL_PATH);
            $path = ltrim($path, '/');
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, 8); // Remove 'storage/' prefix
            }
            return Storage::disk('public')->url($path);
        }

        // If it's a relative path, use it directly
        return Storage::disk('public')->url($this->cover);
    }

    /**
     * Mutator to normalize cover path to relative path only.
     * Removes full URLs and stores only the relative path.
     */
    public function setCoverAttribute($value): void
    {
        if ($value && filter_var($value, FILTER_VALIDATE_URL)) {
            // Extract relative path from full URL
            $path = parse_url($value, PHP_URL_PATH);
            $path = ltrim($path, '/');
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, 8); // Remove 'storage/' prefix
            }
            $this->attributes['cover'] = $path;
        } else {
            $this->attributes['cover'] = $value;
        }
    }
}
