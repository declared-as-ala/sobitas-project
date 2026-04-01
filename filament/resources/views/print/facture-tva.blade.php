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
    #invoice { padding: 30px; }
    .invoice {
        position: relative;
        background-color: #FFF;
        min-height: 680px;
        padding: 15px;
    }
    .invoice header {
        padding: 10px 10px;
        margin-bottom: 20px;
        border-bottom: 1px solid #ff4000;
    }
    .invoice .company-details { text-align: right; }
    .invoice .company-details .name { margin-top: 0; margin-bottom: 0; }
    .invoice .contacts { margin-bottom: 20px; }
    .invoice .invoice-to { text-align: left; }
    .invoice .invoice-to .to { margin-top: 0; margin-bottom: 0; }
    .invoice .invoice-details { text-align: right; }
    .company-details .invoice-id { margin: 26px; text-transform: uppercase; }
    .invoice main { padding-bottom: 50px; }
    .invoice main .notices {
        padding-left: 6px;
        font-size: 16pt;
        border-left: 6px solid #ff4000;
    }
    .invoice main .notices .notice { font-size: 16pt; }
    .invoice table {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
        margin-bottom: 20px;
    }
    .invoice table td,
    .invoice table th { border-bottom: 1px solid #fff; }
    .invoice table th { white-space: nowrap; font-size: 13pt; }
    .invoice table tbody tr:last-child td { border-bottom: 1px solid #b4b4b4; }
    .hide_print { display: initial; }
    .table1 {}
    @media print {
        html, body, #invoice, .invoice, thead th, .table thead th {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .invoice { overflow: hidden !important; }
        .hide_print { display: none; }
        .invoice > div:last-child { page-break-before: always; }
        .table1 { min-height: 10cm; }
        .page-content { zoom: 100%; }
    }
    thead th,
    .table thead th {
        background: #ff4000 !important;
        background-color: #ff4000 !important;
        color: #fff !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        padding: 5px !important;
        text-align: center !important;
        border: 1px solid #ff4000 !important;
        border-top: 1px solid #ff4000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .table1 td {
        border-right: 1px solid #b4b4b4;
        border-left: 1px solid #b4b4b4;
        padding: 6px !important;
    }
    tfoot td, tfoot th { text-align: right; }
    tfoot th:last-child { border-bottom: 1px solid #b4b4b4; }
    tfoot tr:last-child th:last-child {
        background: #fd582033;
        border-top: 2px solid black !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .bt { border-top: 2px solid black !important; }
    .contacts .address, .contacts .email, .contacts .to { font-weight: 600; font-size: 12pt; }
    tbody { font-size: 10pt !important; }
    .btn-info { background: #3e46df; border: 0; border-radius: 3px; color: #fff; padding: 6px 15px; }

    @include('print.partials.footer-rib-numero-styles', ['forPdf' => $forPdf ?? null])
</style>

<div class="page-content">
    <div id="invoice">
        @if (empty($forPdf))
        <div class="toolbar hidden-print hide_print">
            <div class="text-right">
                <button type="button" id="printInvoice" class="btn btn-info" onclick="window.print()">Imprimer</button>
                <a class="btn btn-info" href="{{ $backUrl ?? url()->previous() }}">Retour</a>
            </div>
            <hr>
        </div>
        @endif
        <div class="invoice overflow-auto">
            <div style="min-width: 600px">
                <header style="background: #eeeeee !important;">
                    <div class="row">
                        <div class="col">
                            @if ($logoUrl)
                                <img src="{{ $logoUrl }}" alt="" style="width: 220px">
                            @endif
                            <h4 class="name">{{ $coordonnee->abbreviation ?? '' }}</h4>
                            <div><b>Email :</b> &nbsp; {{ $coordonnee->email ?? '' }}</div>
                            <div><b>Adresse :</b> &nbsp; {{ $coordonnee->adresse_fr ?? '' }}</div>
                            <div><b>Tél :</b> &nbsp;{{ $coordonnee->phone_1 ?? '' }}
                                @if (!empty($coordonnee->phone_2))<span>/ {{ $coordonnee->phone_2 }}</span>@endif
                            </div>
                            @if (!empty($coordonnee->registre_commerce))
                                <div><b>RC :</b>&nbsp; {{ $coordonnee->registre_commerce }}</div>
                            @endif
                            @if (!empty($coordonnee->matricule))
                                <div><b>MF :</b>&nbsp; {{ $coordonnee->matricule }}</div>
                            @endif
                        </div>
                        <div class="col company-details">
                            <h1 class="invoice-id">Facture</h1>
                            <div class="date"><b>Date :</b> {{ $dateStr }}</div>
                            <div class="date"><b>Numéro:</b> {{ $facture->numero }}</div>
                        </div>
                    </div>
                </header>
                <main>
                    @if ($facture->client ?? null)
                        <div class="row contacts">
                            <div class="col invoice-to">
                                <h5 class="text-gray-light">INFORMATIONS DU CLIENT</h5>
                                <hr style="margin: 9px">
                                <b class="to"><b>Nom :</b> {{ $facture->client->name }}</b>
                                <div class="address"><b>Adresse :</b> {{ $facture->client->adresse }}</div>
                                @if ($facture->client->matricule)
                                    <div class="email"><b>Matricule :</b> {{ $facture->client->matricule }}</div>
                                @endif
                                <div class="email"><b>Numéro de téléphone:</b> {{ $facture->client->phone_1 }}</div>
                            </div>
                            <div class="col invoice-details"></div>
                        </div>
                    @endif
                    <br><br>
                    <div class="table1">
                        <table class="table" cellspacing="0" cellpadding="0">
                            <thead>
                                <tr>
                                    <th style="width: 5%; background: #ff4000 !important">#</th>
                                    <th style="width: 25%; background: #ff4000 !important">Produit</th>
                                    <th style="width: 10%; background: #ff4000 !important">Qte</th>
                                    <th style="width: 15%; background: #ff4000 !important">P.U.HT</th>
                                    <th style="width: 15%; background: #ff4000 !important">TVA</th>
                                    <th style="width: 15%; background: #ff4000 !important">Totale HT</th>
                                </tr>
                            </thead>
                            <tbody>
                                @php $i = 1; @endphp
                                @if (!empty($invoice_rows))
                                    @foreach ($invoice_rows as $row)
                                        <tr>
                                            <td @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ $row['index'] }}</td>
                                            <td @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ $row['produit'] }}</td>
                                            <td class="text-center" @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ $row['qte'] }}</td>
                                            <td class="text-right" @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ number_format($row['pu_ht'], 3, '.', '') }}</td>
                                            <td class="text-right" @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ $row['tva_pct'] }} %</td>
                                            <td class="text-right" @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ number_format($row['total_ht'], 3, '.', '') }}</td>
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
                                            <td @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ $i }}</td>
                                            <td @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ $details->product->designation_fr ?? '—' }}</td>
                                            <td class="text-center" @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ $q }}</td>
                                            <td class="text-right" @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ number_format($pu, 3, '.', '') }}</td>
                                            <td class="text-right" @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ $tp }} %</td>
                                            <td class="text-right" @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ number_format($th, 3, '.', '') }}</td>
                                        </tr>
                                        @php $i++; @endphp
                                    @endforeach
                                @endif
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="6">&nbsp;</td>
                                </tr>
                                <tr>
                                    <td colspan="2"></td>
                                    <th colspan="3" style="border-top: none">Totale HT</th>
                                    <th class="text-right">{{ number_format($footerTotalHt, 3, '.', '') }}</th>
                                </tr>
                                @if ($footerRemise > 0)
                                    <tr>
                                        <td colspan="2"></td>
                                        <th colspan="3">Remise</th>
                                        <th class="text-right">{{ number_format($footerRemise, 3, '.', '') }}</th>
                                    </tr>
                                @endif
                                <tr>
                                    <td colspan="2"></td>
                                    <th colspan="3">TVA</th>
                                    <th class="text-right">{{ number_format($footerTva, 3, '.', '') }}</th>
                                </tr>
                                <tr>
                                    <td colspan="2"></td>
                                    <th colspan="3">Timbre</th>
                                    <th class="text-right">{{ number_format($footerTimbre, 3, '.', '') }}</th>
                                </tr>
                                <tr>
                                    <td colspan="2"></td>
                                    <th colspan="3">Montant total à payer</th>
                                    <th class="text-right">{{ number_format($footerTtc, 3, '.', '') }}</th>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <input type="hidden" id="totale" value="{{ $footerTtc }}">
                    @if (!empty($coordonnee->note))
                        <div class="notices">
                            <div>Note:</div>
                            <div class="notice">{{ $coordonnee->note }}<span id="words"></span></div>
                        </div>
                        <br>
                    @endif
                    <div style="margin-left: 140px; text-decoration: underline;">Signature et cachet</div>
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
