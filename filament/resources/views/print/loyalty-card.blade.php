<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Cartes Fidélité Sobitas</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    @php
        $company      = \App\Models\Coordinate::getCached();
        $logoSrc      = $logoDataUri ?? null;
        $cardsPerPage = max(1, min(12, (int) ($cardsPerPage ?? 8)));
        $cardChunks   = collect($cards)->chunk($cardsPerPage);
        $sideMode     = in_array(($sideMode ?? 'both'), ['both', 'front', 'back'], true) ? $sideMode : 'both';
        $showFront    = in_array($sideMode, ['both', 'front'], true);
        $showBack     = in_array($sideMode, ['both', 'back'], true);
        $loyaltyService = app(\App\Services\LoyaltyService::class);

        // ── Inline SVG → Base64 Data URIs for DomPDF compatibility ──────────
        // DomPDF cannot render inline <svg> elements; we embed them as <img src="data:image/svg+xml;base64,...">
        function svgB64(string $svg): string {
            return 'data:image/svg+xml;base64,' . base64_encode($svg);
        }

        // Gift / Offers icon
        $icoGift = svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35C12.46 2.54 11.55 2 10.5 2 8.84 2 7.5 3.34 7.5 5c0 .35.07.69.18 1H5c-1.1 0-2 .9-2 2v3c0 .55.45 1 1 1h1v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12h1c.55 0 1-.45 1-1V8c0-1.1-.9-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-5 1c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm11 15H7v-8h11v8z"/></svg>');
        // Tag / Discount icon
        $icoTag = svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 8c-.83 0-1.5-.67-1.5-1.5S4.67 5 5.5 5 7 5.67 7 6.5 6.33 8 5.5 8z"/></svg>');
        // Star / Points icon
        $icoStar = svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>');
        // Trophy / Privileges icon
        $icoTrophy = svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.42 1.72 4.44 4 4.9V18c0 1.1.9 2 2 2h1v2h4v-2h1c1.1 0 2-.9 2-2v-3.1c2.28-.46 4-2.48 4-4.9V7c0-1.1-.9-2-2-2zm-14 5V7h2v3c0 1.1-.9 2-2 2zm14 0c0 .55-.45 1-1 1s-2-.9-2-2V7h2v3z"/></svg>');
        // Phone icon
        $icoPhone = svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.2c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/></svg>');
        // Globe icon
        $icoGlobe = svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>');
        // Shield icon
        $icoShield = svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.9 14.3L7 13.2l1.4-1.4 1.7 1.7 4.7-4.7 1.4 1.4-6.1 6.1z"/></svg>');
        // Scan/Phone icon for "SCAN ME"
        $icoScan = svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z"/></svg>');
        // Barbell / fitness icon
        $icoBell = svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="2" y="11" width="20" height="2" fill="#ff5a0a"/><rect x="4" y="8" width="2" height="8" rx="0.5" fill="#ff5a0a"/><rect x="1" y="9" width="3" height="6" rx="0.5" fill="#ff5a0a"/><rect x="18" y="8" width="2" height="8" rx="0.5" fill="#ff5a0a"/><rect x="20" y="9" width="3" height="6" rx="0.5" fill="#ff5a0a"/><circle cx="12" cy="7" r="2.5" fill="#ff5a0a"/></svg>');
    @endphp
    <style>
        /* ── Design tokens ──────────────────────────────────────────────────── */
        :root {
            --sobitas-orange: #ff5a0a;
            --sobitas-black:  #111214;
            --card-width:     85.60mm;
            --card-height:    54.00mm;
            --card-radius:    3.4mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background: #efefef;
            color: #1a1b1e;
            font-family: Arial, "Helvetica Neue", sans-serif;
        }

        /* ── Screen toolbar ────────────────────────────────────────────────── */
        .print-toolbar {
            position: sticky; top: 0; z-index: 20;
            background: #fff; border-bottom: 1px solid #e5e7eb;
            padding: 12px 20px;
        }
        .btn {
            display: inline-block; padding: 8px 20px; border-radius: 50px;
            font-weight: 700; font-size: 14px; cursor: pointer;
            text-decoration: none; border: 1px solid transparent;
        }
        .btn-dark   { background: #111; color: #fff; }
        .btn-outline{ background: #fff; color: #555; border-color: #ccc; }
        .gap-2 > * + * { margin-left: 8px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .bg-warning { background: #ffc107; color: #111; }
        .small { font-size: 12px; color: #666; }
        .d-flex { display: flex; align-items: center; flex-wrap: wrap; }

        /* ── Sheet (A4 page) ───────────────────────────────────────────────── */
        .sheet {
            width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 12px 30px rgba(0,0,0,.12);
            padding: 8mm;
            page-break-after: always;
        }
        .sheet:last-child { page-break-after: auto; }
        .sheet-title {
            font-size: 13px; font-weight: 700; letter-spacing: .4px;
            text-transform: uppercase; margin-bottom: 6mm; color: #374151;
        }

        /* ── Card grid ─────────────────────────────────────────────────────── */
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(2, 85.60mm);
            gap: 6mm;
            align-content: start;
            justify-content: center;
        }

        /* ── Base card ─────────────────────────────────────────────────────── */
        .sobitas-card {
            width: 85.60mm;
            height: 54.00mm;
            border-radius: 3.4mm;
            border: .28mm solid #dee2e6;
            overflow: hidden;
            position: relative;
            box-shadow: 0 1.2mm 2.8mm rgba(0,0,0,.08);
            background: #fff;
        }

        /* ══════════════════════════════════════════════════════════════════════
           FRONT CARD
           ══════════════════════════════════════════════════════════════════ */
        .sobitas-front { background: #fff; position: relative; overflow: hidden; }

        /* Orange corner badge top-left */
        .front-top-corner {
            position: absolute; top: 0; left: 0;
            width: 9mm; height: 9mm;
            background: #ff5a0a;
            border-bottom-right-radius: 100%;
            z-index: 4;
        }

        /* Decorative SVG background */
        .card-bg-waves {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            z-index: 1; pointer-events: none; overflow: hidden;
        }

        /* Left column – starts AFTER the 9mm corner badge */
        .front-left-content {
            position: absolute;
            left: 10mm;   /* pushed right so logo doesn't overlap orange corner */
            top: 3.5mm;
            width: 42mm;
            height: 42mm;
            z-index: 10;
        }

        /* Logo */
        .logo-wrap { height: 5.5mm; margin-bottom: 1mm; }
        .logo-wrap img { height: 5.5mm; width: auto; max-width: 36mm; display: block; }
        .logo-text-fallback {
            font-size: 4.2mm; font-weight: 900; font-style: italic;
            color: #ff5a0a; letter-spacing: -.02em; line-height: 1;
        }

        /* Card text hierarchy */
        .tagline {
            font-size: 2mm; font-weight: 700; letter-spacing: .25mm;
            color: #1a1b1e; text-transform: uppercase; margin-bottom: .8mm; line-height: 1.1;
        }
        .label-carte {
            font-size: 2.8mm; font-weight: 800; color: #1a1b1e;
            text-transform: uppercase; margin-bottom: .4mm; line-height: 1;
        }
        .label-fidelite {
            font-size: 5.5mm; font-weight: 900; color: #ff5a0a;
            letter-spacing: .1mm; text-transform: uppercase; margin-bottom: .4mm; line-height: 1;
        }
        .front-program {
            font-size: 1.8mm; font-weight: 700; color: #6c757d;
            text-transform: uppercase; letter-spacing: .1mm; line-height: 1.1;
        }

        /* Client details block */
        .client-details-stack { margin-top: 1.8mm; }
        .votre-carte {
            background: #ff5a0a; color: #fff;
            font-size: 1.8mm; font-weight: 800; text-transform: uppercase;
            padding: .45mm 1.2mm .55mm; display: inline-block;
            border-radius: .4mm; margin-bottom: .7mm; letter-spacing: .05mm; line-height: 1;
        }
        .card-number {
            font-size: 3.6mm; font-weight: 900; line-height: 1;
            letter-spacing: .1mm; color: #1a1b1e; margin-bottom: .6mm;
            font-family: "Arial Black", Arial, sans-serif; text-transform: uppercase;
        }
        .front-note { font-size: 2mm; color: #495057; font-weight: 600; line-height: 1.2; }
        .front-note .arrow { color: #ff5a0a; font-size: 2.8mm; font-weight: 900; margin-right: .3mm; vertical-align: middle; }

        /* Right column */
        .front-right-content {
            position: absolute; right: 3.5mm; top: 3.5mm;
            width: 30mm; height: 42mm; z-index: 10; text-align: center;
        }
        .barcode-block {
            width: 30mm; height: 14mm;
            border: .35mm solid #ff5a0a; border-radius: 1.2mm;
            padding: 1mm; background: #fff;
            box-shadow: 0 .4mm 1.2mm rgba(0,0,0,.08);
            margin-bottom: 1.5mm; overflow: hidden;
        }
        .barcode-block img, .barcode-block svg {
            width: 100%; height: 100%; display: block;
        }

        /* SCAN ME pill */
        .scan-pill {
            background: #ff5a0a; color: #fff;
            border-radius: 8mm; font-weight: 800; font-size: 2.2mm;
            letter-spacing: .05mm; display: inline-flex; align-items: center; gap: .5mm;
            padding: .7mm 2.5mm .8mm; line-height: 1; white-space: nowrap;
            box-shadow: 0 .4mm 1mm rgba(255,90,10,.25);
        }
        .scan-pill img { width: 2.8mm; height: 2.8mm; display: inline-block; vertical-align: middle; }

        /* Website label */
        .front-website {
            position: absolute; right: 0; bottom: 9.5mm;
            color: #6c757d; font-size: 2.4mm; font-weight: 700; line-height: 1;
        }

        /* Footer bar */
        .front-footer-bar {
            position: absolute; left: 0; right: 0; bottom: 0;
            height: 7.5mm;
            background: #fff; border-top: .15mm solid #e5e7eb; z-index: 12;
            display: flex; align-items: center;
        }
        .footer-items { display: flex; width: 100%; height: 100%; align-items: center; }
        .footer-bar-item {
            flex: 1; display: flex; align-items: center; justify-content: center;
            padding: 0 .5mm;
        }
        .footer-bar-divider { width: .15mm; height: 4mm; background: #dee2e6; flex-shrink: 0; }
        .footer-bar-icon-wrap {
            width: 3.5mm; height: 3.5mm; background: #ff5a0a; color: #fff;
            border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
            flex-shrink: 0; margin-right: .5mm;
        }
        .footer-bar-icon-wrap img { width: 2.1mm; height: 2.1mm; display: block; }
        .footer-bar-text {
            font-size: 1.35mm; font-weight: 900; color: #212529;
            text-transform: uppercase; line-height: 1.15; text-align: left;
        }

        /* ══════════════════════════════════════════════════════════════════════
           BACK CARD
           ══════════════════════════════════════════════════════════════════ */
        .sobitas-back { background: #fff; position: relative; overflow: hidden; }

        .back-bg-decor {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            z-index: 1; pointer-events: none; overflow: hidden;
        }

        /* Back left column */
        .back-left-content {
            position: absolute; left: 4.5mm; top: 3.5mm;
            width: 42mm; height: 38mm; z-index: 10;
        }
        .back-logo-wrap { height: 5mm; margin-bottom: .8mm; }
        .back-logo-wrap img { height: 5mm; width: auto; max-width: 36mm; display: block; }
        .back-logo-text {
            font-size: 4.5mm; font-weight: 900; font-style: italic;
            color: #ff5a0a; letter-spacing: -.02em; line-height: 1;
        }
        .back-logo-underline { width: 13.5mm; height: .35mm; background: #dee2e6; margin-top: .4mm; }

        .back-title {
            font-size: 3.6mm; font-weight: 900; text-transform: uppercase;
            color: #1a1b1e; margin: .8mm 0 2mm; letter-spacing: .05mm; line-height: 1.1;
        }
        .back-title .orange { color: #ff5a0a; }

        .back-rules-list { margin-top: 1mm; }
        .back-rule-item { margin-bottom: .6mm; display: flex; align-items: center; }
        .back-rule-badge {
            width: 4.5mm; height: 4.5mm; background: #ff5a0a; color: #fff;
            border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
            flex-shrink: 0; font-size: 2.3mm; font-weight: 900; margin-right: 1.5mm;
        }
        .back-rule-badge img { width: 2.5mm; height: 2.5mm; display: block; }
        .back-rule-text {
            font-size: 2.4mm; line-height: 1.15; font-weight: 800;
            text-transform: uppercase; color: #1a1b1e;
        }
        .back-rule-text .orange { color: #ff5a0a; }
        .back-rules-divider { border-top: .15mm solid #dee2e6; margin: 1mm 0; width: 36mm; }

        /* Back right column */
        .back-right-content {
            position: absolute; right: 4mm; top: 6mm;
            width: 31mm; height: 34mm; z-index: 10; text-align: center;
        }
        .back-watermark-row {
            width: 100%; display: flex; align-items: center; justify-content: center;
            height: 7mm; margin-bottom: .5mm;
        }
        .back-watermark-line {
            flex: 1; height: .25mm; background: #ff5a0a; max-width: 9mm;
        }
        .back-watermark-icon {
            width: 6mm; height: 6mm; margin: 0 1mm; flex-shrink: 0;
        }
        .back-watermark-icon img { width: 100%; height: 100%; display: block; }

        .thanks-area-white { text-align: center; color: #1a1b1e; margin-top: 1mm; }
        .thanks-main-white {
            font-size: 3.2mm; font-style: italic; font-weight: 900; line-height: 1.3;
            margin-bottom: 1.5mm;
        }
        .thanks-underline-white { width: 18mm; height: .45mm; background: #ff5a0a; margin: 0 auto; }

        /* Back footer pill */
        .back-footer-pill {
            position: absolute; left: 2.5mm; right: 2.5mm; bottom: 2mm;
            height: 7.2mm; background: #fff; border: .2mm solid #e9ecef;
            border-radius: 3.6mm; z-index: 12;
            box-shadow: 0 .4mm 1.5mm rgba(0,0,0,.04);
            display: flex; align-items: center;
        }
        .back-pill-item {
            display: flex; align-items: center; justify-content: center; padding: 0 1.5mm;
        }
        .back-pill-item-1 { flex: 0 0 50%; border-right: .2mm solid #e9ecef; padding-left: 2mm; justify-content: flex-start; }
        .back-pill-item-2 { flex: 0 0 22%; border-right: .2mm solid #e9ecef; }
        .back-pill-item-3 { flex: 1; justify-content: flex-end; padding-right: 2mm; }
        .back-pill-icon-wrap {
            width: 3.6mm; height: 3.6mm; background: #ff5a0a; color: #fff;
            border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
            flex-shrink: 0; margin-right: .7mm;
        }
        .back-pill-icon-wrap img { width: 2.2mm; height: 2.2mm; display: block; }
        .back-pill-text {
            font-size: 1.4mm; font-weight: 800; color: #343a40; line-height: 1.15;
        }
        .back-pill-item-1 .back-pill-text { font-size: 1.2mm; }
        .back-pill-item-2 .back-pill-text { font-size: 1.35mm; }

        /* ── Print media ───────────────────────────────────────────────────── */
        @media print {
            body { background: #fff; }
            .print-toolbar { display: none !important; }
            .sheet { margin: 0; border-radius: 0; box-shadow: none; padding: 6mm; }
            .sobitas-card { box-shadow: none; }
        }

        /* ── DomPDF overrides (active only when $isPdf === true) ───────────── */
        @if(isset($isPdf) && $isPdf)
        @page { margin: 8mm; }
        body { margin: 0 !important; padding: 0 !important; background: #fff !important; }

        .sheet {
            margin: 0 !important;
            padding: 6mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #fff !important;
            width: 100% !important;
            page-break-after: always !important;
        }

        /* DomPDF has no grid – use floats */
        .cards-grid { display: block !important; width: 100% !important; }
        .cards-grid::after { content: ""; display: table; clear: both; }

        .sobitas-card {
            width: 85.6mm !important;
            height: 54mm !important;
            border-radius: 3.4mm !important;
            box-shadow: none !important;
            float: left !important;
            margin: 2.5mm !important;
            display: block !important;
            position: relative !important;
            overflow: hidden !important;
        }

        /* Force colors (DomPDF ignores CSS variables) */
        .front-top-corner    { background: #ff5a0a !important; }
        .label-fidelite      { color: #ff5a0a !important; }
        .votre-carte         { background: #ff5a0a !important; color: #fff !important; }
        .barcode-block       { border-color: #ff5a0a !important; }
        .scan-pill           { background: #ff5a0a !important; color: #fff !important; }
        .footer-bar-icon-wrap{ background: #ff5a0a !important; }
        .front-note .arrow   { color: #ff5a0a !important; }
        .back-logo-text      { color: #ff5a0a !important; }
        .back-title .orange  { color: #ff5a0a !important; }
        .back-rule-badge     { background: #ff5a0a !important; }
        .back-rule-text .orange { color: #ff5a0a !important; }
        .back-watermark-line { background: #ff5a0a !important; }
        .thanks-underline-white { background: #ff5a0a !important; }
        .back-pill-icon-wrap { background: #ff5a0a !important; }

        /* DomPDF doesn't support flexbox on .front-footer-bar – use floats */
        .front-footer-bar {
            display: block !important;
            height: 7.5mm !important;
            background: #fff !important;
            border-top: .15mm solid #e5e7eb !important;
            position: absolute !important;
            left: 0 !important; right: 0 !important; bottom: 0 !important;
        }
        .footer-items { display: block !important; }
        .footer-bar-item {
            display: block !important;
            float: left !important;
            width: 23% !important;
            padding-top: 1.5mm !important;
            text-align: center !important;
        }
        .footer-bar-divider {
            float: left !important;
            width: .15mm !important;
            height: 4mm !important;
            margin-top: 1.8mm !important;
        }
        .footer-bar-icon-wrap {
            display: inline-block !important;
            vertical-align: middle !important;
            margin-right: .5mm !important;
        }
        .footer-bar-text {
            display: inline-block !important;
            vertical-align: middle !important;
        }

        /* DomPDF can't do absolute positioning inside floated blocks well;
           Keep the position:absolute columns but shift left/right with margins */
        .front-left-content {
            position: absolute !important;
            left: 10mm !important;
            top: 3.5mm !important;
            width: 42mm !important;
            height: 42mm !important;
        }
        .front-right-content {
            position: absolute !important;
            right: 3.5mm !important;
            top: 3.5mm !important;
            width: 30mm !important;
            height: 42mm !important;
        }

        .back-left-content {
            position: absolute !important;
            left: 4.5mm !important;
            top: 3.5mm !important;
            width: 42mm !important;
            height: 38mm !important;
        }
        .back-right-content {
            position: absolute !important;
            right: 4mm !important;
            top: 6mm !important;
            width: 31mm !important;
            height: 34mm !important;
        }

        /* DomPDF flex → block for back-rule-item */
        .back-rule-item     { display: block !important; margin-bottom: .6mm !important; }
        .back-rule-badge    { display: inline-block !important; vertical-align: middle !important; margin-right: 1.5mm !important; }
        .back-rule-text     { display: inline-block !important; vertical-align: middle !important; }

        /* DomPDF flex → block for back-pill */
        .back-footer-pill   { display: block !important; }
        .back-pill-item     { display: block !important; float: left !important; }
        .back-pill-item-1   { width: 50% !important; border-right: .2mm solid #e9ecef !important; padding: 1.8mm 0 0 2mm !important; }
        .back-pill-item-2   { width: 22% !important; border-right: .2mm solid #e9ecef !important; padding-top: 1.8mm !important; text-align: center !important; }
        .back-pill-item-3   { width: 28% !important; padding: 1.8mm 2mm 0 0 !important; text-align: right !important; }
        .back-pill-icon-wrap{ display: inline-block !important; vertical-align: middle !important; margin-right: .7mm !important; }
        .back-pill-text     { display: inline-block !important; vertical-align: middle !important; }

        /* watermark row */
        .back-watermark-row {
            display: block !important;
            text-align: center !important;
        }
        .back-watermark-line {
            display: inline-block !important;
            vertical-align: middle !important;
            width: 9mm !important; height: .25mm !important;
        }
        .back-watermark-icon { display: inline-block !important; vertical-align: middle !important; }

        /* scan-pill for DomPDF (no flexbox) */
        .scan-pill { display: inline-block !important; }
        .scan-pill img { display: inline-block !important; vertical-align: middle !important; margin-right: .5mm !important; }
        @endif
    </style>
</head>
<body>

<div class="print-toolbar no-print">
    <div class="d-flex gap-2">
        <button class="btn btn-dark" onclick="window.print()">🖨️ Imprimer</button>
        <a href="{{ url()->previous() }}" class="btn btn-outline">← Retour</a>
        <span class="badge bg-warning">{{ collect($cards)->count() }} cartes</span>
        @if(isset($batch))
            <span class="small">Lot : <strong>{{ $batch->name ?: "Lot #{$batch->id}" }}</strong></span>
        @endif
        <span class="small">{{ $cardsPerPage }} cartes / planche</span>
    </div>
</div>

@foreach($cardChunks as $chunk)

    {{-- ════════════════════════════════ FACE AVANT ════════════════════════════ --}}
    @if($showFront)
    <section class="sheet">
        <div class="sheet-title">Face avant &middot; Sobitas / protein.tn</div>
        <div class="cards-grid">
            @foreach($chunk as $card)
                @php
                    // Convert barcode SVG → Base64 Data URI so DomPDF can render it
                    $barcodeSvg     = $loyaltyService->generateBarcode39Svg($card->card_number);
                    $barcodeDataUri = 'data:image/svg+xml;base64,' . base64_encode($barcodeSvg);
                @endphp
                <article class="sobitas-card sobitas-front">

                    {{-- Decorative background waves & dot mesh --}}
                    <div class="card-bg-waves" aria-hidden="true">
                        <svg viewBox="0 0 85.6 54" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <path d="M-10,38 C15,28 35,42 60,32 C75,26 85,32 95,28" fill="none" stroke="#ff5a0a" stroke-opacity="0.12" stroke-width="0.2"/>
                            <path d="M-10,41 C18,33 38,47 62,35 C78,29 88,35 98,31" fill="none" stroke="#ff5a0a" stroke-opacity="0.08" stroke-width="0.2"/>
                            <path d="M-10,44 C21,38 41,52 64,38 C81,32 91,38 101,34" fill="none" stroke="#ff5a0a" stroke-opacity="0.05" stroke-width="0.2"/>
                            <defs>
                                <pattern id="dotPat{{ $card->id }}" x="0" y="0" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
                                    <circle cx="0.8" cy="0.8" r="0.35" fill="#ff5a0a" opacity="0.85"/>
                                </pattern>
                            </defs>
                            <path d="M50,54 C60,46 72,42 85.6,35 L85.6,54 Z" fill="url(#dotPat{{ $card->id }})"/>
                        </svg>
                    </div>

                    {{-- Orange corner badge (top-left) --}}
                    <div class="front-top-corner" aria-hidden="true"></div>

                    {{-- Left Column: logo shifted right of corner badge --}}
                    <div class="front-left-content">
                        <div class="logo-wrap">
                            @if($logoSrc)
                                <img src="{{ $logoSrc }}" alt="SOBITAS">
                            @else
                                <p class="logo-text-fallback">SOBITAS</p>
                            @endif
                        </div>
                        <p class="tagline">NUTRITION &amp; PERFORMANCE</p>
                        <div class="title-stack" style="margin-bottom:1.2mm;">
                            <p class="label-carte">CARTE</p>
                            <p class="label-fidelite">FID&Eacute;LIT&Eacute;</p>
                            <p class="front-program">PROGRAMME AVANTAGES</p>
                        </div>
                        <div class="client-details-stack">
                            <span class="votre-carte">VOTRE CARTE</span>
                            <div class="card-number">{{ $card->card_number }}</div>
                            <p class="front-note">
                                <span class="arrow" aria-hidden="true">&#8250;</span>
                                <span>Pr&eacute;sentez cette carte en boutique</span>
                            </p>
                        </div>
                    </div>

                    {{-- Right Column: Barcode (as <img>) + SCAN ME + website --}}
                    <div class="front-right-content">
                        <div class="barcode-block">
                            {{-- Use <img> with base64 data URI – renders in DomPDF AND in browser --}}
                            <img src="{{ $barcodeDataUri }}" alt="{{ $card->card_number }}" style="width:100%;height:100%;display:block;">
                        </div>

                        <div class="scan-pill">
                            <img src="{{ $icoScan }}" alt="" aria-hidden="true">
                            SCAN ME
                        </div>

                        <div class="front-website">protein.tn</div>
                    </div>

                    {{-- Footer advantages bar --}}
                    <div class="front-footer-bar">
                        <div class="footer-items">
                            <div class="footer-bar-item">
                                <div class="footer-bar-icon-wrap"><img src="{{ $icoGift }}" alt=""></div>
                                <span class="footer-bar-text">Offres<br>Exclusives</span>
                            </div>
                            <div class="footer-bar-divider"></div>
                            <div class="footer-bar-item">
                                <div class="footer-bar-icon-wrap"><img src="{{ $icoTag }}" alt=""></div>
                                <span class="footer-bar-text">R&eacute;ductions<br>Perso.</span>
                            </div>
                            <div class="footer-bar-divider"></div>
                            <div class="footer-bar-item">
                                <div class="footer-bar-icon-wrap"><img src="{{ $icoStar }}" alt=""></div>
                                <span class="footer-bar-text">Points<br>Fid&eacute;lit&eacute;</span>
                            </div>
                            <div class="footer-bar-divider"></div>
                            <div class="footer-bar-item">
                                <div class="footer-bar-icon-wrap"><img src="{{ $icoTrophy }}" alt=""></div>
                                <span class="footer-bar-text">Avantages<br>Privil&eacute;gi&eacute;s</span>
                            </div>
                        </div>
                    </div>

                </article>
            @endforeach
            @if(isset($isPdf) && $isPdf)
                <div style="clear:both;"></div>
            @endif
        </div>
    </section>
    @endif

    {{-- ════════════════════════════════ FACE ARRIÈRE ═══════════════════════════ --}}
    @if($showBack)
    <section class="sheet">
        <div class="sheet-title">Face arri&egrave;re &middot; Sobitas / protein.tn</div>
        <div class="cards-grid">
            @foreach($chunk as $card)
                <article class="sobitas-card sobitas-back">

                    {{-- Vector background: diagonal lines + dot rectangles + orange wedge --}}
                    <div class="back-bg-decor" aria-hidden="true">
                        <svg viewBox="0 0 85.6 54" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <pattern id="backDot{{ $card->id }}" x="0" y="0" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
                                    <circle cx="0.8" cy="0.8" r="0.3" fill="#ff5a0a" opacity="0.35"/>
                                </pattern>
                            </defs>
                            <rect x="0"  y="34" width="20" height="12" fill="url(#backDot{{ $card->id }})"/>
                            <rect x="68" y="0"  width="18" height="15" fill="url(#backDot{{ $card->id }})"/>
                            <line x1="61.5" y1="0" x2="35.5" y2="54" stroke="#ff5a0a" stroke-width="1.1"/>
                            <line x1="64.5" y1="0" x2="38.5" y2="54" stroke="#ff5a0a" stroke-width="0.35"/>
                            <path d="M85.6,36 C80,42 76,48 68,54 L85.6,54 Z" fill="#ff5a0a"/>
                        </svg>
                    </div>

                    {{-- Left Column: logo + title + rules --}}
                    <div class="back-left-content">
                        <div class="back-logo-wrap">
                            @if($logoSrc)
                                <img src="{{ $logoSrc }}" alt="SOBITAS">
                            @else
                                <span class="back-logo-text">SOBITAS</span>
                            @endif
                            <div class="back-logo-underline"></div>
                        </div>

                        <h2 class="back-title">VOS <span class="orange">AVANTAGES</span></h2>

                        <div class="back-rules-list">
                            <div class="back-rule-item">
                                <div class="back-rule-badge">1</div>
                                <div class="back-rule-text">
                                    1 DT d&eacute;pens&eacute;<br>
                                    <span class="orange">= 1 point gagn&eacute;</span>
                                </div>
                            </div>
                            <div class="back-rules-divider"></div>
                            <div class="back-rule-item">
                                <div class="back-rule-badge">
                                    <img src="{{ $icoGift }}" alt="">
                                </div>
                                <div class="back-rule-text">
                                    10 points<br>
                                    <span class="orange">= 1 DT de r&eacute;duction</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {{-- Right Column: barbell icon + thank you --}}
                    <div class="back-right-content">
                        <div class="back-watermark-row">
                            <div class="back-watermark-line"></div>
                            <div class="back-watermark-icon">
                                <img src="{{ $icoBell }}" alt="" style="width:6mm;height:6mm;">
                            </div>
                            <div class="back-watermark-line"></div>
                        </div>

                        <div class="thanks-area-white">
                            <div class="thanks-main-white">Merci pour<br>votre<br>confiance&nbsp;!</div>
                            <div class="thanks-underline-white"></div>
                        </div>
                    </div>

                    {{-- Bottom pill footer --}}
                    <div class="back-footer-pill">
                        <div class="back-pill-item back-pill-item-1">
                            <div class="back-pill-icon-wrap"><img src="{{ $icoShield }}" alt=""></div>
                            <span class="back-pill-text">En cas de perte, contactez la boutique</span>
                        </div>
                        <div class="back-pill-item back-pill-item-2">
                            <div class="back-pill-icon-wrap"><img src="{{ $icoGlobe }}" alt=""></div>
                            <span class="back-pill-text" style="font-weight:700;">Protein.tn</span>
                        </div>
                        <div class="back-pill-item back-pill-item-3">
                            <div class="back-pill-icon-wrap"><img src="{{ $icoPhone }}" alt=""></div>
                            <span class="back-pill-text" style="font-weight:900;">{{ $company?->phone_1 ?: '+216 22 464 315' }}</span>
                        </div>
                        <div style="clear:both;"></div>
                    </div>

                </article>
            @endforeach
            @if(isset($isPdf) && $isPdf)
                <div style="clear:both;"></div>
            @endif
        </div>
    </section>
    @endif

@endforeach

</body>
</html>