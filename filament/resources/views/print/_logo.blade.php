@php
    /*
     * Resolve the print logo for all documents.
     *
     * Priority:
     * 1. Static print logo file: resources/views/print/logo_print.png (embedded as base64 for DomPDF safety)
     * 2. Fallback to old coordinate-based logo logic if the static file is missing.
     */
    $logoUrl = null;

    // 1) Preferred static logo file
    $staticLogoPath = resource_path('views/print/logo_print.png');
    if (is_file($staticLogoPath)) {
        $mime    = @mime_content_type($staticLogoPath) ?: 'image/png';
        $logoUrl = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($staticLogoPath));
    } else {
        // 2) Fallback – legacy coordinate-based resolution
        $coordonnee = $coordonnee ?? $company ?? null;
        $rawLogo = $coordonnee->logo_facture ?? null;

        if ($rawLogo && trim((string) $rawLogo) !== '') {
            $rawLogo = trim((string) $rawLogo);

            if (preg_match('#^https?://#i', $rawLogo)) {
                $logoUrl = $rawLogo;
            } else {
                $logoPath = str_replace('\\', '/', $rawLogo);
                $logoPath = ltrim($logoPath, '/');
                if (str_starts_with($logoPath, 'storage/')) {
                    $logoPath = substr($logoPath, strlen('storage/'));
                }

                $projectRoot    = dirname(base_path());
                $sep            = DIRECTORY_SEPARATOR;
                $logoPathNative = str_replace('/', $sep, $logoPath);
                $candidates     = [
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
                    $logoUrl = asset('storage/' . $logoPath);
                }
            }
        }
    }
@endphp
