<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" rel="stylesheet">
    <title>Facture {{ $facture->numero ?? '' }}</title>
</head>
<body @if(!empty($forPdf)) class="is-pdf-print" @endif>
@php
    $coordonnee = $coordonnee ?? $company ?? null;
    $logoUrl = null;
    $staticLogoPath = resource_path('views/print/logo_print.png');
    if (is_file($staticLogoPath)) {
        $mime = @mime_content_type($staticLogoPath) ?: 'image/png';
        $logoUrl = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($staticLogoPath));
    }
    if (! isset($calcTotals) && isset($facture, $details_facture)) {
        $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float) $coordonnee->tva : 19;
        $calcTotals = \App\Services\InvoiceCalculator::calculate(
            $details_facture->toArray(),
            (float) ($facture->remise ?? 0),
            (float) ($facture->timbre ?? 0),
            $defaultTva
        );
    }
    $ct = $calcTotals ?? [];
    $footerTotalHt = $ct['total_ht_brut'] ?? (float) ($facture->prix_ht ?? 0);
    $footerRemise = $ct['remise'] ?? (float) ($facture->remise ?? 0);
    $footerTva = $ct['tva'] ?? (float) ($facture->tva ?? 0);
    $footerTimbre = $ct['timbre'] ?? (float) ($facture->timbre ?? 0);
    $footerTtc = $ct['net_a_payer'] ?? (float) ($facture->prix_ttc ?? $facture->net_a_payer ?? 0);
    $tvaRateLabel = (float) ($coordonnee->tva ?? 19);
    $tvaRateDisplay = ($tvaRateLabel == floor($tvaRateLabel)) ? (string) (int) $tvaRateLabel : (string) $tvaRateLabel;
    $dateStr = $documentDate
        ?? ($facture->date_facture
            ? \Carbon\Carbon::parse($facture->date_facture)->format('d-m-Y')
            : ($facture->created_at?->format('d-m-Y') ?? ''));
@endphp

<style>
    html {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 11pt;
        color: #1a1a1a;
        background: #fff;
    }
    #invoice { padding: 24px 28px 32px; max-width: 900px; margin: 0 auto; }
    .inv-toolbar { text-align: right; margin-bottom: 12px; }
    .btn-inv {
        display: inline-block;
        background: #2563eb;
        color: #fff !important;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        font-size: 10pt;
        font-weight: 600;
        text-decoration: none;
        margin-left: 8px;
    }
    .btn-inv--muted { background: #64748b; }

    .inv-header {
        display: table;
        width: 100%;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 3px solid #ff4000;
    }
    .inv-header__brand { display: table-cell; vertical-align: top; width: 58%; }
    .inv-header__meta { display: table-cell; vertical-align: top; width: 42%; text-align: right; }
    .inv-header__meta h1 {
        margin: 0 0 8px;
        font-size: 26pt;
        font-weight: 800;
        letter-spacing: 0.04em;
        color: #0f172a;
    }
    .inv-header__meta .inv-meta-line { font-size: 10.5pt; color: #334155; line-height: 1.6; }
    .inv-co-name { font-size: 13pt; font-weight: 700; margin: 8px 0 6px; color: #0f172a; }
    .inv-co-line { font-size: 9.5pt; color: #475569; line-height: 1.55; }

    .inv-client {
        margin: 18px 0 16px;
        padding: 12px 14px;
        background: #f8fafc;
        border-radius: 6px;
        border-left: 4px solid #ff4000;
    }
    .inv-client h2 {
        margin: 0 0 10px;
        font-size: 9pt;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
    }
    .inv-client p { margin: 0 0 4px; font-size: 10pt; color: #334155; }

    /* Lines table: single clean grid, no floating lines */
    .inv-table-wrap {
        width: 100%;
        margin: 0 0 0;
        overflow: visible;
    }
    table.inv-lines {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
        table-layout: fixed;
        font-size: 10pt;
        border: 1px solid #e2e8f0;
    }
    table.inv-lines thead th {
        background: #ff4000 !important;
        background-color: #ff4000 !important;
        color: #fff !important;
        font-weight: 700;
        font-size: 8.5pt;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 10px 10px;
        text-align: left;
        border: 1px solid #ff4000;
        vertical-align: middle;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    table.inv-lines thead th.inv-col-num { width: 5%; text-align: center; }
    table.inv-lines thead th.inv-col-prod { width: 34%; }
    table.inv-lines thead th.inv-col-numcell { width: 11%; text-align: right; }
    table.inv-lines tbody td {
        padding: 9px 10px;
        border: 1px solid #e2e8f0;
        vertical-align: middle;
        background: #fff;
    }
    table.inv-lines tbody tr:nth-child(even) td { background: #f8fafc; }
    table.inv-lines .inv-td-num { text-align: center; color: #64748b; font-weight: 600; }
    table.inv-lines .inv-td-prod { text-align: left; font-weight: 600; color: #0f172a; word-wrap: break-word; }
    table.inv-lines .inv-td-right { text-align: right; font-variant-numeric: tabular-nums; }

    /* Totals: separate block, full width alignment */
    .inv-totals-wrap {
        width: 100%;
        margin-top: 14px;
        margin-bottom: 8px;
    }
    table.inv-totals {
        width: 100%;
        max-width: 340px;
        margin-left: auto;
        border-collapse: collapse;
        font-size: 10.5pt;
    }
    table.inv-totals td {
        padding: 6px 0 6px 12px;
        border: none;
        vertical-align: middle;
    }
    table.inv-totals td:first-child {
        text-align: left;
        color: #475569;
        font-weight: 500;
        padding-left: 0;
        white-space: nowrap;
    }
    table.inv-totals td:last-child {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        color: #0f172a;
        width: 38%;
    }
    table.inv-totals tr.inv-totals__grand td {
        padding-top: 12px;
        padding-bottom: 10px;
        border-top: 2px solid #0f172a;
        font-size: 12pt;
        font-weight: 800;
        color: #0f172a;
    }
    table.inv-totals tr.inv-totals__grand td:first-child {
        color: #0f172a;
        font-weight: 800;
    }
    table.inv-totals tr.inv-totals__grand td:last-child {
        background: #fff7ed !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        padding-left: 12px;
        padding-right: 12px;
        border-radius: 4px;
    }

    .inv-note {
        margin: 18px 0 12px;
        padding: 10px 12px 10px 14px;
        border-left: 4px solid #ff4000;
        background: #fffbeb;
        font-size: 10pt;
        color: #334155;
        line-height: 1.45;
    }
    .inv-note strong { color: #c2410c; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.05em; }
    .inv-signature {
        margin: 16px 0 8px;
        padding-left: 140px;
        font-size: 10pt;
        font-weight: 600;
        text-decoration: underline;
        color: #0f172a;
    }

    .hide_print { display: initial; }
    @media print {
        html, body, table.inv-lines thead th, table.inv-totals tr.inv-totals__grand td:last-child {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .hide_print { display: none !important; }
        #invoice { padding: 0; max-width: none; }
        .inv-toolbar { display: none; }
        body { background: #fff; }
    }

    @include('print.partials.footer-rib-numero-styles', ['forPdf' => $forPdf ?? null])
</style>

<div class="page-content">
    <div id="invoice">
        @if (empty($forPdf))
        <div class="inv-toolbar hide_print">
            <button type="button" class="btn-inv" onclick="window.print()">Imprimer</button>
            <a class="btn-inv btn-inv--muted" href="{{ $backUrl ?? url()->previous() }}">Retour</a>
        </div>
        @endif

        <div class="invoice overflow-auto">
            <div style="min-width: 600px">
                <header class="inv-header">
                    <div class="inv-header__brand">
                        @if ($logoUrl)
                            <img src="{{ $logoUrl }}" alt="" style="max-width: 200px; height: auto; display: block; margin-bottom: 8px;">
                        @endif
                        <div class="inv-co-name">{{ $coordonnee->abbreviation ?? '' }}</div>
                        <div class="inv-co-line"><b>Email :</b> {{ $coordonnee->email ?? '' }}</div>
                        <div class="inv-co-line"><b>Adresse :</b> {{ $coordonnee->adresse_fr ?? '' }}</div>
                        <div class="inv-co-line"><b>Tél :</b> {{ $coordonnee->phone_1 ?? '' }}@if (!empty($coordonnee->phone_2)) / {{ $coordonnee->phone_2 }}@endif</div>
                        @if (!empty($coordonnee->registre_commerce))
                            <div class="inv-co-line"><b>RC :</b> {{ $coordonnee->registre_commerce }}</div>
                        @endif
                        @if (!empty($coordonnee->matricule))
                            <div class="inv-co-line"><b>MF :</b> {{ $coordonnee->matricule }}</div>
                        @endif
                    </div>
                    <div class="inv-header__meta">
                        <h1>FACTURE</h1>
                        <div class="inv-meta-line"><b>Date :</b> {{ $dateStr }}</div>
                        <div class="inv-meta-line"><b>Numéro :</b> {{ $facture->numero }}</div>
                    </div>
                </header>

                <main>
                    @php $printClient = $client ?? $facture->client ?? null; @endphp
                    @if ($printClient)
                        <section class="inv-client">
                            <h2>Informations du client</h2>
                            <p><b>Nom :</b> {{ $printClient->name }}</p>
                            <p><b>Adresse :</b> {{ $printClient->adresse }}</p>
                            @if (filled($printClient->matricule))
                                <p><b>Matricule :</b> {{ $printClient->matricule }}</p>
                            @endif
                            <p><b>Numéro de téléphone :</b> {{ $printClient->phone_1 }}</p>
                        </section>
                    @endif

                    <div class="inv-table-wrap">
                        <table class="inv-lines">
                            <thead>
                                <tr>
                                    <th class="inv-col-num">#</th>
                                    <th class="inv-col-prod">Produit</th>
                                    <th class="inv-col-numcell">Qté</th>
                                    <th class="inv-col-numcell">P.U. HT</th>
                                    <th class="inv-col-numcell">TVA</th>
                                    <th class="inv-col-numcell">Total HT</th>
                                </tr>
                            </thead>
                            <tbody>
                                @php $i = 1; @endphp
                                @if (!empty($invoice_rows))
                                    @foreach ($invoice_rows as $row)
                                        <tr>
                                            <td class="inv-td-num">{{ $row['index'] }}</td>
                                            <td class="inv-td-prod">{{ $row['produit'] }}</td>
                                            <td class="inv-td-right">{{ $row['qte'] }}</td>
                                            <td class="inv-td-right">{{ number_format($row['pu_ht'], 3, '.', '') }}</td>
                                            <td class="inv-td-right">{{ $row['tva_pct'] }} %</td>
                                            <td class="inv-td-right">{{ number_format($row['total_ht'], 3, '.', '') }}</td>
                                        </tr>
                                        @php $i++; @endphp
                                    @endforeach
                                @else
                                    @foreach ($details_facture ?? [] as $details)
                                        @php
                                            $q = (int) ($details->qte ?? $details->quantite ?? 0);
                                            $pu = (float) ($details->prix_unitaire ?? 0);
                                            $tp = (float) ($details->tva ?? ($coordonnee->tva ?? 19));
                                            $th = round($q * $pu, 3);
                                        @endphp
                                        <tr>
                                            <td class="inv-td-num">{{ $i }}</td>
                                            <td class="inv-td-prod">{{ $details->product->designation_fr ?? '—' }}</td>
                                            <td class="inv-td-right">{{ $q }}</td>
                                            <td class="inv-td-right">{{ number_format($pu, 3, '.', '') }}</td>
                                            <td class="inv-td-right">{{ $tp }} %</td>
                                            <td class="inv-td-right">{{ number_format($th, 3, '.', '') }}</td>
                                        </tr>
                                        @php $i++; @endphp
                                    @endforeach
                                @endif
                            </tbody>
                        </table>
                    </div>

                    <div class="inv-totals-wrap">
                        <table class="inv-totals">
                            <tr>
                                <td>Total HT</td>
                                <td>{{ number_format($footerTotalHt, 3, '.', '') }}</td>
                            </tr>
                            @if ($footerRemise > 0)
                                <tr>
                                    <td>Remise</td>
                                    <td>{{ number_format($footerRemise, 3, '.', '') }}</td>
                                </tr>
                            @endif
                            <tr>
                                <td>TVA ({{ $tvaRateDisplay }} %)</td>
                                <td>{{ number_format($footerTva, 3, '.', '') }}</td>
                            </tr>
                            <tr>
                                <td>Timbre</td>
                                <td>{{ number_format($footerTimbre, 3, '.', '') }}</td>
                            </tr>
                            <tr class="inv-totals__grand">
                                <td>TOTAL TTC (Net à payer)</td>
                                <td>{{ number_format($footerTtc, 3, '.', '') }}</td>
                            </tr>
                        </table>
                    </div>

                    <input type="hidden" id="totale" value="{{ $footerTtc }}">
                    @if (!empty($coordonnee->note))
                        <div class="inv-note">
                            <strong>Note</strong><br>
                            {{ $coordonnee->note }}<span id="words"></span>
                        </div>
                    @endif
                    <div class="inv-signature">Signature et cachet</div>
                </main>
                @include('print.partials.footer-rib-numero', ['documentNumero' => $facture->numero ?? ''])
            </div>
            <div></div>
        </div>
    </div>
</div>

<script>
(function () {
    var el = document.getElementById('totale');
    var words = document.getElementById('words');
    if (!el || !words) return;
    var a = ['', 'un ', 'deux', 'trois ', 'quatre ', 'cinq ', 'six ', 'sept ', 'huit ', 'neuf ', 'dix ', 'onze ',
        'douze ', 'treize ', 'quatorze ', 'quinze ', 'seize ', 'dix-sept ', 'dix-huit ', 'dix-neuf '];
    var b = ['', '', 'vingt', 'trante', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    words.innerHTML = inWords(el.value);
    function inWords(num) {
        num = parseFloat(num);
        if (isNaN(num)) return '';
        var tab = num.toString().split('.');
        if ((num = num.toString()).length > 9) return '';
        var n = ('000000000' + tab[0]).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';
        var str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'milles ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'cents ' : '';
        str += (n[5] != 0) ? ((str !== '') ? ' ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'dinars ' : '';
        if (tab.length > 1) {
            var nb = tab[1];
            if (nb < 10) nb = nb * 100; else if (nb < 100) nb = nb * 10;
            return str + ' et ' + nb + ' millimes';
        }
        return str;
    }
})();
</script>
</body>
</html>
