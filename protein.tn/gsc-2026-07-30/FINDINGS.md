# GSC — last 3 months (exported 2026-07-30)

Totals: Tunisia 4,531 clicks / 89,463 impressions / CTR 5.06% / avg position 10.41
Mobile 3,941 clicks, position **8.19** · Desktop 882 clicks, position **19.39** · Tablet 17
Search appearance: Product snippets 956 clicks / 17,066 impr · Review snippet 240 clicks / 4,602 impr

## 1. Clicks roughly HALVED from ~15 July

Daily clicks, same impression volume throughout — so this is a POSITION/CTR collapse, not lost reach:

    01–14 Jul   53,58,46,67,75,81,54,65,52,63,70,57   (avg ~62)
    15–28 Jul   38,34,41,29,28,36,28,26,28,35,35,32,35,52  (avg ~34)

CTR fell from ~4.5% to ~2.8% over the same window. Predates all work done 28–30 July.
29 Jul is an outlier: 2,756 impressions (2x normal) at position 25.5 — worth watching, not yet a trend.

## 2. Head terms — where we actually sit

| query | clicks | impressions | position |
|---|---|---|---|
| sobitas (brand) | 589 | 927 | 2.42 |
| **protein tunisie** | 469 | 2,382 | **8.14** |
| **proteine tunisie** | 123 | 2,241 | **12.54** |
| whey protein tunisie | 61 | 1,527 | 10.76 |
| **creatine tunisie** | 43 | 570 | **18.40** |
| protéine tunisie | 23 | 438 | 15.52 |
| whey tunisie | 7 | 347 | 15.18 |
| créatine tunisie | 3 | 78 | 24.47 |

## 3. Zero-click queries at good positions — a CTR problem, not a ranking problem

| query | impressions | clicks | position |
|---|---|---|---|
| **omega 3 fish oil** | 2,827 | **0** | 7.46 |
| protein powder whey | 1,091 | 0 | 8.78 |
| whey protein | 1,457 | 3 | 9.74 |
| creatine monohydrate | 651 | 0 | 11.39 |
| impact whey protein | 489 | 4 | 9.36 |
| pre workout | 360 | 0 | 9.80 |
| one a day | 148 | 0 | 6.48 |
| anabolic whey 80 | 146 | 0 | 5.30 |

Position 5–9 with 0% CTR means the title/snippet is not answering the query.

## 4. Commercial pages rank far WORSE than blog posts on the same topic

| page | position | | blog competing for the same term | position |
|---|---|---|---|---|
| /proteines | **33.87** | | /blog/whey-protein-en-tunisie | 11.15 |
| /whey-isolate | **51.05** | | /blog/iso-100-de-dymatize… | 7.85 |
| /creatine | **25.83** | | /blog/prix-de-la-creatine-en-tunisie | 9.56 |
| /whey-proteine | **35.34** | | /blog/les-meilleures-marques-de-creatine… | 6.88 |
| /shop | 25.34 | | | |
| /mass-gainers | 43.18 | | | |
| /proteine-tunisie | 50.82 | | | |

The money pages are outranked by our own blog on their own head terms.

## 5. Legacy /category/* URLs still rank — and 308 to the wrong place (VERIFIED LIVE)

| legacy URL | position | clicks | redirects to | should be |
|---|---|---|---|---|
| /category/zma | **2.97** | 21 | /shop | /zma |
| /category/creatine | 14.32 | 34 | /shop | /creatine |
| /category/materiel-de-musculation | 11.02 | 20 | /musculation | ok |
| /category/gants-de-musculation-et-fitness | 11.16 | 10 | /musculation | gloves page |
| /category/proteines | 27.24 | 0 | /shop | /proteines |
| /category/whey-hydrolysee | 28.94 | 4 | /shop | /whey-hydrolysee |
| /category/proteine-whey | 43.41 | 2 | /shop | /whey-proteine |

Cause: `frontend/redirects.js:194` — `p('/category/:path*', '/shop')` catch-all after only 11
enumerated rules. A page ranking at 2.97 lands the visitor on a generic catalogue.

## 6. Host duplication — checked, NOT a bug

www is indexed separately (7,265 impressions, position 4.9) but `https://www.protein.tn/` 308s to
the apex and `http://` 301s to `https://`. Legacy index entries, resolving correctly. No action.

## 7. Orders — why the review engine has never fired (from the live DB)

    etat                      count   with_token   with_email
    nouvelle_commande          1057           92         1025
    annuler                       8            0            8
    en_cours_de_preparation       2            1            2
    prete                         2            1            2
    expidee                       1            1            1
    <11 rows with a PERSON'S NAME as the status>  (Ala, Imen, Rayen, Sobitas…)

**There is no `livree` status anywhere. Not one order has ever been marked delivered.**
1,082 orders total, 199 in the last 180 days, newest 2026-07-30.

Consequences:
- the post-delivery review request can never fire → no attested reviews → no stars, ever
- loyalty points (earned on delivery) have never been awarded either
- only 92 of 1,057 orders have an `order_token`, so even once delivered, ~91% could not be sent a
  login-free review link
- the status field accepts free text, so 11 orders have a person's name as their status
