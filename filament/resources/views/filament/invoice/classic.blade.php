<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture {{ $facture->numero ?? '' }}</title>
    <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Georgia', 'Times New Roman', serif; font-size: 12px; line-height: 1.5; color: #2c3e50; }
        .invoice-print {
            width: 210mm; min-height: 297mm; margin: 24px auto; padding: 14mm 16mm; background: #fff;
            border: 1px solid #dde1e6; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        @media print {
            body * { visibility: hidden; }
            .invoice-print, .invoice-print * { visibility: visible; }
            .invoice-print { position: absolute; left: 0; top: 0; width: 100% !important; max-width: none; margin: 0; padding: 0; border: none; border-radius: 0; box-shadow: none; }
            .no-print { display: none !important; }
            .invoice-print table tr { break-inside: avoid; page-break-inside: avoid; }
            .invoice-print thead { display: table-header-group; }
        }
        .inv-head { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid #dde1e6; }
        .inv-company { flex: 1; }
        .inv-company .inv-logo { max-width: 140px; max-height: 44px; object-fit: contain; margin-bottom: 8px; }
        .inv-company .inv-name { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 10px; }
        .inv-company .inv-meta { font-size: 11px; color: #5c6b7a; line-height: 1.6; }
        .inv-title-block { text-align: right; }
        .inv-title-block .inv-title { font-size: 22px; font-weight: 700; letter-spacing: 0.04em; color: #1a1a1a; margin: 0 0 12px 0; }
        .inv-title-block .inv-meta-list { font-size: 12px; color: #5c6b7a; }
        .inv-title-block .inv-meta-list span { display: block; margin-bottom: 4px; }
        .inv-badge { display: inline-block; margin-top: 8px; padding: 3px 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 3px; border: 1px solid #e67e22; color: #e67e22; background: #fef5ee; }
        .inv-client { background: #fafbfc; border: 1px solid #e8eaed; border-radius: 6px; padding: 14px 18px; margin-bottom: 22px; }
        .inv-client .inv-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #7f8c9a; margin-bottom: 6px; }
        .inv-client .inv-client-name { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; }
        .inv-client .inv-client-details { font-size: 11px; color: #5c6b7a; line-height: 1.6; }
        .inv-table-wrap { margin-bottom: 22px; overflow-x: auto; }
        .inv-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .inv-table thead th { background: #f6f7f9; color: #3d4f5f; font-weight: 600; text-align: left; padding: 10px 12px; border: 1px solid #e8eaed; border-bottom: 2px solid #e0e3e8; }
        .inv-table thead th.num { text-align: right; }
        .inv-table tbody td { padding: 10px 12px; border: 1px solid #f0f1f3; }
        .inv-table tbody tr:nth-child(even) { background: #fafbfc; }
        .inv-table tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .inv-table tbody td.prod { font-weight: 500; color: #1a1a1a; }
        .inv-totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
        .inv-totals-box { width: 100%; max-width: 260px; border: 1px solid #e8eaed; border-radius: 6px; overflow: hidden; }
        .inv-totals-box .inv-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 12px; border-bottom: 1px solid #f0f1f3; color: #3d4f5f; }
        .inv-totals-box .inv-row:last-child { border-bottom: none; }
        .inv-totals-box .inv-row.ttc { background: #fef5ee; border-top: 2px solid #e67e22; padding: 12px 14px; font-size: 15px; font-weight: 700; color: #1a1a1a; }
        .inv-totals-box .inv-row .amt { font-variant-numeric: tabular-nums; }
        .inv-footer { margin-top: 28px; padding-top: 18px; border-top: 1px solid #e8eaed; font-size: 11px; color: #5c6b7a; }
        .inv-note { margin-bottom: 14px; padding: 10px 12px; background: #fafbfc; border-radius: 4px; border-left: 3px solid #b0b8c4; }
        .inv-note .inv-note-label { font-weight: 600; color: #3d4f5f; margin-bottom: 4px; }
        .inv-signature { margin-top: 20px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #95a0ad; text-decoration: underline; text-underline-offset: 3px; }
        .inv-rib { margin-top: 12px; font-size: 10px; color: #95a0ad; text-align: center; }
        @if (!request()->query('embed'))
        body { background: #eef0f2; min-height: 100vh; }
        @endif
    </style>
</head>
<body>
    @if (!request()->query('embed'))
    <div class="no-print" style="max-width: 210mm; margin: 12px auto 0; padding: 0 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <span style="font-size: 12px; color: #5c6b7a;">Vue : <strong>Classique</strong> · <a href="{{ request()->fullUrlWithQuery(['style' => 'modern']) }}" style="color: #e67e22;">Moderne</a></span>
        <span style="display: flex; gap: 8px;">
            <button type="button" onclick="window.print()" style="padding: 8px 16px; border-radius: 4px; border: 1px solid #dde1e6; background: #fff; font: 12px Georgia, serif; cursor: pointer;">Imprimer</button>
            <a href="{{ url()->previous() }}" style="padding: 8px 16px; border-radius: 4px; border: 1px solid #dde1e6; background: #fff; font: 12px Georgia, serif; text-decoration: none; color: #2c3e50;">Retour</a>
        </span>
    </div>
    @endif

    <div id="invoice-print" class="invoice-print">
        <header class="inv-head">
            <div class="inv-company">
                @if ($coordonnee && $coordonnee->logo_facture)
                    <img src="{{ asset('storage/' . $coordonnee->logo_facture) }}" alt="" class="inv-logo">
                @endif
                <div class="inv-name">{{ $coordonnee->abbreviation ?? 'SOBITAS' }}</div>
                @if ($coordonnee)
                    <div class="inv-meta">
                        @if ($coordonnee->email) {{ $coordonnee->email }}<br> @endif
                        @if ($coordonnee->adresse_fr) {{ $coordonnee->adresse_fr }}<br> @endif
                        @if ($coordonnee->phone_1) Tél. {{ $coordonnee->phone_1 }}@if ($coordonnee->phone_2 ?? null) / {{ $coordonnee->phone_2 }} @endif<br> @endif
                        @if ($coordonnee->registre_commerce ?? null) RC : {{ $coordonnee->registre_commerce }}<br> @endif
                        @if ($coordonnee->matricule ?? null) MF : {{ $coordonnee->matricule }} @endif
                    </div>
                @endif
            </div>
            <div class="inv-title-block">
                <h1 class="inv-title">FACTURE</h1>
                <div class="inv-meta-list">
                    <span><strong>Date :</strong> {{ $facture->created_at?->format('d/m/Y') ?? '—' }}</span>
                    <span><strong>N° :</strong> {{ $facture->numero ?? '—' }}</span>
                    @if (!empty($facture->statut))
                        <span class="inv-badge">{{ $facture->statut }}</span>
                    @endif
                </div>
            </div>
        </header>

        @if ($facture->client ?? null)
        <section class="inv-client">
            <div class="inv-label">Facturé à</div>
            <div class="inv-client-name">{{ $facture->client->name }}</div>
            <div class="inv-client-details">
                @if ($facture->client->adresse ?? null) {{ $facture->client->adresse }}<br> @endif
                @if ($facture->client->phone_1 ?? null) Tél. {{ $facture->client->phone_1 }}<br> @endif
                @if ($facture->client->matricule ?? null) Matricule : {{ $facture->client->matricule }} @endif
            </div>
        </section>
        @endif

        <div class="inv-table-wrap">
            <table class="inv-table">
                <thead>
                    <tr>
                        <th style="width:4%">#</th>
                        <th style="width:32%">Produit</th>
                        <th class="num" style="width:8%">QTE</th>
                        <th class="num" style="width:12%">P.U HT</th>
                        <th class="num" style="width:10%">TVA %</th>
                        <th class="num" style="width:14%">P.U TTC</th>
                        <th class="num" style="width:14%">Total TTC</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($invoice_rows ?? [] as $row)
                    <tr>
                        <td>{{ $row['index'] }}</td>
                        <td class="prod">{{ $row['produit'] }}</td>
                        <td class="num">{{ $row['qte'] }}</td>
                        <td class="num">{{ number_format($row['pu_ht'], 3, ',', ' ') }} TND</td>
                        <td class="num">{{ number_format($row['tva_pct'], 0) }} %</td>
                        <td class="num">{{ number_format($row['pu_ttc'], 3, ',', ' ') }} TND</td>
                        <td class="num">{{ number_format($row['total_ttc'], 3, ',', ' ') }} TND</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <div class="inv-totals">
            <div class="inv-totals-box">
                <div class="inv-row"><span>Total HT</span><span class="amt">{{ number_format((float)($facture->prix_ht ?? 0), 3, ',', ' ') }} TND</span></div>
                @if (!empty($facture->remise) && (float)$facture->remise > 0)
                <div class="inv-row"><span>Remise</span><span class="amt">− {{ number_format((float)$facture->remise, 3, ',', ' ') }} TND</span></div>
                @endif
                <div class="inv-row"><span>TVA</span><span class="amt">{{ number_format((float)($facture->tva ?? 0), 3, ',', ' ') }} TND</span></div>
                <div class="inv-row"><span>Timbre</span><span class="amt">{{ number_format((float)($facture->timbre ?? 0), 3, ',', ' ') }} TND</span></div>
                <div class="inv-row ttc"><span>Total TTC</span><span class="amt">{{ number_format((float)($facture->prix_ttc ?? 0), 3, ',', ' ') }} TND</span></div>
            </div>
        </div>

        <footer class="inv-footer">
            @if ($coordonnee && !empty($coordonnee->note))
            <div class="inv-note">
                <div class="inv-note-label">Note</div>
                <div>{{ $coordonnee->note }} <span id="inv-words"></span></div>
            </div>
            @endif
            <div class="inv-signature">Signature et cachet</div>
            @if ($coordonnee && !empty($coordonnee->rib))
            <div class="inv-rib">{{ $coordonnee->rib }}</div>
            @endif
        </footer>
    </div>

    <input type="hidden" id="inv-totale" value="{{ $facture->prix_ttc ?? 0 }}">
    <script>
    (function(){
        var a=['','un ','deux ','trois ','quatre ','cinq ','six ','sept ','huit ','neuf ','dix ','onze ','douze ','treize ','quatorze ','quinze ','seize ','dix-sept ','dix-huit ','dix-neuf '];
        var b=['','','vingt ','trente ','quarante ','cinquante ','soixante ','soixante-dix ','quatre-vingt ','quatre-vingt-dix '];
        function inWords(num){
            var tab=(num+'').split('.'); if((num+'').length>9) return '';
            var n=('000000000'+(tab[0]||'0')).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            if(!n) return '';
            var str='';
            str+=(n[1]!=0)?(a[Number(n[1])]||b[n[1][0]]+' '+a[n[1][1]])+' ':'';
            str+=(n[2]!=0)?(a[Number(n[2])]||b[n[2][0]]+' '+a[n[2][1]])+' ':'';
            str+=(n[3]!=0)?(a[Number(n[3])]||b[n[3][0]]+' '+a[n[3][1]])+'mille ':'';
            str+=(n[4]!=0)?(a[Number(n[4])]||b[n[4][0]]+' '+a[n[4][1]])+'cent ':'';
            str+=(n[5]!=0)?((str?' ':'')+(a[Number(n[5])]||b[n[5][0]]+' '+a[n[5][1]])+'dinars '):' dinars';
            if(tab.length>1&&tab[1]){ var nb=tab[1]; if(nb.length===1)nb=nb*100; else if(nb.length===2)nb=nb*10; str+=' et '+nb+' millimes'; }
            return str;
        }
        var w=document.getElementById('inv-words'),t=document.getElementById('inv-totale');
        if(w&&t) w.textContent=inWords(parseFloat(t.value)||0);
    })();
    </script>
</body>
</html>
