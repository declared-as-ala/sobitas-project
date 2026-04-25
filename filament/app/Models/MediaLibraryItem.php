<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class MediaLibraryItem extends Model
{
    protected $table = 'media_library_items';

    protected $fillable = [
        'disk',
        'path',
        'alt_text',
        'title',
        'caption',
        'description',
        'meta_title',
        'meta_description',
        'width',
        'height',
        'mime_type',
        'size',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'width' => 'integer',
            'height' => 'integer',
            'size' => 'integer',
        ];
    }

    public function publicUrl(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function thumbnailUrl(): string
    {
        return $this->publicUrl();
    }

    public function syncFromDisk(): void
    {
        $disk = Storage::disk($this->disk);
        if (! $disk->exists($this->path)) {
            return;
        }

        $this->size = (int) $disk->size($this->path);
        try {
            $this->mime_type = $disk->mimeType($this->path);
        } catch (\Throwable) {
            $this->mime_type = null;
        }

        [$w, $h] = self::readDimensions($this->disk, $this->path);
        $this->width = $w;
        $this->height = $h;
        $this->save();
    }

    /**
     * @return array{0: ?int, 1: ?int}
     */
    public static function readDimensions(string $disk, string $path): array
    {
        $fullPath = Storage::disk($disk)->path($path);
        $mime = null;
        try {
            $mime = Storage::disk($disk)->mimeType($path);
        } catch (\Throwable) {
        }

        if ($mime === 'image/svg+xml' || str_ends_with(strtolower($path), '.svg')) {
            return [null, null];
        }

        if (! is_readable($fullPath)) {
            return [null, null];
        }

        $data = @getimagesize($fullPath);
        if ($data === false || ! isset($data[0], $data[1])) {
            return [null, null];
        }

        return [(int) $data[0], (int) $data[1]];
    }

    public function getFileNameAttribute(): string
    {
        return basename($this->path);
    }
}
