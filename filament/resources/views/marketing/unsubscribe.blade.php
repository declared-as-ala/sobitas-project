<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Désinscription</title>
    <style>
        body { font-family: sans-serif; max-width: 480px; margin: 40px auto; padding: 20px; text-align: center; }
        .ok { color: #059669; }
        .err { color: #dc2626; }
    </style>
</head>
<body>
    @if($success ?? false)
        <p class="ok">{{ $message ?? 'Vous êtes désinscrit.' }}</p>
        <p><a href="https://protein.tn">Retour à Protein.tn</a></p>
    @else
        <p class="err">{{ $message ?? 'Lien invalide.' }}</p>
    @endif
</body>
</html>
