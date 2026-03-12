@extends('print.layout-backend')

@php
    $documentTitle = $documentTitle ?? 'TICKET';
    $documentNumber = $ticket->numero ?? '—';
    $documentDate = $ticket->date_ticket ? \Carbon\Carbon::parse($ticket->date_ticket)->format('d/m/Y') : ($ticket->created_at?->format('d/m/Y') ?? '');
@endphp

@section('client-info')
<div class="row contacts">
    <div class="col invoice-to">
        <h5 class="text-gray-light">INFORMATIONS DU CLIENT</h5>
        <hr class="custom-hr">
        
        @if(isset($ticket) && $ticket->client)
            <div class="to"><b>Nom :</b> {{ $ticket->client->name ?? ($ticket->client->raison_sociale ?? '') }}</div>
            @if(!empty($ticket->client->adresse))
                <div class="address"><b>Adresse :</b> {{ $ticket->client->adresse }}</div>
            @endif
            @if(!empty($ticket->client->phone))
                <div class="address"><b>Numéro de téléphone :</b> {{ $ticket->client->phone }}</div>
            @endif
        @else
            <div class="to"><b>Client :</b> Client de passage</div>
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
            <th style="width: 35%;" class="text-right">TOTAL TTC</th>
        </tr>
    </thead>
    <tbody>
        @php $i = 1; @endphp
        @foreach($details_ticket ?? [] as $d)
            @php
                $bg = ($i % 2 == 0) ? 'background-color: #f5f5f5 !important;' : '';
                $qte = (float)($d->qte ?? $d->quantite ?? 0);
                $lineTotal = $d->prix_ttc ?? ($qte * (float)($d->prix_unitaire ?? 0));
            @endphp
            <tr style="{{ $bg }}">
                <td class="text-center">{{ $i }}</td>
                <td>{{ $d->product->designation_fr ?? '—' }}</td>
                <td class="text-center">{{ number_format($qte, 0, '.', '') }}</td>
                <td class="text-right">{{ number_format((float)$lineTotal, 3, '.', '') }}</td>
            </tr>
            @php $i++; @endphp
        @endforeach
    </tbody>
    <tfoot>
        <tr>
            <td colspan="2"></td>
            <th colspan="1">Montant Total HT</th>
            <th class="text-right">
                {{ number_format((float)($ticket->prix_ht ?? 0), 3, '.', '') }}
            </th>
        </tr>

        @if(isset($ticket) && ($ticket->remise ?? 0) > 0)
            <tr>
                <td colspan="2"></td>
                <th colspan="1">Montant Remise</th>
                <th class="text-right">{{ number_format((float)$ticket->remise, 3, '.', '') }}</th>
            </tr>
        @endif
        
        @if(isset($ticket) && ($ticket->pourcentage_remise ?? 0) > 0)
            <tr>
                <td colspan="2"></td>
                <th colspan="1">Pourcentage Remise %</th>
                <th class="text-right">{{ number_format((float) $ticket->pourcentage_remise, 1, '.', '') }} %</th>
            </tr>
        @endif

        <tr>
            <td colspan="2"></td>
            <th class="bt" colspan="1">Montant Totale TTC</th>
            <th class="text-right">
                {{ number_format((float)($ticket->prix_ttc ?? $ticket->prix_total ?? 0), 3, '.', '') }}
            </th>
        </tr>
    </tfoot>
</table>
@endsection

@section('notices')
<div class="notices">
    <div>Note :</div>
    <div class="notice">
        Arrête le présent ticket à la somme de : 
        <span id="words_{{ $documentNumber ?? 'doc' }}"></span> DT
    </div>
</div>

@if(isset($footerNote))
    <div class="notices" style="border-left-color: #777; margin-top: 10px;">
        <div class="notice">{{ $footerNote }}</div>
    </div>
@elseif(isset($company) && ($company->footer_ticket ?? null))
    <div class="notices" style="border-left-color: #777; margin-top: 10px;">
        <div class="notice">{{ $company->footer_ticket }} <br> Notre Site web : {{ strtoupper($company->site_web ?? 'WWW.PROTEIN.TN') }}</div>
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
        var total = "{{ number_format((float) ($ticket->prix_ttc ?? $ticket->prix_total ?? 0), 3, '.', '') }}";
        var el = document.getElementById("words_{{ $documentNumber ?? 'doc' }}");
        if(el && total && total > 0) {
            el.innerHTML = inWords(total);
        }
    });
</script>
@endsection
