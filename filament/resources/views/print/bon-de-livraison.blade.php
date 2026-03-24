@extends('print.layout-backend')

@php
    $fmt = fn($n) => number_format((float)$n, 3, '.', ' ');
    $notePrefix = trim((string) ($footerNote ?? 'Arrête la présente facture à la somme de :'));
@endphp

@section('client-info')
<div class="row contacts">
    <div class="col invoice-to">
        <h5 class="text-gray-light">INFORMATIONS DU CLIENT</h5>
        <hr class="custom-hr">

        @php
            $livrNom    = trim(($facture->livraison_nom ?? '') . ' ' . ($facture->livraison_prenom ?? ''));
            $livrAdr    = $facture->livraison_adresse1 ?? '';
            $livrVille  = implode(' ', array_filter([
                $facture->livraison_ville ?? '',
                $facture->livraison_region ?? '',
                $facture->livraison_code_postale ?? '',
            ], fn($v) => $v !== ''));
            $livrEmail  = $facture->livraison_email ?? '';
            $livrPhone  = $facture->livraison_phone ?? '';

            $displayNom   = $livrNom   ?: ($client->name    ?? '');
            $displayAdr   = $livrAdr   ?: ($client->adresse ?? '');
            $displayPhone = $livrPhone ?: ($client->phone_1 ?? '');
        @endphp
        <b class="to"><b>Nom :</b> {{ $displayNom }}</b>
        @if($displayAdr)
            <div class="address"><b>Adresse :</b> {{ $displayAdr }}</div>
        @endif
        @if($livrVille)
            <div class="address">{{ $livrVille }}</div>
        @endif
        @if($livrEmail)
            <div class="email"><b>Email :</b> {{ $livrEmail }}</div>
        @endif
        @if(!empty($client->matricule ?? null))
            <div class="email"><b>Matricule :</b> {{ $client->matricule }}</div>
        @endif
        @if($displayPhone)
            <div class="email"><b>Numéro de téléphone :</b> {{ $displayPhone }}</div>
        @endif
    </div>
</div>
@endsection

@section('document-body')
<table cellspacing="0" cellpadding="0">
    <thead>
        <tr>
            <th style="width: 5%;" class="text-center">#</th>
            <th style="width: 40%;">Produit</th>
            <th style="width: 15%;" class="text-center">Quantité</th>
            <th style="width: 20%;" class="text-right">Prix.U</th>
            <th style="width: 20%;" class="text-right">Prix T.TTC</th>
        </tr>
    </thead>
    <tbody>
        @php $i = 1; @endphp
        @foreach($details_facture ?? [] as $details)
            @php
                $bg = ($i % 2 == 0) ? 'background-color: #f5f5f5 !important;' : '';
                
                $designation = $details->product->designation_fr ?? '—';
                $qte = $details->qte ?? $details->quantite ?? 1;
                $pu = $details->prix_unitaire ?? $details->prix_ht ?? 0;
                $lineTotal = (float) $qte * (float) $pu;
            @endphp
            <tr style="{{ $bg }}">
                <td class="text-center">{{ $i }}</td>
                <td>{{ collect(explode('-', $designation))->map(fn($v) => trim($v))->implode(' - ') }}</td>
                <td class="text-center">{{ $qte }}</td>
                <td class="text-right">{{ $fmt($pu) }}</td>
                <td class="text-right">{{ $fmt($lineTotal) }}</td>
            </tr>
            @php $i++; @endphp
        @endforeach
    </tbody>
    <tfoot>
        @php
            $totalHt           = $calc_total_ht ?? $facture->prix_ht ?? 0;
            $remise            = $calc_remise ?? $facture->remise ?? 0;
            $pourcentageRemise = $calc_pourcentage_remise ?? $facture->pourcentage_remise ?? 0;
            $fraisLivraison    = $calc_frais ?? $facture->frais_livraison ?? 0;
            $montantTtc        = $calc_net_a_payer ?? ($totalHt - $remise + $fraisLivraison);
        @endphp

        <tr>
            <td colspan="3"></td>
            <th>Montant Total HT</th>
            <th class="text-right">{{ $fmt($totalHt) }}</th>
        </tr>
        <tr>
            <td colspan="3"></td>
            <th>Montant Remise</th>
            <th class="text-right">{{ $fmt($remise) }}</th>
        </tr>
        <tr>
            <td colspan="3"></td>
            <th>Poucentage Remise %</th>
            <th class="text-right">{{ number_format((float) $pourcentageRemise, 1, '.', '') }} %</th>
        </tr>
        @if((float)$fraisLivraison > 0)
        <tr>
            <td colspan="3"></td>
            <th>Frais de livraison</th>
            <th class="text-right">{{ $fmt($fraisLivraison) }}</th>
        </tr>
        @endif
        <tr>
            <td colspan="3"></td>
            <th class="bt">Montant Totale TTC</th>
            <th class="text-right" style="font-weight: 800; background: #f4e7db;">{{ $fmt($montantTtc) }}</th>
        </tr>
    </tfoot>
</table>
@endsection

@section('notices')
<div class="notices" style="page-break-inside: avoid; break-inside: avoid;">
    <div><b>Note :</b></div>
    <div class="notice">
        {{ rtrim($notePrefix, " :") }} :
        <span id="words_{{ $documentNumber ?? 'doc' }}"></span> DT
    </div>
</div>
@endsection

@section('scripts')
<script>
    function inWords(num) {
        var units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
                     'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
                     'dix-sept', 'dix-huit', 'dix-neuf'];
        var tens  = ['', '', 'vingt', 'trente', 'quarante', 'cinquante',
                     'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

        function below100(n) {
            if (n < 20) return units[n];
            var t = Math.floor(n / 10), u = n % 10;
            if (t === 7) return 'soixante-' + units[10 + u];
            if (t === 9) return 'quatre-vingt-' + units[10 + u];
            if (t === 8) return u === 0 ? 'quatre-vingts' : 'quatre-vingt-' + units[u];
            if (u === 0) return tens[t];
            return tens[t] + (u === 1 ? ' et un' : '-' + units[u]);
        }

        function below1000(n, centsPlural) {
            if (n < 100) return below100(n);
            var h = Math.floor(n / 100), rest = n % 100;
            if (rest === 0) return (h === 1 ? 'cent' : units[h] + (centsPlural && h > 1 ? ' cents' : ' cent'));
            return (h === 1 ? 'cent' : units[h] + ' cent') + ' ' + below100(rest);
        }

        function convert(n) {
            if (n === 0) return 'zéro';
            if (n < 1000) return below1000(n, true);
            if (n < 1000000) {
                var th = Math.floor(n / 1000), rest = n % 1000;
                var thWord = th === 1 ? 'mille' : below1000(th, false) + ' mille';
                return rest === 0 ? thWord : thWord + ' ' + below1000(rest, true);
            }
            if (n < 1000000000) {
                var m = Math.floor(n / 1000000), rest = n % 1000000;
                var mWord = m === 1 ? 'un million' : below1000(m, true) + ' millions';
                return rest === 0 ? mWord : mWord + ' ' + convert(rest);
            }
            return 'overflow';
        }

        var parts = num.toString().replace(',', '.').split('.');
        var dinars   = parseInt(parts[0], 10) || 0;
        var millimes = parseInt(((parts[1] || '') + '000').substring(0, 3), 10);

        var result = convert(dinars) + (dinars <= 1 ? ' dinar' : ' dinars');
        if (millimes > 0) result += ' et ' + millimes + (millimes === 1 ? ' millime' : ' millimes');
        return result;
    }
    
    document.addEventListener('DOMContentLoaded', function() {
        var total = "{{ $fmt($montantTtc) }}";
        total = total.replace(/\s+/g, '');
        var el = document.getElementById("words_{{ $documentNumber ?? 'doc' }}");
        if(el && total && parseFloat(total) > 0) {
            el.innerHTML = inWords(total);
        }
    });
</script>
@endsection

