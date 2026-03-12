@extends('print.shared.a4-base')

@section('before-table')
    @php
        $documentTime = $ticket->created_at?->format('H:i') ?? '';
    @endphp
    <div class="print-client-extra">
        <div>Heure : {{ $documentTime }}</div>
        <div>Ticket n°{{ $ticket->numero ?? '—' }}</div>
    </div>
@endsection

@section('print-table')
<table class="print-table">
    <thead>
        <tr>
            <th style="width:60%">Produit</th>
            <th class="num" style="width:10%">Qté</th>
            <th class="num" style="width:30%">Total</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($details_ticket ?? [] as $d)
        @php
            $qte = (float)($d->qte ?? $d->quantite ?? 0);
            $lineTotal = $d->prix_ttc ?? ($qte * (float)($d->prix_unitaire ?? 0));
        @endphp
        <tr>
            <td class="prod">{{ $d->product->designation_fr ?? '—' }}</td>
            <td class="num">{{ number_format($qte, 0, ',', ' ') }}</td>
            <td class="num">{{ number_format((float)$lineTotal, 3, ',', ' ') }} DT</td>
        </tr>
        @endforeach
    </tbody>
</table>
@endsection

@section('after-totals')
    @php
        $company = $coordonnee ?? $company ?? null;
    @endphp
    <div class="print-ticket-footer">
        <p>{{ $company->footer_ticket ?? (($company->abbreviation ?? 'SOBITAS') . ' vous remercie de votre visite') }}</p>
        <p>{{ strtoupper($company->site_web ?? 'WWW.PROTEIN.TN') }}</p>
    </div>
@endsection
