<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <title>Ticket {{ @$ticket->numero }}</title>
</head>

<body>

    @php
        // Must resolve here: assignments inside @include('print._logo') do not leak to this view.
        $logoUrl = \App\Support\PrintLogo::resolve($coordonnee ?? null);
        $loyaltyDiscount = (float) ($ticket->loyalty_discount_dt ?? 0);
        $totalHt = (float) ($ticket->prix_ht ?? 0);
        $regularDiscount = (float) ($ticket->remise ?? 0);
        $netToPay = (float) ($ticket->prix_ttc ?? 0);
    @endphp

    <style>
        @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Source Sans Pro', sans-serif;
        }

        .container {
            display: block;
            width: 100%;
            background: #fff;
            max-width: 350px;
            padding: 25px;
            margin: 50px auto 0;
            box-shadow: 0 3px 10px rgb(0 0 0 / 0.2);
        }

        .receipt_header {
            padding-bottom: 40px;
            border-bottom: 1px dashed #000;
            text-align: center;
        }

        .receipt_header h1 {
            font-size: 20px;
            margin-bottom: 5px;
            text-transform: uppercase;
        }

        .receipt_header h1 span {
            display: block;
            font-size: 25px;
        }

        .receipt_header h2 {
            font-size: 14px;
            color: #000000;
            font-weight: 300;
        }

        .receipt_header h2 span {
            display: block;
        }

        .receipt_body {
            margin-top: 25px;
        }

        table {
            width: 100%;
        }

        thead,
        tfoot {
            position: relative;
        }

        thead th:not(:last-child) {
            text-align: left;
        }

        thead th:last-child {
            text-align: right;
        }

        thead::after {
            content: '';
            width: 100%;
            border-bottom: 1px dashed #000;
            display: block;
            position: absolute;
        }

        tbody td:not(:last-child),
        tfoot td:not(:last-child) {
            text-align: left;
        }

        tbody td:last-child,
        tfoot td:last-child {
            text-align: right;
        }

        tbody tr:first-child td {
            padding-top: 15px;
        }

        tbody tr:last-child td {
            padding-bottom: 15px;
        }

        tfoot tr:first-child td {
            padding-top: 15px;
        }

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

        .date_time_con {
            display: flex;
            justify-content: center;
            column-gap: 25px;
        }

        .items {
            margin-top: 25px;
        }

        h3 {
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-top: 25px;
            text-align: center;
            text-transform: uppercase;
        }

        .hide_print {
            display: block
        }

        @page {
            size: auto;
            margin: 0mm;
        }

        @media print {

            .hide_print {
                display: none
            }
        }

        .toolbar {
            position: relative;
            z-index: 2000;
        }

        .toolbar-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 10px;
        }

        .toolbar-actions .btn {
            cursor: pointer;
            pointer-events: auto !important;
            position: relative;
            z-index: 2001;
        }
    </style>

        <div class="toolbar hidden-print hide_print ">
            <div class="toolbar-actions">
                <button
                    id="printInvoice"
                    type="button"
                    class="btn btn-primary"
                    onclick="window.print(); return false;"
                >
                    Imprimer</button>
                <a class="btn btn-outline-secondary" href="{{ $backUrl ?? route('filament.admin.resources.tickets.index') }}">
                    Retour</a>
            </div>
            <hr>
        </div>
        <div class="container">

            <div class="receipt_header">
                @if($logoUrl ?? null)
                <img src="{{ $logoUrl }}" data-holder-rendered="true"
                    style="width : 220px ;     margin: auto;
                display: block;
                float: none;" />
                @endif
                <h1> {{ $coordonnee->short_description_ticket ?? '' }}</h1>
                <h2>Adresse: {{ $coordonnee->adresse_fr ?? '' }} <span>Tel: {{ $coordonnee->phone_1 ?? '' }} @if ($coordonnee->phone_2 ?? '')
                            / {{ $coordonnee->phone_2 }}
                        @endif
                    </span></h2>
            </div>

            <div class="receipt_body">

                <div class="date_time_con">
                    <div class="date">{{ $ticket->created_at?->format('d/m/Y') }}</div>
                    <div class="time"> {{ $ticket->created_at?->format('H:i') }}</div>

                </div>
                <div class="time"
                    style="    text-align: center;
                font-weight: 600;
                padding: 12px;
                font-size: 13pt;">
                    Ticket n°{{ $ticket->numero }}</div>
                <div class="items">
                    <table>

                        <thead>
                            <th>Produit</th>
                            <th>Qte</th>
                            <th>Totale</th>
                        </thead>

                        <tbody>
                            @foreach ($details_ticket as $details)
                                <tr>
                                    <td> {{ @$details->product->designation_fr }}</td>
                                    <td>{{ $details->qte }}</td>
                                    <td> {{ number_format((float) $details->prix_ttc, 3, '.', '') }}</td>
                                </tr>
                            @endforeach

                        </tbody>

                        <tfoot>
                            <tr>
                                <td>Totale </td>
                                <td></td>
                                <td>{{ number_format($totalHt, 3, '.', '') }}</td>
                            </tr>
                            <tr>

                                <td >Remise</td>
                                <td></td>
                                <td >
                                    {{ number_format($regularDiscount, 3, '.', '') }}</td>
                            </tr>

                            <tr>

                                <td >Pourcentage remise %</td>
                                <td></td>
                                <td >
                                    {{ number_format((float) @$ticket->pourcentage_remise, 1, '.', '') }}</td>
                            </tr>

                            @if($loyaltyDiscount > 0)
                            <tr>
                                <td>Remise fidélité</td>
                                <td></td>
                                <td>-{{ number_format($loyaltyDiscount, 3, '.', '') }}</td>
                            </tr>
                            @endif
                            <tr>
                                <td>Net à payer</td>
                                <td></td>
                                <td>{{ number_format($netToPay, 3, '.', '') }}</td>
                            </tr>
                        </tfoot>

                    </table>
                </div>

            </div>

            @if($ticket->loyalty_card_id && ($ticket->loyalty_points_redeemed > 0 || $ticket->loyalty_points_earned > 0))
            <div style="border-top:1px dashed #999;margin-top:10px;padding-top:8px;font-size:11px;">
                <p style="font-weight:bold;text-align:center;margin-bottom:6px;">Programme fidélité</p>
                <table width="100%" cellpadding="2" style="font-size:11px;">
                    <tr>
                        <td>Carte</td>
                        <td align="right">{{ $ticket->loyaltyCard->card_number ?? '—' }}</td>
                    </tr>
                    @php
                        $oldBalance = (int) ($ticket->loyalty_old_balance_points ?? 0);
                        $newBalance = (int) ($ticket->loyalty_new_balance_points ?? ($ticket->client?->loyalty_points_balance ?? 0));
                    @endphp
                    <tr>
                        <td>Ancien solde</td>
                        <td align="right">{{ $oldBalance }} pts</td>
                    </tr>
                    @if($ticket->loyalty_points_redeemed > 0)
                    <tr>
                        <td>Points utilisés</td>
                        <td align="right" style="color:#c00000;">
                            {{ $ticket->loyalty_points_redeemed }} pts
                        </td>
                    </tr>
                    <tr>
                        <td>Remise fidélité</td>
                        <td align="right" style="color:#c00000;">
                            {{ number_format((float)$ticket->loyalty_discount_dt, 3, '.', '') }} DT
                        </td>
                    </tr>
                    @endif
                    <tr>
                        <td>Points gagnés</td>
                        <td align="right" style="color:#006600;">+{{ $ticket->loyalty_points_earned }} pts</td>
                    </tr>
                    <tr>
                        <td><strong>Nouveau solde</strong></td>
                        <td align="right"><strong>{{ $newBalance }} pts</strong></td>
                    </tr>
                </table>
            </div>
            @endif

            <br><br>
            <h4>{{ $coordonnee->footer_ticket ?? '' }}</h4>
            <h3>Notre Site web <br>
                {{ $coordonnee->site_web ?? '' }}</h3>

            @php $siteUrl = $coordonnee->site_web ?? ''; @endphp
            @if($siteUrl)
            <div style="margin-top: 16px; text-align: center;">
                <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data={{ urlencode($siteUrl) }}"
                    alt="QR Code"
                    style="width: 110px; height: 110px;"
                >
                <p style="font-size: 11px; margin-top: 4px;">Scannez pour visiter notre site</p>
            </div>
            @endif

        </div>

        <script>
            document.addEventListener('DOMContentLoaded', function () {
                const printButton = document.getElementById('printInvoice');

                if (printButton) {
                    printButton.addEventListener('click', function () {
                        window.print();
                    });
                }
            });
        </script>

    </body>

</html>
