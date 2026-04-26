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
        $sideMode = in_array(($sideMode ?? 'both'), ['both', 'front'], true) ? $sideMode : 'both';
        $frontOnly = $sideMode === 'front';
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
        body {
            background: #efefef;
            color: #1a1b1e;
            font-family: Arial, "Helvetica Neue", sans-serif;
        }
        .print-toolbar {
            position: sticky;
            top: 0;
            z-index: 20;
            background: #fff;
            border-bottom: 1px solid #e5e7eb;
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
        .sobitas-card {
            width: var(--card-width);
            height: var(--card-height);
            border-radius: var(--card-radius);
            border: .28mm solid #cfcfd3;
            overflow: hidden;
            position: relative;
            box-shadow: 0 1.5mm 3.6mm rgba(0, 0, 0, .18);
            background: #fff;
        }
        .sobitas-front {
            background: radial-gradient(circle at 20% 18%, rgba(255, 255, 255, .98) 0, rgba(255, 255, 255, .94) 48%, rgba(249, 249, 249, .98) 100%);
        }
        .front-top-corner {
            position: absolute;
            top: 0;
            left: 0;
            width: 11mm;
            height: 11mm;
            clip-path: polygon(0 0, 100% 0, 0 100%);
            background: var(--sobitas-orange);
        }
        .front-top-corner-shadow {
            position: absolute;
            top: 0;
            left: 4.4mm;
            width: 6.5mm;
            height: 6.5mm;
            clip-path: polygon(0 0, 100% 0, 0 100%);
            background: #1f2022;
        }
        .watermark-pattern {
            position: absolute;
            top: 0;
            right: 0;
            width: 48mm;
            height: 34mm;
            opacity: .08;
            background-image:
                linear-gradient(transparent 0 0),
                repeating-linear-gradient(0deg, rgba(17, 18, 20, .20) 0 1px, transparent 1px 5.5mm),
                repeating-linear-gradient(90deg, rgba(17, 18, 20, .18) 0 1px, transparent 1px 8mm);
        }
        .front-body {
            position: relative;
            z-index: 2;
            padding: 7.3mm 4.8mm 0;
        }
        .logo-wrap img {
            height: 7.8mm;
            width: auto;
            object-fit: contain;
            margin-bottom: .9mm;
        }
        .tagline {
            font-size: 2.65mm;
            font-weight: 700;
            letter-spacing: .48mm;
            color: #25272a;
            text-transform: uppercase;
            margin-bottom: 3.4mm;
        }
        .label-carte {
            font-size: 5.2mm;
            line-height: 1;
            font-weight: 800;
            color: #1f2124;
            text-transform: uppercase;
        }
        .label-fidelite {
            font-size: 8.2mm;
            line-height: .95;
            font-weight: 900;
            color: #1f2124;
            letter-spacing: .35mm;
            text-transform: uppercase;
            margin-top: .4mm;
        }
        .front-program {
            display: inline-block;
            margin-top: 1.35mm;
            padding-top: .95mm;
            border-top: .45mm solid var(--sobitas-orange);
            font-size: 2.7mm;
            letter-spacing: .1mm;
            font-weight: 700;
            color: #2c2f34;
            text-transform: uppercase;
        }
        .qr-block {
            position: absolute;
            top: 10.2mm;
            right: 5mm;
            width: 20.8mm;
            height: 20.8mm;
            border: .45mm solid var(--sobitas-orange);
            border-radius: 2.2mm;
            padding: 1.1mm;
            background: #fff;
            z-index: 3;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .qr-block svg { width: 100%; height: 100%; }
        .scan-pill {
            position: absolute;
            top: 32.5mm;
            right: 6.2mm;
            z-index: 3;
            background: linear-gradient(180deg, #ff6d1a 0%, #ff4f00 100%);
            color: #fff;
            border-radius: 12mm;
            font-weight: 800;
            font-size: 3.3mm;
            letter-spacing: .06mm;
            display: inline-flex;
            align-items: center;
            gap: 1.2mm;
            padding: 1.2mm 3mm;
            line-height: 1;
        }
        .scan-pill .scan-icon {
            width: 5.1mm;
            height: 5.1mm;
            border-radius: 50%;
            border: .35mm solid rgba(255, 255, 255, .9);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 2.9mm;
        }
        .front-bottom {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 16.8mm;
            background: linear-gradient(108deg, #1a1b1f 0%, #101114 55%, #1f2124 100%);
            z-index: 1;
        }
        .front-diagonal-orange {
            position: absolute;
            right: 17.5mm;
            bottom: 0;
            width: 12.5mm;
            height: 16.8mm;
            background: var(--sobitas-orange);
            transform: skewX(-38deg);
            transform-origin: bottom;
        }
        .front-diagonal-white {
            position: absolute;
            right: 13.4mm;
            bottom: 0;
            width: 2.1mm;
            height: 16.8mm;
            background: #fff;
            transform: skewX(-38deg);
            transform-origin: bottom;
        }
        .front-diagonal-black {
            position: absolute;
            right: 9.5mm;
            bottom: 0;
            width: 5.2mm;
            height: 16.8mm;
            background: #0d0e10;
            transform: skewX(-38deg);
            transform-origin: bottom;
        }
        .bottom-content {
            position: absolute;
            left: 4.6mm;
            right: 32mm;
            bottom: 2.15mm;
            z-index: 3;
            color: #fff;
        }
        .votre-carte {
            color: var(--sobitas-orange);
            font-size: 4.4mm;
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1;
            margin-bottom: .55mm;
        }
        .card-number {
            font-size: 8.1mm;
            font-weight: 900;
            line-height: 1;
            letter-spacing: .35mm;
            color: #fff;
            margin-bottom: 1.2mm;
            font-family: "Arial Black", Arial, sans-serif;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .front-note {
            font-size: 4.1mm;
            color: #fff;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 1.3mm;
            line-height: 1;
            white-space: nowrap;
        }
        .front-note .arrow {
            color: var(--sobitas-orange);
            font-size: 6.2mm;
            margin-top: -.3mm;
        }
        .front-website {
            position: absolute;
            right: 4.4mm;
            bottom: 2.25mm;
            z-index: 3;
            display: inline-flex;
            align-items: center;
            gap: 1mm;
            color: #222428;
            font-size: 3.65mm;
            font-weight: 700;
        }
        .sobitas-back {
            background: radial-gradient(circle at 84% 21%, rgba(0, 0, 0, .06) 0, rgba(0, 0, 0, .03) 50%, transparent 70%), #f5f5f6;
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
<div class="print-toolbar py-3 no-print">
    <div class="container-fluid d-flex flex-wrap align-items-center gap-2">
        <button class="btn btn-dark rounded-pill px-4" onclick="window.print()">Imprimer</button>
        <a href="{{ url()->previous() }}" class="btn btn-outline-secondary rounded-pill px-4">Retour</a>
        <span class="badge text-bg-warning ms-1">{{ collect($cards)->count() }} cartes</span>
        @if(isset($batch))
            <span class="small text-muted">Lot : <strong>{{ $batch->name ?: "Lot #{$batch->id}" }}</strong></span>
        @endif
        <span class="small text-muted">Mise en page : {{ $cardsPerPage }} cartes / planche</span>
    </div>
</div>

@foreach($cardChunks as $chunk)
    <section class="sheet">
        <div class="sheet-title">Face avant · Sobitas / protein.tn</div>
        <div class="cards-grid">
            @foreach($chunk as $card)
                <article class="sobitas-card sobitas-front">
                    <div class="front-top-corner"></div>
                    <div class="front-top-corner-shadow"></div>
                    <div class="watermark-pattern"></div>

                    <div class="qr-block">
                        {!! \SimpleSoftwareIO\QrCode\Facades\QrCode::size(110)->margin(0)->generate($card->qr_token) !!}
                    </div>
                    <div class="scan-pill"><span class="scan-icon">📱</span> SCAN ME</div>

                    <div class="front-body">
                        <div class="logo-wrap">
                            @if($logoSrc)
                                <img src="{{ $logoSrc }}" alt="Sobitas logo">
                            @else
                                <strong>Sobitas</strong>
                            @endif
                        </div>
                        <div class="tagline">NUTRITION &amp; PERFORMANCE</div>
                        <div class="label-carte">CARTE</div>
                        <div class="label-fidelite">FIDÉLITÉ</div>
                        <div class="front-program">PROGRAMME AVANTAGES BOUTIQUE</div>
                    </div>

                    <div class="front-bottom"></div>
                    <div class="front-diagonal-orange"></div>
                    <div class="front-diagonal-white"></div>
                    <div class="front-diagonal-black"></div>

                    <div class="bottom-content">
                        <div class="votre-carte">VOTRE CARTE</div>
                        <div class="card-number">{{ $card->card_number }}</div>
                        <div class="front-note"><span class="arrow">›</span>Présentez cette carte en boutique</div>
                    </div>
                    <div class="front-website"><span>◎</span> protein.tn</div>
                </article>
            @endforeach
        </div>
    </section>

    @if(! $frontOnly)
        <section class="sheet">
            <div class="sheet-title">Face arrière · Sobitas / protein.tn</div>
            <div class="cards-grid">
                @foreach($chunk as $card)
                    <article class="sobitas-card sobitas-back">
                        <div class="back-left-dark"></div>
                        <div class="back-orange-divider"></div>
                        <div class="back-white-divider"></div>
                        <div class="weightmark">🏋</div>

                        <div class="back-brand-icon">S</div>
                        <div class="back-advantages-title">Vos avantages</div>

                        <div class="back-rules">
                            <div class="rule-row">
                                <div class="rule-icon">1</div>
                                <div class="rule-text">1 DT dépensé<br><span class="orange">= 1 point gagné</span></div>
                            </div>
                            <div class="rule-row">
                                <div class="rule-icon">🎁</div>
                                <div class="rule-text">10 points<br><span class="orange">= 1 DT de réduction</span></div>
                            </div>
                            <div class="rule-row">
                                <div class="rule-icon">📍</div>
                                <div class="rule-text">Utilisable uniquement<br><span class="orange">en boutique</span></div>
                            </div>
                        </div>

                        <div class="thanks-area">
                            <div class="thanks-main">Merci pour<br>votre confiance !</div>
                            <div class="thanks-underline"></div>
                        </div>

                        <div class="back-footer-bar">
                            <div class="back-footer-item">🛡 En cas de perte, contactez la boutique.</div>
                            <div class="back-footer-item"><span class="back-footer-sep"></span> ☎ {{ $company?->phone_1 ?: '---' }}</div>
                            <div class="back-footer-item"><span class="back-footer-sep"></span> 📍 {{ $company?->adresse ?: 'Rue Ribat, 4000 Sousse, Tunisie' }}</div>
                        </div>
                    </article>
                @endforeach
            </div>
        </section>
    @endif
@endforeach
</body>
</html>
