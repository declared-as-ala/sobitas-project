<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        {!! nl2br(e($customMessage)) !!}
        
        <br><br>
        <p style="font-size: 13px; color: #777;">
            --<br>
            Cet email a été envoyé automatiquement. Veuillez trouver votre document en pièce jointe.<br>
            <strong>Devis N° {{ $quotation->numero }}</strong> | 
            Net à payer : <strong>{{ number_format((float)($quotation->prix_ttc ?? $quotation->prix_total ?? 0), 3, ',', ' ') }} TND</strong>
        </p>
    </div>
</body>
</html>
