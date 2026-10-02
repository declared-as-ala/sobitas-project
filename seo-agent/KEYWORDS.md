# Protein.tn — keyword map (the routine's target list)

Goal: **top 5 in Tunisia** for every row. The routine re-checks 5 rows per run (rotate: oldest
`checked` first), records what it saw, and works on the row with the best (impressions × distance
to #3) that has an actionable page. Positions come from GSC (`tools/gsc.mjs --query=`) when the
credential exists, else from a live SERP look (WebSearch / WebFetch of a Google results page for
`<query>` with `gl=tn&hl=fr`). Never write a position you did not observe.

**SERP looks must use `WebSearch` in `extended` mode** (learned 02/10): four `standard`-mode looks in
a row returned French, German and Brazilian retailers and **zero `.tn` domains**, while the same
queries in `extended` mode returned the proper Tunisian sets. A `standard` look is not a weak signal,
it is a different country — do not record a set from one.

Competitors (full dossier: `seo-agent/COMPETITORS.md`) seen in Tunisian SERPs: **housenutrition.tn** and **nutribeast.tn** (the two to
beat — plain commercial category pages, tidy titles "Product – Brand | Shop", price + stock +
review stars in SERP), protein-shop-tunisia.tn, wildkard.tn, tunisianutrition.tn,
nutrition-plus.tn, parashop.tn / pharmacies (fat burners, omega-3), jumia.com.tn, ubuy.tn. Their weak points: thin category
copy, no FAQ, no comparison content, few blog links. Our edge: 224 blog articles, category guides,
FAQ schema, real stock and price on every page.

Legend — page: the URL that SHOULD rank · pos: last observed (date) · note: what to do.

**`(22/09 GSC)` rows come from the owner's own Search Console export** in
`protein.tn/2026-09-22-28d/` (28 days to 22/09/2026), refreshed 24/09. `impr` is summed and `pos`
is impression-weighted across accent variants, so "creatine tunisie" and "créatine tunisie" are
one row. **These are QUERY-AVERAGE positions, not page positions** — GSC averages every
protein.tn URL shown for the query, and on this site the two disagree hard (the owner's baseline
in `docs/seo-ranking-baseline.md` measures `creatine tunisie` at 9.1 query-average while
`/creatine` itself sits at 22.2). Read the Pages breakdown before acting on any row.

**Real Google Tunisia positions, 28/09/2026** (built-in browser on a Tunisian IP, `gl=tn&hl=fr&pws=0`, pages 1–2;
full sets in COMPETITORS.md): proteine sousse **1** (home) + 8 (/proteine-sousse) · protein tunisie **3** (home) ·
bcaa tunisie **7** (/bcaa) · serious mass tunisie **7** (/mass-gainers/serious-mass-2-7-kg, out of stock) · whey protein
tunisie **~10** (/whey-proteine) · proteine tunisie **~13** (home) · absent from top 20: creatine tunisie, mass gainer
tunisie, pre workout tunisie · absent from page 1: creatine prix tunisie, whey isolate tunisie, gold standard whey prix
tunisie, omega 3 tunisie, bruleur de graisse tunisie, complement alimentaire musculation tunisie, nutrition sportive tunisie.
Re-read these exact queries the same way before claiming a move.
Evening re-check 28/09: /proteines **9** on "proteine tunisie" (home out of top 20), /whey-proteine **~13** on "whey protein
tunisie". **Arabic** (`hl=ar`): افضل بروتين في تونس **1** (post 176, AI Overview cites it) · بروتين تونس **4** (176) ·
واي بروتين تونس **8** (176) · كرياتين تونس **~10** (post 214) · سعر الكرياتين في تونس ~18 (French /creatine, translated) ·
مكملات غذائية تونس and ماس جينر تونس absent from top 18. Aecor and Impact are the only competitors with /ar/ pages.

## Head terms (category pages)

| query | page | impr/28d | pos (date) | note |
| --- | --- | --- | --- | --- |
| proteine tunisie | /proteines | 683 | 18.5 (22/09 GSC) | homepage + blog outrank the catalogue page; strengthen /proteines intro + internal links from blog posts. SERP look **30/09** (US-geo, no TN pos): housenutrition `/category/whey`, maparatunisie, nutribeast `/whey`, protein-shop-tunisia, gympro, aecor, nutridiet. **Two of our URLs**: the homepage and the **legacy `/categorie/proteines`** (verified live 30/09: one 308 to `/proteines`, which is 200 + self-canonical) — `/proteines` itself is not the URL Google picked. Index lag on the legacy path, not a defect. 30/09: `/proteines` was the **2nd-worst victim** of the in-content-link defect (11 wasted injected links across the corpus) — fixed in `internalLinks.ts` this run |
| protein tunisie | / | 687 | 12.7 (22/09 GSC) | brand-ish query, homepage holds it; keep |
| whey protein tunisie | /whey-proteine | 346 | 15.7 (22/09 GSC) | every in-stock whey was noindex until 21/09 — re-check after 2 weeks. SERP look 22/09 (US-geo): the **homepage**, not `/whey-proteine`, is our result in the set — decide which should win the head term. SERP look **30/09** on `whey proteine tunisie prix` (US-geo, no TN pos): housenutrition #1, **gainlabnutrition `/collections/whey-tunisie`**, pharma-shop, nutribeast ×2, protein-shop-tunisia. **Three of our URLs in one set**: `/whey-proteine` (it IS in the set now), the blog post `whey-proteine-prix-en-tunisie-comparatif-et-meilleurs-offres` (served on the legacy `/blogs/` path, one 308), and the homepage. `/whey-proteine` was the **worst victim** of the in-content-link defect (13 wasted injected links) — fixed this run |
| whey protein 1kg prix tunisie | /whey-proteine | 115 | 9.8 (22/09 GSC) | 0 clicks: title/description work (price angle). SERP look **02/10** (US-geo **extended** mode, no TN pos): gainlabnutrition, pharma-shop, gympro, **nutribeast x2**, sf-nutrition x2, ironlab, aecor, pazario — **protein.tn absent from the set entirely**. Competitor 1 kg prices in the set: **109–159 DT**. A `standard`-mode look on the same query returned only French/German/Brazilian retailers and zero `.tn` domains — use `extended` |
| whey gold standard prix tunisie | /whey-proteine/100-whey-gold-standard-2-27kg | 84 | 8.4 (22/09 GSC) | 0 clicks. **Answered — which URL ranks is now known.** SERP look **02/10** (US-geo extended, no TN pos): strong-nutrition (4,5 kg + 2,27 kg), stock-x, protein-shop-tunisia x2, aecor, nutribeast 2,27 kg, body-shop. Our URL in the set is **`/whey-proteine/whey-gold-standard-908g` — 155 DT, `BackOrder`** (verified live 02/10); the target page **`…/100-whey-gold-standard-2-27kg` is 379 DT `InStock` and absent**. Fourth confirmed “a dead SKU answers the money query” — restock or a Redirections row, `(needs: owner)`, not copy. Also: competitors price the same 2,27 kg at **299 DT** vs our **379 DT** |
| creatine tunisie | /creatine | 172 | 13.6 (22/09 GSC) | blog cannibalises; /creatine has the guide — needs product links + FAQ tuning. SERP look 22/09 (US-geo): gainlabnutrition.com ranks ahead of us; `/creatine`, our blog price post, and legacy `/product-category/creatines/` all appear — one head term, three of our URLs |
| creatine monohydrate | /creatine | 137 | 28.0 (22/09 GSC) | global phrase; local intent weak — secondary. SERP look **30/09** on `creatine monohydrate tunisie prix` (US-geo, no TN pos): **gainlabnutrition `/collections/creatine-tunisie`**, strong-nutrition, housenutrition, nutribeast ×3, gohardnutrition, gympro. Our URL is the **legacy `/shop/creatine-monohydrate-300g-ultimate-nutrition`** (verified live 30/09: one 301 to `/creatine/…`, **99 DT `BackOrder`**) and **`/creatine` is absent**. Third confirmed instance of "a dead SKU answers the money query" — see BACKLOG P1 |
| prix creatine tunisie | /creatine | 5 | 10.4 (22/09 GSC) | SERP look **02/10** (US-geo extended, no TN pos): pharma-shop, **nutribeast x2**, maparatunisie, protein-shop-tunisia. **Two of our URLs, both in the set and both healthy**: `/blog/prix-de-la-creatine-en-tunisie` **and `/creatine` itself** — the rare non-cannibalising pair (price guide vs commercial shelf). Google’s AI summary quotes price ranges (“25–80 TND”, “300 g 20–50 TND”, “Creapure 50–80 TND”) that match our blog post’s own table. Nothing to fix; read this pair before touching the unhealthy ones |
| mass gainer tunisie | /mass-gainers | 55 | 56.1 (22/09 GSC) | SERP look 28/09 (US-geo, no TN pos) on `mass gainer prix tunisie`: **gainlabnutrition.com/collections/mass-gainer-tunisie** leads, then impactnutrition, protein-shop-tunisia, nutribeast (two URLs), gympro. **Our result in the set is the blog post** `/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025`, not the category — one query, two of our URLs, and the informational one is winning it. Saturday (cannibalisation), not a title rewrite |
| serious mass tunisie | /mass-gainers/serious-mass-5-45-kg-optimum-nutrition | 89 | 14.4 (22/09 GSC) | split across 8 URLs; canonical target = PDP; tighten blog links. SERP look **30/09** (US-geo, no TN pos): ubuy, strong-nutrition, protein-shop-tunisia ×2, gympro, para-plus, sf-nutrition. Our URL in the set is **`/mass-gainers/serious-mass-2-7-kg` — 195 DT, `BackOrder`** (verified live 30/09); the buyable 5,45 kg (**379 DT, `InStock`**) is **absent**, while three competitors rank their own 5,45 kg. The unbuyable SKU holds our slot. The 2,7 kg page already links the 5,45 kg ("Disponible immédiatement" block, verified live) — so the gap is restock or a Redirections row, `(needs: owner)`, not copy |
| prise de masse tunisie | /prise-de-masse | ? | ? | SERP look 25/09 (US-geo, no TN pos): **housenutrition.tn/category/mass-gainer** leads, then nutribeast, maparatunisie, parafendri, parapharmacie. **Three of our URLs in one set** — `/prise-de-masse`, `/category/prise-de-masse`, `/categorie/prise-de-masse`; both legacy paths verified live 25/09, each 308s once to the canonical, which is 200 + `index, follow` + self-canonical. Index lag, nothing to fix |
| pre workout tunisie | /pre-workout | 7 | 41.4 (22/09 GSC) | ranks on the Born Rage PDP, not the category — decide which should win. SERP look **30/09** on `pre workout tunisie prix` (US-geo, no TN pos): housenutrition `/category/preworkout`, strong-nutrition, protein-shop-tunisia, nutribeast `/pre-workout`, gympro, body-shop, sf-nutrition, nutridiet. Our URL in this set is **`/pre-workout`, the category** — a change in SHAPE from the 22/09 row (which had the PDP answering it), recorded as a shape change, never a position. All 7 in-stock pre-workout PDPs verified 30/09: titles 47–62, FAQPage on every one, entries already in `resources/seo/products/2026-09-28.json` |
| pre workout | /pre-workout | 393 | 7.0 (22/09 GSC) | **page-one and 0 clicks in 28 days** — the biggest zero-click row on the site. Impressions match `/pre-workout/pre-workout-born-rage-original-eric-favre` (385 impr, 1 clk, pos 5.4) almost exactly, so the generic term is answered by one niche PDP, not the category. Cannibalisation decision (Saturday), NOT a title rewrite: `/pre-workout` is inside the 05/10 freeze |
| optimum nutrition | /optimum-nutrition | 518 | 5.2 (22/09 GSC) | brand query, position 5 and 1.35 % CTR (7 clicks). The brand page itself sits at 13.5 on 1,614 impr, so the URL Google shows for the exact term is NOT the brand page — read the Pages breakdown before acting. SERP look **02/10** (US-geo extended, no TN pos): ubuy x2, strong-nutrition x2, **aecor (the official ON distributor in Tunisia)**, body-shop, nutribeast. **Two of our URLs**: `/optimum-nutrition` and the legacy `/brand/Optimum%20Nutrition/17`, whose SERP title is a remembered storage-URL string. Verified live 02/10: the legacy URL **301s to `/optimum-nutrition`**, which is 200, `index, follow`, self-canonical, title 59, description 141, FAQPage present. Index lag on a legacy path — do not “fix” it. Saturday (cannibalisation) is where this row belongs |
| protein powder whey | /whey-proteine | 170 | 9.8 (22/09 GSC) | page-one, 0 clicks; English-language phrasing our titles never use. SERP look **02/10** on `protein powder whey tunisie prix` (US-geo extended, no TN pos): para-plus, **housenutrition `/category/whey`**, **gainlabnutrition `/collections/whey-tunisie`**, pharma-shop, protein-shop-tunisia, gympro, **nutribeast `/whey`**, sf-nutrition x2 — **protein.tn absent from the set entirely**, so the 170 impressions come from a URL that is not in the Tunisian commercial set |
| ~~impact whey protein~~ | — | 153 | 9.4 (22/09 GSC) | **RETIRED 29/09.** SERP look 29/09 (US-geo): primini.tn #1, then impactnutrition.com.tn ×3, wildkard, pharma-shop, tunisiepara ×2, maparatunisie. "Impact" is a **Tunisian brand** (impactnutrition.com.tn) and its own site plus its resellers own the term — we do not stock it. The 153 impressions are the brand's demand, not ours; no copy on `/whey-proteine` wins it. Do not re-add |
| bruleur de graisse tunisie | /bruleurs-de-graisse | ? | ? | SERP look 25/09 (US-geo, no TN pos): **six of nine results are parapharmacies** (para-plus, paraexpert, maparatunisie, parashop, parapharm, pharma-shop); only nutribeast `/thermogeniques` is a sports shop. protein.tn absent. This is a pharmacy-intent query — the page needs the minceur/thermogénique vocabulary before it can compete, and that is a copy theme, not a title tweak |
| bcaa tunisie | /bcaa | ? | ? | SERP look 25/09 (US-geo, no TN pos): nutribeast holds two BCAA URLs, plus protein-shop-tunisia, stock-x, tunisiepara, strong-nutrition. **Our result in the set is the legacy `/category/bcaa` with the old "\| SOBITAS" title**; verified live the same day: it 308s once to `/bcaa`, which is 200, self-canonical, title 56. Index lag, not a defect — do not "fix" it |
| omega 3 tunisie | /omega-3 | 62 | 18.1 (22/09 GSC) | retarget + real `bestProductSlugs` shipped 22/09; dead SKU `/omega-3/omega-3` still `(needs: owner)` retire. SERP look **29/09** (US-geo, no TN pos): **housenutrition.tn/category/fish-oil #1**, protein-shop-tunisia ×3, nutribeast (PDP + category), parapharmacie, tunisiepara, bioherbs — protein.tn **absent**. NutriBeast ranks a PDP for the *same* WeightWorld 240-softgel product we carry and their title states the dose ("– 2000mg EPA DHA"); ours names neither. **3 buyable of 329** (29/09) |
| protein bar chocolate | /barres-proteinees | 145 | 10.3 (22/09 GSC) | **bars category page shipped 22/09** (177→~1,800 words, FAQPage, price anchor `dès 36 DT`, `sur commande`). SERP look 22/09 (US-geo): we are absent; protein-shop-tunisia, housenutrition, nutribeast, stock-x, geantdrive hold it. Re-check TN pos after deploy + reindex |
| collagene tunisie | /collagene | 5 | 51.6 (22/09 GSC) | **category verified live 25/09 and in good shape**: 200, `index, follow`, title 62 ("Collagène Tunisie \| Marin, Peptides & Types 1-3 — Protein.tn"), description 155, H1 carries the term. It is simply not ranked yet. SERP look 25/09 (US-geo): paraexpert, parashop, maparatunisie, parapharm, protein-shop-tunisia, nutribeast, bioherbs — protein.tn absent. A future Tuesday category week, not a same-day fix SERP look **29/09** (US-geo) on `collagène marin tunisie prix`: parashop ×2, maparatunisie ×2, **paraexpert "Guide d'achat et comparatif 2026"**, algovita, nutribeast, parapharmacie, tunisiepara — protein.tn absent and **8 of 9 holders are parapharmacies**, confirming 25/09: this is a beauty query here, not a sports one. 2 buyable of 254 (29/09) |
| vitamines tunisie | /vitamines | 16 | 35.4 (22/09 GSC) | Page rebuilt since: **1,855 bot words, 6 words above the grid, FAQPage, 10 buyable of 1,870** (measured 29/09). SERP look 29/09 (US-geo, no TN pos): parashop, parapharm, protein-shop-tunisia (category + 2 PDPs), nutribeast ×3, parapharmacie — protein.tn **absent**. Thinness is no longer the problem; stock is |
| complement alimentaire tunisie | / or /proteines | 61 | 8.2 (22/09 GSC) | SERP look 25/09 (US-geo, no TN pos): maparatunisie, parafendri, stadium, paramust, gympro, nutribeast, viveznature — **protein.tn absent from a 9-result set** for the generic head term, while GSC has the query at 8.2 on 61 impressions. The two disagree because GSC averages every protein.tn URL shown in Tunisia; read the Pages breakdown before acting |

**Note 22/09/2026 (run 2), no position observed — a template change, recorded so the next
re-check knows what moved.** Every row above whose `page` is a category page gained editorial text
*for human visitors* on 22/09: the page intro used to be clamped to 520 characters for people and
printed whole for Googlebot, so /creatine 369, /whey-proteine 635, /mass-gainers 967,
/pre-workout 690 and /proteines 187 words were bot-only (measured, both UAs). Googlebot's view is
**unchanged** — nothing was added to or removed from what Google reads — so no ranking move should
be attributed to it; what changed is that the page stopped being a parity risk and shoppers can now
read the price, format and delivery paragraphs. Re-check these rows from 06/10 as usual, and do not
credit or blame this change for a delta.

**Note 25/09/2026 — where we appear at all, Google is still showing a LEGACY URL with a stale
title.** Five rows were SERP-checked today (`bcaa tunisie`, `bruleur de graisse tunisie`, `prise de
masse tunisie`, `collagene tunisie`, `complement alimentaire tunisie`) and the pattern is the same
in every one that contains us: the ranking URL is `/category/<slug>` or `/categorie/<slug>` with a
pre-rename title, and every one of those paths was verified live the same day to redirect in a
**single** 308 hop to a 200, self-canonical page with the current title. That is re-crawl lag on a
site whose best sellers were `noindex` from ~11/08 to 21/09 — the diagnosis already in
`PLAYBOOK.md`. Do not re-point, re-title or re-canonical anything because of it, and especially
not while the September 2026 spam update is rolling (started 24/09).

**Note 29/09/2026 — a price aggregator is taking the `prix` queries.** `primini.tn` appeared in
**three of the five** sets looked at today and holds **#1** on two of them (`glutamine tunisie
prix`, `impact whey protein tunisie prix`), with the title pattern `PRODUCT Prix Tunisie : Dès N
DT`. That is the price-anchor formula this routine converged our own category titles onto — run by
a comparator that carries no stock and can list every shop's price. Two consequences for this file:
a `prix` row is now contested by an aggregator as well as by the shops in `COMPETITORS.md`, and our
own price anchor has to carry something it cannot copy (real stock count, delivery window, the
format actually in the warehouse). Re-check these rows from a Tunisian IP before acting.

## Product-name SERPs (in-stock best sellers; House Nutrition style "Product – Brand" + price)

| query | page | pos (date) | note |
| --- | --- | --- | --- |
| creatine ostrovit | /creatine/creatine-monohydrate-300g-ostrovit | site: indexed (21/09) | **FAQ + guide queued 23/09** (6 pairs, 269 w). SERP look 23/09 (US-geo, no TN pos): housenutrition holds 300 g AND 500 g, plus nutribeast, gympro, body-shop, ubuy; our result still shows the legacy `/shop/` URL (1 clean 301 hop). Still `Sur commande` |
| creatine biotech | /creatine/100-creatine-monohydrate-300g-biotech-usa | ? | title humanized 21/09 |
| iso 100 dymatize | /whey-isolate/iso-100-dymatize-2-3kg | 27 | 9.6 (22/09 GSC) |
| gold standard whey | /whey-proteine/100-whey-gold-standard-2-27kg | 5 | 25.6 (22/09 GSC) |
| serious mass | /mass-gainers/serious-mass-5-45-kg-optimum-nutrition | 68 | 34.7 (22/09 GSC) |
| levro legendary mass | /mass-gainers/levro-legendary-mass-6-8kg-kevin-levrone | 23 | 16.1 (22/09 GSC) |
| nitro tech whey gold | /whey-proteine/nitro-tech-whey-gold-2-3kg | ? | **FAQ + guide queued 23/09** (6 pairs, 221 w, qualitative only — the fiche publishes no nutritional figure). SERP look 23/09 (US-geo): gust.tn, protein-shop-tunisia (270 DT), strong-nutrition, nutribeast, body-shop, sf-nutrition, jumia; ours at 259 DT via the legacy `/shop/` URL. Still `Sur commande` |
| big whey big ramy | /whey-proteine/big-whey-2kg-big-ramy-labs | ? | check |
| c4 pre workout | /pre-workout/c4-original-pre-workout-cellucor | ? | **FAQ + guide queued 23/09** (6 pairs, 228 w, from the label transcribed 20/09: 6,5 g portion / 150 mg caféine / 1 600 mg bêta-alanine / 1 000 mg créatine nitrate). **EN STOCK** — the only one of the four. SERP look 23/09 (US-geo): housenutrition (282 g), nutribeast (195 g), strong-nutrition, gympro — and **our ranking URL is the category `/pre-workout`, not this PDP**: decide the winner on Thursday's CTR pass. Title 64 chars |
| psychotic pre workout | /pre-workout/psychotic-pre-workout | ? | SERP look 28/09 (US-geo, no TN pos): housenutrition, strong-nutrition (two URLs), nutribeast, body-shop. **Two of our URLs in the set** — `/pre-workout` and the legacy **`/shop/psychotic-pre-workout`** with the raw "PSYCHOTIC PRE-WORKOUT" title; verified live the same day, one 301 to the canonical PDP, 200. Index lag, not a defect |
| lipo 6 black | /bruleurs-de-graisse/lipo-6-black-ultra-concentrate-60caps | ? | **The URL Google shows is the dead SKU** (SERP look + live checks 28/09): `/shop/lipo-6-black-60-caps` → one 301 → `/bruleurs-de-graisse/lipo-6-black-60-caps`, **139 DT, `BackOrder`**, self-canonical. The target in this row — `…-ultra-concentrate-60caps`, **119 DT, `InStock`** — is a different SKU. Set holders: wildkard, para-plus (×2), housenutrition, protein-shop-tunisia, gympro, nutribeast. Saturday: exact-anchor links from the dead SKU and the category to the buyable one; restock/retire is `(needs: owner)` |
| born rage | /pre-workout/… (find slug) | 5.3 (15/09) | the page-1 "pre workout" result |


**Note 23/09/2026 — `/barres-proteinees` is `noindex` and it is a stock problem, not an SEO one.**
The row "protein bar chocolate" above points at a category page this routine finished on 22/09,
but the owner's dead-listing gate (`9c9dc83`) noindexes any listing with nothing buyable on page 1
and the bars rayon is **0 of 88 in stock** (measured live 23/09). The same applies to
`/intra-workout` (0 of 12+). Neither page can rank until stock arrives, and both reverse
themselves automatically the day it does — so do **not** rewrite either page for ranking reasons,
and do not read a position drop on these rows as a content failure.

## Discovered 30/09/2026 (Google autocomplete fr/tn, `suggest.mjs`: 12 head-term seeds + 5 in-stock pre-workout SKUs — 400 + 83 suggestions)

Hits/rank are autocomplete frequency and position in the suggestion list, **not** search positions.
Stock read the same morning from `/api/productsBySubCategoryId/<slug>`.

| query | rank | page it should own | stock | note |
| --- | --- | --- | --- | --- |
| serious mass tunisie | 1 | /mass-gainers/serious-mass-5-45-kg-optimum-nutrition | **5,45 kg InStock 379 DT · 2,7 kg qte 0** | the family below is five rows and `suggest.mjs` maps none of them; the URL Google actually shows is the 2,7 kg (BackOrder) — see the head-term row |
| serious mass prix tunisie | 1 | same | same | |
| serious mass tunisie prix | 2 | same | same | |
| serious mass 2.7 kg tunisie prix | 4 | /mass-gainers/serious-mass-2-7-kg | **qte 0** | real format demand with no buyable SKU — `(needs: owner)` restock, already in BACKLOG |
| serious mass 5kg prix tunisie | 7 | /mass-gainers/serious-mass-5-45-kg-optimum-nutrition | InStock | the buyable format; the one worth format copy |
| pre workout tunisie gsn | 3 | /gsn-great-sport-nutrition (brand page is 200) | **no GSN pre-workout in stock** | we own the brand page and cannot fill the query — `(needs: owner)` |
| c4 pre workout tunisie | 4 | /pre-workout/c4-original-pre-workout-cellucor | InStock 149 DT | PDP already has a factual guide + 10 FAQ pairs (verified live 30/09) |
| psychotic pre workout tunisie | 6 | /pre-workout/psychotic-pre-workout | InStock 139 DT | PDP already has 9 FAQ pairs; no label doses published on the fiche, so none written |
| abe / redweiler / nutrend / ghost pre workout tunisie | 5 / 7 / 9 / 10 | — | **not stocked** | four brand demands we do not carry — `(needs: owner)`, not a copy job |
| meilleur pre workout sans cafeine | 2 | /pre-workout FAQ | — | informational tail none of the 7 PDP FAQs answers yet; candidate for the category FAQ, not a PDP |
| meilleur pre workout pump | 5 | /pre-workout FAQ | — | same |
| protein tunisie sousse | 6 | /proteine-sousse | — | the page exists; `proteine sousse` is already **Held** at 1 |
| proteine tunisie sobitas | 5 | / | — | our own company name; navigational, homepage holds it |

## Discovered 28/09/2026 (Google autocomplete fr/tn, `suggest.mjs --deep`: 12 seeds, 516 requests, 3,647 suggestions)

Hits are autocomplete frequency, **not** positions. Only the Tunisian-geo queries are listed — the
same run returned the identical patterns for maroc/algérie/france/canada/sénégal, which are noise
for us. The pattern of the whole run is **format + prix**, and the `stock` column is why most of
these are a purchasing decision before they are a content one (measured 28/09 from
`/api/productsBySubCategoryId/<slug>`, `qte` per SKU).

| query | page | hits | stock (28/09) | note |
| --- | --- | --- | --- | --- |
| whey gold standard 2.27 kg prix tunisie | /whey-proteine/100-whey-gold-standard-2-27kg | 5 | **in stock** (qte 63) | the one gold-standard format we can sell; the PDP already carries the format in its title. Highest-value new row |
| optimum nutrition gold standard whey prix tunisie | /whey-proteine/100-whey-gold-standard-2-27kg | 5 | in stock | brand + product + prix; same target as above |
| whey gold standard 4.5 kg prix tunisie | /whey-proteine | 5 | **none buyable** (4,5 kg qte 0) | `(needs: owner)` restock before any copy |
| whey gold standard 5 kg prix tunisie | /whey-proteine | 5 | **none buyable** (no 5 kg SKU) | the format does not exist in the catalogue; do not invent a page for it |
| whey gold standard 1kg / 2kg prix tunisie | /whey-proteine | 4 each | **none buyable** | no 1 kg or 2 kg gold standard in stock |
| whey gold standard 900g prix tunisie | /whey-proteine | 4 | **none buyable** (908 g qte 0) | `(needs: owner)` restock |
| créatine prix tunisie 1kg | /creatine | 4 | **none buyable** (nine 1 kg SKUs, all qte 0) | re-confirms the 22/09 gap, still true six days later |
| creatine prix tunisie 100g | /creatine | 4 | **none buyable** (one 100 g SKU, qte 0) | — |
| creatine prix tunisie gsn | /creatine/gsn-creatine-monohydrate-200g | 4 | PDP is `BackOrder` | the GSN 200 g is the cheapest creatine we list (59 DT) and it is the page the 24/09 CTR pass already fixed the title on |
| creatine monohydrate 500g prix tunisie | /creatine/creatine-monohydrate-ostrovit-500gr | 3 | 3 × 500 g in stock (22/09) | the format with both demand AND stock — use it in the /creatine comparison table and FAQ |
| creatine monohydrate 1kg prix tunisie | /creatine | 3 | none buyable | — |
| serious mass 2.7 kg tunisie prix | /mass-gainers | 4 | **none buyable** (qte 0) | only the 5,45 kg is in stock (qte 34) |
| serious mass 5kg prix tunisie | /mass-gainers/serious-mass-5-45-kg-optimum-nutrition | 4 | in stock (qte 34) | "5kg" is how the 5,45 kg is searched for — worth carrying in the PDP copy |
| serious mass prix tunisie | /mass-gainers/serious-mass-5-45-kg-optimum-nutrition | 3 | in stock | — |
| proteine tunisie mass | /proteines | 4 | — | maps to the prise-de-masse rayon from the protein head term; an internal-link row, not a page |

**The one-line conclusion for the week:** 13 of 168 whey SKUs and 12 of 225 creatine SKUs are
buyable, and the formats Tunisians actually type are mostly in the other group. Copy cannot fix
that; the rows above are marked so no future run spends a morning writing for an unbuyable format.

## Discovered 23/09/2026 (Google autocomplete fr/tn — hits = autocomplete frequency, NOT a position)

| query | page | evidence | note |
| --- | --- | --- | --- |
| creatine prix tunisie | /creatine | 7 | 16.9 (22/09 GSC) |
| prix creatine monohydrate tunisie | /creatine | 5 hits (23/09) | use in the /creatine FAQ + comparison table |
| creatine monohydrate prix tunisie | /creatine | 24 | 37.2 (22/09 GSC) |
| serious mass gainer tunisie | /mass-gainers | 22 | 44.2 (22/09 GSC) |
| whey isolate 1kg prix | /whey-isolate | 3 hits (23/09) | **no 1 kg isolate SKU in stock** — purchasing before copy |
| mass gainer prix tunisie | /mass-gainers | 20 | 63.3 (22/09 GSC) |
| acheter creatine monohydrate | /creatine | 2 hits (23/09) | transactional; covered by the PDP guide |
| meilleur creatine monohydrate | /creatine | 6 | 10.0 (22/09 GSC) |

## Discovered 22/09/2026 (Google autocomplete fr/tn, deep run — evidence = hits / best rank, NOT a position)

Work these like the head terms: the `page` column is the URL that should own the query; add a
`page pos` observation (GSC Pages dimension) before touching anything — see PLAYBOOK "Pages
breakdown first".

| query | page | evidence | priority |
| --- | --- | --- | --- |
| whey protein tunisie prix | /whey-proteine | 7 | 11.1 (22/09 GSC) |
| whey tunisie prix | /whey-proteine | 6 hits, best 1; plus "prix whey tunisie" (2/1), "whey prix tunisie" (1/9) | P1 |
| whey tunisie | /whey-proteine | 107 | 15.8 (22/09 GSC) |
| whey isolate tunisie | /whey-isolate | 7 | 17.4 (22/09 GSC) |
| whey isolate tunisie prix | /whey-isolate | 3 | 9.7 (22/09 GSC) |
| proteine tunisie prix | /proteines | 13 | 10.0 (22/09 GSC) |
| mass gainer tunisie prix | /mass-gainers | 5 hits, best 2; plus "mass gainer prix tunisie" (3/1), "prix mass gainer tunisie" (2/1); 7 in stock | P1 |
| pre workout prix tunisie | /pre-workout | 4 hits, best 1; plus "pre workout tunisie prix" (2/2); decide category vs Born Rage PDP first | P1 |
| bcaa prix tunisie | /bcaa | 3 hits, best 1; plus "bcaa tunisie prix" (3/2); only Xtend + Real Pharm 8:1:1 in stock | P1 |
| omega 3 prix tunisie | /omega-3 | 27 | 23.5 (22/09 GSC) |
| meilleur oméga 3 tunisie | /omega-3 | 3 | 20.7 (22/09 GSC) |
| collagène marin tunisie | /collagene/collagen-marine-300g-real-pharm | 11 | 57.1 (22/09 GSC) |
| multivitamines tunisie | /vitamines | 2 hits, best 3; title already says Multivitamines; page is 566 words — rebuild with the 10 in-stock SKUs | P1 |
| glutamine tunisie | /glutamine | 10 | 20.4 (22/09 GSC) SERP look 29/09 (US-geo, no TN pos): **primini.tn ×2**, parashop, pharma-shop, tunisiepara, protein-shop-tunisia, maparatunisie, nutribeast, parapharmacie — protein.tn absent. 2 buyable of 56 |
| glutamine tunisie prix | /glutamine | 4 hits, best 2; plus "glutamine prix tunisie" (2/1) | P1 |
| whey protein 2kg prix tunisie | /whey-proteine | 5 | 3.8 (22/09 GSC) |
| mass gainer 7kg prix tunisie | /mass-gainers/mass-gainer-zero-7kg-eric-favre | 7 | 6.1 (22/09 GSC) |
| c4 pre workout tunisie | /pre-workout/c4-original-pre-workout-cellucor | 8 | 5.6 (22/09 GSC) |
| bcaa xtend tunisie | /bcaa/xtend-bcaa-420g | 2 hits, best 3; in stock | P1 |
| creatine tunisie optimum nutrition | /creatine/micronised-creatine-optimum-nutrition-317g | 4 hits, best 5; in stock (qty 1000); was noindex until 21/09 — re-check 05/10 | P1 |
| whey protein tunisie promotion | /whey-proteine (promo block), /offres secondary | 4 hits, best 5; only promo query with 4 hits | P1 |
| omega 3 tunis | /omega-3 | 4 | 6.0 (22/09 GSC) |
| sobitas tunisie | / | 3 hits, best 1; GSC "sobitas" 432 clicks at ~1.1 — monitor only | P2 |
| sobitas proteine tunisie | / | 3 hits, best 2; plus "proteine tunisie sobitas" (3/5) | P2 |
| protéine tunisie sobitas whey & matériel musculation sousse | /proteine-sousse | 2 hits, best 3; the GBP listing name; LocalBusiness.name already exact (3205bd02) | P2 |
| protein tunisie sousse | /proteine-sousse | 3 hits, best 8; plus "proteine sousse" (1/2), "whey protein sousse" (1/1), "creatine sousse" (1/2) | P2 |
| whey protein tunis | /whey-proteine | 3 hits, best 4; plus "whey tunis" (1/10) | P2 |
| mass gainer tunis | /mass-gainers | 3 hits, best 3 | P2 |
| creatine tunisie 1kg | /creatine | 4 hits, best 4; NO 1 kg creatine in stock — stock gap (owner) before any copy | P2 |
| créatine tunisie 500g | /creatine/creatine-monohydrate-ostrovit-500gr | 3 hits, best 6; 3 × 500 g in stock (Ostrovit, Quamtrax, Real Pharm) | P2 |
| creatine tunisie 300g | /creatine/100-creatine-monohydrate-300g-biotech-usa | 2 hits, best 10; 3 × 300 g in stock (BioTech, Kevin Levrone, Real Pharm) | P2 |
| creatine monohydrate tunisie | /creatine | 15 | 36.7 (22/09 GSC) |
| creatine biotech tunisie | /creatine/100-creatine-monohydrate-300g-biotech-usa | 1 hit, best 2; in stock; HN #1 on "creatine biotech" with 5.0(24) | P2 |
| creatine kevin levrone tunisie | /creatine/gold-creatine-kevin-levrone-300-g | 1 hit, best 3; in stock | P2 |
| creatine quamtrax tunisie | /creatine/creatine-monohydrate-500g-quamtrax | 7 | 9.9 (22/09 GSC) |
| meilleur creatine tunisie | /creatine | 1 hit, best 1 (tn); plus "vente creatine tunisie" (1/1) | P2 |
| whey protein 500g prix tunisie | /whey-proteine | 14 | 10.8 (22/09 GSC) |
| whey protein optimum nutrition tunisie | /optimum-nutrition | 12 | 4.8 (22/09 GSC) |
| meilleur whey tunisie | /whey-proteine | 2 hits, best 1 (tn); plus "vente whey tunisie" (2/1) | P2 |
| prix proteine whey tunisie | /whey-proteine | 2 hits, best 5; plus "protéine whey prix tunisie" (1/5) | P2 |
| whey protein vanille tunisie | /whey-proteine | 1 hit, best 1; only flavour query with geo | P2 |
| whey isolate protein tunisie | /whey-isolate | 2 hits, best 3; plus "iso whey tunisie prix" (1/5), "proteine isolate tunisie" (1/4) | P2 |
| weight gainer tunisie | /mass-gainers | 3 hits, best 5; synonym; plus "weight gainer prix tunisie" (2/8) | P2 |
| mass gainer 3kg prix tunisie | /mass-gainers | 8 | 6.6 (22/09 GSC) |
| mass gainer 5kg prix tunisie | /mass-gainers/serious-mass-5-45-kg-optimum-nutrition | 1 hit, best 2; Serious Mass 5.45 + Thunder Gainer 5.4 in stock | P2 |
| mass gainer 6kg prix tunisie | /mass-gainers/levro-legendary-mass-6-8kg-kevin-levrone | from the 22/09 run (row truncated in the dossier); in stock | P2 |


## Rules for this file
- Add a row when GSC shows a query ≥ 20 impressions/28d that maps to a page we own.
- Update `pos (date)` only from an observation (GSC or a real SERP fetch). A GSC query position
  is an AVERAGE over every protein.tn URL shown for it — record the PAGE-level position of the
  URL in the `page` column too (`gsc.mjs --query=<q>` → Pages), and never edit a category because
  of a query average that a blog post or a PDP is actually earning.
- When a row reaches ≤ 5 for 14 days, move it to the "Held" section below and stop working it.

## Held (top 5, monitor only)
_(none yet)_
