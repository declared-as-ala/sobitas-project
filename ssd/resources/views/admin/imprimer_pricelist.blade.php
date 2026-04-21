<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css">

    <title>Liste de Prix - {{ @$pricelist->designation }}</title>


    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js"></script>


    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>


    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/js/bootstrap.min.js"></script>
</head>


<body>

    @php
        $coordonnee = App\Coordinate::first();
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

        .company-details .invoice-id {
            margin: 26px;
            text-transform: uppercase;
        }

        .invoice main {
            padding-bottom: 50px
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

        .invoice table tbody tr:last-child td {
            border-bottom: 1px solid #b4b4b4
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

        @media print {
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

        tbody {
            font-size: 10pt !important;
        }

        .contacts .address,
        .contacts .email,
        .contacts .to {
            font-weight: 600;
            font-size: 12pt
        }
    </style>

    <div class="page-content">
        <div id="invoice">
            <div class="toolbar hidden-print hide_print">
                <div class="text-right">
                    <button id="printInvoice" class="btn btn-info" onclick="printInvoice()">
                        <i class="fa fa-print"></i> Imprimer
                    </button>
                    <a class="btn btn-info" href="{{ route('voyager.product-price-lists.index') }}">
                        <i class="fa fa-file-pdf-o"></i> Retour
                    </a>
                </div>
                <hr>
            </div>

            <div class="invoice overflow-auto">
                <div style="min-width: 600px">
                    <header style="background: #eeeeee !important;">
                        <div class="row">
                            <div class="col">
                                <img src="{{ Voyager::image($coordonnee->logo_facture) }}"
                                    data-holder-rendered="true" style="width: 220px" />
                                <h4 class="name">{{ $coordonnee->abbreviation }}</h4>
                                <div><b>Email : </b> &nbsp; {{ $coordonnee->email }}</div>
                                <div><b>Adresse : </b> &nbsp; {{ $coordonnee->adresse_fr }}</div>
                                <div><b>Tél : </b> &nbsp;{{ $coordonnee->phone_1 }}
                                    @if ($coordonnee->phone_2)
                                        <span>/ {{ $coordonnee->phone_2 }}</span>
                                    @endif
                                </div>
                                @if (@$coordonnee->registre_commerce)
                                    <div><b>RC : </b>&nbsp; {{ $coordonnee->registre_commerce }}</div>
                                @endif
                                @if (@$coordonnee->matricule)
                                    <div><b>MF : </b>&nbsp; {{ $coordonnee->matricule }}</div>
                                @endif
                            </div>
                            <div class="col company-details">
                                <h1 class="invoice-id">Liste de Prix</h1>
                                <div class="date"><b>Date :</b> {{ $pricelist->created_at->format('d-m-Y') }}</div>
                                {{-- <div class="date"><b>Désignation:</b> {{ $pricelist->designation }}</div> --}}
                            </div>
                        </div>
                    </header>

                    <main>
                        <br><br>
                        <div class="table1">
                            <table class="table" cellspacing="0" cellpadding="0">
                                <thead>
                                    <tr>
                                        <th style="width: 5%; background: #ff4000 !important">#</th>
                                        {{-- <th style="width: 15%; background: #ff4000 !important">Code Barre</th> --}}
                                        <th style="width: 40%; background: #ff4000 !important">Produit</th>
                                        <th style="width: 20%; background: #ff4000 !important">Prix Gros</th>
                                        <th style="width: 20%; background: #ff4000 !important">Prix Unitaire</th>

                                    </tr>
                                </thead>
                                <tbody>
                                    @php
                                        $i = 1;
                                    @endphp
                                    @foreach ($details_pricelist as $details)
                                        <tr>
                                            <td @if ($i % 2 != 0) style="background-color: #eee !important" @endif>
                                                {{ $i }}
                                            </td>
                                            {{-- <td class="text-center"
                                                @if ($i % 2 != 0) style="background-color: #eee !important" @endif>
                                                {{ @$details->product->code_product }}
                                            </td> --}}
                                            <td @if ($i % 2 != 0) style="background-color: #eee !important" @endif>
                                                {{ @$details->product->designation_fr }}
                                            </td>
                                             <td class="text-right"
                                                @if ($i % 2 != 0) style="background-color: #eee !important" @endif>
                                                {{ number_format((float) @$details->prix_gros, 3, '.', '') }} DT
                                            </td>
                                            <td class="text-right"
                                                @if ($i % 2 != 0) style="background-color: #eee !important" @endif>
                                                {{ number_format((float) @$details->prix_unitaire, 3, '.', '') }} DT
                                            </td>

                                        </tr>
                                        @php
                                            $i++;
                                        @endphp
                                    @endforeach
                                </tbody>
                            </table>
                        </div>

                        {{-- @if (@$coordonnee->note)
                            <div class="notices">
                                <div>Note:</div>
                                <div class="notice">{{ $coordonnee->note }}</div>
                            </div>
                            <br>
                        @endif --}}

                        {{-- <div style="margin-left: 140px; text-decoration: underline;">
                            Signature et cachet
                        </div> --}}
                    </main>

                    {{-- <footer>
                        Bank UIB RIB : {{ $coordonnee->rib }}
                    </footer> --}}
                </div>
                <!--DO NOT DELETE THIS div. IT is responsible for showing footer always at the bottom-->
                <div></div>
            </div>
        </div>
    </div>

    <script>
        function printInvoice() {
            window.print()

        }
    </script>

</body>

</html>
