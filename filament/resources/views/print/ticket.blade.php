@php
    $company = $coordonnee ?? $company ?? null;
    $documentDate = $ticket->date_ticket
        ? \Carbon\Carbon::parse($ticket->date_ticket)->format('d/m/Y')
        : ($ticket->created_at?->format('d/m/Y') ?? '');
    $documentTime = $ticket->created_at?->format('H:i') ?? '';

    $logoPath = public_path('logo.png');
    $logoUrl = is_file($logoPath)
        ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
        : asset('logo.png');

    $subTotal = 0;
    foreach ($details_ticket ?? [] as $d) {
        $qte        = (float) ($d->qte ?? $d->quantite ?? 0);
        $lineTotal  = $d->prix_ttc ?? ($qte * (float) ($d->prix_unitaire ?? 0));
        $subTotal  += (float) $lineTotal;
    }
    $remise    = (float) ($ticket->remise ?? 0);
    $pctRemise = (float) ($ticket->pourcentage_remise ?? 0);
    $netTotal  = (float) ($ticket->prix_ttc ?? $ticket->prix_total ?? max($subTotal - $remise, 0));
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket {{ $ticket->numero ?? '' }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #f1f5f9;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 16px 0;
        }

        .no-print {
            margin-bottom: 12px;
            display: flex;
            gap: 8px;
        }

        .btn {
            font-size: 13px;
            padding: 6px 16px;
            border: 0;
            border-radius: 4px;
            cursor: pointer;
        }

        .btn-primary { background: #ff4a00; color: #fff; }
        .btn-secondary { background: #64748b; color: #fff; }

        /* ── Receipt wrapper ── */
        .receipt {
            width: 80mm;
            background: #fff;
            padding: 8px 10px 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,.18);
        }

        /* Header */
        .receipt-header {
            text-align: center;
            padding-bottom: 8px;
            border-bottom: 1px dashed #888;
            margin-bottom: 8px;
        }

        .receipt-header img.logo {
            max-width: 160px;
            max-height: 90px;
            object-fit: contain;
            display: block;
            margin: 0 auto 4px;
        }

        .receipt-header .company-name {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .receipt-header .company-info {
            font-size: 10px;
            line-height: 1.5;
            color: #333;
        }

        /* Meta */
        .receipt-meta {
            font-size: 11px;
            text-align: center;
            margin-bottom: 8px;
            line-height: 1.6;
        }

        .receipt-meta .ticket-no {
            font-size: 13px;
            font-weight: 700;
        }

        /* Separator */
        .sep {
            border: none;
            border-top: 1px dashed #888;
            margin: 6px 0;
        }

        /* Items */
        .items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
        }

        .items thead th {
            font-size: 10px;
            text-transform: uppercase;
            border-bottom: 1px solid #ccc;
            padding: 3px 2px;
            text-align: left;
        }

        .items thead th:last-child { text-align: right; }

        .items tbody td {
            font-size: 11px;
            padding: 3px 2px;
            vertical-align: top;
        }

        .items tbody td:last-child {
            text-align: right;
            white-space: nowrap;
        }

        .item-detail {
            font-size: 10px;
            color: #444;
        }

        /* Totals */
        .totals {
            width: 100%;
            margin-top: 4px;
            border-top: 1px dashed #888;
            padding-top: 6px;
        }

        .totals table {
            width: 100%;
            border-collapse: collapse;
        }

        .totals td {
            font-size: 11px;
            padding: 2px 2px;
        }

        .totals td:last-child { text-align: right; }

        .totals .grand-total td {
            font-size: 13px;
            font-weight: 700;
            border-top: 1px solid #000;
            padding-top: 4px;
        }

        /* Footer */
        .receipt-footer {
            text-align: center;
            font-size: 10px;
            color: #444;
            margin-top: 10px;
            border-top: 1px dashed #888;
            padding-top: 8px;
            line-height: 1.6;
        }

        /* Print overrides */
        @media print {
            body {
                background: #fff;
                padding: 0;
                display: block;
            }

            .no-print { display: none !important; }

            .receipt {
                box-shadow: none;
                width: 80mm;
                padding: 4px 6px 10px;
            }

            @page {
                size: 80mm auto;
                margin: 0;
            }
        }
    </style>
</head>
<body>

    @if (!request()->query('embed') && empty($forPdf ?? false))
    <div class="no-print">
        <button type="button" onclick="window.print()" class="btn btn-primary">🖨️ Imprimer</button>
        <button type="button" onclick="window.close()" class="btn btn-secondary">Fermer</button>
    </div>
    @endif

    <div class="receipt" id="print-area">

        {{-- ── HEADER ── --}}
        <div class="receipt-header">
            <img src="{{ $logoUrl }}"
                 alt="{{ $company->abbreviation ?? 'SOBITAS' }}"
                 class="logo"
                 onerror="this.style.display='none'">

            <div class="company-name">{{ $company->abbreviation ?? $company->designation ?? 'SOBITAS' }}</div>

            <div class="company-info">
                @if($company?->adresse_fr)
                    {{ $company->adresse_fr }}<br>
                @endif
                @if($company?->phone_1)
                    Tél : {{ $company->phone_1 }}@if($company?->phone_2) / {{ $company->phone_2 }}@endif<br>
                @endif
                @if($company?->rc)
                    RC : {{ $company->rc }} &nbsp;|&nbsp; MF : {{ $company->matricule ?? $company->mf ?? '' }}<br>
                @endif
            </div>
        </div>

        {{-- ── META ── --}}
        <div class="receipt-meta">
            <div class="ticket-no">Ticket N° {{ $ticket->numero ?? '—' }}</div>
            <div>{{ $documentDate }}@if($documentTime)  {{ $documentTime }}@endif</div>
            @if($ticket->client)
                <div>Client : {{ $ticket->client->name ?? $ticket->client->raison_sociale ?? '—' }}</div>
                @if($ticket->client->phone ?? $ticket->client->phone_1 ?? null)
                    <div>Tél : {{ $ticket->client->phone ?? $ticket->client->phone_1 }}</div>
                @endif
            @endif
        </div>

        <hr class="sep">

        {{-- ── ITEMS ── --}}
        <table class="items">
            <thead>
                <tr>
                    <th style="width:55%">Produit</th>
                    <th style="width:20%; text-align:center">Qté</th>
                    <th style="width:25%">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($details_ticket ?? [] as $d)
                @php
                    $qte       = (float) ($d->qte ?? $d->quantite ?? 0);
                    $pu        = (float) ($d->prix_unitaire ?? 0);
                    $lineTotal = (float) ($d->prix_ttc ?? ($qte * $pu));
                @endphp
                <tr>
                    <td>{{ $d->product->designation_fr ?? '—' }}</td>
                    <td style="text-align:center">{{ number_format($qte, 0) }}</td>
                    <td>{{ number_format($lineTotal, 3, '.', '') }}</td>
                </tr>
                @if($pu > 0)
                <tr>
                    <td colspan="3" class="item-detail">
                        &nbsp;&nbsp;{{ number_format($qte, 0) }} x {{ number_format($pu, 3, '.', '') }}
                    </td>
                </tr>
                @endif
                @endforeach
            </tbody>
        </table>

        {{-- ── TOTALS ── --}}
        <div class="totals">
            <table>
                <tr>
                    <td>Sous-total HT</td>
                    <td>{{ number_format((float)($ticket->prix_ht ?? $subTotal), 3, '.', '') }}</td>
                </tr>
                @if($remise > 0)
                <tr>
                    <td>Remise</td>
                    <td>- {{ number_format($remise, 3, '.', '') }}</td>
                </tr>
                @endif
                @if($pctRemise > 0)
                <tr>
                    <td>Remise %</td>
                    <td>{{ number_format($pctRemise, 1) }} %</td>
                </tr>
                @endif
                <tr class="grand-total">
                    <td>NET À PAYER</td>
                    <td>{{ number_format($netTotal, 3, '.', '') }} DT</td>
                </tr>
            </table>
        </div>

        {{-- ── FOOTER ── --}}
        <div class="receipt-footer">
            {{ $company?->footer_ticket ?? 'Merci pour votre visite !' }}<br>
            @if($company?->site_web)
                {{ strtoupper($company->site_web) }}<br>
            @endif
            Retour / échange sous 48h avec ticket.
        </div>

    </div>

</body>
</html>
