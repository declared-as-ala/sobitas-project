@extends('print.layout')

@push('print-head')
<style>
    /* ── Override table header to match backend orange design ── */
    .print-table thead th {
        background: #ff4000 !important;
        color: #fff !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        padding: 8px 10px !important;
        text-align: center !important;
        border: 1px solid #ff4000 !important;
        font-size: 11px !important;
        letter-spacing: .04em !important;
    }

    /* ── Cell borders like backend ── */
    .print-table tbody td {
        border-right: 1px solid #d1d5db !important;
        border-left: 1px solid #d1d5db !important;
        border-bottom: 1px solid #e5e7eb !important;
        padding: 7px 10px !important;
        font-size: 11px !important;
    }

    /* ── Alternating rows: odd = #eee, even = white ── */
    .print-table tbody tr:nth-child(odd)  { background: #eeeeee !important; }
    .print-table tbody tr:nth-child(even) { background: #ffffff !important; }

    /* ── Last row bottom border ── */
    .print-table tbody tr:last-child td { border-bottom: 1px solid #b4b4b4 !important; }

    /* ── Numbers right-aligned ── */
    .print-table td.prix { text-align: right !important; font-weight: 600 !important; }
    .print-table td.idx  { text-align: center !important; color: #6b7280 !important; }
    .print-table th.prix { text-align: right !important; }
</style>
@endpush

@section('print-table')
<table class="print-table" cellspacing="0" cellpadding="0">
    <thead>
        <tr>
            <th style="width:5%">#</th>
            <th style="width:55%">Produit</th>
            <th class="prix" style="width:20%">Prix Gros (DT)</th>
            <th class="prix" style="width:20%">Prix Unitaire (DT)</th>
        </tr>
    </thead>
    <tbody>
        @forelse(($price_list_rows ?? []) as $row)
        <tr>
            <td class="idx">{{ $row['index'] }}</td>
            <td class="prod">{{ $row['designation'] }}</td>
            <td class="prix">{{ number_format($row['prix_gros'], 3, '.', ' ') }}</td>
            <td class="prix">{{ number_format($row['prix_unitaire'], 3, '.', ' ') }}</td>
        </tr>
        @empty
        <tr>
            <td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">Aucun produit</td>
        </tr>
        @endforelse
    </tbody>
</table>
@endsection
