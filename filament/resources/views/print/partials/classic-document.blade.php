{{--
    ══ CLASSIC A4 DOCUMENT — FACTURE / DEVIS ══════════════════════════════════════════════════════
    The bon de livraison's classic administrative form (print/bon-de-livraison.blade.php), applied to
    the invoice and the quote: monochrome rules and type, identity block left and SOBITAS mark right,
    title + date right-aligned, framed client box beside the payment terms, one tall ruled product
    grid, tax recap beside a framed totals table, the amount in words, two signature lines.

    ── WHY TABLES AND NOT FLEX/GRID ─────────────────────────────────────────────────────────────────
    These two documents are not only printed from the browser: DocumentPdfController and the
    FactureTvaSent / QuotationSent mails render them through DomPDF, and that PDF is what the customer
    receives. DomPDF has no flexbox, no CSS grid, no custom properties and no JavaScript. Every layout
    here is a table, every colour a literal, and the amount in words comes from
    App\Support\AmountInWords — so the e-mailed PDF and the browser print are the same document.

    ── WHAT THE CALLER PASSES ($doc) ──────────────────────────────────────────────────────────────
    kind, title, numero, date, subtitle?, isPdf, backUrl?, company, logoUrl?,
    client  [code, name, address, mf, ville, phones, email],
    payHead (string), remarks (list of strings),
    rows    [n, produit, qte, pu_ht, tva, pu_ttc, total_ht, montant_tva, total_ttc],
    taxBuckets  [rate => [base, montant]],
    totals  [[label, value (float), sign ('' | '-'), grand (bool)]],
    noteLead, words, extraNotes (list of strings),
    signLeft?, signLeftNote?, signRight
    All money is formatted HERE, from floats, so the two documents cannot drift apart in format.
--}}
@php
    $isPdf   = ! empty($doc['isPdf']);
    $co      = $doc['company'] ?? null;
    $fmt     = static fn ($n): string => number_format((float) $n, 3, '.', ' ');
    $rateTxt = static function ($r): string {
        $r = (float) $r;
        return ($r == floor($r) ? (string) (int) $r : rtrim(rtrim(number_format($r, 2, '.', ''), '0'), '.')).' %';
    };

    /* Same company heading rule as the bon de livraison: the abbreviation, else SOBITAS; the legal
       name moves to the identity grid when it differs, beside the Rc and the matricule fiscal. */
    $coName  = trim((string) ($co->abbreviation ?? ''));
    $coName  = $coName !== '' ? $coName : 'SOBITAS';
    $coLegal = trim((string) ($co->designation_fr ?? ''));
    $phones  = trim(($co->phone_1 ?? '').(! empty($co?->phone_2) ? ' / '.$co->phone_2 : ''));

    $rows       = $doc['rows'] ?? [];
    $taxBuckets = $doc['taxBuckets'] ?? [];
    $totals     = $doc['totals'] ?? [];
    $client     = $doc['client'] ?? [];
    $remarks    = array_values(array_filter($doc['remarks'] ?? [], fn ($r) => trim((string) $r) !== ''));
    $extraNotes = array_values(array_filter($doc['extraNotes'] ?? [], fn ($r) => trim((string) $r) !== ''));

    /*
     * ── HOW TALL THE EMPTY PART OF THE GRID IS ────────────────────────────────────────────────
     * Same idea as the bon de livraison: the ruled grid runs to a fixed depth whatever the document
     * contains, so it reads as a pre-printed form — but the filler is the REMAINDER, never a
     * constant, so a long invoice does not push its totals and signatures onto a second sheet.
     *
     * Rows are estimated in printed LINES, not in rows: a long product name wraps in the
     * Désignation column (≈ 40 characters per line at 7.9pt in 30% of the sheet), and a fixed
     * per-row height would under-count exactly the documents that are already long. The frame also
     * gives back depth for every totals row beyond the delivery note's five, and for every extra
     * note line, because those blocks sit under the grid on the same sheet.
     */
    $linesUsed = 0;
    foreach ($rows as $r) {
        $linesUsed += max(1, (int) ceil(mb_strlen((string) ($r['produit'] ?? '')) / 40));
    }
    $gridMm   = count($rows) * 2.2 + $linesUsed * 3.6;          // padding per row + text lines
    $frameMm  = 92.0
        - max(0, count($totals) - 5) * 5.6
        - count($extraNotes) * 4.2
        - max(0, count($remarks) - 2) * 3.6;
    $fillerMm = round(max(0.0, $frameMm - $gridMm), 1);

    $cols = [
        ['label' => 'N°',        'w' => 4,  'cls' => 'c'],
        ['label' => 'Désignation', 'w' => 30, 'cls' => 'l'],
        ['label' => 'Qté',       'w' => 6,  'cls' => 'c'],
        ['label' => 'P.U.H.T',   'w' => 10, 'cls' => 'c'],
        ['label' => 'T.V.A',     'w' => 6,  'cls' => 'c'],
        ['label' => 'P.U.T.T.C', 'w' => 10, 'cls' => 'c'],
        ['label' => 'TOT.H.T',   'w' => 11, 'cls' => 'c'],
        ['label' => 'MNT.T.V.A', 'w' => 10, 'cls' => 'c'],
        ['label' => 'TOT.T.T.C', 'w' => 13, 'cls' => 'c'],
    ];
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <title>{{ $doc['title'] }} {{ $doc['numero'] }}</title>
<style>
/* ═══════════════════════════════════════════════════════════════
   {{ strtoupper($doc['title']) }} — SOBITAS — classic administrative form
   Monochrome rules and type; the logo is the only colour.
   ═══════════════════════════════════════════════════════════════ */
@page { size: A4 portrait; margin: 10mm; }
/* No « margin » on html: DomPDF applies the @page margin THROUGH the root element, so zeroing it
   here printed the PDF edge to edge (measured on the first render). Chrome's html margin is 0 anyway. */
html { padding: 0; }
body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    font-size: 9pt;
    line-height: 1.3;
    background: #f2f2f2;
    /* A client name that starts with an Arabic character must not flip the line's direction. */
    direction: ltr;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
body.is-pdf { background: #fff; }
table { border-collapse: collapse; border-spacing: 0; }
td, th { vertical-align: top; }

/* Toolbar (screen only — never rendered in the PDF) */
.cl-toolbar { text-align: center; padding: 14px 0 6px; }
.cl-btn {
    display: inline-block; padding: 9px 20px; margin: 0 4px; border: 1px solid #000; background: #000;
    color: #fff; font-weight: bold; font-size: 10pt; cursor: pointer; text-decoration: none;
    font-family: Arial, Helvetica, sans-serif;
}
.cl-btn--ghost { background: #fff; color: #000; }

.cl-page {
    width: 210mm; min-height: 297mm; margin: 16px auto; padding: 10mm 10mm 12mm;
    background: #fff; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
    /* The sheet on screen is exactly A4 wide, padding included, like the bon de livraison's. */
    box-sizing: border-box;
}
/* 0.6mm side gutter in print and PDF: a collapsed outer border is centred on the box edge, and
   Chrome clips the half that falls past the page's content area — the right-hand rules vanished. */
body.is-pdf .cl-page { width: auto; min-height: 0; margin: 0; padding: 0 0.6mm; box-shadow: none; }

/* ── Header ──────────────────────────────────────────────────── */
table.cl-head { width: 100%; }
table.cl-head td { padding: 0; }
.cl-co-name { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; }
.cl-co-addr { font-size: 7.6pt; margin: 1px 0 3px; }
table.cl-id td { font-size: 7.6pt; padding: 0 0 0.6px 0; }
table.cl-id td.k { width: 26mm; white-space: nowrap; }
td.cl-brand { text-align: right; width: 66mm; }
.cl-logo { height: 46px; width: auto; max-width: 62mm; }
.cl-logo-text { font-size: 19pt; font-weight: bold; }
.cl-site { font-size: 7.2pt; margin-top: 3px; }

/* ── Title ───────────────────────────────────────────────────── */
.cl-docline { text-align: right; margin-top: 9px; }
.cl-doctitle { font-size: 12.5pt; font-weight: bold; }
.cl-docsub { font-size: 7.6pt; font-style: italic; margin-top: 1px; }
.cl-docdate { font-size: 8pt; margin-top: 1px; }

/* ── Client | payment ────────────────────────────────────────── */
table.cl-parties { width: 100%; margin-top: 6px; }
td.cl-client { width: 47%; border: 1px solid #000; padding: 6px 9px; }
td.cl-gap { width: 12px; padding: 0; }
td.cl-payside { padding: 0; }
table.cl-kv { width: 100%; }
table.cl-kv td { font-size: 7.9pt; padding: 1.4px 0; }
table.cl-kv td.k { width: 25mm; font-weight: bold; white-space: nowrap; }
.cl-payhead { font-size: 8.6pt; font-weight: bold; padding: 0 0 6px; }
.cl-remark { border: 1px solid #000; padding: 6px 9px; font-size: 7.9pt; min-height: 25mm; }
.cl-remark-line { padding: 1px 0; }

/* ── Products ────────────────────────────────────────────────── */
/* One tall ruled grid: header in a light tint AND bold AND framed, so it survives a mono copier. */
.cl-scroll { margin-top: 5px; }
table.cl-lines { width: 100%; table-layout: fixed; }
table.cl-lines th {
    background: #ececec; font-size: 7.3pt; font-weight: bold; padding: 4px 2px;
    border: 1px solid #000; text-align: center; white-space: nowrap;
}
table.cl-lines th.l { text-align: left; padding-left: 5px; }
table.cl-lines td {
    font-size: 7.9pt; padding: 3.5px 4px;
    border-left: 1px solid #000; border-right: 1px solid #000;
}
table.cl-lines td.c { text-align: center; white-space: nowrap; }
table.cl-lines td.l { text-align: left; }
table.cl-lines td.prod { line-height: 1.25; word-wrap: break-word; }
table.cl-lines tr.cl-filler td { padding: 0; border-bottom: 1px solid #000; }
table.cl-lines tr { page-break-inside: avoid; }
table.cl-lines thead { display: table-header-group; }
.cl-empty { font-style: italic; text-align: center; padding: 10px; }

/* ── Tax recap | totals ──────────────────────────────────────── */
table.cl-bottom { width: 100%; margin-top: 6px; page-break-inside: avoid; }
table.cl-bottom td.cl-bl { padding: 0; }
/* Fixed-width totals column: DomPDF ignores « margin-left: auto » on a table, so the right edge is
   pinned by the cell, identically in the browser and in the PDF. */
table.cl-bottom td.cl-br { padding: 0; width: 80mm; }
table.cl-tax th, table.cl-tax td {
    border: 1px solid #000; font-size: 7.4pt; padding: 2px 8px; text-align: center; white-space: nowrap;
}
table.cl-tax th { background: #ececec; font-weight: bold; }
table.cl-totals { width: 100%; }
table.cl-totals td { font-size: 8.4pt; padding: 3.4px 9px; border-top: 1px solid #000; border-bottom: 1px solid #000; }
table.cl-totals td.k { border-left: 1px solid #000; text-align: left; white-space: nowrap; }
table.cl-totals td.s { width: 8px; padding-left: 0; padding-right: 0; text-align: center; }
table.cl-totals td.v { border-right: 1px solid #000; text-align: right; white-space: nowrap; }
table.cl-totals tr.grand td { font-weight: bold; font-size: 9.4pt; border-top: 1.6px solid #000; }

/* ── Note + signatures ───────────────────────────────────────── */
.cl-note { margin-top: 10px; font-size: 8pt; line-height: 1.45; page-break-inside: avoid; }
.cl-note b { font-weight: bold; }
.cl-extra { margin-top: 5px; font-size: 7.6pt; line-height: 1.4; }
table.cl-signs { width: 100%; margin-top: 12px; page-break-inside: avoid; }
table.cl-signs td { width: 50%; font-size: 8pt; padding: 0; }
.cl-sign { font-weight: bold; text-decoration: underline; }
.cl-sign-note { font-size: 7.2pt; margin-top: 2px; }
td.cl-sign-right { text-align: right; }

/* ── Print (browser) ─────────────────────────────────────────── */
@media print {
    body { background: #fff; }
    .cl-toolbar { display: none; }
    .cl-page { width: auto; min-height: 0; margin: 0; padding: 0 0.6mm; box-shadow: none; }
}
</style>
@unless($isPdf)
{{-- Screen-only rules, NOT emitted in the PDF: DomPDF evaluates width media queries against the
     paper, and an A4 sheet (793px at 96 dpi) would match a « max-width: 860px » phone rule. --}}
<style>
@media screen and (max-width: 860px) {
    body { background: #fff; }
    .cl-page { width: 100%; min-height: 0; margin: 0; padding: 14px 12px 28px; box-shadow: none; box-sizing: border-box; }
    /* Nine numeric columns stay readable by scrolling, never by shrinking. */
    .cl-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .cl-scroll table.cl-lines { min-width: 700px; }
    td.cl-brand { width: auto; }
}
</style>
@endunless
</head>
<body class="{{ $isPdf ? 'is-pdf' : '' }}">

@unless($isPdf)
<div class="cl-toolbar">
    <button type="button" class="cl-btn" onclick="window.print()">Imprimer</button>
    <a class="cl-btn cl-btn--ghost" href="{{ $doc['backUrl'] ?? url()->previous() }}">&larr; Retour</a>
</div>
@endunless

<div class="cl-page">

    {{-- ── HEADER ──────────────────────────────────────────────── --}}
    <table class="cl-head">
        <tr>
            <td>
                <div class="cl-co-name">{{ $coName }}</div>
                @if(! empty($co?->adresse_fr))
                    <div class="cl-co-addr">{{ $co->adresse_fr }}</div>
                @endif
                <table class="cl-id">
                    @if($coLegal !== '' && mb_strtoupper($coLegal) !== mb_strtoupper($coName))
                        <tr><td class="k">Raison sociale</td><td>: {{ $coLegal }}</td></tr>
                    @endif
                    <tr><td class="k">Rc</td><td>: {{ $co->registre_commerce ?? '' }}</td></tr>
                    <tr><td class="k">Matricule fiscal</td><td>: {{ $co->matricule ?? '' }}</td></tr>
                    <tr><td class="k">Tél</td><td>: {{ $phones }}</td></tr>
                    <tr><td class="k">Email</td><td>: {{ $co->email ?? '' }}</td></tr>
                    <tr><td class="k">R.I.B</td><td>: {{ $co->rib ?? '' }}</td></tr>
                </table>
            </td>
            <td class="cl-brand">
                @if(! empty($doc['logoUrl']))
                    <img src="{{ $doc['logoUrl'] }}" alt="{{ $coName }}" class="cl-logo">
                @else
                    <div class="cl-logo-text">SOBITAS</div>
                @endif
                <div class="cl-site">www.protein.tn</div>
            </td>
        </tr>
    </table>

    {{-- ── DOCUMENT TITLE ──────────────────────────────────────── --}}
    <div class="cl-docline">
        <div class="cl-doctitle">{{ $doc['title'] }} N° {{ $doc['numero'] }}</div>
        @if(! empty($doc['subtitle']))
            <div class="cl-docsub">{{ $doc['subtitle'] }}</div>
        @endif
        <div class="cl-docdate">Date : {{ $doc['date'] }}</div>
    </div>

    {{-- ── CLIENT | PAYMENT ────────────────────────────────────── --}}
    <table class="cl-parties">
        <tr>
            <td class="cl-client">
                <table class="cl-kv">
                    <tr><td class="k">Code</td><td>: {{ $client['code'] ?? '' }}</td></tr>
                    <tr><td class="k">Raison sociale</td><td>: {{ $client['name'] ?? '' }}</td></tr>
                    <tr><td class="k">Adresse</td><td>: {{ $client['address'] ?? '' }}</td></tr>
                    <tr><td class="k">Matricule fiscal</td><td>: {{ $client['mf'] ?? '' }}</td></tr>
                    <tr><td class="k">Ville</td><td>: {{ $client['ville'] ?? '' }}</td></tr>
                    <tr><td class="k">Téléphone</td><td>: {{ $client['phones'] ?? '' }}</td></tr>
                    <tr><td class="k">E-mail</td><td>: {{ $client['email'] ?? '' }}</td></tr>
                </table>
            </td>
            <td class="cl-gap"></td>
            <td class="cl-payside">
                <div class="cl-payhead">{{ $doc['payHead'] ?? '' }}</div>
                <div class="cl-remark">
                    Remarque :
                    @foreach($remarks as $remark)
                        <div class="cl-remark-line">{{ $remark }}</div>
                    @endforeach
                </div>
            </td>
        </tr>
    </table>

    {{-- ── PRODUCTS ────────────────────────────────────────────── --}}
    <div class="cl-scroll">
    <table class="cl-lines">
        <thead>
            <tr>
                @foreach($cols as $col)
                    <th class="{{ $col['cls'] === 'l' ? 'l' : '' }}" style="width:{{ $col['w'] }}%">{{ $col['label'] }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $row)
            <tr>
                <td class="c">{{ $row['n'] }}</td>
                <td class="l prod">{{ $row['produit'] }}</td>
                <td class="c">{{ $row['qte'] }}</td>
                <td class="c">{{ $fmt($row['pu_ht']) }}</td>
                <td class="c">{{ $rateTxt($row['tva']) }}</td>
                <td class="c">{{ $fmt($row['pu_ttc']) }}</td>
                <td class="c">{{ $fmt($row['total_ht']) }}</td>
                <td class="c">{{ $fmt($row['montant_tva']) }}</td>
                <td class="c">{{ $fmt($row['total_ttc']) }}</td>
            </tr>
            @endforeach
            @if(empty($rows))
            <tr><td colspan="9" class="cl-empty">Aucune ligne de produit.</td></tr>
            @endif
            {{-- The column rules run on to the bottom of the frame: one cell per column, not a
                 colspan, so the empty part still reads as the ruled grid of a pre-printed form. --}}
            <tr class="cl-filler" aria-hidden="true">
                @foreach($cols as $col)
                    <td style="height:{{ $fillerMm }}mm"></td>
                @endforeach
            </tr>
        </tbody>
    </table>
    </div>

    {{-- ── TAX RECAP | TOTALS ──────────────────────────────────── --}}
    <table class="cl-bottom">
        <tr>
            <td class="cl-bl">
                @if(count($taxBuckets))
                <table class="cl-tax">
                    <thead><tr><th>Taxe</th><th>Taux</th><th>Base</th><th>Montant</th></tr></thead>
                    <tbody>
                        @foreach($taxBuckets as $rate => $b)
                        <tr>
                            <td>TVA {{ $rateTxt($rate) }}</td>
                            <td>{{ $rateTxt($rate) }}</td>
                            <td>{{ $fmt($b['base']) }}</td>
                            <td>{{ $fmt($b['montant']) }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
                @endif
            </td>
            <td class="cl-br">
                <table class="cl-totals">
                    @foreach($totals as $t)
                    <tr class="{{ ! empty($t['grand']) ? 'grand' : '' }}">
                        <td class="k">{{ $t['label'] }}</td>
                        <td class="s">:</td>
                        <td class="v">{{ ($t['sign'] ?? '') === '-' ? '- ' : '' }}{{ $fmt($t['value']) }}</td>
                    </tr>
                    @endforeach
                </table>
            </td>
        </tr>
    </table>

    {{-- ── AMOUNT IN WORDS ─────────────────────────────────────── --}}
    <div class="cl-note">
        {{ $doc['noteLead'] }}<br>
        <b>{{ $doc['words'] }}</b>
        @foreach($extraNotes as $line)
            <div class="cl-extra">{{ $line }}</div>
        @endforeach
    </div>

    {{-- ── SIGNATURES ──────────────────────────────────────────── --}}
    <table class="cl-signs">
        <tr>
            <td>
                @if(! empty($doc['signLeft']))
                    <div class="cl-sign">{{ $doc['signLeft'] }}</div>
                    @if(! empty($doc['signLeftNote']))<div class="cl-sign-note">{{ $doc['signLeftNote'] }}</div>@endif
                @endif
            </td>
            <td class="cl-sign-right">
                <div class="cl-sign">{{ $doc['signRight'] ?? 'Signature et Cachet' }}</div>
            </td>
        </tr>
    </table>

</div>
</body>
</html>
