<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Facture {{ $facture->numero ?? '' }}</title>
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

    /* ── Totals ───────────────────────────────────────────────── */
    if (!isset($calcTotals) && isset($facture, $details_facture)) {
        $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float)$coordonnee->tva : 19;
        $calcTotals = \App\Services\InvoiceCalculator::calculate(
            $details_facture->toArray(),
            (float)($facture->remise ?? 0),
            (float)($facture->timbre ?? 0),
            $defaultTva
        );
    }
    $ct = $calcTotals ?? [];
    $totalHtBrut = (float)($ct['total_ht_brut'] ?? $facture->prix_ht ?? 0);
    $totalRemise = (float)($ct['remise']         ?? $facture->remise ?? 0);

    /* Coupon breakdown: remise = manual_remise + coupon_discount_ht (invariant) */
    $couponDiscountHt = (float)($facture->discount_ht ?? 0);
    $manualRemise     = max(0.0, round($totalRemise - $couponDiscountHt, 3));
    $couponCode       = $facture->coupon_code_snapshot ?? null;

    $baseImp     = round($totalHtBrut - $totalRemise, 3);
    $totalTva    = (float)($ct['tva']            ?? $facture->tva ?? 0);
    $totalTimbre = (float)($ct['timbre']         ?? $facture->timbre ?? 0);
    $netAPayer   = (float)($ct['net_a_payer']    ?? $facture->prix_ttc ?? $facture->net_a_payer ?? 0);
    $tvaRate     = (float)($coordonnee->tva ?? 19);
    $tvaDisplay  = ($tvaRate == floor($tvaRate)) ? (int)$tvaRate : $tvaRate;

    /* ── Date ─────────────────────────────────────────────────── */
    $dateStr = $documentDate
        ?? ($facture->date_facture
            ? \Carbon\Carbon::parse($facture->date_facture)->format('d/m/Y')
            : ($facture->created_at?->format('d/m/Y') ?? ''));

    /* ── Build rows ───────────────────────────────────────────── */
    $rows = $invoice_rows ?? [];
    if (empty($rows) && isset($details_facture)) {
        $defTva = $tvaRate;
        foreach ($details_facture as $i => $d) {
            $qte         = (int)($d->qte ?? $d->quantite ?? 0);
            $pu_ht       = (float)($d->prix_unitaire ?? 0);
            $tva_pct     = (float)($d->tva ?? $defTva);
            $pu_ttc      = round($pu_ht * (1 + $tva_pct / 100), 3);
            $total_ht    = round($pu_ht * $qte, 3);
            $montant_tva = round($total_ht * $tva_pct / 100, 3);
            $total_ttc   = round($total_ht + $montant_tva, 3);
            $rows[] = [
                'index'       => $i + 1,
                'produit'     => $d->product->designation_fr ?? '—',
                'qte'         => $qte,
                'pu_ht'       => $pu_ht,
                'pu_ttc'      => $pu_ttc,
                'total_ht'    => $total_ht,
                'tva_pct'     => $tva_pct,
                'montant_tva' => $montant_tva,
                'total_ttc'   => $total_ttc,
            ];
        }
    }

    /* ── Client ───────────────────────────────────────────────── */
    $printClient = $client ?? $facture->client ?? null;
@endphp

@include('print.partials.styles-a4-bl-aligned', ['forPdf' => $isPdf])

<style>
/* ═══════════════════════════════════════════════════════════════
   FACTURE TVA — PREMIUM REDESIGN
   2-column header | highlighted PU TTC | dominant Total TTC
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
    font-size: 20pt;
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

/* ── 9-column table ─────────────────────────────────────────── */
table.ftva-lines {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    table-layout: fixed;
    font-size: 8.5pt;
    border: 1px solid #cbd5e1;
    margin-top: 0;
}
table.ftva-lines col.c-num   { width: 4%; }
table.ftva-lines col.c-prod  { width: 28%; }
table.ftva-lines col.c-qty   { width: 5%; }
table.ftva-lines col.c-puht  { width: 10%; }
table.ftva-lines col.c-puttc { width: 10%; }
table.ftva-lines col.c-tht   { width: 10%; }
table.ftva-lines col.c-tva   { width: 6%; }
table.ftva-lines col.c-mtva  { width: 11%; }
table.ftva-lines col.c-tttc  { width: 16%; }

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

/* PU TTC header — slightly darker accent */
table.ftva-lines thead th.th-puttc {
    background: #c2410c !important;
    background-color: #c2410c !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

/* Total TTC header — darkest accent */
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
}
table.ftva-lines td.td-tva-pct {
    text-align: center;
    color: #64748b;
    font-size: 8pt;
}

/* ── PU TTC highlighted column ──────────────────────────────── */
table.ftva-lines td.td-puttc {
    text-align: right;
    padding-right: 8px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: #c2410c;
    background: #fff7ed !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}
table.ftva-lines tbody tr:nth-child(even) td.td-puttc {
    background: #ffedd5 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

/* ── Total TTC — dominant ───────────────────────────────────── */
table.ftva-lines td.td-ttc {
    text-align: right;
    padding-right: 8px;
    font-variant-numeric: tabular-nums;
    font-weight: 800;
    color: #9a3412;
    font-size: 9pt;
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
    table.ftva-lines thead th.th-puttc,
    table.ftva-lines thead th.th-tttc,
    table.ftva-lines tbody tr:nth-child(even) td,
    table.ftva-lines tbody td.td-puttc,
    table.ftva-lines tbody tr:nth-child(even) td.td-puttc,
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
            <h1>FACTURE</h1>
            <div class="ftva-doc-meta-line"><b>N° :</b> {{ $facture->numero ?? '' }}</div>
            <div class="ftva-doc-meta-line"><b>Date :</b> {{ $dateStr }}</div>
            @if(isset($facture->facture_id) && $facture->facture_id)
                <div class="ftva-doc-meta-line"><b>Réf. BL :</b> {{ $facture->facture_id }}</div>
            @endif
        </div>

        {{-- Client block --}}
        @if($printClient)
        <div class="ftva-client-box">
            <div class="ftva-client-box__label">Destinataire</div>
            <div class="ftva-client-box__name">{{ $printClient->name }}</div>
            @if(!empty($printClient->adresse))
                <div class="ftva-client-box__line"><b>Adresse :</b> {{ $printClient->adresse }}</div>
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

{{-- ── PRODUCTS TABLE (9 columns) ──────────────────────────────── --}}
<div style="margin-top:4px;">
<table class="ftva-lines">
    <colgroup>
        <col class="c-num">
        <col class="c-prod">
        <col class="c-qty">
        <col class="c-puht">
        <col class="c-puttc">
        <col class="c-tht">
        <col class="c-tva">
        <col class="c-mtva">
        <col class="c-tttc">
    </colgroup>
    <thead>
        <tr>
            <th class="th-center">#</th>
            <th class="th-left">Désignation</th>
            <th class="th-center">Qté</th>
            <th class="th-right">PU HT</th>
            <th class="th-right th-puttc">PU TTC</th>
            <th class="th-right">Total HT</th>
            <th class="th-center">TVA</th>
            <th class="th-right">Mnt TVA</th>
            <th class="th-right th-tttc">Total TTC</th>
        </tr>
    </thead>
    <tbody>
        @foreach($rows as $row)
        <tr>
            <td class="td-num">{{ $row['index'] }}</td>
            <td class="td-prod">{{ $row['produit'] }}</td>
            <td class="td-right" style="text-align:center;">{{ $row['qte'] }}</td>
            <td class="td-right">{{ $fmt($row['pu_ht']) }}</td>
            <td class="td-puttc">{{ $fmt($row['pu_ttc']) }}</td>
            <td class="td-right">{{ $fmt($row['total_ht']) }}</td>
            <td class="td-tva-pct">{{ $row['tva_pct'] }}&nbsp;%</td>
            <td class="td-right">{{ $fmt($row['montant_tva']) }}</td>
            <td class="td-ttc">{{ $fmt($row['total_ttc']) }}</td>
        </tr>
        @endforeach
        @if(empty($rows))
        <tr>
            <td colspan="9" style="text-align:center;padding:16px;color:#94a3b8;font-style:italic;">
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
            <td>Total HT</td>
            <td>{{ $fmt($totalHtBrut) }}&nbsp;DT</td>
        </tr>
        @if($manualRemise > 0)
        <tr>
            <td>Remise</td>
            <td>− {{ $fmt($manualRemise) }}&nbsp;DT</td>
        </tr>
        @endif
        @if($couponDiscountHt > 0)
        <tr>
            <td>Code promo{{ $couponCode ? ' (' . $couponCode . ')' : '' }}</td>
            <td>− {{ $fmt($couponDiscountHt) }}&nbsp;DT</td>
        </tr>
        @endif
        @if($totalRemise > 0)
        <tr>
            <td>Base imposable</td>
            <td>{{ $fmt($baseImp) }}&nbsp;DT</td>
        </tr>
        @endif
        <tr>
            <td>TVA ({{ $tvaDisplay }}&nbsp;%)</td>
            <td>{{ $fmt($totalTva) }}&nbsp;DT</td>
        </tr>
        @if($totalTimbre > 0)
        <tr>
            <td>Timbre fiscal</td>
            <td>{{ $fmt($totalTimbre) }}&nbsp;DT</td>
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
        Arrêtée la présente facture à la somme de :
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
