{{--
    The receipt the visitor gets. Short by design — it exists so "message envoyé" is verifiable
    from their own inbox rather than being a claim the website makes about itself.

    It repeats their message back for two reasons: it proves what arrived, and it gives them
    something to forward or reply to if they remember a detail afterwards.
--}}
@php
    $logoUrl = url('/logo.png');
    $name    = trim((string) ($contact->name ?? '')) ?: 'Bonjour';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Message bien reçu — Protein.tn</title>
    <style type="text/css">
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
        table { border-collapse: collapse; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        @media only screen and (max-width: 620px) {
            .wrapper { width: 100% !important; }
            .pad { padding: 18px !important; }
            .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; margin-bottom: 10px !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="padding:24px 12px;">

    <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;margin:0 auto;">

        <tr>
            <td style="background:#0f172a;border-radius:14px 14px 0 0;padding:26px 28px;">
                <img src="{{ $logoUrl }}" alt="Protein.tn" width="140"
                     style="display:block;max-width:140px;background:#ffffff;padding:9px 13px;border-radius:10px;margin-bottom:14px;">
                <p style="margin:0;font-size:21px;font-weight:700;color:#ffffff;">Votre message est bien arrivé</p>
            </td>
        </tr>

        <tr>
            <td class="pad" style="background:#ffffff;padding:26px 28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#1e293b;">
                    Bonjour {{ $name }},
                </p>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">
                    Merci de nous avoir écrit. Votre message a bien été reçu par l’équipe Protein.tn et
                    nous vous répondons <strong>sous 24&nbsp;heures ouvrées</strong> — du lundi au samedi,
                    de 10&nbsp;h à 19&nbsp;h&nbsp;30.
                </p>
                <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Votre message</p>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.65;color:#475569;">
                    {!! nl2br(e((string) $contact->message)) !!}
                </div>

                <p style="margin:22px 0 12px;font-size:15px;line-height:1.7;color:#334155;">
                    C’est urgent&nbsp;? Le téléphone et WhatsApp sont plus rapides que l’e-mail&nbsp;:
                </p>
                <a href="tel:+21627612500" class="btn"
                   style="display:inline-block;background:#d53b04;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 22px;border-radius:10px;margin-right:8px;">
                    +216 27 612 500
                </a>
                <a href="https://wa.me/21627612500" class="btn"
                   style="display:inline-block;background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px;">
                    WhatsApp
                </a>

                <p style="margin:22px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
                    En attendant, vous pouvez parcourir la boutique&nbsp;:
                    <a href="https://protein.tn/shop" style="color:#d53b04;text-decoration:none;font-weight:600;">protein.tn/shop</a>
                </p>
            </td>
        </tr>

        <tr>
            <td style="background:#f8fafc;border-radius:0 0 14px 14px;padding:18px 28px;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">SOBITAS — Protein.tn</p>
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                    Rue Ribat, Sousse 4000, Tunisie · contact@protein.tn<br>
                    Ce message confirme la réception de votre demande. Vous pouvez y répondre directement.
                </p>
            </td>
        </tr>

    </table>

</td></tr>
</table>

</body>
</html>
