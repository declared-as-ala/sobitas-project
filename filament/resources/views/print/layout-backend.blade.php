<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css">
    <title>{{ $documentTitle ?? 'Document' }} {{ $documentNumber ?? '' }}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/js/bootstrap.min.js"></script>
</head>

<body>
    @php
        $logoPath = public_path('logo.png');
        $logoUrl = is_file($logoPath)
            ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
            : asset('logo.png');
    @endphp

    <style>
        #invoice {
            padding: 30px;
        }

        .invoice {
            position: relative;
            background-color: #FFF;
            min-height: 680px;
            padding: 15px
        }

        .invoice header {
            padding: 10px 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid #ff4000
        }

        .invoice .company-details {
            text-align: right
        }

        .invoice .company-details .name {
            margin-top: 0;
            margin-bottom: 0
        }

        .invoice .contacts {
            margin-bottom: 20px
        }

        .invoice .invoice-to {
            text-align: left
        }

        .invoice .invoice-to .to {
            margin-top: 0;
            margin-bottom: 0
        }

        .invoice .invoice-details {
            text-align: right
        }

        .company-details .invoice-id {
            margin: 26px;
            text-transform: uppercase;
        }

        .invoice main {
            padding-bottom: 50px
        }

        .invoice main .thanks {
            margin-top: -100px;
            font-size: 2em;
            margin-bottom: 50px
        }

        .invoice main .notices {
            padding-left: 6px;
            font-size: 16pt;
            border-left: 6px solid #ff4000
        }

        .invoice main .notices .notice {
            font-size: 16pt
        }

        .invoice table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            margin-bottom: 20px
        }

        .invoice table td,
        .invoice table th {
            border-bottom: 1px solid #fff
        }

        .invoice table th {
            white-space: nowrap;
            font-size: 13pt
        }

        .invoice table td h3 {
            margin: 0;
            font-weight: 400;
            color: #ff4000;
            font-size: 16pt
        }

        .invoice table .qty,
        .invoice table .total,
        .invoice table .unit {
            text-align: right;
            font-size: 16pt
        }

        .invoice table .no {
            color: #fff;
            font-size: 1.6em;
            background: #ff4000;
        }

        .invoice table .unit {
            background: #ddd
        }

        .invoice table .total {
            background: #ff4000;
            color: #fff
        }

        .invoice table tbody tr:last-child td {
            border-bottom: 1px solid #b4b4b4
        }

        .invoice table tfoot td {
            background: 0 0;
            border-bottom: none;
            white-space: nowrap;
            text-align: right;
            padding: 10px 20px;
            font-size: 16pt;
            border-top: 1px solid #aaa
        }

        .invoice table tfoot tr:first-child td {
            border-top: none
        }

        .invoice table tfoot tr:last-child td {
            font-size: 1.4em;
        }

        .invoice table tfoot tr td:first-child {
            border: none
        }

        .invoice footer {
            font-size: 18px;
            width: 100%;
            text-align: center;
            color: #000;
            border-top: 1px solid #aaa;
            padding: 8px 0
        }

        .hide_print {
            display: initial;
        }

        .table1 {}

        @@media print {
            .invoice {
                overflow: hidden !important
            }

            .invoice footer {
                position: absolute;
                bottom: 35px;
                page-break-after: always
            }

            .hide_print {
                display: none
            }

            .invoice>div:last-child {
                page-break-before: always
            }

            .table1 {
                min-height: 10cm
            }

            .page-content {
                zoom: 100%;
            }
        }

        thead th {
            background: #ff4000 !important;
            background-color: #ff4000 !important;
            color: #fff !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            padding: 5px !important;
            text-align: center !important;
            border: 1px solid #ff4000 !important;
            border-top: 1px solid #ff4000 !important;
        }

        .table1 td {
            border-right: 1px solid #b4b4b4;
            border-left: 1px solid #b4b4b4;
            padding: 6px !important
        }

        tfoot td,
        tfoot th {
            text-align: right
        }

        tfoot th:last-child {
            border-bottom: 1px solid #b4b4b4;
        }

        tfoot tr:last-child th:last-child {
            background: #fd582033;
            border-top: 2px solid black !important;
        }

        .bt {
            border-top: 2px solid black !important;
        }

        .bggray {
            background-color: gray !important;
        }

        /* a copier */
        .contacts .address,
        .contacts .email,
        .contacts .to {
            font-weight: 600;
            font-size: 12pt
        }

        tbody {
            font-size: 10pt !important;
        }

        .btn-info {
            background: #3e46df;
            border: 0;
            border-radius: 3px;
            color: #fff;
            opacity: .9;
        }
    </style>

    <div class="page-content">
        <div id="invoice">

            @if(empty($forPdf ?? false))
            <div class="toolbar hidden-print hide_print">
                <div class="text-right">
                    <button id="printInvoice" class="btn btn-info" onclick="window.print()">
                        Imprimer
                    </button>
                    <a class="btn btn-info" href="{{ $backUrl ?? 'javascript:history.back()' }}">
                        Retour
                    </a>
                </div>
                <hr>
            </div>
            @endif

            <div class="invoice overflow-auto">
                <div style="min-width: 600px">
                    <header style="background: #eeeeee !important;">
                        <div class="row">
                            <div class="col">
                                <img src="{{ $logoUrl }}" style="width: 220px" />
                                @if(isset($coordonnee) && !empty($coordonnee->abbreviation))
                                    <h4 class="name">{{ $coordonnee->abbreviation }}</h4>
                                @endif
                                @if(isset($coordonnee))
                                    @if($coordonnee->email)
                                        <div><b>Email : </b> &nbsp; {{ $coordonnee->email }}</div>
                                    @endif
                                    @if($coordonnee->adresse_fr)
                                        <div><b>Adresse : </b> &nbsp; {{ $coordonnee->adresse_fr }}</div>
                                    @endif
                                    @if($coordonnee->phone_1)
                                        <div><b>Tél : </b> &nbsp;{{ $coordonnee->phone_1 }}
                                            @if($coordonnee->phone_2)
                                                <span>/ {{ $coordonnee->phone_2 }}</span>
                                            @endif
                                        </div>
                                    @endif
                                    @if($coordonnee->registre_commerce)
                                        <div><b>RC : </b>&nbsp; {{ $coordonnee->registre_commerce }}</div>
                                    @endif
                                    @if($coordonnee->matricule)
                                        <div><b>MF : </b>&nbsp; {{ $coordonnee->matricule }}</div>
                                    @endif
                                @endif
                            </div>
                            <div class="col company-details">
                                <h1 class="invoice-id">{{ $documentTitle ?? 'Document' }}</h1>
                                <div class="date"><b>Date :</b> {{ $documentDate ?? date('d/m/Y') }}</div>
                                <div class="date"><b>Numéro:</b> {{ $documentNumber ?? '' }}</div>
                                @yield('client-info-header')
                            </div>
                        </div>
                    </header>

                    <main>
                        @yield('client-info')
                        <br><br>
                        <div class="table1">
                            @yield('document-body')
                        </div>
                        @yield('notices')
                    </main>

                    <footer>
                        @if(isset($coordonnee) && $coordonnee->rib)
                            {{ $coordonnee->rib }}
                        @endif
                    </footer>
                </div>
                <!--DO NOT DELETE THIS div. IT is responsible for showing footer always at the bottom-->
                <div></div>
            </div>
        </div>
    </div>

    @yield('scripts')

    <script>
        window.addEventListener('load', function() {
            if (!window.location.search.includes('embed=true') && !window.location.search.includes('embed=1')) {
                window.print();
            }
        });
    </script>
</body>
</html>
