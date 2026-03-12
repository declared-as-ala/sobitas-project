<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>{{ $documentTitle ?? 'Bon de livraison' }} {{ $documentNumber ?? '' }}</title>
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
            min-height: 680px;
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
            padding-bottom: 50px;
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
            font-size: 10pt;
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
            padding: 8px !important;
            text-align: left;
            border: 1px solid #ff4a00 !important;
        }

        thead th.text-center { text-align: center !important; }
        thead th.text-right { text-align: right !important; }

        .table1 td {
            border-right: 1px solid #b4b4b4;
            border-left: 1px solid #b4b4b4;
            padding: 8px !important;
            font-size: 10pt;
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
            body {
                background-color: #fff;
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
                bottom: 0px;
            }
            .invoice>div:last-child {
                page-break-before: always;
            }
            thead th {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            tfoot tr:last-child th:last-child {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            .notices {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div id="invoice">
        <div class="invoice">
            <div>
                <!-- HEADER -->
                <header>
                    <div class="row">
                        <div class="col">
                            <!-- Logo assumes 'logo.png' in public folder as requested -->
                            <img src="{{ asset('logo.png') }}" alt="SOBITAS Logo" style="height: 60px; margin-bottom: 10px;" />
                            
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
                            <h1 class="invoice-id">{{ mb_strtoupper($documentTitle ?? 'BON DE LIVRAISON') }}</h1>
                            <div class="date"><b>Date :</b> {{ $documentDate ?? date('d/m/Y') }}</div>
                            <div class="number"><b>Numéro:</b> {{ $documentNumber ?? '' }}</div>
                        </div>
                    </div>
                </header>

                <main>
                    <!-- CLIENT INFO -->
                    <div class="row contacts">
                        <div class="col invoice-to">
                            <h5 class="text-gray-light">INFORMATIONS DU CLIENT</h5>
                            <hr class="custom-hr">
                            
                            @if(isset($client) && $client)
                                <div class="to"><b>Nom :</b> {{ $client->nom_prenom ?? ($client->nom . ' ' . $client->prenom) ?? '' }}</div>
                                @if($client->adresse || $client->ville)
                                    <div class="address"><b>Adresse :</b> {{ trim(($client->adresse ?? '') . ' ' . ($client->ville ?? '')) }}</div>
                                @endif
                                @if($client->phone)
                                    <div class="address"><b>Numéro de téléphone :</b> {{ $client->phone }}</div>
                                @endif
                            @elseif(isset($facture))
                                <div class="to"><b>Nom :</b> {{ $facture->nom_prenom ?? ($facture->nom . ' ' . $facture->prenom) ?? '' }}</div>
                                @if($facture->adresse1 || $facture->ville)
                                    <div class="address"><b>Adresse :</b> {{ trim(($facture->adresse1 ?? '') . ' ' . ($facture->ville ?? '')) }}</div>
                                @endif
                                @if($facture->phone)
                                    <div class="address"><b>Numéro de téléphone :</b> {{ $facture->phone }}</div>
                                @endif
                            @endif
                        </div>
                    </div>

                    <!-- TABLE -->
                    <div class="table1">
                        <table cellspacing="0" cellpadding="0">
                            <thead>
                                <tr>
                                    <th style="width: 5%;" class="text-center">#</th>
                                    <th style="width: 45%;">PRODUIT</th>
                                    <th style="width: 15%;" class="text-center">QUANTITÉ</th>
                                    <th style="width: 15%;" class="text-right">PRIX.U</th>
                                    <th style="width: 20%;" class="text-right">PRIX T.TTC</th>
                                </tr>
                            </thead>
                            <tbody>
                                @php $i = 1; @endphp
                                @foreach($details_facture ?? [] as $details)
                                    @php
                                        $bg = ($i % 2 == 0) ? 'background-color: #f5f5f5 !important;' : '';
                                        
                                        $designation = $details->product->designation_fr ?? '—';
                                        $qte = $details->qte ?? $details->quantite ?? 1;
                                        $pu = $details->prix_unitaire ?? $details->prix_ht ?? 0;
                                        $pttc = $details->prix_ttc ?? ($qte * $pu);
                                    @endphp
                                    <tr style="{{ $bg }}">
                                        <td class="text-center">{{ $i }}</td>
                                        <td>{{ collect(explode('-', $designation))->map(fn($v) => trim($v))->implode(' - ') }}</td>
                                        <td class="text-center">{{ $qte }}</td>
                                        <td class="text-right">{{ number_format((float) $pu, 3, '.', '') }}</td>
                                        <td class="text-right">{{ number_format((float) $pttc, 3, '.', '') }}</td>
                                    </tr>
                                    @php $i++; @endphp
                                @endforeach
                            </tbody>
                            <tfoot>
                                <!-- Montant Total HT -->
                                <tr>
                                    <td colspan="3"></td>
                                    <th colspan="1">Montant Total HT</th>
                                    <th class="text-right">
                                        @php
                                            $totalHt = 0;
                                            if(isset($totals)) {
                                                $htTotal = collect($totals)->firstWhere('label', 'Total HT');
                                                if($htTotal) $totalHt = str_replace([' DT', ','], ['', '.'], $htTotal['value']);
                                            } elseif(isset($facture)) {
                                                $totalHt = $facture->prix_ht ?? 0;
                                            }
                                        @endphp
                                        {{ number_format((float)$totalHt, 3, '.', '') }}
                                    </th>
                                </tr>

                                <!-- Remise / Frais de Livraison (only show if > 0 or if available) -->
                                @php
                                    $remise = 0;
                                    $frais = 0;
                                    $totalTtc = 0;
                                    
                                    if(isset($totals)) {
                                        $remiseTotal = collect($totals)->firstWhere('label', 'Remise');
                                        if($remiseTotal) $remise = (float) str_replace([' DT', ','], ['', '.'], $remiseTotal['value']);
                                        
                                        $fraisTotal = collect($totals)->firstWhere('label', 'Frais de livraison');
                                        if($fraisTotal) $frais = (float) str_replace([' DT', ','], ['', '.'], $fraisTotal['value']);
                                        
                                        $ttcTotal = collect($totals)->firstWhere('label', 'Net à payer');
                                        if($ttcTotal) $totalTtc = (float) str_replace([' DT', ','], ['', '.'], $ttcTotal['value']);
                                    } elseif(isset($facture)) {
                                        $remise = (float) ($facture->remise ?? 0);
                                        $frais = (float) ($facture->frais_livraison ?? 0);
                                        $totalTtc = (float) ($facture->prix_ttc ?? $facture->net_a_payer ?? 0);
                                    }
                                @endphp

                                @if($remise > 0)
                                    <tr>
                                        <td colspan="3"></td>
                                        <th colspan="1">Montant Remise</th>
                                        <th class="text-right">{{ number_format($remise, 3, '.', '') }}</th>
                                    </tr>
                                @endif
                                
                                @if($frais > 0)
                                    <tr>
                                        <td colspan="3"></td>
                                        <th colspan="1">Frais Livraison</th>
                                        <th class="text-right">{{ number_format($frais, 3, '.', '') }}</th>
                                    </tr>
                                @endif
                                
                                <!-- Placeholder for Percentage if needed -->
                                @if(isset($facture) && isset($facture->pourcentage_remise) && $facture->pourcentage_remise > 0)
                                    <tr>
                                        <td colspan="3"></td>
                                        <th colspan="1">Pourcentage Remise %</th>
                                        <th class="text-right">{{ number_format((float) $facture->pourcentage_remise, 1, '.', '') }} %</th>
                                    </tr>
                                @endif

                                <!-- Montant Totale TTC -->
                                <tr>
                                    <td colspan="3"></td>
                                    <th class="bt" colspan="1">Montant Totale TTC</th>
                                    <th class="text-right">
                                        {{ number_format((float) $totalTtc, 3, '.', '') }}
                                    </th>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <!-- NOTICES / NB -->
                    <div class="notices">
                        <div>Note :</div>
                        <div class="notice">
                            Arrête la présente facture à la somme de : 
                            <span id="words_{{ $documentNumber ?? 'doc' }}"></span> DT
                        </div>
                    </div>
                    
                    @if(isset($footerNote) && $footerNote)
                        <div class="notices" style="border-left-color: #777; margin-top: 10px;">
                            <div class="notice">{{ $footerNote }}</div>
                        </div>
                    @endif

                </main>

                <!-- FOOTER -->
                @if(isset($coordonnee) && $coordonnee->rib)
                <footer>
                    {{ $coordonnee->rib }}
                </footer>
                @endif
            </div>
            <div></div> <!-- for page break logic -->
        </div>
    </div>

    <!-- Script for number to words -->
    <script>
        function inWords(num) {
            var a = ['', 'un ', 'deux ', 'trois ', 'quatre ', 'cinq ', 'six ', 'sept ', 'huit ', 'neuf ', 'dix ', 'onze ', 'douze ', 'treize ', 'quatorze ', 'quinze ', 'seize ', 'dix-sept ', 'dix-huit ', 'dix-neuf '];
            var b = ['', '', 'vingt ', 'trente ', 'quarante ', 'cinquante ', 'soixante ', 'soixante-dix ', 'quatre-vingt ', 'quatre-vingt-dix '];
            
            if ((num = num.toString()).length > 9) return 'overflow';
            
            let tab = num.split('.');
            let n = ('000000000' + tab[0]).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            
            if (!n) return '';
            
            var str = '';
            str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) : '';
            str += (n[2] != 0) ? (str != '' ? '' : '') + (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'mille ' : '';
            str += (n[3] != 0) ? (str != '' ? '' : '') + (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'cents ' : '';
            str += (n[4] != 0) ? (str != '' ? '' : '') + (a[Number(n[4])] || b[n[4][0]] + a[n[4][1]]) : '';
            str += (n[5] != 0) ? (str != '' ? '' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';
            
            // Handle specific syntax cleaning
            str = str.replace('un mille', 'mille');
            str = str.replace('un cents', 'cent');
            str = str.replace('cents ', 'cent ');
            if (str.trim().endsWith('cent') && tab[0].endsWith('00')) str += 's'; // simple plural rule for cent
            
            let result = str.trim();
            if (result == '') result = 'zéro';
            
            result += ' dinars';
            
            if (tab.length > 1) {
                let nb = tab[1].padEnd(3, '0');
                return result + ' et ' + Number(nb) + ' millimes';
            }
            
            return result;
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            var total = "{{ number_format((float) $totalTtc, 3, '.', '') }}";
            var el = document.getElementById("words_{{ $documentNumber ?? 'doc' }}");
            if(el && total) {
                el.innerHTML = inWords(total);
            }
        });
    </script>
</body>
</html>
