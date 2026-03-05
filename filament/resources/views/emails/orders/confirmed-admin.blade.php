@php
    $details = $commande->details()->with('product:id,designation_fr')->get();
    $logoUrl = config('marketing.logo_url', rtrim(config('app.url'), '/') . '/logo.png');
    $adminUrl = url(\App\Filament\Resources\CommandeResource::getUrl('edit', ['record' => $commande]));
    $statusLabel = Commande::getStatusLabel($commande->etat ?? 'nouvelle_commande');
    $dateFormatted = $commande->created_at ? $commande->created_at->locale('fr_FR')->isoFormat('D MMMM YYYY à HH:mm') : '';
    $nom = trim(($commande->livraison_nom ?? $commande->nom ?? '') . ' ' . ($commande->livraison_prenom ?? $commande->prenom ?? ''));
    $adresse = trim($commande->livraison_adresse1 ?? $commande->adresse1 ?? '');
    $ville = trim(($commande->livraison_ville ?? $commande->ville ?? '') . ' ' . ($commande->livraison_region ?? $commande->region ?? ''));
    $phone = $commande->livraison_phone ?? $commande->phone ?? '';
    $email = $commande->livraison_email ?? $commande->email ?? '';
    $sousTotal = (float) ($commande->prix_ht ?? 0);
    $remise = (float) ($commande->remise ?? 0);
    $discountHt = (float) ($commande->discount_ht ?? 0);
    $frais = (float) ($commande->frais_livraison ?? 0);
    $totalTtc = (float) ($commande->prix_ttc ?? 0);
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <meta name="color-scheme" content="light">
    <title>Nouvelle commande {{ $commande->numero }}</title>
    <style type="text/css">
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        @media only screen and (max-width: 620px) {
            .email-wrapper { width: 100% !important; max-width: 100% !important; }
            .email-container { width: 100% !important; padding-left: 16px !important; padding-right: 16px !important; }
            .email-section { padding-left: 16px !important; padding-right: 16px !important; }
            .header-padding { padding: 24px 20px !important; }
            .admin-bar-inner { display: block !important; }
            .admin-bar-inner td { display: block !important; width: 100% !important; text-align: left !important; padding: 8px 0 !important; }
            .headline { font-size: 20px !important; }
            .subhead { font-size: 13px !important; }
            .card-padding { padding: 16px !important; }
            .product-cell { padding: 10px 12px !important; font-size: 13px !important; }
            .btn-wrap { display: block !important; width: 100% !important; }
            .btn-wrap td { display: block !important; width: 100% !important; padding: 0 !important; }
            .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 16px 24px !important; text-align: center !important; }
            .footer-padding { padding: 20px 16px !important; font-size: 12px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #1f2937; background-color: #f3f4f6;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 20px 12px;">
                <table role="presentation" class="email-wrapper" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06);">
                    <!-- Admin alert bar -->
                    <tr>
                        <td style="padding: 20px 32px; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); color: #fff;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="admin-bar-inner">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 4px; font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.05em;">Nouvelle commande reçue</p>
                                        <p style="margin: 0 0 12px; font-size: 20px; font-weight: 700;">#{{ $commande->numero }} — {{ number_format($totalTtc, 2, ',', ' ') }} TND</p>
                                        <p style="margin: 0; font-size: 14px; opacity: 0.95;">{{ $nom }} · {{ $phone }}</p>
                                    </td>
                                    <td align="right" valign="middle" style="padding-top: 8px;">
                                        <table role="presentation" cellpadding="0" cellspacing="0" align="right" class="btn-wrap">
                                            <tr>
                                                <td align="center" style="border-radius: 10px; background-color: #3b82f6;">
                                                    <a href="{{ $adminUrl }}" target="_blank" class="btn" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff !important; text-decoration: none;">Ouvrir dans l'admin</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Header -->
                    <tr>
                        <td class="header-padding" style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #c2410c 100%);">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" align="center">
                                <tr>
                                    <td align="center">
                                        <img src="{{ $logoUrl }}" alt="SOBITAS" width="100" height="auto" style="display: block; max-width: 100px; background: #fff; padding: 10px; border-radius: 10px; margin: 0 auto 14px;">
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" class="headline" style="color: #ffffff; font-size: 22px; font-weight: 700;">Commande #{{ $commande->numero }}</td>
                                </tr>
                                <tr>
                                    <td align="center" class="subhead" style="color: rgba(255,255,255,0.95); font-size: 14px; padding-top: 6px;">Reçue le {{ $dateFormatted }}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Order summary -->
                    <tr>
                        <td class="email-section" style="padding: 20px 32px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%); border: 1px solid #fecaca; border-radius: 12px; padding: 20px;">
                                <tr>
                                    <td class="card-padding">
                                        <span style="display: inline-block; background: #b91c1c; color: #fff; font-size: 11px; font-weight: 600; padding: 6px 12px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.05em;">{{ $statusLabel }}</span>
                                        <span style="float: right; font-size: 22px; font-weight: 700; color: #b91c1c;">{{ number_format($totalTtc, 2, ',', ' ') }} TND</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Products -->
                    <tr>
                        <td class="email-section" style="padding: 0 32px 20px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                                <thead>
                                    <tr style="background-color: #f9fafb;">
                                        <th style="padding: 14px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Produit</th>
                                        <th style="padding: 14px 16px; text-align: center; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Qté</th>
                                        <th style="padding: 14px 16px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Prix unit.</th>
                                        <th style="padding: 14px 16px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach($details as $d)
                                    <tr style="border-top: 1px solid #e5e7eb;">
                                        <td class="product-cell" style="padding: 14px 16px; font-size: 14px; color: #1f2937;">{{ $d->product->designation_fr ?? 'Produit' }}</td>
                                        <td class="product-cell" style="padding: 14px 16px; text-align: center; font-size: 14px;">{{ $d->qte }}</td>
                                        <td class="product-cell" style="padding: 14px 16px; text-align: right; font-size: 14px;">{{ number_format($d->prix_unitaire, 2, ',', ' ') }} TND</td>
                                        <td class="product-cell" style="padding: 14px 16px; text-align: right; font-size: 14px; font-weight: 600;">{{ number_format($d->qte * $d->prix_unitaire, 2, ',', ' ') }} TND</td>
                                    </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    <!-- Totals -->
                    <tr>
                        <td class="email-section" style="padding: 0 32px 20px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px;">
                                <tr><td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Sous-total</td><td align="right" style="padding: 6px 0; font-size: 14px;">{{ number_format($sousTotal, 2, ',', ' ') }} TND</td></tr>
                                @if($remise > 0)
                                <tr><td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Remise</td><td align="right" style="padding: 6px 0; font-size: 14px; color: #16a34a;">-{{ number_format($remise, 2, ',', ' ') }} TND</td></tr>
                                @endif
                                @if($discountHt > 0)
                                <tr><td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Code promo</td><td align="right" style="padding: 6px 0; font-size: 14px; color: #16a34a;">-{{ number_format($discountHt, 2, ',', ' ') }} TND</td></tr>
                                @endif
                                @if($frais > 0)
                                <tr><td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Frais de livraison</td><td align="right" style="padding: 6px 0; font-size: 14px;">{{ number_format($frais, 2, ',', ' ') }} TND</td></tr>
                                @else
                                <tr><td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Frais de livraison</td><td align="right" style="padding: 6px 0; font-size: 14px; color: #16a34a;">Gratuit</td></tr>
                                @endif
                                <tr style="border-top: 2px solid #b91c1c;">
                                    <td style="padding: 14px 0 0; font-size: 16px; font-weight: 700; color: #1f2937;">Total TTC</td>
                                    <td align="right" style="padding: 14px 0 0; font-size: 18px; font-weight: 700; color: #b91c1c;">{{ number_format($totalTtc, 2, ',', ' ') }} TND</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Client info -->
                    <tr>
                        <td class="email-section" style="padding: 0 32px 20px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
                                <tr><td style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 10px;">Client</td></tr>
                                <tr><td style="font-size: 14px; color: #334155;">{{ $nom }}</td></tr>
                                @if($phone)<tr><td style="font-size: 14px; color: #475569;">{{ $phone }}</td></tr>@endif
                                @if($email)<tr><td style="font-size: 14px; color: #475569;">{{ $email }}</td></tr>@endif
                                @if($adresse)<tr><td style="font-size: 14px; color: #475569;">{{ $adresse }}</td></tr>@endif
                                @if($ville)<tr><td style="font-size: 14px; color: #475569;">{{ $ville }}</td></tr>@endif
                                @if($commande->note ?? null)
                                <tr><td style="font-size: 14px; color: #475569; padding-top: 12px; font-style: italic;">Note : {{ $commande->note }}</td></tr>
                                @endif
                            </table>
                        </td>
                    </tr>
                    <!-- Admin CTA -->
                    <tr>
                        <td class="email-section" style="padding: 0 32px 28px; text-align: center;">
                            <table role="presentation" cellpadding="0" cellspacing="0" align="center" class="btn-wrap">
                                <tr>
                                    <td align="center" style="border-radius: 10px; background-color: #3b82f6;">
                                        <a href="{{ $adminUrl }}" target="_blank" class="btn" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff !important; text-decoration: none;">Ouvrir dans l'admin</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td class="footer-padding" style="padding: 24px 32px; background-color: #111827; color: #9ca3af; font-size: 13px; text-align: center;">
                            <p style="margin: 0;">Notification admin — SOBITAS</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
