<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture #{{ $invoiceNumber }}</title>
    <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1f2937; margin: 0; padding: 0; background: #f9fafb; }
        .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 8px rgba(0,0,0,0.08); }
        .header { background: #f97316; padding: 28px 32px; }
        .header h1 { margin: 0; font-size: 22px; color: #fff; font-weight: 800; }
        .header p { margin: 4px 0 0; color: rgba(255,255,255,0.85); font-size: 13px; }
        .body { padding: 32px; }
        .greeting { font-size: 15px; margin-bottom: 20px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .info-table td { padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 13px; }
        .info-table td:first-child { color: #6b7280; font-weight: 600; width: 40%; background: #f9fafb; }
        .total-row td { font-weight: 700; background: #fff7ed !important; color: #c2410c !important; }
        .note { margin-top: 24px; font-size: 13px; color: #6b7280; line-height: 1.6; border-top: 1px solid #e5e7eb; padding-top: 16px; }
        .footer { background: #f3f4f6; padding: 16px 32px; font-size: 12px; color: #9ca3af; text-align: center; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <h1>{{ $companyName }}</h1>
        <p>Votre facture est disponible en pièce jointe</p>
    </div>
    <div class="body">
        <p class="greeting">Bonjour <strong>{{ $clientName }}</strong>,</p>
        <p>Veuillez trouver ci-joint votre facture. Voici un résumé :</p>

        <table class="info-table">
            <tr>
                <td>N° Facture</td>
                <td><strong>#{{ $invoiceNumber }}</strong></td>
            </tr>
            <tr>
                <td>Date</td>
                <td>{{ $invoiceDate }}</td>
            </tr>
            <tr class="total-row">
                <td>Montant total TTC</td>
                <td><strong>{{ $invoiceTotal }}</strong></td>
            </tr>
        </table>

        <p class="note">
            Le PDF de cette facture est joint à cet email.<br>
            Pour toute question, veuillez nous contacter en répondant à cet email ou par téléphone.<br><br>
            <em>Merci pour votre confiance.</em>
        </p>
    </div>
    <div class="footer">
        {{ $companyName }} — Ce message est généré automatiquement, merci de ne pas y répondre si vous avez une question spécifique.
    </div>
</div>
</body>
</html>
