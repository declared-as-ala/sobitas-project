@php
    $total = number_format((float) ($factureTva->prix_ttc ?? 0), 3, ',', ' ') . ' DT';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre facture #{{ $numero }}</title>
</head>
<body style="margin:0; padding:16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.5; color: #1f2937;">
    <p>Bonjour,</p>
    <p>Veuillez trouver ci-joint votre facture <strong>#{{ $numero }}</strong>.</p>
    <p>Montant total : <strong>{{ $total }}</strong></p>
    <p>Pour toute question, n'hésitez pas à nous contacter.</p>
    <p>Cordialement,<br>{{ config('app.name') }}</p>
</body>
</html>
