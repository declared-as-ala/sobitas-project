@extends('print.layout-backend')

@section('client-info')
<div class="row contacts">
    <div class="col invoice-to">
        <h5 class="text-gray-light">INFORMATIONS DU CLIENT</h5>
        <hr class="custom-hr">
        
        @if(isset($client) && $client)
            <div class="to"><b>Nom :</b> {{ $client->nom_prenom ?? ($client->nom . ' ' . $client->prenom) ?? '' }}</div>
            @if($client->adresse || $client->ville)
                <div class="address"><b>Adresse :</b> {{ trim(($client->adresse ?? '') . ' ' . ($client->ville ?? '')) }}</div>
            @endif
            @if($client->phone)
                <div class="address"><b>Numéro de téléphone :</b> {{ $client->phone }}</div>
            @endif
        @elseif(isset($facture))
            <div class="to"><b>Nom :</b> {{ $facture->nom_prenom ?? ($facture->nom . ' ' . $facture->prenom) ?? '' }}</div>
            @if($facture->adresse1 || $facture->ville)
                <div class="address"><b>Adresse :</b> {{ trim(($facture->adresse1 ?? '') . ' ' . ($facture->ville ?? '')) }}</div>
            @endif
            @if($facture->phone)
                <div class="address"><b>Numéro de téléphone :</b> {{ $facture->phone }}</div>
            @endif
        @endif
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
            <th style="width: 15%;" class="text-right">PRIX.U</th>
            <th style="width: 20%;" class="text-right">PRIX T.TTC</th>
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
                <td class="text-right">{{ number_format((float) $pu, 3, '.', '') }}</td>
                <td class="text-right">{{ number_format((float) $pttc, 3, '.', '') }}</td>
            </tr>
            @php $i++; @endphp
        @endforeach
    </tbody>
    <tfoot>
        <!-- Montant Total HT -->
        <tr>
            <td colspan="3"></td>
            <th colspan="1">Montant Total HT</th>
            <th class="text-right">
                @php
                    $totalHt = 0;
                    if(isset($totals)) {
                        $htTotal = collect($totals)->firstWhere('label', 'Total HT');
                        if($htTotal) $totalHt = str_replace([' DT', ','], ['', '.'], $htTotal['value']);
                    } elseif(isset($facture)) {
                        $totalHt = $facture->prix_ht ?? 0;
                    }
                @endphp
                {{ number_format((float)$totalHt, 3, '.', '') }}
            </th>
        </tr>

        <!-- Remise / Frais de Livraison (only show if > 0 or if available) -->
        @php
            $remise = 0;
            $frais = 0;
            $totalTtc = 0;
            
            if(isset($totals)) {
                $remiseTotal = collect($totals)->firstWhere('label', 'Remise');
                if($remiseTotal) $remise = (float) str_replace([' DT', ','], ['', '.'], $remiseTotal['value']);
                
                $fraisTotal = collect($totals)->firstWhere('label', 'Frais de livraison');
                if($fraisTotal) $frais = (float) str_replace([' DT', ','], ['', '.'], $fraisTotal['value']);
                
                $ttcTotal = collect($totals)->firstWhere('label', 'Net à payer');
                if($ttcTotal) $totalTtc = (float) str_replace([' DT', ','], ['', '.'], $ttcTotal['value']);
            } elseif(isset($facture)) {
                $remise = (float) ($facture->remise ?? 0);
                $frais = (float) ($facture->frais_livraison ?? 0);
                $totalTtc = (float) ($facture->prix_ttc ?? $facture->net_a_payer ?? 0);
            }
        @endphp

        @if($remise > 0)
            <tr>
                <td colspan="3"></td>
                <th colspan="1">Montant Remise</th>
                <th class="text-right">{{ number_format($remise, 3, '.', '') }}</th>
            </tr>
        @endif
        
        @if($frais > 0)
            <tr>
                <td colspan="3"></td>
                <th colspan="1">Frais Livraison</th>
                <th class="text-right">{{ number_format($frais, 3, '.', '') }}</th>
            </tr>
        @endif
        
        <!-- Placeholder for Percentage if needed -->
        @if(isset($facture) && isset($facture->pourcentage_remise) && $facture->pourcentage_remise > 0)
            <tr>
                <td colspan="3"></td>
                <th colspan="1">Pourcentage Remise %</th>
                <th class="text-right">{{ number_format((float) $facture->pourcentage_remise, 1, '.', '') }} %</th>
            </tr>
        @endif

        <!-- Montant Totale TTC -->
        <tr>
            <td colspan="3"></td>
            <th class="bt" colspan="1">Montant Totale TTC</th>
            <th class="text-right">
                {{ number_format((float) $totalTtc, 3, '.', '') }}
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
        var total = "{{ number_format((float) $totalTtc, 3, '.', '') }}";
        var el = document.getElementById("words_{{ $documentNumber ?? 'doc' }}");
        if(el && total) {
            el.innerHTML = inWords(total);
        }
    });
</script>
@endsection

