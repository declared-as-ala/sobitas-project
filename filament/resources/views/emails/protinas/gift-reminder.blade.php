{{--
    Gift Protinas about to expire (spec D6). Copy: « Vos 300 Protinas cadeau expirent le {date}. Elles
    s'appliquent toutes seules à votre commande : en entier dès 180 DT d'articles, et elles peuvent
    régler la livraison. » One button, no countdown graphics: it is a note about the customer's own
    money, not a campaign. Earned Protinas never expire and are not mentioned.
--}}
@php
    $name = trim((string) ($user->name ?? '')) ?: 'cher client';
    $date = $expiresAt->format('d/m/Y');
    $lastDay = $daysLeft <= 1;
    $howItApplies = $fullFromDt
        ? 'Elles s’appliquent toutes seules à votre commande : en entier dès '.$fullFromDt.' DT d’articles, et elles peuvent régler la livraison.'
        : 'Elles s’appliquent toutes seules à votre commande, et elles peuvent régler la livraison.';
@endphp
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{ $lastDay ? 'Dernier jour pour vos '.$amount : 'Vos '.$amount.' vous attendent encore '.$daysLeft.' jours' }}</title>
</head>
<body style="margin:0;background:#f5f3f0;font-family:Arial,Helvetica,sans-serif;color:#171717">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Vos {{ $points }} Protinas cadeau expirent le {{ $date }}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3f0">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e0db;border-radius:16px;overflow:hidden">
      <tr><td style="height:6px;background:#d83a00;font-size:0;line-height:0">&nbsp;</td></tr>
      <tr><td style="padding:28px 28px 12px;text-align:center">
        <div style="color:#d83a00;font-size:24px;font-weight:900;font-style:italic;letter-spacing:-1px">Protein.tn</div>
      </td></tr>
      <tr><td style="padding:12px 28px 28px;text-align:center">
        <h1 style="margin:0 0 10px;font-size:24px;line-height:1.25;color:#171717">
          @if($lastDay)
            Dernier jour pour vos {{ $amount }}
          @else
            Vos {{ $amount }} vous attendent encore {{ $daysLeft }} jours
          @endif
        </h1>
        <p style="margin:0 0 16px;color:#5f5b57;font-size:15px;line-height:1.55">Bonjour {{ $name }},</p>
        <p style="margin:0 0 20px;color:#171717;font-size:15px;line-height:1.6">
          Vos {{ $points }} Protinas cadeau expirent le <strong>{{ $date }}</strong>.
          {{ $howItApplies }}
        </p>
        <a href="{{ $shopUrl }}" style="display:inline-block;background:#d83a00;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px">Faire mes achats</a>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e0db;margin-top:24px">
          <tr><td style="padding-top:16px;color:#77716b;font-size:12px;line-height:1.5;text-align:left">Vos Protinas gagnées sur vos commandes n’expirent jamais. Seules les Protinas cadeau ont une date limite.</td></tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:14px 0 0;color:#8b857f;font-size:11px">Protein.tn · Compléments alimentaires en Tunisie</p>
  </td></tr>
</table>
</body>
</html>
