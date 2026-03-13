<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>{{ $documentTitle ?? 'Document' }} {{ $documentNumber ?? '' }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
            background-color: #fff;
        }

        #invoice {
            padding: 30px;
            max-width: 1000px;
            margin: 0 auto;
        }

        .invoice {
            position: relative;
            background-color: #FFF;
            min-height: 0;
            padding: 15px;
        }

        .invoice header {
            padding: 10px 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid #ff4a00; /* SOBITAS Orange separator */
            background: #f9fafb !important;
        }

        .row {
            display: flex;
            flex-wrap: wrap;
            width: 100%;
        }

        .col {
            flex: 1;
            padding: 0 15px;
        }

        .col.company-details {
            text-align: right;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
        }

        .invoice .company-details .name {
            margin-top: 0;
            margin-bottom: 0;
            font-size: 1.5rem;
        }

        .invoice .contacts {
            margin-bottom: 20px;
        }

        .invoice .invoice-to {
            text-align: left;
        }

        .invoice .invoice-to .to {
            margin-top: 0;
            margin-bottom: 0;
        }

        .company-details .invoice-id {
            margin: 0 0 10px 0;
            text-transform: uppercase;
            font-size: 2rem;
            color: #333;
        }

        .date, .number {
            font-size: 1rem;
            margin-bottom: 5px;
        }

        .invoice main {
            padding-bottom: 10px;
        }

        .invoice main .notices {
            padding-left: 6px;
            font-size: 12pt;
            border-left: 6px solid #ff4a00; /* SOBITAS Orange */
            margin-top: 30px;
        }

        .invoice main .notices .notice {
            font-size: 12pt;
        }

        .invoice table {
            width: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            margin-bottom: 20px;
        }

        .invoice table td,
        .invoice table th {
            border-bottom: 1px solid #fff;
        }

        .invoice table th {
            white-space: nowrap;
            font-size: 9pt;
        }

        .invoice table tbody tr:last-child td {
            border-bottom: 1px solid #b4b4b4;
        }

        .invoice table tfoot td {
            background: 0 0;
            border-bottom: none;
            white-space: nowrap;
            text-align: right;
            padding: 8px 15px;
            font-size: 11pt;
            border-top: 1px solid #aaa;
        }

        .invoice table tfoot tr:first-child td {
            border-top: none;
        }

        .invoice table tfoot tr td:first-child {
            border: none;
        }

        .invoice footer {
            width: 100%;
            text-align: center;
            color: #555;
            border-top: 1px solid #aaa;
            padding: 8px 0;
            font-size: 9pt;
        }

        .table1 {
            width: 100%;
        }

        thead th {
            background: #ff4a00 !important; /* SOBITAS Orange */
            background-color: #ff4a00 !important;
            color: #fff !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            padding: 5px 6px !important;
            text-align: left;
            border: 1px solid #ff4a00 !important;
        }

        thead th.text-center { text-align: center !important; }
        thead th.text-right { text-align: right !important; }

        .table1 td {
            border-right: 1px solid #b4b4b4;
            border-left: 1px solid #b4b4b4;
            padding: 4px 6px !important;
            font-size: 9pt;
        }

        .table1 td.text-center { text-align: center; }
        .table1 td.text-right { text-align: right; }

        tfoot td, tfoot th {
            text-align: right;
            padding: 8px;
            font-size: 10pt;
        }

        tfoot th:last-child {
            border-bottom: 1px solid #b4b4b4;
            padding-right: 8px;
        }

        tfoot tr:last-child th:last-child {
            background: #ffebe0 !important; /* Highlight background */
            border-top: 2px solid black !important;
            font-weight: bold;
            font-size: 11pt;
        }
        
        tfoot .bt {
            border-top: 2px solid black !important;
            font-weight: bold;
        }

        .text-gray-light {
            color: #555;
            font-size: 11pt;
            margin-bottom: 5px;
            margin-top: 0;
            text-transform: uppercase;
        }

        .contacts .address,
        .contacts .email,
        .contacts .to {
            font-weight: normal;
            font-size: 10pt;
            line-height: 1.5;
        }

        .contacts b {
            font-weight: 600;
        }

        hr.custom-hr {
            margin: 5px 0 10px 0;
            border: 0;
            border-top: 1px solid #eee;
        }
        
        .header-info {
            font-size: 9pt;
            line-height: 1.4;
            color: #444;
        }

        @media print {
            @page {
                margin: 8mm;
            }
            body {
                background-color: #fff;
                margin: 0;
            }
            #invoice {
                padding: 0;
                margin: 0;
                max-width: none;
            }
            .invoice {
                overflow: hidden !important;
                padding: 0;
            }
            .invoice footer {
                position: fixed;
                bottom: 0;
            }
            header, .client-info-block, .table1 {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            thead {
                display: table-header-group;
            }
            tfoot {
                display: table-footer-group;
            }
            tr {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .notices {
                page-break-inside: avoid;
                break-inside: avoid;
                page-break-before: auto;
                break-before: auto;
            }
            thead th {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            tfoot tr:last-child th:last-child {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            /* Suppress printed URL */
            a[href]:after {
                content: "" !important;
            }
        }
    </style>
</head>
<body>
    @php
        $logoPath = public_path('logo.png');
        $logoUrl = is_file($logoPath)
            ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
            : asset('logo.png');
    @endphp

    <div id="invoice">
        <div class="invoice">
            <div>
                <!-- HEADER -->
                <header>
                    <div class="row">
                        <div class="col">
                            <img src="{{ $logoUrl }}" alt="SOBITAS Logo" style="height: 80px; max-width: 240px; object-fit: contain; margin-bottom: 6px;" />
                            
                            <div class="header-info">
                                @if(isset($coordonnee))
                                    @if($coordonnee->email)
                                        <div><b>Email :</b> {{ $coordonnee->email }}</div>
                                    @endif
                                    @if($coordonnee->adresse_fr)
                                        <div><b>Adresse :</b> {{ $coordonnee->adresse_fr }}</div>
                                    @endif
                                    @if($coordonnee->phone_1)
                                        <div><b>Tél :</b> {{ $coordonnee->phone_1 }} 
                                            @if($coordonnee->phone_2) / {{ $coordonnee->phone_2 }} @endif
                                        </div>
                                    @endif
                                    @if($coordonnee->registre_commerce)
                                        <div><b>RC :</b> {{ $coordonnee->registre_commerce }}</div>
                                    @endif
                                    @if($coordonnee->matricule)
                                        <div><b>MF :</b> {{ $coordonnee->matricule }}</div>
                                    @endif
                                @else
                                    <!-- Fallback if coordonnee is not available -->
                                    <div><b>Email :</b> contact@protein.tn</div>
                                    <div><b>Adresse :</b> Rue Ribat, 4000 Sousse Tunisie</div>
                                    <div><b>Tél :</b> +216 27 612 500 / +216 73 200 169</div>
                                    <div><b>RC :</b> B91142842015</div>
                                    <div><b>MF :</b> 1411068/Q/A/M/000</div>
                                @endif
                            </div>
                        </div>
                        <div class="col company-details">
                            <h1 class="invoice-id">{{ mb_strtoupper($documentTitle ?? 'DOCUMENT') }}</h1>
                            <div class="date"><b>Date :</b> {{ $documentDate ?? date('d/m/Y') }}</div>
                            <div class="number"><b>Numéro:</b> {{ $documentNumber ?? '' }}</div>
                            
                            @yield('client-info-header')
                        </div>
                    </div>
                </header>

                <main>
                    @yield('client-info')

                    <div class="table1">
                        @yield('document-body')
                    </div>

                    @yield('notices')

                </main>

                <!-- FOOTER -->
                @if(isset($coordonnee) && $coordonnee->rib)
                <footer>
                    {{ $coordonnee->rib }}
                </footer>
                @endif
            </div>
        </div>
    </div>

    @yield('scripts')
</body>
</html>
