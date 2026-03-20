@php
    $logoPath = public_path('logo.png');
    $logoUrl = is_file($logoPath)
        ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
        : asset('logo.png');
@endphp
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket {{ @$ticket->numero }}</title>
</head>

<body>
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
        }

        .qr-zone {
            margin-top: 16px;
            text-align: center;
        }

        .qr-zone img {
            width: 110px;
            height: 110px;
        }

        .qr-zone p {
            font-size: 10px;
            color: #555;
            margin-top: 4px;
        }

        .hide_print {
            display: block
        }

        @media print {

            .hide_print {
                display: none
            }
        }

        .btn {
            -webkit-font-smoothing: subpixel-antialiased;
            border-radius: 3px;
            font-size: 14px;
            line-height: 1.57142857;
            padding: 6px 15px;
            transition: border .2s linear, color .2s linear, width .2s linear, background-color .2s linear;
        }

        .btn-info {
            background: #3e46df;
            border: 0;
            border-radius: 3px;
            color: #fff;
            opacity: .9;
        }
    </style>

    <body>

        @if (!request()->query('embed') && empty($forPdf ?? false))
        <div class="toolbar hidden-print hide_print ">
            <div class="text-right" style="text-align: right; margin: 10px;">
                <button id="printInvoice" class="btn btn-info" onclick="window.print()"><i class="fa fa-print"></i>
                    Imprimer</button>
                <a class="btn btn-info" href="{{ route('filament.admin.resources.tickets.index') }}"><i class="fa fa-close"></i>
                    Retour</a>
            </div>
            <hr>
        </div>
        @endif
        
        <div class="container">

            <div class="receipt_header">
                <img src="{{ $logoUrl }}" data-holder-rendered="true"
                    style="width : 220px ;     margin: auto;
                display: block;
                float: none;" />
                <h1> {{ $coordonnee->short_description_ticket ?? '' }}</h1>
                <h2>Adresse: {{ $coordonnee->adresse_fr ?? '' }} <span>Tel: {{ $coordonnee->phone_1 ?? '' }} @if (@$coordonnee->phone_2)
                            / {{ $coordonnee->phone_2 }}
                        @endif
                    </span></h2>
            </div>

            <div class="receipt_body">

                <div class="date_time_con">
                    <div class="date">{{ $ticket->created_at->format('d/m/Y') }}</div>
                    <div class="time"> {{ $ticket->created_at->format('H:i') }}</div>

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
                                    <td>{{ floatval($details->qte) }}</td>
                                    <td> {{ number_format((float) $details->prix_ttc, 3, '.', '') }}</td>
                                </tr>
                            @endforeach

                        </tbody>

                        <tfoot>
                            <tr>
                                <td>Totale </td>
                                <td></td>
                                <td>{{ number_format((float) @$ticket->prix_ht, 3, '.', '') }}</td>
                            </tr>
                            <tr>

                                <td >Remise</td>
                                <td></td>
                                <td >
                                    {{ number_format((float) @$ticket->remise, 3, '.', '') }}</td>
                            </tr>

                            <tr>

                                <td >Pourcentage remise %</td>
                                <td></td>
                                <td >
                                    {{ number_format((float) @$ticket->pourcentage_remise, 1, '.', '') }}</td>
                            </tr>





                            <tr>
                                <td>Totale HT</td>
                                <td></td>
                                <td>{{ number_format((float) @$ticket->prix_ttc, 3, '.', '') }}</td>
                            </tr>
                            {{-- <tr>
                                <td>Cash</td>
                                <td></td>
                                <td>32.1</td>
                            </tr>

                            <tr>
                                <td>Change</td>
                                <td></td>
                                <td>32.1</td>
                            </tr> --}}
                        </tfoot>

                    </table>
                </div>

            </div>

            <br><br>
            <h4>{{ $coordonnee->footer_ticket ?? '' }}</h4>
            <h3 style="text-transform:uppercase;">Notre Site web</h3>
            <div style="text-align:center; font-size:12px; margin-top:4px;">
                {{ $coordonnee->site_web ?? '' }}
            </div>

            @php $siteUrl = $coordonnee->site_web ?? ''; @endphp
            @if ($siteUrl)
            <div class="qr-zone">
                <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data={{ urlencode($siteUrl) }}"
                    alt="QR Code site web"
                >
                <p>Scannez pour visiter notre site</p>
            </div>
            @endif


        </div>

        <script>
            window.addEventListener('load', function() {
                if (!window.location.search.includes('embed=true')) {
                    window.print();
                }
            });
        </script>

    </body>

</html>
