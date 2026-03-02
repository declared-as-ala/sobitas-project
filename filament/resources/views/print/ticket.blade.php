@php
    $company = $coordonnee ?? $company ?? null;
    $documentDate = $ticket->date_ticket ? \Carbon\Carbon::parse($ticket->date_ticket)->format('d/m/Y') : ($ticket->created_at?->format('d/m/Y') ?? '');
    $documentTime = $ticket->created_at?->format('H:i') ?? '';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket {{ $ticket->numero ?? '' }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Source Sans Pro', sans-serif; }
        body { background: #f1f5f9; min-height: 100vh; padding: 16px 0; display: flex; flex-direction: column; align-items: center; }
        .no-print { margin-bottom: 12px; }
        .receipt-btn { border-radius: 3px; font-size: 14px; padding: 6px 15px; border: 0; cursor: pointer; background: #3e46df; color: #fff; }
        .container {
            display: block;
            width: 100%;
            background: #fff;
            max-width: 350px;
            padding: 25px;
            box-shadow: 0 3px 10px rgb(0 0 0 / 0.2);
        }
        .receipt_header {
            padding-bottom: 40px;
            border-bottom: 1px dashed #000;
            text-align: center;
        }
        .receipt_header .logo {
            width: 220px;
            max-width: 100%;
            margin: 0 auto;
            display: block;
        }
        .receipt_header h1 {
            font-size: 20px;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .receipt_header h1 span { display: block; font-size: 25px; }
        .receipt_header h2 {
            font-size: 14px;
            color: #000;
            font-weight: 300;
        }
        .receipt_header h2 span { display: block; }
        .receipt_body { margin-top: 25px; }
        .date_time_con {
            display: flex;
            justify-content: center;
            column-gap: 25px;
        }
        .ticket_numero {
            text-align: center;
            font-weight: 600;
            padding: 12px;
            font-size: 13pt;
        }
        .ticket_client {
            text-align: center;
            font-size: 13px;
            padding: 0 0 8px 0;
        }
        .items { margin-top: 25px; }
        table { width: 100%; }
        thead, tfoot { position: relative; }
        thead th:not(:last-child) { text-align: left; }
        thead th:last-child { text-align: right; }
        thead::after {
            content: '';
            width: 100%;
            border-bottom: 1px dashed #000;
            display: block;
            position: absolute;
        }
        tbody td:not(:last-child), tfoot td:not(:last-child) { text-align: left; }
        tbody td:last-child, tfoot td:last-child { text-align: right; }
        tbody tr:first-child td { padding-top: 15px; }
        tbody tr:last-child td { padding-bottom: 15px; }
        tfoot tr:first-child td { padding-top: 15px; }
        tfoot::before {
            content: '';
            width: 100%;
            border-top: 1px dashed #000;
            display: block;
            position: absolute;
        }
        tfoot tr:last-child td:first-child,
        tfoot tr:last-child td:last-child {
            font-weight: bold;
            font-size: 20px;
        }
        .receipt_footer h4 {
            margin-top: 25px;
            text-align: center;
            font-weight: 400;
            font-size: 14px;
        }
        .receipt_footer h3 {
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-top: 25px;
            text-align: center;
            text-transform: uppercase;
            font-size: 14px;
        }
        @media print {
            body { background: #fff; padding: 0; display: block; }
            .no-print { display: none !important; }
            .container { box-shadow: none; margin: 0; }
        }
    </style>
</head>
<body>
    @if (!request()->query('embed') && empty($forPdf ?? false))
    <div class="no-print">
        <button type="button" onclick="window.print()" class="receipt-btn">Imprimer</button>
        <button type="button" onclick="window.close()" class="receipt-btn" style="background:#64748b;margin-left:8px;">Fermer</button>
    </div>
    @endif

    <div class="container" id="print-area">
        <div class="receipt_header">
            @if ($company && !empty($company->logo_facture))
                @php
                    $logoUrl = filter_var($company->logo_facture, FILTER_VALIDATE_URL)
                        ? $company->logo_facture
                        : \Illuminate\Support\Facades\Storage::url($company->logo_facture);
                @endphp
                <img src="{{ $logoUrl }}" alt="" class="logo" onerror="this.style.display='none'">
            @endif
            <h1>{{ $company->short_description_ticket ?? ($company->abbreviation ?? 'SOBITAS') }}</h1>
            <h2>
                Adresse: {{ $company->adresse_fr ?? '' }}
                <span>Tel: {{ $company->phone_1 ?? '' }}@if ($company->phone_2 ?? null) / {{ $company->phone_2 }} @endif</span>
            </h2>
        </div>

        <div class="receipt_body">
            <div class="date_time_con">
                <div class="date">{{ $documentDate }}</div>
                <div class="time">{{ $documentTime }}</div>
            </div>
            <div class="ticket_numero">Ticket n°{{ $ticket->numero ?? '—' }}</div>
            @if ($ticket->client)
            <div class="ticket_client">Client: {{ $ticket->client->name ?? '—' }}</div>
            @endif
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
                        @foreach ($details_ticket ?? [] as $d)
                        @php
                            $qte = (float)($d->qte ?? $d->quantite ?? 0);
                            $lineTotal = $d->prix_ttc ?? ($qte * (float)($d->prix_unitaire ?? 0));
                        @endphp
                        <tr>
                            <td>{{ $d->product->designation_fr ?? '—' }}</td>
                            <td>{{ number_format($qte, 0, ',', ' ') }}</td>
                            <td>{{ number_format((float)$lineTotal, 3, ',', '') }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>Totale</td>
                            <td></td>
                            <td>{{ number_format((float)($ticket->prix_ht ?? 0), 3, ',', '') }}</td>
                        </tr>
                        <tr>
                            <td>Remise</td>
                            <td></td>
                            <td>{{ number_format((float)($ticket->remise ?? 0), 3, ',', '') }}</td>
                        </tr>
                        <tr>
                            <td>Pourcentage remise %</td>
                            <td></td>
                            <td>{{ number_format((float)($ticket->pourcentage_remise ?? 0), 1, ',', '') }}</td>
                        </tr>
                        <tr>
                            <td>Totale HT</td>
                            <td></td>
                            <td>{{ number_format((float)($ticket->prix_ttc ?? $ticket->prix_total ?? 0), 3, ',', '') }}</td>
                        </tr>
                        @if ($ticket->client && $ticket->client->loyalty_enabled)
                        <tr>
                            <td>Loyalty</td>
                            <td></td>
                            <td>-{{ (int)($ticket->client->loyalty_percent ?? 20) }}%</td>
                        </tr>
                        @endif
                    </tfoot>
                </table>
            </div>
        </div>

        <div class="receipt_footer">
            @if ($ticket->client && $ticket->client->loyalty_enabled)
            <p style="text-align:center;font-size:12px;margin-top:8px;">Client fidèle</p>
            @endif
            <h4>{{ $company->footer_ticket ?? (($company->abbreviation ?? 'SOBITAS') . ' vous remercie de votre visite') }}</h4>
            <h3>Notre Site web <br>{{ strtoupper($company->site_web ?? 'WWW.PROTEIN.TN') }}</h3>
        </div>
    </div>
</body>
</html>
