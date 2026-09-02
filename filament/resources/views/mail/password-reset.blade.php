<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Réinitialiser votre mot de passe — Protein.tn</title>
    <style>
        body, table, td, p, h1 { margin: 0; padding: 0; }
        table { border-collapse: collapse; }
        @media (max-width: 620px) { .outer { padding: 0 !important; } .shell { width: 100% !important; border-radius: 0 !important; } .pad { padding-left: 20px !important; padding-right: 20px !important; } .button { display:block !important;text-align:center !important; } }
    </style>
</head>
<body style="margin:0;background:#f3f4f6;color:#18181b;font-family:Arial,'Helvetica Neue',sans-serif;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%"><tr><td class="outer" align="center" style="padding:28px 12px;">
    <table role="presentation" width="600" class="shell" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
        <tr><td style="height:6px;background:#df3b05;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td class="pad" style="padding:26px 30px;background:#101114;">
            <p style="font-size:24px;font-weight:bold;font-style:italic;color:#ff4b0b;">Protein.tn</p>
            <p style="margin-top:20px;font-size:11px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;color:#ff6a2a;">Espace administrateur</p>
            <h1 style="margin-top:6px;font-size:26px;line-height:1.2;color:#ffffff;">Réinitialiser votre mot de passe</h1>
        </td></tr>
        <tr><td class="pad" style="padding:26px 30px 10px;">
            <p style="font-size:16px;line-height:1.6;">Bonjour {{ $user->name }},</p>
            <p style="margin-top:12px;font-size:15px;line-height:1.65;color:#52525b;">Utilisez le bouton ci-dessous pour choisir un nouveau mot de passe administrateur.</p>
        </td></tr>
        <tr><td class="pad" style="padding:12px 30px 20px;"><table role="presentation" width="100%"><tr><td align="center" style="background:#df3b05;border-radius:10px;"><a class="button" href="{{ $resetUrl }}" style="display:inline-block;padding:15px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">Choisir un nouveau mot de passe</a></td></tr></table></td></tr>
        <tr><td class="pad" style="padding:0 30px 24px;">
            <p style="font-size:13px;line-height:1.6;color:#52525b;"><strong style="color:#18181b;">Lien valable {{ $expiry }} minutes.</strong> Si vous n’avez rien demandé, ignorez cet email.</p>
            <p style="margin-top:18px;font-size:11px;line-height:1.6;color:#71717a;word-break:break-all;">Bouton inaccessible ? Copiez ce lien :<br><a href="{{ $resetUrl }}" style="color:#b93205;text-decoration:underline;">{{ $resetUrl }}</a></p>
        </td></tr>
        <tr><td style="padding:17px 30px;background:#f4f4f5;text-align:center;font-size:11px;color:#71717a;">Notification de sécurité Protein.tn</td></tr>
    </table>
</td></tr></table>
</body>
</html>
