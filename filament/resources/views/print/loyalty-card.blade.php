<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Cartes Fidélité Protein.tn</title>
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

        $phoneRaw     = trim((string) ($company?->phone_1 ?: '27 612 500'));
        $phoneDisplay = str_starts_with($phoneRaw, '+') ? $phoneRaw : '+216 ' . $phoneRaw;

        // ── SVG → Base64 Data URIs (DomPDF cannot render inline <svg>) ──────
        $svgB64 = fn (string $svg): string => 'data:image/svg+xml;base64,' . base64_encode($svg);

        // Material glyph paths (24×24 viewBox)
        $glyphs = [
            'gift'   => 'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35C12.46 2.54 11.55 2 10.5 2 8.84 2 7.5 3.34 7.5 5c0 .35.07.69.18 1H5c-1.1 0-2 .9-2 2v3c0 .55.45 1 1 1h1v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12h1c.55 0 1-.45 1-1V8c0-1.1-.9-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-5 1c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm11 15H7v-8h11v8z',
            'tag'    => 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 8c-.83 0-1.5-.67-1.5-1.5S4.67 5 5.5 5 7 5.67 7 6.5 6.33 8 5.5 8z',
            'star'   => 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
            'trophy' => 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.42 1.72 4.44 4 4.9V18c0 1.1.9 2 2 2h1v2h4v-2h1c1.1 0 2-.9 2-2v-3.1c2.28-.46 4-2.48 4-4.9V7c0-1.1-.9-2-2-2zm-14 5V7h2v3c0 1.1-.9 2-2 2zm14 0c0 .55-.45 1-1 1s-2-.9-2-2V7h2v3z',
            'phone'  => 'M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.2c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z',
            'globe'  => 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
            'shield' => 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.9 14.3L7 13.2l1.4-1.4 1.7 1.7 4.7-4.7 1.4 1.4-6.1 6.1z',
            'scan'   => 'M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z',
        ];

        // Hexagonal icon builder — solid (front footer) or outlined (back)
        $hexIcon = function (string $glyph, bool $solid = true) use ($svgB64, $glyphs): string {
            $pts   = '12,1.6 21.2,6.9 21.2,17.1 12,22.4 2.8,17.1 2.8,6.9';
            $shape = $solid
                ? '<polygon points="' . $pts . '" fill="#ff5a0a"/>'
                : '<polygon points="' . $pts . '" fill="#17181c" stroke="#ff5a0a" stroke-width="1.7"/>';
            $inner = $glyph === ''
                ? ''
                : '<g transform="translate(6.8,6.8) scale(0.435)"><path fill="#ffffff" d="' . $glyphs[$glyph] . '"/></g>';
            return $svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' . $shape . $inner . '</svg>');
        };

        // Front footer (solid hexagons)
        $hexGift   = $hexIcon('gift');
        $hexTag    = $hexIcon('tag');
        $hexStar   = $hexIcon('star');
        $hexTrophy = $hexIcon('trophy');

        // Back (outlined hexagons)
        $hexGiftOut   = $hexIcon('gift', false);
        $hexShieldOut = $hexIcon('shield', false);
        $hexGlobeOut  = $hexIcon('globe', false);
        $hexPhoneOut  = $hexIcon('phone', false);
        $hexEmptyOut  = $hexIcon('', false);

        // Plain white glyphs
        $icoScanWhite  = $svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="' . $glyphs['scan'] . '"/></svg>');
        $icoGlobeWhite = $svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#ffffff" d="' . $glyphs['globe'] . '"/></svg>');

        // Dark "///" stripes inside the VOTRE CARTE badge
        $icoStripes = $svgB64('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 12"><polygon points="0,12 6,0 10,0 4,12" fill="#131313"/><polygon points="8,12 14,0 18,0 12,12" fill="#131313"/></svg>');

        /* ── FRONT background (scale ×10 → viewBox 856×540) ──────────────────
           Dark base + dark-orange right zone + honeycomb corner + bright
           diagonal stripes + bottom-right streaks. Rendered as one <img>. */
        $hexMesh = '';
        for ($row = 0; $row < 7; $row++) {
            for ($col = 0; $col < 7; $col++) {
                $cx = 640 + $col * 38 + (($row % 2) ? 19 : 0);
                $cy = 4 + $row * 32;
                if ($cy > 0.99 * ($cx - 640) + 14) { continue; }
                $pts = [];
                for ($k = 0; $k < 6; $k++) {
                    $a = deg2rad(60 * $k + 90);
                    $pts[] = round($cx + 21 * cos($a), 1) . ',' . round($cy + 21 * sin($a), 1);
                }
                $hexMesh .= '<polygon points="' . implode(' ', $pts) . '" fill="none" stroke="#ff8a3d" stroke-opacity="0.55" stroke-width="2.4"/>';
            }
        }
        $frontBgUri = $svgB64(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540">'
            . '<rect width="856" height="540" fill="#17181c"/>'
            . '<polygon points="578,0 856,0 856,540 366,540" fill="#1d1309"/>'
            . '<polygon points="770,540 856,368 856,540" fill="#000000" fill-opacity="0.30"/>'
            . '<polygon points="700,540 806,330 826,330 720,540" fill="#ff5a0a" fill-opacity="0.15"/>'
            . '<polygon points="640,0 856,0 856,214" fill="#c8490a"/>'
            . '<polygon points="724,0 856,0 856,118" fill="#e85c0c" fill-opacity="0.5"/>'
            . $hexMesh
            . '<polygon points="556,0 582,0 372,540 346,540" fill="#ff5a0a"/>'
            . '<polygon points="600,0 608,0 398,540 390,540" fill="#ff5a0a" fill-opacity="0.5"/>'
            . '</svg>'
        );

        /* ── BACK background: dark base + light streaks + octagon panel ───── */
        $backBgUri = $svgB64(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 856 540">'
            . '<rect width="856" height="540" fill="#17181c"/>'
            . '<polygon points="664,84 788,18 793,26 669,92" fill="#ff5a0a" fill-opacity="0.85"/>'
            . '<polygon points="700,108 812,48 815,53 703,113" fill="#ff5a0a" fill-opacity="0.40"/>'
            . '<polygon points="600,100 838,100 838,392 794,436 546,436 546,144" fill="#14161b" stroke="#cf5309" stroke-width="3"/>'
            . '</svg>'
        );
    @endphp
    <style>
        /* ── Design tokens ──────────────────────────────────────────────────── */
        :root {
            --sobitas-orange: #ff5a0a;
            --sobitas-black:  #17181c;
            --card-width:     85.60mm;
            --card-height:    54.00mm;
            --card-radius:    3.4mm;
        }
        * {
            box-sizing: border-box; margin: 0; padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

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

        /* ── Base card (dark) ──────────────────────────────────────────────── */
        .sobitas-card {
            width: 85.60mm;
            height: 54.00mm;
            border-radius: 3.4mm;
            border: .28mm solid #26272c;
            overflow: hidden;
            position: relative;
            box-shadow: 0 1.2mm 2.8mm rgba(0,0,0,.25);
            background: #17181c;
        }
        .card-bg {
            position: absolute; left: 0; top: 0;
            width: 100%; height: 100%;
            z-index: 1; display: block;
        }

        /* ══════════════════════════════════════════════════════════════════════
           FRONT CARD — dark / orange
           ══════════════════════════════════════════════════════════════════ */

        /* Left column */
        .front-left-content {
            position: absolute;
            left: 4.5mm; top: 3.5mm;
            width: 45mm; height: 42mm;
            z-index: 10;
        }

        .logo-wrap { height: 5.5mm; margin-bottom: 1mm; }
        .logo-wrap img { height: 5.5mm; width: auto; max-width: 36mm; display: block; }
        .logo-text-fallback {
            font-size: 4.6mm; font-weight: 900; font-style: italic;
            color: #ff5a0a; letter-spacing: -.02em; line-height: 1;
        }

        .tagline {
            font-size: 1.9mm; font-weight: 700; letter-spacing: .35mm;
            color: #eceef1; text-transform: uppercase;
            margin-bottom: 1.6mm; line-height: 1.1;
        }
        .label-carte {
            font-size: 5mm; font-weight: 900; color: #ffffff;
            text-transform: uppercase; line-height: .95; letter-spacing: .05mm;
        }
        .label-fidelite {
            font-size: 5mm; font-weight: 900; color: #ff5a0a;
            letter-spacing: .05mm; text-transform: uppercase; line-height: 1.05;
        }
        .front-program {
            font-size: 1.9mm; font-weight: 700; color: #d4d7dc;
            text-transform: uppercase; letter-spacing: .3mm;
            margin-top: .9mm; line-height: 1.1;
        }
        .front-program-underline {
            width: 12mm; height: .5mm; background: #ff5a0a; margin-top: .8mm;
        }

        /* Client details */
        .client-details-stack { margin-top: 2.2mm; }
        .votre-carte {
            background: #ff5a0a; color: #131313;
            font-size: 1.9mm; font-weight: 900; text-transform: uppercase;
            padding: .5mm 1.4mm .6mm; display: inline-block;
            border-radius: .4mm; letter-spacing: .1mm; line-height: 1;
        }
        .votre-carte img {
            height: 1.8mm; width: auto; display: inline-block;
            vertical-align: middle; margin-left: 1mm;
        }
        .card-number {
            font-size: 3.8mm; font-weight: 900; line-height: 1;
            letter-spacing: .12mm; color: #ffffff; margin: 1mm 0 .8mm;
            font-family: "Arial Black", Arial, sans-serif; text-transform: uppercase;
        }
        .front-note { font-size: 2mm; color: #c9ccd3; font-weight: 600; line-height: 1.2; }
        .front-note .arrow { color: #ff5a0a; font-size: 2.8mm; font-weight: 900; margin-right: .3mm; vertical-align: middle; }

        /* Right column */
        .front-right-content {
            position: absolute; right: 3.5mm; top: 4.5mm;
            width: 30mm; height: 40mm; z-index: 10; text-align: center;
        }
        .barcode-block {
            width: 30mm; height: 13mm;
            border-radius: 1.6mm;
            padding: 1.2mm; background: #ffffff;
            box-shadow: 0 .4mm 1.2mm rgba(0,0,0,.3);
            overflow: hidden;
        }
        .barcode-block img { width: 100%; height: 100%; display: block; }

        /* SCAN ME pill */
        .scan-pill {
            background: #ff5a0a; color: #fff;
            border-radius: 8mm; font-weight: 900; font-size: 2.2mm;
            letter-spacing: .1mm; display: inline-block;
            padding: .8mm 2.6mm .9mm; line-height: 1; white-space: nowrap;
            margin-top: 1.4mm;
        }
        .scan-pill img {
            width: 2.6mm; height: 2.6mm; display: inline-block;
            vertical-align: middle; margin-right: .6mm;
        }

        /* Website */
        .front-website {
            position: absolute; right: 0; bottom: 9.8mm;
            color: #f2f3f5; font-size: 2.4mm; font-weight: 800; line-height: 1;
        }
        .front-website img {
            width: 2.6mm; height: 2.6mm; display: inline-block;
            vertical-align: middle; margin-right: .7mm;
        }

        /* Footer bar — 4 hexagon advantages */
        .front-footer-bar {
            position: absolute; left: 0; right: 0; bottom: 0;
            height: 8mm;
            background: #14151a; border-top: .2mm solid #2b2c31;
            z-index: 12;
        }
        .ffoot-item {
            float: left; width: 25%; height: 100%;
            text-align: center; padding-top: 1.7mm;
            border-right: .15mm solid #2b2c31;
        }
        .ffoot-item.last { border-right: none; }
        .hex-ico {
            width: 4mm; height: 4mm; display: inline-block;
            vertical-align: middle; margin-right: .7mm;
        }
        .ffoot-text {
            display: inline-block; vertical-align: middle; text-align: left;
            font-size: 1.3mm; font-weight: 900; color: #f2f3f5;
            text-transform: uppercase; line-height: 1.25;
        }

        /* ══════════════════════════════════════════════════════════════════════
           BACK CARD — dark / orange
           ══════════════════════════════════════════════════════════════════ */

        /* Ghost "S" watermark inside the octagon panel */
        .back-ghost-s {
            position: absolute; right: 5.5mm; top: 13mm;
            z-index: 2; font-family: "Arial Black", Arial, sans-serif;
            font-size: 24mm; font-weight: 900; line-height: 1;
            color: #1e2026;
        }

        /* Left column */
        .back-left-content {
            position: absolute; left: 4.5mm; top: 4mm;
            width: 44mm; height: 38mm; z-index: 10;
        }
        .back-logo-wrap { height: 5mm; }
        .back-logo-wrap img { height: 5mm; width: auto; max-width: 36mm; display: block; }
        .back-logo-text {
            font-size: 4.5mm; font-weight: 900; font-style: italic;
            color: #ff5a0a; letter-spacing: -.02em; line-height: 1;
        }

        .back-title {
            font-size: 4.4mm; font-weight: 900; text-transform: uppercase;
            color: #ffffff; margin-top: 2mm; letter-spacing: .05mm; line-height: 1;
        }
        .back-title .orange { color: #ff5a0a; }
        .back-title-underline {
            width: 15mm; height: .5mm; background: #ff5a0a; margin-top: 1mm;
        }

        .back-rules-list { margin-top: 2.6mm; }
        .back-rule-item { margin-bottom: .4mm; }
        .rule-badge {
            position: relative; display: inline-block;
            width: 5.2mm; height: 5.2mm;
            vertical-align: middle; margin-right: 1.4mm;
        }
        .rule-badge img { width: 100%; height: 100%; display: block; }
        .rule-badge-n {
            position: absolute; left: 0; right: 0; top: 1.2mm;
            text-align: center; font-size: 2.6mm; font-weight: 900;
            color: #ffffff; line-height: 1;
        }
        .back-rule-text {
            display: inline-block; vertical-align: middle;
            font-size: 2.4mm; line-height: 1.2; font-weight: 900;
            text-transform: uppercase; color: #ffffff;
        }
        .back-rule-text .orange { color: #ff5a0a; }
        .back-rules-divider { border-top: .15mm solid #2b2c31; margin: 1.5mm 0; width: 34mm; }

        /* Right panel text (over the octagon frame in the bg SVG) */
        .back-right-content {
            position: absolute; right: 2.6mm; top: 12.5mm;
            width: 27mm; z-index: 10; text-align: center;
        }
        .thanks-merci {
            font-size: 4.2mm; font-weight: 900; color: #ffffff;
            text-transform: uppercase; line-height: 1;
        }
        .thanks-pour {
            font-size: 2.8mm; font-weight: 800; color: #ffffff;
            text-transform: uppercase; line-height: 1.15; margin-top: .8mm;
        }
        .thanks-confiance {
            font-size: 4mm; font-weight: 900; color: #ff5a0a;
            text-transform: uppercase; line-height: 1; margin-top: .8mm;
        }
        .thanks-underline {
            width: 16mm; height: .4mm; background: #ff5a0a; margin: 1.4mm auto 0;
        }

        /* Back footer — 3 hexagon items */
        .back-footer-bar {
            position: absolute; left: 0; right: 0; bottom: 0;
            height: 8.5mm;
            background: #121317; border-top: .2mm solid #2b2c31;
            z-index: 12;
        }
        .bfoot-item {
            float: left; height: 100%;
            text-align: center; padding-top: 1.9mm;
            border-right: .15mm solid #2b2c31;
        }
        .bfoot-item-1 { width: 42%; }
        .bfoot-item-2 { width: 24%; }
        .bfoot-item-3 { width: 34%; border-right: none; }
        .bfoot-item .hex-ico { width: 4.2mm; height: 4.2mm; }
        .bfoot-text {
            display: inline-block; vertical-align: middle; text-align: left;
            font-size: 1.5mm; font-weight: 600; color: #e6e8ec; line-height: 1.25;
        }
        .bfoot-item-2 .bfoot-text { font-size: 1.9mm; font-weight: 800; }
        .bfoot-item-3 .bfoot-text { font-size: 1.9mm; font-weight: 900; }

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

        /* DomPDF has no grid — use floats */
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
            background: #17181c !important;
        }
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
        <div class="sheet-title">Face avant &middot; Protein.tn</div>
        <div class="cards-grid">
            @foreach($chunk as $card)
                @php
                    // Barcode SVG → Base64 Data URI so DomPDF can render it
                    $barcodeSvg     = $loyaltyService->generateBarcode39Svg($card->card_number);
                    $barcodeDataUri = 'data:image/svg+xml;base64,' . base64_encode($barcodeSvg);
                @endphp
                <article class="sobitas-card sobitas-front">

                    {{-- Dark background: honeycomb corner + diagonal stripes --}}
                    <img class="card-bg" src="{{ $frontBgUri }}" alt="" aria-hidden="true">

                    {{-- Left Column --}}
                    <div class="front-left-content">
                        <div class="logo-wrap">
                            @if($logoSrc)
                                <img src="{{ $logoSrc }}" alt="Protein.tn">
                            @else
                                <p class="logo-text-fallback">Protein.tn</p>
                            @endif
                        </div>
                        <p class="tagline">NUTRITION &amp; PERFORMANCE</p>
                        <p class="label-carte">CARTE</p>
                        <p class="label-fidelite">FID&Eacute;LIT&Eacute;</p>
                        <p class="front-program">PROGRAMME AVANTAGES</p>
                        <div class="front-program-underline"></div>

                        <div class="client-details-stack">
                            <span class="votre-carte">VOTRE CARTE<img src="{{ $icoStripes }}" alt="" aria-hidden="true"></span>
                            <div class="card-number">{{ $card->card_number }}</div>
                            <p class="front-note">
                                <span class="arrow" aria-hidden="true">&#8250;</span>
                                <span>Pr&eacute;sentez cette carte en boutique</span>
                            </p>
                        </div>
                    </div>

                    {{-- Right Column: barcode + SCAN ME + website --}}
                    <div class="front-right-content">
                        <div class="barcode-block">
                            <img src="{{ $barcodeDataUri }}" alt="{{ $card->card_number }}" style="width:100%;height:100%;display:block;">
                        </div>

                        <div class="scan-pill">
                            <img src="{{ $icoScanWhite }}" alt="" aria-hidden="true">SCAN ME
                        </div>

                        <div class="front-website">
                            <img src="{{ $icoGlobeWhite }}" alt="" aria-hidden="true">protein.tn
                        </div>
                    </div>

                    {{-- Footer: 4 advantages with hexagon icons --}}
                    <div class="front-footer-bar">
                        <div class="ffoot-item">
                            <img class="hex-ico" src="{{ $hexGift }}" alt="">
                            <span class="ffoot-text">Offres<br>Exclusives</span>
                        </div>
                        <div class="ffoot-item">
                            <img class="hex-ico" src="{{ $hexTag }}" alt="">
                            <span class="ffoot-text">R&eacute;ductions<br>Perso.</span>
                        </div>
                        <div class="ffoot-item">
                            <img class="hex-ico" src="{{ $hexStar }}" alt="">
                            <span class="ffoot-text">Points<br>Fid&eacute;lit&eacute;</span>
                        </div>
                        <div class="ffoot-item last">
                            <img class="hex-ico" src="{{ $hexTrophy }}" alt="">
                            <span class="ffoot-text">Avantages<br>Privil&eacute;gi&eacute;s</span>
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

    {{-- ════════════════════════════════ FACE ARRIÈRE ═══════════════════════════ --}}
    @if($showBack)
    <section class="sheet">
        <div class="sheet-title">Face arri&egrave;re &middot; Protein.tn</div>
        <div class="cards-grid">
            @foreach($chunk as $card)
                <article class="sobitas-card sobitas-back">

                    {{-- Dark background: streaks + octagon panel --}}
                    <img class="card-bg" src="{{ $backBgUri }}" alt="" aria-hidden="true">

                    {{-- Ghost "S" watermark --}}
                    <div class="back-ghost-s" aria-hidden="true">P</div>

                    {{-- Left Column: logo + VOS AVANTAGES + rules --}}
                    <div class="back-left-content">
                        <div class="back-logo-wrap">
                            @if($logoSrc)
                                <img src="{{ $logoSrc }}" alt="Protein.tn">
                            @else
                                <span class="back-logo-text">Protein.tn</span>
                            @endif
                        </div>

                        <h2 class="back-title">VOS <span class="orange">AVANTAGES</span></h2>
                        <div class="back-title-underline"></div>

                        <div class="back-rules-list">
                            <div class="back-rule-item">
                                <span class="rule-badge">
                                    <img src="{{ $hexEmptyOut }}" alt="">
                                    <span class="rule-badge-n">1</span>
                                </span>
                                <span class="back-rule-text">
                                    1 DT d&eacute;pens&eacute;<br>
                                    <span class="orange">= 1 point gagn&eacute;</span>
                                </span>
                            </div>
                            <div class="back-rules-divider"></div>
                            <div class="back-rule-item">
                                <span class="rule-badge">
                                    <img src="{{ $hexGiftOut }}" alt="">
                                </span>
                                <span class="back-rule-text">
                                    10 points<br>
                                    <span class="orange">= 1 DT de r&eacute;duction</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {{-- Right panel: MERCI POUR VOTRE CONFIANCE ! --}}
                    <div class="back-right-content">
                        <div class="thanks-merci">MERCI</div>
                        <div class="thanks-pour">POUR VOTRE</div>
                        <div class="thanks-confiance">CONFIANCE&nbsp;!</div>
                        <div class="thanks-underline"></div>
                    </div>

                    {{-- Footer: perte / site / téléphone --}}
                    <div class="back-footer-bar">
                        <div class="bfoot-item bfoot-item-1">
                            <img class="hex-ico" src="{{ $hexShieldOut }}" alt="">
                            <span class="bfoot-text">En cas de perte,<br>contactez la boutique</span>
                        </div>
                        <div class="bfoot-item bfoot-item-2">
                            <img class="hex-ico" src="{{ $hexGlobeOut }}" alt="">
                            <span class="bfoot-text">Protein.tn</span>
                        </div>
                        <div class="bfoot-item bfoot-item-3">
                            <img class="hex-ico" src="{{ $hexPhoneOut }}" alt="">
                            <span class="bfoot-text">{{ $phoneDisplay }}</span>
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
