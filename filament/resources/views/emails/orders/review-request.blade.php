{{--
    ── THE REVIEW REQUEST, REWRITTEN AS A LETTER (owner, 20/08/2026) ────────────────────────────
    *"run the review sender and make the review message humanized and the email also."*

    What it replaced was a marketing blast: a 150° three-stop red gradient, a row of five ⭐, a
    26px "Votre avis compte, {prénom} !", "Cela ne prend que 30 secondes et c'est un vrai coup de
    pouce", a gradient button with a coloured drop shadow, and "Merci pour votre confiance 🙏".
    Every one of those is a device for extracting a rating, and a reader who has bought supplements
    online before has seen all of them. It looks automated because it IS automated, and it made no
    attempt to hide that.

    What makes a request like this work is not enthusiasm, it is a REASON. The one given here is
    the true one: only a review tied to a delivered order carries « Achat vérifié » and counts in a
    product's rating, so this customer's review is worth more than any other kind. (It used to say
    that the product pages showed no reviews at all. That stopped being true on 21/09/2026, and a
    reason that is false is worse than none — replaced 05/10/2026.)

    ── THE STAR LINKS (05/10/2026) ─────────────────────────────────────────────────────────────
    Five ★ under each product, ordered 1 to 5, ALL THE SAME colour and size, none preselected or
    highlighted. Each opens /avis/{ref}?p={product_id}&note={n}, where the page preselects that
    note and the customer confirms it, with a comment only if they want one. The choice must stay
    neutral: a pre-coloured fifth star is a nudge, and a nudge toward a rating is review-gating.

    ── THE INCENTIVE, AND THE LINK THAT IS NOT HERE ────────────────────────────────────────────
    A published review can earn Protinas whatever the rating, and the email says so in plain
    grey text: an undisclosed incentive is the problem, not the incentive. For the same reason
    there is NO Google review link in this email — Google forbids any incentive, and this message
    mentions one. The Google link lives only in the « livrée » status email (status-customer).

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
    $contactPhone = ($coordonnee && !empty($coordonnee->phone_1)) ? $coordonnee->phone_1 : '+216 22 464 315';
    $greeting     = $prenom !== '' ? 'Bonjour ' . $prenom . ',' : 'Bonjour,';
    $reminder     = (bool) ($reminder ?? false);
    // One row per PRODUCT: two flavours of the same product are one review, exactly as the
    // /avis page groups them (ReviewController::orderForReview dedupes by product_id).
    $rows         = $details->unique(fn ($d) => $d->produit_id ? 'p' . $d->produit_id : 'line' . $d->id)->values();
    $starJoin     = str_contains($reviewUrl, '?') ? '&' : '?';
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

                @if($reminder)
                <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#334155;">
                    Petit rappel&nbsp;: votre commande a été livrée il y a quelques jours, et votre avis compte toujours.
                </p>

                {{-- The delivery was just mentioned once; the usual intro would say it a second time. --}}
                <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#334155;">
                    Votre commande <strong>#{{ $commande->numero }}</strong>&nbsp;: j’espère que tout
                    s’est bien passé et que les produits vous conviennent.
                </p>
                @else
                <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#334155;">
                    Votre commande <strong>#{{ $commande->numero }}</strong> vous a été livrée il y a
                    quelques jours. J’espère que tout s’est bien passé et que les produits vous conviennent.
                </p>
                @endif

                <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#334155;">
                    Si vous avez un moment, votre avis nous serait vraiment utile. Sur Protein.tn, seuls
                    les avis liés à une commande livrée portent la mention «&nbsp;Achat vérifié&nbsp;» et
                    comptent dans la note d’un produit&nbsp;: le vôtre aidera directement quelqu’un qui
                    hésite entre deux produits.
                </p>

                <p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">
                    Ce que vous avez commandé
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                       style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px;">
                    <tbody>
                        @foreach($rows as $d)
                        @php
                            $productId = (int) ($d->produit_id ?: ($d->product->id ?? 0));
                        @endphp
                        <tr>
                            <td style="padding:12px 16px;font-size:14px;line-height:1.5;color:#334155;{{ $loop->first ? '' : 'border-top:1px solid #f1f5f9;' }}">
                                {{ $d->product->designation_fr ?? '—' }}
                                @if($productId > 0 && $d->product)
                                {{-- Five identical links, 1 to 5, none highlighted: the note is confirmed on the next page. --}}
                                <div style="margin-top:6px;line-height:1;white-space:nowrap;">
                                    @for($n = 1; $n <= 5; $n++)
                                    <a href="{{ $reviewUrl . $starJoin . 'p=' . $productId . '&note=' . $n }}"
                                       title="{{ $n }} sur 5" aria-label="{{ $n }} sur 5"
                                       style="display:inline-block;padding:2px 3px;font-size:24px;line-height:1;color:#64748b;text-decoration:none;">&#9733;</a>
                                    @endfor
                                </div>
                                @endif
                            </td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>

                <p style="margin:0 0 22px;font-size:13px;line-height:1.6;color:#64748b;">
                    Choisissez une note&nbsp;: vous la confirmerez sur la page suivante, avec un commentaire si vous le souhaitez.
                </p>

                <a href="{{ $reviewUrl }}" class="btn"
                   style="display:inline-block;background:#d03b04;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;">
                    Écrire mon avis
                </a>

                <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#64748b;">
                    Aucun compte à créer&nbsp;: le lien est lié à votre commande.
                </p>

                {{-- The incentive, disclosed, with its real conditions (ReviewObserver::settlePoints pays only an
                     account with a verified phone, for a comment of reviews.points.min_length characters or more).
                     « votre compte au téléphone vérifié » is a statement about THIS reader, so the line is shown only
                     when it is true: an order placed by an account whose phone is verified
                     (ReviewController::orderEarnsProtinas, the same test the /avis page uses). A guest order, or an
                     account without a verified phone, can never earn and is not promised anything. Independent of
                     the rating; and no Google review link anywhere in this email. --}}
                @if (\App\Http\Controllers\Api\ReviewController::orderEarnsProtinas($commande))
                    <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                        Avec votre compte au téléphone vérifié, un avis publié avec un commentaire d’au moins
                        {{ (int) config('reviews.points.min_length', 15) }} caractères peut vous rapporter des Protinas,
                        quelle que soit la note donnée.
                    </p>
                @endif

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
                    @if($reminder)
                    Vous avez commandé chez nous, et c’est notre seul rappel&nbsp;: nous ne vous
                    écrirons plus au sujet de l’avis sur cette commande.
                    @else
                    Vous recevez ce message parce que vous avez commandé chez nous&nbsp;; au plus un
                    rappel suivra si vous n’avez pas encore donné votre avis.
                    @endif
                    Vous pouvez répondre à cet e-mail, il nous arrive directement.
                </p>
            </td>
        </tr>

    </table>

</td></tr>
</table>

</body>
</html>
