<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Bon de livraison {{ $facture->numero ?? '' }}</title>
</head>
<body class="doc-a4-print @if(!empty($forPdf)) is-pdf-print @endif">

@php
    /* ── Context ──────────────────────────────────────────────── */
    $coordonnee  = $coordonnee ?? $company ?? null;
    $isPdf       = !empty($forPdf);
    $fmt         = function($n) { return number_format((float)$n, 3, '.', ' '); };

    /* ── Logo (base64 for PDF reliability) ───────────────────── */
    $logoUrl = null;
    $staticLogoPath = resource_path('views/print/logo_print.png');
    if (is_file($staticLogoPath)) {
        $mime    = @mime_content_type($staticLogoPath) ?: 'image/png';
        $logoUrl = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($staticLogoPath));
    }

    $client = $client ?? $facture->client;
    $clientAddress = trim((string) ($facture->formatted_delivery_address ?? '')) !== ''
        ? $facture->formatted_delivery_address
        : ($client?->adresse ?? '');

    $frais = (float) ($calc_frais ?? $facture->frais_livraison ?? 0);
    $netAPayer = (float) ($calc_net_a_payer ?? max((float) ($facture->prix_ttc ?? 0) - (float) ($facture->timbre ?? 0), 0));

    /* ── Totals ───────────────────────────────────────────────── */
    $blTotalHt     = (float) ($calc_total_ht ?? $facture->prix_ht ?? 0);
    $blRemiseTotal = (float) ($calc_remise ?? $facture->remise ?? 0);
    $blCouponHt    = (float) ($facture->discount_ht ?? 0);
    $blManualRem   = max(0.0, round($blRemiseTotal - $blCouponHt, 3));
    $blPct         = (float) ($calc_pourcentage_remise ?? $facture->pourcentage_remise ?? 0);
    $blCouponCode  = $facture->coupon_code_snapshot ?? null;

    /* ── Date ─────────────────────────────────────────────────── */
    $dateStr = $documentDate ?? $facture->created_at?->format('d/m/Y');

    /* ── Build rows ───────────────────────────────────────────── */
    $rows = [];
    if (isset($details_facture)) {
        foreach ($details_facture as $i => $d) {
            $qte         = (float)($d->qte ?? $d->quantite ?? 0);
            $pu          = (float)($d->prix_unitaire ?? 0);
            $lineTotal   = isset($d->prix_ttc) ? (float)$d->prix_ttc : $qte * $pu;
            $rows[] = [
                'index'       => $i + 1,
                'produit'     => $d->product->designation_fr ?? '—',
                'qte'         => $qte,
                'pu'          => $pu,
                'total'       => $lineTotal,
            ];
        }
    }

    /* ── Client ───────────────────────────────────────────────── */
    $printClient = $client ?? $facture->client ?? null;
@endphp

@include('print.partials.styles-a4-bl-aligned', ['forPdf' => $isPdf])

<style>
/* ═══════════════════════════════════════════════════════════════
   BON DE LIVRAISON — PREMIUM REDESIGN (LIKE FACTURE)
   2-column header | highlighted columns
   ═══════════════════════════════════════════════════════════════ */

/* ── Document wrapper ───────────────────────────────────────── */
.ftva-page {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 9pt;
    color: #1e293b;
    max-width: 210mm;
    margin: 0 auto;
    padding: 12mm 10mm;
    background: #fff;
}

/* ── 2-column header ────────────────────────────────────────── */
.ftva-doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #ff4000;
}
.ftva-header-company {
    flex: 1;
    min-width: 0;
}
.ftva-logo {
    max-width: 160px;
    height: auto;
    display: block;
    margin-bottom: 8px;
}
.ftva-co-name {
    font-size: 13pt;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 5px;
    letter-spacing: -0.01em;
}
.ftva-co-line {
    font-size: 8.5pt;
    color: #475569;
    line-height: 1.6;
}
.ftva-co-line b {
    color: #0f172a;
    font-weight: 600;
}

.ftva-header-right {
    flex: 0 0 48%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end;
}

/* ── Document meta box (title + number + date) ──────────────── */
.ftva-doc-meta {
    width: 100%;
    background: #fff7ed;
    border: 1.5px solid #ff4000;
    border-radius: 8px;
    padding: 12px 16px;
    text-align: center;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
.ftva-doc-meta h1 {
    font-size: 17pt;
    font-weight: 900;
    color: #ff4000;
    margin: 0 0 6px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
.ftva-doc-meta-line {
    font-size: 9pt;
    color: #334155;
    line-height: 1.7;
}
.ftva-doc-meta-line b {
    color: #0f172a;
    font-weight: 700;
}

/* ── Client block (right side) ──────────────────────────────── */
.ftva-client-box {
    width: 100%;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    background: #f8fafc;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
.ftva-client-box__label {
    font-size: 7pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #94a3b8;
    margin-bottom: 6px;
    padding-bottom: 5px;
    border-bottom: 1px solid #e2e8f0;
}
.ftva-client-box__name {
    font-size: 10.5pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 4px;
}
.ftva-client-box__line {
    font-size: 8.5pt;
    color: #475569;
    line-height: 1.55;
}
.ftva-client-box__line b {
    color: #0f172a;
    font-weight: 600;
}

/* ── 5-column table for BL ─────────────────────────────────────────── */
table.ftva-lines {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    table-layout: fixed;
    font-size: 8.5pt;
    border: 1px solid #cbd5e1;
    margin-top: 0;
}
table.ftva-lines col.c-num   { width: 5%; }
table.ftva-lines col.c-prod  { width: 45%; }
table.ftva-lines col.c-qty   { width: 10%; }
table.ftva-lines col.c-pu    { width: 20%; }
table.ftva-lines col.c-total { width: 20%; }

table.ftva-lines thead {
    display: table-header-group;
}
table.ftva-lines thead th {
    background: #ff4000 !important;
    background-color: #ff4000 !important;
    color: #fff !important;
    font-weight: 700;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 9px 7px;
    vertical-align: middle;
    border: none;
    border-right: 1px solid rgba(255,255,255,0.2);
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
table.ftva-lines thead th:last-child {
    border-right: none;
}

/* Total column header — darkest accent */
table.ftva-lines thead th.th-tttc {
    background: #9a3412 !important;
    background-color: #9a3412 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

table.ftva-lines thead th.th-left   { text-align: left; }
table.ftva-lines thead th.th-right  { text-align: right; padding-right: 8px; }
table.ftva-lines thead th.th-center { text-align: center; }

table.ftva-lines tbody td {
    padding: 8px 7px;
    border-bottom: 1px solid #f1f5f9;
    border-right: 1px solid #f1f5f9;
    vertical-align: middle;
    font-size: 8.5pt;
    color: #334155;
    background: #fff;
}
table.ftva-lines tbody td:last-child {
    border-right: none;
}
table.ftva-lines tbody tr:nth-child(even) td {
    background: #f8fafc !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
table.ftva-lines tbody tr:last-child td {
    border-bottom: none;
}

table.ftva-lines td.td-num {
    text-align: center;
    color: #94a3b8;
    font-weight: 700;
    font-size: 8pt;
}
table.ftva-lines td.td-prod {
    text-align: left;
    font-weight: 600;
    color: #0f172a;
    word-break: break-word;
}
table.ftva-lines td.td-right {
    text-align: right;
    padding-right: 8px;
    font-variant-numeric: tabular-nums;
    color: #334155;
    white-space: nowrap;
}

/* ── Total column — dominant ───────────────────────────────────── */
table.ftva-lines td.td-ttc {
    text-align: right;
    padding-right: 8px;
    font-variant-numeric: tabular-nums;
    font-weight: 800;
    color: #9a3412;
    font-size: 9pt;
    white-space: nowrap;
}

/* ── Totals summary (right-aligned) ────────────────────────── */
.ftva-totals-outer {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
    margin-bottom: 0;
}
table.ftva-totals {
    width: 320px;
    border-collapse: collapse;
    font-size: 9.5pt;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    overflow: hidden;
}
table.ftva-totals td {
    padding: 7px 14px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}
table.ftva-totals td:first-child {
    text-align: left;
    color: #64748b;
    font-weight: 500;
    background: #f8fafc !important;
    white-space: nowrap;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
table.ftva-totals td:last-child {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: #0f172a;
    min-width: 110px;
    white-space: nowrap;
}
table.ftva-totals tr:last-child td {
    border-bottom: none;
}
table.ftva-totals tr.row-grand td {
    padding: 11px 14px;
    border-top: 2px solid #ff4000;
    border-bottom: none;
    font-size: 11.5pt;
    font-weight: 900;
}
table.ftva-totals tr.row-grand td:first-child {
    color: #c2410c;
    background: #fff7ed !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
table.ftva-totals tr.row-grand td:last-child {
    color: #c2410c;
    font-size: 13pt;
    background: #fff7ed !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

/* ── Bottom section ─────────────────────────────────────────── */
.ftva-bottom {
    margin-top: 20px;
    page-break-inside: avoid;
    break-inside: avoid;
}
.ftva-separator {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 0 0 14px;
}
.ftva-note {
    padding: 10px 14px;
    border-left: 4px solid #ff4000;
    background: #fffbeb !important;
    border-radius: 0 6px 6px 0;
    font-size: 9pt;
    color: #334155;
    line-height: 1.55;
    margin-bottom: 14px;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
.ftva-note strong {
    display: block;
    color: #c2410c;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    margin-bottom: 4px;
}
.ftva-sig-rib {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 6px;
}
.ftva-rib {
    font-size: 9.5pt;
    color: #334155;
    font-weight: 500;
    letter-spacing: 0.04em;
}
.ftva-rib span {
    color: #ff4000;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 8pt;
    margin-right: 4px;
}
.ftva-signature {
    text-align: right;
}
.ftva-signature__box {
    display: inline-block;
    width: 180px;
    border-top: 1px solid #94a3b8;
    padding-top: 6px;
    text-align: center;
    font-size: 8.5pt;
    font-weight: 600;
    color: #0f172a;
}

/* ── Print overrides ────────────────────────────────────────── */
@media print {
    @page { size: A4 portrait; margin: 10mm 8mm; }
    body { background: #fff !important; }
    .ftva-page { padding: 0 !important; max-width: none !important; }
    .doc-a4-toolbar { display: none !important; }
    table.ftva-lines thead,
    table.ftva-lines thead th,
    table.ftva-lines thead th.th-tttc,
    table.ftva-lines tbody tr:nth-child(even) td,
    table.ftva-totals td:first-child,
    table.ftva-totals tr.row-grand td,
    .ftva-doc-meta,
    .ftva-client-box,
    .ftva-note {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .ftva-bottom {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
}
</style>

{{-- ═══════════════════════════════════════════════════════════════ --}}
{{-- DOCUMENT                                                         --}}
{{-- ═══════════════════════════════════════════════════════════════ --}}
<div class="page-content">
<div id="invoice">

@if(!$isPdf)
<div class="doc-a4-toolbar hide_print" style="text-align:center;padding:10px 0 16px;display:flex;gap:8px;justify-content:center;">
    <button type="button" class="doc-a4-btn" onclick="window.print()">Imprimer</button>
    <a class="doc-a4-btn doc-a4-btn--muted" href="{{ $backUrl ?? url()->previous() }}">← Retour</a>
</div>
@endif

<div class="ftva-page">

{{-- ── 2-COLUMN HEADER ─────────────────────────────────────────── --}}
<header class="ftva-doc-header">

    {{-- LEFT: Company info --}}
    <div class="ftva-header-company">
        @if($logoUrl)
            <img src="{{ $logoUrl }}" alt="Logo" class="ftva-logo">
        @endif
        <div class="ftva-co-name">{{ $coordonnee->abbreviation ?? $coordonnee->designation_fr ?? '' }}</div>
        @if(!empty($coordonnee->email))
            <div class="ftva-co-line"><b>Email :</b> {{ $coordonnee->email }}</div>
        @endif
        @if(!empty($coordonnee->adresse_fr))
            <div class="ftva-co-line"><b>Adresse :</b> {{ $coordonnee->adresse_fr }}</div>
        @endif
        @if(!empty($coordonnee->phone_1))
            <div class="ftva-co-line"><b>Tél :</b> {{ $coordonnee->phone_1 }}{{ !empty($coordonnee->phone_2) ? ' / '.$coordonnee->phone_2 : '' }}</div>
        @endif
        @if(!empty($coordonnee->registre_commerce))
            <div class="ftva-co-line"><b>RC :</b> {{ $coordonnee->registre_commerce }}</div>
        @endif
        @if(!empty($coordonnee->matricule))
            <div class="ftva-co-line"><b>MF :</b> {{ $coordonnee->matricule }}</div>
        @endif
    </div>

    {{-- RIGHT: Doc meta + Client --}}
    <div class="ftva-header-right">

        {{-- Document meta box --}}
        <div class="ftva-doc-meta">
            <h1 style="font-size: 16pt;">BON DE LIVRAISON</h1>
            <div class="ftva-doc-meta-line"><b>N° :</b> {{ $facture->numero ?? '' }}</div>
            <div class="ftva-doc-meta-line"><b>Date :</b> {{ $dateStr }}</div>
        </div>

        {{-- Client block --}}
        @if($printClient)
        <div class="ftva-client-box">
            <div class="ftva-client-box__label">Destinataire</div>
            <div class="ftva-client-box__name">{{ $printClient->name }}</div>
            @if(!empty($clientAddress))
                <div class="ftva-client-box__line"><b>Adresse :</b> {{ $clientAddress }}</div>
            @endif
            @if(!empty($printClient->matricule))
                <div class="ftva-client-box__line"><b>Matricule :</b> {{ $printClient->matricule }}</div>
            @endif
            @if(!empty($printClient->phone_1))
                <div class="ftva-client-box__line"><b>Tél :</b> {{ $printClient->phone_1 }}</div>
            @endif
        </div>
        @endif

    </div>
</header>

{{-- ── PRODUCTS TABLE (5 columns) ──────────────────────────────── --}}
<div style="margin-top:4px;">
<table class="ftva-lines">
    <colgroup>
        <col class="c-num">
        <col class="c-prod">
        <col class="c-qty">
        <col class="c-pu">
        <col class="c-total">
    </colgroup>
    <thead>
        <tr>
            <th class="th-center">#</th>
            <th class="th-left">Produit</th>
            <th class="th-center">Quantité</th>
            <th class="th-right">Prix U</th>
            <th class="th-right th-tttc">Prix total</th>
        </tr>
    </thead>
    <tbody>
        @foreach($rows as $row)
        <tr>
            <td class="td-num">{{ $row['index'] }}</td>
            <td class="td-prod">{{ $row['produit'] }}</td>
            <td class="td-right" style="text-align:center;">{{ $row['qte'] }}</td>
            <td class="td-right">{{ $fmt($row['pu']) }}</td>
            <td class="td-ttc">{{ $fmt($row['total']) }}</td>
        </tr>
        @endforeach
        @if(empty($rows))
        <tr>
            <td colspan="5" style="text-align:center;padding:16px;color:#94a3b8;font-style:italic;">
                Aucune ligne de produit.
            </td>
        </tr>
        @endif
    </tbody>
</table>
</div>

{{-- ── TOTALS BLOCK ─────────────────────────────────────────────── --}}
<div class="ftva-totals-outer">
    <table class="ftva-totals">
        <tr>
            <td>Montant total HT</td>
            <td>{{ $fmt($blTotalHt) }}&nbsp;DT</td>
        </tr>
        @if($blManualRem > 0)
        <tr>
            <td>Remise</td>
            <td>− {{ $fmt($blManualRem) }}&nbsp;DT</td>
        </tr>
        @endif
        @if($blCouponHt > 0)
        <tr>
            <td>Code promo{{ $blCouponCode ? ' (' . $blCouponCode . ')' : '' }}</td>
            <td>− {{ $fmt($blCouponHt) }}&nbsp;DT</td>
        </tr>
        @endif
        @if($blRemiseTotal <= 0 && $blPct > 0)
        <tr>
            <td>Remise {{ number_format($blPct, 1, '.', ' ') }} %</td>
            <td>—</td>
        </tr>
        @endif
        @if($frais > 0)
        <tr>
            <td>Frais de livraison</td>
            <td>{{ $fmt($frais) }}&nbsp;DT</td>
        </tr>
        @endif
        <tr class="row-grand">
            <td>TOTAL TTC (Net à payer)</td>
            <td>{{ $fmt($netAPayer) }}&nbsp;DT</td>
        </tr>
    </table>
</div>

{{-- ── BOTTOM (Note + RIB + Signature) ─────────────────────────── --}}
<div class="ftva-bottom">
    <hr class="ftva-separator">

    <div class="ftva-note">
        <strong>Note</strong>
        @if (!empty($footerNote) || (!empty($coordonnee) && !empty($coordonnee->note)))
            {{ $footerNote ?? $coordonnee->note }}<br>
        @endif
        Arrêtée le présent bon de livraison à la somme de :
        <span id="ftva-words"><em style="color:#94a3b8;">calcul…</em></span>
    </div>
    <input type="hidden" id="ftva-total-val" value="{{ $netAPayer }}">

    <div class="ftva-sig-rib">
        <div class="ftva-rib">
            @if(!empty($coordonnee->rib))
                <span>RIB :</span> {{ $coordonnee->rib }}
            @endif
        </div>
        <div class="ftva-signature">
            <div class="ftva-signature__box">Signature et cachet</div>
        </div>
    </div>
</div>

</div>{{-- ftva-page --}}
</div>{{-- invoice --}}
</div>{{-- page-content --}}

{{-- ── Amount in words ─────────────────────────────────────────────── --}}
<script>
(function () {
    var el    = document.getElementById('ftva-total-val');
    var words = document.getElementById('ftva-words');
    if (!el || !words) return;
    var a = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf',
             'dix','onze','douze','treize','quatorze','quinze','seize',
             'dix-sept','dix-huit','dix-neuf'];
    var b = ['','','vingt','trente','quarante','cinquante',
             'soixante','soixante-dix','quatre-vingt','quatre-vingt-dix'];

    function tens(n) {
        if (n < 20) return a[n];
        var hi = Math.floor(n / 10), lo = n % 10;
        if (hi === 7 || hi === 9) { return b[hi] + (lo > 0 ? '-' + a[10 + lo] : (hi === 8 ? 's' : '')); }
        return b[hi] + (lo > 0 ? '-' + a[lo] : (hi === 8 ? 's' : ''));
    }
    function hundreds(n) {
        var h = Math.floor(n / 100), t = n % 100;
        var s = '';
        if (h > 1) s += a[h] + ' cent';
        else if (h === 1) s += 'cent';
        if (t > 0) s += (h > 0 ? ' ' : '') + tens(t);
        else if (h > 1) s += 's';
        return s.trim();
    }
    function toFr(num) {
        num = Math.abs(num);
        var dinars   = Math.floor(num);
        var millimes = Math.round((num - dinars) * 1000);
        var parts = [];
        if (dinars === 0) { parts.push('zéro'); }
        else {
            var M = Math.floor(dinars / 1000000);
            var K = Math.floor((dinars % 1000000) / 1000);
            var R = dinars % 1000;
            if (M > 0) parts.push(hundreds(M) + ' million' + (M > 1 ? 's' : ''));
            if (K > 0) parts.push((K === 1 ? 'mille' : hundreds(K) + ' mille'));
            if (R > 0) parts.push(hundreds(R));
        }
        var result = parts.join(' ') + ' dinar' + (dinars > 1 ? 's' : '');
        if (millimes > 0) result += ' et ' + millimes + ' millime' + (millimes > 1 ? 's' : '');
        return result.charAt(0).toUpperCase() + result.slice(1);
    }

    words.textContent = toFr(parseFloat(el.value) || 0);
})();
</script>

</body>
</html>
