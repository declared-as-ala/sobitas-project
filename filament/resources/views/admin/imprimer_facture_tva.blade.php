<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture TVA {{ $facture->numero ?? '' }}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #1e293b;
            background: #f8fafc;
            padding: 24px;
        }
        .print-document {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,.08);
            overflow: hidden;
        }
        .toolbar {
            padding: 12px 20px;
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
        }
        .toolbar.hide_print { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
        @media print {
            body { background: #fff; padding: 0; }
            .toolbar.hide_print { display: none !important; }
            .print-document { box-shadow: none; border-radius: 0; }
        }
        .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            padding: 24px 28px;
            border-bottom: 2px solid #0ea5e9;
            background: linear-gradient(to bottom, #f0f9ff 0%, #fff 100%);
        }
        .company h1 { margin: 0 0 8px 0; font-size: 1.5rem; font-weight: 700; color: #0c4a6e; }
        .company p { margin: 2px 0; font-size: 13px; color: #475569; }
        .invoice-meta { text-align: right; }
        .invoice-meta .doc-title { font-size: 1.35rem; font-weight: 700; color: #0c4a6e; margin: 0 0 12px 0; }
        .invoice-meta .meta-line { margin: 4px 0; font-size: 13px; color: #475569; }
        .content { padding: 24px 28px; }
        .client-block {
            margin-bottom: 24px;
            padding: 16px 20px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #0ea5e9;
        }
        .client-block h3 { margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
        .client-block p { margin: 4px 0; font-size: 14px; }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        thead th {
            background: #0ea5e9;
            color: #fff;
            font-weight: 600;
            text-align: left;
            padding: 12px 14px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        thead th:last-child,
        thead th:nth-child(n+3) { text-align: right; }
        tbody tr { border-bottom: 1px solid #e2e8f0; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tbody td { padding: 12px 14px; }
        tbody td:nth-child(n+3) { text-align: right; font-variant-numeric: tabular-nums; }
        tfoot tr { border-top: 2px solid #e2e8f0; }
        tfoot td, tfoot th { padding: 10px 14px; text-align: right; font-variant-numeric: tabular-nums; }
        tfoot th { font-weight: 600; color: #475569; }
        tfoot tr:last-child th, tfoot tr:last-child td { font-size: 1.05rem; font-weight: 700; color: #0c4a6e; padding-top: 14px; }
        .notes {
            margin-top: 24px;
            padding: 14px 18px;
            background: #f0f9ff;
            border-radius: 8px;
            border-left: 4px solid #0ea5e9;
            font-size: 13px;
            color: #475569;
        }
        .signature { margin-top: 32px; padding-top: 16px; font-size: 12px; color: #94a3b8; text-decoration: underline; }
        footer.doc-footer { padding: 16px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; }
        .btn-primary { background: #0ea5e9; color: #fff; }
        .btn-secondary { background: #e2e8f0; color: #475569; }
    </style>
</head>
<body>
    @php $coordonnee = \App\Models\Coordinate::first(); @endphp

    <div class="print-document">
        <div class="toolbar hide_print">
            <button type="button" class="btn btn-primary" onclick="window.print()">Imprimer</button>
            <a href="javascript:window.close()" class="btn btn-secondary">Fermer</a>
        </div>

        <div class="header-row">
            <div class="company">
                @if ($coordonnee && $coordonnee->logo_facture)
                    <img src="{{ asset('storage/' . $coordonnee->logo_facture) }}" alt="" style="max-width: 180px; height: auto; margin-bottom: 10px;" />
                @endif
                <h1>{{ $coordonnee->abbreviation ?? 'SOBITAS' }}</h1>
                @if ($coordonnee)
                    @if ($coordonnee->email)<p>{{ $coordonnee->email }}</p>@endif
                    @if ($coordonnee->adresse_fr)<p>{{ $coordonnee->adresse_fr }}</p>@endif
                    @if ($coordonnee->phone_1)<p>{{ $coordonnee->phone_1 }} @if ($coordonnee->phone_2) / {{ $coordonnee->phone_2 }}@endif</p>@endif
                    @if ($coordonnee->registre_commerce ?? null)<p>RC : {{ $coordonnee->registre_commerce }}</p>@endif
                    @if ($coordonnee->matricule ?? null)<p>MF : {{ $coordonnee->matricule }}</p>@endif
                @endif
            </div>
            <div class="invoice-meta">
                <h2 class="doc-title">Facture TVA</h2>
                <p class="meta-line"><strong>Date :</strong> {{ $facture->created_at->format('d/m/Y') }}</p>
                <p class="meta-line"><strong>N° :</strong> {{ $facture->numero }}</p>
            </div>
        </div>

        <div class="content">
            @if ($facture->client ?? null)
                <div class="client-block">
                    <h3>Client</h3>
                    <p><strong>{{ $facture->client->name }}</strong></p>
                    @if ($facture->client->adresse ?? null)<p>{{ $facture->client->adresse }}</p>@endif
                    @if ($facture->client->matricule ?? null)<p>Matricule : {{ $facture->client->matricule }}</p>@endif
                    @if ($facture->client->phone_1 ?? null)<p>Tél : {{ $facture->client->phone_1 }}</p>@endif
                </div>
            @endif

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Produit</th>
                        <th>Qté</th>
                        <th>P.U. HT</th>
                        <th>TVA</th>
                        <th>Total HT</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($details_facture ?? [] as $i => $details)
                        <tr>
                            <td>{{ $i + 1 }}</td>
                            <td>{{ $details->product->designation_fr ?? '—' }}</td>
                            <td>{{ $details->qte }}</td>
                            <td>{{ number_format((float) ($details->prix_unitaire ?? 0), 3, ',', ' ') }}</td>
                            <td>{{ $details->tva ?? 0 }} %</td>
                            <td>{{ number_format((float) ($details->prix_ht ?? 0), 3, ',', ' ') }}</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr><td colspan="6"></td></tr>
                    <tr>
                        <td colspan="2"></td>
                        <th colspan="3">Total HT</th>
                        <th>{{ number_format((float) ($facture->prix_ht ?? 0), 3, ',', ' ') }}</th>
                    </tr>
                    @if ($facture->remise ?? 0)
                        <tr>
                            <td colspan="2"></td>
                            <th colspan="3">Remise</th>
                            <th>{{ number_format((float) $facture->remise, 3, ',', ' ') }}</th>
                        </tr>
                    @endif
                    <tr>
                        <td colspan="2"></td>
                        <th colspan="3">TVA</th>
                        <th>{{ number_format((float) ($facture->tva ?? 0), 3, ',', ' ') }}</th>
                    </tr>
                    <tr>
                        <td colspan="2"></td>
                        <th colspan="3">Timbre</th>
                        <th>{{ number_format((float) ($facture->timbre ?? 0), 3, ',', ' ') }}</th>
                    </tr>
                    <tr>
                        <td colspan="2"></td>
                        <th colspan="3">Total TTC</th>
                        <th>{{ number_format((float) ($facture->prix_ttc ?? 0), 3, ',', ' ') }}</th>
                    </tr>
                </tfoot>
            </table>

            @if ($coordonnee && ($coordonnee->note ?? null))
                <div class="notes">
                    <strong>Note :</strong> {{ $coordonnee->note }}
                    @if ($facture->prix_ttc ?? null)
                        <span id="words"></span>
                    @endif
                </div>
            @endif
            <div class="signature">Signature et cachet</div>
        </div>

        @if ($coordonnee && ($coordonnee->rib ?? null))
            <footer class="doc-footer">{{ $coordonnee->rib }}</footer>
        @endif
    </div>

    @if ($facture->prix_ttc ?? null)
        <input type="hidden" id="totale" value="{{ $facture->prix_ttc }}">
        <script>
            var a = ['', 'un ', 'deux', 'trois ', 'quatre ', 'cinq ', 'six ', 'sept ', 'huit ', 'neuf ', 'dix ', 'onze ', 'douze ', 'treize ', 'quatorze ', 'quinze ', 'seize ', 'dix-sept ', 'dix-huit ', 'dix-neuf '];
            var b = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
            var totaleEl = document.getElementById('totale');
            var wordsEl = document.getElementById('words');
            if (totaleEl && wordsEl) wordsEl.innerHTML = ' — ' + (function inWords(num) {
                var tab = (num + '').split('.'), n = ('000000000' + (tab[0] || '0')).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d)(\d{2})$/);
                if (!n) return '';
                var str = (n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' ' : '') + (n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' ' : '') + (n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'milles ' : '') + (n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'cents ' : '') + (n[5] != 0 ? (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'dinars' : '');
                return (tab[1] ? str + ' et ' + (tab[1].length === 1 ? tab[1] + '00' : (tab[1].length === 2 ? tab[1] + '0' : tab[1].slice(0,3))) + ' millimes' : str);
            }(totaleEl.value));
        </script>
    @endif
</body>
</html>
