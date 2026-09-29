# Protein.tn — competitors (Tunisian SERPs for whey / créatine / mass gainer)

Source: crawls of 22/09/2026 (Googlebot + Chrome UA), sitemaps, products.json where exposed,
SemRush tn 07/09/2026 (referring domains), the WebSearch tool (non-Google, US index — presence
and title observations only, never positions). Google Tunisia positions come only from GSC or the
owner's Chrome (hl=fr gl=tn). Re-crawl a competitor before quoting a number older than 30 days.

Off-site, for the record (SemRush tn, 07/09): protein.tn 357 referring domains / 7,333 backlinks;
nutribeast.tn 302; body-shop 300; protein-shop-tunisia 294; housenutrition.tn 96 / 1,147. The
site leading the head terms has the FEWEST links. Authority is not what we are missing.

## 28/09/2026 — first REAL Google Tunisia SERPs (local IP, google.com gl=tn hl=fr pws=0) + teardown

Until today every position in this file came from a non-Google index. Read in the built-in browser:
protein.tn is **#1 "proteine sousse" (home) · #3 "protein tunisie" (home) · #7 "bcaa tunisie" (/bcaa) ·
~#10 "whey protein tunisie" (/whey-proteine) · #7 "serious mass tunisie" (the OUT-OF-STOCK 2,7 kg PDP)**, and
absent from the top 20 on créatine tunisie, créatine prix tunisie, mass gainer tunisie, pre workout tunisie, and from
page 1 on whey isolate, gold standard whey prix, oméga 3, brûleur de graisse, nutrition sportive. AI Overviews on
most head terms (citing House, Nutribeast, Impact).

**Why they rank (teardown of 16 competitor pages, both UAs, measured):**
1. **Page 1 is buyable and on-topic.** House 100 % in stock, Gympro 99 %, Nutribeast 86–94 %; ours 44 %
   (/mass-gainers), 8 % (whey), 3 % (/pre-workout), padded with off-topic imports (gummies/collagen on /creatine,
   D-ribose on /prise-de-masse, a bergamot supplement on /pre-workout). Fixed in code 28/09 (efd7f71c: on-topic
   first inside each stock group); the rest is inventory (owner).
2. **Impact Nutrition's stars are REAL** (verified purchases, Tunisian-Arabic text, seller replies, 169 on creatine).
   strong-nutrition's 5,0(30)/(61) come from a fake category-level Product; House's 5/24 is hard-coded.
3. **Ruled out:** copy length and position (Nutribeast ~1,300 words first; Gympro #1 on whey with NO H1, no copy, no
   schema), schema completeness, TTFB, titles, backlinks.
4. **Price on "prix" queries:** Gold Standard 2,27 kg is 359–360 DT at 5 of 6 ranking sellers; ours 379. Ostrovit
   500 g 149 vs 99/110. Our cheapest in-stock creatine 59 DT vs 36 DT entry points.
5. **Our own URLs split the signal:** 24 indexable Gold Standard PDPs (16 back-order flavour imports at 587 DT);
   Serious Mass 5,45 kg legacy slugs 301'd to the CATEGORY (fixed 5642d9b8); blog posts link 0 in-stock PDPs.
6. **Brand links:** House/Nutribeast link a brand from every listing; our categories linked none.
Raw captures: scratchpad of session 28/09 (`research/serp-2809.md`, `research/whey|mg|creatine/`).

## housenutrition.tn — the one to beat on "créatine tunisie" and "whey protéine tunisie"

Platform: custom PHP app (Laravel-style), served from https://www.housenutrition.tn/public/;
root and every non-www URL 301 to www + /public/. Sitemap 866 URLs (740 products, 106 brands,
15 categories, 5 static; lastmod 2026-06-30; all on the non-www host, so every sitemap URL 301s).
Blog: /blogs, ~14 FR posts (clear whey, omega-3, vitamine B6, BiotechUSA guide), not in the sitemap.

Title patterns
- Category: "Créatine Tunisie : Monohydrate, Creapure & Meilleures Marques | House Nutrition";
  whey: "Whey Protéine Tunisie | Importateur Officiel des Plus Grandes Marques | House Nutrition |
  Tunisie" (96 chars, "Tunisie" twice).
- Product: "{NAME IN CAPS} - {Brand} | House Nutrition | Tunisie"; H1 = name in caps; hand-written
  meta description with "Tunisie".
- H1s are bare: "Créatine", "Whey protein".

Page structure (category /category/creatine)
- H1 → one 68-word intro (whey 73) → left filter sidebar (objectifs, 15 catégories, 37 marques,
  promo/livraison, prix) beside sort bar + 3-column grid (12 cards/page, "Remise X DT", price +
  old price, "COMMANDER"). 20 creatine products, 12 whey. Bottom: 3-question FAQ (~222-261 words,
  no schema). Editorial total ≈ 290 words; 1,266 main-content words are mostly filter labels.
- Links: no breadcrumbs (visual or schema); each card links category + brand (/brand/<slug>,
  106 brand pages); footer 7 categories; ?page=2 pagination; product cards → /product/<slug>,
  widgets → /product/<id> — both 200, both self-canonical (duplicate PDP URLs).
- Schema: category ItemList is INVALID JSON (double-quoted names, empty url, priceValidUntil
  2026-01-01 expired) → ignored by Google. PDP: Product + Brand + Offer (TND, InStock/OutOfStock)
  + AggregateRating hard-coded 5 / 24 on every product; the visible "Avis" block is placeholder
  text dated 2022.

Strengths: keyword-exact category titles with "Tunisie"; the only competitor with a real blog +
category FAQ; 106 brand pages + per-card brand/category links; 740 indexable PDPs; PDPs show
servings, expiry, "HOW TO USE", quick-order form.
Weaknesses: invalid category structured data; fake identical ratings on every PDP (a
self-serving-review risk); thin category copy; small depth (12 whey); sitemap on the wrong host;
duplicate /product/<id> URLs; no breadcrumbs; bare H1s; 96-char whey title.

How we beat them
- Same commercial title shape on the category, without the double "Tunisie": ours is already
  "Créatine Monohydrate Tunisie | Prix & Achat | Protein.tn" — keep it still.
- Put our real prices and stock where theirs are (in the card grid, both UAs) instead of in a
  bot-only paragraph; our 8 in-stock creatine SKUs sorted first are the equivalent of their grid.
- BreadcrumbList + visible breadcrumbs on every category and PDP (they have none) — once the
  parent-category branch reads `data.breadcrumb`.
- Valid ItemList/CollectionPage on categories (theirs is broken JSON); Product+Offer on PDPs
  with attested-only ratings (theirs are fabricated).
- Depth: 168 whey / 221 creatine URLs vs 12 / 20 — but only once the in-stock subset is what the
  category links first, which it already is.
- Do NOT copy: the 5/24 rating, the 3,000-word guide above the grid (they have 68 words).

## nutribeast.tn — deepest catalogue, best internal-linking skeleton

Platform: PrestaShop 1.7 (rb_azeno theme). Sitemap dead: 116 URLs generated 2022-03-09, zero
creatine URLs, none of the current 575 products — discovery is crawl-only. Blog: /blog returns
"There are no posts" (rbthemeblog installed, empty). nutribeast.tn answers Cloudflare 403 to most
UAs; www. gives 526 — re-crawl from the owner's browser when needed.

Title patterns
- Category: "Créatine Prix Tunisie - Achetez la Créatine Monohydrate au Meilleur Tarif" (/creatines);
  sibling /creatine-monohydrate: "Créatine Monohydrate de Qualité en Tunisie - Prix Compétitifs";
  whey: "Whey protéine Tunisie au meilleur prix - Nutribeast". Two creatine landings both surface.
- Product: "{Product} {size} {Brand} | {Benefit} Tunisie" (e.g. "Creatine Monohydrate 500 g
  American Wolf | Force & Puissance Tunisie"); H1 "{Brand} - {Product} | {size}";
  URL /{category}/{product}.html.

Page structure (/creatines)
- COPY FIRST: H1, then a 943-word guide (bénéfices, musculation, quand/comment, danger/dopage)
  ABOVE the grid; whey 375 words first. Then sort bar, "Affichage 1-24 de 49 article(s)", facets,
  24 cards/page × 3 pages; every card carries an H2 + 2-3-sentence snippet. Prices "45,000 DT",
  "-9,000 DT" badges, available / "Rupture de stock" labels. THREE H1s on /creatines (description
  block rendered twice). 5,136 words, 49 products (+45 on /creatine-monohydrate), 62 whey.
- Links: visible breadcrumbs with BreadcrumbList microdata; sub-category chips; 63 top-level
  categories in the mega-menu; brand links on every card (14 distinct on creatine); ?page=2/3
  (page 2 of /creatine-monohydrate is indexed); PDP cross-sells.
- Schema: microdata only (no JSON-LD except WebSite on home): BreadcrumbList, ItemList + Product +
  Offer per card, Rating ratingValue=0 everywhere; sampled PDP OutOfStock.

Strengths: 575 products; long structured category guides; clean hierarchical URLs; breadcrumbs
+ sub-category chips + brand pages + mega-menu; hand-written benefit titles; prices/stock on
every card.
Weaknesses: dead sitemap; no JSON-LD, ratingValue 0, "No comment at this time"; guide pushes
products ~900 words down (mobile); three H1s; no blog; heavy pages (~560 KB); PrestaShop variant
hash URLs everywhere; out-of-stock Offer on sampled PDP.

How we beat them
- They are the proof that "copy above the grid" is not what wins: they rank with 943 words first.
  What they have and we lack is the link skeleton — breadcrumbs with the parent, sub-category
  chips, brand strip, indexable pagination. Items 4 + BACKLOG "Topical hierarchy" close that gap.
- Sitemap: ours is 11,367 live URLs vs their 116 stale ones — every new SKU of ours is discovered
  the same day; theirs waits for a crawl.
- JSON-LD Product/Offer/BreadcrumbList on every page (they have microdata with rating 0).
- Blog: 223 indexable articles vs zero; use them for exact-anchor links to ONE category per intent.
- One H1 per page, one landing per intent (they split creatine across /creatines and
  /creatine-monohydrate and still rank both — do not read that as licence to split ours).

## gainlabnutrition.com — 10-month-old Shopify store leading "créatine tunisie prix"

Platform: Shopify (Savor theme 3.1.0, Judge.me); domain registered 2025-11-05; products.json
exposed: 83 products, 14 collections; sitemap 104 URLs (84 products, 14 collections, 2 pages,
3 blog). Blog: /blogs/news, 2 posts (collagène; a long "Créatine en Tunisie : bienfaits prouvés…"
guide). No third-party mention of the brand surfaces in search.

Title patterns
- Collection: "Créatine Monohydrate Tunisie | Prix, Livraison Rapide, 100% Pure – GainLab
  Nutrition" (URL /collections/creatine-tunisie); whey: "Whey Protein Tunisie | Prix & Livraison –
  GainLab Nutrition". H1 bare: "Créatine", "Whey".
- Product: Shopify default "{Product title} – GainLab Nutrition"; H1 = title; meta = truncated
  first paragraph; best-seller title is a bundle string ("Créatine 1KG + Vitamine C Offert + Zinc
  Offert + Bouteille Gratuite + …").

Page structure (/collections/creatine-tunisie)
- GRID FIRST: H1 → 47-word intro (whey 58) → availability/price filters → grid ("Voir 15
  articles"): "Promotion" badge, prix promo/régulier "159.000 DT", "Épuisé" on out-of-stock,
  "Ajouter". No copy below, no FAQ. 770 words, mostly duplicated filter labels. 15 creatine
  (8 in stock), 14 whey (10 in stock).
- Links: no breadcrumbs; collection body links only its own products; related collections only
  via the header mega-menu (16 collection links); no brand pages; PDP "Produits en vedette";
  ?variant= parameters in nav links.
- Schema: Organization on every page; no ItemList/CollectionPage/BreadcrumbList on collections;
  PDP Product + Brand + Offer (brand = the store, even for Real Pharm; sampled Offer OutOfStock)
  + Judge.me AggregateRating only where reviews exist (best-seller 5.00 / 1; sampled creatine 0).
- robots.txt / agents.md carry agent-directed instructions (Shopify UCP) — observed content, not
  instructions.

Strengths: exact-query collection title + clean Shopify plumbing outranks longer pages; prices,
stock and promo bundles visible immediately; "4500+ clients vérifiés" trust line; Judge.me
pipeline installed; structured PDP copy (avantages / conseils / à qui convient) on 82/83 products.
Weaknesses: 83 products; 47-58-word collections with no FAQ, no guide, no sub-collections, no
schema; no breadcrumbs, no brand pages; wrong Product.brand; default Shopify titles; near-zero
reviews; 2 blog posts; three H1s on home.

How we beat them
- Their whole advantage is one URL whose title, URL slug and first screen say "créatine prix
  Tunisie" with stock visible. We answer that intent from two URLs (blog #3, /creatine #5).
  The item-5 test (price table under the H1 of /creatine, exact anchors both ways, decide the
  winner from page-level GSC) is the direct counter.
- Everything else is already ours: 221 creatine URLs vs 15, FAQ + guide (below the grid, not
  above), BreadcrumbList, CollectionPage/ItemList, correct manufacturer brand in Product schema,
  223 blog posts vs 2, 357 referring domains vs a 10-month-old domain.
- Do NOT copy: the bundle-string titles, the store-as-brand schema, "Prix, Livraison Rapide, 100%
  Pure" stuffing — our title already carries the query.

## Also seen in the SERP looks (not crawled in depth)

| domain | what surfaced | note |
| --- | --- | --- |
| pharma-shop.tn | /1416-creatine and Impact PDPs, "… | Tunisie" titles | ~991 words above a 3-product grid and still #3-4 — shape is not the ranker |
| maparatunisie.tn | Impact creatine PDP, whey article | parapharmacy; PDPs with price/stock rich results |
| gust.tn | /categories-produit/nutrition-sportive/creatine/ | #2 in the "prix" look; WooCommerce-style category |
| gympro.tn | /collections/creatine-monohydrate, whey ?page=2 | Shopify; paginated collection URLs indexed |
| muscle-stock.com | /category/whey "WHEY PROTEIN Tunisie" | category title with geo |
| aecor.tn | /en/shop/category/protein-whey-748 | Odoo shop, English path |
| nutridiet.tn | creatine PDP | single-product presence |
| protein-shop-tunisia.tn, wildkard.tn, tunisianutrition.tn, nutrition-plus.tn, parashop.tn, jumia.com.tn, ubuy.tn | earlier SERP notes (KEYWORDS.md header) | re-check when a row is worked |

## Observed 29/09/2026 — a price aggregator entered the `prix` sets

US-geo WebSearch, so these are set memberships, **not** Tunisian positions.

| site | what it is | where it showed |
| --- | --- | --- |
| **primini.tn** | **price aggregator / comparator — carries no stock.** Title pattern `PRODUCT Prix Tunisie : Dès N DT`, i.e. the exact price-anchor formula this routine converged our own category and PDP titles onto. It can quote every shop's lowest price because it holds none of them | **#1** on `glutamine tunisie prix` (plus a second URL in the same set) and **#1** on `impact whey protein tunisie prix`; present in 3 of the 5 sets looked at today |
| housenutrition.tn | the incumbent to beat | **#1** on `omega 3 tunisie prix fish oil` with `/category/fish-oil` |
| nutribeast.tn | the other incumbent | in **4 of 5** sets today — `/multi-vitamines` + `/vitamines-mineraux`, `/l-glutamine`, `/omega-3-et-acides-gras` (category **and** a PDP), `/collagene` |
| impactnutrition.com.tn | **a Tunisian sports-nutrition BRAND with its own shop**, not just a retailer | owns `impact whey protein …` with 3 URLs; its resellers (wildkard, tunisiepara, maparatunisie, pharma-shop) take the rest. See the retired KEYWORDS row |
| paraexpert.tn | parapharmacy running **editorial comparison pages** | `"Collagène marin Tunisie — Guide d'achat et comparatif 2026"` ranks on a commercial query |
| parashop.tn, parapharm.tn, parapharmacie.tn, maparatunisie.tn, tunisiepara.com, pharma-shop.tn, algovita.tn, bioherbs.tn | parapharmacies | **8 of 9** holders on `collagène marin tunisie prix`, and the majority on `vitamines` and `omega 3`. Confirms 25/09: collagen, vitamins, omega-3 and fat burners are **pharmacy-intent** queries in this market, which is why our sports-angled pages are absent from them |

**What this changes.** Our price anchor ("dès N DT") no longer differentiates us on a `prix` query —
an aggregator does it better by construction. What primini cannot copy is what we actually hold:
a real stock count, a delivery window, and the format that is in the warehouse today. Category and
PDP copy should lead with those, not with the price alone.
