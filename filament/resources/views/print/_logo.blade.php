@php
    /*
     * Resolve the print logo for all documents.
     *
     * We now **always** use the static file:
     *   resources/views/print/logo_print.png
     * embedded as base64 for DomPDF safety.
     *
     * No more fallback to URLs like /logo.png, to avoid 404s.
     */
    $logoUrl = null;

    $staticLogoPath = resource_path('views/print/logo_print.png');
    if (is_file($staticLogoPath)) {
        $mime    = @mime_content_type($staticLogoPath) ?: 'image/png';
        $logoUrl = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($staticLogoPath));
    }
@endphp
