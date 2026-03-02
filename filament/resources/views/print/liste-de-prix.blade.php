@extends('print.layout')

@section('print-table')
<table class="print-table">
    <thead>
        <tr>
            <th style="width:5%">#</th>
            <th style="width:50%">Désignation</th>
            <th class="num" style="width:22%">P.U TTC (DT)</th>
            <th class="num" style="width:23%">Prix de gros (DT)</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($price_list_rows ?? [] as $row)
        <tr>
            <td>{{ $row['index'] }}</td>
            <td class="prod">{{ $row['designation'] }}</td>
            <td class="num">{{ number_format($row['prix_unitaire'], 3, ',', ' ') }}</td>
            <td class="num">{{ number_format($row['prix_gros'], 3, ',', ' ') }}</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endsection
