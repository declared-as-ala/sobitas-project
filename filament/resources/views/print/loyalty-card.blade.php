<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Cartes Fidelite Sobitas</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    @php
        $company = \App\Models\Coordinate::getCached();
        $logoSrc = $logoDataUri ?? asset('logo.png');
        $cardsPerPage = max(1, min(12, (int) ($cardsPerPage ?? 8)));
        $cardChunks = collect($cards)->chunk($cardsPerPage);
        $sideMode = in_array(($sideMode ?? 'both'), ['both', 'front', 'back'], true) ? $sideMode : 'both';
        $showFront = in_array($sideMode, ['both', 'front'], true);
        $showBack = in_array($sideMode, ['both', 'back'], true);
        $loyaltyService = app(\App\Services\LoyaltyService::class);
    @endphp
    <style>
        :root {
            --sobitas-orange: #ff5a0a;
            --sobitas-black: #111214;
            --sheet-width: 210mm;
            --sheet-height: 297mm;
            --card-width: 85.60mm;
            --card-height: 54.00mm;
            --card-radius: 3.4mm;
        }
        * { box-sizing: border-box; }
        .orange {
            color: var(--sobitas-orange) !important;
        }
        body {
            background: #efefef;
            color: #1a1b1e;
            font-family: Arial, "Helvetica Neue", sans-serif;
            margin: 0;
            padding: 0;
        }
        .print-toolbar {
            position: sticky;
            top: 0;
            z-index: 20;
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
            padding: 12px 20px;
        }
        .sheet {
            width: var(--sheet-width);
            min-height: var(--sheet-height);
            margin: 20px auto;
            background: #fff;
            border-radius: 14px;
            box-shadow: 0 12px 30px rgba(0, 0, 0, .12);
            padding: 8mm;
            page-break-after: always;
        }
        .sheet:last-child { page-break-after: auto; }
        .sheet-title {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: .4px;
            text-transform: uppercase;
            margin-bottom: 6mm;
            color: #374151;
        }
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(2, var(--card-width));
            gap: 6mm;
            align-content: start;
            justify-content: center;
        }

        /* === FRONT CARD (reference layout: upper white zone + lower diagonal dark) === */
        .sobitas-card {
            width: var(--card-width);
            height: var(--card-height);
            border-radius: var(--card-radius);
            border: .28mm solid #dee2e6;
            overflow: hidden;
            position: relative;
            box-shadow: 0 1.2mm 2.8mm rgba(0, 0, 0, .08);
            background: #fff;
        }
        .sobitas-front {
            background: #fff;
            position: relative;
            overflow: hidden;
        }
        .front-top-corner {
            position: absolute;
            top: 0;
            left: 0;
            width: 8mm;
            height: 8mm;
            background: var(--sobitas-orange);
            border-bottom-right-radius: 100%;
            z-index: 4;
        }
        .card-bg-waves {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1;
            pointer-events: none;
            overflow: hidden;
        }
        .front-left-content {
            position: absolute;
            left: 4.2mm;
            top: 4.2mm;
            width: 43mm;
            height: 41mm;
            z-index: 10;
        }
        .logo-wrap {
            height: 5.5mm;
            margin-bottom: 0.6mm;
        }
        .logo-wrap img {
            height: 5.5mm;
            width: auto;
            max-width: 38mm;
            display: block;
        }
        .logo-text-fallback {
            font-size: 4.2mm;
            font-weight: 900;
            font-style: italic;
            color: var(--sobitas-orange);
            letter-spacing: -.02em;
            margin: 0;
            line-height: 1;
        }
        .tagline {
            font-size: 2.2mm;
            font-weight: 700;
            letter-spacing: 0.3mm;
            color: #1a1b1e;
            text-transform: uppercase;
            margin: 0 0 1.2mm 0;
            line-height: 1.1;
        }
        .title-stack {
            margin-bottom: 1.5mm;
        }
        .label-carte {
            font-size: 3.2mm;
            line-height: 1;
            font-weight: 800;
            color: #1a1b1e;
            text-transform: uppercase;
            margin: 0 0 0.5mm 0;
        }
        .label-fidelite {
            font-size: 5.8mm;
            line-height: 1;
            font-weight: 900;
            color: var(--sobitas-orange);
            letter-spacing: 0.1mm;
            text-transform: uppercase;
            margin: 0 0 0.5mm 0;
        }
        .front-program {
            font-size: 2mm;
            letter-spacing: 0.1mm;
            font-weight: 700;
            color: #6c757d;
            text-transform: uppercase;
            line-height: 1.1;
            margin: 0;
        }
        .client-details-stack {
            margin-top: 1.5mm;
        }
        .votre-carte {
            background: var(--sobitas-orange);
            color: #ffffff;
            font-size: 1.9mm;
            font-weight: 800;
            text-transform: uppercase;
            padding: 0.5mm 1.2mm 0.6mm;
            display: inline-block;
            border-radius: 0.4mm;
            margin: 0 0 0.8mm 0;
            letter-spacing: 0.05mm;
            line-height: 1;
        }
        .card-number {
            font-size: 5.2mm;
            font-weight: 900;
            line-height: 1;
            letter-spacing: 0.15mm;
            color: #1a1b1e;
            margin: 0 0 0.8mm 0;
            font-family: "Arial Black", Arial, sans-serif;
            text-transform: uppercase;
        }
        .front-note {
            font-size: 2.2mm;
            color: #495057;
            font-weight: 600;
            line-height: 1.2;
            margin: 0;
        }
        .front-note .arrow {
            color: var(--sobitas-orange);
            font-size: 3mm;
            font-weight: 900;
            line-height: 1;
            margin-right: 0.3mm;
            vertical-align: middle;
        }
        
        .front-right-content {
            position: absolute;
            right: 4mm;
            top: 4.2mm;
            width: 31mm;
            height: 41mm;
            z-index: 10;
            text-align: center;
        }
        .barcode-block {
            width: 31mm;
            height: 13.5mm;
            border: 0.35mm solid var(--sobitas-orange);
            border-radius: 1.2mm;
            padding: 1mm;
            background: #fff;
            box-shadow: 0 0.4mm 1.2mm rgba(0, 0, 0, 0.08);
            margin-bottom: 1.2mm;
            overflow: hidden;
        }
        .barcode-block svg {
            width: 100%;
            height: 100%;
            display: block;
        }
        .scan-pill {
            background: linear-gradient(180deg, #ff6d1a 0%, #ff4f00 100%);
            color: #fff;
            border-radius: 8mm;
            font-weight: 800;
            font-size: 2.2mm;
            letter-spacing: 0.05mm;
            display: inline-block;
            padding: 0.7mm 2mm 0.8mm;
            line-height: 1;
            white-space: nowrap;
            box-shadow: 0 0.4mm 1mm rgba(255, 90, 10, 0.2);
        }
        .scan-pill svg {
            width: 2.8mm;
            height: 2.8mm;
            fill: #fff;
            display: inline-block;
            vertical-align: middle;
            margin-right: 0.5mm;
            margin-top: -0.4mm;
        }
        .front-website {
            position: absolute;
            right: 0;
            bottom: 8.5mm;
            color: #6c757d;
            font-size: 2.6mm;
            font-weight: 700;
            line-height: 1;
        }
        
        .front-footer-bar {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 7.5mm;
            background: #ffffff;
            border-top: .15mm solid #e5e7eb;
            z-index: 12;
        }
        .footer-bar-item {
            float: left;
            width: 23%;
            padding-top: 2mm;
            text-align: center;
        }
        .footer-bar-icon-wrap {
            width: 3.5mm;
            height: 3.5mm;
            background: var(--sobitas-orange);
            color: #ffffff;
            border-radius: 50%;
            display: inline-block;
            vertical-align: middle;
            text-align: center;
            line-height: 3.5mm;
            margin-right: 0.5mm;
        }
        .footer-bar-icon-wrap svg {
            width: 2.1mm;
            height: 2.1mm;
            fill: currentColor;
            display: inline-block;
            vertical-align: middle;
            margin-top: -0.4mm;
        }
        .footer-bar-divider {
            float: left;
            background: #dee2e6;
            height: 3.5mm;
            width: 0.15mm;
            margin-top: 2mm;
        }
        .footer-bar-text {
            font-size: 1.4mm;
            font-weight: 900;
            color: #212529;
            text-transform: uppercase;
            line-height: 1;
            text-align: left;
            display: inline-block;
            vertical-align: middle;
        }

        /* === BACK CARD (matching Photo 2 white design) === */
        .sobitas-back {
            background: #ffffff;
            position: relative;
            overflow: hidden;
        }
        .back-bg-decor {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1;
            pointer-events: none;
            overflow: hidden;
        }
        .back-left-content {
            position: absolute;
            left: 4.5mm;
            top: 3.5mm;
            width: 42mm;
            height: 38mm;
            z-index: 10;
        }
        .back-logo-wrap {
            height: 5mm;
            margin-bottom: 0.8mm;
        }
        .back-logo-text {
            font-size: 4.5mm;
            font-weight: 900;
            font-style: italic;
            color: var(--sobitas-orange);
            letter-spacing: -.02em;
            margin: 0;
            line-height: 1;
            display: block;
        }
        .back-logo-underline {
            width: 13.5mm;
            height: 0.35mm;
            background: #dee2e6;
            margin-top: 0.4mm;
        }
        .back-title {
            font-size: 3.6mm;
            font-weight: 900;
            text-transform: uppercase;
            color: #1a1b1e;
            margin: 0.6mm 0 2.2mm 0;
            letter-spacing: 0.05mm;
            line-height: 1.1;
        }
        .back-title .orange {
            color: var(--sobitas-orange);
        }
        .back-rules-list {
            margin-top: 1mm;
        }
        .back-rule-item {
            margin-bottom: 0.5mm;
        }
        .back-rule-badge {
            width: 4.5mm;
            height: 4.5mm;
            background: var(--sobitas-orange);
            color: #ffffff;
            border-radius: 50%;
            display: inline-block;
            vertical-align: middle;
            text-align: center;
            font-size: 2.3mm;
            font-weight: 900;
            line-height: 4.5mm;
            margin-right: 1.5mm;
        }
        .back-rule-badge svg {
            width: 2.4mm;
            height: 2.4mm;
            fill: currentColor;
            display: inline-block;
            vertical-align: middle;
            margin-top: -0.4mm;
        }
        .back-rule-text {
            display: inline-block;
            vertical-align: middle;
            font-size: 2.4mm;
            line-height: 1.1;
            font-weight: 800;
            text-transform: uppercase;
            color: #1a1b1e;
        }
        .back-rule-text .orange {
            color: var(--sobitas-orange);
        }
        .back-rules-divider {
            border-top: .15mm solid #dee2e6;
            margin: 1.2mm 0;
            width: 36mm;
            height: 0;
        }
        .back-right-content {
            position: absolute;
            right: 4.5mm;
            top: 7mm;
            width: 30mm;
            height: 33mm;
            z-index: 10;
            text-align: center;
        }
        .back-watermark-row {
            width: 100%;
            height: 6mm;
            margin-bottom: 0.5mm;
        }
        .back-watermark-line {
            display: inline-block;
            vertical-align: middle;
            height: 0.2mm;
            background: var(--sobitas-orange);
            width: 8mm;
        }
        .back-watermark-icon {
            display: inline-block;
            vertical-align: middle;
            width: 5.5mm;
            height: 5.5mm;
            color: var(--sobitas-orange);
            margin: 0 1mm;
        }
        .back-watermark-icon svg {
            width: 100%;
            height: 100%;
            fill: currentColor;
            display: block;
        }
        .thanks-area-white {
            text-align: center;
            color: #1a1b1e;
            width: 100%;
            margin-top: 1mm;
        }
        .thanks-main-white {
            font-size: 3.2mm;
            font-style: italic;
            font-weight: 900;
            line-height: 1.25;
            margin: 0 0 1.5mm 0;
        }
        .thanks-underline-white {
            width: 18mm;
            height: 0.45mm;
            background: var(--sobitas-orange);
            margin: 0 auto;
        }
        
        .back-footer-pill {
            position: absolute;
            left: 2.5mm;
            right: 2.5mm;
            bottom: 2mm;
            height: 7.2mm;
            background: #ffffff;
            border: .2mm solid #e9ecef;
            border-radius: 3.6mm;
            z-index: 12;
            box-shadow: 0 0.4mm 1.5mm rgba(0, 0, 0, 0.04);
        }
        .back-pill-item-1 {
            float: left;
            width: 44%;
            padding-top: 1.8mm;
            padding-left: 2mm;
        }
        .back-pill-item-2 {
            float: left;
            width: 26%;
            padding-top: 1.8mm;
            text-align: center;
            border-left: .2mm solid #e9ecef;
            border-right: .2mm solid #e9ecef;
            height: 4mm;
            margin-top: 1.6mm;
            line-height: 0.8;
        }
        .back-pill-item-3 {
            float: right;
            width: 28%;
            padding-top: 1.8mm;
            text-align: right;
            padding-right: 2mm;
        }
        .back-pill-icon-wrap {
            width: 3.6mm;
            height: 3.6mm;
            background: var(--sobitas-orange);
            color: #ffffff;
            border-radius: 50%;
            display: inline-block;
            vertical-align: middle;
            text-align: center;
            line-height: 3.6mm;
            margin-right: 0.8mm;
        }
        .back-pill-icon-wrap svg {
            width: 2.2mm;
            height: 2.2mm;
            fill: currentColor;
            display: inline-block;
            vertical-align: middle;
            margin-top: -0.4mm;
        }
        .back-pill-text {
            font-size: 1.45mm;
            font-weight: 800;
            color: #343a40;
            line-height: 1.1;
            display: inline-block;
            vertical-align: middle;
        }

        @media print {
            body { background: #fff; }
            .print-toolbar { display: none !important; }
            .sheet {
                margin: 0;
                border-radius: 0;
                box-shadow: none;
                padding: 6mm;
            }
            .sobitas-card { box-shadow: none; }
        }

        @if(isset($isPdf) && $isPdf)
        /* PDF specific overrides since DomPDF doesn't support Grid/Flexbox */
        .cards-grid {
            display: block !important;
            width: 100% !important;
        }
        .sobitas-card {
            display: block !important;
            float: left !important;
            margin: 3mm !important;
        }
        .front-left-content {
            float: left !important;
            width: 43mm !important;
            height: 41mm !important;
            position: relative !important;
            margin-left: 4.2mm !important;
            margin-top: 4.2mm !important;
        }
        .front-right-content {
            float: right !important;
            width: 31mm !important;
            height: 41mm !important;
            position: relative !important;
            margin-right: 4.0mm !important;
            margin-top: 4.2mm !important;
            text-align: center !important;
        }
        .front-footer-bar {
            position: absolute !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 7.5mm !important;
            display: block !important;
            background: #ffffff !important;
            border-top: .15mm solid #dee2e6 !important;
        }
        .sheet {
            page-break-inside: avoid !important;
        }
        
        /* Back Card PDF Specific Overrides */
        .sobitas-back {
            display: block !important;
            background: #ffffff !important;
        }
        .back-left-content {
            float: left !important;
            width: 42mm !important;
            height: 38mm !important;
            position: relative !important;
            margin-left: 4.5mm !important;
            margin-top: 3.5mm !important;
        }
        .back-right-content {
            float: right !important;
            width: 30mm !important;
            height: 33mm !important;
            position: relative !important;
            margin-right: 4.5mm !important;
            margin-top: 7mm !important;
            text-align: center !important;
        }
        .back-rule-item {
            display: block !important;
            width: 100% !important;
            margin-bottom: 0.5mm !important;
        }
        .back-rule-badge {
            display: inline-block !important;
            vertical-align: middle !important;
            margin-right: 1.5mm !important;
        }
        .back-rule-text {
            display: inline-block !important;
            vertical-align: middle !important;
        }
        .back-watermark-row {
            display: block !important;
            width: 100% !important;
            text-align: center !important;
        }
        .back-watermark-line {
            display: inline-block !important;
            vertical-align: middle !important;
            width: 9mm !important;
        }
        .back-watermark-icon {
            display: inline-block !important;
            vertical-align: middle !important;
        }
        .back-footer-pill {
            position: absolute !important;
            left: 2.5mm !important;
            right: 2.5mm !important;
            bottom: 2mm !important;
            height: 7.2mm !important;
            display: block !important;
            background: #ffffff !important;
            border: .2mm solid #e9ecef !important;
        }
        @endif
    </style>
</head>
<body>

<div class="print-toolbar no-print">
    <div class="d-flex flex-wrap align-items-center gap-2">
        <button class="btn btn-dark rounded-pill px-4" onclick="window.print()">Imprimer</button>
        <a href="{{ url()->previous() }}" class="btn btn-outline-secondary rounded-pill px-4">Retour</a>
        <span class="badge bg-warning text-dark">{{ collect($cards)->count() }} cartes</span>
        @if(isset($batch))
            <span class="small text-muted">Lot : <strong>{{ $batch->name ?: "Lot #{$batch->id}" }}</strong></span>
        @endif
        <span class="small text-muted">Mise en page : {{ $cardsPerPage }} cartes / planche</span>
    </div>
</div>

@foreach($cardChunks as $chunk)
    @if($showFront)
    <section class="sheet">
        <div class="sheet-title">Face avant &middot; Sobitas / protein.tn</div>
        <div class="cards-grid">
            @foreach($chunk as $card)
                <article class="sobitas-card sobitas-front">
                    <!-- Background Wave and Mesh Pattern matching Photo 2 -->
                    <div class="card-bg-waves" aria-hidden="true">
                        <svg viewBox="0 0 85.6 54" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                            <path d="M-10,38 C15,28 35,42 60,32 C75,26 85,32 95,28" fill="none" stroke="rgba(255, 90, 10, 0.12)" stroke-width="0.2" />
                            <path d="M-10,41 C18,33 38,47 62,35 C78,29 88,35 98,31" fill="none" stroke="rgba(255, 90, 10, 0.08)" stroke-width="0.2" />
                            <path d="M-10,44 C21,38 41,52 64,38 C81,32 91,38 101,34" fill="none" stroke="rgba(255, 90, 10, 0.05)" stroke-width="0.2" />
                            <defs>
                                <pattern id="dotPattern" x="0" y="0" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
                                    <circle cx="0.8" cy="0.8" r="0.35" fill="var(--sobitas-orange)" opacity="0.85" />
                                </pattern>
                            </defs>
                            <path d="M50,54 C60,46 72,42 85.6,35 L85.6,54 Z" fill="url(#dotPattern)" />
                        </svg>
                    </div>

                    <div class="front-top-corner" aria-hidden="true"></div>

                    <!-- Left Column: Branding, Titles, and Client Details -->
                    <div class="front-left-content">
                        <div class="logo-wrap">
                            @if($logoSrc)
                                <img src="{{ $logoSrc }}" alt="SOBITAS">
                            @else
                                <p class="logo-text-fallback">SOBITAS</p>
                            @endif
                        </div>
                        <p class="tagline">NUTRITION &amp; PERFORMANCE</p>
                        <div class="title-stack">
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

                    <!-- Right Column: Barcode, Scan Pill, and Website Link -->
                    <div class="front-right-content">
                        <div class="barcode-block">
                            {!! $loyaltyService->generateBarcode39Svg($card->card_number) !!}
                        </div>
                        <div class="scan-pill">
                            <svg class="scan-glyph" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z"/></svg>
                            SCAN ME
                        </div>
                        <div class="front-website">
                            protein.tn
                        </div>
                    </div>

                    <div class="front-website">
                        protein.tn
                    </div>

                    <!-- Bottom advantages bar matching Photo 2 -->
                    <div class="front-footer-bar">
                        @if(isset($isPdf) && $isPdf)
                            <!-- DomPDF floated layout -->
                            <div style="float: left; width: 23%; padding-top: 1.5mm; text-align: center;">
                                <div class="footer-bar-icon-wrap" style="display: inline-block; vertical-align: middle; margin-right: 0.5mm;">
                                    <svg viewBox="0 0 24 24" style="width: 2.1mm; height: 2.1mm; fill: #ffffff;"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35-.54-.81-1.45-1.35-2.5-1.35-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H5c-1.1 0-2 .9-2 2v3c0 .55.45 1 1 1h1v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12h1c.55 0 1-.45 1-1V8c0-1.1-.9-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-6 1c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm11 15H7v-8h11v8z"/></svg>
                                </div>
                                <span class="footer-bar-text" style="display: inline-block; vertical-align: middle; font-size: 1.4mm; line-height: 1;">Offres<br>Exclusives</span>
                            </div>
                            <div style="float: left; width: 1%; height: 4mm; border-left: .15mm solid #dee2e6; margin-top: 1.5mm;"></div>
                            
                            <div style="float: left; width: 23%; padding-top: 1.5mm; text-align: center;">
                                <div class="footer-bar-icon-wrap" style="display: inline-block; vertical-align: middle; margin-right: 0.5mm;">
                                    <svg viewBox="0 0 24 24" style="width: 2.1mm; height: 2.1mm; fill: #ffffff;"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 8c-.83 0-1.5-.67-1.5-1.5S4.67 5 5.5 5 7 5.67 7 6.5 6.33 8 5.5 8z"/></svg>
                                </div>
                                <span class="footer-bar-text" style="display: inline-block; vertical-align: middle; font-size: 1.4mm; line-height: 1;">Réductions<br>Perso.</span>
                            </div>
                            <div style="float: left; width: 1%; height: 4mm; border-left: .15mm solid #dee2e6; margin-top: 1.5mm;"></div>

                            <div style="float: left; width: 23%; padding-top: 1.5mm; text-align: center;">
                                <div class="footer-bar-icon-wrap" style="display: inline-block; vertical-align: middle; margin-right: 0.5mm;">
                                    <svg viewBox="0 0 24 24" style="width: 2.1mm; height: 2.1mm; fill: #ffffff;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                </div>
                                <span class="footer-bar-text" style="display: inline-block; vertical-align: middle; font-size: 1.4mm; line-height: 1;">Points<br>Fidélité</span>
                            </div>
                            <div style="float: left; width: 1%; height: 4mm; border-left: .15mm solid #dee2e6; margin-top: 1.5mm;"></div>

                            <div style="float: left; width: 23%; padding-top: 1.5mm; text-align: center;">
                                <div class="footer-bar-icon-wrap" style="display: inline-block; vertical-align: middle; margin-right: 0.5mm;">
                                    <svg viewBox="0 0 24 24" style="width: 2.1mm; height: 2.1mm; fill: #ffffff;"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.42 1.72 4.44 4 4.9V18c0 1.1.9 2 2 2h1v2h4v-2h1c1.1 0 2-.9 2-2v-3.1c2.28-.46 4-2.48 4-4.9V7c0-1.1-.9-2-2-2zm-14 5V7h2v3c0 1.1-.9 2-2 2zm14 0c0 .55-.45 1-1 1s-2-.9-2-2V7h2v3z"/></svg>
                                </div>
                                <span class="footer-bar-text" style="display: inline-block; vertical-align: middle; font-size: 1.4mm; line-height: 1;">Avantages<br>Privilégiés</span>
                            </div>
                            <div style="clear: both;"></div>
                        @else
                            <!-- Standard browser CSS Grid layout -->
                            <div class="footer-bar-item">
                                <div class="footer-bar-icon-wrap">
                                    <svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35-.54-.81-1.45-1.35-2.5-1.35-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H5c-1.1 0-2 .9-2 2v3c0 .55.45 1 1 1h1v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12h1c.55 0 1-.45 1-1V8c0-1.1-.9-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-6 1c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm11 15H7v-8h11v8z"/></svg>
                                </div>
                                <span class="footer-bar-text">Offres<br>Exclusives</span>
                            </div>
                            <div class="footer-bar-divider"></div>
                            <div class="footer-bar-item">
                                <div class="footer-bar-icon-wrap">
                                    <svg viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 8c-.83 0-1.5-.67-1.5-1.5S4.67 5 5.5 5 7 5.67 7 6.5 6.33 8 5.5 8z"/></svg>
                                </div>
                                <span class="footer-bar-text">Réductions<br>Perso.</span>
                            </div>
                            <div class="footer-bar-divider"></div>
                            <div class="footer-bar-item">
                                <div class="footer-bar-icon-wrap">
                                    <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                </div>
                                <span class="footer-bar-text">Points<br>Fidélité</span>
                            </div>
                            <div class="footer-bar-divider"></div>
                            <div class="footer-bar-item">
                                <div class="footer-bar-icon-wrap">
                                    <svg viewBox="0 0 24 24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.42 1.72 4.44 4 4.9V18c0 1.1.9 2 2 2h1v2h4v-2h1c1.1 0 2-.9 2-2v-3.1c2.28-.46 4-2.48 4-4.9V7c0-1.1-.9-2-2-2zm-14 5V7h2v3c0 1.1-.9 2-2 2zm14 0c0 .55-.45 1-1 1s-2-.9-2-2V7h2v3z"/></svg>
                                </div>
                                <span class="footer-bar-text">Avantages<br>Privilégiés</span>
                            </div>
                        @endif
                    </div>
                </article>
            @endforeach
            @if(isset($isPdf) && $isPdf)
                <div style="clear: both;"></div>
            @endif
        </div>
    </section>
    @endif

    @if($showBack)
        <section class="sheet">
            <div class="sheet-title">Face arri&egrave;re &middot; Sobitas / protein.tn</div>
            <div class="cards-grid">
                @foreach($chunk as $card)
                    <article class="sobitas-card sobitas-back">
                        <!-- Vector Background Decor -->
                        <div class="back-bg-decor" aria-hidden="true">
                            <svg viewBox="0 0 85.6 54" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <pattern id="backDotPattern" x="0" y="0" width="1.6" height="1.6" patternUnits="userSpaceOnUse">
                                        <circle cx="0.8" cy="0.8" r="0.3" fill="var(--sobitas-orange)" opacity="0.35" />
                                    </pattern>
                                </defs>
                                <rect x="0" y="34" width="20" height="12" fill="url(#backDotPattern)" />
                                <rect x="68" y="0" width="18" height="15" fill="url(#backDotPattern)" />
                                <line x1="61.5" y1="0" x2="35.5" y2="54" stroke="var(--sobitas-orange)" stroke-width="1.1" />
                                <line x1="64.5" y1="0" x2="38.5" y2="54" stroke="var(--sobitas-orange)" stroke-width="0.35" />
                                <path d="M85.6,36 C80,42 76,48 68,54 L85.6,54 Z" fill="var(--sobitas-orange)" />
                            </svg>
                        </div>

                        <!-- Left Column: Branding and Advantages rules -->
                        <div class="back-left-content">
                            <div class="back-logo-wrap">
                                <span class="back-logo-text">SOBITAS</span>
                                <div class="back-logo-underline"></div>
                            </div>
                            <h2 class="back-title">VOS <span class="orange">AVANTAGES</span></h2>
                            
                            <div class="back-rules-list">
                                <div class="back-rule-item">
                                    <div class="back-rule-badge">1</div>
                                    <div class="back-rule-text">1 DT d&eacute;pens&eacute;<br><span class="orange">= 1 point gagn&eacute;</span></div>
                                </div>
                                <div class="back-rules-divider"></div>
                                <div class="back-rule-item">
                                    <div class="back-rule-badge">
                                        <svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35-.54-.81-1.45-1.35-2.5-1.35-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H5c-1.1 0-2 .9-2 2v3c0 .55.45 1 1 1h1v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V12h1c.55 0 1-.45 1-1V8c0-1.1-.9-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-6 1c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm11 15H7v-8h11v8z"/></svg>
                                    </div>
                                    <div class="back-rule-text">10 points<br><span class="orange">= 1 DT de r&eacute;duction</span></div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Thank you and figure watermark -->
                        <div class="back-right-content">
                            <div class="back-watermark-row">
                                <div class="back-watermark-line"></div>
                                <div class="back-watermark-icon">
                                    <svg viewBox="0 0 24 24">
                                        <rect x="2" y="11" width="20" height="2" />
                                        <rect x="4" y="8" width="2" height="8" rx="0.5" />
                                        <rect x="1" y="9" width="3" height="6" rx="0.5" />
                                        <rect x="18" y="8" width="2" height="8" rx="0.5" />
                                        <rect x="20" y="9" width="3" height="6" rx="0.5" />
                                        <circle cx="12" cy="7" r="2.5" />
                                        <path d="M12,10 L12,16 M9,18 L12,15 L15,18 M8,10 C10,9 10,11 12,11 C14,11 14,9 16,10" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                                    </svg>
                                </div>
                                <div class="back-watermark-line"></div>
                            </div>
                            
                            <div class="thanks-area-white">
                                <div class="thanks-main-white">Merci pour<br>votre<br>confiance !</div>
                                <div class="thanks-underline-white"></div>
                            </div>
                        </div>

                        <!-- Bottom Pill Footer -->
                        <div class="back-footer-pill">
                            <div class="back-pill-item-1">
                                <div class="back-pill-icon-wrap">
                                    <svg viewBox="0 0 24 24"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.9 14.3L7 13.2l1.4-1.4 1.7 1.7 4.7-4.7 1.4 1.4-6.1 6.1z"/></svg>
                                </div>
                                <span class="back-pill-text">En cas de perte, contactez la boutique</span>
                            </div>
                            <div class="back-pill-item-2">
                                <div class="back-pill-icon-wrap">
                                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                                </div>
                                <span class="back-pill-text" style="font-weight: 700;">Protein.tn</span>
                            </div>
                            <div class="back-pill-item-3">
                                <div class="back-pill-icon-wrap">
                                    <svg viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.2c.28-.28.36-.67.25-1.02A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/></svg>
                                </div>
                                <span class="back-pill-text" style="font-weight: 900;">{{ $company?->phone_1 ?: '27 612 500' }}</span>
                            </div>
                            <div style="clear: both;"></div>
                        </div>
                    </article>
                @endforeach
                @if(isset($isPdf) && $isPdf)
                    <div style="clear: both;"></div>
                @endif
            </div>
        </section>
    @endif
@endforeach

</body>
</html>