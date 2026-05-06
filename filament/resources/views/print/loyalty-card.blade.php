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
            border: .28mm solid #c8c9cd;
            overflow: hidden;
            position: relative;
            box-shadow: 0 1.2mm 2.8mm rgba(0, 0, 0, .14);
            background: #fff;
        }
        .sobitas-front {
            background: #fff;
            display: flex;
            flex-direction: column;
        }
        .front-top-corner {
            position: absolute;
            top: 0;
            left: 0;
            width: 9mm;
            height: 9mm;
            background: var(--sobitas-orange);
            clip-path: polygon(0 0, 100% 0, 0 100%);
            z-index: 4;
        }
        /* Upper band: branding + titles (never overlaps dark footer) */
        .front-upper {
            position: relative;
            z-index: 2;
            flex: 1 1 0;
            min-height: 0;
            display: grid;
            grid-template-columns: 1fr 22mm;
            column-gap: 2.5mm;
            align-items: start;
            padding: 4mm 4mm 2mm 4.2mm;
            /* Do not clip max-height/overflow — QR + “SCAN ME” pill sit here and were cut off in print/PDF */
            overflow: visible;
        }
        .front-upper-left {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        .logo-wrap {
            line-height: 1;
        }
        .logo-wrap img {
            height: 6.5mm;
            width: auto;
            max-width: 38mm;
            object-fit: contain;
            display: block;
            margin-bottom: .6mm;
        }
        .logo-text-fallback {
            font-size: 5.2mm;
            font-weight: 900;
            font-style: italic;
            color: var(--sobitas-orange);
            letter-spacing: -.02em;
            margin: 0 0 .4mm 0;
        }
        .tagline {
            font-size: 2.35mm;
            font-weight: 700;
            letter-spacing: .38mm;
            color: #1a1b1e;
            text-transform: uppercase;
            margin: 0 0 2.2mm 0;
            line-height: 1.2;
        }
        .title-stack {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }
        .label-carte {
            font-size: 4mm;
            line-height: 1;
            font-weight: 800;
            color: #1a1b1e;
            text-transform: uppercase;
            margin: 0;
        }
        .label-fidelite {
            font-size: 6.8mm;
            line-height: 1;
            font-weight: 900;
            color: #1a1b1e;
            letter-spacing: .12mm;
            text-transform: uppercase;
            margin: .35mm 0 0 0;
        }
        .title-underline {
            width: 14mm;
            height: .5mm;
            background: var(--sobitas-orange);
            border-radius: .2mm;
            margin: 1mm 0 .9mm 0;
        }
        .front-program {
            font-size: 2.35mm;
            letter-spacing: .12mm;
            font-weight: 700;
            color: #2c2f34;
            text-transform: uppercase;
            line-height: 1.2;
            margin: 0;
            max-width: 38mm;
        }
        .front-upper-right {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            gap: 1mm;
            padding-top: 0;
            flex-shrink: 0;
        }
        .qr-block {
            width: 20mm;
            height: 20mm;
            border: .4mm solid var(--sobitas-orange);
            border-radius: 2mm;
            padding: 1mm;
            background: #fff;
            box-shadow: 0 .4mm 1.2mm rgba(0, 0, 0, .12);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .qr-block svg { width: 100%; height: 100%; display: block; }
        .scan-pill {
            background: linear-gradient(180deg, #ff6d1a 0%, #ff4f00 100%);
            color: #fff;
            border-radius: 10mm;
            font-weight: 800;
            font-size: 2.65mm;
            letter-spacing: .08mm;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: .75mm;
            padding: .85mm 2mm .95mm;
            line-height: 1.15;
            white-space: nowrap;
            flex-shrink: 0;
            box-sizing: border-box;
            min-height: 4.6mm;
        }
        .scan-pill .scan-glyph {
            width: 3.6mm;
            height: 3.6mm;
            flex-shrink: 0;
            display: block;
        }
        .scan-pill .scan-glyph path {
            fill: #fff;
        }
        /* Dark diagonal footer — only card ID + instruction (no title overlap) */
        .front-footer {
            position: relative;
            z-index: 1;
            margin-top: auto;
            min-height: 18.5mm;
            flex-shrink: 0;
        }
        .front-footer-bg {
            position: absolute;
            left: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(105deg, #1a1b1f 0%, #121317 45%, #1e1f24 100%);
            /* Diagonal top edge: leaves bottom-right corner whiter for URL + QR column */
            clip-path: polygon(0 22%, 58% 0, 100% 0, 100% 100%, 0 100%);
        }
        .front-footer-accent {
            position: absolute;
            left: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            clip-path: polygon(0 22%, 58% 0, 100% 0, 100% 100%, 0 100%);
            background: linear-gradient(90deg, transparent 0%, transparent 52%, rgba(255, 90, 10, .95) 56%, rgba(255, 90, 10, .85) 58%, transparent 60%);
            opacity: .35;
        }
        .front-footer-inner {
            position: relative;
            z-index: 2;
            padding: 5.5mm 4.2mm 2mm 4.2mm;
            max-width: 52mm;
        }
        .votre-carte {
            color: var(--sobitas-orange);
            font-size: 2.9mm;
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1;
            margin: 0 0 .5mm 0;
            letter-spacing: .06mm;
        }
        .card-number {
            font-size: 6.6mm;
            font-weight: 900;
            line-height: 1.05;
            letter-spacing: .2mm;
            color: #fff;
            margin: 0 0 .9mm 0;
            font-family: "Arial Black", Arial, sans-serif;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .front-note {
            font-size: 2.85mm;
            color: rgba(255, 255, 255, .95);
            font-weight: 600;
            display: flex;
            align-items: flex-start;
            gap: 1mm;
            line-height: 1.25;
            margin: 0;
            max-width: 44mm;
        }
        .front-note .arrow {
            color: var(--sobitas-orange);
            font-size: 3.8mm;
            font-weight: 900;
            line-height: 1;
            flex-shrink: 0;
        }
        .front-website {
            position: absolute;
            right: 3.8mm;
            bottom: 2mm;
            z-index: 5;
            display: inline-flex;
            align-items: center;
            gap: .6mm;
            color: #1a1b1e;
            font-size: 3.2mm;
            font-weight: 700;
        }
        .front-website svg {
            width: 3mm;
            height: 3mm;
            flex-shrink: 0;
        }

        /* === BACK CARD === */
        .sobitas-back {
            background: #f5f5f6;
        }
        .back-left-dark {
            position: absolute;
            left: 0;
            top: 0;
            width: 46.5mm;
            height: 45.5mm;
            background: linear-gradient(115deg, #1a1b1f 0%, #121317 65%, #1b1c20 100%);
            clip-path: polygon(0 0, 100% 0, 70% 100%, 0 100%);
        }
        .back-orange-divider {
            position: absolute;
            left: 42.3mm;
            top: -1mm;
            width: 2.2mm;
            height: 48mm;
            background: var(--sobitas-orange);
            transform: skewX(-36deg);
        }
        .back-white-divider {
            position: absolute;
            left: 44.8mm;
            top: -1mm;
            width: 1.2mm;
            height: 48mm;
            background: #fff;
            transform: skewX(-36deg);
        }
        .back-brand-icon {
            position: absolute;
            left: 3.4mm;
            top: 2.8mm;
            width: 6.8mm;
            height: 6.8mm;
            border-radius: 2.2mm;
            background: linear-gradient(180deg, #ff6b1b, #ff4f00);
            color: #fff;
            font-size: 6.2mm;
            font-weight: 900;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3;
        }
        .back-advantages-title {
            position: absolute;
            left: 12.3mm;
            top: 4.2mm;
            z-index: 3;
            color: #fff;
            font-size: 5.2mm;
            font-weight: 900;
            text-transform: uppercase;
            display: inline-flex;
            align-items: center;
            gap: 2mm;
        }
        .back-advantages-title::after {
            content: "";
            width: 15.5mm;
            height: .45mm;
            background: var(--sobitas-orange);
        }
        .back-rules {
            position: absolute;
            left: 3.5mm;
            top: 11.5mm;
            z-index: 3;
            width: 39.2mm;
            color: #fff;
        }
        .rule-row {
            display: grid;
            grid-template-columns: 6.3mm 1fr;
            gap: 1.3mm;
            margin-bottom: 1.35mm;
            align-items: start;
        }
        .rule-icon {
            width: 5.6mm;
            height: 5.6mm;
            border-radius: 50%;
            background: #ff5a0a;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.85mm;
            font-weight: 700;
            box-shadow: inset 0 0 0 .35mm rgba(255, 255, 255, .22);
            margin-top: .25mm;
        }
        .rule-text {
            font-size: 4.65mm;
            line-height: 1.04;
            font-weight: 900;
            text-transform: uppercase;
        }
        .rule-text .orange { color: var(--sobitas-orange); }
        .thanks-area {
            position: absolute;
            right: 4.2mm;
            top: 12.8mm;
            width: 28.5mm;
            text-align: center;
            z-index: 3;
            color: #1f2124;
        }
        .thanks-main {
            font-size: 5.2mm;
            font-style: italic;
            font-weight: 700;
            line-height: 1.18;
            margin-bottom: 1.4mm;
        }
        .thanks-underline {
            width: 17mm;
            height: .55mm;
            background: var(--sobitas-orange);
            margin: 0 auto;
            border-radius: 2mm;
        }
        .weightmark {
            position: absolute;
            right: 7mm;
            top: 5.6mm;
            font-size: 12mm;
            opacity: .12;
            z-index: 2;
        }
        .back-footer-bar {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 7.9mm;
            background: linear-gradient(180deg, #ff6a18 0%, #ff4e00 100%);
            color: #fff;
            z-index: 4;
            display: grid;
            grid-template-columns: 1.25fr 1fr 1.45fr;
            align-items: center;
            padding: 0 2.8mm;
            font-size: 2.95mm;
            font-weight: 700;
            column-gap: 1.3mm;
        }
        .back-footer-item {
            display: inline-flex;
            align-items: center;
            gap: 1.05mm;
            white-space: nowrap;
        }
        .back-footer-sep {
            border-left: .35mm solid rgba(255, 255, 255, .6);
            height: 4.5mm;
            margin-left: .8mm;
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
                    <div class="front-top-corner" aria-hidden="true"></div>

                    <div class="front-upper">
                        <div class="front-upper-left">
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
                                <div class="title-underline" aria-hidden="true"></div>
                                <p class="front-program">PROGRAMME AVANTAGES BOUTIQUE</p>
                            </div>
                        </div>
                        <div class="front-upper-right">
                            <div class="qr-block">
                                {!! \SimpleSoftwareIO\QrCode\Facades\QrCode::size(110)->margin(0)->generate($card->qr_token) !!}
                            </div>
                            <div class="scan-pill">
                                <svg class="scan-glyph" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14z"/></svg>
                                SCAN ME
                            </div>
                        </div>
                    </div>

                    <div class="front-footer">
                        <div class="front-footer-bg" aria-hidden="true"></div>
                        <div class="front-footer-accent" aria-hidden="true"></div>
                        <div class="front-footer-inner">
                            <p class="votre-carte">VOTRE CARTE</p>
                            <p class="card-number">{{ $card->card_number }}</p>
                            <p class="front-note">
                                <span class="arrow" aria-hidden="true">&#8250;</span>
                                <span>Pr&eacute;sentez cette carte en boutique</span>
                            </p>
                        </div>
                    </div>

                    <div class="front-website">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                        protein.tn
                    </div>
                </article>
            @endforeach
        </div>
    </section>
    @endif

    @if($showBack)
        <section class="sheet">
            <div class="sheet-title">Face arri&egrave;re &middot; Sobitas / protein.tn</div>
            <div class="cards-grid">
                @foreach($chunk as $card)
                    <article class="sobitas-card sobitas-back">
                        <div class="back-left-dark"></div>
                        <div class="back-orange-divider"></div>
                        <div class="back-white-divider"></div>
                        <div class="weightmark">&#x1F3CB;</div>

                        <div class="back-brand-icon">S</div>
                        <div class="back-advantages-title">Vos avantages</div>

                        <div class="back-rules">
                            <div class="rule-row">
                                <div class="rule-icon">1</div>
                                <div class="rule-text">1 DT d&eacute;pens&eacute;<br><span class="orange">= 1 point gagn&eacute;</span></div>
                            </div>
                            <div class="rule-row">
                                <div class="rule-icon">&#x1F381;</div>
                                <div class="rule-text">10 points<br><span class="orange">= 1 DT de r&eacute;duction</span></div>
                            </div>
                            <div class="rule-row">
                                <div class="rule-icon">&#x1F4CD;</div>
                                <div class="rule-text">Utilisable uniquement<br><span class="orange">en boutique</span></div>
                            </div>
                        </div>

                        <div class="thanks-area">
                            <div class="thanks-main">Merci pour<br>votre confiance !</div>
                            <div class="thanks-underline"></div>
                        </div>

                        <div class="back-footer-bar">
                            <div class="back-footer-item">&#x1F6E1; En cas de perte, contactez la boutique.</div>
                            <div class="back-footer-item">
                                <span class="back-footer-sep"></span>
                                &#x260E; {{ $company?->phone_1 ?: '---' }}
                            </div>
                            <div class="back-footer-item">
                                <span class="back-footer-sep"></span>
                                &#x1F4CD; {{ $company?->adresse ?: 'Rue Ribat, 4000 Sousse, Tunisie' }}
                            </div>
                        </div>
                    </article>
                @endforeach
            </div>
        </section>
    @endif
@endforeach

</body>
</html>