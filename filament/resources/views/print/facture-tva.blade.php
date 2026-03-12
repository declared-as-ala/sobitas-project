@extends('print.invoice-layout-clean')

@section('print-table')
<table class="invoice-table">
    <thead>
        <tr>
            <th style="width:4%">#</th>
            <th style="width:26%">Désignation</th>
            <th class="num" style="width:8%">Qté</th>
            <th class="num" style="width:12%">P.U HT</th>
            <th class="num" style="width:8%">TVA %</th>
            <th class="num" style="width:14%">Total HT</th>
            <th class="num" style="width:14%">Total TTC</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($invoice_rows ?? [] as $row)
        <tr>
            <td>{{ $row['index'] }}</td>
            <td class="designation">{{ $row['produit'] }}</td>
            <td class="num">{{ $row['qte'] }}</td>
            <td class="num">{{ number_format($row['pu_ht'], 3, ',', ' ') }} DT</td>
            <td class="num">{{ number_format($row['tva_pct'], 0) }} %</td>
            <td class="num">{{ number_format($row['total_ht'], 3, ',', ' ') }} DT</td>
            <td class="num">{{ number_format($row['total_ttc'], 3, ',', ' ') }} DT</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endsection
