<?php

namespace App\Services\Media;

use App\Models\MediaLibraryItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MediaLibraryItemService
{
    public function __construct(
        private readonly MediaManagerService $mediaPaths,
    ) {}

    public function normalizeStoragePath(string $path): string
    {
        return $this->mediaPaths->normalizePath($path);
    }

    public function ensureFromDisk(string $disk, string $path): MediaLibraryItem
    {
        $path = $this->normalizeStoragePath($path);
        $item = MediaLibraryItem::firstOrNew([
            'disk' => $disk,
            'path' => $path,
        ]);

        $this->hydrateTechnicalFromDisk($item);

        if (! filled($item->title)) {
            $item->title = $this->defaultTitleFromPath($path);
        }

        $item->save();

        return $item->fresh() ?? $item;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateMetadata(string $disk, string $path, array $data): MediaLibraryItem
    {
        $path = $this->normalizeStoragePath($path);
        $item = MediaLibraryItem::where('disk', $disk)->where('path', $path)->firstOrFail();

        $item->fill([
            'alt_text' => $data['alt_text'] ?? null,
            'title' => $data['title'] ?? null,
            'caption' => $data['caption'] ?? null,
            'description' => $data['description'] ?? null,
            'meta_title' => $data['meta_title'] ?? null,
            'meta_description' => $data['meta_description'] ?? null,
        ]);
        $item->save();

        return $item->fresh() ?? $item;
    }

    public function movePath(string $disk, string $from, string $to): void
    {
        $from = $this->normalizeStoragePath($from);
        $to = $this->normalizeStoragePath($to);

        if ($from === $to) {
            return;
        }

        DB::transaction(function () use ($disk, $from, $to): void {
            $prefix = $from . '/';
            $length = strlen($prefix);

            $descendants = MediaLibraryItem::query()
                ->where('disk', $disk)
                ->where('path', 'like', $from . '/%')
                ->orderBy('id')
                ->get();

            foreach ($descendants as $item) {
                if (! str_starts_with($item->path, $prefix)) {
                    continue;
                }
                $suffix = substr($item->path, $length);
                $item->path = ($to === '' ? $suffix : $to . '/' . $suffix);
                $item->save();
            }

            $direct = MediaLibraryItem::where('disk', $disk)->where('path', $from)->first();
            if ($direct) {
                $direct->path = $to;
                $direct->save();
            }
        });
    }

    public function deleteByPath(string $disk, string $path): void
    {
        $path = $this->normalizeStoragePath($path);

        MediaLibraryItem::where('disk', $disk)
            ->where(function ($q) use ($path): void {
                $q->where('path', $path)
                    ->orWhere('path', 'like', $path . '/%');
            })
            ->delete();
    }

    /**
     * @param  list<array<string, mixed>>  $files
     * @return list<array<string, mixed>>
     */
    public function mergeIntoFileRows(string $disk, array $files): array
    {
        if ($files === []) {
            return $files;
        }

        $paths = array_values(array_unique(array_filter(array_map(
            fn (array $f): string => $this->normalizeStoragePath((string) ($f['path'] ?? '')),
            $files
        ))));

        if ($paths === []) {
            return $files;
        }

        $byPath = MediaLibraryItem::query()
            ->where('disk', $disk)
            ->whereIn('path', $paths)
            ->get()
            ->keyBy('path');

        return array_map(function (array $file) use ($byPath): array {
            $p = $this->normalizeStoragePath((string) ($file['path'] ?? ''));
            $file['library'] = $byPath->get($p)?->only([
                'alt_text', 'title', 'caption', 'description', 'meta_title', 'meta_description',
                'width', 'height', 'mime_type', 'size',
            ]) ?? null;

            return $file;
        }, $files);
    }

    public function hydrateTechnicalFromDisk(MediaLibraryItem $item): void
    {
        $disk = \Illuminate\Support\Facades\Storage::disk($item->disk);
        if (! $disk->exists($item->path)) {
            return;
        }

        try {
            $item->size = (int) $disk->size($item->path);
        } catch (\Throwable) {
            $item->size = null;
        }

        try {
            $item->mime_type = $disk->mimeType($item->path);
        } catch (\Throwable) {
            $item->mime_type = null;
        }

        [$w, $h] = MediaLibraryItem::readDimensions($item->disk, $item->path);
        $item->width = $w;
        $item->height = $h;
    }

    private function defaultTitleFromPath(string $path): string
    {
        $base = pathinfo($path, PATHINFO_FILENAME);
        $base = str_replace(['-', '_'], ' ', $base);

        return Str::title(trim($base)) ?: basename($path);
    }
}
