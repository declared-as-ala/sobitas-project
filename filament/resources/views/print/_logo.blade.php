@php
    /*
     * Resolve the invoice logo from coordinates.logo_facture.
     * Searches multiple locations because the file may live in the backend app's
     * public/storage rather than Filament's own storage symlink.
     * Returns a base64 data-URI when the file is found on disk (works for both
     * browser print and DomPDF), or a plain asset URL as last resort.
     */
    $logoUrl = null;
    $rawLogo = $coordonnee->logo_facture ?? null;

    if ($rawLogo && trim((string) $rawLogo) !== '') {
        $rawLogo = trim((string) $rawLogo);

        if (preg_match('#^https?://#i', $rawLogo)) {
            // Already a full URL – use as-is
            $logoUrl = $rawLogo;
        } else {
            $logoPath = str_replace('\\', '/', $rawLogo);
            $logoPath = ltrim($logoPath, '/');
            if (str_starts_with($logoPath, 'storage/')) {
                $logoPath = substr($logoPath, strlen('storage/'));
            }

            // Candidate locations – Filament storage first, then backend storage
            $projectRoot = dirname(base_path());
            $sep = DIRECTORY_SEPARATOR;
            $logoPathNative = str_replace('/', $sep, $logoPath);
            $candidates = [
                public_path('storage/' . $logoPath),
                $projectRoot . $sep . 'backend' . $sep . 'public' . $sep . 'storage' . $sep . $logoPathNative,
                $projectRoot . $sep . 'backend' . $sep . 'storage' . $sep . 'app' . $sep . 'public' . $sep . $logoPathNative,
            ];

            $foundPath = null;
            foreach ($candidates as $candidate) {
                if (is_file($candidate)) {
                    $foundPath = $candidate;
                    break;
                }
            }

            if ($foundPath) {
                $mime    = @mime_content_type($foundPath) ?: 'image/png';
                $logoUrl = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($foundPath));
            } else {
                // File not found on disk – fall back to a plain URL
                $logoUrl = asset('storage/' . $logoPath);
            }
        }
    }
@endphp
