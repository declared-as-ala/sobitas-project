@extends('print.shared.a4-base')

@section('print-table')
<table class="print-table">
    <thead>
        <tr>
            <th style="width:4%">#</th>
            <th style="width:32%">Désignation</th>
            <th class="num" style="width:8%">Qté</th>
            <th class="num" style="width:12%">P.U HT</th>
            <th class="num" style="width:14%">Total HT</th>
            <th class="num" style="width:14%">TVA (DT)</th>
            <th class="num" style="width:16%">Total TTC</th>
        </tr>
    </thead>
    <tbody>
        @php $i = 1; @endphp
        @foreach ($devis_lines ?? [] as $line)
        @php $d = $line['detail']; @endphp
        <tr>
            <td>{{ $i++ }}</td>
            <td class="prod">{{ $d->product->designation_fr ?? '—' }}</td>
            <td class="num">{{ $d->qte ?? $d->quantite ?? 0 }}</td>
            <td class="num">{{ number_format((float)($d->prix_unitaire ?? 0), 3, ',', ' ') }} DT</td>
            <td class="num">{{ number_format($line['line_total_ht'], 3, ',', ' ') }} DT</td>
            <td class="num">{{ number_format($line['line_tva_dt'], 3, ',', ' ') }} DT</td>
            <td class="num">{{ number_format($line['line_total_ttc'], 3, ',', ' ') }} DT</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endsection
