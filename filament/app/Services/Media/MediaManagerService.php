<?php

namespace App\Services\Media;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class MediaManagerService
{
    public function __construct(
        private readonly ?string $disk = null,
    ) {}

    public function getDiskName(): string
    {
        return $this->disk ?: (string) config('filament.default_filesystem_disk', 'public');
    }

    public function breadcrumbs(string $path): array
    {
        $normalized = $this->normalizePath($path);
        if ($normalized === '') {
            return [];
        }

        $segments = explode('/', $normalized);
        $crumbs = [];
        $current = '';

        foreach ($segments as $segment) {
            $current = ltrim($current . '/' . $segment, '/');
            $crumbs[] = [
                'name' => $segment,
                'path' => $current,
            ];
        }

        return $crumbs;
    }

    public function listContents(string $path, string $search = '', string $typeFilter = 'all'): array
    {
        $path = $this->normalizePath($path);
        $search = trim($search);
        $filterImagesOnly = $typeFilter === 'images';
        $disk = $this->disk();

        $directories = collect($disk->directories($path))
            ->map(fn (string $directory): array => [
                'type' => 'folder',
                'name' => basename($directory),
                'path' => $directory,
                'modified_at' => $this->safeLastModified($directory, true),
            ])
            ->filter(function (array $directory) use ($search): bool {
                if ($search === '') {
                    return true;
                }

                return Str::contains(Str::lower($directory['name']), Str::lower($search));
            })
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();

        $files = collect($disk->files($path))
            ->map(function (string $file) use ($disk): array {
                $mimeType = $this->safeMimeType($file);
                $extension = Str::lower((string) pathinfo($file, PATHINFO_EXTENSION));
                $isImage = Str::startsWith((string) $mimeType, 'image/')
                    || in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'], true);

                return [
                    'type' => 'file',
                    'name' => basename($file),
                    'path' => $file,
                    'url' => $disk->url($file),
                    'size' => $this->safeSize($file),
                    'mime_type' => $mimeType,
                    'extension' => $extension,
                    'is_image' => $isImage,
                    'modified_at' => $this->safeLastModified($file),
                ];
            })
            ->filter(function (array $file) use ($search, $filterImagesOnly): bool {
                if ($filterImagesOnly && (! $file['is_image'])) {
                    return false;
                }

                if ($search === '') {
                    return true;
                }

                return Str::contains(Str::lower($file['name']), Str::lower($search));
            })
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();

        return [
            'path' => $path,
            'breadcrumbs' => $this->breadcrumbs($path),
            'directories' => $directories,
            'files' => $files,
        ];
    }

    public function createFolder(string $currentPath, string $name): string
    {
        $currentPath = $this->normalizePath($currentPath);
        $folderName = $this->normalizeName($name);
        $targetPath = ltrim(trim($currentPath . '/' . $folderName, '/'), '/');

        if ($this->disk()->exists($targetPath)) {
            throw new RuntimeException('Ce dossier existe deja.');
        }

        $created = $this->disk()->makeDirectory($targetPath);

        if (! $created) {
            throw new RuntimeException('Impossible de creer le dossier.');
        }

        return $targetPath;
    }

    public function renameFolder(string $path, string $newName): string
    {
        $path = $this->normalizePath($path);
        if ($path === '') {
            throw new RuntimeException('Le dossier racine ne peut pas etre renomme.');
        }

        $newName = $this->normalizeName($newName);
        $parent = trim((string) Str::beforeLast($path, '/'));
        $target = trim(ltrim(($parent !== '' ? $parent . '/' : '') . $newName, '/'));

        if ($target === $path) {
            return $target;
        }

        if ($this->disk()->exists($target)) {
            throw new RuntimeException('Un element avec ce nom existe deja.');
        }

        if (! $this->disk()->move($path, $target)) {
            throw new RuntimeException('Impossible de renommer le dossier.');
        }

        return $target;
    }

    public function deleteFolderIfEmpty(string $path): void
    {
        $path = $this->normalizePath($path);
        if ($path === '') {
            throw new RuntimeException('Le dossier racine ne peut pas etre supprime.');
        }

        if (count($this->disk()->directories($path)) > 0 || count($this->disk()->files($path)) > 0) {
            throw new RuntimeException('Le dossier doit etre vide pour etre supprime.');
        }

        if (! $this->disk()->deleteDirectory($path)) {
            throw new RuntimeException('Impossible de supprimer le dossier.');
        }
    }

    public function renameFile(string $path, string $newName): string
    {
        $path = $this->normalizePath($path);
        $newName = $this->normalizeName($newName);

        $directory = trim((string) Str::beforeLast($path, '/'));
        $target = trim(ltrim(($directory !== '' ? $directory . '/' : '') . $newName, '/'));

        if ($target === $path) {
            return $target;
        }

        if ($this->disk()->exists($target)) {
            throw new RuntimeException('Un fichier avec ce nom existe deja.');
        }

        if (! $this->disk()->move($path, $target)) {
            throw new RuntimeException('Impossible de renommer le fichier.');
        }

        return $target;
    }

    public function deleteFile(string $path): void
    {
        $path = $this->normalizePath($path);

        if (! $this->disk()->exists($path)) {
            throw new RuntimeException('Fichier introuvable.');
        }

        if (! $this->disk()->delete($path)) {
            throw new RuntimeException('Impossible de supprimer le fichier.');
        }
    }

    public function normalizePath(string $path): string
    {
        $normalized = str_replace('\\', '/', trim($path));
        $normalized = preg_replace('#/+#', '/', $normalized) ?? '';
        $normalized = trim($normalized, '/');

        if ($normalized === '' || $normalized === '.') {
            return '';
        }

        $segments = array_values(array_filter(explode('/', $normalized), static fn (string $segment): bool => $segment !== ''));

        foreach ($segments as $segment) {
            if ($segment === '.' || $segment === '..') {
                throw new RuntimeException('Chemin invalide.');
            }
        }

        return implode('/', $segments);
    }

    public function normalizeName(string $name): string
    {
        $value = trim($name);
        $value = preg_replace('/\s+/', ' ', $value) ?? '';
        $value = str_replace(['/', '\\'], '', $value);

        if ($value === '' || $value === '.' || $value === '..') {
            throw new RuntimeException('Nom invalide.');
        }

        return $value;
    }

    private function disk(): FilesystemAdapter
    {
        return Storage::disk($this->getDiskName());
    }

    private function safeMimeType(string $path): ?string
    {
        try {
            return $this->disk()->mimeType($path);
        } catch (\Throwable) {
            return null;
        }
    }

    private function safeSize(string $path): int
    {
        try {
            return (int) $this->disk()->size($path);
        } catch (\Throwable) {
            return 0;
        }
    }

    private function safeLastModified(string $path, bool $directory = false): int
    {
        try {
            return (int) $this->disk()->lastModified($path);
        } catch (\Throwable) {
            return $directory ? 0 : time();
        }
    }
}

