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

    protected $casts = [
        'is_active' => 'boolean',
        'ordre'     => 'integer',
    ];

    /**
     * `type` is a retained legacy column (web|mobile) whose form field was removed when slides
     * moved to one-row-per-slide. Nothing writes it any more, and it is a pre-Laravel column
     * whose definition is not in any migration — if it is NOT NULL with no default, MySQL
     * strict mode (config/database.php: 'strict' => true) would throw SQLSTATE[HY000] 1364 on
     * every insert and no slide could be created from the admin again.
     *
     * Defaulting it on the model is schema-agnostic: it costs nothing if the column is
     * nullable, and prevents a fatal if it is not. Applies only to new instances, so existing
     * rows are untouched. Safer than an ALTER, since `->change()` in Laravel 11+ rewrites the
     * whole column definition and the original type/length here is unknown.
     */
    protected $attributes = [
        'type' => 'web',
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
            // Extract path from URL (e.g., https://admin.protein.tn/storage/slides/image.webp -> slides/image.webp)
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
        $this->attributes['image'] = self::toRelativePath($value);
    }

    /**
     * Same normalization for the optional mobile crop — without this, a full URL pasted
     * into image_mobile would be stored verbatim and the <picture> source would break.
     */
    public function setImageMobileAttribute($value): void
    {
        $this->attributes['image_mobile'] = self::toRelativePath($value);
    }

    /** Strip a full URL (and any leading storage/ prefix) down to a relative disk path. */
    private static function toRelativePath($value): ?string
    {
        if (! $value || ! filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        $path = ltrim((string) parse_url($value, PHP_URL_PATH), '/');

        return str_starts_with($path, 'storage/') ? substr($path, 8) : $path;
    }
}
