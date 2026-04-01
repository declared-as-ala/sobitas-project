<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css">
    <title>Liste de Prix - {{ $pricelist->designation ?? $pricelist->id }}</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/js/bootstrap.min.js"></script>
</head>
<body>
@php
    $coordonnee = $coordonnee ?? $company ?? null;
    $logoUrl = null;
    $staticLogoPath = resource_path('views/print/logo_print.png');
    if (is_file($staticLogoPath)) {
        $mime    = @mime_content_type($staticLogoPath) ?: 'image/png';
        $logoUrl = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($staticLogoPath));
    }
@endphp
<style>
    #invoice { padding: 30px; }
    .invoice { position: relative; background-color: #FFF; min-height: 680px; padding: 15px; }
    .invoice header { padding: 10px 10px; margin-bottom: 20px; border-bottom: 1px solid #ff4000; }
    .invoice .company-details { text-align: right; }
    .company-details .invoice-id { margin: 26px; text-transform: uppercase; }
    .invoice main { padding-bottom: 50px; }
    .invoice table { width: 100%; border-collapse: collapse; border-spacing: 0; margin-bottom: 20px; }
    .invoice table td, .invoice table th { border-bottom: 1px solid #fff; }
    .invoice table th { white-space: nowrap; font-size: 13pt; }
    .invoice table tbody tr:last-child td { border-bottom: 1px solid #b4b4b4; }
    .invoice footer { font-size: 18px; width: 100%; text-align: center; color: #000; border-top: 1px solid #aaa; padding: 8px 0; }
    .hide_print { display: initial; }
    @media print {
        .invoice { overflow: hidden !important; }
        .invoice footer { position: absolute; bottom: 35px; page-break-after: always; }
        .hide_print { display: none; }
        .invoice > div:last-child { page-break-before: always; }
        .table1 { min-height: 10cm; }
        .page-content { zoom: 100%; }
    }
    thead th {
        background: #ff4000 !important; background-color: #ff4000 !important; color: #fff !important;
        font-weight: 600 !important; text-transform: uppercase !important; padding: 5px !important;
        text-align: center !important; border: 1px solid #ff4000 !important;
    }
    .table1 td { border-right: 1px solid #b4b4b4; border-left: 1px solid #b4b4b4; padding: 6px !important; }
    tbody { font-size: 10pt !important; }
    .contacts .address, .contacts .email, .contacts .to { font-weight: 600; font-size: 12pt; }
    .btn-info { background: #3e46df; border: 0; border-radius: 3px; color: #fff; padding: 6px 15px; }
</style>

<div class="page-content">
    <div id="invoice">
        @if (empty($forPdf))
        <div class="toolbar hide_print">
            <div class="text-right">
                <button type="button" id="printInvoice" class="btn btn-info" onclick="window.print()">Imprimer</button>
                <a class="btn btn-info" href="{{ $backUrl ?? url()->previous() }}">Retour</a>
            </div>
            <hr>
        </div>
        @endif

        <div class="invoice overflow-auto">
            <div style="min-width: 600px">
                <header style="background: #eeeeee !important;">
                    <div class="row">
                        <div class="col">
                            @if ($logoUrl)
                                <img src="{{ $logoUrl }}" alt="" style="width: 220px">
                            @endif
                            <h4 class="name">{{ $coordonnee->abbreviation ?? '' }}</h4>
                            <div><b>Email :</b> &nbsp; {{ $coordonnee->email ?? '' }}</div>
                            <div><b>Adresse :</b> &nbsp; {{ $coordonnee->adresse_fr ?? '' }}</div>
                            <div><b>Tél :</b> &nbsp;{{ $coordonnee->phone_1 ?? '' }}
                                @if (!empty($coordonnee->phone_2))<span>/ {{ $coordonnee->phone_2 }}</span>@endif
                            </div>
                            @if (!empty($coordonnee->registre_commerce))
                                <div><b>RC :</b>&nbsp; {{ $coordonnee->registre_commerce }}</div>
                            @endif
                            @if (!empty($coordonnee->matricule))
                                <div><b>MF :</b>&nbsp; {{ $coordonnee->matricule }}</div>
                            @endif
                        </div>
                        <div class="col company-details">
                            <h1 class="invoice-id">{{ $documentTitle ?? 'Liste de Prix' }}</h1>
                            <div class="date"><b>Date :</b> {{ $documentDate ?? $pricelist->created_at?->format('d-m-Y') }}</div>
                        </div>
                    </div>
                </header>

                <main>
                    <br><br>
                    <div class="table1">
                        <table class="table" cellspacing="0" cellpadding="0">
                            <thead>
                                <tr>
                                    <th style="width: 5%">#</th>
                                    <th style="width: 40%">Produit</th>
                                    <th style="width: 20%">Prix Gros</th>
                                    <th style="width: 20%">Prix Unitaire</th>
                                </tr>
                            </thead>
                            <tbody>
                                @php $i = 1; @endphp
                                @foreach ($price_list_rows ?? [] as $row)
                                    <tr>
                                        <td @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ $row['index'] ?? $i }}</td>
                                        <td @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ $row['designation'] ?? '—' }}</td>
                                        <td class="text-right" @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ number_format((float) ($row['prix_gros'] ?? 0), 3, '.', '') }} DT</td>
                                        <td class="text-right" @if($i % 2 != 0) style="background-color: #eee !important" @endif>{{ number_format((float) ($row['prix_unitaire'] ?? 0), 3, '.', '') }} DT</td>
                                    </tr>
                                    @php $i++; @endphp
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
            <div></div>
        </div>
    </div>
</div>
</body>
</html>
