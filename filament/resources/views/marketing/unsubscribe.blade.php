<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'Préférences email' }} — Protein.tn</title>
    <style>
        body { font-family: Arial,sans-serif; background:#f5f5f4; color:#171717; margin:0; padding:32px 16px; }
        main { max-width:480px; margin:40px auto; padding:32px; text-align:center; background:#fff; border:1px solid #e7e5e4; border-radius:18px; }
        h1 { margin:0 0 12px; font-size:26px; }
        p { line-height:1.6; }
        a { display:inline-block; margin-top:12px; color:#d93700; font-weight:700; }
        .ok { color: #059669; }
        .err { color: #dc2626; }
    </style>
</head>
<body><main>
    <h1>{{ $title ?? (($success ?? false) ? 'Préférence enregistrée' : 'Action impossible') }}</h1>
    @if($success ?? false)
        <p class="ok">{{ $message ?? 'Vous êtes désinscrit.' }}</p>
        <p><a href="https://protein.tn">Retour à Protein.tn</a></p>
    @else
        <p class="err">{{ $message ?? 'Lien invalide.' }}</p>
    @endif
</main></body>
</html>
