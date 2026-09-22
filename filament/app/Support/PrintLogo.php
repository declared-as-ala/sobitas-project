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
    /**
     * The SOBITAS wordmark, for documents that carry the LEGAL ENTITY rather than the storefront.
     *
     * `resolve()` returns whatever the invoice logo happens to be — today that is the Protein.tn
     * storefront mark, because public/logo-facture.png is first in its candidate list. On a bon de
     * livraison that is wrong: the company named in the header, in the footer, on the stamp and on
     * every legal line of the document is SOBITAS, so the mark beside that name has to be SOBITAS
     * too. A delivery note is a legal document before it is a marketing surface.
     *
     * Falls back to resolve() so a missing file degrades to the old behaviour rather than to a
     * logo-less document, and embeds as a data URI for the same reason resolve() does: DomPDF has
     * no network.
     */
    public static function sobitas(?Coordinate $coordonnee = null): ?string
    {
        $path = public_path('logo-sobitas.png');
        if (is_file($path)) {
            $mime = @mime_content_type($path) ?: 'image/png';

            return 'data:'.$mime.';base64,'.base64_encode((string) file_get_contents($path));
        }

        return self::resolve($coordonnee);
    }

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
            public_path('logo-facture.png'),
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
