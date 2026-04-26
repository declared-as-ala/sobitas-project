<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Cartes Fidélité Sobitas</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    @php
        $company = \App\Models\Coordinate::getCached();
        $logoSrc = $logoDataUri ?? asset('logo.png');
        $cardsPerPage = max(1, min(12, (int) ($cardsPerPage ?? 8)));
        $cardChunks = collect($cards)->chunk($cardsPerPage);
    @endphp
    <style>
        :root {
            --sobitas-orange: #f97316;
            --sobitas-black: #111111;
            --sobitas-white: #ffffff;
            --sheet-width: 210mm;
            --sheet-height: 297mm;
            --card-width: 85.60mm;
            --card-height: 54.00mm;
            --card-radius: 3.2mm;
        }
        body {
            background: #f4f4f5;
            color: var(--sobitas-black);
            font-family: "Segoe UI", Arial, sans-serif;
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
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
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
        .plastic-card {
            width: var(--card-width);
            height: var(--card-height);
            border-radius: var(--card-radius);
            border: .35mm solid #d4d4d8;
            overflow: hidden;
            position: relative;
            background: var(--sobitas-white);
        }
        .front-accent {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4.5mm;
            background: var(--sobitas-orange);
        }
        .front-content {
            padding: 6mm 4.5mm 4.5mm;
            height: 100%;
        }
        .logo-wrap img {
            height: 8.8mm;
            width: auto;
            object-fit: contain;
        }
        .card-title {
            font-size: 5.4pt;
            text-transform: uppercase;
            letter-spacing: 1.1px;
            font-weight: 700;
            color: #374151;
        }
        .card-number {
            font-family: "Consolas", "Courier New", monospace;
            font-size: 8.2pt;
            font-weight: 700;
            letter-spacing: .7px;
        }
        .card-note {
            font-size: 4.9pt;
            color: #4b5563;
        }
        .qr-box {
            width: 18.5mm;
            height: 18.5mm;
            border: .25mm solid #d4d4d8;
            border-radius: 1.2mm;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1mm;
            background: #fff;
        }
        .qr-box svg {
            width: 100%;
            height: 100%;
        }
        .back-top {
            height: 8mm;
            background: var(--sobitas-black);
        }
        .back-content {
            padding: 3.5mm 4.2mm 4mm;
            height: calc(100% - 8mm);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .rules-title {
            color: var(--sobitas-orange);
            font-size: 5.1pt;
            text-transform: uppercase;
            letter-spacing: .7px;
            font-weight: 700;
            margin-bottom: 1.2mm;
        }
        .rules-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .rules-list li {
            font-size: 4.8pt;
            margin-bottom: .8mm;
            display: flex;
            align-items: start;
            gap: 1.1mm;
        }
        .bullet-dot {
            width: 2.2mm;
            height: 2.2mm;
            border-radius: 9999px;
            margin-top: .45mm;
            background: var(--sobitas-orange);
            flex: 0 0 auto;
        }
        .back-footer {
            border-top: .2mm solid #d4d4d8;
            padding-top: 1.5mm;
        }
        .contact {
            font-size: 4.2pt;
            line-height: 1.35;
            color: #4b5563;
        }
        .token-label {
            font-family: "Consolas", "Courier New", monospace;
            font-size: 4.1pt;
            color: #6b7280;
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
                <article class="plastic-card">
                    <div class="front-accent"></div>
                    <div class="front-content d-flex flex-column justify-content-between">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="logo-wrap mb-2">
                                    @if($logoSrc)
                                        <img src="{{ $logoSrc }}" alt="Sobitas logo">
                                    @else
                                        <strong>Sobitas</strong>
                                    @endif
                                </div>
                                <div class="card-title">Carte Fidélité</div>
                            </div>
                            <div class="qr-box">
                                {!! \SimpleSoftwareIO\QrCode\Facades\QrCode::size(92)->margin(0)->generate($card->qr_token) !!}
                            </div>
                        </div>
                        <div>
                            <div class="card-number mb-1">{{ $card->card_number }}</div>
                            <div class="card-note">Présentez cette carte en boutique</div>
                        </div>
                    </div>
                </article>
            @endforeach
        </div>
    </section>

    <section class="sheet">
        <div class="sheet-title">Face arrière · Sobitas / protein.tn</div>
        <div class="cards-grid">
            @foreach($chunk as $card)
                <article class="plastic-card">
                    <div class="back-top"></div>
                    <div class="back-content">
                        <div>
                            <div class="rules-title">Règles de fidélité</div>
                            <ul class="rules-list">
                                <li><span class="bullet-dot"></span><span>1 DT dépensé = 1 point gagné</span></li>
                                <li><span class="bullet-dot"></span><span>10 points = 1 DT de réduction</span></li>
                                <li><span class="bullet-dot"></span><span>Utilisable en boutique uniquement</span></li>
                            </ul>
                        </div>
                        <div class="back-footer d-flex justify-content-between align-items-end">
                            <div class="contact">
                                protein.tn / Sobitas<br>
                                {{ $company?->phone_1 ?: '' }} {{ $company?->adresse ? '· ' . $company->adresse : '' }}
                            </div>
                            <div class="token-label text-end">
                                {{ $card->card_number }}<br>
                                {{ $card->qr_token }}
                            </div>
                        </div>
                    </div>
                </article>
            @endforeach
        </div>
    </section>
@endforeach
</body>
</html>
