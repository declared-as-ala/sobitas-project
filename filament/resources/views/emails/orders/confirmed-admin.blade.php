@php
    $details       = $commande->details->isNotEmpty() ? $commande->details : $commande->details()->with('product:id,designation_fr')->get();
    $logoUrl       = url('/logo.png');
    $adminUrl      = url(\App\Filament\Resources\CommandeResource::getUrl('edit', ['record' => $commande]));
    $dateFormatted = $commande->created_at ? $commande->created_at->locale('fr_FR')->isoFormat('D MMMM YYYY [à] HH:mm') : now()->locale('fr_FR')->isoFormat('D MMMM YYYY [à] HH:mm');
    $nom           = trim(($commande->livraison_nom ?? $commande->nom ?? '') . ' ' . ($commande->livraison_prenom ?? $commande->prenom ?? ''));
    $phone         = $commande->livraison_phone ?? $commande->phone ?? '—';
    $email         = $commande->livraison_email ?? $commande->email ?? '—';
    $adresse       = collect([
        $commande->livraison_adresse1 ?? $commande->adresse1 ?? null,
        $commande->livraison_ville    ?? $commande->ville    ?? null,
        $commande->livraison_region   ?? $commande->region   ?? null,
    ])->filter()->implode(', ') ?: '—';

    $sousTotal   = (float) ($commande->prix_ht ?? 0);
    $remise      = (float) ($commande->remise ?? 0);
    $discountHt  = (float) ($commande->discount_ht ?? 0);
    $frais       = (float) ($commande->frais_livraison ?? 0);
    $totalTtc    = (float) ($commande->prix_ttc ?? 0);
    $paymentLabel = match ($commande->payment_method ?? '') {
        'cod'  => '💵 Paiement à la livraison',
        'card' => '💳 Carte bancaire',
        default => $commande->payment_method ?? 'Non précisé',
    };
    $statusLabel = \App\Models\Commande::getStatusLabel($commande->etat ?? 'nouvelle_commande');
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Nouvelle commande #{{ $commande->numero }}</title>
    <style type="text/css">
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        @media only screen and (max-width: 620px) {
            .wrapper  { width: 100% !important; }
            .pad      { padding: 16px !important; }
            .kv-row td { display: block !important; width: 100% !important; }
            .kv-row td:last-child { text-align: left !important; padding-top: 0 !important; }
            .product-name { font-size: 13px !important; }
            .btn  { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
            .hide-mobile { display: none !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="padding:24px 12px;">

    <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;margin:0 auto;">

        {{-- ── TOP ALERT BAR ─────────────────────────────────────────────── --}}
        <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border-radius:14px 14px 0 0;padding:26px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="vertical-align:middle;">
                            <img src="{{ $logoUrl }}" alt="Protein.tn" width="150" height="auto"
                                 style="display:block;max-width:150px;background:rgba(255,255,255,.95);padding:10px 14px;border-radius:12px;margin-bottom:16px;">
                            <p style="margin:0 0 3px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;">Notification back-office</p>
                            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">🛍 Nouvelle commande reçue</p>
                            <p style="margin:6px 0 0;font-size:14px;color:#cbd5e1;">{{ $dateFormatted }}</p>
                        </td>
                        <td align="right" style="vertical-align:middle;padding-left:16px;">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="border-radius:8px;background:#e94560;">
                                        <a href="{{ $adminUrl }}" class="btn" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff!important;text-decoration:none;white-space:nowrap;">Ouvrir l'admin →</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        {{-- ── QUICK STATS ROW ─────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#16213e;padding:0 28px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="width:33%;padding:16px 12px;text-align:center;border-right:1px solid #334155;">
                            <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Commande</p>
                            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#f8fafc;">#{{ $commande->numero }}</p>
                        </td>
                        <td style="width:34%;padding:16px 12px;text-align:center;border-right:1px solid #334155;">
                            <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Total TTC</p>
                            <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#fb923c;">{{ number_format($totalTtc, 3, '.', ' ') }} TND</p>
                        </td>
                        <td style="width:33%;padding:16px 12px;text-align:center;">
                            <p style="margin:0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Paiement</p>
                            <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#f8fafc;">{{ $paymentLabel }}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        {{-- ── WHITE BODY ───────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#ffffff;padding:28px;border-radius:0 0 14px 14px;box-shadow:0 4px 12px rgba(0,0,0,.08);">

                {{-- CLIENT INFO ------------------------------------------------ --}}
                <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">👤 Informations client</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
                    <tr class="kv-row" style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:10px 14px;font-size:13px;color:#64748b;width:38%;background:#f8fafc;font-weight:600;">Nom</td>
                        <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:600;">{{ $nom ?: '—' }}</td>
                    </tr>
                    <tr class="kv-row" style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:10px 14px;font-size:13px;color:#64748b;background:#f8fafc;font-weight:600;">Téléphone</td>
                        <td style="padding:10px 14px;font-size:13px;color:#0f172a;">{{ $phone }}</td>
                    </tr>
                    <tr class="kv-row" style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:10px 14px;font-size:13px;color:#64748b;background:#f8fafc;font-weight:600;">Email</td>
                        <td style="padding:10px 14px;font-size:13px;color:#0f172a;">{{ $email }}</td>
                    </tr>
                    <tr class="kv-row">
                        <td style="padding:10px 14px;font-size:13px;color:#64748b;background:#f8fafc;font-weight:600;">Adresse</td>
                        <td style="padding:10px 14px;font-size:13px;color:#0f172a;">{{ $adresse }}</td>
                    </tr>
                    @if($commande->note ?? null)
                    <tr class="kv-row" style="border-top:1px solid #f1f5f9;">
                        <td style="padding:10px 14px;font-size:13px;color:#64748b;background:#f8fafc;font-weight:600;">Note client</td>
                        <td style="padding:10px 14px;font-size:13px;color:#7c3aed;font-style:italic;">{{ $commande->note }}</td>
                    </tr>
                    @endif
                </table>

                {{-- PRODUCTS --------------------------------------------------- --}}
                <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">📦 Produits commandés</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Produit</th>
                            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Qté</th>
                            <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">P.U.</th>
                            <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($details as $d)
                        <tr style="border-top:1px solid #f1f5f9;">
                            <td class="product-name" style="padding:11px 14px;font-size:13px;color:#1e293b;">{{ $d->product->designation_fr ?? '—' }}</td>
                            <td style="padding:11px 14px;text-align:center;font-size:13px;color:#475569;">{{ $d->qte }}</td>
                            <td style="padding:11px 14px;text-align:right;font-size:13px;color:#475569;">{{ number_format($d->prix_unitaire, 3, '.', ' ') }}</td>
                            <td style="padding:11px 14px;text-align:right;font-size:13px;font-weight:600;color:#0f172a;">{{ number_format($d->qte * $d->prix_unitaire, 3, '.', ' ') }} TND</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>

                {{-- TOTALS ------------------------------------------------------ --}}
                <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;">💰 Récapitulatif financier</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;">
                    <tr>
                        <td style="padding:9px 14px;font-size:13px;color:#64748b;background:#f8fafc;border-bottom:1px solid #f1f5f9;">Sous-total HT</td>
                        <td align="right" style="padding:9px 14px;font-size:13px;color:#1e293b;border-bottom:1px solid #f1f5f9;">{{ number_format($sousTotal, 3, '.', ' ') }} TND</td>
                    </tr>
                    @if($remise > 0)
                    <tr>
                        <td style="padding:9px 14px;font-size:13px;color:#64748b;background:#f8fafc;border-bottom:1px solid #f1f5f9;">Remise</td>
                        <td align="right" style="padding:9px 14px;font-size:13px;color:#16a34a;border-bottom:1px solid #f1f5f9;">−{{ number_format($remise, 3, '.', ' ') }} TND</td>
                    </tr>
                    @endif
                    @if($discountHt > 0)
                    <tr>
                        <td style="padding:9px 14px;font-size:13px;color:#64748b;background:#f8fafc;border-bottom:1px solid #f1f5f9;">Code promo ({{ $commande->coupon_code_snapshot ?? '' }})</td>
                        <td align="right" style="padding:9px 14px;font-size:13px;color:#16a34a;border-bottom:1px solid #f1f5f9;">−{{ number_format($discountHt, 3, '.', ' ') }} TND</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding:9px 14px;font-size:13px;color:#64748b;background:#f8fafc;border-bottom:1px solid #f1f5f9;">Frais de livraison</td>
                        <td align="right" style="padding:9px 14px;font-size:13px;color:{{ $frais > 0 ? '#1e293b' : '#16a34a' }};border-bottom:1px solid #f1f5f9;">{{ $frais > 0 ? number_format($frais, 3, '.', ' ') . ' TND' : 'Gratuit' }}</td>
                    </tr>
                    <tr style="background:#fff7ed;">
                        <td style="padding:13px 14px;font-size:15px;font-weight:700;color:#0f172a;">Total TTC</td>
                        <td align="right" style="padding:13px 14px;font-size:16px;font-weight:700;color:#ea580c;">{{ number_format($totalTtc, 3, '.', ' ') }} TND</td>
                    </tr>
                </table>

                {{-- CTA BUTTON -------------------------------------------------- --}}
                <table role="presentation" cellpadding="0" cellspacing="0" align="center" width="100%">
                    <tr>
                        <td align="center">
                            <table role="presentation" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="border-radius:8px;background:#2563eb;">
                                        <a href="{{ $adminUrl }}" class="btn" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#ffffff!important;text-decoration:none;">Traiter la commande →</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

            </td>
        </tr>

        {{-- ── FOOTER ───────────────────────────────────────────────────────── --}}
        <tr>
            <td style="padding:18px 0;text-align:center;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">Notification interne — Protein.tn Back-office</p>
            </td>
        </tr>

    </table>
</td></tr>
</table>

</body>
</html>
