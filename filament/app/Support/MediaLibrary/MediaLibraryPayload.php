<?php

namespace App\Support\MediaLibrary;

use App\Filament\Support\ImagePath;
use App\Models\MediaLibraryItem;
use Illuminate\Support\Facades\Storage;

class MediaLibraryPayload
{
    /**
     * @param  list<string|null>  $paths
     * @return array<string, array<string, mixed>>
     */
    public static function forPaths(string $disk, array $paths): array
    {
        $normalized = [];
        foreach ($paths as $path) {
            $n = ImagePath::normalize($path);
            if ($n !== null && $n !== '') {
                $normalized[$n] = true;
            }
        }

        $keys = array_keys($normalized);
        if ($keys === []) {
            return [];
        }

        $items = MediaLibraryItem::query()
            ->where('disk', $disk)
            ->whereIn('path', $keys)
            ->get()
            ->keyBy('path');

        $out = [];
        foreach ($keys as $path) {
            $item = $items->get($path);
            if (! $item) {
                continue;
            }
            $out[$path] = self::serializeItem($item);
        }

        return $out;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function forPath(string $disk, ?string $path): ?array
    {
        $n = ImagePath::normalize($path);
        if ($n === null || $n === '') {
            return null;
        }

        $map = self::forPaths($disk, [$n]);

        return $map[$n] ?? null;
    }

    /**
     * @return array<string, mixed>
     */
    public static function serializeItem(MediaLibraryItem $item): array
    {
        return [
            'path' => $item->path,
            'file_name' => $item->file_name,
            'url' => $item->publicUrl(),
            'alt_text' => $item->alt_text,
            'title' => $item->title,
            'caption' => $item->caption,
            'description' => $item->description,
            'meta_title' => $item->meta_title,
            'meta_description' => $item->meta_description,
            'width' => $item->width,
            'height' => $item->height,
            'mime_type' => $item->mime_type,
            'size' => $item->size,
        ];
    }

    /**
     * Public disk URL for a path (no DB row required).
     */
    public static function publicUrlForPath(string $disk, string $path): string
    {
        $path = ImagePath::normalize($path) ?? $path;

        return Storage::disk($disk)->url($path);
    }
}
