<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture {{ $facture->numero ?? '' }}</title>
    <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; font-size: 13px; line-height: 1.5; color: #1a1a2e; }
        .invoice-print {
            width: 210mm; min-height: 297mm; margin: 24px auto; padding: 20px 24px; background: #fff;
            border-radius: 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);
        }
        @media print {
            body * { visibility: hidden; }
            .invoice-print, .invoice-print * { visibility: visible; }
            .invoice-print { position: absolute; left: 0; top: 0; width: 100% !important; max-width: none; margin: 0; padding: 0; border-radius: 0; box-shadow: none; }
            .no-print { display: none !important; }
            .invoice-print table tr { break-inside: avoid; page-break-inside: avoid; }
            .invoice-print thead { display: table-header-group; }
        }
        .m-head { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; margin-bottom: 28px; }
        .m-head-left { display: flex; flex-direction: column; gap: 12px; }
        .m-logo { max-width: 160px; max-height: 48px; object-fit: contain; }
        .m-company-name { font-size: 20px; font-weight: 700; color: #0f0f1a; letter-spacing: -0.02em; }
        .m-company-meta { font-size: 12px; color: #64748b; line-height: 1.65; }
        .m-head-right { text-align: right; }
        .m-doc-title { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; color: #0f0f1a; margin: 0 0 4px 0; }
        .m-doc-accent { display: inline-block; width: 48px; height: 4px; background: linear-gradient(90deg, #f97316, #ea580c); border-radius: 2px; margin-bottom: 16px; }
        .m-meta-grid { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #475569; }
        .m-meta-grid strong { color: #1e293b; }
        .m-badge { display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; border-radius: 8px; background: rgba(249,115,22,0.12); color: #c2410c; margin-top: 8px; }
        .m-client-card { background: #f8fafc; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; border: 1px solid #e2e8f0; }
        .m-client-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
        .m-client-name { font-size: 16px; font-weight: 700; color: #0f0f1a; margin-bottom: 10px; }
        .m-client-details { font-size: 12px; color: #64748b; line-height: 1.7; }
        .m-table-section { margin-bottom: 28px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .m-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .m-table thead th { background: #f1f5f9; color: #334155; font-weight: 600; text-align: left; padding: 14px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
        .m-table thead th.num { text-align: right; }
        .m-table tbody td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
        .m-table tbody tr:nth-child(even) { background: #fafbfc; }
        .m-table tbody tr:last-child td { border-bottom: none; }
        .m-table tbody td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; color: #334155; }
        .m-table tbody td.prod { font-weight: 600; color: #0f0f1a; }
        .m-totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 32px; }
        .m-totals-card { width: 100%; max-width: 300px; background: linear-gradient(180deg, #fff 0%, #fef7ed 100%); border-radius: 12px; padding: 20px 24px; border: 1px solid #fed7aa; box-shadow: 0 2px 8px rgba(249,115,22,0.06); }
        .m-totals-card .m-tot-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; font-size: 13px; color: #475569; }
        .m-totals-card .m-tot-row.ttc { margin-top: 12px; padding-top: 16px; border-top: 2px solid #f97316; font-size: 18px; font-weight: 800; color: #0f0f1a; }
        .m-totals-card .m-tot-row .amt { font-variant-numeric: tabular-nums; font-weight: 600; }
        .m-totals-card .m-tot-row.ttc .amt { font-size: 20px; color: #c2410c; }
        .m-footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
        .m-note { margin-bottom: 20px; padding: 16px 20px; background: #f8fafc; border-radius: 10px; border-left: 4px solid #f97316; }
        .m-note-label { font-weight: 700; font-size: 12px; color: #334155; margin-bottom: 6px; }
        .m-signature { margin-top: 24px; text-align: center; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
        .m-rib { margin-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
        @if (!request()->query('embed'))
        body { background: #f1f5f9; min-height: 100vh; }
        @endif
    </style>
</head>
<body>
    @if (!request()->query('embed'))
    <div class="no-print" style="max-width: 210mm; margin: 16px auto 0; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <span style="font-size: 13px; color: #64748b;">Vue : <a href="{{ request()->fullUrlWithQuery(['style' => 'classic']) }}" style="color: #f97316;">Classique</a> · <strong>Moderne</strong></span>
        <span style="display: flex; gap: 10px;">
            <button type="button" onclick="window.print()" style="padding: 10px 20px; border-radius: 10px; border: none; background: #f97316; color: #fff; font-weight: 600; font-size: 13px; cursor: pointer;">Imprimer</button>
            <a href="{{ url()->previous() }}" style="padding: 10px 20px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; font-weight: 500; font-size: 13px; text-decoration: none; color: #475569;">Retour</a>
        </span>
    </div>
    @endif

    <div id="invoice-print" class="invoice-print">
        <header class="m-head">
            <div class="m-head-left">
                @if ($coordonnee && $coordonnee->logo_facture)
                    <img src="{{ asset('storage/' . $coordonnee->logo_facture) }}" alt="" class="m-logo">
                @endif
                <div class="m-company-name">{{ $coordonnee->abbreviation ?? 'SOBITAS' }}</div>
                @if ($coordonnee)
                    <div class="m-company-meta">
                        @if ($coordonnee->email) {{ $coordonnee->email }}<br> @endif
                        @if ($coordonnee->adresse_fr) {{ $coordonnee->adresse_fr }}<br> @endif
                        @if ($coordonnee->phone_1) Tél. {{ $coordonnee->phone_1 }}@if ($coordonnee->phone_2 ?? null) / {{ $coordonnee->phone_2 }} @endif<br> @endif
                        @if ($coordonnee->registre_commerce ?? null) RC : {{ $coordonnee->registre_commerce }}<br> @endif
                        @if ($coordonnee->matricule ?? null) MF : {{ $coordonnee->matricule }} @endif
                    </div>
                @endif
            </div>
            <div class="m-head-right">
                <h1 class="m-doc-title">FACTURE</h1>
                <div class="m-doc-accent"></div>
                <div class="m-meta-grid">
                    <span><strong>Date</strong> {{ $facture->created_at?->format('d/m/Y') ?? '—' }}</span>
                    <span><strong>N°</strong> {{ $facture->numero ?? '—' }}</span>
                    @if (!empty($facture->statut))
                        <span class="m-badge">{{ $facture->statut }}</span>
                    @endif
                </div>
            </div>
        </header>

        @if ($facture->client ?? null)
        <section class="m-client-card">
            <div class="m-client-label">Facturé à</div>
            <div class="m-client-name">{{ $facture->client->name }}</div>
            <div class="m-client-details">
                @if ($facture->client->adresse ?? null) {{ $facture->client->adresse }}<br> @endif
                @if ($facture->client->phone_1 ?? null) Tél. {{ $facture->client->phone_1 }}<br> @endif
                @if ($facture->client->matricule ?? null) Matricule : {{ $facture->client->matricule }} @endif
            </div>
        </section>
        @endif

        <div class="m-table-section">
            <table class="m-table">
                <thead>
                    <tr>
                        <th style="width:4%">#</th>
                        <th style="width:30%">Produit</th>
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

        <div class="m-totals-wrap">
            <div class="m-totals-card">
                <div class="m-tot-row"><span>Total HT</span><span class="amt">{{ number_format((float)($facture->prix_ht ?? 0), 3, ',', ' ') }} TND</span></div>
                @if (!empty($facture->remise) && (float)$facture->remise > 0)
                <div class="m-tot-row"><span>Remise</span><span class="amt">− {{ number_format((float)$facture->remise, 3, ',', ' ') }} TND</span></div>
                @endif
                <div class="m-tot-row"><span>TVA</span><span class="amt">{{ number_format((float)($facture->tva ?? 0), 3, ',', ' ') }} TND</span></div>
                <div class="m-tot-row"><span>Timbre</span><span class="amt">{{ number_format((float)($facture->timbre ?? 0), 3, ',', ' ') }} TND</span></div>
                <div class="m-tot-row ttc"><span>Total TTC</span><span class="amt">{{ number_format((float)($facture->prix_ttc ?? 0), 3, ',', ' ') }} TND</span></div>
            </div>
        </div>

        <footer class="m-footer">
            @if ($coordonnee && !empty($coordonnee->note))
            <div class="m-note">
                <div class="m-note-label">Note</div>
                <div>{{ $coordonnee->note }} <span id="m-words"></span></div>
            </div>
            @endif
            <div class="m-signature">Signature et cachet</div>
            @if ($coordonnee && !empty($coordonnee->rib))
            <div class="m-rib">{{ $coordonnee->rib }}</div>
            @endif
        </footer>
    </div>

    <input type="hidden" id="m-totale" value="{{ $facture->prix_ttc ?? 0 }}">
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
        var w=document.getElementById('m-words'),t=document.getElementById('m-totale');
        if(w&&t) w.textContent=inWords(parseFloat(t.value)||0);
    })();
    </script>
</body>
</html>
