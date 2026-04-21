<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Coordinate;

/**
 * Resolves print/PDF logo as data-URI (DomPDF-friendly) or absolute URL.
 * Centralizes logic so Blade @include partials do not lose $logoUrl in parent scope.
 *
 * Priority:
 * 1. resources/views/print/logo_print.png
 * 2. public/logo.png
 * 3. Coordinate::getCached() / passed coordinate — logo_facture (path or URL)
 */
final class PrintLogo
{
    public static function resolve(?Coordinate $coordonnee = null): ?string
    {
        $logoUrl = null;

        $embedFileAsDataUri = static function (string $absPath): ?string {
            if (! is_file($absPath)) {
                return null;
            }
            $mime = @mime_content_type($absPath) ?: 'image/png';

            return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($absPath));
        };

        $candidates = [
            resource_path('views/print/logo_print.png'),
            public_path('logo.png'),
        ];

        foreach ($candidates as $path) {
            $logoUrl = $embedFileAsDataUri($path);
            if ($logoUrl !== null) {
                return $logoUrl;
            }
        }

        $c = $coordonnee;
        if ($c === null) {
            try {
                $c = Coordinate::getCached();
            } catch (\Throwable) {
                $c = null;
            }
        }

        $raw = $c?->logo_facture;
        if (! is_string($raw) || trim($raw) === '') {
            return null;
        }

        $raw = trim($raw);
        if (preg_match('#^https?://#i', $raw)) {
            return $raw;
        }

        $rel = str_replace('\\', '/', $raw);
        $rel = ltrim($rel, '/');
        if (str_starts_with($rel, 'storage/')) {
            $rel = substr($rel, strlen('storage/'));
        }

        $pathsToTry = [
            public_path('storage/'.$rel),
        ];

        $projectRoot = dirname(base_path());
        $sep = DIRECTORY_SEPARATOR;
        $nativeRel = str_replace('/', $sep, $rel);
        $pathsToTry[] = $projectRoot.$sep.'backend'.$sep.'public'.$sep.'storage'.$sep.$nativeRel;
        $pathsToTry[] = $projectRoot.$sep.'backend'.$sep.'storage'.$sep.'app'.$sep.'public'.$sep.$nativeRel;

        foreach ($pathsToTry as $diskPath) {
            $logoUrl = $embedFileAsDataUri($diskPath);
            if ($logoUrl !== null) {
                return $logoUrl;
            }
        }

        return asset('storage/'.$rel);
    }
}
