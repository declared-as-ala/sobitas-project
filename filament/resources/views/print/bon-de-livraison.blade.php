@extends('print.layout-backend')

@php
    $fmt = fn($n) => number_format((float)$n, 3, '.', ' ');
@endphp

@section('client-info')
<div class="row contacts">
    <div class="col invoice-to">
        <h5 class="text-gray-light">INFORMATIONS DU CLIENT</h5>
        <hr class="custom-hr">

        @php
            $livrNom    = trim(($facture->livraison_nom ?? '') . ' ' . ($facture->livraison_prenom ?? ''));
            $livrAdr    = $facture->livraison_adresse1 ?? '';
            $livrVille  = trim(($facture->livraison_ville ?? '') . ' ' . ($facture->livraison_region ?? '') . ' ' . ($facture->livraison_code_postale ?? ''));
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
                $pttc = $details->prix_ttc ?? ($qte * $pu);
            @endphp
            <tr style="{{ $bg }}">
                <td class="text-center">{{ $i }}</td>
                <td>{{ collect(explode('-', $designation))->map(fn($v) => trim($v))->implode(' - ') }}</td>
                <td class="text-center">{{ $qte }}</td>
                <td class="text-right">{{ $fmt($pu) }}</td>
                <td class="text-right">{{ $fmt($qte * $pu) }}</td>
            </tr>
            @php $i++; @endphp
        @endforeach
    </tbody>
    <tfoot>
        @php
            $totalHt = $calc_total_ht ?? $facture->prix_ht ?? 0;
            $remise = $calc_remise ?? $facture->remise ?? 0;
            $pourcentageRemise = $calc_pourcentage_remise ?? $facture->pourcentage_remise ?? 0;
            $montantTtc = $calc_net_a_payer ?? ($totalHt - $remise);
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
        <tr>
            <td colspan="3"></td>
            <th class="bt">Montant Totale TTC</th>
            <th class="text-right">{{ $fmt($montantTtc) }}</th>
        </tr>
    </tfoot>
</table>
@endsection

@section('notices')
<div class="notices" style="page-break-inside: avoid; break-inside: avoid;">
    <div><b>Note :</b></div>
    <div class="notice">
        Arrête la présente facture à la somme de :
        <span id="words_{{ $documentNumber ?? 'doc' }}"></span> DT
    </div>
    @if(isset($footerNote) && $footerNote)
        <div class="notice" style="margin-top: 4px; color: #555;">{{ $footerNote }}</div>
    @endif
</div>
@endsection

@section('scripts')
<script>
    function inWords(num) {
        var a = ['', 'un ', 'deux ', 'trois ', 'quatre ', 'cinq ', 'six ', 'sept ', 'huit ', 'neuf ', 'dix ', 'onze ', 'douze ', 'treize ', 'quatorze ', 'quinze ', 'seize ', 'dix-sept ', 'dix-huit ', 'dix-neuf '];
        var b = ['', '', 'vingt ', 'trente ', 'quarante ', 'cinquante ', 'soixante ', 'soixante-dix ', 'quatre-vingt ', 'quatre-vingt-dix '];
        
        if ((num = num.toString()).length > 9) return 'overflow';
        
        let tab = num.split('.');
        let n = ('000000000' + tab[0]).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        
        if (!n) return '';
        
        var str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) : '';
        str += (n[2] != 0) ? (str != '' ? '' : '') + (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'mille ' : '';
        str += (n[3] != 0) ? (str != '' ? '' : '') + (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'cents ' : '';
        str += (n[4] != 0) ? (str != '' ? '' : '') + (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) : '';
        str += (n[5] != 0) ? (str != '' ? '' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';
        
        // Handle specific syntax cleaning
        str = str.replace('un mille', 'mille');
        str = str.replace('un cents', 'cent');
        str = str.replace('cents ', 'cent ');
        if (str.trim().endsWith('cent') && tab[0].endsWith('00')) str += 's'; // simple plural rule for cent
        
        let result = str.trim();
        if (result == '') result = 'zéro';
        
        result += ' dinars';
        
        if (tab.length > 1) {
            let nb = tab[1].padEnd(3, '0');
            return result + ' et ' + Number(nb) + ' millimes';
        }
        
        return result;
    }
    
    document.addEventListener('DOMContentLoaded', function() {
        var total = "{{ $fmt($calc_net_a_payer ?? (isset($facture) ? ($facture->prix_ttc ?? ($facture->prix_ht - $facture->remise)) : 0)) }}";
        total = total.replace(/\s+/g, '');
        var el = document.getElementById("words_{{ $documentNumber ?? 'doc' }}");
        if(el && total && parseFloat(total) > 0) {
            el.innerHTML = inWords(total);
        }
    });
</script>
@endsection

