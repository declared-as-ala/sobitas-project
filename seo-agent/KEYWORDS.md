# Protein.tn — keyword map (the routine's target list)

Goal: **top 5 in Tunisia** for every row. The routine re-checks 5 rows per run (rotate: oldest
`checked` first), records what it saw, and works on the row with the best (impressions × distance
to #3) that has an actionable page. Positions come from GSC (`tools/gsc.mjs --query=`) when the
credential exists, else from a live SERP look (WebSearch / WebFetch of a Google results page for
`<query>` with `gl=tn&hl=fr`). Never write a position you did not observe.

Competitors seen in Tunisian SERPs: **housenutrition.tn** and **nutribeast.tn** (the two to
beat — plain commercial category pages, tidy titles "Product – Brand | Shop", price + stock +
review stars in SERP), protein-shop-tunisia.tn, wildkard.tn, tunisianutrition.tn,
nutrition-plus.tn, parashop.tn / pharmacies (fat burners, omega-3), jumia.com.tn, ubuy.tn. Their weak points: thin category
copy, no FAQ, no comparison content, few blog links. Our edge: 224 blog articles, category guides,
FAQ schema, real stock and price on every page.

Legend — page: the URL that SHOULD rank · pos: last observed (date) · note: what to do.

## Head terms (category pages)

| query | page | impr/28d | pos (date) | note |
| --- | --- | --- | --- | --- |
| proteine tunisie | /proteines | 153 | 23.9 (13/09) | homepage + blog outrank the catalogue page; strengthen /proteines intro + internal links from blog posts |
| protein tunisie | / | 420 | ~5 (13/09) | brand-ish query, homepage holds it; keep |
| whey protein tunisie | /whey-proteine | 92 | 18.5 (13/09) | every in-stock whey was noindex until 21/09 — re-check after 2 weeks |
| whey protein 1kg prix tunisie | /whey-proteine | 33 | 9.8 (21/09) | 0 clicks: title/description work (price angle) |
| whey gold standard prix tunisie | /whey-proteine/100-whey-gold-standard-2-27kg | 22 | 6.2 (21/09) | 0 clicks; find which URL ranks (exact-page filter) |
| creatine tunisie | /creatine | 50 | 16.0 (13/09) | blog cannibalises; /creatine has the guide — needs product links + FAQ tuning |
| creatine monohydrate | /creatine | 70 | 21.9 (13/09) | global phrase; local intent weak — secondary |
| prix creatine tunisie | /creatine | ? | ? | check |
| mass gainer tunisie | /mass-gainers | ? | ? | check |
| serious mass tunisie | /mass-gainers/serious-mass-5-45-kg-optimum-nutrition | 92 | 14.2 (13/09) | split across 8 URLs; canonical target = PDP; tighten blog links |
| prise de masse tunisie | /prise-de-masse | ? | ? | check |
| pre workout tunisie | /pre-workout | 155 | 6.8 (13/09) | ranks on the Born Rage PDP, not the category — decide which should win |
| bruleur de graisse tunisie | /bruleurs-de-graisse | ? | ? | check |
| bcaa tunisie | /bcaa | ? | ? | check |
| omega 3 tunisie | /omega-3 | 46 | 10.5 (21/09) | dead SKU held the query; retire + retarget shipped on the 21/09 branch (unmerged) |
| protein bar chocolate | /barres-proteinees | 52 | 9.8 (20/09) | 0 clicks; the curated JSON (16/09 branch) is NOT on main — land it |
| collagene tunisie | /collagene ? | ? | ? | check the category exists + copy |
| vitamines tunisie | /vitamines | ? | ? | 566 words only — thin |
| complement alimentaire tunisie | / or /proteines | ? | ? | check |

## Product-name SERPs (in-stock best sellers; House Nutrition style "Product – Brand" + price)

| query | page | pos (date) | note |
| --- | --- | --- | --- |
| creatine ostrovit | /creatine/creatine-monohydrate-300g-ostrovit | site: indexed (21/09) | House Nutrition #1 with 5.0(24); add FAQ (none), check stock (BackOrder in schema) |
| creatine biotech | /creatine/100-creatine-monohydrate-300g-biotech-usa | ? | title humanized 21/09 |
| iso 100 dymatize | /whey-isolate/iso-100-dymatize-2-3kg | blog 3rd (19/09) | House Nutrition #1; PDP no FAQ, BackOrder |
| gold standard whey | /whey-proteine/100-whey-gold-standard-2-27kg | ? | check |
| serious mass | /mass-gainers/serious-mass-5-45-kg-optimum-nutrition | ? | see head terms |
| levro legendary mass | /mass-gainers/levro-legendary-mass-6-8kg-kevin-levrone | ? | check |
| nitro tech whey gold | /whey-proteine/nitro-tech-whey-gold-2-3kg | ? | no FAQ, BackOrder |
| big whey big ramy | /whey-proteine/big-whey-2kg-big-ramy-labs | ? | check |
| c4 pre workout | /pre-workout/c4-original-pre-workout-cellucor | ? | no FAQ; title 64 chars |
| psychotic pre workout | /pre-workout/psychotic-pre-workout | ? | check |
| lipo 6 black | /bruleurs-de-graisse/lipo-6-black-ultra-concentrate-60caps | ? | 3 Lipo-6 SKUs — pick the canonical winner |
| born rage | /pre-workout/… (find slug) | 5.3 (15/09) | the page-1 "pre workout" result |

## Rules for this file
- Add a row when GSC shows a query ≥ 20 impressions/28d that maps to a page we own.
- Update `pos (date)` only from an observation (GSC or a real SERP fetch).
- When a row reaches ≤ 5 for 14 days, move it to the "Held" section below and stop working it.

## Held (top 5, monitor only)
_(none yet)_
