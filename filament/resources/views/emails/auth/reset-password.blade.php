{{--
    One link, and the two facts a reader needs around it: how long it lasts, and what to do if
    they did not ask for it. Everything else in a password-reset email is in the way.
--}}
@php
    $logoUrl = url('/logo.png');
    $greeting = $name !== '' ? 'Bonjour ' . $name . ',' : 'Bonjour,';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Réinitialiser votre mot de passe — Protein.tn</title>
    <style type="text/css">
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
        table { border-collapse: collapse; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        @media only screen and (max-width: 620px) {
            .wrapper { width: 100% !important; }
            .pad { padding: 18px !important; }
            .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
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
                <p style="margin:0;font-size:21px;font-weight:700;color:#ffffff;">Réinitialiser votre mot de passe</p>
            </td>
        </tr>

        <tr>
            <td class="pad" style="background:#ffffff;padding:26px 28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#1e293b;">{{ $greeting }}</p>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#334155;">
                    Vous avez demandé à changer le mot de passe de votre compte Protein.tn.
                    Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
                </p>

                <a href="{{ $url }}" class="btn"
                   style="display:inline-block;background:#d03b04;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;">
                    Choisir un nouveau mot de passe
                </a>

                <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#64748b;">
                    Ce lien est valable <strong>{{ $expiryHours == 1 ? 'une heure' : $expiryHours . ' heures' }}</strong>.
                    Passé ce délai, demandez-en simplement un nouveau depuis la page de connexion.
                </p>

                <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#64748b;">
                    <strong style="color:#334155;">Vous n’avez rien demandé&nbsp;?</strong>
                    Ignorez cet e-mail. Votre mot de passe actuel reste valable et personne ne peut
                    le changer sans ce lien.
                </p>

                <p style="margin:22px 0 0;font-size:12px;line-height:1.7;color:#94a3b8;word-break:break-all;">
                    Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur&nbsp;:<br>
                    <span style="color:#64748b;">{{ $url }}</span>
                </p>
            </td>
        </tr>

        <tr>
            <td style="background:#f8fafc;border-radius:0 0 14px 14px;padding:18px 28px;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">SOBITAS — Protein.tn</p>
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                    Rue Ribat, Sousse 4000, Tunisie · contact@protein.tn
                </p>
            </td>
        </tr>

    </table>

</td></tr>
</table>

</body>
</html>
