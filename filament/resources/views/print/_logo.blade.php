@php
    /**
     * Print / PDF logo as data-URI (DomPDF-friendly) or absolute URL.
     *
     * Order:
     * 1. resources/views/print/logo_print.png — optional thermal-optimized asset
     * 2. public/logo.png — static fallback (same idea as print/layout.blade.php)
     * 3. coordinates.logo_facture — Filament upload on the public disk (see CoordinateResource)
     * 4. If only an HTTP(S) URL is stored for logo_facture, use as-is (browser print OK; DomPDF needs remote enabled)
     */
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
            break;
        }
    }

    if ($logoUrl === null) {
        $c = $coordonnee ?? null;
        if ($c === null) {
            try {
                $c = \App\Models\Coordinate::getCached();
            } catch (\Throwable) {
                $c = null;
            }
        }

        $raw = $c?->logo_facture;
        if (is_string($raw) && trim($raw) !== '') {
            $raw = trim($raw);
            if (preg_match('#^https?://#i', $raw)) {
                $logoUrl = $raw;
            } else {
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
                        break;
                    }
                }

                if ($logoUrl === null) {
                    $logoUrl = asset('storage/'.$rel);
                }
            }
        }
    }
@endphp
