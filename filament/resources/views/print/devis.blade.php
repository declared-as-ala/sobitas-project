@extends('print.layout-backend')

@section('client-info')
@if(isset($client) && $client)
<div class="row contacts">
    <div class="col invoice-to">
        <h5 class="text-gray-light">INFORMATIONS DU CLIENT</h5>
        <hr style="margin: 9px">
        <b class="to"><b>Nom :</b> {{ $client->name ?? ($client->raison_sociale ?? '') }}</b>
        <div class="address"><b>Adresse :</b> {{ $client->adresse ?? '' }}</div>
        @if(!empty($client->matricule))
            <div class="email"><a><b>Matricule :</b> {{ $client->matricule }}</a></div>
        @endif
        <div class="email"><a><b>Numéro de téléphone:</b> {{ $client->phone_1 ?? '' }}</a></div>
    </div>
    <div class="col invoice-details"></div>
</div>
@endif
@endsection

@section('document-body')
@php $defaultTva = (float) ($coordonnee->tva ?? 19); @endphp
<table class="table" cellspacing="0" cellpadding="0">
    <thead>
        <tr>
            <th style="width: 5%; background: #ff4000 !important">#</th>
            <th style="width: 25%; background: #ff4000 !important">Produit</th>
            <th style="width: 10%; background: #ff4000 !important">Qte</th>
            <th style="width: 15%; background: #ff4000 !important">P.U.HT</th>
            <th style="width: 15%; background: #ff4000 !important">TVA</th>
            <th style="width: 15%; background: #ff4000 !important">Totale HT</th>
        </tr>
    </thead>
    <tbody>
        @php $i = 1; @endphp
        @foreach ($devis_lines ?? [] as $line)
        @php
            $d  = $line['detail'];
            $bg = ($i % 2 != 0) ? 'background-color: #eee !important' : '';
        @endphp
        <tr>
            <td @if($bg) style="{{ $bg }}" @endif>{{ $i }}</td>
            <td @if($bg) style="{{ $bg }}" @endif>{{ $d->product->designation_fr ?? '—' }}</td>
            <td class="text-center" @if($bg) style="{{ $bg }}" @endif>{{ $d->qte ?? $d->quantite ?? 0 }}</td>
            <td class="text-right" @if($bg) style="{{ $bg }}" @endif>{{ number_format((float)($d->prix_unitaire ?? 0), 3, '.', '') }}</td>
            <td class="text-right" @if($bg) style="{{ $bg }}" @endif>{{ $d->tva ?? $defaultTva }} %</td>
            <td class="text-right" @if($bg) style="{{ $bg }}" @endif>{{ number_format((float)($line['line_total_ht'] ?? 0), 3, '.', '') }}</td>
        </tr>
        @php $i++; @endphp
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td colspan="2"></td>
            <th colspan="3" style="border-top: none">Totale HT</th>
            <th class="text-right">{{ number_format((float)($calcTotals['total_ht_brut'] ?? 0), 3, '.', '') }}</th>
        </tr>
        @if(($calcTotals['remise'] ?? 0) > 0)
        <tr>
            <td colspan="2"></td>
            <th colspan="3">Remise</th>
            <th class="text-right">{{ number_format((float)($calcTotals['remise'] ?? 0), 3, '.', '') }}</th>
        </tr>
        @endif
        <tr>
            <td colspan="2"></td>
            <th colspan="3">TVA</th>
            <th class="text-right">{{ number_format((float)($calcTotals['tva'] ?? 0), 3, '.', '') }}</th>
        </tr>
        <tr>
            <td colspan="2"></td>
            <th colspan="3">Totale TTC</th>
            <th class="text-right">{{ number_format((float)($calcTotals['net_a_payer'] ?? 0), 3, '.', '') }}</th>
        </tr>
    </tfoot>
</table>
@endsection

@section('notices')
@if(isset($coordonnee) && !empty($coordonnee->note))
<div class="notices">
    <div>Note:</div>
    <div class="notice">{{ $coordonnee->note }}
        <span id="words_{{ $documentNumber ?? 'doc' }}"></span>
    </div>
</div>
<br>
@endif

@if(isset($noteDevis) && $noteDevis)
<div class="notice">{{ $noteDevis }}</div>
<br>
@endif

<span>Devis valable 30 jours à partir de la date de création</span>
<div style="margin-left: 140px; text-decoration: underline;">
    Signature et cachet
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
        @php
            $totalTtc = (float) ($calcTotals['net_a_payer'] ?? 0);
        @endphp
        var total = "{{ number_format((float) $totalTtc, 3, '.', '') }}";
        var el = document.getElementById("words_{{ $documentNumber ?? 'doc' }}");
        if (el && total && parseFloat(total) > 0) {
            el.innerHTML = inWords(total);
        }
    });
</script>
@endsection
