<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Slide extends Model
{
    protected $table = 'slides';

    protected $guarded = ['id'];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];

    /**
     * Get the image URL attribute.
     * Normalizes full URLs to relative paths and generates correct storage URL.
     */
    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image) {
            return null;
        }

        // If it's already a full URL, extract the relative path
        if (filter_var($this->image, FILTER_VALIDATE_URL)) {
            // Extract path from URL (e.g., https://admin.sobitas.tn/storage/slides/image.webp -> slides/image.webp)
            $path = parse_url($this->image, PHP_URL_PATH);
            $path = ltrim($path, '/');
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, 8); // Remove 'storage/' prefix
            }
            return Storage::disk('public')->url($path);
        }

        // If it's a relative path, use it directly
        return Storage::disk('public')->url($this->image);
    }

    /**
     * Mutator to normalize image path to relative path only.
     * Removes full URLs and stores only the relative path.
     */
    public function setImageAttribute($value): void
    {
        if ($value && filter_var($value, FILTER_VALIDATE_URL)) {
            // Extract relative path from full URL
            $path = parse_url($value, PHP_URL_PATH);
            $path = ltrim($path, '/');
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, 8); // Remove 'storage/' prefix
            }
            $this->attributes['image'] = $path;
        } else {
            $this->attributes['image'] = $value;
        }
    }
}
