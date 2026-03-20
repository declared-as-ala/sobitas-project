@php
    $logoUrl  = config('marketing.logo_url', rtrim(config('app.url'), '/') . '/logo.png');
    $co       = $coordonnee ?? null;
    $cl       = $client ?? $facture->client ?? null;
    $companyName = $co ? ($co->name ?? $co->nom ?? null) : null;
    $clientPhone = $cl ? ($cl->phone_1 ?? $cl->phone ?? null) : null;
    $rows     = $invoice_rows ?? [];
    $totals   = $totals ?? [];
    $lastIdx  = count($totals) - 1;
    $preLastIdx = $lastIdx - 1; // NET À PAYER is last, TOTAL TTC is pre-last
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>{{ $documentTitle ?? 'Facture' }} #{{ $documentNumber ?? '' }}</title>
    <style type="text/css">
        body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
        table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
        img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
        @media only screen and (max-width:620px) {
            .wrapper   { width:100% !important; }
            .pad       { padding:16px !important; }
            .col-half  { display:block !important; width:100% !important; padding:0 0 12px !important; border-right:none !important; border-bottom:1px solid #e2e8f0 !important; }
            .col-half-r { display:block !important; width:100% !important; padding:12px 0 0 !important; }
            .hide-mobile { display:none !important; }
            .tbl-prod  { font-size:11px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="padding:24px 12px;">

    <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0" width="620" style="max-width:620px;margin:0 auto;">

        {{-- ── HEADER: orange band with logo + document info ─────────────── --}}
        <tr>
            <td style="background:#ff4a00;border-radius:14px 14px 0 0;padding:24px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="vertical-align:middle;">
                            <div style="display:inline-block;background:#ffffff;border-radius:10px;padding:8px 14px;">
                                <img src="{{ $logoUrl }}" alt="SOBITAS" style="max-height:72px;max-width:220px;height:auto;display:block;">
                            </div>
                        </td>
                        <td align="right" style="vertical-align:middle;padding-left:16px;">
                            <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;text-transform:uppercase;letter-spacing:.06em;">{{ mb_strtoupper($documentTitle ?? 'FACTURE') }}</p>
                            <p style="margin:5px 0 0;font-size:14px;font-weight:600;color:rgba(255,255,255,.9);">N° {{ $documentNumber ?? '' }}</p>
                            <p style="margin:3px 0 0;font-size:13px;color:rgba(255,255,255,.75);">{{ $documentDate ?? '' }}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        {{-- ── WHITE BODY ──────────────────────────────────────────────────── --}}
        <tr>
            <td class="pad" style="background:#ffffff;padding:28px;border-radius:0 0 14px 14px;box-shadow:0 4px 16px rgba(0,0,0,.08);">

                {{-- ── FROM / TO two columns ─────────────────────────────── --}}
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                    <tr>
                        {{-- Company --}}
                        <td class="col-half" style="width:48%;vertical-align:top;padding-right:16px;border-right:1px solid #e2e8f0;">
                            <p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#ff4a00;text-transform:uppercase;letter-spacing:.1em;">De</p>
                            @if($co)
                                @if(!empty($companyName))
                                    <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#0f172a;">{{ $companyName }}</p>
                                @endif
                                @if(!empty($co->adresse_fr))
                                    <p style="margin:2px 0;font-size:12px;color:#64748b;">{{ $co->adresse_fr }}</p>
                                @endif
                                @if(!empty($co->phone_1))
                                    <p style="margin:2px 0;font-size:12px;color:#64748b;">Tél : {{ $co->phone_1 }}@if(!empty($co->phone_2)) / {{ $co->phone_2 }}@endif</p>
                                @endif
                                @if(!empty($co->email))
                                    <p style="margin:2px 0;font-size:12px;color:#64748b;">{{ $co->email }}</p>
                                @endif
                                @if(!empty($co->matricule))
                                    <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">MF : {{ $co->matricule }}</p>
                                @endif
                                @if(!empty($co->registre_commerce))
                                    <p style="margin:2px 0;font-size:11px;color:#94a3b8;">RC : {{ $co->registre_commerce }}</p>
                                @endif
                            @else
                                <p style="margin:0;font-size:13px;font-weight:600;color:#0f172a;">SOBITAS</p>
                            @endif
                        </td>
                        {{-- Client --}}
                        <td class="col-half-r" style="width:4%;"></td>
                        <td class="col-half" style="width:48%;vertical-align:top;padding-left:16px;">
                            <p style="margin:0 0 7px;font-size:10px;font-weight:700;color:#ff4a00;text-transform:uppercase;letter-spacing:.1em;">À</p>
                            @if($cl)
                                <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#0f172a;">{{ $cl->name ?? $cl->raison_sociale ?? '' }}</p>
                                @if(!empty($cl->adresse))
                                    <p style="margin:2px 0;font-size:12px;color:#64748b;">{{ $cl->adresse }}</p>
                                @endif
                                @if(!empty($clientPhone))
                                    <p style="margin:2px 0;font-size:12px;color:#64748b;">Tél : {{ $clientPhone }}</p>
                                @endif
                                @if(!empty($cl->email))
                                    <p style="margin:2px 0;font-size:12px;color:#64748b;">{{ $cl->email }}</p>
                                @endif
                                @if(!empty($cl->matricule))
                                    <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">MF : {{ $cl->matricule }}</p>
                                @endif
                            @else
                                <p style="margin:0;font-size:13px;color:#94a3b8;">—</p>
                            @endif
                        </td>
                    </tr>
                </table>

                {{-- Divider --}}
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr><td style="border-top:1px solid #e2e8f0;padding:0;font-size:0;line-height:0;">&nbsp;</td></tr>
                </table>
                <div style="height:20px;"></div>

                {{-- ── Section label ─────────────────────────────────────── --}}
                <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.1em;">📦 Détail des produits</p>

                {{-- ── Products table ─────────────────────────────────────── --}}
                <table role="presentation" class="tbl-prod" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
                    <thead>
                        <tr style="background:#ff4a00;">
                            <th style="padding:10px 10px;text-align:center;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;width:4%;">#</th>
                            <th style="padding:10px 10px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;">Produit</th>
                            <th style="padding:10px 8px;text-align:center;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;width:7%;">Qté</th>
                            <th style="padding:10px 8px;text-align:right;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;width:13%;">P.U. HT</th>
                            <th style="padding:10px 8px;text-align:right;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;width:8%;">TVA</th>
                            <th style="padding:10px 10px;text-align:right;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;width:14%;">Total HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($rows as $row)
                        <tr style="background:{{ $loop->even ? '#ffffff' : '#f8fafc' }};">
                            <td style="padding:9px 10px;font-size:12px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;">{{ $row['index'] }}</td>
                            <td style="padding:9px 10px;font-size:12px;color:#1e293b;border-top:1px solid #f1f5f9;">{{ $row['produit'] }}</td>
                            <td style="padding:9px 8px;font-size:12px;color:#475569;text-align:center;border-top:1px solid #f1f5f9;">{{ $row['qte'] }}</td>
                            <td style="padding:9px 8px;font-size:12px;color:#475569;text-align:right;border-top:1px solid #f1f5f9;">{{ number_format($row['pu_ht'], 3, '.', ' ') }}</td>
                            <td style="padding:9px 8px;font-size:12px;color:#475569;text-align:right;border-top:1px solid #f1f5f9;">{{ number_format($row['tva_pct'], 0) }}%</td>
                            <td style="padding:9px 10px;font-size:12px;font-weight:600;color:#0f172a;text-align:right;border-top:1px solid #f1f5f9;">{{ number_format($row['total_ht'], 3, '.', ' ') }}</td>
                        </tr>
                        @empty
                        <tr><td colspan="6" style="padding:16px;text-align:center;font-size:13px;color:#94a3b8;">Aucun produit</td></tr>
                        @endforelse
                    </tbody>
                </table>

                {{-- ── Totals block (right-aligned) ──────────────────────── --}}
                <table role="presentation" cellpadding="0" cellspacing="0" align="right" style="min-width:280px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
                    @foreach($totals as $i => $row)
                    @php
                        $isLast     = ($i === $lastIdx);
                        $isPreLast  = ($i === $preLastIdx);
                        $rowBg      = $isLast ? '#fff7ed' : ($isPreLast ? '#f8fafc' : ($i % 2 === 0 ? '#ffffff' : '#f8fafc'));
                        $topBorder  = $isLast ? '2px solid #ff4a00' : '1px solid #f1f5f9';
                        $labelSize  = $isLast ? '14px' : '12px';
                        $valueSize  = $isLast ? '16px' : '13px';
                        $labelColor = $isLast ? '#92400e' : '#64748b';
                        $valueColor = $isLast ? '#ff4a00' : '#0f172a';
                        $fontWeight = $isLast ? '700' : '500';
                        $padding    = $isLast ? '13px 16px' : '9px 16px';
                    @endphp
                    <tr style="background:{{ $rowBg }};">
                        <td style="padding:{{ $padding }};font-size:{{ $labelSize }};font-weight:{{ $fontWeight }};color:{{ $labelColor }};border-top:{{ $topBorder }};">{{ $row['label'] }}</td>
                        <td style="padding:{{ $padding }};font-size:{{ $valueSize }};font-weight:{{ $fontWeight }};color:{{ $valueColor }};text-align:right;white-space:nowrap;border-top:{{ $topBorder }};">{{ $row['value'] }}</td>
                    </tr>
                    @endforeach
                </table>

                <div style="clear:both;"></div>

                {{-- ── Footer note / payment terms ───────────────────────── --}}
                @if(!empty($footerNote))
                <div style="margin-top:20px;padding:12px 16px;border-left:4px solid #ff4a00;background:#fff7ed;border-radius:0 8px 8px 0;">
                    <p style="margin:0;font-size:12px;color:#92400e;line-height:1.5;">{{ $footerNote }}</p>
                </div>
                @endif

                @if(!empty($paymentTerms))
                <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5;">{{ $paymentTerms }}</p>
                @endif

            </td>
        </tr>

        {{-- ── FOOTER: company contact + RIB ─────────────────────────────── --}}
        <tr>
            <td style="padding:20px 0;text-align:center;">
                @if($co && !empty($co->rib))
                    <p style="margin:0 0 4px;font-size:12px;color:#64748b;">{{ $co->rib }}</p>
                @endif
                @if($co && !empty($co->adresse_fr))
                    <p style="margin:0;font-size:11px;color:#94a3b8;">SOBITAS — {{ $co->adresse_fr }}</p>
                @else
                    <p style="margin:0;font-size:11px;color:#94a3b8;">SOBITAS</p>
                @endif
            </td>
        </tr>

    </table>
</td></tr>
</table>

</body>
</html>
