<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vérifiez votre adresse email</title></head>
<body style="margin:0;background:#f7f6f4;font-family:Arial,sans-serif;color:#171717">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e5e2de;border-radius:16px">
    <tr><td style="padding:32px">
      <p style="margin:0 0 24px;color:#d03b04;font-size:20px;font-weight:800;font-style:italic">Protein.tn</p>
      <h1 style="margin:0 0 12px;font-size:26px;line-height:1.15">Vérifiez votre adresse email</h1>
      <p style="margin:0 0 24px;color:#555;line-height:1.6">Bonjour {{ $user->name }}, saisissez ce code sur Protein.tn pour sécuriser votre compte.</p>
      <p style="margin:0 0 24px;padding:18px;text-align:center;background:#f7f6f4;border-radius:12px;font-size:34px;font-weight:800;letter-spacing:10px;color:#d03b04">{{ $code }}</p>
      <p style="margin:0;color:#6b6b6b;font-size:13px;line-height:1.5">Ce code expire dans 10 minutes. Si vous n’avez pas créé ce compte, ignorez cet email.</p>
    </td></tr>
  </table>
</td></tr></table>
</body>
</html>
