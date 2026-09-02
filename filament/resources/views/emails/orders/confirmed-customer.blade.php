@php
    $details = $commande->details->isNotEmpty() ? $commande->details : $commande->details()->with('product:id,designation_fr')->get();
    $logoUrl = url('/logo.png');
    $orderUrl = $commande->order_token
        ? config('app.frontend_url', config('app.url')).'/order-confirmation/'.$commande->id.'?token='.urlencode($commande->order_token)
        : config('app.frontend_url', config('app.url')).'/order-confirmation/'.$commande->id;
    $dateFormatted = $commande->created_at?->locale('fr_FR')->isoFormat('D MMMM YYYY [à] HH:mm');
    $firstName = trim($commande->livraison_prenom ?? $commande->prenom ?? $commande->livraison_nom ?? $commande->nom ?? '');
    $fullName = trim(($commande->livraison_nom ?? $commande->nom ?? '').' '.($commande->livraison_prenom ?? $commande->prenom ?? ''));
    $address = collect([
        $commande->livraison_adresse1 ?? $commande->adresse1 ?? null,
        $commande->livraison_ville ?? $commande->ville ?? null,
        $commande->livraison_region ?? $commande->region ?? null,
        $commande->livraison_code_postale ?? $commande->code_postale ?? null,
    ])->filter()->implode(', ');
    $phone = $commande->livraison_phone ?? $commande->phone ?? null;
    $subtotal = (float) ($commande->prix_ht ?? 0);
    $shipping = (float) ($commande->frais_livraison ?? 0);
    $total = (float) ($commande->prix_ttc ?? 0);
    $discount = max(0, $subtotal + $shipping - $total);
    $paymentLabel = ($commande->payment_method ?? '') === 'card' ? 'Carte bancaire' : 'Paiement à la livraison';
    $coordinate = \App\Models\Coordinate::getCached();
    $contactEmail = ($coordinate && !empty($coordinate->email)) ? $coordinate->email : 'contact@protein.tn';
@endphp
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Commande #{{ $commande->numero }} confirmée</title>
    <style>
        body,table,td,p,h1,h2{margin:0;padding:0} table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0} img{border:0;display:block;height:auto}
        @media(max-width:620px){.outer{padding:0!important}.shell{width:100%!important;border-radius:0!important}.pad{padding-left:18px!important;padding-right:18px!important}.hero-title{font-size:25px!important}.stat{display:block!important;width:auto!important;border-right:0!important;border-bottom:1px solid #e5e7eb!important;text-align:left!important}.product-price{white-space:nowrap}.button{display:block!important;text-align:center!important}}
    </style>
</head>
<body style="margin:0;background:#f3f4f6;color:#18181b;font-family:Arial,'Helvetica Neue',sans-serif;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%"><tr><td class="outer" align="center" style="padding:28px 12px;">
<table role="presentation" width="600" class="shell" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
    <tr><td style="height:6px;background:#df3b05;font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td class="pad" style="padding:26px 32px 20px;"><img src="{{ $logoUrl }}" width="142" alt="Protein.tn" style="width:142px;max-width:142px;"></td></tr>
    <tr><td class="pad" style="padding:8px 32px 24px;">
        <table role="presentation" width="100%"><tr>
            <td width="52" valign="top"><table role="presentation"><tr><td align="center" style="width:44px;height:44px;border-radius:22px;background:#eaf8ef;color:#16834a;font-size:25px;font-weight:bold;line-height:44px;">&#10003;</td></tr></table></td>
            <td valign="top" style="padding-left:14px;"><p style="font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:#16834a;">Commande confirmée</p><h1 class="hero-title" style="margin-top:5px;font-size:29px;line-height:1.18;color:#111827;">Merci{{ $firstName ? ', '.$firstName : '' }}.</h1><p style="margin-top:7px;font-size:15px;line-height:22px;color:#52525b;">Votre commande est enregistrée. Nous vous appellerons pour confirmer la livraison.</p></td>
        </tr></table>
    </td></tr>
    <tr><td class="pad" style="padding:0 32px 22px;">
        <table role="presentation" width="100%" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#fafafa;"><tr>
            <td class="stat" width="34%" style="padding:14px 16px;border-right:1px solid #e5e7eb;"><p style="font-size:11px;color:#71717a;">COMMANDE</p><p style="margin-top:4px;font-size:17px;font-weight:bold;color:#18181b;">#{{ $commande->numero }}</p></td>
            <td class="stat" width="33%" style="padding:14px 16px;border-right:1px solid #e5e7eb;"><p style="font-size:11px;color:#71717a;">TOTAL</p><p style="margin-top:4px;font-size:17px;font-weight:bold;color:#df3b05;">{{ number_format($total,2,'.',' ') }} DT</p></td>
            <td class="stat" width="33%" style="padding:14px 16px;"><p style="font-size:11px;color:#71717a;">PAIEMENT</p><p style="margin-top:4px;font-size:13px;font-weight:bold;line-height:18px;color:#18181b;">{{ $paymentLabel }}</p></td>
        </tr></table><p style="margin-top:9px;font-size:12px;color:#71717a;">{{ $dateFormatted }}</p>
    </td></tr>
    <tr><td class="pad" style="padding:0 32px 22px;"><h2 style="font-size:13px;letter-spacing:.8px;text-transform:uppercase;color:#18181b;">La suite</h2><table role="presentation" width="100%" style="margin-top:11px;"><tr>
        @foreach([['1','Reçue'],['2','Préparation'],['3','Livraison']] as $step)
        <td width="33.33%" valign="top" style="padding-right:8px;"><table role="presentation"><tr><td align="center" style="width:26px;height:26px;border-radius:13px;background:{{ $loop->first ? '#df3b05' : '#f1f1f1' }};color:{{ $loop->first ? '#ffffff' : '#52525b' }};font-size:12px;font-weight:bold;line-height:26px;">{{ $step[0] }}</td><td style="padding-left:8px;font-size:12px;font-weight:bold;color:#3f3f46;">{{ $step[1] }}</td></tr></table></td>
        @endforeach
    </tr></table></td></tr>
    <tr><td class="pad" style="padding:0 32px 22px;"><h2 style="font-size:13px;letter-spacing:.8px;text-transform:uppercase;color:#18181b;">Votre commande</h2><table role="presentation" width="100%" style="margin-top:11px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        @foreach($details as $detail)
        <tr><td style="padding:13px 14px;border-bottom:{{ $loop->last ? '0' : '1px solid #eeeeee' }};font-size:13px;line-height:19px;color:#27272a;">{{ $detail->product->designation_fr ?? 'Produit' }}<br><span style="font-size:12px;color:#71717a;">Quantité : {{ $detail->qte }}</span></td><td class="product-price" align="right" style="padding:13px 14px;border-bottom:{{ $loop->last ? '0' : '1px solid #eeeeee' }};font-size:13px;font-weight:bold;color:#18181b;">{{ number_format($detail->qte * $detail->prix_unitaire,2,'.',' ') }} DT</td></tr>
        @endforeach
    </table>
    <table role="presentation" width="100%" style="margin-top:10px;background:#fafafa;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:11px 14px;font-size:13px;color:#52525b;">Sous-total</td><td align="right" style="padding:11px 14px;font-size:13px;font-weight:bold;">{{ number_format($subtotal,2,'.',' ') }} DT</td></tr>
        @if($discount > 0)<tr><td style="padding:4px 14px 11px;font-size:13px;color:#16834a;">Remise</td><td align="right" style="padding:4px 14px 11px;font-size:13px;font-weight:bold;color:#16834a;">-{{ number_format($discount,2,'.',' ') }} DT</td></tr>@endif
        <tr><td style="padding:4px 14px 11px;font-size:13px;color:#52525b;">Livraison</td><td align="right" style="padding:4px 14px 11px;font-size:13px;font-weight:bold;color:{{ $shipping > 0 ? '#18181b' : '#16834a' }};">{{ $shipping > 0 ? number_format($shipping,2,'.',' ').' DT' : 'Gratuite' }}</td></tr>
        <tr><td style="padding:13px 14px;border-top:1px solid #e5e7eb;font-size:16px;font-weight:bold;">Total</td><td align="right" style="padding:13px 14px;border-top:1px solid #e5e7eb;font-size:18px;font-weight:bold;color:#df3b05;">{{ number_format($total,2,'.',' ') }} DT</td></tr>
    </table></td></tr>
    @if($address || $phone)
    <tr><td class="pad" style="padding:0 32px 22px;"><table role="presentation" width="100%" style="border-left:3px solid #df3b05;background:#fafafa;"><tr><td style="padding:14px 16px;"><p style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:.7px;color:#52525b;">Livraison</p>@if($fullName)<p style="margin-top:7px;font-size:14px;font-weight:bold;color:#18181b;">{{ $fullName }}</p>@endif @if($address)<p style="margin-top:3px;font-size:13px;line-height:19px;color:#52525b;">{{ $address }}</p>@endif @if($phone)<p style="margin-top:3px;font-size:13px;color:#18181b;">{{ $phone }}</p>@endif</td></tr></table></td></tr>
    @endif
    <tr><td class="pad" style="padding:0 32px 28px;"><table role="presentation" width="100%"><tr><td align="center" style="background:#df3b05;border-radius:10px;"><a class="button" href="{{ $orderUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">Voir ma commande</a></td></tr></table></td></tr>
    <tr><td style="padding:21px 32px;background:#101114;text-align:center;"><p style="font-size:12px;line-height:18px;color:#d4d4d8;">Besoin d’aide ? <a href="mailto:{{ $contactEmail }}" style="color:#ff6a2a;text-decoration:none;">{{ $contactEmail }}</a></p><p style="margin-top:7px;font-size:11px;color:#71717a;">Protein.tn — compléments alimentaires en Tunisie</p></td></tr>
</table></td></tr></table>
</body></html>
