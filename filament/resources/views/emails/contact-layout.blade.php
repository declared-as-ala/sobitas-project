@php
    $product = $contact->requested_product;
    $name = trim((string) $contact->name) ?: 'Client';
    $phone = trim((string) $contact->phone);
    $title = $adminCopy ? ($product ? 'Nouvelle demande de produit' : 'Nouveau message') : ($product ? 'Votre demande est reçue' : 'Votre message est reçu');
@endphp
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>{{ $title }} — Protein.tn</title>
<style>body,table,td,p{margin:0;padding:0}table{border-collapse:collapse}img{border:0;display:block;height:auto}a{word-break:break-word}@media(max-width:620px){.shell{width:100%!important}.outer{padding:12px 8px!important}.pad{padding:20px!important}.button{display:block!important;text-align:center!important}.heading{font-size:24px!important}}</style></head>
<body style="background:#f7f6f4;color:#191a1d;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden">{{ $product ? 'Prix et délai à confirmer avant toute commande.' : 'Votre message a été enregistré par Protein.tn.' }}</div>
<table role="presentation" width="100%"><tr><td align="center" class="outer" style="padding:28px 12px">
<table role="presentation" width="600" class="shell" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e8e5e1">
<tr><td class="pad" style="padding:24px 28px;border-bottom:1px solid #e8e5e1"><a href="https://protein.tn"><img src="https://admin.protein.tn/logo.png" alt="Protein.tn" width="145" style="width:145px"></a></td></tr>
<tr><td class="pad" style="padding:28px">
<p style="font-size:12px;letter-spacing:1px;color:#d03b04;font-weight:700;margin-bottom:10px">{{ $product ? 'DEMANDE DE PRODUIT' : 'CONTACT' }} · N° {{ $contact->id }}</p>
<h1 class="heading" style="font-size:28px;line-height:1.2;margin:0 0 16px;font-weight:700">{{ $title }}</h1>
<p style="font-size:16px;line-height:1.6;margin-bottom:20px">@if($adminCopy){{ $name }} souhaite être recontacté.@else Bonjour {{ $name }}, votre demande est enregistrée. @if($product)Notre équipe vous recontactera pour confirmer le prix et le délai.@else Notre équipe reviendra vers vous.@endif @endif</p>
@if($product)
<table role="presentation" width="100%" style="background:#f7f6f4;border:1px solid #e8e5e1"><tr><td style="padding:18px"><p style="font-size:12px;color:#5f616a;margin-bottom:8px">PRODUIT DEMANDÉ</p><p style="font-size:17px;font-weight:700;line-height:1.4;margin-bottom:12px">{{ $product['name'] }}</p><a href="{{ $product['url'] }}" style="color:#d03b04;font-size:14px;font-weight:700">Voir la fiche produit</a></td></tr></table>
<p style="font-size:14px;line-height:1.6;margin-top:16px;color:#5f616a">Aucune commande ni paiement à ce stade. Le prix et la disponibilité restent à confirmer.</p>
@endif
<table role="presentation" width="100%" style="margin-top:20px;font-size:14px;line-height:1.5">
@if($phone !== '')<tr><td style="padding:10px 0;border-bottom:1px solid #e8e5e1;color:#5f616a">Téléphone</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e8e5e1"><a href="tel:{{ preg_replace('/[^+0-9]/', '', $phone) }}" style="color:#191a1d;font-weight:700;text-decoration:none">{{ $phone }}</a></td></tr>@endif
<tr><td style="padding:10px 0;border-bottom:1px solid #e8e5e1;color:#5f616a">Email</td><td align="right" style="padding:10px 0;border-bottom:1px solid #e8e5e1;word-break:break-word"><a href="mailto:{{ $contact->email }}" style="color:#191a1d;text-decoration:none">{{ $contact->email }}</a></td></tr>
</table>
<p style="margin:20px 0 8px;font-size:12px;font-weight:700;color:#5f616a">{{ $adminCopy ? 'MESSAGE DU CLIENT' : ($product ? 'VOTRE PRÉCISION' : 'MESSAGE') }}</p>
<div style="font-size:14px;line-height:1.7;word-break:break-word">{!! nl2br(e((string) ($product['note'] ?? $contact->message))) !!}</div>
<p style="margin-top:24px">@if($adminCopy && $phone !== '')<a class="button" href="tel:{{ preg_replace('/[^+0-9]/', '', $phone) }}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#d03b04;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700">Appeler le client</a>@elseif($adminCopy)<a class="button" href="mailto:{{ $contact->email }}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#d03b04;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700">Répondre au client</a>@else<a class="button" href="https://protein.tn/shop" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#d03b04;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700">Retour à la boutique</a>@endif</p>
</td></tr>
<tr><td class="pad" style="padding:20px 28px;border-top:1px solid #e8e5e1;background:#f7f6f4"><p style="font-size:13px;line-height:1.7;color:#5f616a">Protein.tn · Rue Ribat, Sousse<br><a href="tel:+21627612500" style="color:#191a1d;text-decoration:none">27 612 500</a> · <a href="https://wa.me/21627612500" style="color:#d03b04">WhatsApp</a></p></td></tr>
</table></td></tr></table></body></html>
