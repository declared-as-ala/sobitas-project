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
    $fmt        = fn ($n) => number_format((float) $n, 3, '.', ' ');
    $qfmt       = fn ($q) => ((float) $q == (int) $q)
        ? (string) (int) $q
        : rtrim(rtrim(number_format((float) $q, 3, '.', ''), '0'), '.');

    $logoUrl = \App\Support\PrintLogo::resolve($coordonnee ?? null);

    /* ── Client (delivery recipient) ──────────────────────────── */
    $printClient   = $client ?? $facture->client ?? null;
    $clientAddress = trim((string) ($facture->formatted_delivery_address ?? '')) !== ''
        ? $facture->formatted_delivery_address
        : ($printClient->adresse ?? '');
    $cPhones = array_values(array_filter([$printClient->phone_1 ?? null, $printClient->phone_2 ?? null]));
    $cRc     = $printClient->registre_commerce ?? null;
    $cMf     = $printClient->matricule ?? null;

    /* ── Totals ───────────────────────────────────────────────── */
    $frais         = (float) ($calc_frais ?? $facture->frais_livraison ?? 0);
    $netAPayer     = (float) ($calc_net_a_payer ?? max((float) ($facture->prix_ttc ?? 0), 0));
    $blTotalHt     = (float) ($calc_total_ht ?? $facture->prix_ht ?? 0);
    $blRemiseTotal = (float) ($calc_remise ?? $facture->remise ?? 0);
    $blCouponHt    = (float) ($facture->discount_ht ?? 0);
    $blManualRem   = max(0.0, round($blRemiseTotal - $blCouponHt, 3));
    $blCouponCode  = $facture->coupon_code_snapshot ?? null;

    $dateStr = $documentDate ?? $facture->created_at?->format('d/m/Y');

    /* ── Rows ─────────────────────────────────────────────────── */
    $rows = [];
    if (isset($details_facture)) {
        foreach ($details_facture as $i => $d) {
            $qte       = (float) ($d->qte ?? $d->quantite ?? 0);
            $pu        = (float) ($d->prix_unitaire ?? 0);
            $lineTotal = isset($d->prix_ttc) ? (float) $d->prix_ttc : $qte * $pu;
            $rows[] = [
                'index'   => $i + 1,
                'produit' => $d->product->designation_fr ?? '—',
                'qte'     => $qte,
                'pu'      => $pu,
                'total'   => $lineTotal,
            ];
        }
    }
@endphp

<style>
/* ═══════════════════════════════════════════════════════════════
   BON DE LIVRAISON — SOBITAS  (clean, print-first, multi-page safe)
   ═══════════════════════════════════════════════════════════════ */
:root { --or: #F1531F; --ink: #1b2733; --ink2: #3f4b59; --muted: #64707d; --line: #d3dae1; }

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #eef0f3; }
body.doc-a4-print {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: var(--ink2);
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

/* Toolbar (screen only) */
.bl-toolbar { text-align: center; padding: 14px 0 6px; display: flex; gap: 8px; justify-content: center; }
.bl-btn {
    display: inline-block; padding: 9px 20px; border-radius: 8px; background: var(--or);
    color: #fff; font-weight: 700; font-size: 10pt; border: none; cursor: pointer; text-decoration: none;
}
.bl-btn--ghost { background: #e6eaef; color: #334155; }

/* Page */
.bl-page {
    position: relative; width: 210mm; max-width: 210mm; min-height: 297mm; margin: 16px auto;
    padding: 15mm 16mm 18mm; background: #fff; font-size: 10pt;
    box-shadow: 0 6px 30px rgba(15,23,42,0.12);
}

/* ── Header: brand | pillars ─────────────────────────────────── */
.bl-head { display: flex; justify-content: space-between; align-items: flex-start; }
.bl-logo { height: 50px; width: auto; display: block; }
.bl-logo-text { font-size: 24pt; font-weight: 900; color: var(--or); letter-spacing: -0.02em; }
.bl-brand-tag { font-size: 6.8pt; letter-spacing: 0.34em; text-transform: uppercase; color: #566270; margin-top: 6px; font-weight: 600; }
.bl-pillars { font-size: 8pt; letter-spacing: 0.16em; text-transform: uppercase; color: #3b4653; font-weight: 700; padding-top: 8px; }
.bl-pillars em { color: var(--or); font-style: normal; margin: 0 7px; }

.bl-rule { height: 0; border-top: 1px solid var(--line); margin: 15px 0; }

/* ── Title + meta ────────────────────────────────────────────── */
.bl-titlebar { display: flex; justify-content: space-between; align-items: flex-start; gap: 28px; }
.bl-title { font-size: 27pt; font-weight: 800; color: var(--ink); letter-spacing: -0.01em; line-height: 1; margin: 0; }
.bl-title-sub { display: flex; align-items: center; gap: 11px; margin-top: 10px; font-size: 8pt; letter-spacing: 0.22em; text-transform: uppercase; color: #6b7787; font-weight: 700; }
.bl-dash { display: inline-block; width: 28px; height: 2px; background: var(--or); }
.bl-meta { flex: 0 0 44%; padding-left: 22px; border-left: 1.5px solid var(--line); }
.bl-meta-row { display: flex; align-items: baseline; gap: 8px; padding: 4px 0; font-size: 10pt; }
.bl-meta-k { color: var(--muted); flex: 0 0 116px; }
.bl-meta-c { color: #a3adb8; }
.bl-meta-v { color: var(--ink); font-weight: 600; }
.bl-meta-v.bl-strong { font-weight: 800; font-size: 11.5pt; }

/* ── Section label (CLIENT / NOTE) ───────────────────────────── */
.bl-label { display: flex; align-items: center; gap: 10px; font-size: 9pt; letter-spacing: 0.2em; text-transform: uppercase; color: #59646f; font-weight: 800; margin-bottom: 9px; }
.bl-bar { display: inline-block; width: 4px; height: 15px; background: var(--or); border-radius: 1px; }

/* ── Client ──────────────────────────────────────────────────── */
.bl-client-name { font-size: 15pt; font-weight: 800; color: var(--ink); margin-bottom: 7px; }
.bl-client-lines { font-size: 10pt; color: var(--ink2); line-height: 1.75; }

/* ── Products table ──────────────────────────────────────────── */
table.bl-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 2px; }
table.bl-table th {
    background: #f1f4f7; color: #3b4653; font-size: 8pt; font-weight: 800; text-transform: uppercase;
    letter-spacing: 0.05em; padding: 11px 12px; border: 1px solid #cfd6dd;
}
table.bl-table td { font-size: 9.5pt; color: #33404e; padding: 12px 12px; border: 1px solid #d7dde3; vertical-align: middle; }
table.bl-table .c-left { text-align: left; }
table.bl-table .c-center { text-align: center; }
table.bl-table .c-right { text-align: right; }
table.bl-table td.c-num { color: #8a95a1; font-weight: 700; }
table.bl-table td.c-prod { color: var(--ink); font-weight: 500; line-height: 1.35; word-break: break-word; }
table.bl-table td.c-total { font-weight: 800; color: var(--ink); }
table.bl-table td.c-right, table.bl-table td.c-center { font-variant-numeric: tabular-nums; }
.bl-empty { color: #9aa5b1; font-style: italic; padding: 18px; }
table.bl-table thead { display: table-header-group; }
table.bl-table tr { break-inside: avoid; page-break-inside: avoid; }

/* ── Totals ──────────────────────────────────────────────────── */
.bl-totals-wrap { display: flex; justify-content: flex-end; margin-top: 18px; break-inside: avoid; page-break-inside: avoid; }
table.bl-totals { width: 340px; border-collapse: collapse; }
table.bl-totals td { padding: 9px 15px; font-size: 10pt; border: 1px solid #dde3e8; }
table.bl-totals td.k { color: #57636f; background: #f7f9fb; }
table.bl-totals td.v { text-align: right; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
table.bl-totals tr.grand td { border-color: #f4c9b8; }
table.bl-totals tr.grand td.k { color: var(--or); font-weight: 800; font-size: 11pt; background: #fff5f1; }
table.bl-totals tr.grand td.v { color: var(--or); font-weight: 900; font-size: 14pt; background: #fff5f1; }

/* ── Note ────────────────────────────────────────────────────── */
.bl-note { margin-top: 22px; break-inside: avoid; page-break-inside: avoid; }
.bl-note-body { font-size: 10pt; color: var(--ink2); line-height: 1.7; }
.bl-note-body b { color: var(--ink); }

/* ── Signature ───────────────────────────────────────────────── */
.bl-sign { display: flex; justify-content: flex-end; margin-top: 42px; }
.bl-sign-box { width: 240px; border-top: 1px solid #97a2ad; padding-top: 8px; text-align: center; font-size: 9.5pt; color: #33404e; font-weight: 600; }

/* ── Footer ──────────────────────────────────────────────────── */
.bl-footer { display: flex; align-items: center; gap: 14px; margin-top: 26px; }
.bl-footer-l { font-size: 8pt; letter-spacing: 0.18em; color: #5b6672; font-weight: 700; white-space: nowrap; }
.bl-footer-r { font-size: 8pt; letter-spacing: 0.3em; color: #5b6672; font-weight: 700; white-space: nowrap; }
.bl-footer-line { flex: 1; height: 1px; background: var(--or); }
.bl-deco { position: absolute; left: 0; bottom: 0; width: 62px; height: 62px;
    background: repeating-linear-gradient(-45deg, var(--or) 0 2px, transparent 2px 9px); opacity: 0.9; }

/* ── Screen responsiveness (print preview on small screens) ──── */
@media screen and (max-width: 820px) {
    .bl-page { width: 100%; max-width: 100%; min-height: 0; margin: 0; padding: 20px 16px 40px; box-shadow: none; }
    .bl-titlebar { flex-direction: column; gap: 14px; }
    .bl-meta { flex: none; width: 100%; padding-left: 0; border-left: 0; border-top: 1px solid var(--line); padding-top: 12px; }
    .bl-title { font-size: 22pt; }
    .bl-totals-wrap { justify-content: stretch; }
    table.bl-totals { width: 100%; }
}

/* ── Print (A4 margins provided by @page; per-page consistency) ─ */
@page { size: A4 portrait; margin: 14mm 15mm 15mm; }
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

    {{-- ── HEADER ──────────────────────────────────────────────── --}}
    <div class="bl-head">
        <div class="bl-brand">
            @if($logoUrl)
                <img src="{{ $logoUrl }}" alt="SOBITAS" class="bl-logo">
            @else
                <div class="bl-logo-text">SOBITAS</div>
            @endif
            <div class="bl-brand-tag">Nutrition for a better you</div>
        </div>
        <div class="bl-pillars">Qualité <em>|</em> Performance <em>|</em> Bien-être</div>
    </div>
    <div class="bl-rule"></div>

    {{-- ── TITLE + META ────────────────────────────────────────── --}}
    <div class="bl-titlebar">
        <div class="bl-title-block">
            <h1 class="bl-title">BON DE LIVRAISON</h1>
            <div class="bl-title-sub"><span class="bl-dash"></span> Merci pour votre confiance</div>
        </div>
        <div class="bl-meta">
            <div class="bl-meta-row"><span class="bl-meta-k">N° BL</span><span class="bl-meta-c">:</span><span class="bl-meta-v bl-strong">{{ $facture->numero ?? '' }}</span></div>
            <div class="bl-meta-row"><span class="bl-meta-k">Date</span><span class="bl-meta-c">:</span><span class="bl-meta-v">{{ $dateStr }}</span></div>
            @if(!empty($facture->aramex_hawb))
            <div class="bl-meta-row"><span class="bl-meta-k">N° Suivi Aramex</span><span class="bl-meta-c">:</span><span class="bl-meta-v">{{ $facture->aramex_hawb }}</span></div>
            @endif
        </div>
    </div>
    <div class="bl-rule"></div>

    {{-- ── CLIENT ──────────────────────────────────────────────── --}}
    @if($printClient)
    <div class="bl-client">
        <div class="bl-label"><span class="bl-bar"></span> Client</div>
        <div class="bl-client-name">{{ $printClient->name }}</div>
        <div class="bl-client-lines">
            @if(!empty($clientAddress))<div>{{ $clientAddress }}</div>@endif
            @if(count($cPhones))<div>Tél : {{ implode('  /  ', $cPhones) }}</div>@endif
            @if(!empty($printClient->email))<div>Email : {{ $printClient->email }}</div>@endif
            @if($cRc || $cMf)
            <div>@if($cRc)RC : {{ $cRc }}@endif @if($cRc && $cMf)&nbsp;|&nbsp;@endif @if($cMf)MF : {{ $cMf }}@endif</div>
            @endif
        </div>
    </div>
    <div class="bl-rule"></div>
    @endif

    {{-- ── PRODUCTS ────────────────────────────────────────────── --}}
    <table class="bl-table">
        <colgroup>
            <col style="width:7%">
            <col style="width:47%">
            <col style="width:14%">
            <col style="width:16%">
            <col style="width:16%">
        </colgroup>
        <thead>
            <tr>
                <th class="c-center">#</th>
                <th class="c-left">Produit</th>
                <th class="c-center">Quantité</th>
                <th class="c-right">Prix U. (DT)</th>
                <th class="c-right">Prix total (DT)</th>
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
            <tr>
                <td class="c-center c-num">{{ $row['index'] }}</td>
                <td class="c-left c-prod">{{ $row['produit'] }}</td>
                <td class="c-center">{{ $qfmt($row['qte']) }}</td>
                <td class="c-right">{{ $fmt($row['pu']) }}</td>
                <td class="c-right c-total">{{ $fmt($row['total']) }}</td>
            </tr>
            @empty
            <tr><td colspan="5" class="c-center bl-empty">Aucune ligne de produit.</td></tr>
            @endforelse
        </tbody>
    </table>

    {{-- ── TOTALS ──────────────────────────────────────────────── --}}
    <div class="bl-totals-wrap">
        <table class="bl-totals">
            <tr><td class="k">Montant total HT</td><td class="v">{{ $fmt($blTotalHt) }} DT</td></tr>
            @if($blManualRem > 0)
            <tr><td class="k">Remise</td><td class="v">− {{ $fmt($blManualRem) }} DT</td></tr>
            @endif
            @if($blCouponHt > 0)
            <tr><td class="k">Code promo{{ $blCouponCode ? ' ('.$blCouponCode.')' : '' }}</td><td class="v">− {{ $fmt($blCouponHt) }} DT</td></tr>
            @endif
            @if($frais > 0)
            <tr><td class="k">Frais de livraison</td><td class="v">{{ $fmt($frais) }} DT</td></tr>
            @endif
            <tr class="grand"><td class="k">TOTAL TTC (Net à payer)</td><td class="v">{{ $fmt($netAPayer) }} DT</td></tr>
        </table>
    </div>

    {{-- ── NOTE ────────────────────────────────────────────────── --}}
    <div class="bl-note">
        <div class="bl-label"><span class="bl-bar"></span> Note</div>
        <div class="bl-note-body">
            @if(!empty($footerNote) || (!empty($coordonnee) && !empty($coordonnee->note)))
                {{ $footerNote ?? $coordonnee->note }}<br>
            @endif
            Arrêté le présent bon de livraison à la somme de :<br>
            <b id="bl-words"><em style="color:#9aa5b1;">calcul…</em></b>
        </div>
    </div>
    <input type="hidden" id="bl-total-val" value="{{ $netAPayer }}">

    {{-- ── SIGNATURE ───────────────────────────────────────────── --}}
    <div class="bl-sign">
        <div class="bl-sign-box">Signature et cachet</div>
    </div>

    {{-- ── FOOTER ──────────────────────────────────────────────── --}}
    <div class="bl-footer">
        <span class="bl-footer-l">WWW.PROTEIN.TN</span>
        <span class="bl-footer-line"></span>
        <span class="bl-footer-r">SOBITAS</span>
    </div>

    <div class="bl-deco" aria-hidden="true"></div>

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
        if (hi === 7 || hi === 9) { return b[hi] + (lo > 0 ? '-' + a[10 + lo] : (hi === 8 ? 's' : '')); }
        return b[hi] + (lo > 0 ? '-' + a[lo] : (hi === 8 ? 's' : ''));
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
