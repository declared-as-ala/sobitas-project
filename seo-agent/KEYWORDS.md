# Protein.tn — keyword map (the routine's target list)

Goal: **top 5 in Tunisia** for every row. The routine re-checks 5 rows per run (rotate: oldest
`checked` first), records what it saw, and works on the row with the best (impressions × distance
to #3) that has an actionable page. Positions come from GSC (`tools/gsc.mjs --query=`) when the
credential exists, else from a live SERP look (WebSearch / WebFetch of a Google results page for
`<query>` with `gl=tn&hl=fr`). Never write a position you did not observe.

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

## Head terms (category pages)

| query | page | impr/28d | pos (date) | note |
| --- | --- | --- | --- | --- |
| proteine tunisie | /proteines | 683 | 18.5 (22/09 GSC) | homepage + blog outrank the catalogue page; strengthen /proteines intro + internal links from blog posts |
| protein tunisie | / | 687 | 12.7 (22/09 GSC) | brand-ish query, homepage holds it; keep |
| whey protein tunisie | /whey-proteine | 346 | 15.7 (22/09 GSC) | every in-stock whey was noindex until 21/09 — re-check after 2 weeks. SERP look 22/09 (US-geo): the **homepage**, not `/whey-proteine`, is our result in the set — decide which should win the head term |
| whey protein 1kg prix tunisie | /whey-proteine | 115 | 9.8 (22/09 GSC) | 0 clicks: title/description work (price angle) |
| whey gold standard prix tunisie | /whey-proteine/100-whey-gold-standard-2-27kg | 84 | 8.4 (22/09 GSC) | 0 clicks; find which URL ranks (exact-page filter) |
| creatine tunisie | /creatine | 172 | 13.6 (22/09 GSC) | blog cannibalises; /creatine has the guide — needs product links + FAQ tuning. SERP look 22/09 (US-geo): gainlabnutrition.com ranks ahead of us; `/creatine`, our blog price post, and legacy `/product-category/creatines/` all appear — one head term, three of our URLs |
| creatine monohydrate | /creatine | 137 | 28.0 (22/09 GSC) | global phrase; local intent weak — secondary |
| prix creatine tunisie | /creatine | 5 | 10.4 (22/09 GSC) | check |
| mass gainer tunisie | /mass-gainers | 55 | 56.1 (22/09 GSC) | check |
| serious mass tunisie | /mass-gainers/serious-mass-5-45-kg-optimum-nutrition | 89 | 14.4 (22/09 GSC) | split across 8 URLs; canonical target = PDP; tighten blog links |
| prise de masse tunisie | /prise-de-masse | ? | ? | check |
| pre workout tunisie | /pre-workout | 7 | 41.4 (22/09 GSC) | ranks on the Born Rage PDP, not the category — decide which should win |
| pre workout | /pre-workout | 393 | 7.0 (22/09 GSC) | **page-one and 0 clicks in 28 days** — the biggest zero-click row on the site. Impressions match `/pre-workout/pre-workout-born-rage-original-eric-favre` (385 impr, 1 clk, pos 5.4) almost exactly, so the generic term is answered by one niche PDP, not the category. Cannibalisation decision (Saturday), NOT a title rewrite: `/pre-workout` is inside the 05/10 freeze |
| optimum nutrition | /optimum-nutrition | 518 | 5.2 (22/09 GSC) | brand query, position 5 and 1.35 % CTR (7 clicks). The brand page itself sits at 13.5 on 1,614 impr, so the URL Google shows for the exact term is NOT the brand page — read the Pages breakdown before acting |
| protein powder whey | /whey-proteine | 170 | 9.8 (22/09 GSC) | page-one, 0 clicks; English-language phrasing our titles never use |
| impact whey protein | /whey-proteine | 153 | 9.4 (22/09 GSC) | page-one, 1 click; our blog post ranks, the catalogue does not |
| bruleur de graisse tunisie | /bruleurs-de-graisse | ? | ? | check |
| bcaa tunisie | /bcaa | ? | ? | check |
| omega 3 tunisie | /omega-3 | 62 | 18.1 (22/09 GSC) | retarget + real `bestProductSlugs` (empty block fixed) shipped 22/09; dead SKU `/omega-3/omega-3` still `(needs: owner)` retire. SERP look 22/09 (US-geo, no TN pos): pharmacies (parapharmacie/tunisiepara), wildkard, nutribeast own the set; still showing our old `/category/omega-3` title |
| protein bar chocolate | /barres-proteinees | 145 | 10.3 (22/09 GSC) | **bars category page shipped 22/09** (177→~1,800 words, FAQPage, price anchor `dès 36 DT`, `sur commande`). SERP look 22/09 (US-geo): we are absent; protein-shop-tunisia, housenutrition, nutribeast, stock-x, geantdrive hold it. Re-check TN pos after deploy + reindex |
| collagene tunisie | /collagene ? | 5 | 51.6 (22/09 GSC) | check the category exists + copy |
| vitamines tunisie | /vitamines | 16 | 35.4 (22/09 GSC) | 566 words only — thin |
| complement alimentaire tunisie | / or /proteines | 61 | 8.2 (22/09 GSC) | check |

**Note 22/09/2026 (run 2), no position observed — a template change, recorded so the next
re-check knows what moved.** Every row above whose `page` is a category page gained editorial text
*for human visitors* on 22/09: the page intro used to be clamped to 520 characters for people and
printed whole for Googlebot, so /creatine 369, /whey-proteine 635, /mass-gainers 967,
/pre-workout 690 and /proteines 187 words were bot-only (measured, both UAs). Googlebot's view is
**unchanged** — nothing was added to or removed from what Google reads — so no ranking move should
be attributed to it; what changed is that the page stopped being a parity risk and shoppers can now
read the price, format and delivery paragraphs. Re-check these rows from 06/10 as usual, and do not
credit or blame this change for a delta.

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
| psychotic pre workout | /pre-workout/psychotic-pre-workout | ? | check |
| lipo 6 black | /bruleurs-de-graisse/lipo-6-black-ultra-concentrate-60caps | ? | 3 Lipo-6 SKUs — pick the canonical winner |
| born rage | /pre-workout/… (find slug) | 5.3 (15/09) | the page-1 "pre workout" result |


**Note 23/09/2026 — `/barres-proteinees` is `noindex` and it is a stock problem, not an SEO one.**
The row "protein bar chocolate" above points at a category page this routine finished on 22/09,
but the owner's dead-listing gate (`9c9dc83`) noindexes any listing with nothing buyable on page 1
and the bars rayon is **0 of 88 in stock** (measured live 23/09). The same applies to
`/intra-workout` (0 of 12+). Neither page can rank until stock arrives, and both reverse
themselves automatically the day it does — so do **not** rewrite either page for ranking reasons,
and do not read a position drop on these rows as a content failure.

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
| glutamine tunisie | /glutamine | 10 | 20.4 (22/09 GSC) |
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
