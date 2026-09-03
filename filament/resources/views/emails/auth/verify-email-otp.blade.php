<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Votre code de vérification Protein.tn</title>
</head>
<body style="margin:0;background:#f5f3f0;font-family:Arial,Helvetica,sans-serif;color:#171717">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Votre code est {{ $code }}. Il expire dans 10 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3f0">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e0db;border-radius:16px;overflow:hidden">
      <tr><td style="height:6px;background:#d83a00;font-size:0;line-height:0">&nbsp;</td></tr>
      <tr><td style="padding:28px 28px 12px;text-align:center">
        <div style="color:#d83a00;font-size:24px;font-weight:900;font-style:italic;letter-spacing:-1px">Protein.tn</div>
      </td></tr>
      <tr><td style="padding:12px 28px 28px;text-align:center">
        <h1 style="margin:0 0 10px;font-size:25px;line-height:1.2;color:#171717">Confirmez votre adresse email</h1>
        <p style="margin:0;color:#5f5b57;font-size:15px;line-height:1.55">Bonjour {{ trim((string) $user->name) ?: 'cher client' }}, utilisez ce code pour terminer la vérification de votre compte.</p>
        <div style="margin:24px 0 16px;padding:19px 12px;border:1px solid #e4e0db;border-radius:12px;background:#f8f7f5;color:#d83a00;font-size:36px;font-weight:800;line-height:1;letter-spacing:9px">{{ $code }}</div>
        <p style="margin:0 0 20px;color:#5f5b57;font-size:14px;line-height:1.5">Code valable pendant <strong style="color:#171717">10 minutes</strong>.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e0db">
          <tr><td style="padding-top:18px;color:#77716b;font-size:12px;line-height:1.5;text-align:left">Vous n’avez pas demandé ce code ? Ignorez simplement cet email. Ne partagez jamais ce code avec une autre personne.</td></tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:14px 0 0;color:#8b857f;font-size:11px">Protein.tn · Compléments alimentaires en Tunisie</p>
  </td></tr>
</table>
</body>
</html>
