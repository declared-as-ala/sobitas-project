<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carte Fidélité — {{ $card->client->name ?? '' }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }

        .card-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 24px;
        }

        /* Credit-card proportions: 85.6 × 53.98 mm / 3.375 × 2.125 in */
        .loyalty-card {
            width: 340px;
            height: 215px;
            border-radius: 16px;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
            color: #fff;
            position: relative;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.35);
            padding: 22px 24px;
        }

        .loyalty-card::before {
            content: '';
            position: absolute;
            top: -60px;
            right: -60px;
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(16,185,129,0.35) 0%, transparent 70%);
        }

        .loyalty-card::after {
            content: '';
            position: absolute;
            bottom: -50px;
            left: -50px;
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 18px;
        }

        .brand-name {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #10b981;
        }

        .brand-sub {
            font-size: 9px;
            color: rgba(255,255,255,0.6);
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-top: 2px;
        }

        .card-type-badge {
            background: rgba(16,185,129,0.2);
            border: 1px solid rgba(16,185,129,0.5);
            color: #10b981;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            padding: 3px 8px;
            border-radius: 20px;
        }

        .card-owner {
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .card-number {
            font-size: 11px;
            color: rgba(255,255,255,0.5);
            letter-spacing: 1px;
            font-family: 'Courier New', monospace;
            margin-bottom: 12px;
        }

        .card-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .points-block {
            display: flex;
            flex-direction: column;
        }

        .points-label {
            font-size: 8px;
            color: rgba(255,255,255,0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .points-value {
            font-size: 22px;
            font-weight: 800;
            color: #10b981;
            line-height: 1;
        }

        .points-dt {
            font-size: 11px;
            color: rgba(255,255,255,0.7);
            margin-top: 2px;
        }

        /* Info block below the card */
        .card-info {
            width: 340px;
            background: #fff;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .card-info h3 {
            font-size: 11px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }

        .card-info p {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 4px;
            line-height: 1.5;
        }

        .qr-section {
            width: 340px;
            background: #fff;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            text-align: center;
        }

        .qr-section h3 {
            font-size: 11px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }

        .qr-section img {
            width: 120px;
            height: 120px;
        }

        @media print {
            body { background: #fff; }
            @page { margin: 10mm; }
        }
    </style>
</head>
<body>

<div class="card-wrapper">

    {{-- Front card --}}
    <div class="loyalty-card">
        <div class="card-header">
            <div>
                <div class="brand-name">protein.tn</div>
                <div class="brand-sub">Carte Fidélité</div>
            </div>
            <div class="card-type-badge">Premium</div>
        </div>

        <div class="card-owner">{{ $card->client->name ?? 'Client' }}</div>
        <div class="card-number">{{ $card->card_number }}</div>

        <div class="card-footer">
            <div class="points-block">
                <span class="points-label">Points disponibles</span>
                <span class="points-value">{{ number_format($points) }}</span>
                <span class="points-dt">≈ {{ number_format($value, 3, '.', ' ') }} DT</span>
            </div>
            <div style="font-size:9px;color:rgba(255,255,255,0.4);text-align:right;">
                Émise le {{ $card->issued_at?->format('d/m/Y') ?? date('d/m/Y') }}
            </div>
        </div>
    </div>

    {{-- QR Code --}}
    <div class="qr-section">
        <h3>Code QR — Scan en boutique</h3>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data={{ urlencode($card->qr_token) }}&bgcolor=ffffff&color=0f172a&margin=4" alt="QR Code" />
        <p style="font-size:9px;color:#9ca3af;margin-top:8px;">{{ $card->card_number }}</p>
    </div>

    {{-- Rules --}}
    <div class="card-info">
        <h3>Programme de fidélité</h3>
        <p>• 1 DT dépensé = 1 point gagné</p>
        <p>• 10 points = 1 DT de réduction</p>
        <p>• Points valables sur toutes les commandes</p>
        <p>• Points gagnés après validation de la commande</p>
        <p style="margin-top:8px;color:#9ca3af;font-size:9px;">protein.tn — Votre partenaire nutrition Tunisie</p>
    </div>

</div>

<script>
    window.onload = function() { window.print(); }
</script>
</body>
</html>
