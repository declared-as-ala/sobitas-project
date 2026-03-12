@extends('print.layout-backend')

@section('client-info')
<div class="row contacts">
    <div class="col invoice-to">
        <h5 class="text-gray-light">INFORMATIONS DU CLIENT</h5>
        <hr class="custom-hr">
        
        @if(isset($client) && $client)
            <div class="to"><b>Nom :</b> {{ $client->name ?? ($client->raison_sociale ?? '') }}</div>
            @if(!empty($client->adresse))
                <div class="address"><b>Adresse :</b> {{ $client->adresse }}</div>
            @endif
            @if(!empty($client->phone_1) || !empty($client->phone_2))
                <div class="address"><b>Numéro de téléphone :</b> {{ $client->phone_1 ?? '' }}@if(!empty($client->phone_2)) / {{ $client->phone_2 }}@endif</div>
            @elseif(!empty($client->phone))
                <div class="address"><b>Numéro de téléphone :</b> {{ $client->phone }}</div>
            @endif
        @elseif(isset($devis) && ($devis->client ?? false))
            <div class="to"><b>Nom :</b> {{ $devis->client->name ?? ($devis->client->raison_sociale ?? '') }}</div>
            @if(!empty($devis->client->adresse))
                <div class="address"><b>Adresse :</b> {{ $devis->client->adresse }}</div>
            @endif
            @if(!empty($devis->client->phone))
                <div class="address"><b>Numéro de téléphone :</b> {{ $devis->client->phone }}</div>
            @endif
        @endif
    </div>
</div>
@endsection

@section('document-body')
<table cellspacing="0" cellpadding="0">
    <thead>
        <tr>
            <th style="width:4%" class="text-center">#</th>
            <th style="width:32%">DÉSIGNATION</th>
            <th class="text-center" style="width:8%">QTÉ</th>
            <th class="text-right" style="width:12%">P.U HT</th>
            <th class="text-right" style="width:14%">TOTAL HT</th>
            <th class="text-right" style="width:14%">TVA (DT)</th>
            <th class="text-right" style="width:16%">TOTAL TTC</th>
        </tr>
    </thead>
    <tbody>
        @php $i = 1; @endphp
        @foreach ($devis_lines ?? [] as $line)
        @php 
            $d = $line['detail']; 
            $bg = ($i % 2 == 0) ? 'background-color: #f5f5f5 !important;' : '';
        @endphp
        <tr style="{{ $bg }}">
            <td class="text-center">{{ $i++ }}</td>
            <td>{{ collect(explode('-', $d->product->designation_fr ?? '—'))->map(fn($v) => trim($v))->implode(' - ') }}</td>
            <td class="text-center">{{ $d->qte ?? $d->quantite ?? 0 }}</td>
            <td class="text-right">{{ number_format((float)($d->prix_unitaire ?? 0), 3, '.', '') }}</td>
            <td class="text-right">{{ number_format((float)($line['line_total_ht'] ?? 0), 3, '.', '') }}</td>
            <td class="text-right">{{ number_format((float)($line['line_tva_dt'] ?? 0), 3, '.', '') }}</td>
            <td class="text-right">{{ number_format((float)($line['line_total_ttc'] ?? 0), 3, '.', '') }}</td>
        </tr>
        @endforeach
    </tbody>
    <tfoot>
        @if(isset($totals) && count($totals) > 0)
            @foreach($totals as $index => $row)
                <tr>
                    <td colspan="5"></td>
                    <th colspan="1" class="{{ $index === count($totals) - 1 ? 'bt' : '' }}">{{ $row['label'] }}</th>
                    <th class="text-right {{ $index === count($totals) - 1 ? 'bt' : '' }}">
                        {{ str_replace(',', '.', str_replace(' DT', '', str_replace(' ', '', $row['value']))) }}
                    </th>
                </tr>
            @endforeach
        @endif
    </tfoot>
</table>
@endsection

@section('notices')
<div class="notices">
    <div>Note :</div>
    <div class="notice">
        Arrête le présent devis à la somme de : 
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
        @php
            $totalTtc = 0;
            if(isset($totals)) {
                $ttcRow = collect($totals)->last();
                if($ttcRow) {
                    $totalTtc = (float) str_replace([' DT', ' ', ','], ['', '', '.'], $ttcRow['value']);
                }
            }
        @endphp
        var total = "{{ number_format((float) $totalTtc, 3, '.', '') }}";
        var el = document.getElementById("words_{{ $documentNumber ?? 'doc' }}");
        if(el && total && total > 0) {
            el.innerHTML = inWords(total);
        }
    });
</script>
@endsection
