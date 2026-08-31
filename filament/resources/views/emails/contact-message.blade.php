{{--
    The admin copy of a /contact submission.

    Deliberately plain next to the order mails: this is a working document, not a receipt. What
    matters is that the shop can read the message and answer it in one action, so the address, the
    phone (when given) and the body are the whole page, the reply button is the only control, and
    the Reply-To header is already set to the sender (see ContactMessageMail).
--}}
@php
    $logoUrl       = url('/logo.png');
    $dateFormatted = ($contact->created_at ?? now())->locale('fr_FR')->isoFormat('D MMMM YYYY [à] HH:mm');
    $name          = trim((string) ($contact->name ?? '')) ?: 'Visiteur';
    $email         = (string) ($contact->email ?? '');
    $phone         = trim((string) ($contact->phone ?? ''));
    $subject       = trim((string) ($contact->subject ?? ''));
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Message de {{ $name }}</title>
    <style type="text/css">
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        @media only screen and (max-width: 620px) {
            .wrapper { width: 100% !important; }
            .pad { padding: 16px !important; }
            .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="padding:24px 12px;">

    <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;margin:0 auto;">

        <tr>
            <td style="background:#0f172a;border-radius:14px 14px 0 0;padding:24px 28px;">
                <img src="{{ $logoUrl }}" alt="Protein.tn" width="140"
                     style="display:block;max-width:140px;background:#ffffff;padding:9px 13px;border-radius:10px;margin-bottom:14px;">
                <p style="margin:0 0 3px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;">Formulaire de contact</p>
                <p style="margin:0;font-size:21px;font-weight:700;color:#ffffff;">Nouveau message</p>
                <p style="margin:6px 0 0;font-size:14px;color:#cbd5e1;">{{ $dateFormatted }}</p>
            </td>
        </tr>

        <tr>
            <td class="pad" style="background:#ffffff;padding:24px 28px;">

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
                    <tr>
                        <td style="padding:6px 0;font-size:12px;color:#64748b;width:110px;vertical-align:top;">Nom</td>
                        <td style="padding:6px 0;font-size:15px;font-weight:600;color:#0f172a;">{{ $name }}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;font-size:12px;color:#64748b;vertical-align:top;">E-mail</td>
                        <td style="padding:6px 0;font-size:15px;">
                            <a href="mailto:{{ $email }}" style="color:#d53b04;text-decoration:none;font-weight:600;">{{ $email }}</a>
                        </td>
                    </tr>
                    @if ($phone !== '')
                        <tr>
                            <td style="padding:6px 0;font-size:12px;color:#64748b;vertical-align:top;">Téléphone</td>
                            <td style="padding:6px 0;font-size:15px;">
                                <a href="tel:{{ preg_replace('/[^0-9+]/', '', $phone) }}" style="color:#d53b04;text-decoration:none;font-weight:600;">{{ $phone }}</a>
                            </td>
                        </tr>
                    @endif
                    @if ($subject !== '')
                        <tr>
                            <td style="padding:6px 0;font-size:12px;color:#64748b;vertical-align:top;">Sujet</td>
                            <td style="padding:6px 0;font-size:15px;color:#0f172a;">{{ $subject }}</td>
                        </tr>
                    @endif
                </table>

                <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Message</p>
                {{-- nl2br over an escaped value: the visitor's line breaks are preserved and their
                     markup is not. e() first, then nl2br, never the other way round. --}}
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #d53b04;border-radius:10px;padding:16px 18px;font-size:15px;line-height:1.65;color:#1e293b;white-space:normal;">
                    {!! nl2br(e((string) $contact->message)) !!}
                </div>

                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:22px;">
                    <tr>
                        <td>
                            <a href="mailto:{{ $email }}?subject={{ rawurlencode('Re : votre message — Protein.tn') }}"
                               class="btn"
                               style="display:inline-block;background:#d53b04;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 26px;border-radius:10px;">
                                Répondre à {{ $name }}
                            </a>
                        </td>
                    </tr>
                </table>

                <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
                    Un « Répondre » depuis votre boîte fonctionne aussi&nbsp;: l’adresse de l’expéditeur est
                    déjà en Reply-To. Le message est également enregistré dans l’administration.
                </p>
            </td>
        </tr>

        <tr>
            <td style="background:#f8fafc;border-radius:0 0 14px 14px;padding:16px 28px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                    SOBITAS — Protein.tn · Rue Ribat, Sousse 4000 · protein.tn
                </p>
            </td>
        </tr>

    </table>

</td></tr>
</table>

</body>
</html>
