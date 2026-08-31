@php
    $status = (string) $commande->etat;
    $statusLabel = \App\Models\Commande::getStatusLabel($status);
    $shipment = $commande->latestShipment()->first();
    $trackingNumber = $shipment?->aramex_hawb;
    $accountUrl = rtrim(config('app.frontend_url', config('app.url')), '/') . '/account/orders/' . $commande->id;
    $trackingUrl = $trackingNumber
        ? 'https://www.aramex.com/tn/en/track/track-results-new?ShipmentNumber=' . rawurlencode((string) $trackingNumber)
        : $accountUrl;
    $firstName = trim((string) ($commande->livraison_prenom ?: $commande->prenom));
    $message = match ($status) {
        'en_cours_de_livraison', 'expidee' => 'Votre colis a quitté notre dépôt et poursuit son chemin vers vous.',
        'livree', 'livrée', 'livre' => 'Votre commande a été indiquée comme livrée. Merci pour votre confiance.',
        default => 'Le statut de votre commande vient d’être mis à jour.',
    };
@endphp
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{ $statusLabel }}</title></head>
<body style="margin:0;background:#f5f4f2;font-family:Arial,sans-serif;color:#171717">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e5e2de;border-radius:16px;overflow:hidden">
        <tr><td style="height:5px;background:#dc3500"></td></tr>
        <tr><td style="padding:30px 32px 12px"><img src="{{ url('/logo.png') }}" width="145" alt="Protein.tn" style="display:block;max-width:145px;height:auto"></td></tr>
        <tr><td style="padding:12px 32px 30px">
            <p style="margin:0 0 8px;color:#dc3500;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Commande #{{ $commande->numero }}</p>
            <h1 style="margin:0 0 14px;font-size:28px;line-height:1.15">{{ $statusLabel }}</h1>
            <p style="margin:0 0 22px;color:#555;line-height:1.6">Bonjour{{ $firstName ? ' ' . $firstName : '' }}, {{ $message }}</p>
            @if($trackingNumber)
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:#fff7f3;border:1px solid #ffd8c9;border-radius:12px"><tr><td style="padding:16px 18px">
                    <p style="margin:0 0 5px;color:#777;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Suivi Aramex</p>
                    <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:.03em">{{ $trackingNumber }}</p>
                </td></tr></table>
            @endif
            <a href="{{ $trackingUrl }}" style="display:inline-block;background:#dc3500;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 20px;border-radius:10px">{{ $trackingNumber ? 'Suivre mon colis' : 'Voir ma commande' }}</a>
            <p style="margin:24px 0 0;color:#777;font-size:12px;line-height:1.5">Vous pouvez aussi retrouver ce suivi à tout moment dans votre espace client Protein.tn.</p>
        </td></tr>
    </table>
</td></tr></table>
</body>
</html>
