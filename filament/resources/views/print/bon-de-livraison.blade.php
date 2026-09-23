<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <title>Bon de livraison {{ $facture->numero ?? '' }}</title>
</head>
<body class="doc-a4-print">

@php
    /* ── Context ──────────────────────────────────────────────── */
    $coordonnee = $coordonnee ?? $company ?? null;
    $isPdf      = !empty($forPdf);
    $fmt        = function ($n) { return number_format((float) $n, 3, '.', ' '); };

    /*
     * SOBITAS, not the storefront mark: the company named in the header, in the footer and on the
     * stamp of this document is SOBITAS, so the logo beside that name has to match. See
     * PrintLogo::sobitas() — it falls back to resolve() if the file is ever missing.
     */
    $logoUrl = \App\Support\PrintLogo::sobitas($coordonnee ?? null);

    /* ── Client (delivery recipient) ──────────────────────────── */
    $printClient   = $client ?? $facture->client ?? null;
    // Null-safe throughout: a facture with no client must render (an empty CLIENT block), never
    // 500 on "Attempt to read property on null".
    $clientAddress = trim((string) ($facture->formatted_delivery_address ?? '')) !== ''
        ? $facture->formatted_delivery_address
        : ($printClient?->adresse ?? '');
    $cPhones = array_values(array_filter([$printClient?->phone_1, $printClient?->phone_2]));
    $cMf     = $printClient?->matricule;
    $cVille  = $printClient?->ville ?? null;
    $cCode   = $printClient?->code ?? $printClient?->id ?? null;

    /* ── Totals ───────────────────────────────────────────────── */
    $frais         = (float) ($calc_frais ?? $facture->frais_livraison ?? 0);
    $netAPayer     = (float) ($calc_net_a_payer ?? max((float) ($facture->prix_ttc ?? 0), 0));
    $blTotalHt     = (float) ($calc_total_ht ?? $facture->prix_ht ?? 0);
    $blRemiseTotal = (float) ($calc_remise ?? $facture->remise ?? 0);
    $blCouponHt    = (float) ($facture->discount_ht ?? 0);
    $blManualRem   = max(0.0, round($blRemiseTotal - $blCouponHt, 3));
    $blCouponCode  = $facture->coupon_code_snapshot ?? null;

    $dateStr = $documentDate ?? $facture->created_at?->format('d/m/Y');
    $timbre  = (float) ($facture->timbre ?? 0);

    // Single amount lead-in for the NOTE: the company note if set (it already reads "… à la
    // somme de :"), otherwise a default — never both.
    /*
     * ── THE COMPANY NOTE IS WRITTEN FOR AN INVOICE, NOT FOR THIS DOCUMENT ─────────────────────
     * `$coordonnee->note` is the shared closing line and it reads "Arrête la présente facture à la
     * somme de :" — the wrong document name on a bon de livraison, and missing the accent on
     * "Arrêté". It printed verbatim here. An explicit $footerNote passed by a caller still wins;
     * the shared invoice note is used only when it does not name a facture, and otherwise this
     * document falls back to its own wording.
     */
    $noteLead = trim((string) ($footerNote ?? ''));
    if ($noteLead === '') {
        $companyNote = trim((string) ($coordonnee->note ?? ''));
        $noteLead = ($companyNote !== '' && !preg_match('/factur/i', $companyNote))
            ? $companyNote
            : 'Arrêté le présent bon de livraison à la somme de :';
    }

    /*
     * ── TVA, DERIVED THE SAME WAY THE TVA INVOICE DERIVES IT ──────────────────────────────────
     * The classic delivery-note layout carries a per-line tax breakdown, so this view shows one.
     * Nothing here is invented: the rate is the line's own `tva` when the row carries it and the
     * company's configured rate otherwise, which is exactly the precedence facture-tva.blade uses
     * (`(float) ($d->tva ?? $defTva)`, rate from `$coordonnee->tva`). Amounts are derived from that
     * rate, never stored twice, so the recap cannot disagree with the lines.
     *
     * The document TOTALS are untouched: `$netAPayer`, `$blTotalHt`, the remise, the coupon and the
     * shipping all keep the values they have always had. A delivery note that started printing a
     * different "net à payer" because its layout changed would be a billing bug wearing a design
     * change. `Tot. Tva` is the SUM OF THE LINE TAXES, so the recap, the lines and the total are
     * one calculation rather than three.
     */
    $tvaRate = (float) ($coordonnee->tva ?? 19);

    /* ── Rows ─────────────────────────────────────────────────── */
    $rows       = [];
    $taxBuckets = [];   // rate => ['base' => ht, 'montant' => tva]
    if (isset($details_facture)) {
        foreach ($details_facture as $i => $d) {
            $qte       = (float) ($d->qte ?? $d->quantite ?? 0);
            $pu        = (float) ($d->prix_unitaire ?? 0);
            $lineTotal = isset($d->prix_ttc) ? (float) $d->prix_ttc : $qte * $pu;
            $qteDisp   = number_format($qte, 3, '.', ' ');

            $lineTva  = (float) ($d->tva ?? $tvaRate);
            $puTtc    = round($pu * (1 + $lineTva / 100), 3);
            $baseHt   = round($pu * $qte, 3);
            $montTva  = round($baseHt * $lineTva / 100, 3);

            $key = (string) $lineTva;
            if (!isset($taxBuckets[$key])) $taxBuckets[$key] = ['base' => 0.0, 'montant' => 0.0];
            $taxBuckets[$key]['base']    += $baseHt;
            $taxBuckets[$key]['montant'] += $montTva;

            $rows[] = [
                'ref'     => $d->product->code_product ?? '',
                'produit' => $d->product->designation_fr ?? '—',
                'qte'     => $qteDisp,
                'pu'      => $pu,
                'tva'     => $lineTva,
                'pu_ttc'  => $puTtc,
                'total'   => $lineTotal,
            ];
        }
    }
    ksort($taxBuckets, SORT_NUMERIC);

    /*
     * ── DROP "Réf. Art." WHEN NOTHING FILLS IT ────────────────────────────────────────────────
     * `code_product` is null on most order lines, so the column printed as a blank 16% stripe down
     * the whole sheet — the reference form has a reference in it, which is the only reason it has
     * the column at all. Shown when at least one line carries a code, hidden when none does, and
     * the width goes to Désignation so the product names stop wrapping at 34%.
     */
    $showRef = false;
    foreach ($rows as $r) { if (trim((string) $r['ref']) !== '') { $showRef = true; break; } }
    $colCount = $showRef ? 7 : 6;

    $totTva  = round(array_sum(array_column($taxBuckets, 'montant')), 3);

    /*
     * ── HOW TALL THE EMPTY PART OF THE GRID IS ────────────────────────────────────────────────
     * The reference form's column rules run to a fixed depth whatever the delivery contains, which
     * is what makes it read as a pre-printed sheet rather than a stub. A CONSTANT filler cannot do
     * that: at ~5mm per printed line, twenty lines plus 78mm of filler overflows A4 and pushes the
     * tax recap, the totals and both signatures onto a second page — the totals are the part of
     * this document people actually look for, so that is the one thing it must never do.
     *
     * So the filler is the REMAINDER: the frame's target depth minus what the rows already take,
     * floored at zero. Few lines -> a tall ruled box. Many lines -> no filler at all and the grid
     * ends where the rows end, which is correct on a page that is already full.
     */
    $rowDepthMm   = 5.0;   // one printed line at 7.8pt with 2px padding, measured
    $frameDepthMm = 86.0;  // depth that leaves room for recap + totals + note + signatures on A4
    $fillerMm     = max(0.0, $frameDepthMm - (count($rows) * $rowDepthMm));
    $tvaDisp = function ($r) { return ($r == floor($r)) ? (int) $r : $r; };
@endphp

<style>
/* ═══════════════════════════════════════════════════════════════
   BON DE LIVRAISON — SOBITAS
   Classic Tunisian administrative form. Monochrome rules and type;
   the logo is the only element that carries colour.
   ═══════════════════════════════════════════════════════════════ */

/*
 * ── WHY MONOCHROME ─────────────────────────────────────────────────────────────────────────────
 * A delivery note is signed, stamped, photocopied and filed. Anything carried by colour is lost to
 * the mono office copier, the "économie d'encre" print mode and the phone photo that this document
 * actually lives through. Every structural cue here is a rule, a weight or an alignment, so the
 * form survives at any fidelity. The table header is a light tint AND a heavier rule AND bold type
 * for the same reason: drop the background and it still reads as a header.
 */
:root {
    --ink:    #000;
    --ink-2:  #333;
    --label:  #000;
    --rule:   #000;
    --rule-2: #888;
    --tint:   #ececec;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #f2f2f2; }
body.doc-a4-print {
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    color: var(--ink);
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

/* Toolbar (screen only) */
.bl-toolbar { text-align: center; padding: 14px 0 6px; display: flex; gap: 8px; justify-content: center; }
.bl-btn {
    display: inline-block; padding: 9px 20px; border: 1px solid #000; background: #000;
    color: #fff; font-weight: 700; font-size: 10pt; cursor: pointer; text-decoration: none;
}
.bl-btn--ghost { background: #fff; color: #000; }

.bl-page {
    position: relative; width: 210mm; max-width: 210mm; min-height: 297mm; margin: 16px auto;
    padding: 10mm 10mm 12mm; background: #fff; font-size: 9pt; line-height: 1.3;
    box-shadow: 0 2px 10px rgba(0,0,0,0.18);
}

/* ── Header ──────────────────────────────────────────────────── */
.bl-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.bl-co { flex: 1 1 auto; min-width: 0; }
.bl-co-name { font-size: 11.5pt; font-weight: 700; text-transform: uppercase; }
.bl-co-addr { font-size: 7.6pt; margin: 1px 0 3px; }
/* The reference form sets the identity lines as a two-column label grid, not as sentences. */
.bl-co-grid { display: grid; grid-template-columns: max-content max-content; gap: 0 26px; font-size: 7.6pt; }
.bl-co-grid .wide { grid-column: 1 / -1; }
.bl-idline { display: flex; gap: 4px; }
.bl-idline b { font-weight: 400; color: var(--label); flex: 0 0 auto; min-width: 30px; }
.bl-idline span { font-weight: 400; word-break: break-all; }

.bl-brand { flex: 0 0 auto; text-align: right; }
.bl-logo {
    /* The one coloured element, and it has to survive being photocopied: the SOBITAS wordmark is
       long and low (612x408 with generous whitespace), so at 40px the lettering fell under ~11px
       and greyed out on a mono copier. 64px puts the wordmark itself at a legible size while the
       header block beside it still fits on one A4 line. */
    height: 82px; width: auto; max-width: 62mm; display: block; margin-left: auto;
}
.bl-logo-text { font-size: 19pt; font-weight: 800; letter-spacing: -0.02em; }
.bl-site { font-size: 7.2pt; margin-top: 3px; }
.bl-pageno { font-size: 7.4pt; margin-top: 2px; }

/* ── Document title ──────────────────────────────────────────── */
.bl-docline { text-align: right; margin-top: 9px; }
.bl-doctitle { font-size: 12.5pt; font-weight: 700; letter-spacing: -0.01em; }
.bl-docdate { font-size: 8pt; margin-top: 1px; }

/* ── Client | payment ────────────────────────────────────────── */
.bl-parties { display: flex; gap: 12px; align-items: stretch; margin-top: 6px; }
.bl-client { flex: 0 0 47%; border: 1px solid var(--rule); padding: 7px 9px; }
.bl-kv { display: flex; font-size: 7.9pt; padding: 1.8px 0; align-items: baseline; }
.bl-kv dt { flex: 0 0 80px; font-weight: 700; }
.bl-kv dd { margin: 0; word-break: break-word; }
.bl-kv dd::before { content: ': '; }
.bl-payside { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.bl-payhead { font-size: 8.6pt; font-weight: 700; padding: 0 0 6px; }
.bl-remark { border: 1px solid var(--rule); padding: 7px 9px; font-size: 7.9pt; flex: 1; min-height: 26mm; }
.bl-webref { text-align: right; font-size: 8.4pt; font-weight: 700; margin-top: 5px; }

/* ── Products ────────────────────────────────────────────────── */
/*
 * The reference form is ONE tall ruled box: the column rules run the full height of the frame
 * whether the delivery has two lines or twenty. That is what `.bl-filler` reproduces — a final row
 * that absorbs the remaining height so the grid never stops halfway down an empty page.
 */
table.bl-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 5px; }
table.bl-table th {
    background: var(--tint); font-size: 7.4pt; font-weight: 700; padding: 4px 4px;
    border: 1px solid var(--rule); text-align: center;
}
table.bl-table td {
    font-size: 8pt; padding: 3.5px 5px; vertical-align: top; color: var(--ink);
    border-left: 1px solid var(--rule); border-right: 1px solid var(--rule);
}
table.bl-table tbody tr:last-child td { border-bottom: 1px solid var(--rule); }
table.bl-table .c-left { text-align: left; }
table.bl-table .c-center { text-align: center; }
table.bl-table .c-right { text-align: right; }
table.bl-table td.c-right, table.bl-table td.c-center { font-variant-numeric: tabular-nums; }
table.bl-table td.c-prod { line-height: 1.25; word-break: break-word; }
table.bl-table td.c-ref { word-break: break-all; }
table.bl-table thead { display: table-header-group; }
table.bl-table tr { break-inside: avoid; page-break-inside: avoid; }
.bl-filler td { height: 0; padding: 0; }   /* height comes from the inline style below */
.bl-empty { font-style: italic; padding: 10px; text-align: center; }

/* ── Tax recap | totals ──────────────────────────────────────── */
.bl-bottom { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-top: 6px; break-inside: avoid; page-break-inside: avoid; }
table.bl-tax { border-collapse: collapse; }
table.bl-tax th, table.bl-tax td { border: 1px solid var(--rule); font-size: 7.4pt; padding: 2px 8px; text-align: center; font-variant-numeric: tabular-nums; }
table.bl-tax th { background: var(--tint); font-weight: 700; }
table.bl-totals { border-collapse: collapse; min-width: 68mm; }
table.bl-totals td { font-size: 8.4pt; padding: 3.5px 9px; border: 1px solid var(--rule); }
table.bl-totals td.k { border-right: 0; }
table.bl-totals td.c { width: 8px; text-align: center; border-left: 0; border-right: 0; }
table.bl-totals td.v { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; border-left: 0; }
table.bl-totals tr.grand td { font-weight: 700; font-size: 9.4pt; border-top: 1.6px solid var(--rule); }

/* ── Note + signatures ───────────────────────────────────────── */
.bl-note { margin-top: 10px; break-after: avoid; page-break-after: avoid; font-size: 8pt; line-height: 1.45; break-inside: avoid; page-break-inside: avoid; }
.bl-note b { font-weight: 700; }
.bl-signs { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-top: 12px; break-inside: avoid; page-break-inside: avoid; }
.bl-sign { flex: 0 0 45%; font-size: 8pt; font-weight: 700; text-decoration: underline; }
.bl-sign--right { text-align: right; }

/* ═══ RESPONSIVE ════════════════════════════════════════════════
   The A4 sheet is fixed at 210mm, which on a phone means a 2.5x
   horizontal scroll of the whole document. Below 860px the sheet
   becomes fluid, the header and the two boxes stack, and only the
   PRODUCT TABLE keeps a horizontal scroll — it is the one element
   whose seven columns cannot be narrowed without becoming a lie
   about the numbers. The filler row collapses so a short delivery
   does not leave 78mm of blank scroll on a phone.
   ═══════════════════════════════════════════════════════════════ */
@media screen and (max-width: 860px) {
    html, body { background: #fff; }
    .bl-page { width: 100%; max-width: 100%; min-height: 0; margin: 0; padding: 14px 12px 28px; box-shadow: none; font-size: 10pt; }

    .bl-head { flex-direction: column-reverse; gap: 10px; }
    .bl-brand { text-align: left; width: 100%; }
    .bl-logo { margin-left: 0; height: 76px; max-width: 70vw; }
    .bl-pageno { margin-top: 4px; }
    .bl-co-grid { grid-template-columns: minmax(0,1fr); font-size: 8.6pt; }
    .bl-co-addr, .bl-site { font-size: 8.6pt; }

    .bl-docline { text-align: left; }
    .bl-parties { flex-direction: column; gap: 8px; }
    .bl-client { flex: none; }
    .bl-kv { font-size: 9pt; }
    .bl-kv dt { flex: 0 0 92px; }
    .bl-remark { min-height: 46px; }
    .bl-webref { text-align: left; }

    /* Seven numeric columns stay readable by scrolling, never by shrinking. */
    .bl-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 -12px; padding: 0 12px; }
    .bl-scroll table.bl-table { min-width: 620px; }
    table.bl-table th { font-size: 8pt; }
    table.bl-table td { font-size: 8.4pt; padding: 4px; }
    .bl-filler td { height: 0; padding: 0; }

    .bl-bottom { flex-direction: column; gap: 10px; }
    table.bl-tax, table.bl-totals { width: 100%; min-width: 0; }
    table.bl-tax th, table.bl-tax td, table.bl-totals td { font-size: 8.6pt; padding: 5px 8px; }

    .bl-signs { gap: 20px; }
    .bl-sign { font-size: 9pt; }
}
@media screen and (max-width: 420px) {
    .bl-kv { flex-direction: column; }
    .bl-kv dt { flex: none; }
    .bl-kv dd::before { content: ''; }
    .bl-signs { flex-direction: column; gap: 14px; }
    .bl-sign, .bl-sign--right { flex: none; text-align: left; }
}

/* ── Print ───────────────────────────────────────────────────── */
/*
 * ── PAGE NUMBERING LIVES IN PHP, NOT IN CSS ───────────────────────────────────────────────────
 * The obvious CSS — `@page { @top-right { content: "Page " counter(page) " / " counter(pages) } }`
 * — is dead code in BOTH engines this document renders through: DomPDF (the PDF the business
 * actually sends, via Barryvdh\DomPDF) has no margin-box support, and neither does Chrome's print
 * path. It would have produced a header that silently never appeared.
 *
 * DomPDF's supported mechanism is page_text() from an inline PHP block, which stamps every sheet
 * and is what the block at the end of this file uses. The browser path has no equivalent, so it
 * keeps the static label — correct there because the adaptive filler above keeps a normal delivery
 * on one sheet.
 */
@page { size: A4 portrait; margin: 10mm; }
@media print {
    html, body { margin: 0; padding: 0; background: #fff; }
    .bl-toolbar { display: none !important; }
    .bl-page { width: auto; max-width: none; min-height: 0; margin: 0; padding: 0; box-shadow: none; font-size: 9pt; }
    .bl-scroll { overflow: visible; margin: 0; padding: 0; }
    .bl-scroll table.bl-table { min-width: 0; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
</style>

@if(!$isPdf)
<div class="bl-toolbar">
    <button type="button" class="bl-btn" onclick="window.print()">Imprimer</button>
    <a class="bl-btn bl-btn--ghost" href="{{ $backUrl ?? url()->previous() }}">← Retour</a>
</div>
@endif

<div class="bl-page">

    {{-- ── HEADER ──────────────────────────────────────────────── --}}
    <div class="bl-head">
        <div class="bl-co">
            <div class="bl-co-name">{{ $coordonnee->abbreviation ?? $coordonnee->designation_fr ?? 'SOBITAS' }}</div>
            @if(!empty($coordonnee?->adresse_fr))
                <div class="bl-co-addr">{{ $coordonnee->adresse_fr }}</div>
            @endif
            <div class="bl-co-grid">
                <div class="bl-idline"><b>Rc</b><span>: {{ $coordonnee->registre_commerce ?? '' }}</span></div>
                <div class="bl-idline"><b>Tva</b><span>: {{ $coordonnee->matricule ?? '' }}</span></div>
                <div class="bl-idline"><b>Tél</b><span>: {{ $coordonnee->phone_1 ?? '' }}{{ !empty($coordonnee?->phone_2) ? ' / '.$coordonnee->phone_2 : '' }}</span></div>
                <div class="bl-idline"><b>Fax</b><span>: {{ $coordonnee->fax ?? '' }}</span></div>
                <div class="bl-idline wide"><b>Email</b><span>: {{ $coordonnee->email ?? '' }}</span></div>
                <div class="bl-idline wide"><b>R.I.B</b><span>: {{ $coordonnee->rib ?? '' }}</span></div>
            </div>
        </div>
        <div class="bl-brand">
            @if($logoUrl)
                <img src="{{ $logoUrl }}" alt="{{ $coordonnee->abbreviation ?? 'SOBITAS' }}" class="bl-logo">
            @else
                <div class="bl-logo-text">SOBITAS</div>
            @endif
            <div class="bl-site">www.protein.tn</div>
            @if(!$isPdf)<div class="bl-pageno">Page 1</div>@endif
        </div>
    </div>

    {{-- ── DOCUMENT TITLE ──────────────────────────────────────── --}}
    <div class="bl-docline">
        <div class="bl-doctitle">Bon de livraison {{ $facture->numero ?? '' }}</div>
        <div class="bl-docdate">Date : {{ $dateStr }}</div>
    </div>

    {{-- ── CLIENT | PAYMENT ────────────────────────────────────── --}}
    <div class="bl-parties">
        <div class="bl-client">
            <dl style="margin:0">
                <div class="bl-kv"><dt>Code</dt><dd>{{ $cCode }}</dd></div>
                <div class="bl-kv"><dt>Raison Social</dt><dd>{{ $printClient?->name }}</dd></div>
                <div class="bl-kv"><dt>Adresse</dt><dd>{{ $clientAddress }}</dd></div>
                <div class="bl-kv"><dt>Code TVA</dt><dd>{{ $cMf }}</dd></div>
                <div class="bl-kv"><dt>Ville</dt><dd>{{ $cVille }}</dd></div>
                <div class="bl-kv"><dt>Téléphone</dt><dd>{{ implode(' / ', $cPhones) }}</dd></div>
                <div class="bl-kv"><dt>E-Mail</dt><dd>{{ $printClient?->email }}</dd></div>
            </dl>
        </div>
        <div class="bl-payside">
            <div class="bl-payhead">Modalité de Paiement : Paiement à la livraison</div>
            <div class="bl-remark">
                Remarque :
                @if(!empty($facture->aramex_hawb))<br>N° suivi Aramex : {{ $facture->aramex_hawb }}@endif
            </div>
        </div>
    </div>

    @if(!empty($facture->numero_commande ?? $facture->commande_id ?? null))
    <div class="bl-webref">N°Commande Web : {{ $facture->numero_commande ?? $facture->commande_id }}</div>
    @endif

    {{-- ── PRODUCTS ────────────────────────────────────────────── --}}
    <div class="bl-scroll">
    <table class="bl-table">
        <colgroup>
            @if($showRef)<col style="width:16%">@endif
            <col style="width:{{ $showRef ? 34 : 50 }}%">
            <col style="width:9%">
            <col style="width:10%">
            <col style="width:9%">
            <col style="width:11%">
            <col style="width:11%">
        </colgroup>
        <thead>
            <tr>
                @if($showRef)<th class="c-left">Réf. Art.</th>@endif
                <th class="c-left">Désignation</th>
                <th>Qte</th>
                <th>P.U.H.T</th>
                <th>T.V.A</th>
                <th>P.U.T.T.C</th>
                <th>TOT.T.T.C</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $row)
            <tr>
                @if($showRef)<td class="c-left c-ref">{{ $row['ref'] }}</td>@endif
                <td class="c-left c-prod">{{ $row['produit'] }}</td>
                <td class="c-right">{{ $row['qte'] }}</td>
                <td class="c-right">{{ $fmt($row['pu']) }}</td>
                <td class="c-right">{{ number_format($row['tva'], 3, '.', ' ') }}</td>
                <td class="c-right">{{ $fmt($row['pu_ttc']) }}</td>
                <td class="c-right">{{ $fmt($row['total']) }}</td>
            </tr>
            @endforeach
            @if(empty($rows))
            <tr><td colspan="{{ $colCount }}" class="bl-empty">Aucune ligne de produit.</td></tr>
            @endif
            <tr class="bl-filler" aria-hidden="true"><td colspan="{{ $colCount }}" style="height:{{ $fillerMm }}mm"></td></tr>
        </tbody>
    </table>
    </div>

    {{-- ── TAX RECAP | TOTALS ──────────────────────────────────── --}}
    <div class="bl-bottom">
        <div>
            @if(count($taxBuckets))
            <table class="bl-tax">
                <thead>
                    <tr><th>Taxe</th><th>Taux</th><th>Base</th><th>Montant</th></tr>
                </thead>
                <tbody>
                    @foreach($taxBuckets as $rate => $b)
                    <tr>
                        <td>TVA {{ number_format((float) $rate, 2, '.', '') }} %</td>
                        <td>{{ number_format((float) $rate, 2, '.', '') }} %</td>
                        <td>{{ $fmt($b['base']) }}</td>
                        <td>{{ $fmt($b['montant']) }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @endif
        </div>
        <table class="bl-totals">
            <tr><td class="k">Total H.T.</td><td class="c">:</td><td class="v">{{ $fmt($blTotalHt) }}</td></tr>
            @if($blManualRem > 0)
            <tr><td class="k">Remise</td><td class="c">:</td><td class="v">− {{ $fmt($blManualRem) }}</td></tr>
            @endif
            @if($blCouponHt > 0)
            <tr><td class="k">Code promo{{ $blCouponCode ? ' ('.$blCouponCode.')' : '' }}</td><td class="c">:</td><td class="v">− {{ $fmt($blCouponHt) }}</td></tr>
            @endif
            <tr><td class="k">Tot. Tva</td><td class="c">:</td><td class="v">{{ $fmt($totTva) }}</td></tr>
            @if($frais > 0)
            <tr><td class="k">Frais de livraison</td><td class="c">:</td><td class="v">{{ $fmt($frais) }}</td></tr>
            @endif
            <tr><td class="k">Timbre</td><td class="c">:</td><td class="v">{{ $fmt($timbre) }}</td></tr>
            <tr class="grand"><td class="k">Net à Payer</td><td class="c">:</td><td class="v">{{ $fmt($netAPayer) }}</td></tr>
        </table>
    </div>

    {{-- ── NOTE ────────────────────────────────────────────────── --}}
    <div class="bl-note">
        {{ $noteLead }}<br>
        <b id="bl-words">…</b>
    </div>
    <input type="hidden" id="bl-total-val" value="{{ $netAPayer }}">

    {{-- ── SIGNATURES ──────────────────────────────────────────── --}}
    <div class="bl-signs">
        <div class="bl-sign">Signature Client</div>
        <div class="bl-sign bl-sign--right">Signature et Cachet</div>
    </div>

</div>

{{-- ── Amount in words ─────────────────────────────────────────── --}}
<script>
(function () {
    var el    = document.getElementById('bl-total-val');
    var words = document.getElementById('bl-words');
    if (!el || !words) return;
    var a = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf',
             'dix','onze','douze','treize','quatorze','quinze','seize',
             'dix-sept','dix-huit','dix-neuf'];
    var b = ['','','vingt','trente','quarante','cinquante',
             'soixante','soixante-dix','quatre-vingt','quatre-vingt-dix'];
    function tens(n) {
        if (n < 20) return a[n];
        var hi = Math.floor(n / 10), lo = n % 10;
        if (hi === 7 || hi === 9) {
            // 70s built on 'soixante', 90s on 'quatre-vingt', each + a teen (dix..dix-neuf).
            var base = b[hi - 1];
            if (lo === 1 && hi === 7) return base + ' et ' + a[11]; // soixante et onze
            return base + '-' + a[10 + lo];                          // e.g. 92 → quatre-vingt-douze
        }
        if (hi === 8) return lo === 0 ? 'quatre-vingts' : 'quatre-vingt-' + a[lo];
        if (lo === 0) return b[hi];
        if (lo === 1) return b[hi] + ' et ' + a[1];                  // vingt et un … soixante et un
        return b[hi] + '-' + a[lo];
    }
    function hundreds(n) {
        var h = Math.floor(n / 100), t = n % 100, s = '';
        if (h > 1) s += a[h] + ' cent'; else if (h === 1) s += 'cent';
        if (t > 0) s += (h > 0 ? ' ' : '') + tens(t); else if (h > 1) s += 's';
        return s.trim();
    }
    function toFr(num) {
        num = Math.abs(num);
        var dinars = Math.floor(num), millimes = Math.round((num - dinars) * 1000), parts = [];
        if (dinars === 0) { parts.push('zéro'); }
        else {
            var M = Math.floor(dinars / 1000000), K = Math.floor((dinars % 1000000) / 1000), R = dinars % 1000;
            if (M > 0) parts.push(hundreds(M) + ' million' + (M > 1 ? 's' : ''));
            if (K > 0) parts.push((K === 1 ? 'mille' : hundreds(K) + ' mille'));
            if (R > 0) parts.push(hundreds(R));
        }
        var result = parts.join(' ') + ' Dinar' + (dinars > 1 ? 's' : '');
        if (millimes > 0) result += ' ' + hundreds(millimes).charAt(0).toUpperCase() + hundreds(millimes).slice(1) + ' Millime' + (millimes > 1 ? 's' : '');
        return result.charAt(0).toUpperCase() + result.slice(1);
    }
    words.textContent = toFr(parseFloat(el.value) || 0);
})();
</script>

@if($isPdf)
{{-- DomPDF stamps "Page N / M" on every sheet; {PAGE_NUM}/{PAGE_COUNT} are its own placeholders.
     x/y are points from the top-left of the A4 sheet, landing in the header's right-hand slot. --}}
<script type="text/php">
    if (isset($pdf)) {
        $pdf->page_text(468, 58, "Page {PAGE_NUM} / {PAGE_COUNT}", $fontMetrics->getFont("Arial", "normal"), 7.6, [0, 0, 0]);
    }
</script>
@endif

</body>
</html>
