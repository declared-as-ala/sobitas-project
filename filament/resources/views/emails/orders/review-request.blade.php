@php
    $details    = $commande->details->isNotEmpty() ? $commande->details : $commande->details()->with('product:id,designation_fr')->get();
    $logoUrl    = url('/logo.png');
    $reviewUrl  = rtrim(config('app.frontend_url', config('app.url')), '/') . '/avis/' . urlencode($commande->order_token ?? '');
    $prenom     = trim($commande->livraison_prenom ?? $commande->prenom ?? $commande->livraison_nom ?? $commande->nom ?? '');
    $coordonnee   = \App\Models\Coordinate::getCached();
    $contactEmail = ($coordonnee && !empty($coordonnee->email)) ? $coordonnee->email : 'contact@protein.tn';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Donnez votre avis ⭐ — Protein.tn</title>
    <style type="text/css">
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        @media only screen and (max-width: 620px) {
            .wrapper { width: 100% !important; }
            .pad     { padding: 20px 16px !important; }
            .h-hero  { font-size: 24px !important; }
            .btn     { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; padding: 16px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="padding:28px 12px 36px;">

    <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;margin:0 auto;">

        {{-- ── HERO ─────────────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:linear-gradient(150deg,#b91c1c 0%,#dc2626 45%,#c2410c 100%);border-radius:16px 16px 0 0;padding:36px 32px 32px;text-align:center;">
                <img src="{{ $logoUrl }}" alt="Protein.tn" width="180" height="auto"
                     style="display:block;max-width:180px;background:rgba(255,255,255,.95);padding:12px 16px;border-radius:14px;margin:0 auto 22px;">
                <p style="margin:0 0 8px;font-size:30px;letter-spacing:2px;">⭐⭐⭐⭐⭐</p>
                <p style="margin:0 0 6px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-.02em;" class="h-hero">
                    Votre avis compte, {{ $prenom ?: 'cher client' }} !
                </p>
                <p style="margin:0;font-size:15px;color:rgba(255,255,255,.92);line-height:1.5;">
                    Vous avez reçu votre commande #{{ $commande->numero }}.<br>
                    Aidez d'autres sportifs en partageant votre expérience.
                </p>
            </td>
        </tr>

        {{-- ── INTRO ────────────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#ffffff;padding:28px 32px 8px;text-align:center;" class="pad">
                <p style="margin:0;font-size:15px;color:#334155;line-height:1.6;">
                    Cela ne prend que <strong>30 secondes</strong> et c'est un vrai coup de pouce.
                    Notez les produits que vous avez commandés :
                </p>
            </td>
        </tr>

        {{-- ── PRODUCTS ─────────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#ffffff;padding:16px 32px 4px;" class="pad">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                       style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                    <tbody>
                        @foreach($details as $d)
                        <tr style="border-top:{{ $loop->first ? '0' : '1px' }} solid #f1f5f9;">
                            <td style="padding:13px 16px;font-size:14px;color:#1e293b;">
                                <span style="color:#f59e0b;">★</span> {{ $d->product->designation_fr ?? '—' }}
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
            </td>
        </tr>

        {{-- ── CTA ──────────────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#ffffff;padding:26px 32px 8px;text-align:center;" class="pad">
                <a href="{{ $reviewUrl }}" class="btn"
                   style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;box-shadow:0 8px 20px rgba(220,38,38,.3);">
                    ⭐ Donner mon avis
                </a>
                <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
                    Aucune connexion requise — le lien est personnel à votre commande.
                </p>
            </td>
        </tr>

        {{-- ── FOOTER ───────────────────────────────────────────────────────── --}}
        <tr>
            <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#f8fafc;">Merci pour votre confiance 🙏</p>
                <p style="margin:0 0 14px;font-size:13px;color:#94a3b8;">
                    L'équipe Protein.tn — <a href="mailto:{{ $contactEmail }}" style="color:#fb923c;text-decoration:none;">{{ $contactEmail }}</a>
                </p>
                <p style="margin:0;font-size:11px;color:#475569;">
                    Cet email vous est envoyé car vous avez passé commande sur protein.tn. Merci de ne pas répondre directement.
                </p>
            </td>
        </tr>

    </table>
</td></tr>
</table>

</body>
</html>
