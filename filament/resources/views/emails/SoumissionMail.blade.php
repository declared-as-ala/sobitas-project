<!DOCTYPE html>
<html lang="fr">

@php
    $facture = $data['commande'];
    $details_facture = $data['details'];
@endphp

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Bon de Livraison {{ @$facture->numero }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 10px;
            margin: 0;
            width: 100%;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }

        .email-container {
            max-width: 800px;
            width: 100%;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            box-sizing: border-box;
        }

        .email-header {
            background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }

        .email-header .logo-wrapper {
            display: inline-block;
            background-color: #ffffff;
            padding: 15px;
            border-radius: 16px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .email-header .logo {
            max-width: 200px;
            height: auto;
            display: block;
        }

        .email-header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }

        .email-header .order-info {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 20px;
            flex-wrap: wrap;
        }

        .email-header .order-info-item {
            background: rgba(255, 255, 255, 0.2);
            padding: 12px 20px;
            border-radius: 8px;
        }

        .email-header .order-info-item strong {
            display: block;
            font-size: 12px;
            opacity: 0.9;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .email-header .order-info-item span {
            font-size: 18px;
            font-weight: 600;
        }

        .company-info {
            background: #f9fafb;
            padding: 25px 30px;
            border-bottom: 2px solid #e5e7eb;
        }

        .company-info h3 {
            color: #dc2626;
            font-size: 18px;
            margin-bottom: 15px;
            font-weight: 600;
        }

        .company-info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
        }

        .company-info-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }

        .company-info-item strong {
            color: #6b7280;
            font-size: 13px;
            min-width: 80px;
        }

        .company-info-item span {
            color: #1f2937;
            font-size: 14px;
        }

        .delivery-card {
            background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%);
            margin: 30px;
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid #dc2626;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .delivery-card h2 {
            color: #dc2626;
            font-size: 20px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
        }

        .delivery-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }

        .delivery-info-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }

        .delivery-info-item .icon {
            color: #dc2626;
            font-size: 18px;
            margin-top: 2px;
            min-width: 20px;
        }

        .delivery-info-item .label {
            color: #6b7280;
            font-size: 13px;
            font-weight: 500;
            min-width: 120px;
        }

        .delivery-info-item .value {
            color: #1f2937;
            font-size: 14px;
            font-weight: 500;
        }

        .products-section {
            margin: 30px;
        }

        .products-section h2 {
            color: #1f2937;
            font-size: 22px;
            margin-bottom: 20px;
            font-weight: 600;
        }

        .table-wrapper {
            width: 100%;
            overflow-x: auto;
        }

        .products-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .products-table thead {
            background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
            color: white;
        }

        .products-table th {
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .products-table th:last-child,
        .products-table td:last-child {
            text-align: right;
        }

        .products-table th:nth-child(3),
        .products-table td:nth-child(3) {
            text-align: center;
        }

        .products-table tbody tr {
            border-bottom: 1px solid #e5e7eb;
        }

        .products-table td {
            padding: 12px 8px;
            font-size: 13px;
            color: #1f2937;
        }

        .product-name { font-weight: 500; color: #1f2937; }
        .product-qty { font-weight: 600; color: #dc2626; }
        .product-price { font-weight: 600; color: #059669; }

        .summary-section {
            margin: 30px;
            background: #f9fafb;
            padding: 25px;
            border-radius: 12px;
            border: 2px solid #e5e7eb;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }

        .summary-row:last-child { border-bottom: none; }

        .summary-row-label {
            font-size: 15px;
            color: #6b7280;
            font-weight: 500;
        }

        .summary-row-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
        }

        .summary-row.total {
            margin-top: 10px;
            padding-top: 20px;
            border-top: 2px solid #dc2626;
        }

        .summary-row.total .summary-row-label {
            font-size: 18px;
            color: #1f2937;
            font-weight: 700;
        }

        .summary-row.total .summary-row-value {
            font-size: 24px;
            color: #dc2626;
            font-weight: 700;
        }

        .summary-row.free-shipping .summary-row-value {
            color: #059669;
        }

        .email-footer {
            background: #1f2937;
            color: #9ca3af;
            padding: 30px;
            text-align: center;
        }

        .email-footer .bank-info {
            font-size: 14px;
            margin-bottom: 15px;
            color: #d1d5db;
        }

        .email-footer .bank-info strong { color: #f3f4f6; }

        .email-footer .note {
            background: #374151;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            border-left: 4px solid #dc2626;
        }

        .email-footer .note-title {
            color: #dc2626;
            font-weight: 600;
            margin-bottom: 10px;
            font-size: 16px;
        }

        .email-footer .note-content {
            color: #d1d5db;
            font-size: 14px;
            line-height: 1.6;
        }

        @media only screen and (max-width: 600px) {
            body { padding: 5px; }
            .email-container { border-radius: 8px; }
            .email-header { padding: 25px 15px; }
            .email-header h1 { font-size: 22px; }
            .delivery-card { margin: 20px 15px; padding: 20px 15px; }
            .products-section { margin: 20px 15px; }
            .summary-section { margin: 20px 15px; padding: 20px 15px; }
            .email-footer { padding: 20px 15px; }
        }
    </style>
</head>

<body>
    @php
        $coordonnee = \App\Models\Coordinate::first();
    @endphp

    <div class="email-container">
        <!-- Header -->
        <div class="email-header">
            @if($coordonnee && $coordonnee->logo_facture)
                <div class="logo-wrapper">
                    <img src="{{ asset('storage/' . $coordonnee->logo_facture) }}" alt="Logo" class="logo" />
                </div>
            @endif
            <h1>Bon de Livraison</h1>
            <div class="order-info">
                <div class="order-info-item">
                    <strong>Date</strong>
                    <span>{{ $facture->created_at->format('d/m/Y') }}</span>
                </div>
                <div class="order-info-item">
                    <strong>Numéro</strong>
                    <span>{{ $facture->numero }}</span>
                </div>
            </div>
        </div>

        <!-- Company Information -->
        @if($coordonnee)
        <div class="company-info">
            <h3>{{ $coordonnee->abbreviation ?? 'SOBITAS' }}</h3>
            <div class="company-info-grid">
                @if($coordonnee->email)
                <div class="company-info-item">
                    <strong>Email:</strong>
                    <span>{{ $coordonnee->email }}</span>
                </div>
                @endif
                @if($coordonnee->adresse_fr)
                <div class="company-info-item">
                    <strong>Adresse:</strong>
                    <span>{{ $coordonnee->adresse_fr }}</span>
                </div>
                @endif
                @if($coordonnee->phone_1)
                <div class="company-info-item">
                    <strong>Téléphone:</strong>
                    <span>{{ $coordonnee->phone_1 }}@if($coordonnee->phone_2) / {{ $coordonnee->phone_2 }}@endif</span>
                </div>
                @endif
                @if($coordonnee->registre_commerce)
                <div class="company-info-item">
                    <strong>RC:</strong>
                    <span>{{ $coordonnee->registre_commerce }}</span>
                </div>
                @endif
                @if($coordonnee->matricule)
                <div class="company-info-item">
                    <strong>MF:</strong>
                    <span>{{ $coordonnee->matricule }}</span>
                </div>
                @endif
            </div>
        </div>
        @endif

        <!-- Delivery Information -->
        <div class="delivery-card">
            <h2>📦 Informations de Livraison</h2>
            <div class="delivery-info">
                @if(@$facture->livraison_nom || @$facture->livraison_prenom || @$facture->nom || @$facture->prenom)
                <div class="delivery-info-item">
                    <span class="icon">👤</span>
                    <span class="label">Nom et prénom:</span>
                    <span class="value">{{ @$facture->livraison_nom ?: @$facture->nom }} {{ @$facture->livraison_prenom ?: @$facture->prenom }}</span>
                </div>
                @endif

                @if(@$facture->livraison_adresse1 || @$facture->adresse1)
                <div class="delivery-info-item">
                    <span class="icon">📍</span>
                    <span class="label">Adresse:</span>
                    <span class="value">{{ @$facture->livraison_adresse1 ?: @$facture->adresse1 }}</span>
                </div>
                @endif

                @if(@$facture->livraison_ville || @$facture->ville)
                <div class="delivery-info-item">
                    <span class="icon">🏙️</span>
                    <span class="label">Ville:</span>
                    <span class="value">{{ @$facture->livraison_ville ?: @$facture->ville }}</span>
                </div>
                @endif

                @if(@$facture->livraison_region || @$facture->region)
                <div class="delivery-info-item">
                    <span class="icon">🗺️</span>
                    <span class="label">Région:</span>
                    <span class="value">{{ @$facture->livraison_region ?: @$facture->region }}</span>
                </div>
                @endif

                @if(@$facture->livraison_email || @$facture->email)
                <div class="delivery-info-item">
                    <span class="icon">✉️</span>
                    <span class="label">Email:</span>
                    <span class="value">{{ @$facture->livraison_email ?: @$facture->email }}</span>
                </div>
                @endif

                @if(@$facture->livraison_phone || @$facture->phone)
                <div class="delivery-info-item">
                    <span class="icon">📞</span>
                    <span class="label">Téléphone:</span>
                    <span class="value">{{ @$facture->livraison_phone ?: @$facture->phone }}</span>
                </div>
                @endif
            </div>
        </div>

        <!-- Products Table -->
        <div class="products-section">
            <h2>Détails de la commande</h2>
            <div class="table-wrapper">
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Produit</th>
                            <th>Quantité</th>
                            <th>Prix unitaire</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        @php $i = 1; @endphp
                        @foreach ($details_facture as $details)
                            <tr>
                                <td>{{ $i }}</td>
                                <td class="product-name">{{ @$details->produit->designation_fr ?? 'Produit' }}</td>
                                <td class="product-qty">{{ $details->qte ?? 0 }}</td>
                                <td>{{ number_format((float) @$details->prix_unitaire, 3, '.', '') }} DT</td>
                                <td class="product-price">{{ number_format((float) @$details->prix_ttc, 3, '.', '') }} DT</td>
                            </tr>
                            @php $i++; @endphp
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Summary -->
        <div class="summary-section">
            <div class="summary-row">
                <span class="summary-row-label">Sous-total HT</span>
                <span class="summary-row-value">{{ number_format((float) @$facture->prix_ht, 3, '.', '') }} DT</span>
            </div>
            <div class="summary-row {{ @$facture->frais_livraison == 0 ? 'free-shipping' : '' }}">
                <span class="summary-row-label">Frais de livraison</span>
                <span class="summary-row-value">
                    {{ @$facture->frais_livraison == 0 ? 'Gratuit' : number_format((float) @$facture->frais_livraison, 3, '.', '') . ' DT' }}
                </span>
            </div>
            <div class="summary-row total">
                <span class="summary-row-label">Total TTC</span>
                <span class="summary-row-value">{{ number_format((float) @$facture->prix_ttc, 3, '.', '') }} DT</span>
            </div>
        </div>

        <!-- Footer -->
        <div class="email-footer">
            <div class="bank-info">
                <strong>RIB:</strong> 03507065011500468753
            </div>
            @if($coordonnee && $coordonnee->note)
            <div class="note">
                <div class="note-title">Note importante</div>
                <div class="note-content">{{ $coordonnee->note }}</div>
            </div>
            @endif
        </div>
    </div>
</body>
</html>
