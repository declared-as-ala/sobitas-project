<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Cartes Fidélité</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Arial', sans-serif;
            background: #f0f0f0;
        }

        .toolbar {
            padding: 12px 20px;
            background: #fff;
            border-bottom: 1px solid #ddd;
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .toolbar .btn {
            padding: 8px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
        }

        .btn-print { background: #2563eb; color: #fff; }
        .btn-back  { background: #e5e7eb; color: #374151; text-decoration: none; display: inline-block; padding: 8px 20px; border-radius: 6px; font-size:14px; font-weight:600; }

        /* A4 page simulation */
        .page {
            width: 210mm;
            min-height: 297mm;
            background: #fff;
            margin: 24px auto;
            padding: 8mm;
            display: flex;
            flex-wrap: wrap;
            gap: 6mm;
            align-content: flex-start;
        }

        /* ── Credit card: 85.6mm × 54mm (standard CR80) ── */
        .card-wrap {
            width: 85.6mm;
            display: flex;
            flex-direction: column;
            gap: 2mm;
        }

        .card-face {
            width: 85.6mm;
            height: 54mm;
            border-radius: 3mm;
            overflow: hidden;
            position: relative;
            border: 0.3mm solid #ddd;
        }

        /* ─────────────── FRONT ─────────────── */
        .card-front {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #fff;
            padding: 4mm 5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .card-front .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .card-front .brand-name {
            font-size: 7pt;
            font-weight: 700;
            letter-spacing: 1px;
            color: #e2b96f;
            text-transform: uppercase;
        }

        .card-front .card-title {
            font-size: 5.5pt;
            color: rgba(255,255,255,0.7);
            margin-top: 1mm;
        }

        .card-front .qr-wrap {
            width: 18mm;
            height: 18mm;
            background: #fff;
            border-radius: 1mm;
            padding: 1mm;
            flex-shrink: 0;
        }

        .card-front .qr-wrap svg,
        .card-front .qr-wrap img {
            width: 100%;
            height: 100%;
        }

        .card-front .card-number {
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: 2px;
            font-family: 'Courier New', monospace;
            color: #e2b96f;
        }

        .card-front .card-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .card-front .card-instruction {
            font-size: 4.5pt;
            color: rgba(255,255,255,0.6);
            max-width: 55mm;
        }

        .card-front .gold-stripe {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 5mm;
            background: linear-gradient(90deg, #e2b96f, #f5d78e, #e2b96f);
            opacity: 0.15;
        }

        /* ─────────────── BACK ─────────────── */
        .card-back {
            background: #f8f8f8;
            color: #222;
            padding: 4mm 5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .card-back .black-stripe {
            background: #111;
            height: 8mm;
            margin: -4mm -5mm 3mm;
        }

        .card-back .rules-title {
            font-size: 5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2mm;
            color: #444;
        }

        .card-back .rule-line {
            font-size: 5pt;
            color: #333;
            margin-bottom: 1mm;
            display: flex;
            align-items: center;
            gap: 1.5mm;
        }

        .card-back .rule-icon {
            display: inline-block;
            width: 3mm;
            height: 3mm;
            background: #1a1a2e;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .card-back .card-back-footer {
            border-top: 0.2mm solid #ccc;
            padding-top: 2mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .card-back .contact-info {
            font-size: 4pt;
            color: #666;
            line-height: 1.5;
        }

        .card-back .card-number-back {
            font-size: 5pt;
            color: #aaa;
            font-family: 'Courier New', monospace;
        }

        .card-label {
            font-size: 9pt;
            font-weight: 700;
            color: #555;
            text-align: center;
            padding: 1mm 0;
        }

        /* ── Print styles ── */
        @media print {
            .toolbar { display: none !important; }
            body { background: #fff; }
            .page {
                margin: 0;
                box-shadow: none;
                padding: 5mm;
            }
        }

        /* Page breaks every 8 cards (A4 fits ~8) */
        .card-wrap:nth-child(8n) {
            page-break-after: always;
        }
    </style>
</head>
<body>

<div class="toolbar no-print">
    <button class="btn btn-print" onclick="window.print()">🖨 Imprimer</button>
    <a class="btn-back" href="{{ url()->previous() }}">← Retour</a>
    <span style="font-size:13px;color:#555;margin-left:10px;">
        {{ $cards->count() }} carte(s)
        @if(isset($batch)) · Lot : <strong>{{ $batch->name ?: "Lot #{$batch->id}" }}</strong> @endif
    </span>
</div>

<div class="page">
@foreach($cards as $card)
<div class="card-wrap">
    {{-- FRONT --}}
    <div class="card-face card-front">
        <div class="gold-stripe"></div>
        <div class="card-header">
            <div>
                <div class="brand-name">Protein.tn</div>
                <div class="card-title">CARTE FIDÉLITÉ</div>
            </div>
            <div class="qr-wrap">
                {!! \SimpleSoftwareIO\QrCode\Facades\QrCode::size(60)->style('round')->generate($card->qr_token) !!}
            </div>
        </div>
        <div class="card-footer">
            <div>
                <div class="card-number">{{ $card->card_number }}</div>
                <div class="card-instruction">Présentez cette carte en boutique à chaque achat</div>
            </div>
        </div>
    </div>

    {{-- BACK --}}
    <div class="card-face card-back">
        <div class="black-stripe"></div>
        <div>
            <div class="rules-title">Programme Fidélité</div>
            <div class="rule-line"><span class="rule-icon"></span> 1 DT dépensé = 1 point gagné</div>
            <div class="rule-line"><span class="rule-icon"></span> 10 points = 1 DT de réduction</div>
            <div class="rule-line"><span class="rule-icon"></span> Utilisable en boutique uniquement</div>
            <div class="rule-line"><span class="rule-icon"></span> Valable à partir de 100 points</div>
        </div>
        <div class="card-back-footer">
            <div class="contact-info">
                En cas de perte, contactez la boutique<br>
                protein.tn &nbsp;·&nbsp; {{ \App\Models\Coordinate::getCached()?->phone_1 ?? '' }}
            </div>
            <div class="card-number-back">{{ $card->card_number }}</div>
        </div>
    </div>
</div>
@endforeach
</div>

</body>
</html>
