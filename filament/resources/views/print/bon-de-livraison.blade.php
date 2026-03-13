@extends('print.layout-backend')

@php
    $fmt = fn($n) => number_format((float)$n, 3, '.', ' ');
@endphp

@section('client-info')
<div class="row contacts">
    @php
        $shipName = ''; $shipStreet = ''; $shipCity = ''; $shipRegion = ''; $shipCp = '';
        $shipPhone = ''; $shipEmail = '';

        if (isset($facture)) {
            $f = $facture;
            $clientName = isset($client) ? ($client->nom_prenom ?? trim(($client->nom ?? '') . ' ' . ($client->prenom ?? '')) ?: ($client->name ?? '')) : '';

            $shipName = trim(($f->livraison_nom ?? '') . ' ' . ($f->livraison_prenom ?? '')) ?: trim(($f->nom ?? '') . ' ' . ($f->prenom ?? '')) ?: $clientName;
            $shipStreet = trim(($f->livraison_adresse1 ?? '') . ' ' . ($f->livraison_adresse2 ?? '')) ?: trim(($f->adresse1 ?? '') . ' ' . ($f->adresse2 ?? '')) ?: ($client->adresse ?? '');
            $shipCity = $f->livraison_ville ?: $f->ville ?: ($client->ville ?? '');
            $shipRegion = $f->livraison_region ?: $f->region ?: ($client->region ?? '');
            $shipCp = $f->livraison_code_postale ?: $f->code_postale ?: ($client->code_postale ?? '');
            $shipPhone = $f->livraison_phone ?: $f->phone ?: ($client->phone ?? $client->phone_1 ?? '');
            $shipEmail = $f->livraison_email ?: $f->email ?: ($client->email ?? '');

        } elseif(isset($client) && $client) {
            $shipName = $client->nom_prenom ?? trim(($client->nom ?? '') . ' ' . ($client->prenom ?? '')) ?: ($client->name ?? '');
            $shipStreet = $client->adresse ?? '';
            $shipCity = $client->ville ?? '';
            $shipRegion = $client->region ?? '';
            $shipCp = $client->code_postale ?? '';
            $shipPhone = $client->phone ?? $client->phone_1 ?? '';
            $shipEmail = $client->email ?? '';
        }
    @endphp

    <div class="col invoice-to">
        <h5 class="text-gray-light">INFORMATIONS DU CLIENT / COORDONNÉES DE LIVRAISON</h5>
        <hr class="custom-hr">
        <div class="to"><b>Nom et prénom :</b> {{ $shipName ?: '—' }}</div>
        <div class="address"><b>Email :</b> {{ $shipEmail ?: '—' }}</div>
        <div class="address"><b>Téléphone :</b> {{ $shipPhone ?: '—' }}</div>
        <div class="address"><b>Adresse :</b> {{ $shipStreet ?: '—' }}</div>
        <div class="address"><b>Ville :</b> {{ $shipCity ?: '—' }}</div>
        <div class="address"><b>Région (Gouvernorat) :</b> {{ $shipRegion ?: '—' }}</div>
        <div class="address"><b>Code postal :</b> {{ $shipCp ?: '—' }}</div>
    </div>
</div>
@endsection

@section('document-body')
<table cellspacing="0" cellpadding="0">
    <thead>
        <tr>
            <th style="width: 5%;" class="text-center">#</th>
            <th style="width: 45%;">PRODUIT</th>
            <th style="width: 15%;" class="text-center">QUANTITÉ</th>
            <th style="width: 15%;" class="text-right">PRIX.U (HT)</th>
            <th style="width: 20%;" class="text-right">TOTAL (HT)</th>
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
            $frais = $calc_frais ?? $facture->frais_livraison ?? 0;
            $pourcentageRemise = $calc_pourcentage_remise ?? $facture->pourcentage_remise ?? 0;
            $netAPayer = $calc_net_a_payer ?? ($totalHt - $remise + $frais);
        @endphp

        <!-- Montant Total HT -->
        <tr>
            <td colspan="2"></td>
            <th colspan="2">Montant Total HT</th>
            <th class="text-right">{{ $fmt($totalHt) }}</th>
        </tr>

        <!-- Montant Remise -->
        <tr>
            <td colspan="2"></td>
            <th colspan="2">Montant Remise</th>
            <th class="text-right">{{ $fmt($remise) }}</th>
        </tr>
        
        <!-- Pourcentage Remise % (optional) -->
        @if($pourcentageRemise > 0)
            <tr>
                <td colspan="2"></td>
                <th colspan="2">Pourcentage Remise %</th>
                <th class="text-right">{{ number_format((float) $pourcentageRemise, 1, '.', '') }} %</th>
            </tr>
        @endif
        
        <!-- Frais Livraison -->
        <tr>
            <td colspan="2"></td>
            <th colspan="2">Frais Livraison</th>
            <th class="text-right">{{ $fmt($frais) }}</th>
        </tr>
        
        <!-- Net à payer -->
        <tr>
            <td colspan="2"></td>
            <th class="bt" colspan="2" style="background-color: #fcece3;">Net à payer</th>
            <th class="text-right bt" style="background-color: #fcece3;">
                {{ $fmt($netAPayer) }}
            </th>
        </tr>
    </tfoot>
</table>
@endsection

@section('notices')
<div class="notices">
    <div>Note :</div>
    <div class="notice">
        Arrête la présente facture à la somme de : 
        <span id="words_{{ $documentNumber ?? 'doc' }}"></span> DT
    </div>
</div>

@if(isset($footerNote) && $footerNote)
    <div class="notices" style="border-left-color: #777; margin-top: 10px;">
        <div class="notice">{{ $footerNote }}</div>
    </div>
@endif
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
        var total = "{{ $fmt($calc_net_a_payer ?? (isset($facture) ? ($facture->prix_ht - $facture->remise + $facture->frais_livraison) : 0)) }}";
        // Convert to properly read float string for inWords without spaces
        total = total.replace(/\s+/g, '');
        var el = document.getElementById("words_{{ $documentNumber ?? 'doc' }}");
        if(el && total && parseFloat(total) > 0) {
            el.innerHTML = inWords(total);
        }
    });
</script>
@endsection

