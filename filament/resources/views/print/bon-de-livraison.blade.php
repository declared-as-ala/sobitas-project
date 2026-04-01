<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" rel="stylesheet">
    <title>Bon de livraison {{ $facture->numero ?? $facture->id }}</title>
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
    $client = $client ?? $facture->client;
    $clientAddress = trim((string) ($facture->formatted_delivery_address ?? '')) !== ''
        ? $facture->formatted_delivery_address
        : ($client?->adresse ?? '');
    $frais = (float) ($calc_frais ?? $facture->frais_livraison ?? 0);
    $netAPayer = (float) ($calc_net_a_payer ?? max((float) ($facture->prix_ttc ?? 0) - (float) ($facture->timbre ?? 0), 0));
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

    .bl-toolbar { text-align: right; margin-bottom: 10px; }
    .bl-btn {
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
    .bl-btn--muted { background: #64748b; }

    .bl-header {
        display: table;
        width: 100%;
        margin-bottom: 16px;
        padding-bottom: 14px;
        border-bottom: 3px solid #ff4000;
    }
    .bl-header__brand { display: table-cell; vertical-align: top; width: 58%; }
    .bl-header__meta { display: table-cell; vertical-align: top; width: 42%; text-align: right; }
    .bl-header__meta h1 {
        margin: 0 0 8px;
        font-size: 22pt;
        font-weight: 800;
        letter-spacing: 0.03em;
        color: #0f172a;
        text-transform: uppercase;
    }
    .bl-header__meta .bl-meta-line { font-size: 10.5pt; color: #334155; line-height: 1.6; }
    .bl-co-name { font-size: 13pt; font-weight: 700; margin: 8px 0 6px; color: #0f172a; }
    .bl-co-line { font-size: 9.5pt; color: #475569; line-height: 1.55; }

    .bl-client {
        margin: 14px 0 12px;
        padding: 10px 12px;
        background: #f8fafc;
        border-radius: 6px;
        border-left: 4px solid #ff4000;
    }
    .bl-client h2 {
        margin: 0 0 8px;
        font-size: 9pt;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
    }
    .bl-client p { margin: 0 0 4px; font-size: 10pt; color: #334155; }

    /* Lines: single table, full grid — no tfoot colspan bugs */
    .bl-table-wrap { width: 100%; margin: 0 0 0; }
    table.bl-lines {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
        table-layout: fixed;
        font-size: 10pt;
        border: 1px solid #e2e8f0;
    }
    table.bl-lines thead th {
        background: #ff4000 !important;
        background-color: #ff4000 !important;
        color: #fff !important;
        font-weight: 700;
        font-size: 8.5pt;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 10px 10px;
        text-align: left;
        border: 1px solid #ff4000;
        vertical-align: middle;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    table.bl-lines thead th.bl-col-num { width: 6%; text-align: center; }
    table.bl-lines thead th.bl-col-prod { width: 38%; }
    table.bl-lines thead th.bl-col-numcell { width: 14%; text-align: right; }
    table.bl-lines tbody td {
        padding: 9px 10px;
        border: 1px solid #e2e8f0;
        vertical-align: middle;
        background: #fff;
    }
    table.bl-lines tbody tr:nth-child(even) td { background: #f8fafc; }
    table.bl-lines .bl-td-num { text-align: center; color: #64748b; font-weight: 600; }
    table.bl-lines .bl-td-prod { text-align: left; font-weight: 600; color: #0f172a; word-wrap: break-word; }
    table.bl-lines .bl-td-right { text-align: right; font-variant-numeric: tabular-nums; }

    /* Totals: delivery note — HT, remise, %, frais, montant à payer (no TTC invoice branding) */
    .bl-totals-wrap { width: 100%; margin-top: 12px; margin-bottom: 6px; }
    table.bl-totals {
        width: 100%;
        max-width: 360px;
        margin-left: auto;
        border-collapse: collapse;
        font-size: 10.5pt;
    }
    table.bl-totals td {
        padding: 5px 0 5px 8px;
        border: none;
        vertical-align: middle;
    }
    table.bl-totals td:first-child {
        text-align: left;
        color: #475569;
        font-weight: 500;
    }
    table.bl-totals td:last-child {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        color: #0f172a;
        width: 42%;
    }
    table.bl-totals tr.bl-totals__grand td {
        padding-top: 10px;
        padding-bottom: 8px;
        border-top: 2px solid #0f172a;
        font-size: 12pt;
        font-weight: 800;
        color: #0f172a;
    }
    table.bl-totals tr.bl-totals__grand td:first-child { font-weight: 800; color: #0f172a; }
    table.bl-totals tr.bl-totals__grand td:last-child {
        background: #fff7ed !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        padding-left: 12px;
        padding-right: 12px;
        border-radius: 4px;
    }

    .bl-note {
        margin: 14px 0 10px;
        padding: 10px 12px 10px 14px;
        border-left: 4px solid #ff4000;
        background: #fffbeb;
        font-size: 10pt;
        color: #334155;
        line-height: 1.45;
    }
    .bl-note strong { color: #c2410c; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.05em; }
    .bl-signature {
        margin: 12px 0 6px;
        padding-left: 140px;
        font-size: 10pt;
        font-weight: 600;
        text-decoration: underline;
        color: #0f172a;
    }

    .hide_print { display: initial; }
    @media print {
        html, body, table.bl-lines thead th, table.bl-totals tr.bl-totals__grand td:last-child {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .hide_print { display: none !important; }
        #invoice { padding: 0; max-width: none; }
        .bl-toolbar { display: none; }
        body { background: #fff; }
    }

    @include('print.partials.footer-rib-numero-styles', ['forPdf' => $forPdf ?? null])
</style>

<div class="page-content">
    <div id="invoice">
        @if (empty($forPdf))
        <div class="bl-toolbar hide_print">
            <button type="button" class="bl-btn" onclick="window.print()">Imprimer</button>
            <a class="bl-btn bl-btn--muted" href="{{ $backUrl ?? url()->previous() }}">Retour</a>
        </div>
        @endif

        <div class="invoice overflow-auto">
            <div style="min-width: 600px">
                <header class="bl-header">
                    <div class="bl-header__brand">
                        @if ($logoUrl)
                            <img src="{{ $logoUrl }}" alt="" style="max-width: 200px; height: auto; display: block; margin-bottom: 8px;">
                        @endif
                        <div class="bl-co-name">{{ $coordonnee->abbreviation ?? '' }}</div>
                        <div class="bl-co-line"><b>Email :</b> {{ $coordonnee->email ?? '' }}</div>
                        <div class="bl-co-line"><b>Adresse :</b> {{ $coordonnee->adresse_fr ?? '' }}</div>
                        <div class="bl-co-line"><b>Tél :</b> {{ $coordonnee->phone_1 ?? '' }}@if (!empty($coordonnee->phone_2)) / {{ $coordonnee->phone_2 }}@endif</div>
                        @if (!empty($coordonnee->registre_commerce))
                            <div class="bl-co-line"><b>RC :</b> {{ $coordonnee->registre_commerce }}</div>
                        @endif
                        @if (!empty($coordonnee->matricule))
                            <div class="bl-co-line"><b>MF :</b> {{ $coordonnee->matricule }}</div>
                        @endif
                    </div>
                    <div class="bl-header__meta">
                        <h1>Bon de livraison</h1>
                        <div class="bl-meta-line"><b>Date :</b> {{ $documentDate ?? $facture->created_at?->format('d-m-Y') }}</div>
                        <div class="bl-meta-line"><b>Numéro :</b> {{ $facture->numero }}</div>
                    </div>
                </header>

                <main>
                    @if ($client)
                        <section class="bl-client">
                            <h2>Informations du client</h2>
                            <p><b>Nom :</b> {{ $client->name }}</p>
                            <p><b>Adresse :</b> {{ $clientAddress }}</p>
                            @if (!empty($client->matricule))
                                <p><b>Matricule :</b> {{ $client->matricule }}</p>
                            @endif
                            <p><b>Numéro de téléphone :</b> {{ $client->phone_1 }}</p>
                        </section>
                    @endif

                    <div class="bl-table-wrap">
                        <table class="bl-lines">
                            <thead>
                                <tr>
                                    <th class="bl-col-num">#</th>
                                    <th class="bl-col-prod">Produit</th>
                                    <th class="bl-col-numcell">Quantité</th>
                                    <th class="bl-col-numcell">Prix U</th>
                                    <th class="bl-col-numcell">Prix total</th>
                                </tr>
                            </thead>
                            <tbody>
                                @php $i = 1; @endphp
                                @foreach ($details_facture as $details)
                                    @php
                                        $qte = (float) ($details->qte ?? $details->quantite ?? 0);
                                        $pu = (float) ($details->prix_unitaire ?? 0);
                                        $lineTotal = isset($details->prix_ttc) ? (float) $details->prix_ttc : $qte * $pu;
                                    @endphp
                                    <tr>
                                        <td class="bl-td-num">{{ $i }}</td>
                                        <td class="bl-td-prod">{{ $details->product->designation_fr ?? '—' }}</td>
                                        <td class="bl-td-right">{{ $details->qte ?? $details->quantite }}</td>
                                        <td class="bl-td-right">{{ number_format($pu, 3, '.', '') }}</td>
                                        <td class="bl-td-right">{{ number_format($lineTotal, 3, '.', '') }}</td>
                                    </tr>
                                    @php $i++; @endphp
                                @endforeach
                            </tbody>
                        </table>
                    </div>

                    <div class="bl-totals-wrap">
                        <table class="bl-totals">
                            <tr>
                                <td>Montant total HT</td>
                                <td>{{ number_format((float) ($calc_total_ht ?? $facture->prix_ht ?? 0), 3, '.', '') }}</td>
                            </tr>
                            <tr>
                                <td>Remise</td>
                                <td>{{ number_format((float) ($calc_remise ?? $facture->remise ?? 0), 3, '.', '') }}</td>
                            </tr>
                            <tr>
                                <td>Pourcentage remise %</td>
                                <td>{{ number_format((float) ($calc_pourcentage_remise ?? $facture->pourcentage_remise ?? 0), 1, '.', '') }} %</td>
                            </tr>
                            @if ($frais > 0)
                                <tr>
                                    <td>Frais livraison</td>
                                    <td>{{ number_format($frais, 3, '.', '') }}</td>
                                </tr>
                            @endif
                            <tr class="bl-totals__grand">
                                <td>Montant total à payer</td>
                                <td>{{ number_format($netAPayer, 3, '.', '') }}</td>
                            </tr>
                        </table>
                    </div>

                    <input type="hidden" id="totale" value="{{ $netAPayer }}">
                    @if (!empty($footerNote) || (!empty($coordonnee) && !empty($coordonnee->note)))
                        <div class="bl-note">
                            <strong>Note</strong><br>
                            {{ $footerNote ?? $coordonnee->note }}<span id="words"></span>
                        </div>
                    @endif
                    <div class="bl-signature">Signature et cachet</div>
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
