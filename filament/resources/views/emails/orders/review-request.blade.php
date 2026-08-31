{{--
    ── THE REVIEW REQUEST, REWRITTEN AS A LETTER (owner, 20/08/2026) ────────────────────────────
    *"run the review sender and make the review message humanized and the email also."*

    What it replaced was a marketing blast: a 150° three-stop red gradient, a row of five ⭐, a
    26px "Votre avis compte, {prénom} !", "Cela ne prend que 30 secondes et c'est un vrai coup de
    pouce", a gradient button with a coloured drop shadow, and "Merci pour votre confiance 🙏".
    Every one of those is a device for extracting a rating, and a reader who has bought supplements
    online before has seen all of them. It looks automated because it IS automated, and it made no
    attempt to hide that.

    What makes a request like this work is not enthusiasm, it is a REASON. This shop has a real
    one, and it is unusual enough to be worth telling the truth about: 203 reviews were taken down
    because none of them had a purchase behind it, so every product page currently shows nothing.
    That is a genuinely human thing to say, and it is the only thing in this email that a reader
    cannot get from any other shop's review request.

    The other change is that it invites a bad review as plainly as a good one. A request that only
    wants stars is review-gating; besides being against Google's rules, it is instantly legible as
    insincere. Saying "if something was wrong, tell us that" is what makes the rest believable.

    ── WHAT STAYED ─────────────────────────────────────────────────────────────────────────────
    The tokenised /avis/{order_token} link, which needs no login and is the entire reason this
    email converts at all, and the per-product list, which is what tells the reader the message is
    about their order and not a newsletter.
--}}
@php
    $details    = $commande->details->isNotEmpty() ? $commande->details : $commande->details()->with('product:id,designation_fr')->get();
    $logoUrl    = url('/logo.png');
    $reviewUrl  = rtrim(config('app.frontend_url', config('app.url')), '/') . '/avis/' . urlencode($commande->order_token ?? '');
    $prenom     = trim($commande->livraison_prenom ?? $commande->prenom ?? '');
    $coordonnee   = \App\Models\Coordinate::getCached();
    $contactEmail = ($coordonnee && !empty($coordonnee->email)) ? $coordonnee->email : 'contact@protein.tn';
    $contactPhone = ($coordonnee && !empty($coordonnee->phone_1)) ? $coordonnee->phone_1 : '+216 27 612 500';
    $greeting     = $prenom !== '' ? 'Bonjour ' . $prenom . ',' : 'Bonjour,';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Votre avis sur votre commande — Protein.tn</title>
    <style type="text/css">
        body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
        table { border-collapse: collapse; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        @media only screen and (max-width: 620px) {
            .wrapper { width: 100% !important; }
            .pad { padding: 20px 18px !important; }
            .btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;">

<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
<tr><td align="center" style="padding:24px 12px;">

    <table role="presentation" class="wrapper" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;margin:0 auto;">

        {{-- A header bar, not a hero. The logo says who is writing; nothing else needs to be up here. --}}
        <tr>
            <td style="background:#0f172a;border-radius:14px 14px 0 0;padding:22px 28px;">
                <img src="{{ $logoUrl }}" alt="Protein.tn" width="140"
                     style="display:block;max-width:140px;background:#ffffff;padding:9px 13px;border-radius:10px;">
            </td>
        </tr>

        <tr>
            <td class="pad" style="background:#ffffff;padding:28px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#1e293b;">{{ $greeting }}</p>

                <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#334155;">
                    Votre commande <strong>#{{ $commande->numero }}</strong> vous a été livrée il y a
                    quelques jours. J’espère que tout s’est bien passé et que les produits vous conviennent.
                </p>

                <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#334155;">
                    Si vous avez un moment, votre avis nous serait vraiment utile. Je vous explique
                    pourquoi&nbsp;: nous avons retiré tous les anciens avis du site, parce que nous ne
                    pouvions pas prouver qu’ils venaient de vrais acheteurs. Résultat, nos fiches
                    produits n’en affichent plus aucun aujourd’hui — et quelqu’un qui hésite entre
                    deux whey n’a rien pour se décider.
                </p>

                <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">
                    Ce que vous avez commandé
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                       style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:22px;">
                    <tbody>
                        @foreach($details as $d)
                        <tr>
                            <td style="padding:12px 16px;font-size:14px;line-height:1.5;color:#334155;{{ $loop->first ? '' : 'border-top:1px solid #f1f5f9;' }}">
                                {{ $d->product->designation_fr ?? '—' }}
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>

                <a href="{{ $reviewUrl }}" class="btn"
                   style="display:inline-block;background:#d03b04;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;">
                    Écrire mon avis
                </a>

                <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
                    Aucun compte à créer&nbsp;: le lien est lié à votre commande.
                </p>

                <p style="margin:22px 0 0;font-size:15px;line-height:1.75;color:#334155;">
                    Et si quelque chose n’allait pas — un produit abîmé, une saveur décevante, un
                    délai trop long — dites-le franchement. Un avis mitigé nous est plus utile qu’un
                    silence poli, et vous pouvez aussi nous répondre directement&nbsp;: on préfère
                    régler le problème que le découvrir dans un commentaire.
                </p>

                <p style="margin:22px 0 0;font-size:15px;line-height:1.75;color:#334155;">
                    Merci,<br>
                    <strong>L’équipe Protein.tn</strong><br>
                    <span style="color:#64748b;font-size:14px;">{{ $contactPhone }} · {{ $contactEmail }}</span>
                </p>
            </td>
        </tr>

        <tr>
            <td style="background:#f8fafc;border-radius:0 0 14px 14px;padding:18px 28px;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">SOBITAS — Protein.tn</p>
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                    Rue Ribat, Sousse 4000, Tunisie<br>
                    Vous recevez ce message une seule fois, parce que vous avez commandé chez nous.
                    Vous pouvez répondre à cet e-mail, il nous arrive directement.
                </p>
            </td>
        </tr>

    </table>

</td></tr>
</table>

</body>
</html>
