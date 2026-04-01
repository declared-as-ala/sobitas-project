<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Facture {{ $facture->numero ?? '' }}</title>
</head>
<body>
@php
    $coordonnee = $coordonnee ?? $company ?? null;
    $logoUrl = null;
    $staticLogoPath = resource_path('views/print/logo_print.png');
    if (is_file($staticLogoPath)) {
        $mime    = @mime_content_type($staticLogoPath) ?: 'image/png';
        $logoUrl = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($staticLogoPath));
    }
    if (!isset($calcTotals) && isset($facture, $details_facture)) {
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
    $footerRemise  = $ct['remise']        ?? (float) ($facture->remise ?? 0);
    $footerTva     = $ct['tva']           ?? (float) ($facture->tva ?? 0);
    $footerTimbre  = $ct['timbre']        ?? (float) ($facture->timbre ?? 0);
    $footerTtc     = $ct['net_a_payer']   ?? (float) ($facture->prix_ttc ?? $facture->net_a_payer ?? 0);
@endphp
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
        font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
        font-size: 10pt;
        color: #1a1a1a;
        background: #f5f5f5;
    }

    /* ── Toolbar (screen only) ─────────────────────────────── */
    .toolbar {
        max-width: 820px;
        margin: 18px auto 0;
        padding: 0 10px 14px;
        text-align: right;
    }
    .btn-action {
        display: inline-block;
        background: #ff4000;
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 7px 18px;
        font-size: 10pt;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        margin-left: 8px;
    }
    .btn-action.btn-back { background: #555; }

    /* ── Page wrapper ──────────────────────────────────────── */
    .page-wrap {
        max-width: 820px;
        margin: 0 auto;
        background: #fff;
        padding: 36px 40px 80px;
        position: relative;
        min-height: 1050px;
    }

    /* ── Header ────────────────────────────────────────────── */
    .doc-header {
        display: table;
        width: 100%;
        background: #f0f0f0;
        border-radius: 4px;
        padding: 18px 20px 14px;
        margin-bottom: 0;
        border-bottom: 3px solid #ff4000;
    }
    .doc-header .hd-left  { display: table-cell; vertical-align: top; width: 60%; }
    .doc-header .hd-right { display: table-cell; vertical-align: top; width: 40%; text-align: right; }

    .hd-left .company-name {
        font-size: 13pt;
        font-weight: 700;
        color: #1a1a1a;
        margin: 6px 0 8px;
    }
    .hd-left .co-info { font-size: 9pt; color: #333; line-height: 1.65; }
    .hd-left .co-info b { color: #1a1a1a; }

    .hd-right .doc-title {
        font-size: 28pt;
        font-weight: 800;
        color: #1a1a1a;
        text-transform: uppercase;
        letter-spacing: 2px;
        line-height: 1;
        margin-bottom: 10px;
    }
    .hd-right .doc-meta { font-size: 9.5pt; color: #333; line-height: 1.75; }
    .hd-right .doc-meta b { color: #1a1a1a; }

    /* ── Client block ──────────────────────────────────────── */
    .client-section {
        margin: 22px 0 18px;
        padding: 14px 16px;
        border-left: 4px solid #ff4000;
        background: #fafafa;
    }
    .client-section .section-label {
        font-size: 8pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.2px;
        color: #ff4000;
        margin-bottom: 10px;
    }
    .client-section .client-name {
        font-size: 11.5pt;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 4px;
    }
    .client-section .client-row {
        font-size: 9.5pt;
        color: #333;
        line-height: 1.6;
    }
    .client-section .client-row b { color: #1a1a1a; }

    /* ── Items table ───────────────────────────────────────── */
    .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 6px;
        font-size: 9.5pt;
    }
    .items-table thead tr th {
        background: #ff4000;
        color: #fff;
        font-weight: 700;
        text-transform: uppercase;
        font-size: 8pt;
        letter-spacing: 0.6px;
        padding: 8px 10px;
        text-align: center;
        border: none;
    }
    .items-table thead tr th:first-child { text-align: center; border-radius: 0; }
    .items-table thead tr th.col-product  { text-align: left; }

    .items-table tbody tr td {
        padding: 7px 10px;
        border-bottom: 1px solid #e8e8e8;
        vertical-align: middle;
    }
    .items-table tbody tr:nth-child(even) td { background: #f7f7f7; }
    .items-table tbody tr:last-child td { border-bottom: 2px solid #ddd; }

    .items-table td.col-num    { text-align: center; color: #888; font-size: 8.5pt; width: 5%; }
    .items-table td.col-product{ text-align: left;   font-weight: 600; width: 35%; }
    .items-table td.col-qty    { text-align: center; width: 10%; }
    .items-table td.col-pu     { text-align: right;  width: 15%; }
    .items-table td.col-tva    { text-align: center; width: 12%; }
    .items-table td.col-total  { text-align: right;  width: 15%; font-weight: 600; }

    /* ── Totals block ──────────────────────────────────────── */
    .totals-wrap {
        display: table;
        width: 100%;
        margin-top: 4px;
        margin-bottom: 20px;
    }
    .totals-spacer { display: table-cell; width: 55%; }
    .totals-block  { display: table-cell; width: 45%; }

    .totals-row {
        display: table;
        width: 100%;
        border-bottom: 1px solid #ebebeb;
    }
    .totals-row .tl { display: table-cell; padding: 6px 10px; font-size: 9.5pt; color: #444; text-align: right; width: 60%; }
    .totals-row .tv { display: table-cell; padding: 6px 10px; font-size: 9.5pt; font-weight: 600; text-align: right; width: 40%; min-width: 90px; }
    .totals-row.total-final { background: #fff3f0; border-top: 2px solid #1a1a1a; border-bottom: none; }
    .totals-row.total-final .tl { font-size: 10.5pt; font-weight: 700; color: #1a1a1a; }
    .totals-row.total-final .tv { font-size: 11pt; font-weight: 800; color: #ff4000; }

    /* ── Note ──────────────────────────────────────────────── */
    .note-block {
        border-left: 4px solid #ff4000;
        padding: 8px 12px;
        margin: 20px 0 16px;
        background: #fff8f6;
    }
    .note-block .note-label {
        font-size: 8.5pt;
        font-weight: 700;
        color: #ff4000;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 4px;
    }
    .note-block .note-text {
        font-size: 9.5pt;
        color: #333;
        line-height: 1.5;
    }

    /* ── Signature ─────────────────────────────────────────── */
    .signature-line {
        text-align: center;
        font-size: 10pt;
        font-weight: 600;
        color: #1a1a1a;
        text-decoration: underline;
        margin: 22px 0 0;
        letter-spacing: 0.3px;
    }

    /* ── RIB footer ────────────────────────────────────────── */
    .doc-footer {
        position: absolute;
        bottom: 24px;
        left: 40px;
        right: 40px;
    }
    .doc-footer .rib-label {
        font-size: 7.5pt;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 2px;
    }
    .doc-footer .rib-value {
        font-size: 9pt;
        color: #555;
        font-family: 'Courier New', monospace;
        letter-spacing: 1.5px;
    }

    /* ── Print overrides ───────────────────────────────────── */
    @media print {
        body { background: #fff; }
        .toolbar { display: none; }
        .page-wrap {
            max-width: 100%;
            margin: 0;
            padding: 20px 28px 80px;
            min-height: 100vh;
            box-shadow: none;
        }
        .doc-footer {
            position: fixed;
            bottom: 16px;
            left: 28px;
            right: 28px;
        }
    }
</style>

@if (empty($forPdf))
<div class="toolbar">
    <button type="button" class="btn-action" onclick="window.print()">Imprimer</button>
    <a class="btn-action btn-back" href="{{ $backUrl ?? url()->previous() }}">Retour</a>
</div>
@endif

<div class="page-wrap">

    {{-- ── HEADER ── --}}
    <div class="doc-header">
        <div class="hd-left">
            @if ($logoUrl)
                <img src="{{ $logoUrl }}" alt="logo" style="height:52px; margin-bottom:8px; display:block;">
            @endif
            <div class="company-name">{{ $coordonnee->abbreviation ?? '' }}</div>
            <div class="co-info">
                <div><b>Email :</b> {{ $coordonnee->email ?? '' }}</div>
                <div><b>Adresse :</b> {{ $coordonnee->adresse_fr ?? '' }}</div>
                <div><b>Tél :</b> {{ $coordonnee->phone_1 ?? '' }}@if(!empty($coordonnee->phone_2)) / {{ $coordonnee->phone_2 }}@endif</div>
                @if(!empty($coordonnee->registre_commerce))
                    <div><b>RC :</b> {{ $coordonnee->registre_commerce }}</div>
                @endif
                @if(!empty($coordonnee->matricule))
                    <div><b>MF :</b> {{ $coordonnee->matricule }}</div>
                @endif
            </div>
        </div>
        <div class="hd-right">
            <div class="doc-title">Facture</div>
            <div class="doc-meta">
                <div><b>Date :</b> {{ $documentDate ?? $facture->created_at?->format('d/m/Y') }}</div>
                <div><b>Numéro :</b> {{ $facture->numero }}</div>
            </div>
        </div>
    </div>

    {{-- ── CLIENT ── --}}
    @if ($facture->client ?? null)
        <div class="client-section">
            <div class="section-label">Informations du client</div>
            <div class="client-name">{{ $facture->client->name }}</div>
            <div class="client-row"><b>Adresse :</b> {{ $facture->client->adresse }}</div>
            @if($facture->client->matricule)
                <div class="client-row"><b>Matricule :</b> {{ $facture->client->matricule }}</div>
            @endif
            <div class="client-row"><b>Téléphone :</b> {{ $facture->client->phone_1 }}</div>
        </div>
    @endif

    {{-- ── ITEMS TABLE ── --}}
    <table class="items-table">
        <thead>
            <tr>
                <th style="width:5%">#</th>
                <th class="col-product" style="width:35%">Produit</th>
                <th style="width:10%">Qté</th>
                <th style="width:15%">P.U. HT</th>
                <th style="width:12%">TVA</th>
                <th style="width:15%">Total HT</th>
            </tr>
        </thead>
        <tbody>
            @php $i = 1; @endphp
            @if (!empty($invoice_rows))
                @foreach ($invoice_rows as $row)
                    <tr>
                        <td class="col-num">{{ $row['index'] }}</td>
                        <td class="col-product">{{ $row['produit'] }}</td>
                        <td class="col-qty">{{ $row['qte'] }}</td>
                        <td class="col-pu">{{ number_format($row['pu_ht'], 3, '.', '') }}</td>
                        <td class="col-tva">{{ $row['tva_pct'] }} %</td>
                        <td class="col-total">{{ number_format($row['total_ht'], 3, '.', '') }}</td>
                    </tr>
                    @php $i++; @endphp
                @endforeach
            @else
                @foreach ($details_facture ?? [] as $details)
                    @php
                        $q  = (int)   ($details->qte ?? $details->quantite ?? 0);
                        $pu = (float) ($details->prix_unitaire ?? 0);
                        $tp = (float) ($details->tva ?? ($coordonnee->tva ?? 19));
                        $th = round($q * $pu, 3);
                    @endphp
                    <tr>
                        <td class="col-num">{{ $i }}</td>
                        <td class="col-product">{{ $details->product->designation_fr ?? '—' }}</td>
                        <td class="col-qty">{{ $q }}</td>
                        <td class="col-pu">{{ number_format($pu, 3, '.', '') }}</td>
                        <td class="col-tva">{{ $tp }} %</td>
                        <td class="col-total">{{ number_format($th, 3, '.', '') }}</td>
                    </tr>
                    @php $i++; @endphp
                @endforeach
            @endif
        </tbody>
    </table>

    {{-- ── TOTALS ── --}}
    <div class="totals-wrap">
        <div class="totals-spacer"></div>
        <div class="totals-block">
            <div class="totals-row">
                <span class="tl">Totale HT</span>
                <span class="tv">{{ number_format($footerTotalHt, 3, '.', '') }}</span>
            </div>
            @if ($footerRemise > 0)
                <div class="totals-row">
                    <span class="tl">Remise</span>
                    <span class="tv">{{ number_format($footerRemise, 3, '.', '') }}</span>
                </div>
            @endif
            <div class="totals-row">
                <span class="tl">TVA</span>
                <span class="tv">{{ number_format($footerTva, 3, '.', '') }}</span>
            </div>
            <div class="totals-row">
                <span class="tl">Timbre</span>
                <span class="tv">{{ number_format($footerTimbre, 3, '.', '') }}</span>
            </div>
            <div class="totals-row total-final">
                <span class="tl">Total TTC</span>
                <span class="tv">{{ number_format($footerTtc, 3, '.', '') }}</span>
            </div>
        </div>
    </div>

    {{-- ── NOTE ── --}}
    <input type="hidden" id="totale" value="{{ $footerTtc }}">
    @if (!empty($coordonnee->note))
        <div class="note-block">
            <div class="note-label">Note</div>
            <div class="note-text">{{ $coordonnee->note }}<span id="words"></span></div>
        </div>
    @endif

    {{-- ── SIGNATURE ── --}}
    <div class="signature-line">Signature et cachet</div>

    {{-- ── RIB FOOTER ── --}}
    @if (!empty($coordonnee->rib))
        <div class="doc-footer">
            <div class="rib-label">RIB</div>
            <div class="rib-value">{{ $coordonnee->rib }}</div>
        </div>
    @endif

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
