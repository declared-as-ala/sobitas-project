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

    $logoUrl = \App\Support\PrintLogo::resolve($coordonnee ?? null);

    /* ── Client (delivery recipient) ──────────────────────────── */
    $printClient   = $client ?? $facture->client ?? null;
    // Null-safe throughout: a facture with no client must render (an empty CLIENT block), never
    // 500 on "Attempt to read property on null".
    $clientAddress = trim((string) ($facture->formatted_delivery_address ?? '')) !== ''
        ? $facture->formatted_delivery_address
        : ($printClient?->adresse ?? '');
    $cPhones = array_values(array_filter([$printClient?->phone_1, $printClient?->phone_2]));
    $cRc     = $printClient?->registre_commerce;
    $cMf     = $printClient?->matricule;
    $cVille  = $printClient?->ville ?? null;

    /* ── Totals ───────────────────────────────────────────────── */
    $frais         = (float) ($calc_frais ?? $facture->frais_livraison ?? 0);
    $netAPayer     = (float) ($calc_net_a_payer ?? max((float) ($facture->prix_ttc ?? 0), 0));
    $blTotalHt     = (float) ($calc_total_ht ?? $facture->prix_ht ?? 0);
    $blRemiseTotal = (float) ($calc_remise ?? $facture->remise ?? 0);
    $blCouponHt    = (float) ($facture->discount_ht ?? 0);
    $blManualRem   = max(0.0, round($blRemiseTotal - $blCouponHt, 3));
    $blCouponCode  = $facture->coupon_code_snapshot ?? null;

    $dateStr = $documentDate ?? $facture->created_at?->format('d/m/Y');

    // Single amount lead-in for the NOTE: the company note if set (it already reads "… à la
    // somme de :"), otherwise a default — never both.
    $noteLead = trim((string) ($footerNote ?? ($coordonnee->note ?? '')));

    /*
     * ── TVA, DERIVED THE SAME WAY THE TVA INVOICE DERIVES IT ──────────────────────────────────
     * The classic delivery-note layout carries a per-line tax breakdown, so this view now shows
     * one. Nothing here is invented: the rate is the line's own `tva` when the row carries it and
     * the company's configured rate otherwise, which is exactly the precedence facture-tva.blade
     * uses (`(float) ($d->tva ?? $defTva)`, rate from `$coordonnee->tva`). Amounts are derived
     * from that rate, never stored twice, so the recap cannot disagree with the lines.
     *
     * The document TOTALS are untouched: `$netAPayer`, `$blTotalHt`, the remise, the coupon and
     * the shipping all keep the values they have always had. A delivery note that started
     * printing a different "net à payer" because its layout changed would be a billing bug
     * wearing a design change.
     */
    $tvaRate = (float) ($coordonnee->tva ?? 19);

    /* ── Rows ─────────────────────────────────────────────────── */
    $rows      = [];
    $taxBuckets = [];   // rate => ['base' => ht, 'montant' => tva]
    if (isset($details_facture)) {
        foreach ($details_facture as $i => $d) {
            $qte       = (float) ($d->qte ?? $d->quantite ?? 0);
            $pu        = (float) ($d->prix_unitaire ?? 0);
            $lineTotal = isset($d->prix_ttc) ? (float) $d->prix_ttc : $qte * $pu;
            $qteDisp   = ($qte == (int) $qte)
                ? (string) (int) $qte
                : rtrim(rtrim(number_format($qte, 3, '.', ''), '0'), '.');

            $lineTva  = (float) ($d->tva ?? $tvaRate);
            $puTtc    = round($pu * (1 + $lineTva / 100), 3);
            $baseHt   = round($pu * $qte, 3);
            $montTva  = round($baseHt * $lineTva / 100, 3);

            $key = (string) $lineTva;
            if (!isset($taxBuckets[$key])) $taxBuckets[$key] = ['base' => 0.0, 'montant' => 0.0];
            $taxBuckets[$key]['base']    += $baseHt;
            $taxBuckets[$key]['montant'] += $montTva;

            $rows[] = [
                'index'   => $i + 1,
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

    $tvaDisp = function ($r) { return ($r == floor($r)) ? (int) $r : $r; };
@endphp

<style>
/* ═══════════════════════════════════════════════════════════════
   BON DE LIVRAISON — SOBITAS
   Classic administrative form: monochrome rules and type, colour
   reserved for the logo alone.
   ═══════════════════════════════════════════════════════════════ */

/*
 * ── WHY THIS IS BLACK AND WHITE ────────────────────────────────────────────────────────────────
 * A delivery note is signed, stamped, photocopied and filed. The previous version leaned on an
 * orange accent for its title rule, its section bars, the grand-total row and a diagonal corner
 * motif — all of which survive a colour laser print and none of which survive the fax, the mono
 * office copier or the phone photo that this document actually lives through. Everything
 * structural is now carried by rules and weight, which reproduce at any fidelity, and the logo is
 * the only element allowed to carry colour.
 *
 * Practical consequence: no element depends on a background colour to be legible. The table header
 * is a light tint AND a heavier rule AND bold type, so it still reads as a header when a printer
 * drops backgrounds entirely (which "économie d'encre" mode does by default).
 */
:root {
    --ink:   #000;      /* body text and rules                    */
    --ink-2: #333;      /* secondary text                          */
    --ink-3: #666;      /* labels                                  */
    --rule:  #000;      /* table and box borders                   */
    --rule-2:#999;      /* interior separators                     */
    --tint:  #ebebeb;   /* header/label fill, prints as light grey  */
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

/* Page */
.bl-page {
    position: relative; width: 210mm; max-width: 210mm; min-height: 297mm; margin: 16px auto;
    padding: 12mm 12mm 14mm; background: #fff; font-size: 9.5pt; line-height: 1.35;
    box-shadow: 0 2px 10px rgba(0,0,0,0.18);
}

/* ── Header: company block | logo ─────────────────────────────── */
.bl-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; }
.bl-co-name { font-size: 12pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.01em; margin-bottom: 3px; }
.bl-co-lines { font-size: 7.6pt; color: var(--ink-2); line-height: 1.5; }
.bl-co-grid { display: flex; flex-wrap: wrap; gap: 0 18px; }
.bl-co-grid span { white-space: nowrap; }
.bl-co-lines b { font-weight: 700; color: var(--ink); }
.bl-brand { text-align: right; flex: 0 0 auto; }
/* The one coloured element in the document. */
.bl-logo { height: 42px; width: auto; display: block; margin-left: auto; }
.bl-logo-text { font-size: 20pt; font-weight: 800; letter-spacing: -0.02em; }
.bl-site { font-size: 7.2pt; color: var(--ink-3); margin-top: 4px; letter-spacing: 0.06em; }

/* ── Document title ──────────────────────────────────────────── */
.bl-docline { display: flex; justify-content: flex-end; margin-top: 10px; }
.bl-docbox { text-align: right; }
.bl-doctitle { font-size: 13pt; font-weight: 700; }
.bl-docdate { font-size: 9pt; color: var(--ink-2); margin-top: 2px; }

/* ── Client / payment boxes ──────────────────────────────────── */
.bl-parties { display: flex; gap: 10px; margin-top: 10px; align-items: stretch; }
.bl-box { border: 1px solid var(--rule); padding: 7px 9px; }
.bl-box--client { flex: 0 0 52%; }
.bl-box--pay { flex: 1; display: flex; flex-direction: column; }
.bl-kv { display: flex; font-size: 8.4pt; padding: 1.5px 0; }
.bl-kv dt { flex: 0 0 88px; color: var(--ink-3); font-weight: 400; }
.bl-kv dd { margin: 0; color: var(--ink); font-weight: 600; word-break: break-word; }
.bl-kv dd::before { content: ': '; color: var(--ink-3); font-weight: 400; }
.bl-pay-head { font-size: 8.6pt; font-weight: 700; }
.bl-pay-remark { margin-top: 6px; border-top: 1px solid var(--rule-2); padding-top: 5px; font-size: 8.4pt; color: var(--ink-3); flex: 1; }
.bl-webref { text-align: right; font-size: 8.6pt; font-weight: 700; margin-top: 7px; }

/* ── Products table ──────────────────────────────────────────── */
table.bl-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px; }
table.bl-table th {
    background: var(--tint); color: var(--ink); font-size: 7.8pt; font-weight: 700;
    padding: 6px 5px; border: 1px solid var(--rule); text-align: center;
}
table.bl-table td {
    font-size: 8.4pt; color: var(--ink); padding: 4px 5px;
    border-left: 1px solid var(--rule); border-right: 1px solid var(--rule);
    vertical-align: top;
}
/* The body is one tall ruled box, as on a pre-printed form: only the outer frame and the column
   separators are drawn, so rows do not fragment the grid when the order is two lines long. */
table.bl-table tbody tr:last-child td { border-bottom: 0; }
table.bl-table tfoot td { border: 1px solid var(--rule); border-top: 1px solid var(--rule); padding: 0; height: 0; }
.bl-tablewrap { border-bottom: 1px solid var(--rule); }
table.bl-table .c-left { text-align: left; }
table.bl-table .c-center { text-align: center; }
table.bl-table .c-right { text-align: right; }
table.bl-table td.c-right, table.bl-table td.c-center { font-variant-numeric: tabular-nums; }
table.bl-table td.c-prod { line-height: 1.3; word-break: break-word; }
table.bl-table td.c-ref { font-size: 7.6pt; color: var(--ink-2); word-break: break-all; }
.bl-empty { color: var(--ink-3); font-style: italic; padding: 14px; text-align: center; }
table.bl-table thead { display: table-header-group; }
table.bl-table tr { break-inside: avoid; page-break-inside: avoid; }
/* Keeps the form looking like a form when the order is short. */
.bl-filler { height: 42mm; }

/* ── Bottom: tax recap (left) + totals (right) ───────────────── */
.bl-bottom { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-top: 10px; break-inside: avoid; page-break-inside: avoid; }
table.bl-tax { border-collapse: collapse; }
table.bl-tax th, table.bl-tax td { border: 1px solid var(--rule); font-size: 7.8pt; padding: 3px 8px; text-align: center; font-variant-numeric: tabular-nums; }
table.bl-tax th { background: var(--tint); font-weight: 700; }
table.bl-totals { border-collapse: collapse; min-width: 74mm; }
table.bl-totals td { font-size: 8.8pt; padding: 3.5px 9px; border: 1px solid var(--rule); }
table.bl-totals td.k { color: var(--ink-2); }
table.bl-totals td.c { width: 6px; color: var(--ink-3); text-align: center; }
table.bl-totals td.v { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
table.bl-totals tr.grand td { font-weight: 800; font-size: 10pt; border-top: 2px solid var(--rule); }

/* ── Note ────────────────────────────────────────────────────── */
.bl-note { margin-top: 10px; font-size: 8.6pt; line-height: 1.5; break-inside: avoid; page-break-inside: avoid; }
.bl-note b { font-weight: 700; }

/* ── Signatures ──────────────────────────────────────────────── */
.bl-signs { display: flex; justify-content: space-between; gap: 30px; margin-top: 12px; break-inside: avoid; page-break-inside: avoid; }
.bl-sign-box { flex: 0 0 44%; }
.bl-sign-label { font-size: 8.4pt; font-weight: 700; text-decoration: underline; }
.bl-sign-space { height: 22mm; border-bottom: 1px solid var(--rule-2); }
.bl-sign-box--right { text-align: right; }

/* ── Footer ──────────────────────────────────────────────────── */
.bl-footer { margin-top: 10px; border-top: 1px solid var(--rule-2); padding-top: 5px; display: flex; justify-content: space-between; font-size: 7.4pt; color: var(--ink-3); letter-spacing: 0.06em; }

/* ── Screen responsiveness (print preview on small screens) ──── */
@media screen and (max-width: 820px) {
    .bl-page { width: 100%; max-width: 100%; min-height: 0; margin: 0; padding: 16px 12px 30px; box-shadow: none; }
    .bl-head { flex-direction: column; gap: 12px; }
    .bl-brand { text-align: left; }
    .bl-logo { margin-left: 0; }
    .bl-docline { justify-content: flex-start; }
    .bl-docbox { text-align: left; }
    .bl-parties { flex-direction: column; }
    .bl-box--client { flex: none; }
    .bl-bottom { flex-direction: column; }
    table.bl-totals { width: 100%; min-width: 0; }
    .bl-filler { height: 0; }
    .bl-signs { flex-direction: column; gap: 16px; }
    .bl-sign-box { flex: none; }
    .bl-sign-box--right { text-align: left; }
}

/* ── Print (A4 margins provided by @page; per-page consistency) ─ */
@page { size: A4 portrait; margin: 12mm 12mm 12mm; }
@media print {
    html, body { margin: 0; padding: 0; background: #fff; }
    .bl-toolbar { display: none !important; }
    .bl-page { width: auto; max-width: none; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
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

    {{-- ── HEADER : company identity | logo ────────────────────── --}}
    <div class="bl-head">
        <div class="bl-co">
            <div class="bl-co-name">{{ $coordonnee->designation_fr ?? $coordonnee->abbreviation ?? 'SOBITAS' }}</div>
            <div class="bl-co-lines">
                @if(!empty($coordonnee?->adresse_fr))<div>{{ $coordonnee->adresse_fr }}</div>@endif
                <div class="bl-co-grid">
                    @if(!empty($coordonnee?->registre_commerce))<span><b>RC :</b> {{ $coordonnee->registre_commerce }}</span>@endif
                    @if(!empty($coordonnee?->matricule))<span><b>MF :</b> {{ $coordonnee->matricule }}</span>@endif
                </div>
                <div class="bl-co-grid">
                    @if(!empty($coordonnee?->phone_1))<span><b>Tél :</b> {{ $coordonnee->phone_1 }}{{ !empty($coordonnee->phone_2) ? ' / '.$coordonnee->phone_2 : '' }}</span>@endif
                    @if(!empty($coordonnee?->email))<span><b>Email :</b> {{ $coordonnee->email }}</span>@endif
                </div>
                @if(!empty($coordonnee?->rib))<div><b>R.I.B :</b> {{ $coordonnee->rib }}</div>@endif
            </div>
        </div>
        <div class="bl-brand">
            @if($logoUrl)
                <img src="{{ $logoUrl }}" alt="{{ $coordonnee->abbreviation ?? 'SOBITAS' }}" class="bl-logo">
            @else
                <div class="bl-logo-text">SOBITAS</div>
            @endif
            <div class="bl-site">WWW.PROTEIN.TN</div>
        </div>
    </div>

    {{-- ── DOCUMENT TITLE ──────────────────────────────────────── --}}
    <div class="bl-docline">
        <div class="bl-docbox">
            <div class="bl-doctitle">Bon de livraison {{ $facture->numero ?? '' }}</div>
            <div class="bl-docdate">Date : {{ $dateStr }}</div>
        </div>
    </div>

    {{-- ── CLIENT | PAYMENT ────────────────────────────────────── --}}
    <div class="bl-parties">
        <div class="bl-box bl-box--client">
            @if($printClient)
                <dl style="margin:0">
                    <div class="bl-kv"><dt>Raison Social</dt><dd>{{ $printClient->name }}</dd></div>
                    @if(!empty($clientAddress))<div class="bl-kv"><dt>Adresse</dt><dd>{{ $clientAddress }}</dd></div>@endif
                    @if($cMf)<div class="bl-kv"><dt>Code TVA</dt><dd>{{ $cMf }}</dd></div>@endif
                    @if($cRc)<div class="bl-kv"><dt>RC</dt><dd>{{ $cRc }}</dd></div>@endif
                    @if($cVille)<div class="bl-kv"><dt>Ville</dt><dd>{{ $cVille }}</dd></div>@endif
                    @if(count($cPhones))<div class="bl-kv"><dt>Téléphone</dt><dd>{{ implode(' / ', $cPhones) }}</dd></div>@endif
                    @if(!empty($printClient->email))<div class="bl-kv"><dt>E-Mail</dt><dd>{{ $printClient->email }}</dd></div>@endif
                </dl>
            @else
                <div class="bl-kv"><dt>Client</dt><dd>—</dd></div>
            @endif
        </div>
        <div class="bl-box bl-box--pay">
            <div class="bl-pay-head">Modalité de paiement : Paiement à la livraison</div>
            <div class="bl-pay-remark">
                Remarque :
                @if(!empty($facture->aramex_hawb))<br>N° suivi Aramex : {{ $facture->aramex_hawb }}@endif
            </div>
        </div>
    </div>

    @if(!empty($facture->numero_commande ?? $facture->commande_id ?? null))
    <div class="bl-webref">N° Commande Web : {{ $facture->numero_commande ?? $facture->commande_id }}</div>
    @endif

    {{-- ── PRODUCTS ────────────────────────────────────────────── --}}
    <div class="bl-tablewrap">
    <table class="bl-table">
        <colgroup>
            <col style="width:15%">
            <col style="width:37%">
            <col style="width:8%">
            <col style="width:11%">
            <col style="width:8%">
            <col style="width:10.5%">
            <col style="width:10.5%">
        </colgroup>
        <thead>
            <tr>
                <th class="c-left">Réf. Art.</th>
                <th class="c-left">Désignation</th>
                <th>Qté</th>
                <th>P.U. H.T</th>
                <th>T.V.A</th>
                <th>P.U. T.T.C</th>
                <th>TOT. T.T.C</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $row)
            <tr>
                <td class="c-left c-ref">{{ $row['ref'] }}</td>
                <td class="c-left c-prod">{{ $row['produit'] }}</td>
                <td class="c-center">{{ $row['qte'] }}</td>
                <td class="c-right">{{ $fmt($row['pu']) }}</td>
                <td class="c-center">{{ $tvaDisp($row['tva']) }}</td>
                <td class="c-right">{{ $fmt($row['pu_ttc']) }}</td>
                <td class="c-right">{{ $fmt($row['total']) }}</td>
            </tr>
            @endforeach
            @if(empty($rows))
            <tr><td colspan="7" class="bl-empty">Aucune ligne de produit.</td></tr>
            @endif
            {{-- Keeps the ruled frame the height of a form even on a one-line delivery. --}}
            <tr aria-hidden="true"><td colspan="7" class="bl-filler"></td></tr>
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
                        <td>TVA {{ $tvaDisp((float) $rate) }} %</td>
                        <td>{{ $tvaDisp((float) $rate) }} %</td>
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
            @if($frais > 0)
            <tr><td class="k">Frais de livraison</td><td class="c">:</td><td class="v">{{ $fmt($frais) }}</td></tr>
            @endif
            <tr class="grand"><td class="k">Net à Payer</td><td class="c">:</td><td class="v">{{ $fmt($netAPayer) }}</td></tr>
        </table>
    </div>

    {{-- ── NOTE ────────────────────────────────────────────────── --}}
    <div class="bl-note">
        {{ $noteLead !== '' ? $noteLead : 'Arrêté le présent bon de livraison à la somme de :' }}
        <b id="bl-words">…</b>
    </div>
    <input type="hidden" id="bl-total-val" value="{{ $netAPayer }}">

    {{-- ── SIGNATURES ──────────────────────────────────────────── --}}
    <div class="bl-signs">
        <div class="bl-sign-box">
            <div class="bl-sign-label">Signature Client</div>
            <div class="bl-sign-space"></div>
        </div>
        <div class="bl-sign-box bl-sign-box--right">
            <div class="bl-sign-label">Signature et Cachet</div>
            <div class="bl-sign-space"></div>
        </div>
    </div>

    {{-- ── FOOTER ──────────────────────────────────────────────── --}}
    <div class="bl-footer">
        <span>{{ $coordonnee->designation_fr ?? 'SOBITAS' }}</span>
        <span>WWW.PROTEIN.TN</span>
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
        var result = parts.join(' ') + ' dinar' + (dinars > 1 ? 's' : '');
        if (millimes > 0) result += ' et ' + millimes + ' millime' + (millimes > 1 ? 's' : '');
        return result.charAt(0).toUpperCase() + result.slice(1);
    }
    words.textContent = toFr(parseFloat(el.value) || 0);
})();
</script>

</body>
</html>
