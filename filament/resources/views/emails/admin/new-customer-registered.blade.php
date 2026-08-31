<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Nouveau client Protein.tn</title>
</head>
<body style="margin:0;background:#f7f6f4;font-family:Arial,sans-serif;color:#171717">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e5e2de;border-radius:16px;overflow:hidden">
        <tr><td style="padding:28px 32px;background:#171717">
            <p style="margin:0;color:#f04a0b;font-size:20px;font-weight:800;font-style:italic">Protein.tn</p>
            <p style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">Nouveau client inscrit</p>
        </td></tr>
        <tr><td style="padding:30px 32px">
            <p style="margin:0 0 20px;color:#555;line-height:1.6">Un nouveau compte client vient d’être créé sur Protein.tn.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f4;border-radius:12px">
                <tr><td style="padding:12px 16px;color:#666;width:34%">Nom</td><td style="padding:12px 16px;font-weight:700">{{ $customer->name }}</td></tr>
                <tr><td style="padding:12px 16px;color:#666;border-top:1px solid #e5e2de">Email</td><td style="padding:12px 16px;border-top:1px solid #e5e2de">{{ $customer->email }}</td></tr>
                <tr><td style="padding:12px 16px;color:#666;border-top:1px solid #e5e2de">Téléphone</td><td style="padding:12px 16px;border-top:1px solid #e5e2de">{{ $customer->phone ?: 'Non renseigné' }}</td></tr>
                <tr><td style="padding:12px 16px;color:#666;border-top:1px solid #e5e2de">Inscription</td><td style="padding:12px 16px;border-top:1px solid #e5e2de">{{ optional($customer->created_at)->format('d/m/Y H:i') }}</td></tr>
            </table>
            <p style="margin:22px 0 0;color:#777;font-size:13px">Notification interne automatique — aucune action n’est requise.</p>
        </td></tr>
    </table>
</td></tr>
</table>
</body>
</html>
