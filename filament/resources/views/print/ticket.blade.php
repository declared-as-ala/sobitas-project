<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket {{ $ticket->numero ?? $ticket->id }}</title>
</head>
<body>
@php
    $coordonnee = $coordonnee ?? $company ?? null;
    $logoUrl = \App\Models\Coordinate::publicLogoFacturePrintUrl($coordonnee) ?? asset('logo.png');
    $dateStr = $documentDate ?? ($ticket->date_ticket ? \Carbon\Carbon::parse($ticket->date_ticket)->format('d/m/Y') : $ticket->created_at?->format('d/m/Y') ?? '');
    $timeStr = $documentTime ?? $ticket->created_at?->format('H:i') ?? '';
    $prixHt = (float) ($ticket->prix_ht ?? $ticket->prix_total ?? 0);
    $prixTtc = (float) ($ticket->prix_ttc ?? $ticket->prix_total ?? 0);
@endphp
<style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Source Sans Pro', sans-serif; }
    .container { display: block; width: 100%; background: #fff; max-width: 350px; padding: 25px; margin: 50px auto 0; box-shadow: 0 3px 10px rgb(0 0 0 / 0.2); }
    .receipt_header { padding-bottom: 40px; border-bottom: 1px dashed #000; text-align: center; }
    .receipt_header h1 { font-size: 20px; margin-bottom: 5px; text-transform: uppercase; }
    .receipt_header h1 span { display: block; font-size: 25px; }
    .receipt_header h2 { font-size: 14px; color: #000000; font-weight: 300; }
    .receipt_header h2 span { display: block; }
    .receipt_body { margin-top: 25px; }
    table { width: 100%; }
    thead, tfoot { position: relative; }
    thead th:not(:last-child) { text-align: left; }
    thead th:last-child { text-align: right; }
    thead::after { content: ''; width: 100%; border-bottom: 1px dashed #000; display: block; position: absolute; }
    tbody td:not(:last-child), tfoot td:not(:last-child) { text-align: left; }
    tbody td:last-child, tfoot td:last-child { text-align: right; }
    tbody tr:first-child td { padding-top: 15px; }
    tbody tr:last-child td { padding-bottom: 15px; }
    tfoot tr:first-child td { padding-top: 15px; }
    tfoot::before { content: ''; width: 100%; border-top: 1px dashed #000; display: block; position: absolute; }
    tfoot tr:last-child td:first-child, tfoot tr:last-child td:last-child { font-weight: bold; font-size: 20px; }
    .date_time_con { display: flex; justify-content: center; column-gap: 25px; }
    .items { margin-top: 25px; }
    h3 { border-top: 1px dashed #000; padding-top: 10px; margin-top: 25px; text-align: center; text-transform: uppercase; }
    .hide_print { display: block; }
    @media print { .hide_print { display: none; } }
    .btn { -webkit-font-smoothing: subpixel-antialiased; border-radius: 3px; font-size: 14px; line-height: 1.57142857; padding: 6px 15px; text-decoration: none; display: inline-block; }
    .btn-info { background: #3e46df; border: 0; border-radius: 3px; color: #fff; opacity: .9; }
</style>

@if (empty($forPdf))
<div class="toolbar hide_print">
    <div class="text-right">
        <button type="button" id="printInvoice" class="btn btn-info" onclick="window.print()">Imprimer</button>
        <a class="btn btn-info" href="{{ $backUrl ?? url()->previous() }}">Retour</a>
    </div>
    <hr>
</div>
@endif
<div class="container">
    <div class="receipt_header">
        @if ($logoUrl)
            <img src="{{ $logoUrl }}" alt="" style="width: 220px; margin: auto; display: block; float: none;">
        @endif
        <h1>{{ $coordonnee->short_description_ticket ?? '' }}</h1>
        <h2>Adresse: {{ $coordonnee->adresse_fr ?? '' }} <span>Tel: {{ $coordonnee->phone_1 ?? '' }} @if (!empty($coordonnee->phone_2))/ {{ $coordonnee->phone_2 }}@endif</span></h2>
    </div>
    <div class="receipt_body">
        <div class="date_time_con">
            <div class="date">{{ $dateStr }}</div>
            <div class="time">{{ $timeStr }}</div>
        </div>
        <div class="time" style="text-align: center; font-weight: 600; padding: 12px; font-size: 13pt;">
            Ticket n°{{ $ticket->numero }}
        </div>
        <div class="items">
            <table>
                <thead>
                    <tr>
                        <th>Produit</th>
                        <th>Qte</th>
                        <th>Totale</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($details_ticket as $details)
                        @php
                            $qte = $details->qte ?? $details->quantite ?? 0;
                            $lineTotal = isset($details->prix_ttc) ? (float) $details->prix_ttc : (float) $qte * (float) ($details->prix_unitaire ?? 0);
                        @endphp
                        <tr>
                            <td>{{ $details->product->designation_fr ?? '—' }}</td>
                            <td>{{ $qte }}</td>
                            <td>{{ number_format($lineTotal, 3, '.', '') }}</td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td>Totale</td>
                        <td></td>
                        <td>{{ number_format($prixHt, 3, '.', '') }}</td>
                    </tr>
                    <tr>
                        <td>Remise</td>
                        <td></td>
                        <td>{{ number_format((float) ($ticket->remise ?? 0), 3, '.', '') }}</td>
                    </tr>
                    <tr>
                        <td>Pourcentage remise %</td>
                        <td></td>
                        <td>{{ number_format((float) ($ticket->pourcentage_remise ?? 0), 1, '.', '') }}</td>
                    </tr>
                    <tr>
                        <td>Totale HT</td>
                        <td></td>
                        <td>{{ number_format($prixTtc, 3, '.', '') }}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
    <br><br>
    <h4>{{ $coordonnee->footer_ticket ?? '' }}</h4>
    <h3>Notre Site web <br>{{ $coordonnee->site_web ?? '' }}</h3>
</div>
</body>
</html>
