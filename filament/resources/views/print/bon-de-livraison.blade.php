<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Bon de livraison {{ $facture->numero ?? $facture->id }}</title>
</head>
<body class="doc-a4-print @if(!empty($forPdf)) is-pdf-print @endif">
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

@include('print.partials.styles-a4-bl-aligned', ['forPdf' => $forPdf ?? null])

<div class="page-content">
    <div id="invoice" class="doc-a4-shell">
        @if (empty($forPdf))
        <div class="doc-a4-toolbar hide_print">
            <button type="button" class="doc-a4-btn" onclick="window.print()"><i class="bi bi-printer me-1"></i>Imprimer</button>
            <a class="doc-a4-btn doc-a4-btn--muted" href="{{ $backUrl ?? url()->previous() }}"><i class="bi bi-arrow-left me-1"></i>Retour</a>
        </div>
        @endif

        <div class="invoice">
            <div class="doc-a4-main-wrap">
                <header class="doc-a4-header">
                    <div class="doc-a4-header__brand">
                        @if ($logoUrl)
                            <img src="{{ $logoUrl }}" alt="Logo" class="mb-2" style="max-width: 180px; height: auto; display: block;">
                        @endif
                        <div class="doc-a4-co-name">{{ $coordonnee->abbreviation ?? '' }}</div>
                        <div class="doc-a4-co-line"><b>Email :</b> {{ $coordonnee->email ?? '' }}</div>
                        <div class="doc-a4-co-line"><b>Adresse :</b> {{ $coordonnee->adresse_fr ?? '' }}</div>
                        <div class="doc-a4-co-line"><b>Tél :</b> {{ $coordonnee->phone_1 ?? '' }}@if (!empty($coordonnee->phone_2)) / {{ $coordonnee->phone_2 }}@endif</div>
                        @if (!empty($coordonnee->registre_commerce))
                            <div class="doc-a4-co-line"><b>RC :</b> {{ $coordonnee->registre_commerce }}</div>
                        @endif
                        @if (!empty($coordonnee->matricule))
                            <div class="doc-a4-co-line"><b>MF :</b> {{ $coordonnee->matricule }}</div>
                        @endif
                    </div>
                    <div class="doc-a4-header__meta">
                        <h1>Bon de livraison</h1>
                        <div class="doc-a4-meta-line"><b>Date :</b> {{ $documentDate ?? $facture->created_at?->format('d/m/Y') }}</div>
                        <div class="doc-a4-meta-line"><b>Numéro :</b> {{ $facture->numero }}</div>
                    </div>
                </header>

                <main>
                    @if ($client)
                        <section class="doc-a4-client">
                            <h2>Informations du client</h2>
                            <p><b>Nom :</b> {{ $client->name }}</p>
                            <p><b>Adresse :</b> {{ $clientAddress }}</p>
                            @if (!empty($client->matricule))
                                <p><b>Matricule :</b> {{ $client->matricule }}</p>
                            @endif
                            <p><b>Tél :</b> {{ $client->phone_1 }}</p>
                        </section>
                    @endif

                    <div class="doc-a4-table-wrap">
                        <table class="doc-a4-lines">
                            <thead>
                                <tr>
                                    <th class="doc-a4-col-num">#</th>
                                    <th class="doc-a4-col-prod">Produit</th>
                                    <th class="doc-a4-col-numcell">Quantité</th>
                                    <th class="doc-a4-col-numcell">Prix U</th>
                                    <th class="doc-a4-col-numcell">Prix total</th>
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
                                        <td class="doc-a4-td-num">{{ $i }}</td>
                                        <td class="doc-a4-td-prod">{{ $details->product->designation_fr ?? '—' }}</td>
                                        <td class="doc-a4-td-right">{{ $details->qte ?? $details->quantite }}</td>
                                        <td class="doc-a4-td-right">{{ number_format($pu, 3, '.', '') }}</td>
                                        <td class="doc-a4-td-right">{{ number_format($lineTotal, 3, '.', '') }}</td>
                                    </tr>
                                    @php $i++; @endphp
                                @endforeach
                            </tbody>
                        </table>
                    </div>

                    @php
                        $blTotalHt     = (float) ($calc_total_ht ?? $facture->prix_ht ?? 0);
                        $blRemiseTotal = (float) ($calc_remise ?? $facture->remise ?? 0);
                        $blCouponHt    = (float) ($facture->discount_ht ?? 0);
                        $blManualRem   = max(0.0, round($blRemiseTotal - $blCouponHt, 3));
                        $blPct         = (float) ($calc_pourcentage_remise ?? $facture->pourcentage_remise ?? 0);
                        $blCouponCode  = $facture->coupon_code_snapshot ?? null;
                    @endphp
                    <div class="doc-a4-totals-wrap">
                        <table class="doc-a4-totals">
                            <tr>
                                <td>Montant total HT</td>
                                <td>{{ number_format($blTotalHt, 3, '.', ' ') }} DT</td>
                            </tr>
                            @if ($blManualRem > 0)
                                <tr>
                                    <td>Remise</td>
                                    <td>−{{ number_format($blManualRem, 3, '.', ' ') }} DT</td>
                                </tr>
                            @endif
                            @if ($blCouponHt > 0)
                                <tr>
                                    <td>Code promo{{ $blCouponCode ? ' (' . $blCouponCode . ')' : '' }}</td>
                                    <td>−{{ number_format($blCouponHt, 3, '.', ' ') }} DT</td>
                                </tr>
                            @endif
                            @if ($blRemiseTotal <= 0 && $blPct > 0)
                                <tr>
                                    <td>Remise {{ number_format($blPct, 1, '.', ' ') }} %</td>
                                    <td>—</td>
                                </tr>
                            @endif
                            @if ($frais > 0)
                                <tr>
                                    <td>Frais de livraison</td>
                                    <td>{{ number_format($frais, 3, '.', ' ') }} DT</td>
                                </tr>
                            @endif
                            <tr class="doc-a4-totals__grand">
                                <td>Montant total à payer</td>
                                <td>{{ number_format($netAPayer, 3, '.', ' ') }} DT</td>
                            </tr>
                        </table>
                    </div>

                    <input type="hidden" id="totale" value="{{ $netAPayer }}">
                    <div class="doc-a4-bottom-section">
                        @if (!empty($footerNote) || (!empty($coordonnee) && !empty($coordonnee->note)))
                            <div class="doc-a4-note">
                                <strong>Note</strong><br>
                                {{ $footerNote ?? $coordonnee->note }}<span id="words"></span>
                            </div>
                        @endif
                    </div>
                </main>
                <div class="print-doc-footer-wrap doc-a4-footer-wrap">
                    @include('print.partials.footer-rib-numero', ['documentNumero' => $facture->numero ?? ''])
                </div>
            </div>
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
    var b = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
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
