@php
    $details       = $commande->details->isNotEmpty() ? $commande->details : $commande->details()->with('product:id,designation_fr')->get();
    $logoUrl       = config('marketing.logo_url', rtrim(config('app.url'), '/') . '/logo.png');
    $orderUrl      = $commande->order_token
        ? config('app.frontend_url', config('app.url')) . '/order-confirmation/' . $commande->id . '?token=' . urlencode($commande->order_token)
        : config('app.frontend_url', config('app.url')) . '/order-confirmation/' . $commande->id;
    $dateFormatted = $commande->created_at ? $commande->created_at->locale('fr_FR')->isoFormat('D MMMM YYYY [à] HH:mm') : now()->locale('fr_FR')->isoFormat('D MMMM YYYY [à] HH:mm');
    $prenom        = trim($commande->livraison_prenom ?? $commande->prenom ?? $commande->livraison_nom ?? $commande->nom ?? '');
    $nomComplet    = trim(($commande->livraison_nom ?? $commande->nom ?? '') . ' ' . ($commande->livraison_prenom ?? $commande->prenom ?? ''));
    $adresse       = collect([
        $commande->livraison_adresse1 ?? $commande->adresse1 ?? null,
        $commande->livraison_ville    ?? $commande->ville    ?? null,
        $commande->livraison_region   ?? $commande->region   ?? null,
        $commande->livraison_code_postale ?? $commande->code_postale ?? null,
    ])->filter()->implode(', ') ?: null;
    $phone       = $commande->livraison_phone ?? $commande->phone ?? null;
    $sousTotal   = (float) ($commande->prix_ht ?? 0);
    $remise      = (float) ($commande->remise ?? 0);
    $discountHt  = (float) ($commande->discount_ht ?? 0);
    $frais       = (float) ($commande->frais_livraison ?? 0);
    $totalTtc    = (float) ($commande->prix_ttc ?? 0);
    $paymentLabel = match ($commande->payment_method ?? '') {
        'cod'  => 'Paiement à la livraison (espèces)',
        'card' => 'Carte bancaire (en ligne)',
        default => $commande->payment_method ?? 'Non précisé',
    };
    $coordonnee   = \App\Models\Coordinate::getCached();
    $contactEmail = ($coordonnee && !empty($coordonnee->email)) ? $coordonnee->email : 'contact@sobitas.tn';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Votre commande #{{ $commande->numero }} est confirmée ✅</title>
    <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
    <style type="text/css">
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        @media only screen and (max-width: 620px) {
            .wrapper   { width: 100% !important; }
            .pad       { padding: 20px 16px !important; }
            .h-hero    { font-size: 24px !important; }
            .steps-td  { display: block !important; width: 100% !important; padding: 12px 0 !important; text-align: center !important; }
            .steps-sep { display: none !important; }
            .product-name { font-size: 13px !important; }
            .btn       { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 16px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="padding:28px 12px 36px;">

    <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;margin:0 auto;">

        {{-- ── HERO HEADER ─────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:linear-gradient(150deg,#b91c1c 0%,#dc2626 45%,#c2410c 100%);border-radius:16px 16px 0 0;padding:36px 32px 32px;text-align:center;">
                <img src="{{ $logoUrl }}" alt="SOBITAS" width="160" height="auto"
                     style="display:block;max-width:160px;margin:0 auto 20px;">
                <p style="margin:0 0 6px;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-.02em;" class="h-hero">
                    Merci, {{ $prenom ?: 'cher client' }} ! 🎉
                </p>
                <p style="margin:0;font-size:15px;color:rgba(255,255,255,.9);">
                    Votre commande est confirmée et en cours de traitement.
                </p>
            </td>
        </tr>

        {{-- ── ORDER BADGE ──────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#ffffff;padding:0 32px;" class="pad">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                       style="background:linear-gradient(135deg,#fff7ed,#fef2f2);border:1.5px solid #fecaca;border-radius:12px;margin-top:24px;">
                    <tr>
                        <td style="padding:18px 20px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9f1239;text-transform:uppercase;letter-spacing:.08em;">Référence de commande</p>
                                        <p style="margin:0;font-size:22px;font-weight:700;color:#b91c1c;">#{{ $commande->numero }}</p>
                                        <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">{{ $dateFormatted }}</p>
                                    </td>
                                    <td align="right" style="vertical-align:top;">
                                        <span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700;padding:6px 14px;border-radius:20px;white-space:nowrap;">✅ Confirmée</span>
                                        <p style="margin:8px 0 0;font-size:13px;color:#6b7280;text-align:right;">{{ $paymentLabel }}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        {{-- ── NEXT STEPS ───────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#ffffff;padding:20px 32px 4px;" class="pad">
                <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">📋 Prochaines étapes</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                       style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:4px;">
                    <tr>
                        <td class="steps-td" style="padding:16px 14px;text-align:center;border-right:1px solid #f1f5f9;width:33%;">
                            <p style="margin:0 0 6px;font-size:22px;">📬</p>
                            <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#1e293b;">Confirmation</p>
                            <p style="margin:0;font-size:11px;color:#64748b;">Commande enregistrée</p>
                        </td>
                        <td class="steps-sep" style="width:1px;background:#f1f5f9;"></td>
                        <td class="steps-td" style="padding:16px 14px;text-align:center;border-right:1px solid #f1f5f9;width:33%;">
                            <p style="margin:0 0 6px;font-size:22px;">📦</p>
                            <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#1e293b;">Préparation</p>
                            <p style="margin:0;font-size:11px;color:#64748b;">Votre colis est préparé</p>
                        </td>
                        <td class="steps-sep" style="width:1px;background:#f1f5f9;"></td>
                        <td class="steps-td" style="padding:16px 14px;text-align:center;width:33%;">
                            <p style="margin:0 0 6px;font-size:22px;">🚚</p>
                            <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#1e293b;">Livraison</p>
                            <p style="margin:0;font-size:11px;color:#64748b;">Livraison à votre adresse</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        {{-- ── PRODUCTS TABLE ───────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#ffffff;padding:20px 32px;" class="pad">
                <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">🛒 Votre commande</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                       style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Produit</th>
                            <th style="padding:11px 14px;text-align:center;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Qté</th>
                            <th style="padding:11px 14px;text-align:right;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($details as $d)
                        <tr style="border-top:1px solid #f1f5f9;">
                            <td class="product-name" style="padding:12px 14px;font-size:14px;color:#1e293b;">{{ $d->product->designation_fr ?? '—' }}</td>
                            <td style="padding:12px 14px;text-align:center;font-size:14px;color:#475569;">{{ $d->qte }}</td>
                            <td style="padding:12px 14px;text-align:right;font-size:14px;font-weight:600;color:#0f172a;">{{ number_format($d->qte * $d->prix_unitaire, 3, '.', ' ') }} TND</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </td>
        </tr>

        {{-- ── TOTALS ────────────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#ffffff;padding:0 32px 24px;" class="pad">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                       style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                    <tr>
                        <td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#f8fafc;">Sous-total</td>
                        <td align="right" style="padding:10px 16px;font-size:13px;color:#1e293b;border-bottom:1px solid #f1f5f9;background:#f8fafc;">{{ number_format($sousTotal, 3, '.', ' ') }} TND</td>
                    </tr>
                    @if($remise > 0)
                    <tr>
                        <td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#f8fafc;">Remise</td>
                        <td align="right" style="padding:10px 16px;font-size:13px;color:#16a34a;border-bottom:1px solid #f1f5f9;background:#f8fafc;">−{{ number_format($remise, 3, '.', ' ') }} TND</td>
                    </tr>
                    @endif
                    @if($discountHt > 0)
                    <tr>
                        <td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#f8fafc;">
                            🎁 Code promo @if($commande->coupon_code_snapshot)<span style="font-family:monospace;background:#ede9fe;color:#6d28d9;padding:1px 6px;border-radius:4px;font-size:12px;">{{ $commande->coupon_code_snapshot }}</span>@endif
                        </td>
                        <td align="right" style="padding:10px 16px;font-size:13px;color:#16a34a;border-bottom:1px solid #f1f5f9;background:#f8fafc;">−{{ number_format($discountHt, 3, '.', ' ') }} TND</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding:10px 16px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;background:#f8fafc;">Frais de livraison</td>
                        <td align="right" style="padding:10px 16px;font-size:13px;border-bottom:1px solid #f1f5f9;background:#f8fafc;color:{{ $frais > 0 ? '#1e293b' : '#16a34a' }};">
                            @if($frais > 0) {{ number_format($frais, 3, '.', ' ') }} TND @else 🎉 Gratuit @endif
                        </td>
                    </tr>
                    <tr style="background:#fff7ed;">
                        <td style="padding:14px 16px;font-size:16px;font-weight:700;color:#0f172a;">Total TTC</td>
                        <td align="right" style="padding:14px 16px;font-size:18px;font-weight:800;color:#b91c1c;">{{ number_format($totalTtc, 3, '.', ' ') }} TND</td>
                    </tr>
                </table>
            </td>
        </tr>

        {{-- ── DELIVERY INFO ─────────────────────────────────────────────────── --}}
        @if($adresse || $phone)
        <tr>
            <td style="background:#ffffff;padding:0 32px 24px;" class="pad">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                       style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px 20px;">
                    <tr>
                        <td>
                            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.08em;">🚚 Adresse de livraison</p>
                            @if($nomComplet)<p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1e293b;">{{ $nomComplet }}</p>@endif
                            @if($adresse)<p style="margin:0 0 4px;font-size:13px;color:#374151;">{{ $adresse }}</p>@endif
                            @if($phone)<p style="margin:0;font-size:13px;color:#374151;">📞 {{ $phone }}</p>@endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        @endif

        {{-- ── CONTACT ──────────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#ffffff;padding:0 32px 32px;text-align:center;" class="pad">
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                    Un problème ? Contactez-nous : <a href="mailto:{{ $contactEmail }}" style="color:#b91c1c;text-decoration:none;">{{ $contactEmail }}</a>
                </p>
            </td>
        </tr>

        {{-- ── FOOTER ───────────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#f8fafc;">Merci pour votre confiance 🙏</p>
                <p style="margin:0 0 14px;font-size:13px;color:#94a3b8;">
                    L'équipe SOBITAS — <a href="mailto:{{ $contactEmail }}" style="color:#fb923c;text-decoration:none;">{{ $contactEmail }}</a>
                </p>
                <p style="margin:0;font-size:11px;color:#475569;">
                    Cet email a été envoyé automatiquement suite à votre commande. Merci de ne pas répondre directement.
                </p>
            </td>
        </tr>

    </table>
</td></tr>
</table>

</body>
</html>
