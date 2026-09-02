@php
    $logoUrl = url('/logo.png');
    $greeting = $name !== '' ? 'Bonjour '.$name.',' : 'Bonjour,';
    $expiryLabel = $expiryMinutes === 60 ? '1 heure' : $expiryMinutes.' minutes';
@endphp
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Réinitialiser votre mot de passe — Protein.tn</title>
    <style>
        body, table, td, p, h1 { margin: 0; padding: 0; }
        table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
        img { border: 0; display: block; height: auto; }
        @media (max-width: 620px) {
            .outer { padding: 0 !important; }
            .shell { width: 100% !important; border-radius: 0 !important; }
            .pad { padding-left: 20px !important; padding-right: 20px !important; }
            .button { display: block !important; text-align: center !important; }
        }
    </style>
</head>
<body style="margin:0;background:#f3f4f6;color:#18181b;font-family:Arial,'Helvetica Neue',sans-serif;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%"><tr><td class="outer" align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" class="shell" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
        <tr><td style="height:6px;background:#df3b05;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td class="pad" style="padding:24px 30px;background:#101114;">
            <img src="{{ $logoUrl }}" width="136" alt="Protein.tn" style="width:136px;max-width:136px;background:#ffffff;border-radius:8px;padding:7px 10px;">
            <p style="margin-top:20px;font-size:11px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;color:#ff6a2a;">Accès au compte</p>
            <h1 style="margin-top:6px;font-size:26px;line-height:1.2;color:#ffffff;">Choisissez un nouveau mot de passe</h1>
        </td></tr>
        <tr><td class="pad" style="padding:26px 30px 10px;">
            <p style="font-size:16px;line-height:1.6;color:#18181b;">{{ $greeting }}</p>
            <p style="margin-top:12px;font-size:15px;line-height:1.65;color:#52525b;">Une demande de réinitialisation a été faite pour votre compte Protein.tn.</p>
        </td></tr>
        <tr><td class="pad" style="padding:12px 30px 20px;">
            <table role="presentation" width="100%"><tr><td align="center" style="background:#df3b05;border-radius:10px;">
                <a class="button" href="{{ $url }}" style="display:inline-block;padding:15px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">Créer mon nouveau mot de passe</a>
            </td></tr></table>
        </td></tr>
        <tr><td class="pad" style="padding:0 30px 24px;">
            <table role="presentation" width="100%" style="background:#fafafa;border:1px solid #eeeeee;border-radius:10px;"><tr><td style="padding:14px 16px;">
                <p style="font-size:13px;line-height:1.6;color:#52525b;"><strong style="color:#18181b;">Lien valable {{ $expiryLabel }}.</strong><br>Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email.</p>
            </td></tr></table>
            <p style="margin-top:18px;font-size:11px;line-height:1.6;color:#71717a;word-break:break-all;">Bouton inaccessible ? Copiez ce lien dans votre navigateur :<br><a href="{{ $url }}" style="color:#b93205;text-decoration:underline;">{{ $url }}</a></p>
        </td></tr>
        <tr><td style="padding:17px 30px;background:#f4f4f5;text-align:center;font-size:11px;line-height:1.6;color:#71717a;">Protein.tn · Rue Ribat, Sousse 4000 · contact@protein.tn</td></tr>
    </table>
</td></tr></table>
</body>
</html>
