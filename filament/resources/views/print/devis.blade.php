@extends('print.layout')

@section('print-table')
<table class="print-table">
    <thead>
        <tr>
            <th style="width:5%">#</th>
            <th style="width:40%">Désignation</th>
            <th class="num" style="width:14%">Qté</th>
            <th class="num" style="width:18%">P.U HT</th>
            <th class="num" style="width:23%">Total TTC</th>
        </tr>
    </thead>
    <tbody>
        @php $i = 1; @endphp
        @foreach ($details_facture ?? [] as $d)
        <tr>
            <td>{{ $i++ }}</td>
            <td class="prod">{{ $d->product->designation_fr ?? '—' }}</td>
            <td class="num">{{ $d->qte ?? $d->quantite ?? 0 }}</td>
            <td class="num">{{ number_format((float)($d->prix_unitaire ?? 0), 3, ',', ' ') }} DT</td>
            <td class="num">{{ number_format((float)(($d->qte ?? $d->quantite ?? 0) * ($d->prix_unitaire ?? 0)), 3, ',', ' ') }} DT</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endsection
