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
