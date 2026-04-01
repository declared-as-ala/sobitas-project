<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Devis {{ $facture->numero ?? '' }}</title>
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

    $defaultTva = $coordonnee && isset($coordonnee->tva) ? (float) $coordonnee->tva : 19;

    if (! isset($calcTotals) && isset($facture, $details_facture)) {
        $detailsForCalc = collect($details_facture)->map(fn ($d) => [
            'produit_id' => $d->produit_id ?? null,
            'qte' => (int) ($d->qte ?? $d->quantite ?? 1),
            'prix_unitaire' => (float) ($d->prix_unitaire ?? 0),
            'tva_pct' => (float) ($d->tva ?? $defaultTva),
        ])->toArray();
        $calcTotals = \App\Services\InvoiceCalculator::calculate(
            $detailsForCalc,
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

    $tvaRateLabel = (float) ($coordonnee->tva ?? 19);
    $tvaRateDisplay = ($tvaRateLabel == floor($tvaRateLabel)) ? (string) (int) $tvaRateLabel : (string) $tvaRateLabel;

    $dateStr = $documentDate
        ?? ($facture->date_quotation
            ? \Carbon\Carbon::parse($facture->date_quotation)->format('d-m-Y')
            : ($facture->created_at?->format('d-m-Y') ?? ''));

    $devisLineList = is_array($devis_lines ?? null) ? $devis_lines : [];
@endphp

@include('print.partials.styles-a4-bl-aligned', ['forPdf' => $forPdf ?? null])

<div class="page-content">
    <div id="invoice" class="doc-a4-shell">
        @if (empty($forPdf))
        <div class="doc-a4-toolbar hide_print">
            <button type="button" class="doc-a4-btn" onclick="window.print()">Imprimer</button>
            <a class="doc-a4-btn doc-a4-btn--muted" href="{{ $backUrl ?? url()->previous() }}">Retour</a>
        </div>
        @endif

        <div class="invoice">
            <div class="doc-a4-main-wrap" style="min-width: 600px">
                <header class="doc-a4-header">
                    <div class="doc-a4-header__brand">
                        @if ($logoUrl)
                            <img src="{{ $logoUrl }}" alt="" style="max-width: 200px; height: auto; display: block; margin-bottom: 8px;">
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
                        <h1>DEVIS</h1>
                        <div class="doc-a4-meta-line"><b>Date :</b> {{ $dateStr }}</div>
                        <div class="doc-a4-meta-line"><b>Numéro :</b> {{ $facture->numero }}</div>
                    </div>
                </header>

                <main>
                    @php $printClient = $client ?? $facture->client ?? null; @endphp
                    @if ($printClient)
                        <section class="doc-a4-client">
                            <h2>Informations du client</h2>
                            <p><b>Nom :</b> {{ $printClient->name }}</p>
                            <p><b>Adresse :</b> {{ $printClient->adresse }}</p>
                            @if (filled($printClient->matricule))
                                <p><b>Matricule :</b> {{ $printClient->matricule }}</p>
                            @endif
                            <p><b>Numéro de téléphone :</b> {{ $printClient->phone_1 }}</p>
                        </section>
                    @endif

                    <div class="doc-a4-table-wrap">
                        <table class="doc-a4-lines doc-a4-lines--7">
                            <thead>
                                <tr>
                                    <th class="doc-a4-col-num">#</th>
                                    <th class="doc-a4-col-prod">Produit</th>
                                    <th class="doc-a4-col-numcell">Qté</th>
                                    <th class="doc-a4-col-numcell">P.U. HT</th>
                                    <th class="doc-a4-col-numcell">Total HT</th>
                                    <th class="doc-a4-col-numcell">TVA (DT)</th>
                                    <th class="doc-a4-col-numcell">Total TTC</th>
                                </tr>
                            </thead>
                            <tbody>
                                @php $rowNum = 1; @endphp
                                @if (! empty($devisLineList))
                                    @foreach ($devisLineList as $line)
                                        @php $d = $line['detail'] ?? null; @endphp
                                        @if ($d)
                                            @php
                                                $qte = (int) ($d->qte ?? $d->quantite ?? 0);
                                                $puHt = (float) ($d->prix_unitaire ?? 0);
                                                $ltHt = (float) ($line['line_total_ht'] ?? round($qte * $puHt, 3));
                                                $ltTvaDt = (float) ($line['line_tva_dt'] ?? round($ltHt * ($line['line_tva_pct'] ?? $defaultTva) / 100, 3));
                                                $ltTtc = (float) ($line['line_total_ttc'] ?? round($ltHt + $ltTvaDt, 3));
                                            @endphp
                                            <tr>
                                                <td class="doc-a4-td-num">{{ $rowNum }}</td>
                                                <td class="doc-a4-td-prod">{{ $d->product->designation_fr ?? '—' }}</td>
                                                <td class="doc-a4-td-right">{{ $qte }}</td>
                                                <td class="doc-a4-td-right">{{ number_format($puHt, 3, '.', '') }}</td>
                                                <td class="doc-a4-td-right">{{ number_format($ltHt, 3, '.', '') }}</td>
                                                <td class="doc-a4-td-right">{{ number_format($ltTvaDt, 3, '.', '') }}</td>
                                                <td class="doc-a4-td-right">{{ number_format($ltTtc, 3, '.', '') }}</td>
                                            </tr>
                                            @php $rowNum++; @endphp
                                        @endif
                                    @endforeach
                                @else
                                    @foreach ($details_facture ?? [] as $details)
                                        @php
                                            $qte = (int) ($details->qte ?? $details->quantite ?? 0);
                                            $puHt = (float) ($details->prix_unitaire ?? 0);
                                            $tp = (float) ($details->tva ?? ($coordonnee->tva ?? 19));
                                            $ltHt = round($qte * $puHt, 3);
                                            $ltTvaDt = round($ltHt * $tp / 100, 3);
                                            $ltTtc = round($ltHt + $ltTvaDt, 3);
                                        @endphp
                                        <tr>
                                            <td class="doc-a4-td-num">{{ $rowNum }}</td>
                                            <td class="doc-a4-td-prod">{{ $details->product->designation_fr ?? '—' }}</td>
                                            <td class="doc-a4-td-right">{{ $qte }}</td>
                                            <td class="doc-a4-td-right">{{ number_format($puHt, 3, '.', '') }}</td>
                                            <td class="doc-a4-td-right">{{ number_format($ltHt, 3, '.', '') }}</td>
                                            <td class="doc-a4-td-right">{{ number_format($ltTvaDt, 3, '.', '') }}</td>
                                            <td class="doc-a4-td-right">{{ number_format($ltTtc, 3, '.', '') }}</td>
                                        </tr>
                                        @php $rowNum++; @endphp
                                    @endforeach
                                @endif
                            </tbody>
                        </table>
                    </div>

                    <div class="doc-a4-totals-wrap">
                        <table class="doc-a4-totals">
                            <tr>
                                <td>Total HT</td>
                                <td>{{ number_format($footerTotalHt, 3, '.', '') }}</td>
                            </tr>
                            @if ($footerRemise > 0)
                                <tr>
                                    <td>Remise</td>
                                    <td>{{ number_format($footerRemise, 3, '.', '') }}</td>
                                </tr>
                            @endif
                            <tr>
                                <td>TVA ({{ $tvaRateDisplay }} %)</td>
                                <td>{{ number_format($footerTva, 3, '.', '') }}</td>
                            </tr>
                            <tr>
                                <td>Timbre</td>
                                <td>{{ number_format($footerTimbre, 3, '.', '') }}</td>
                            </tr>
                            <tr class="doc-a4-totals__grand">
                                <td>TOTAL TTC (Net à payer)</td>
                                <td>{{ number_format($footerTtc, 3, '.', '') }}</td>
                            </tr>
                        </table>
                    </div>

                    <input type="hidden" id="totale" value="{{ $footerTtc }}">

                    <div class="doc-a4-note">
                        <strong>Note</strong><br>
                        Arrête le présent devis à la somme de : <span id="words"></span>
                    </div>
                    @if (! empty($noteDevis ?? $coordonnee->note_devis ?? null))
                        <div class="doc-a4-note-extra">{{ $noteDevis ?? $coordonnee->note_devis }}</div>
                    @endif
                    @if (! empty($footerNote ?? null))
                        <div class="doc-a4-note-extra">{{ $footerNote }}</div>
                    @endif
                    @if (! empty($paymentTerms ?? null))
                        <p class="doc-a4-payment-terms">{{ $paymentTerms }}</p>
                    @endif
                    <div class="doc-a4-signature">Signature et cachet</div>
                </main>
                <div class="print-doc-footer-wrap doc-a4-footer-wrap">
                    @include('print.partials.footer-rib-numero', ['documentNumero' => $facture->numero ?? ''])
                </div>
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
