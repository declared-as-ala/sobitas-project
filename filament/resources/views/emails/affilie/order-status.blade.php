<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{{ $statusLabel }}</title>
</head>
<body style="margin:0;background:#f5f4f2;font-family:Arial,sans-serif;color:#171717">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:28px 14px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e5e2de;border-radius:16px;overflow:hidden">
            <tr><td style="height:5px;background:#F8480C"></td></tr>
            <tr><td style="padding:30px 32px 12px">
                <img src="{{ url('/logo.png') }}" width="145" alt="Protein.tn" style="display:block;max-width:145px;height:auto">
            </td></tr>
            <tr><td style="padding:12px 32px 30px">
                <p style="margin:0 0 8px;color:#D53B04;font-size:14px;font-weight:700">Commande #{{ $commande->numero ?? $commande->id }}</p>
                <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3">{{ $statusLabel }}</h1>
                <p style="margin:0 0 16px;line-height:1.6">Bonjour, le statut de votre commande affiliée #{{ $commande->numero ?? $commande->id }} a été mis à jour.</p>
                <p style="margin:0 0 16px;line-height:1.6">Retrouvez le détail de vos commissions dans votre espace affilié.</p>
                <p style="margin:0;line-height:1.6">L’équipe Protein.tn</p>
            </td></tr>
        </table>
    </td></tr>
</table>
</body>
</html>
