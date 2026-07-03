<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Réinitialisation de votre mot de passe</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            color: #333333;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: 40px;
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 1px solid #eeeeee;
        }
        .header h1 {
            color: #d97706; /* primary color */
            margin: 0;
        }
        .content {
            padding: 20px 0;
            line-height: 1.6;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .button {
            background-color: #d97706;
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            display: inline-block;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #eeeeee;
            font-size: 12px;
            color: #888888;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Protein.tn</h1>
        </div>
        
        <div class="content">
            <p>Bonjour {{ $user->name }},</p>
            
            <p>Vous recevez cet e-mail car nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.</p>
            
            <div class="button-container">
                <a href="{{ $resetUrl }}" class="button" style="color: #ffffff;">Réinitialiser le mot de passe</a>
            </div>
            
            <p>Ce lien de réinitialisation expirera dans {{ $expiry }} minutes.</p>
            
            <p>Si vous n'avez pas demandé la réinitialisation de votre mot de passe, vous pouvez ignorer cet e-mail. Votre compte est en sécurité.</p>
            
            <p>Salutations,<br>L'équipe Protein.tn</p>
            
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888888; word-break: break-all;">
                Si vous ne parvenez pas à cliquer sur le bouton "Réinitialiser le mot de passe", copiez et collez l'URL ci-dessous dans votre navigateur web :<br>
                <a href="{{ $resetUrl }}">{{ $resetUrl }}</a>
            </p>
        </div>
        
        <div class="footer">
            &copy; {{ date('Y') }} Protein.tn. Tous droits réservés.
        </div>
    </div>
</body>
</html>
