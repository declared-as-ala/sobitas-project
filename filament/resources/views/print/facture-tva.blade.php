@extends('print.layout-backend')

@section('client-info')
<div class="row contacts">
    <div class="col invoice-to">
        <h5 class="text-gray-light">INFORMATIONS DU CLIENT</h5>
        <hr class="custom-hr">

        @if(isset($client) && $client)
            <b class="to"><b>Nom :</b> {{ $client->name ?? ($client->raison_sociale ?? '') }}</b>
            <div class="address"><b>Adresse :</b> {{ $client->adresse ?? '' }}</div>
            @if(!empty($client->matricule))
                <div class="email"><b>Matricule :</b> {{ $client->matricule }}</div>
            @endif
            <div class="email"><b>Numéro de téléphone:</b> {{ $client->phone_1 ?? '' }}</div>
        @endif
    </div>
</div>
@endsection

@section('document-body')
<table cellspacing="0" cellpadding="0">
    <thead>
        <tr>
            <th style="width:5%" class="text-center">#</th>
            <th style="width:25%">Produit</th>
            <th class="text-center" style="width:10%">Qte</th>
            <th class="text-right" style="width:15%">P.U.HT</th>
            <th class="text-right" style="width:15%">TVA</th>
            <th class="text-right" style="width:15%">Totale HT</th>
        </tr>
    </thead>
    <tbody>
        @php $i = 1; @endphp
        @foreach ($invoice_rows ?? [] as $row)
        @php
            $bg = ($i % 2 == 0) ? 'background-color: #f5f5f5 !important;' : '';
        @endphp
        <tr style="{{ $bg }}">
            <td class="text-center">{{ $row['index'] }}</td>
            <td>{{ collect(explode('-', $row['produit']))->map(fn($v) => trim($v))->implode(' - ') }}</td>
            <td class="text-center">{{ $row['qte'] }}</td>
            <td class="text-right">{{ number_format($row['pu_ht'], 3, '.', '') }}</td>
            <td class="text-right">{{ number_format($row['tva_pct'], 0) }} %</td>
            <td class="text-right">{{ number_format($row['total_ht'], 3, '.', '') }}</td>
        </tr>
        @php $i++; @endphp
        @endforeach
    </tbody>
    <tfoot>
        <tr><td>&nbsp;</td></tr>
        <tr>
            <td colspan="2"></td>
            <th colspan="3">Totale HT</th>
            <th class="text-right">{{ number_format((float) ($calcTotals['total_ht_brut'] ?? $facture->prix_ht ?? 0), 3, '.', '') }}</th>
        </tr>
        @if(($calcTotals['remise'] ?? $facture->remise ?? 0) > 0)
        <tr>
            <td colspan="2"></td>
            <th colspan="3">Remise</th>
            <th class="text-right">{{ number_format((float) ($calcTotals['remise'] ?? $facture->remise ?? 0), 3, '.', '') }}</th>
        </tr>
        @endif
        <tr>
            <td colspan="2"></td>
            <th colspan="3">TVA</th>
            <th class="text-right">{{ number_format((float) ($calcTotals['tva'] ?? $facture->tva ?? 0), 3, '.', '') }}</th>
        </tr>
        <tr>
            <td colspan="2"></td>
            <th colspan="3">Timbre</th>
            <th class="text-right">{{ number_format((float) ($calcTotals['timbre'] ?? $facture->timbre ?? 0), 3, '.', '') }}</th>
        </tr>
        <tr>
            <td colspan="2"></td>
            <th colspan="3" class="bt">Totale TTC</th>
            <th class="text-right bt">{{ number_format((float) ($calcTotals['prix_ttc'] ?? $facture->prix_ttc ?? 0), 3, '.', '') }}</th>
        </tr>
    </tfoot>
</table>
@endsection

@section('notices')
@php
    $totalTtcValue = (float) ($calcTotals['prix_ttc'] ?? $facture->prix_ttc ?? 0);
@endphp
@if(isset($coordonnee) && !empty($coordonnee->note))
<div class="notices">
    <div>Note:</div>
    <div class="notice">{{ $coordonnee->note }} <span id="words_{{ $documentNumber ?? 'doc' }}"></span></div>
</div>
@endif
<div style="margin-left: 140px; text-decoration: underline; margin-top: 30px;">
    Signature et cachet
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

        str = str.replace('un mille', 'mille');
        str = str.replace('un cents', 'cent');
        str = str.replace('cents ', 'cent ');
        if (str.trim().endsWith('cent') && tab[0].endsWith('00')) str += 's';

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
        var total = "{{ number_format((float) $totalTtcValue, 3, '.', '') }}";
        var el = document.getElementById("words_{{ $documentNumber ?? 'doc' }}");
        if(el && total && parseFloat(total) > 0) {
            el.innerHTML = inWords(total);
        }
    });
</script>
@endsection
