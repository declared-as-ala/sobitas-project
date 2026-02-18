<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture {{ $facture->numero ?? '' }}</title>
    <style>
        @page { size: A4; margin: 12mm; }
        .invoice-print { width: 210mm; min-height: 297mm; margin: 24px auto; padding: 12mm 15mm; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06); font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #1f2937; }
        @media print {
            body * { visibility: hidden; }
            .invoice-print, .invoice-print * { visibility: visible; }
            .invoice-print { position: absolute; left: 0; top: 0; width: 100% !important; max-width: none; min-height: auto; margin: 0; padding: 0; border: none; border-radius: 0; box-shadow: none; background: #fff; }
            .no-print { display: none !important; }
            .invoice-print table tr { break-inside: avoid; page-break-inside: avoid; }
            .invoice-print thead { display: table-header-group; }
        }
        .invoice-header { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; }
        .invoice-company { display: flex; flex-direction: column; gap: 8px; }
        .invoice-company .invoice-logo { max-width: 160px; max-height: 48px; object-fit: contain; }
        .invoice-company .invoice-company-name { font-size: 18px; font-weight: 700; color: #111827; }
        .invoice-company .invoice-meta { font-size: 12px; color: #6b7280; line-height: 1.5; }
        .invoice-title-block { text-align: right; }
        .invoice-title-block .invoice-title { font-size: 26px; font-weight: 700; letter-spacing: 0.02em; color: #111827; margin: 0 0 12px 0; }
        .invoice-title-block .invoice-meta-list { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #4b5563; }
        .invoice-title-block .invoice-meta-list strong { color: #374151; }
        .invoice-badge { display: inline-block; margin-top: 8px; padding: 4px 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; border-radius: 6px; background: #f3f4f6; color: #4b5563; }
        .invoice-client-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
        .invoice-client-card .invoice-client-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 8px; }
        .invoice-client-card .invoice-client-name { font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 8px; }
        .invoice-client-card .invoice-client-details { font-size: 12px; color: #4b5563; line-height: 1.6; }
        .invoice-table-wrap { margin-bottom: 24px; overflow-x: auto; }
        .invoice-print table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .invoice-print table thead th { background: #f3f4f6; color: #374151; font-weight: 600; text-align: left; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
        .invoice-print table thead th.text-right { text-align: right; }
        .invoice-print table tbody td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; }
        .invoice-print table tbody tr:nth-child(even) { background: #fafafa; }
        .invoice-print table tbody td.col-product { font-weight: 500; color: #111827; }
        .invoice-print table tbody td.text-right { text-align: right; font-variant-numeric: tabular-nums; }
        .invoice-totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
        .invoice-totals-card { width: 100%; max-width: 280px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; }
        .invoice-totals-card .invoice-totals-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 13px; color: #4b5563; }
        .invoice-totals-card .invoice-totals-row.invoice-totals-row-ttc { margin-top: 8px; padding-top: 12px; border-top: 2px solid #e5e7eb; font-size: 16px; font-weight: 700; color: #111827; }
        .invoice-totals-card .invoice-totals-row .amount { font-variant-numeric: tabular-nums; }
        .invoice-footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .invoice-footer .invoice-note { margin-bottom: 16px; padding: 12px; background: #f9fafb; border-radius: 8px; border-left: 3px solid #9ca3af; }
        .invoice-footer .invoice-note-label { font-weight: 600; color: #374151; margin-bottom: 4px; }
        .invoice-footer .invoice-signature-area { margin-top: 24px; padding-top: 12px; text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; text-decoration: underline; text-underline-offset: 4px; }
        .invoice-footer .invoice-rib { margin-top: 16px; font-size: 11px; color: #9ca3af; text-align: center; }
        @if (!request()->query('embed'))
        body { margin: 0; background: #f3f4f6; min-height: 100vh; }
        @endif
    </style>
</head>
<body>
    @php
        $coordonnee = $coordonnee ?? \App\Models\Coordinate::first();
        $qte = fn ($d) => $d->quantite ?? $d->qte ?? 0;
    @endphp

    {{-- Toolbar: hidden when printing and when embedded in iframe --}}
    @if (!request()->query('embed'))
    <div class="no-print" style="max-width: 210mm; margin: 12px auto 0; padding: 0 15mm; display: flex; justify-content: flex-end; gap: 8px;">
        <button type="button" onclick="window.print()" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; font-weight: 500; cursor: pointer;">
            Imprimer
        </button>
        <a href="{{ url()->previous() }}" style="padding: 8px 16px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; font-weight: 500; text-decoration: none; color: #374151;">
            Retour
        </a>
    </div>
    @endif

    <div id="invoice-print" class="invoice-print">
        {{-- A) Header: company left, FACTURE + meta right --}}
        <header class="invoice-header">
            <div class="invoice-company">
                @if ($coordonnee && $coordonnee->logo_facture)
                    <img src="{{ asset('storage/' . $coordonnee->logo_facture) }}" alt="" class="invoice-logo">
                @endif
                <div class="invoice-company-name">{{ $coordonnee->abbreviation ?? 'SOBITAS' }}</div>
                @if ($coordonnee)
                    <div class="invoice-meta">
                        @if ($coordonnee->email) {{ $coordonnee->email }}<br> @endif
                        @if ($coordonnee->adresse_fr) {{ $coordonnee->adresse_fr }}<br> @endif
                        @if ($coordonnee->phone_1)
                            Tél. {{ $coordonnee->phone_1 }}@if ($coordonnee->phone_2) / {{ $coordonnee->phone_2 }} @endif
                            <br>
                        @endif
                        @if ($coordonnee->registre_commerce ?? null) RC : {{ $coordonnee->registre_commerce }}<br> @endif
                        @if ($coordonnee->matricule ?? null) MF : {{ $coordonnee->matricule }} @endif
                    </div>
                @endif
            </div>
            <div class="invoice-title-block">
                <h1 class="invoice-title">FACTURE</h1>
                <div class="invoice-meta-list">
                    <span><strong>Date :</strong> {{ $facture->created_at?->format('d/m/Y') ?? '—' }}</span>
                    <span><strong>Numéro :</strong> {{ $facture->numero ?? '—' }}</span>
                    @if (!empty($facture->statut))
                        <span class="invoice-badge">{{ $facture->statut }}</span>
                    @endif
                </div>
            </div>
        </header>

        {{-- B) Client card --}}
        @if ($facture->client ?? null)
        <div class="invoice-client-card">
            <div class="invoice-client-label">Facturé à</div>
            <div class="invoice-client-name">{{ $facture->client->name }}</div>
            <div class="invoice-client-details">
                @if ($facture->client->adresse ?? null) {{ $facture->client->adresse }}<br> @endif
                @if ($facture->client->phone_1 ?? null) Tél. {{ $facture->client->phone_1 }}<br> @endif
                @if ($facture->client->matricule ?? null) Matricule : {{ $facture->client->matricule }} @endif
            </div>
        </div>
        @endif

        {{-- C) Products table --}}
        <div class="invoice-table-wrap">
            <table>
                <thead>
                    <tr>
                        <th style="width: 4%">#</th>
                        <th class="col-product" style="width: 38%">Produit</th>
                        <th class="text-right" style="width: 10%">Qté</th>
                        <th class="text-right" style="width: 14%">P.U. HT</th>
                        <th class="text-right" style="width: 10%">TVA</th>
                        <th class="text-right" style="width: 14%">Total HT</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($details_facture ?? [] as $i => $details)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td class="col-product">{{ $details->product->designation_fr ?? '—' }}</td>
                        <td class="text-right">{{ $qte($details) }}</td>
                        <td class="text-right">{{ number_format((float) ($details->prix_unitaire ?? 0), 3, ',', ' ') }}</td>
                        <td class="text-right">{{ $details->tva ?? 0 }} %</td>
                        <td class="text-right">{{ number_format((float) ($details->prix_ht ?? ($qte($details) * ($details->prix_unitaire ?? 0))), 3, ',', ' ') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        {{-- D) Totals summary --}}
        <div class="invoice-totals">
            <div class="invoice-totals-card">
                <div class="invoice-totals-row">
                    <span>Total HT</span>
                    <span class="amount">{{ number_format((float) ($facture->prix_ht ?? 0), 3, ',', ' ') }} TND</span>
                </div>
                @if (!empty($facture->remise) && (float) $facture->remise > 0)
                <div class="invoice-totals-row">
                    <span>Remise</span>
                    <span class="amount">− {{ number_format((float) $facture->remise, 3, ',', ' ') }} TND</span>
                </div>
                @endif
                <div class="invoice-totals-row">
                    <span>TVA</span>
                    <span class="amount">{{ number_format((float) ($facture->tva ?? 0), 3, ',', ' ') }} TND</span>
                </div>
                <div class="invoice-totals-row">
                    <span>Timbre</span>
                    <span class="amount">{{ number_format((float) ($facture->timbre ?? 0), 3, ',', ' ') }} TND</span>
                </div>
                <div class="invoice-totals-row invoice-totals-row-ttc">
                    <span>Total TTC</span>
                    <span class="amount">{{ number_format((float) ($facture->prix_ttc ?? 0), 3, ',', ' ') }} TND</span>
                </div>
            </div>
        </div>

        {{-- E) Footer: note, signature, optional RIB --}}
        <footer class="invoice-footer">
            @if ($coordonnee && !empty($coordonnee->note))
            <div class="invoice-note">
                <div class="invoice-note-label">Note</div>
                <div>{{ $coordonnee->note }} <span id="invoice-words"></span></div>
            </div>
            @endif
            <div class="invoice-signature-area">Signature et cachet</div>
            @if ($coordonnee && !empty($coordonnee->rib))
            <div class="invoice-rib">{{ $coordonnee->rib }}</div>
            @endif
        </footer>
    </div>

    {{-- Amount in letters (optional) --}}
    <input type="hidden" id="invoice-totale" value="{{ $facture->prix_ttc ?? 0 }}">
    <script>
        (function() {
            var a = ['', 'un ', 'deux ', 'trois ', 'quatre ', 'cinq ', 'six ', 'sept ', 'huit ', 'neuf ', 'dix ', 'onze ', 'douze ', 'treize ', 'quatorze ', 'quinze ', 'seize ', 'dix-sept ', 'dix-huit ', 'dix-neuf '];
            var b = ['', '', 'vingt ', 'trente ', 'quarante ', 'cinquante ', 'soixante ', 'soixante-dix ', 'quatre-vingt ', 'quatre-vingt-dix '];
            function inWords(num) {
                var tab = (num + '').split('.');
                if ((num + '').length > 9) return 'overflow';
                var n = ('000000000' + (tab[0] || '0')).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
                if (!n) return '';
                var str = '';
                str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' ' : '';
                str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' ' : '';
                str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'mille ' : '';
                str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'cent ' : '';
                str += (n[5] != 0) ? ((str ? ' ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'dinars ') : ' dinars';
                if (tab.length > 1 && tab[1]) {
                    var nb = tab[1];
                    if (nb.length === 1) nb = nb * 100; else if (nb.length === 2) nb = nb * 10;
                    str += ' et ' + nb + ' millimes';
                }
                return str;
            }
            var el = document.getElementById('invoice-words');
            var tot = document.getElementById('invoice-totale');
            if (el && tot) el.textContent = inWords(parseFloat(tot.value) || 0);
        })();
    </script>
</body>
</html>
