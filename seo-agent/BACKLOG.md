# Protein.tn — SEO backlog (prioritized)

The cloud routine reads this every morning, picks the highest-value item it can finish today,
lands it, then updates this file. `PLAYBOOK.md` says how; `KEYWORDS.md` says what to rank for.

Legend: `[ ]` open · `[~]` in progress · `[x]` done (one line of what shipped) · `(needs: owner)`
= cannot be done from the repo (DB row, Google account, credentials) — say it in the run summary.

**State on 07/10/2026:** live audit `--sample=40` 95 URLs **exit 1 — one P0, and it was the
CHECKER, not the site**: the Gold Standard flavour tripwire that 05/10 deliberately added to
`watchlist.txt` fired on its first audit, because `audit-live.mjs` demanded a SELF canonical from
every page and the 28/09 variant consolidation points 18 flavour PDPs at the one page per format the
shop actually sells. Verified live before touching anything: **18/18 variants carry the mapped
canonical, 18/18 are absent from `products-*.xml`, both targets answer 200 index,follow
self-canonical and appear once each** — the consolidation is healthy. Fixed in the checker (frozen
copy of the 18 mappings, asserts the DECLARED target), audit now **exit 0**. `parity-check.mjs`
**0 editorial bot-only words** on all five money pages. Robots unchanged. Sitemaps **12,147**,
Δ **−2** vs 05/10, both explained: `blog` 137 → **136** is 05/10's own landed fix (verified on
production this morning — the redirecting slug is gone), and `pages` 5 → **4** is the owner's
`a2978ad` retiring `/proteine-tunisie` (verified live: 308 → `/proteines`). **05/10's owed
verification PASSED.** Wednesday's planned theme — guide blocks for the buyable whey SKUs —
**withdrawn on measurement**: not one of the 12 real buyable whey PDPs is thin (**313–1,511
description words**; the only two the 28/09 run gave guide blocks to were the only two that were
thin, at ~195), and **all 49 of today's `no FAQPage` P1s are `BackOrder`, zero in-stock**. Five SERP
rows re-checked (extended). Google: **September 2026 spam update still rolling — attribution mode
(day 14).**

**State on 05/10/2026:** live audit `--sample=40` 91 URLs **exit 0, 0 P0**; `/sante-vitalite` served
its transient 5xx on the first of two fetches again and the 02/10 checker fix recorded it **P2**, as
designed. `parity-check.mjs` **0 editorial bot-only words** on all five money pages. Robots
unchanged. Sitemaps **12,149**, Δ **−85** vs 02/10 — **all of it blog (223 → 137, −38.6 %)** and the
cause is landed and verified: the owner's `42e7a3e` refreshed 136 posts and folded 86 duplicates.
**02/10's owed verification passed on production: 0 duplicate injected links across all 137 live
articles** (was 30 in 25 articles), 465 injected links, 0 fetch errors, 0 self-duplicates — the
curated-block fix is 100 % effective. Monday's `suggest.mjs --deep` (516 requests, 3,639
suggestions) returned its clearest shape yet: **19 of the 40 new commercial candidates are
`whey gold standard <format> prix <country>`**, and the whole Gold Standard line has **exactly one
buyable SKU of 21**. Ten SERP rows re-checked (extended mode). Shipped: the blog sitemap stops
listing a URL the repo itself redirects. Google: **September 2026 spam update still rolling —
attribution mode (day 12).**

**State on 02/10/2026:** live audit `--sample=40` 82 URLs exit 1 on the **same transient as 30/09**
(`/sante-vitalite` HTTP 500 on the first of its two watchlist rows, a clean 200 on the second, 12/12
clean on immediate re-fetch and clean at bursts of 1/4/8) — so the **checker** was fixed, not the
route: `audit-live.mjs` now gives a 429/5xx **one confirming re-fetch** (4xx still P0 on the first
look, a re-confirmed 5xx still P0 and still exit 1, proved against a local fake origin), and the
Friday `--sample=120` sweep then came back **exit 0** with the page recorded P2. `parity-check.mjs`
**0** editorial bot-only words on all five money pages. `title-case-check.mjs --listings=60` **exit 0,
contract holds on all six rules**. Sitemaps **12,234**, Δ **−1** vs 29/09, every product and listing
file Δ 0; `pages` 6 → 5 is the owner's `4a046d4` retiring `/creatine-monohydrate-tunisie` (verified
live: 308 → `/creatine`; `/marques` 308 → `/brands`). **There was no 01/10 run** — no branch, no log,
no revert; nothing half-landed. Today's theme finished 30/09's: the 30/09 body-seeding fix **holds
perfectly (7 → 0 CMS-body duplicates)**, and the residue it exposed is a different defect — the
injector was duplicating the page's own **curated** link blocks, 30 links in 25 articles, **22 of
them on `/whey-proteine` and `/proteines`**, 14 of the articles at the link cap. Fixed by subtracting
all three curated sources (bridge + "Lire aussi" chips + "Voir aussi sur la boutique" nav) from the
target list. **A dead SKU answers the money query — four for four** now: Gold Standard **908 g,
155 DT `BackOrder`** holds the slot while our **2,27 kg, 379 DT `InStock`** is absent, and two
competitors price that same 2,27 kg at **299 DT**. Operating lesson: **`WebSearch` in `standard` mode
returns no Tunisian set for this market — SERP looks must use `extended`.** Google: **September 2026
spam update still rolling — attribution mode (day 9).**

**State on 29/09/2026:** live audit `--sample=40` 80 URLs **0 P0** (exit 0); the 28/09
streaming-metadata P0 is **confirmed fixed on production** — `<title>` now sits at byte ~4,580
inside `</head>` (~15,000) on `/proteines`, `/prise-de-masse`, `/blog` and `/sante-vitalite`, was
268,738 of 272,966 on `/proteines` yesterday, and the `transient` P2 is gone. `parity-check.mjs`
0 editorial bot-only words. Sitemaps 12,235, Δ −11 (−0.09 %); `pages` 5 → 6 is the new CMS page
`/proteine-tunisie`, and **both CMS pages have been re-angled off the head terms** by the owner
("Comment choisir sa protéine ? Guide Tunisie"), which closes the doorway half of the footer item
below. Today's theme was the **product-title contract**: `humanProductTitle` applied its own ≤ 65
budget to only ONE of its three tails, so **3,240 of 11,353 catalogue titles (28.5 %) shipped past
65 characters, worst 169** — now 103 (0.9 %), all of them CMS-written, none from the builder. And
`title-case-check.mjs` had gone **blind** (exit 2, "could not measure") since the builder gained an
`@/util` import on 28/09; the alias is resolved again and a new **rule (f)** locks the length
contract (proved able to fail: 283 FAILs against the old builder). Category pages were measured
before being skipped: all 13 sit at **6 words above the grid** against a ≤ 100 budget, so the only
category gap left is the comparison table on 8 of 13 — parked behind stock (2 of 108 BCAA, 2 of 56
glutamine, 3 of 329 omega-3, 10 of 1,870 vitamins buyable). New competitor on `prix` queries:
**primini.tn**, a price aggregator, #1 on two of five sets checked. Google: **September 2026 spam
update still rolling — attribution mode.**

**State on 28/09/2026:** live audit `--sample=40` 75 URLs **0 P0** (exit 0);
`parity-check.mjs` 0 editorial bot-only words on all five money pages; sitemaps 12,246, Δ +11
(+0.09 %, all in products-2 — new SKUs). `/sante-vitalite` served the headless-render shape for
the **second consecutive run**, which promoted it to a P0 — and the cause turned out to be global:
**Next.js 15 streams metadata to Googlebot** (it is not on Next's `html-bots` blocking list), so on
`/proteines`, `/prise-de-masse`, `/blog` and `/sante-vitalite` the `<title>`, canonical,
description and robots tags are emitted at the END of the body — byte 268,738 of 272,966 on
`/proteines` — while Bingbot gets them in `<head>` on every fetch of the same URL. Fixed globally
with `htmlLimitedBots` in `frontend/next.config.js` (see the P0 item below);
**verify live tomorrow.** Monday's keyword run: the Tunisian long tail is format+prix and most of
those formats have **no buyable SKU** — that is now the binding constraint, see `KEYWORDS.md`
"Discovered 28/09/2026". Two runs (26/09, 27/09) produced no branch at all, and the landing pad has
five stale refs jamming every scheduled land run `(needs: owner)`. Google: **September 2026 spam
update still rolling — attribution mode.**

**State on 25/09/2026:** live audit `--sample=40` 72 URLs **0 P0** (exit 0), `--sample=120`
152 URLs exit 1 on a **transient**: `/sante-vitalite` served one render with no title, canonical,
description or robots while its body rendered 1,012 words — `ok` 45 min earlier and 14/14 clean on
immediate re-fetch. `audit-live.mjs` now re-fetches once before calling that shape a P0 and records
a clean retry as P2. `parity-check.mjs` 0 editorial bot-only words. Sitemaps Δ 0 on every file
(12,235). **Yesterday's frontend deploy verified live** — both predicted titles are exactly right.
Built the Friday tool **`title-case-check.mjs`** (the 24/09 casing contract as an executable check
against the real builder over the real catalogue); its first full-catalogue run over **all 11,367
names** found a live defect — a standalone `µg` became Greek `Μg` — fixed in
`productMetaDescription.ts`, 2 renderings change out of 11,367 and nothing else moves
(`log/2026-09-25.md`). Google: **September 2026 spam update rolling since 24/09 — attribution
mode.**

**State on 24/09/2026:** live audit 68 URLs, **0 P0** (exit 0); `/intra-workout` still the
owner's dead-listing gate at P2, and **`/barres-proteinees` is `index, follow` again** — stock
returned and the gate reversed itself with no deploy, exactly as designed. Yesterday's
`seo-copy-apply` **did apply**: all four watchlist PDPs now serve FAQPage and audit them `ok`.
`parity-check.mjs` 0 editorial bot-only words on all five money pages. Signals came from the
owner's real GSC export (`protein.tn/2026-09-22-28d/`, 28 d to 22/09) for the first time in four
runs — `KEYWORDS.md` now carries 43 observed rows instead of 13/09 guesses. Shipped a
builder-level CTR fix to `productMetaDescription.ts`: the name humanizer was re-casing **every**
catalogue name when only 3.3 % are the SHOUTING wholesaler names it was written for
(`log/2026-09-24.md`).

**State on 23/09/2026:** live audit 68 URLs, **0 real P0**. The two `noindex` listings the audit
printed (`/barres-proteinees`, `/intra-workout`) are the owner's dead-listing gate (`9c9dc83`)
firing as specified — censused all 13 watchlist categories, every money category is `index,
follow`; `audit-live.mjs` now classifies that case P2 so it cannot mask a real regression.
`parity-check.mjs` had a first-run false positive (719 bot-only words, **all** product-card text)
and now budgets editorial text only: **0 editorial bot-only across the five money pages**.
Shipped FAQ + guide for the four watchlist PDPs that had none (`log/2026-09-23.md`).

**State on 22/09/2026 (two runs):** run 1 shipped the URL-case contract, the bars category page
and the omega-3 retarget (`log/2026-09-22.md`) — all three re-verified live on run 2: the
`/Intra-Workout` loop is dead (301 once, self-canonical, 0 uppercase URLs left in the sitemaps).
Run 2 shipped bot/human parity on the category template plus `parity-check.mjs`
(`log/2026-09-22-b.md`); live audit 68 URLs, **0 P0**.

**State on 21/09/2026 (owner session, all live):** every published product is `index, follow`
(11,368/11,368, 0 noindex — owner decision, thin pages included); sitemap 11,367 product URLs;
all 51 category JSONs render their titles; every product `<title>`/description humanized by
`productMetaDescription.ts`; 33,408 backlog reviews published (stars stay attested-only, so GSC
"missing aggregateRating" is expected); daily index ratchet + weekly review drip scheduled on the
VPS. The old local agent's SQL scripts live on the owner's PC (`seo-agent/sql/`, gitignored) —
from the cloud, express DB changes as Filament actions / artisan commands / `resources/seo` JSON.

---

## Open from the 22/09/2026 full audit (SEO_AUDIT.md has the evidence for each)

These are the 59 findings the audit pass did not implement. The ones marked `(needs: owner)`
cannot be done from the repo. Everything else is yours: take them in priority order, verify the
finding still reproduces before acting (several cite line numbers that have since moved), and
record the page-level position first — never act on a query average.

### P0 (1)

- [ ] `(needs: owner)` **http://www.protein.tn/* is a 2-hop chain: Cloudflare 301 to https://www, then Next.js 308 to the apex** — `live https://www.protein.tn/creatine`. Any external link or old citation using http://www.protein.tn/… costs two redirects before Google reaches the canonical page. Chains are followed but slow consolidation and keep the www URLs in the 'Page with redirect' bucket; http→https and www→apex are the… **Fix:** Owner/edge only, no code change. In Cloudflare → Rules → Redirect Rules add one Single Redirect: expression `(http.host eq "www.protein.tn")`, type Dynamic, target `concat("https://protein.tn", http.request.uri.path)`, status 301, "Preserve query string" ON. Confirm the www DNS record is proxied (it is — Cloudflare already answers hop 1). Verify with a Googlebot UA: `curl -sI -A Googlebot…

### P1 (18)

- [ ] **103 product `<title>`s over 65 chars come from the CMS/DB, not the builder — several duplicate the product name inside their own title** — `filament/app/Services/Catalog/ImportedProductContent.php` (route measured 29/09: 97 of them on the `explicit` path). Worst live example 169 chars: "Sambucus Black Elderberry Immune Complex Plus Vitamin C & Zinc, Natural Mixed Berry, 60 Chewable Tablets – Sambucus Black Elderberry Immune Complex Plus Vitamin C & Zinc". The frontend deliberately does **not** override these (standing decision: a title a person wrote in the CMS wins), so the fix is backend. **Fix:** stop the importer emitting `seo_title` when it would just repeat `designation_fr`, and cap what it does emit at 65. Related to the existing P2 on `ImportedProductContent.php:1277-1282`.
- [ ] **Comparison table missing on 8 of 13 category pages** — `/pre-workout`, `/bruleurs-de-graisse`, `/bcaa`, `/vitamines`, `/omega-3`, `/glutamine`, `/collagene`, `/prise-de-masse` (measured live 29/09 as Googlebot; present on `/creatine`, `/whey-proteine`, `/proteines`, `/mass-gainers`, `/whey-isolate`). Every one of these pages otherwise meets the standard — 6 words above the grid, FAQPage, grid first. **Blocked on stock, not on work:** buyable SKUs are 7/214 pre-workout, 4/97 brûleurs, 2/108 BCAA, 10/1,870 vitamines, 3/329 omega-3, 2/56 glutamine, 2/254 collagène (API, 29/09). A 2-row "comparison" is worse than none. Do `/pre-workout` first when stock allows.
- [ ] **`exit 2` — "could not measure" — is invisible, and hid a dead gate for a day** — `seo-agent/tools/title-case-check.mjs` (and by design every ⚙ tool). It answered exit 2 from 28/09 (builder gained `@/util/company`) until fixed on 29/09, and because exit 2 is never a P0 nothing noticed. **Fix:** the Friday sweep should record each tool's exit code in the log and treat **two consecutive exit-2 runs of the same tool** as a finding. No code change needed — a PLAYBOOK line.

- [ ] `(needs: owner)` **Product-level canonical override is exposed in Filament and emitted by the API but silently ignored by all three product routes —…** — `frontend/src/app/(shop)/[slug]/[productSlug]/page.tsx:118-120 and :287-288`. 323 self-canonical twins split product-level ranking signals and crawl budget within the site's largest indexable surface (11,367 sitemap PDPs), and the owner-facing field that is supposed to fix it is a no-op — the same 'CMS silently discards SEO' trap… **Fix:** Add one helper in C:/mla/frontend/src/util/productUrl.ts (or canonical.ts): `export async function resolveProductCanonicalUrl(product: Product): Promise<string>` that (a) takes `product.seo?.canonical_url`, (b) only forwards it to `resolveCanonicalUrl(override, buildProductUrlPath(product))` when its path matches the product shape `^/[^/]+/[^/]+/?$` on protein.tn/sobitas.tn (otherwise pass…
- [ ] **Filament Redirections feed is capped at 500 rows — rules beyond that silently never fire** — `filament/app/Http/Controllers/Api/ApisController.php:2162-2175 (`->limit(500)`) and frontend/src/util/adminRedirects.ts:118-145 (single unpaginated…`. Once the owner passes 500 active rows (the Not-found export alone has 977 URLs and the recommended fixes above add more), the 501st+ rules are dropped with no error: a 410 or 301 the admin believes is live returns the old 404/soft behaviour, and which 500… **Fix:** Backend only, one line: in C:/mla/filament/app/Http/Controllers/Api/ApisController.php redirections(), replace `->limit(500)` with `->orderBy('id')` (drop the cap; 3 small columns per row, a few thousand rows is well under the frontend's 1.5s fetch timeout). If a cap must stay, use `->orderBy('id')->limit(5000)`. No change to adminRedirects.ts or middleware.ts — the single fetch already handles…
- [ ] **similar_products returns the same 6 lowest-id in-stock products for every PDP in a subcategory; the ~11k imported (qte=0) PDPs…** — `filament/app/Http/Controllers/Api/ApisController.php:2120-2131 (consumed by frontend/src/app/x-crawler/product/[...slug]/page.tsx:217 and…`. Internal-link graph for the imported catalogue is category-listing-only (paginated), so 10k+ PDPs are 1 inbound link deep and PageRank pools on ~300 legacy SKUs; the six-link rail is also identical on hundreds of pages (boilerplate module). **Fix:** Additive, no semantic change to the existing 6: (1) ApisController::similar_products(Request $request, int $sous_categorie_id): read optional `?around={product_id}` (int). Keep the current in-stock 6 + parent top-up exactly as is (it feeds the comparison table). When `around` is given, append a neighbour window: same `sous_categorie_id`, `publier=1`, not `force_out_of_stock`, no `qte` filter,…
- [ ] `(needs: owner)` **Two blog posts compete with the Serious Mass 5,45 kg PDP for the product-entity query 'serious mass tunisie' (GSC, window ends…** — `https://protein.tn/mass-gainers/serious-mass-5-45-kg-optimum-nutrition vs…`. Three URLs split one transactional entity query; the two articles outrank/out-impress the money page and none of the three breaks into the top 5. Consolidating onto the PDP (which carries price, stock, FAQ, 125 reviews) is the only way to lift CTR on ~940… **Fix:** Two steps, the first code-only and auto-safe, the second owner-only. (1) Add an entry to frontend/src/config/blogSeoConfig.ts for 'serious-mass-le-gainer-ultime-pour-une-prise-de-masse-rapide' with openingLinkHtml (the existing server-rendered 'commercial pillar paragraph' mechanism, same shape as the creatine/whey entries at lines ~31-47): '<p>Pour voir le prix actuel, le stock et les avis,…
- [ ] `(needs: owner)` **Verified: duplicate product URL pairs are live 200 + self-canonical with identical title/H1 and ~85% identical body (323 pairs…** — `https://protein.tn/mineraux/21st-century-calcium-500-d3-400-comprimes and https://protein.tn/mineraux/21st-century-calcium-500-d3-400-comprimes-52829`. Duplicate content at scale (323 × 2 URLs) with identical titles competes with itself and dilutes the imported catalogue's already thin link equity; Google will pick a canonical arbitrarily. **Fix:** Drop the frontend part of the recommended fix (auto `alternates.canonical` = stem for `-<5+digits>` slugs): (a) BACKLOG.md line 150-157 records that on /barres-proteinees the SUFFIXED member is the one the category grid links and sells, so stem-canonical would point the live SKU at the dead one; (b) real slugs ending in 5+ digits (e.g. dosage suffixes like -10000) would be mis-canonicalised to a…
- [ ] **No brand↔category links: 563 of 579 brand pages link to zero categories for bots, and no category page links to any brand in…** — `frontend/src/app/x-crawler/category/[slug]/page.tsx:380`. Brand pages are reached almost only from the 604-link /brands directory (GSC position 44.66, 553 impressions, 3 clicks — export window ends 2026-07-29) and a homepage strip; commercial category pages hand them nothing, and 563 brand pages hand categories… **Fix:** Smallest change inside the existing system, two additive edits: (A) Brand→category fallback: add `export function buildBrandRelatedCategories(products: Product[]): CrawlerListLink[]` in frontend/src/util/brandIntro.ts reusing the same loop as buildBrandIntroHtml lines 28-33 but keyed on `getProductPrimarySubCategory(p)?.slug` (dedupe, cap 8), mapping each to `{ name: categoryAnchor(slug,…
- [ ] **'Achetez les produits de cet article' product cards never exist for Googlebot: client-only fetch of…** — `frontend/src/app/(shop)/blog/BlogRecommendedProducts.tsx:67-97`. Googlebot's renderer cannot load a robots-disallowed XHR, so the PDP links this block is meant to provide (article → in-stock product) are absent from both the raw HTML and the rendered DOM on all 223 articles. The blog carries 41,580 of 128,398 impressions… **Fix:** Smallest change inside the existing system, four files, no new route and no robots change: 1) New C:/mla/frontend/src/util/blogRecommendedProducts.ts: move the body of route.ts GET (manual slugs via getProductDetails → category via getProductsByCategory → getBestSellers fallback, MIN 4 / MAX 8, each step try/catch) into `export async function pickBlogRecommendedProducts({ categorySlug,…
- [ ] `(needs: owner)` **Creatine cluster: 47 French + 5 Arabic articles, dozens of zero-click near-duplicates on 'bienfaits' and 'créatine tunisie guide…** — `live https://protein.tn/sitemaps/blog.xml (2026-09-22)`. Pages.csv (window ends 2026-07-29): the 50 creatine blog rows total 160 clicks / 14,840 impr; 27 of them have 0 clicks, most at positions 25-80 (e.g. les-bienfaits-de-la-creatine-pour-la-musculation-et-la-performance 0/81/79.2,… **Fix:** Owner action in Filament, no deploy, per intent group; rule: never 301 a URL with ≥1 click in any of the three Pages.csv windows. For each zero-click near-duplicate: (1) copy any unique paragraph into the survivor article (blur before save); (2) add a Redirections row /blog/<dup> → /blog/<survivor> 301 (middleware.ts:449 serves it within 5 min); (3) set the duplicate's `publier` off so…
- [ ] **Crawler views (category, brand, PDP, shop) render outside the (shop) layout: zero header/footer hub links for Googlebot** — `frontend/src/app/(shop)/layout.tsx:19-27`. 634 listing URLs + ~10.6k PDPs + 474 /shop pages (~95% of what Googlebot fetches) pass no link equity to /creatine, /whey-proteine, /proteines, /mass-gainers, /pre-workout beyond a single breadcrumb/related list. The money pages' site-wide inbound graph… **Fix:** Smallest change, four files, no middleware: (1) NEW C:/mla/frontend/src/config/footerLinks.ts (plain .ts, NO 'use client') exporting `FOOTER_NAVIGATION` and `FOOTER_CATEGORIES` — move the two `Array<[string,string]>` constants verbatim from FooterClient.tsx:80-97. (2) C:/mla/frontend/src/app/components/FooterClient.tsx: delete the local NAVIGATION/CATEGORIES consts and import them from…
- [ ] **Site-wide footer sends the exact-match anchor 'Créatine Monohydrate Tunisie' to a dead-end CMS page that competes with /creatine…** — `frontend/src/app/components/FooterClient.tsx:316-320`. The strongest commercial anchor for the 'creatine monohydrate tunisie' query is spent site-wide on a page that cannot convert and passes nothing back to /creatine (GSC, window ending 2026-07-29: /creatine-monohydrate-tunisie 53 impressions pos 16.2 vs… **Fix:** Two edits, both inside the existing system, no new files. (1) C:/mla/frontend/src/config/cmsPageSeoConfig.ts — add a second key to CMS_PAGE_SEO_CONFIG mirroring the existing one: 'creatine-monohydrate-tunisie': { titleOverride: 'Créatine monohydrate : le guide pour bien choisir | Protein.tn', headingOverride: 'Créatine monohydrate : le guide pour bien choisir', commercialIntro: 'Vous voulez…
- [ ] **Protein: three docs assign 'proteine tunisie' to three different URLs; /proteines is titled without 'Tunisie' while the homepage…** — `seo-agent/KEYWORDS.md:22 vs docs/ranking-plan-creatine-protein.md §2 vs frontend/content/categories/proteines.json:2-3`. GSC (window ends 2026-07-29): 'protein tunisie' 469/2382/8.14, 'proteine tunisie' 123/2241/12.54, 'protéine tunisie' 23/438/15.52, 'protein powder tunisie' 17/259/7.18, 'prix proteine tunisie' 3/43/12.49. Pages: / 2159/26157/8.54 (plus www.protein.tn/… **Fix:** One owner: '/' keeps 'protein tunisie' / 'proteine tunisie'; /proteines targets 'protéines en poudre (en) tunisie'. Smallest change: (1) C:/mla/seo-agent/KEYWORDS.md:22 — page column '/proteines' → '/' with note 'homepage owns it (22/09: 125/608/5.5); /proteines targets protéines en poudre tunisie'; add a one-line 'superseded 22/09' note under the §2 row at…
- [ ] **Optimum Nutrition: brand page receives no links from the homepage or any money category; four Gold Standard blog posts link…** — `live https://protein.tn/ (0 links to /optimum-nutrition), /whey-proteine, /creatine, /mass-gainers bot views`. GSC (window ends 2026-07-29): 'optimum nutrition tunisie' 2/43/13.93, 'optimum nutrition whey protein tunisie' 2/30/10, 'optimum nutrition serious mass tunisie' 2/39/9.18, 'gold standard whey tunisie' 3/86/7.21, 'whey gold standard prix tunisie' 2/154/8.44,… **Fix:** 1) Add an optional `brandSlugs: string[]` to the category JSON schema and set `["optimum-nutrition","biotech-usa","kevin-levrone"]` (only slugs present in brandSeoConfig.ts — add ostrovit/muscletech/dymatize later when they get curated entries) in content/categories/whey-protein.json, creatine.json, mass-gainer.json, pre-workout.json. In src/app/(shop)/category/[slug]/page.tsx resolve them to…
- [ ] **OstroVit: no cannibalization, but the brand page is orphaned from every money category and the homepage (only /brands and its own…** — `live https://protein.tn/ostrovit`. GSC (window ends 2026-07-29): 'ostrovit tunisie' 2/38/7.87, 'ostrovit creatine tunisie' 1/50/8.16, 'eaa ostrovit' 1/10/5.4; /ostrovit 3/60/9.93. seo-opportunity-map §P2: 'ostrovit' 320 vol — we are absent, nutribeast 4, housenutrition 8. Nothing competes… **Fix:** JSON-only, two files, no renderer change: (1) C:/mla/frontend/content/categories/creatine.json — in howToChooseBody, inside the existing '<h4>OstroVit Creatine Monohydrate — 500 g</h4>' paragraph, wrap the first brand mention as '<a href="/ostrovit">OstroVit en Tunisie</a>' (one anchor; keep the PDP link the product grid already provides). (2) C:/mla/frontend/content/categories/whey-protein.json…
- [ ] `(needs: owner)` **Pre-workout: category vs Born Rage PDP is the only split; /performance no longer targets it; no blog competition — no page-level…** — `frontend/content/categories/pre-workout.json:2-3`. GSC (window ends 2026-07-29): 'pre workout tunisie' 2/19/31.32, 'preworkout tunisie' 1/10/31, 'c4 pre workout prix tunisie' 1/38/7.32, 'c4 pre workout tunisie' 1/14/10.14; /pre-workout 8/505/10.83, /performance 0/31/9.32, PDP born-rage 7/91/7.53.… **Fix:** Two small edits, both inside the existing categoryAnchor pattern: (1) C:/mla/frontend/src/util/categoryAnchor.ts — add `'pre-workout': 'Pre workout en Tunisie'` to the labels map (this also fixes the human breadcrumb at ProductDetailClient.tsx:932 and the related-rail label at :2719 with no further edits). (2) C:/mla/frontend/src/app/components/crawler/CrawlerProductView.tsx:130 — the crawler…
- [ ] **Nutrition sportive: the blog index owns the phrase by title; three articles duplicate it with no link config — low demand, no…** — `live https://protein.tn/blog (title 'Blog Nutrition Sportive Tunisie | Whey & Créatine')`. GSC (window ends 2026-07-29): 'nutrition sportive tunisie' 1/213/22.74, 'nutrition tunisie' 2/28/35.25; /blog/nutrition-sportive-le-guide-ultime… 0/148/64.72, /blog/guide-complet-des-complements-alimentaires-et-nutrition-sportive… 1/16/5.38,… **Fix:** Add two entries to BLOG_SEO_CONFIG in C:/mla/frontend/src/config/blogSeoConfig.ts, copying the shape of the existing 'proteines-tunisiennes-tout-ce-que-vous-devez-savoir' entry (headline + openingLinkHtml + dateModified + lang + faqs: [] + internalLinks). Nothing else changes; no redirects, no canonical, no new page. 1)…

### P2 (21)

- [ ] **Google reviews block emits 40 identical external anchors (21% of all links) and 216 KB of HTML (205 inline star SVGs)** — `frontend/src/app/components/GoogleReviewsSection.tsx:125-128`. 40 of the homepage's 194 anchors are the same external URL, so roughly a fifth of the homepage's outbound link equity is spent on one Google Maps link while money categories get 1-4 anchors each; aria-hidden does not hide links from Googlebot. The duplicated… **Fix:** Single file: C:/mla/frontend/src/app/components/GoogleReviewsSection.tsx. (a) In ReviewCard, make the marquee copy a non-link: `href={copy ? undefined : GOOGLE_PROFILE.url}` and `target`/`rel` only when !copy (keep className, aria-hidden on the <li>, tabIndex -1, data-review-copy — the CSS keys off the <li>, not the anchor). This drops 20 of the 40 identical outbound anchors with zero visual…
- [ ] **Sitemap honours the admin category robots_index flag but the page ignores it — a Filament noindex silently removes a live,…** — `frontend/src/util/sitemapSources.ts:642 and :653 vs frontend/src/app/(shop)/category/[slug]/page.tsx:452-455,483`. The two halves disagree by design: toggling robots_index off in Filament does not noindex the page (page wins) but does delete the URL from listings.xml, so a category can vanish from the sitemap with nothing in any status code or meta tag to show why — the… **Fix:** In C:/mla/frontend/src/util/sitemapSources.ts, make the taxonomy gate read only the field whose semantics are "not in the sitemap": line 642 `if (category.sitemap_include !== false) {` and line 653 `if (subCategory.sitemap_include === false) continue;`. Add a one-line comment above each pointing at category/[slug]/page.tsx:452-455 (the page deliberately ignores robots_index, so the sitemap must…
- [ ] **Product JSON-LD `description` uses the backend's formulaic boilerplate (and mojibake) on legacy products while the meta…** — `frontend/src/util/structuredData.ts:517-519 (buildProductJsonLd) and :731-733 (sanitizeBackendProductJsonLd)`. The schema `description` — the field Google quotes in merchant listings — is a shop-clause template repeated across the legacy catalogue and contradicts the page's own snippet; the mojibake reaches Google's structured-data parser. **Fix:** In both builders: `const raw = repairMojibake(product.seo?.description || …)`; if `isFormulaicProductDescription(raw, product, product.designation_fr)` use `stripHtml(product.description_fr, 500)` (or `productDescription(product, name)` without the price suffix) before falling back to `factualProductDescription`. Export `repairMojibake`/`isFormulaicProductDescription` from…
- [ ] **Double-encoded UTF-8 from the `alt_cover`/`seo_image_alt` column reaches <img alt>, og:image:alt and associatedMedia.caption —…** — `frontend/src/util/productAlt.ts:31-34`. Image alt is the primary Google Images signal on a best-seller (419 DT) and is corrupt; the same string is the og:image:alt and schema caption. **Fix:** Frontend: wrap the three read sites in `repairMojibake()` (productAlt.ts:31/34, productSeo.ts:27, structuredData.ts:598/784, plus `name:` at :565/:724). Backend: extend the planned `seo:repair-mojibake` artisan command to `alt_cover`, `seo_image_alt`, `meta_description`, `seo_description` columns.
- [ ] **H1, Product.name, WebPage.name and BreadcrumbList leaf use the raw shouting catalogue string while <title> is humanized — three…** — `frontend/src/app/components/crawler/CrawlerProductView.tsx:143`. Google reconciles title/H1/schema name; a title that says '300 g' and an H1/schema that say '300G' in caps weakens the entity match and displays as shouting in SERP breadcrumbs and rich results. **Fix:** Introduce `productDisplayName(product) = humanizeProductName(repairMojibake(designation_fr))` (without the brand-stripping arg so the brand stays in the H1) in productMetaDescription.ts and use it for the H1 in both views, `name:` in both JSON-LD builders, WebPage name and the breadcrumb leaf. Do not touch the DB value.
- [ ] **Imported-product titles that fall to the `$core.$variant` rung drop brand and 'Tunisie', diverge from the H1, and the frontend…** — `filament/app/Services/Catalog/ImportedProductContent.php:1277-1282`. A class of imported PDPs carries a title with no geo token and no brand — the two things the Search Console analysis showed the site needs in titles — and title≠H1. **Fix:** Frontend (no deploy of PHP needed): in `productTitle`, treat `seo.title` as auto-generated when `product.source_facts` is non-null (imported) and the explicit title contains neither 'Tunisie' nor 'Protein.tn'; then `humanProductTitle` (which trims to 65 and appends '– Prix Tunisie') applies. Backend (long-term): in seoTitle() add `core+variant+' – Prix Tunisie'` before the bare `core+variant`…
- [ ] **WebPage.description is raw description_fr with tags stripped but entities, whitespace and emoji left in** — `frontend/src/app/(shop)/[slug]/[productSlug]/page.tsx:312`. Undecoded entities and blank descriptions in the WebPage node (the graph hub carrying breadcrumb/isPartOf) — same class of bug fixed for meta descriptions in #192/#195. **Fix:** Replace the inline expression in both routes with `buildMetaDescription(product.description_fr, { maxLen: 200 })` (sanitizeProductHtml.ts:263) or `htmlToText(product.description_fr, 200)`, which decode entities and squish whitespace.
- [ ] **Human PDP 'where you are' category link is not lowercase-folded → one-hop 301 for the 12 Intra-Workout products** — `frontend/src/app/(shop)/products/[id]/ProductDetailClient.tsx:925`. Self-inflicted redirect hop from every Intra-Workout PDP's primary category link (browser surface; Chrome-rendered checks and users hit it). **Fix:** `href={`/${urlSlug(product.sous_categorie.slug)}`}` (import urlSlug from '@/util/productUrl').
- [ ] **Imported flavour variants are separate URLs with ~92% identical bodies and no ProductGroup / isVariantOf relationship** — `https://protein.tn/whey-isolate/dymatize-iso100-hydrolyzed-gourmet-vanilla-137-kg vs …-gourmet-chocolate-137-kg`. Hundreds of near-identical Product pages compete with each other; Google's variant guidance is to declare a ProductGroup so it can pick one representative and consolidate signals. **Fix:** Expose a `variant_group` key (core name + brand + pack, from external_catalog_products) in ProductDetailResource `source_facts`; in both JSON-LD builders, when present emit `isVariantOf: { '@type': 'ProductGroup', '@id': `${origin}/#group-${slugify(key)}`, name: core, brand, variesBy: ['https://schema.org/flavor'] }` and `additionalProperty`/`color`-style `flavor` on the Product. No URL or…
- [ ] **Six full Product nodes (with Offer price/availability/image/brand) are emitted on every category page, and on the crawler view…** — `frontend/src/app/x-crawler/category/[slug]/page.tsx:287-305`. Google's Product structured-data guidelines require markup for a specific product page, not a category/listing page, and require marked-up content to be visible; the view Google receives asserts six prices and stock states that appear nowhere on it. The code… **Fix:** Delete the `productSchemas` emission in all three places (x-crawler/category/[slug]/page.tsx:302-305 + the `{productSchemas.map(...)}` at :316; (shop)/category/[slug]/page.tsx:611-614 + :705-711 and :794-797 + the matching map in the top-level branch). Keep the ItemList (which is the correct listing markup). If the owner insists on keeping them, the crawler view must first render price + stock…
- [ ] `(needs: owner)` **BlogPosting.image (and og:image) of the ranking creatine article points to a file that returns 410 Gone** — `https://protein.tn/blog/prix-de-la-creatine-en-tunisie (BlogPosting.image =…`. Article rich results require a fetchable image; the URL that currently earns the "creatine tunisie" query average (memory: blog post/PDP/home, not /creatine) is exactly this post. A 410 is a permanent-removal signal to Googlebot-Image, and social shares get… **Fix:** Owner: re-upload the cover for article 148 in Filament (or pick an existing storage image) — no code needed for this article. Code hardening (optional, small): extend `seo:health-report` (filament, scheduled weekly) to HEAD each article cover and log 4xx/410 so a deleted file surfaces before it hits the money article; do NOT silently fall back to /logo.png in buildArticleSchema (a logo is not the…
- [ ] **BreadcrumbList emitted on pages with no visible breadcrumb trail (blog article, blog index, brands index, homepage single-item…** — `frontend/src/app/(shop)/blog/[slug]/page.tsx:327-338`. Google's structured-data policy requires markup to describe visible page content; breadcrumb markup with no visible counterpart is the classic 'markup not matching content' case, and a single-item list can never render a rich result. Low individual impact but… **Fix:** Render the trail the markup describes: in ArticleDetailClient.tsx replace the lone 'Retour au blog' row (:292-300) with the existing ShopBreadcrumbs-style <nav aria-label="breadcrumb"> (Accueil › Blog › title, last unlinked); add the same 2-item trail at the top of brands/page.tsx and blog/page.tsx (BlogPageClient header). Remove the single-item BreadcrumbList and the `breadcrumb` reference from…
- [ ] **Three different breadcrumb trails for one category URL (human visible vs human JSON-LD vs bot)** — `frontend/src/app/(shop)/shop/ShopPageClient.tsx:1383-1412`. Google validates BreadcrumbList against the visible trail; the human page's markup disagrees with its own visible crumbs and both disagree with the bot render. Uppercase/trailing-space names leak DB formatting into the rich result. **Fix:** Build the trail once (a `buildListingBreadcrumb({ kind, parent, current, label })` helper in src/util) that both routes and ShopPageClient consume; decide one shape (Accueil › Parent › Sub for categories, Accueil › Boutique › Brand for brands) and apply `.trim()` + a title-case/`designation_fr` normalisation for parent names. Include BreadcrumbList names in scripts/check-crawler-parity.mjs.
- [ ] **Uncurated brand intro copy differs between bot and human renders; the human fallback's category sentence is always empty** — `frontend/src/app/(shop)/shop/ShopPageClient.tsx:1003-1027`. Two different paragraphs on one URL depending on UA (the codebase's own parity rule), and shoppers get the weaker of the two (no category sentence). The human copy is also client-rendered, so it is absent from the human SSR HTML. **Fix:** In the human brand branch ((shop)/[slug]/page.tsx:259) pass `categorySeoLanding={brandSeo ? <BrandSeoHeader/> : <BrandIntro html={buildBrandIntroHtml(brand.designation_fr, brandProductsList)} />}` (server component), and remove the `brandDescriptionFallback` useMemo + its render in ShopPageClient (lines 1003-1027, 1509-1513) so one builder serves both routes; delete…
- [ ] **BlogPosting JSON-LD headline/description ignore the blogSeoConfig overlay and carry the CMS SEO title (with '| Protein.tn'…** — `frontend/src/util/structuredData.ts:1331-1332`. Google's Article guidance wants headline to be the article's visible title; a mismatched or branded headline weakens the Article rich-result and tells Google the 'old' commercial title is still the page's subject, undoing the repositioning done in BLOG-04 for… **Fix:** In page.tsx displayArticle (line 247-261) also override `seo: { ...article.seo, title: seoOverlay.headline ?? article.seo?.title, description: seoOverlay.metaDescription ?? article.seo?.description }` when an overlay exists; and in buildArticleSchema use the resolved visible headline first (`article.schema?.headline || article.seo?.title || designation_fr`) and strip a trailing ` | Protein.tn` /…
- [ ] **CMS article bodies link to legacy absolute URLs (/category/x, /shop/x, /product/x, www.) that 301/308 — and at least one that…** — `frontend/src/app/(shop)/blog/[slug]/ArticleDetailClient.tsx:191,214-217,234-243`. Every in-content product/category link from the blog passes through a redirect hop (or dies at a 410), so the strongest link the article can give a PDP/category (contextual, in prose, early) is weakened, and Search Console keeps counting 'Page with redirect'… **Fix:** Add a server-side normaliser in blog/[slug]/page.tsx (before ArticleDetailClient receives description_fr/description): (a) rewrite `https?://(www\.)?protein\.tn/(shop|category|categorie)/([^/"#?]+)` → `/$3` and `https?://www\.protein\.tn(/|$)` → `/`; (b) apply the same category alias map the middleware/taxonomy uses for renamed slugs (proteine→proteines, isolat-de-whey→whey-isolate,…
- [ ] **Freshness signals: only created_at is displayed (no visible 'mis à jour'), so JSON-LD dateModified (2026-09-08 overlays, CMS…** — `frontend/src/app/(shop)/blog/[slug]/ArticleDetailClient.tsx:190,316-320`. Google recommends that dates in structured data match a visible date and prefers a visible updated date for refreshed content; today the refresh is invisible to users and only asserted in JSON-LD. The regex year swap alters any '2025' in prose (study years,… **Fix:** ArticleDetailClient header: render `<time dateTime={created_at}>` for the publish date and, when `updated_at` (or overlay dateModified) is later than created_at by > 1 day, a second `<time dateTime={updated_at}>Mis à jour le …</time>` (use date-fns `ar` locale when isArabicArticle). Remove the `/2025/g` replace in page.tsx and instead let the headline overlay carry the year; if a year bump is…
- [ ] **categoryAnchor() forces one exact-match label per money page on every navigation surface (footer, mobile menu, mega-menu, crawler…** — `frontend/src/util/categoryAnchor.ts:3-7`. A single phrase repeated on ~230 non-rewritten pages plus every curated brand and category page is an exact-match-anchor footprint; the natural variants exist only in prose. Meanwhile the other four money pages have no commercial label at all, so their few… **Fix:** Keep categoryAnchor as the navigation vocabulary but (a) add labels for the missing money pages: 'mass-gainers': 'Mass gainer en Tunisie', 'pre-workout': 'Pre-workout en Tunisie', bcaa: 'BCAA en Tunisie', vitamines: 'Vitamines et multivitamines', 'whey-isolate': 'Whey isolate en Tunisie'; (b) let a surface pick a variant: `categoryAnchor(slug, fallback, variant?: 'nav'|'related'|'crumb')` with…
- [ ] **Mega-menu and mobile drawer category links exist only client-side; the SSR header carries no category link on any page** — `frontend/src/app/components/ProductsDropdown.tsx:299`. For every page Googlebot fetches, the header contributes zero links to the 55 categories; 28 of the 55 category slugs in sitemap-listings.xml (probiotiques, digestion, sommeil-stress, immunite, plantes-et-herbes, enfants, antioxydants, hmb, mineraux, omega-3,… **Fix:** Do not SSR the interactive panel. Instead give the SSR header a static <nav aria-label="Rayons" class="sr-only md:not-sr-only …"> or, cheaper, extend the shared footer link module from IL-01 with the six top-level rayons (/proteines, /performance, /prise-de-masse, /perte-de-poids, /sante-vitalite, /equipement) + the four money sub-categories missing today (/mass-gainers, /whey-isolate, /bcaa,…
- [ ] **Homepage brand wall is the first 24 brands with a logo in API (alphabetical) order, so the top GSC brand pages are linked only…** — `frontend/src/app/components/BrandsSection.tsx:16, 99-102`. Home is the strongest page; its 24 brand links are spent alphabetically rather than on the brand pages that already earn impressions, leaving optimum-nutrition/weightworld with a single hub link each. **Fix:** In BrandsSection.tsx order `withLogo` before slicing: prefer brands with in-stock product counts (the /brands page already computes 'pt-brand-row__count'), or a small PRIORITY_BRAND_SLUGS list [optimum-nutrition, weightworld, biotech-usa, muscletech, kevin-levrone, ostrovit, real-pharm, proactive, olimp-sport-nutrition, ultimate-nutrition, dymatize, applied-nutrition, big-ramy-labs,…
- [ ] **PDP crawler view links its own sub-category 6-8 times with the raw DB name and never links a sibling or parent commercial category** — `frontend/src/app/components/crawler/CrawlerProductView.tsx:492-496`. Seven identical links to one URL count once; the PDP surface (~10.6k pages, the largest in the crawl) passes equity to exactly one category per page and diversifies nothing. Combined with IL-01 (no footer), a creatine PDP gives Googlebot zero path to… **Fix:** In CrawlerProductView.tsx render the category cell as plain text when row.categoryUrl equals the current product's category URL (link it only on the first row / breadcrumb), and add after the breadcrumb a one-line 'Voir aussi' list built from productComplements.ts / the related categories of the product's sub-category (parent + 2-3 siblings from the taxonomy, anchors via categoryAnchor(slug,…

### P3 (17)

- [ ] **Blog tag/category archive noindex-by-default logic is defeated by the API coercing NULL to true (latent — no tags/categories…** — `frontend/src/app/(shop)/blog/tag/[slug]/page.tsx:52-54`. The first tag created in Filament will produce an indexable thin archive contrary to the frontend's stated policy, and blog-category page 2..N will be indexable duplicates of page 1. No ranking cost today; a trap for the next content push. **Fix:** Backend-only, 2 lines: in C:/mla/filament/app/Http/Resources/BlogTagResource.php:24 and C:/mla/filament/app/Http/Resources/BlogCategoryResource.php:24 change `'index' => $this->seo_robots_index ?? true,` to `'index' => $this->seo_robots_index,` (emit the raw nullable column; keep `follow` as is). This makes the existing frontend logic correct without touching it: tag page `=== true` -> noindex…
- [ ] **RSC payload ships the full brands table (~95 KB, ~580 objects with created_at/updated_at/logo:null) to a client island that…** — `frontend/src/app/components/HomePageClient.tsx:421`. ~12% of the homepage HTML is serialized data that is never rendered; it inflates every crawl and every hydration on the site's most-crawled URL. HomePageClient is a server component (no 'use client'), so the brandMap for product cards is already computed… **Fix:** In C:/mla/frontend/src/app/components/HomePageClient.tsx, keep line 109 (brandMap from the full array) and change only what line 421 passes. Add just above the return (after brandMap): // Mirror BrandsSection's own selection so the client island receives only the 24 rows it renders, // stripped to the fields the tile reads. Same fallback rule, so output is byte-identical. const allBrands = brands…
- [ ] **IndexNow is wired for products only; category, brand, CMS-page and blog changes never reach Bing/Yandex except through the…** — `filament/app/Observers/SitemapTouchObserver.php:45-48`. Every non-product URL type depends on sitemap polling for freshness on the engines that consume IndexNow, and with SM-01 that sitemap is up to 25h stale at the edge. A rewritten category guide or a new article is the content most worth a same-hour recrawl on… **Fix:** Two files, no new endpoint. (1) C:/mla/filament/app/Services/Seo/SeoNotifier.php: add an optional `?string $publicPath = null` to sitemapChanged(); when non-null and `services.frontend.public_url` + `revalidate_secret` are configured, the same afterResponse closure also does `Http::withToken($secret)->connectTimeout(2)->timeout(4)->asJson()->post($internal.'/api/indexnow', ['urls' =>…
- [ ] **PDP WebPage node: description carries raw HTML entities/emoji, name/breadcrumb keep doubled spaces, and the page node does not…** — `frontend/src/app/(shop)/[slug]/[productSlug]/page.tsx:310-314`. Cosmetic-to-minor: entity-encoded text and emoji leak into machine-readable fields Google may quote; the product page node is the one page node in the graph that does not name what the page is about. **Fix:** In both PDP routes build the description with `jsonLdText(decodeHtmlEntities(product.description_fr))` (util/htmlEntities.ts exists) and strip emoji/control ranges; apply cleanSchemaName (or jsonLdText) to the WebPage name and to breadcrumb item names inside buildBreadcrumbListSchema (:846). Add an optional `mainEntityId` to PageNodeOptions in buildPageNode and pass `${canonicalUrl}#product` from…
- [ ] **Paginated category pages: CollectionPage/ItemList names identical to page 1 and the full FAQPage (13 Q&As) is re-emitted on every…** — `frontend/src/app/(shop)/category/[slug]/page.tsx:580,604-609,646`. Self-canonical pagination sends two CollectionPages with identical names and identical FAQ markup — the duplicate signal the /shop builder was changed to avoid; FAQ rich-result eligibility and the FAQ copy get spread over N URLs of the series instead of the… **Fix:** Reuse the shopJsonLd pattern in both category routes: compute pageSuffix from serverPagination.currentPage and append it to the CollectionPage and ItemList names; emit faqPageSchema (and render the FAQ/SEO landing block) only when currentPage === 1 in (shop)/category/[slug]/page.tsx:646/824 and x-crawler/category/[slug]/page.tsx:286-287, keeping markup and visible content in step.
- [ ] **Blog index graph nodes are unlinked islands (no @id on BreadcrumbList/ItemList, CollectionPage without breadcrumb/mainEntity),…** — `frontend/src/app/(shop)/blog/page.tsx:138-158`. Exactly the anonymous-node situation structuredData.ts:1076-1095 documents as fixed for listings ('the page-level nodes are the hub of the graph, not four more islands') — the blog hub was left out. **Fix:** Pass `{ …, withBreadcrumb: true, withItemList: list.length > 0 }` to buildCollectionPageSchema, `{ name: 'Articles', pageUrl: '/blog' }` to buildItemListSchema and `{ pageUrl: '/blog' }` to buildBreadcrumbListSchema in blog/page.tsx (same for blog/category/[slug] and blog/tag/[slug] if they follow the same shape).
- [ ] **Arabic articles ship <html lang="fr-TN" dir="ltr"> and a duplicate H1 from the CMS body** — `frontend/src/app/layout.tsx:288-295`. Document-level language contradicts the content on 31 of 223 posts (the best-ranking, worst-CTR pages per articleLanguage.ts:78-86); two H1s on the same page weaken the heading outline. Low ranking impact (Google detects language from text), but cheap. **Fix:** middleware.ts: for `/blog/<slug>` whose decoded slug matches /[؀-ۿ]/ set a request header `x-article-lang: ar`; layout.tsx: when present, use it for the `lang` attribute (leave `dir` and chrome locale unchanged so the ar-locale noindex logic is not triggered). ArticleDetailClient (or page.tsx normaliser from BLOG-07): demote body `<h1>` → `<h2>` before injection (reuse the demotion in…
- [ ] `(needs: owner)` **ISR is inert site-wide (headers() in next-intl request config): every crawl is a full origin render with no-store, and…** — `frontend/src/i18n/request.ts:15-27`. Not a ranking defect at current latency, but: (1) every Googlebot hit costs a full RSC render plus API calls (only the data layer is cached via unstable_cache), so crawl bursts and the '504 on every endpoint' incidents documented in the code hit crawl… **Fix:** Code-scoped: in middleware.ts, on every crawler rewrite response add `Vary: User-Agent` (NextResponse.rewrite(...).headers.append('Vary','User-Agent')) so the UA-split is declared. Caching itself needs the owner: either a Cloudflare Cache Rule for HTML on crawler UAs (Edge TTL 5 min, 'ignore origin cache-control', cache key including User-Agent), or moving the locale off headers() (next-intl…
- [ ] **'lighthouse' is in the crawler UA list, so PageSpeed Insights / Lighthouse lab audits measure the zero-JS bot page instead of…** — `frontend/src/util/isCrawler.ts:66-73 ('ahrefsbot','semrushbot','mj12bot','dotbot','screaming frog','lighthouse')`. CrUX field data (the ranking signal) is unaffected, but every lab diagnostic the team uses to fix Core Web Vitals on the human page is wrong, and external audits cannot detect bot/human divergences such as PAR-01/PAR-02 because they are served the bot side. **Fix:** Remove 'lighthouse' from CRAWLER_UA_PATTERNS (keep the search engines and social unfurlers). Consider also removing 'ahrefsbot','semrushbot','screaming frog' so audits see the human DOM; the ?__crawler=1 query flag (isCrawler.ts:80-84) already exists for deliberate bot-view checks.
- [ ] `(needs: owner)` **No HTML is cached anywhere: root-layout headers() makes every route dynamic, so the ISR exports on home/category/blog are inert…** — `frontend/src/i18n/request.ts:26 (+ src/app/layout.tsx:288-290, src/app/(shop)/page.tsx:17, src/app/(shop)/[slug]/page.tsx:42,…`. Every human and bot request pays a full React render of a 460-820 KB document (home = 822 KB raw) at the origin; TTFB is 0.3-0.5 s warm and 1.6 s cold instead of an edge HIT. The comment in request.ts:15-19 claims 'no ISR is lost' but the homepage did not… **Fix:** Two-step, keeping the header-driven locale: (1) next.config.js headers(): add a rule for the anonymous indexable HTML routes on the apex host only — `source: '/'`, `'/:slug'`, `'/:slug/:productSlug'`, `'/blog'`, `'/blog/:slug'` with `has: [{type:'host', value:'protein.tn'}]` and `missing: [{type:'header', key:'rsc'}]` — value `public, s-maxage=600, stale-while-revalidate=86400`; exclude /shop…
- [ ] **Homepage is 822 KB because the Google reviews marquee server-renders 40 cards (20 + 20 aria-hidden copies) with 5 inline star…** — `frontend/src/app/components/GoogleReviewsSection.tsx:14,125-131,148-157,179-184`. HTML/DOM size is the direct driver of the mobile INP 'presentation delay' the team measured (globals.css:432-438: 549 ms presentation on the search button) and of hydration time: the section is inside the `'use client'` HomeDeferredSections, so all 40 cards… **Fix:** Keep the design and the marquee: (a) define the star and the Google mark once per section as `<svg width=0 height=0 aria-hidden><symbol id="pt-star" viewBox="0 0 24 24">…</symbol><symbol id="pt-gmark" viewBox="0 0 48 48">…</symbol></svg>` and render `<svg class="h-3.5 w-3.5"><use href="#pt-star"/></svg>` in ReviewCard (lines 179-184) and in the header rating row (line 87) and GoogleMark (line…
- [ ] **Homepage RSC payload serialises all 582 brands (~95 KB decoded, the single largest RSC line) into a client component that shows…** — `frontend/src/app/components/HomePageClient.tsx:421 (+ src/app/(shop)/page.tsx:138-142,231`. ~100 KB of the homepage document (before compression) is data that is discarded on the client after `slice(0, 24)`. It is parsed by the RSC runtime on every visit and inflates the flight payload Google's renderer must process for the flagship URL. **Fix:** In HomePageClient.tsx (server component) compute the same selection the client does — `const withLogo = (brands||[]).filter(b => Boolean(b.logo)); const railBrands = (withLogo.length >= 8 ? withLogo : brands||[]).slice(0, 24).map(({id, logo, designation_fr, alt_cover}) => ({id, logo, designation_fr, alt_cover}))` — and pass `brands={railBrands}` at line 421; keep the full list for `brandMap`…
- [ ] **StarRating renders 10 inline SVGs per rating (2×5 lucide Stars); the PDP reviews block is 123 KB with 167 SVGs and 150 star paths** — `frontend/src/app/components/product/StarRating.tsx:45-62`. Each rating costs 20 SVG nodes and ~6.4 KB of HTML for a glyph the page already contains; on a PDP that is ~90 KB of the 316 KB DOM and a third of its nodes, which lengthens parse/style/hydration on the money pages Google renders and that carry the mobile INP… **Fix:** Keep the exact half-star geometry but draw it with one glyph: emit a single `<svg width=0 height=0 aria-hidden><symbol id="pt-star" viewBox="0 0 24 24"><path d="M11.525 2.295…"/></symbol></svg>` once (e.g. in the (shop) layout or the first StarRating on the page), then in StarRating render `<svg class={glyph}><use href="#pt-star"/></svg>` ×5 in both rows (the clipped absolute row and the…
- [ ] **Root layout preconnects (crossorigin) and dns-prefetches https://protein.tn/api-proxy — the page's own origin — while no browser…** — `frontend/src/app/layout.tsx:312-313`. A crossorigin=anonymous preconnect to the document's own origin opens a second CORS-mode TLS socket that same-origin subresources (CSS, JS, images, fonts without crossorigin) cannot reuse — the exact overhead the comment at layout.tsx:317-319 says was removed… **Fix:** Delete lines 312-313 (or guard them: only render when the resolved origin differs from NEXT_PUBLIC_BASE_URL's origin, and without `crossOrigin` unless the target is used for CORS fetches). Keep the two GTM/GA dns-prefetch lines (315-316).
- [ ] **Providers wraps the provider tree in next/dynamic, adding a low-priority chunk that gates hydration of the entire page** — `frontend/src/app/providers.tsx:7-10`. Nothing under <Providers> — header, product grid, add-to-cart, the whole page — can hydrate until this separately requested, low-priority chunk lands; the split saves nothing because the component is always rendered (ssr: true) on every route. It is a small… **Fix:** Replace the dynamic() wrapper with a static import: `import { ProviderTree } from '@/app/ProviderTree';` and render it directly (keep the props). Same tree, one fewer request and no Suspense gate.
- [ ] **Category and PDP streams ship two nested skeleton fallbacks whose geometry differs from the final page (skeleton→content swap,…** — `frontend/src/app/(shop)/category/[slug]/page.tsx:710-717 and 887-894 (+ src/app/(shop)/shop/ShopPageClient.tsx:2043-2050)`. On a slow link the browser paints skeleton A (max-w-7xl, larger vertical padding), then skeleton B, then the real page with different width and padding — a visible reflow for the user and two wasted skeleton payloads per category/PDP request. CrUX CLS is 0.01… **Fix:** Remove the page-level fallback duplication: in category/[slug]/page.tsx:710-717 and 887-894 either drop the outer <Suspense> (ShopPageClient already carries its own boundary at ShopPageClient.tsx:2043) or give it the identical fallback element, and align that single fallback's `<main>` classes with the real container (`mx-auto w-full max-w-site px-4 py-4 sm:px-6 sm:py-6 lg:px-8`) so the swap does…
- [ ] **WebVitalsReporter silently drops FCP/TTFB (and any early INP/CLS deltas) because gtag is loaded lazyOnload and the reporter bails…** — `frontend/src/app/components/WebVitalsReporter.tsx:17 (+ src/app/layout.tsx:336-339)`. The reporter exists (its own comment) to diagnose the Search Console mobile INP issue, but the field data it sends is incomplete and biased toward late metrics, so decisions about TTFB/FCP regressions (e.g. the caching finding above) cannot be checked in GA. **Fix:** Keep gtag lazy (correct for LCP). In WebVitalsReporter push to the dataLayer instead of calling gtag: `window.dataLayer = window.dataLayer || []; window.dataLayer.push(['event','web_vital',{...}])` — gtag.js drains the queue when it loads — or buffer metrics in a module array and flush them in the gtag-init script's onLoad. No user-visible change.

### P4 (5)

- [ ] `(needs: owner)` **Hero (LCP, first-screen, largest links) sends its three slide links to a legal page, the pack builder and a noindex register URL…** — `https://protein.tn/ hero (admin-managed slides)`. The most prominent internal links on the site's strongest page pass nothing to /whey-proteine, /creatine or /mass-gainers; one of the three is a noindex page. Code is correct; the slide `link` values are an owner/content choice. **Fix:** Owner action in Filament → Paramètres du site → Slides (no deploy): change the link of slide 1 (the eager/LCP slide, currently /politique-de-remboursement) to /whey-proteine — categoryAnchor() then names the link "Whey protein en Tunisie" on its own — or, if the refund banner must stay, point slide 2 (/pack-builder) at /creatine. Keep the welcome-15 register slide but do not rely on it for SEO…
- [ ] `(needs: owner)` **No `gtin` in Product JSON-LD although valid barcodes sit in sku/code_product; the recovery command is scheduled report-only** — `https://protein.tn/mass-gainers/serious-mass-5-45-kg-optimum-nutrition (sku "748927023800", no gtin)`. gtin is Google's strongest product identifier for merchant listings / product snippets and the Merchant docs list it as recommended; the site has the barcodes and never publishes them. The owner decision is recorded in code, so this is an ops action, not a… **Fix:** Owner/ops: run `php artisan products:recover-gtin` on the VPS (vps-run), review the conflict list it prints, then `products:recover-gtin --apply`. After that the existing builders emit gtin automatically (structuredData.ts:769, ProductSchemaBuilder.php:82-86). No frontend change needed; do not derive gtin client-side from sku without the conflict review.
- [ ] `(needs: owner)` **ALL-CAPS CMS intros with the brand in the H2 ('ISOLAT DE WHEY AVEC PROTEIN.TN – …') win over the reviewed JSON intro on 6 pages…** — `frontend/src/util/resolveCategorySeo.ts:177-181 (richerIntro)`. The first H2 Googlebot reads under the H1 on these pages is a shouted brand slogan rather than a query-bearing heading; on /whey-isolate (title 'Whey Isolate Tunisie : Prix & Comparatif') the reviewed 'prix / comparatif' intro is discarded. Owner-editable CMS… **Fix:** Owner: rewrite those six Filament short_intro/description_fr headings in sentence case without 'AVEC PROTEIN.TN'. Alternatively (code, low risk): extend the forced-JSON list at resolveCategorySeo.ts:450 with 'whey-isolate' and 'omega-3' (both have reviewed intros and are in the Phase-15/omega-3 plans), leaving the length rule for the rest.
- [ ] **Internal /x-crawler path is advertised in response headers and answers HTTP 500 when fetched directly** — `live: GET https://protein.tn/x-crawler/category/creatine -> 500 (Chrome UA and Googlebot UA, 22/09)`. A URL that is robots-blocked but discoverable (header leak, any pasted link) sits in 'Indexed, though blocked by robots.txt' (1 URL in the 14/08 report per the docblock) and a 500 is retried by Googlebot rather than dropped. Low impact, but it is a latent… **Fix:** Set the request header on the rewrite (`NextResponse.rewrite(url, { request: { headers: withCrawlerHeader } })` using CRAWLER_HEADER) and in each x-crawler page (or a src/app/x-crawler/layout.tsx) call notFound() when headers().get(CRAWLER_HEADER) is absent - this distinguishes 'we rewrote you here' from 'someone typed the path' even if middleware re-runs, because a re-entered request carries the…
- [ ] `(needs: owner)` **Cloudflare overrides the immutable one-year Cache-Control on /_next/static: browsers get max-age≈86,000 s and no `immutable`, so…** — `https://protein.tn/_next/static/chunks/4bd1b696-100b9d70ed4e49c1.js (origin rule: frontend/next.config.js:214-217)`. Returning visitors re-request all 28-34 script chunks, 3 stylesheets (240 KB main sheet) and the font after 24 h instead of never; with `immutable` gone, Chrome also revalidates on reload. That is avoidable network/RTT on repeat visits and on Googlebot's… **Fix:** Owner, Cloudflare dashboard: Caching → Configuration → Browser Cache TTL = 'Respect Existing Headers' (or a Cache Rule scoped to `protein.tn/_next/static/*` with Browser TTL 'Respect origin'). No code change; re-check with curl that `immutable` is back.


## P0 — verified fix plan (22/09/2026 diagnosis; each item names the exact surface)

- [x] ~~**Bot/human parity on money categories (cloaking exposure)** — repo half~~ — shipped
  22/09 (run 2). Measured before acting, both UAs, 6-word-shingle diff: **2,848 bot-only words**
  across /creatine 369, /whey-proteine 635, /mass-gainers 967, /pre-workout 690, /proteines 187 —
  not "~350–500", and not four pages: **49 of the 50 category files carry both an intro and a
  guide**, so it was every category we own. Cause exactly as diagnosed, in
  `frontend/src/app/(shop)/category/CategorySeoLanding.tsx` (not `app/components/`): the header
  clamps the intro to 520 chars and the guide column rendered it only when no guide existed.
  Fixed by rendering the full intro to humans when both exist (nothing deleted, categories without
  a guide render byte-identically). After: **123** bot-only words total, all product-name noise.
  Gate built and now daily: `seo-agent/tools/parity-check.mjs` (PLAYBOOK step 3b).
- [ ] `(needs: owner)` **Exempt category routes from the bot rewrite** — `frontend/src/middleware.ts`
  is a forbidden path. Now an UPGRADE, not a repair: the parity fix above removed the risk, and
  Googlebot would simply get the better page. Evidence: the human `/creatine` **server-rendered**
  HTML (curl, no JS) is **3,506 visible words** including H1, grid, guide and FAQ — the
  "prerendered HTML is a skeleton" comment at ~L1020 is stale. Change: delete the
  `const categoryPath = pathname.match(/^\/([^/]+)\/?$/)` block (~L1019–1036) inside the bot-UA
  branch so single-segment listings serve the real commercial page (grid, prices, stock, filters).
  **Keep the PDP rewrite above it** — PDP parity is still open (13 bot hrefs vs 38 human). Ship it
  alone and watch `parity-check.mjs`.
- [ ] **Crawler-view link graph.** (a) BreadcrumbList on the bot view skips the parent
  (`x-crawler/category/[slug]/page.tsx` reads `data.category`; the API returns `breadcrumb[]` +
  `sous_category.categorie_id`) → build it from `data.breadcrumb`. (b) PDP bot view carries 13
  internal hrefs vs 38 human — add a footer-parity block (the same 5 hub links `ShopFooter`
  renders) to `x-crawler/product/[...slug]/page.tsx`; parity, not a synthetic nav. (c)
  `/creatine?page=2..10` are `noindex, follow` + self-canonical — Google's pagination guidance
  says self-canonical, no noindex (long-term noindex,follow is treated as nofollow): switch to
  `index, follow` in `app/(shop)/category/[slug]/page.tsx` L456–479 and `next.config.js` L83,
  fix the comment. ~470 listing URLs become indexable — discovery, not doorways.
- [ ] **Duplicate title:** `/perte-de-poids` carries the same title as `/bruleurs-de-graisse` —
  retarget `frontend/content/categories/perte-de-poids.json` to "Perte de poids : compléments
  minceur en Tunisie"; keep "Brûleur de graisse Tunisie" on /bruleurs-de-graisse only.
- [ ] **Filament guard:** `filament/app/Filament/Resources/ProductResource.php` —
  `Toggle::make('seo_robots_index')->default(true)` + a cast so NULL never renders as OFF (the
  bug that noindexed the best sellers for six weeks).
- [ ] **One URL per "prix" intent — a TEST, not a rewrite (4 weeks).** GainLab leads "créatine
  tunisie prix" with one URL whose title = the query and a grid with stock; we split it across
  `/blog/prix-de-la-creatine-en-tunisie` (#3) and `/creatine` (#5). Move the blog's price table
  under the H1 of `/creatine` (`content/categories/creatine.json` + `CategorySeoLanding.tsx`
  block order), exact-anchor links both ways (`frontend/src/config/blogSeoConfig.ts`
  `bodyLinkHtml`), log the page-level baseline, re-read at +14 and +28 days. **No 301 before the
  measurement** — the blog slot is a real top-5 today.
- [ ] Cheap wins: promo block on `/whey-proteine` for "whey protein tunisie promotion" (link
  /offres); `/vitamines` from 566 words to a real "Multivitamines Tunisie" page with the 10
  in-stock SKUs; "Quel est le meilleur oméga 3 en Tunisie ?" H2 on `/omega-3`.
- [ ] `(needs: owner)` **Stock is the ceiling — and since 22/09 it also controls INDEXABILITY.**
  The dead-listing gate (`9c9dc83`) noindexes any listing whose page 1 holds nothing buyable, so
  an empty rayon is now invisible to Google, not merely unconvincing. Live 23/09:
  **`/barres-proteinees` 0 of 88 in stock** — it is noindex, which wastes the full category page
  this routine shipped on 22/09 (177 → ~1,800 words + FAQPage) — and **`/intra-workout` 0 of 12+**,
  likewise noindex days after its redirect loop was repaired. Both reverse themselves with no
  deploy the day one product is back in stock. Also thin: creatine 16/48 on page 1, brûleurs 4,
  BCAA 4, omega-3 6; no 1 kg creatine and no 500 g whey, so "creatine tunisie 1kg" and "whey
  protein 500g prix tunisie" still have no product to land on. **Highest-value owner action.**
- [ ] `(needs: owner)` **Weekly Google.tn check** — 10 queries from the owner's Chrome
  (`hl=fr&gl=tn&pws=0`) pasted into `seo-agent/log/` until the GSC credential exists; it is the
  only non-GSC source that is actually Google Tunisia.

## P0 — land what is already written but never reached main

- [x] **Googlebot was served pages whose `<head>` had no title, canonical, description or robots**
  — SHIPPED 28/09 in `frontend/next.config.js` as `htmlLimitedBots: new
  RegExp(`${nextHtmlLimitedBots}|Googlebot`, 'i')`. Next 15.2+ streams metadata for every UA that is
  not on `next/dist/shared/lib/router/utils/html-bots.js`, and the main Googlebot is deliberately
  off that list, so `generateMetadata` output lands at the end of the body instead of in the head
  whenever it resolves after the shell flushes. Measured as Googlebot vs Bingbot on the same URLs,
  28/09: `/proteines` title at byte 268,738/272,966 vs 4,504; `/prise-de-masse` 288,904/293,075 vs
  4,502; `/blog` 636,169/904,637 vs 3,827; `/sante-vitalite` **absent entirely** on one fetch
  (259,255 bytes, body rendered) — the same shape `audit-live.mjs` recorded on 25/09 and 28/09.
  Next's default list is read at config load and **extended**, never replaced (guarded `require`,
  frozen fallback copy); every bot that had blocking metadata keeps it, humans are untouched.
  Verified pre-ship through Next's own `loadConfig('phase-production-build')` and
  `shouldServeStreamingMetadata` (Googlebot → blocking, Chrome/GPTBot → streamed, standalone
  RegExp→string and JSON round-trip both survive). **Live verification is only possible after the
  deploy: re-measure the four URLs tomorrow** — `<title>` must be at offset < 12,000 as Googlebot.
- [ ] **The landing pad jams every scheduled land run** `(needs: owner)` — `claude/seo-daily-2026-09-22`,
  `-23`, `-24`, `-25` and `claude/seo-smoke-20260921-2258` on koussay183/sobitas-seo-work all point
  at `470de00`, the pad's own `main`, which has no `.github/`. The land workflow picks the newest
  unlanded pad branch, sees ten workflow files deleted, and hands off — 9 times since 25/09 19:18Z,
  issue #224. None of the four carries routine work (23, 24, 25 all landed from real branches), so
  the refs are safe to delete; the exact command is in `log/2026-09-28.md` "For the owner". A
  branch dated later than 21/09 sorts ahead of it, so this does not block a normal day — it wastes
  a scheduled run every 20 minutes and buries a real hand-off if one ever happens.
  **Re-confirmed 02/10 — fifth consecutive day, and five more hand-offs since the 30/09 log**
  (01/10 at 00:29Z, 11:21Z, 17:29Z and 21:59Z; 02/10 at 01:32Z), each writing a 25-line refusal into
  `log/land/`. `claude/seo-daily-2026-09-22` still exists on **both** `origin` and the pad at
  `470de00`, and six stale pad branches sit at the same SHA. The routine will not delete a ref on a
  repo it is told only to push to, so this stays owner-only.
  **Re-confirmed 30/09 and getting worse: `claude/seo-daily-2026-09-22` now exists on `origin`
  TOO**, not only on the pad, both at `470de00`. Three more hand-offs since the 29/09 log (29/09
  16:54Z, 29/09 21:15Z, 30/09 00:33Z), each writing a 25-line refusal into `log/land/`. Still one
  `git push --delete` per remote.
- [ ] **Two runs produced nothing: 26/09 and 27/09** — no `seo(daily)` commit, no `log/2026-09-26.md`
  or `-27.md`, no pad branch, no open PR. Nothing to re-derive; recorded so the gap is not read
  later as "the routine had nothing to do". If it recurs, the schedule's run history is the place
  to look `(needs: owner)`.

- [x] ~~**Salvage PR #222 / #223 — the three repo-side items**~~ — shipped 22/09 on
  `claude/seo-daily-2026-09-22`, cherry-picked BY FILE and re-verified live first:
  1. `frontend/content/categories/barres-proteinees.json` (new) — landed corrected: title 61 → 58
     and re-led with the query (`Protein Bar Chocolat Tunisie – Prix & Marques | Protein.tn`),
     price anchor `dès 36 DT` (the rayon's real floor), honest `sur commande` (all 88 products are
     `qte = 0`), **four unverifiable figures replaced** with values read off the products' own
     fiches, and two `bestProductSlugs` corrected to the `-161140` / `-161141` variants the grid
     actually renders. 177 words → ~1,780 + a FAQPage.
  2. `frontend/content/categories/omega-3.json` — the six lines of #223 applied surgically, minus
     its "au meilleur prix" (Tunisian pharmacies sell omega-3 at 20–60 DT against our cheapest
     in-stock 99 DT). The three `bestProductSlugs` on main did NOT exist in any product sitemap,
     so the "meilleurs produits" block was rendering empty; the replacements are verified present
     AND on page 1 of the live listing, which is what `resolveBestProducts` needs.
  3. The URL-case contract (`urlSlug` / `sameUrlSlug` in `productUrl.ts`, both guards in
     `app/(shop)/[slug]/[productSlug]/page.tsx`, the guard in `app/x-crawler/product/[...slug]`,
     `util/sitemapSources.ts`, the `bestProductSlugs` href in `app/(shop)/category/[slug]`, and
     `util/productComparison.ts`) — the `/Intra-Workout` loop was re-measured live on 22/09 and
     was **still looping** (upper 301 → lower 308 → upper, 12 products, all still in the
     sitemap). Taking the branch's `productUrl.ts` wholesale would have deleted the `'affiliate'`
     reserved-route entry main added later; re-inserted.
- [ ] **`filament/.../CategResource.php` + `SousCategoryResource.php` — lowercase the slug on
  save** (item 4 of the old salvage list, still open). The frontend now folds the segment
  wherever it builds or compares a URL, so the loop cannot come back on the storefront — but the
  DB can still take a hand-typed `Intra-Workout`, which keeps the sitemap/API values ugly and any
  future consumer exposed. Small, PHP-lint-only diff; compare against main before taking it.
- [ ] **Rewrite `frontend/content/categories/Intra-Workout.json`, then alias it.** Nobody loads
  it (the loader's path is case-sensitive; the route always sees `intra-workout`) and today that
  is a mercy: its `h1` is a title string ("Intra-Workout Tunisie – Hydratation & Performance |
  Protein.tn"), its `metaTitle` carries a 🇹🇳, the intro is 671 chars, 2 FAQs. Fix the h1 to a
  real heading, write the copy to the page standard, then add `'intra-workout': 'Intra-Workout'`
  to `CONTENT_SLUG_ALIASES` — **not** a rename: the land workflow refuses any branch that deletes
  a file.

## P1 — the ranking levers (in-stock products first)

- [ ] **`pack-professionnel` is a buyable 699 DT product with NO description at all** (found 07/10
      while measuring the whey shelf). `qte` 97, `pack: true`, brand Optimum Nutrition, 699 DT from
      800, and the live page goes straight from the price block to the customer reviews — 0
      description words, no `aromes`, no `tags`, no `description_cover`. It is the single thinnest
      buyable page on the whey shelf by a wide margin (the next thinnest is 313 words). **The routine
      cannot write this one**: a shop-assembled pack has no manufacturer label to source from and the
      contents are nowhere in the API, so any "ce pack contient…" would be invented. `(needs: owner)`
      — tell us what is in the pack (or let us read it off a DB field) and the copy is a 10-minute
      job. It already carries real attested reviews, so the page has trust signals and no text.
- [ ] **`/collagene` is 254 SKUs with 2 buyable** (measured 07/10 from
      `productsBySubCategoryId/collagene`), both at **139 DT** against a Tunisian set selling
      **85–140 DT** — i.e. we are at the top of the band with almost nothing to sell. protein.tn is
      absent from the whole `collagene tunisie` set, whose 9 of 10 holders are parapharmacies. This
      is a DEPTH problem, not the `/vitamines` price problem, and no copy fixes it. `(needs: owner)`
- [ ] **Serious Mass 5 kg: the set undercuts us on the exact SKU** — ~280 DT in the 07/10
      `mass gainer prix tunisie` set against our **379 DT**. Second SKU after Gold Standard 2,27 kg
      (379 vs 299–360) where we are the most expensive holder of our own money query. Prices are
      outside what the routine may touch — this is the number, not a recommendation. `(needs: owner)`

- [ ] **A backend-generated `seo_title` is served as if a person wrote it — ~97 products**
  (measured 30/09 against the real builder). `productTitle()` honours the standing decision "a
  title a person wrote in the CMS wins" by calling `isAutoGeneratedTitle(explicit, rawName)`, and
  that detector misses the shape the importer actually produces: the product name **with the brand
  prefix chopped off**. Worked example,
  `/antioxydants/california-gold-nutrition-longevity-boost-…-60-gelules-vegetales`:
  `designation_fr` 160 chars · CMS `seo_title` **134** chars (what production serves) ·
  `isAutoGeneratedTitle` → **false** · `humanProductTitle()` → **56** chars
  ("California Gold Nutrition Longevity Boost – Prix Tunisie") · `designation_fr.includes(seo_title)`
  → **true**. The builder already computes the right title and never gets to use it. The criterion
  is one line (`rawName.includes(explicit)` ⇒ auto-generated); the scope is the ~97 long CMS titles
  the 29/09 run left. **Ship it ALONE, on its own day**: it is a template-wide title change, the
  September 2026 spam update is still rolling, and stacking it behind another change makes both
  unattributable. Verify a sample of 20 before/after with the offline harness and re-run
  `title-case-check.mjs` (rule f) after. The cleaner fix is still backend — `ImportedProductContent.php`
  should not write the product name into `seo_title` — and that is `(needs: owner)`.
- [x] **The blog's in-content links spent their budget twice on the same shelf** — FIXED 30/09 in
  `frontend/src/util/internalLinks.ts`. The header rule "ONE link per destination" was enforced
  against the injector's own insertions only, so an article whose CMS body already linked a shelf
  got a second link to it from a later mention. Measured on all 223 published articles that morning:
  **31 articles, 37 wasted injected links** (/whey-proteine 13 · /proteines 11 · /whey-isolate 3 ·
  /prise-de-masse 3 · /creatine 2 · /vitamines 2 · /mass-gainers 2 · /proteines-vegetales 1), and
  **16 of the 31 at the 6-link cap**, so the duplicate displaced a first link. The worst case was
  `/blog/whey-protein-en-tunisie` — the article `internalLinks.ts`'s own header cites — at the cap
  wasting two slots. Fix seeds `used` from the destinations the incoming HTML already links, through
  a normaliser (origin / trailing slash / query / case). Five-case harness: 3 failures on the old
  code, 0 on the new, and both regression guards (clean body, external href) identical.
  **Verified on production 02/10 and again 05/10.** 02/10 (223 articles): CMS-body duplicates
  7 → **0**, and the residue it exposed — the injector duplicating the page's own curated blocks —
  was fixed the same day. **05/10, after that deploy landed, on all 137 live articles** (Googlebot UA,
  anchors inside `<article>`, injected links identified by `class="article-inline-link"`, destinations
  normalised for origin / trailing slash / query / case): **465 injected links, 0 duplicates of any
  curated block, 0 CMS-body duplicates, 0 self-duplicates, 0 fetch errors**, 37 of the 137 at the
  6-destination cap. Both fixes hold; the article population changed under them (the owner folded 86
  posts on 29/09), so the before/after article counts are not comparable — the 0 is.
- [ ] **A dead SKU answers the money query — now FOUR confirmed instances, all `(needs: owner)`.**
  Same shape each time: the URL Google shows is unbuyable and the buyable sibling is absent from the
  set. (a) `lipo 6 black` → legacy `/shop/lipo-6-black-60-caps`, one 301, **139 DT `BackOrder`**,
  while `…-ultra-concentrate-60caps` is **119 DT `InStock`** (28/09). (b) `serious mass … tunisie
  prix` → `/mass-gainers/serious-mass-2-7-kg`, **195 DT `BackOrder`**, while the 5,45 kg is
  **379 DT `InStock`** and absent from the set; three competitors rank their own 5,45 kg (30/09).
  (c) `creatine monohydrate tunisie prix` → legacy `/shop/creatine-monohydrate-300g-ultimate-nutrition`,
  one 301, **99 DT `BackOrder`**, and `/creatine` absent (30/09). Per SKU the fix is **restock or a
  Redirections row** (Filament, 301 live in 5 min, no deploy) — owner-only, and worth more than any
  copy change the routine can make. Do NOT noindex either side (standing decision). The repo half is
  already done on (b): the 2,7 kg page renders a "Disponible immédiatement" block linking the
  5,45 kg (verified live 30/09).
  (d) **`whey gold standard prix tunisie`** (84 impr at 8.4, **0 clicks**, 22/09 GSC) → our URL in the
  set is `/whey-proteine/whey-gold-standard-908g`, **155 DT `BackOrder`**, while
  `/whey-proteine/100-whey-gold-standard-2-27kg` is **379 DT `InStock`** and absent from the set —
  four competitors rank a 2,27 kg or 4,5 kg (02/10, both statuses verified live from the pages' own
  `Offer.availability`). **Four for four on the money rows looked at since 28/09.** (d) also carries a
  pricing fact that is not an SEO decision: the same Gold Standard 2,27 kg is **299 DT at nutribeast
  and protein-shop-tunisia** against our **379 DT** — an 80 DT / 27 % gap on the buyable SKU behind a
  page-one zero-click row. Flagged for the owner; prices are outside what the routine may touch.

- [ ] **A dead SKU answers `lipo 6 black`** (measured 28/09): the URL in the SERP set is the legacy
  `/shop/lipo-6-black-60-caps`, one 301 to `/bruleurs-de-graisse/lipo-6-black-60-caps` — **139 DT,
  `BackOrder`, self-canonical** — while `…-ultra-concentrate-60caps` (**119 DT, `InStock`**) is a
  separate, buyable SKU. Saturday: exact-anchor internal links from the dead SKU's page and from
  `/bruleurs-de-graisse` to the buyable one, and the category's `bestProductSlugs`. Restock or a
  Redirections row is `(needs: owner)` — do not noindex either page (standing decision).
- [ ] **The formats Tunisians search have no buyable SKU** `(needs: owner)` — from `suggest.mjs --deep`
  28/09 cross-checked against `/api/productsBySubCategoryId`: gold standard 4,5 kg (qte 0), 908 g
  (qte 0), 1 kg and 2 kg (absent), creatine 1 kg (nine SKUs, all qte 0), creatine 100 g (qte 0),
  serious mass 2,7 kg (qte 0). Their in-stock siblings (gold standard 2,27 kg qte 63; serious mass
  5,45 kg qte 34; creatine 500 g ×3) are the only ones worth writing format copy for, and the rows
  are flagged that way in `KEYWORDS.md`. 13 of 168 whey SKUs and 12 of 225 creatine SKUs are
  buyable at all.
- [ ] **`mass gainer prix tunisie` is answered by the blog, not the category** (SERP look 28/09):
  our URL in the set is `/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025`, with
  gainlabnutrition's `/collections/mass-gainer-tunisie` leading. Same shape as the `pre workout`
  and `serious mass tunisie` rows: Saturday's cannibalisation work (exact-anchor link from the
  blog post to `/mass-gainers` via `blogSeoConfig.ts`), never a title rewrite during the update.
- [x] **The blog sitemap listed a URL the repo redirects** — FIXED 05/10 in
  `frontend/src/util/sitemapSources.ts`. The owner's 29/09 blog refresh folded 86 duplicate posts
  into their survivors and recorded the mapping in `src/generated/blogMerges2909.json`; every key of
  that map is answered by `middleware.ts` with a redirect, and `redirects.js` carries the ASCII
  subset. `blogArticlesSource` never read the map, so a merged slug whose article row is still
  published kept being submitted. **Measured 05/10 on all 137 URLs in `/sitemaps/blog.xml`
  (Googlebot UA, `redirect: manual`): 136 answered 200 at the listed URL, ONE answered 308** —
  `/blog/quand-prendre-de-la-creatine-le-guide-complet-pour-optimiser-vos-resultats` →
  `/blog/comment-utiliser-la-creatine-en-tunisie-pour-maximiser-vos-performances`. Only one of the 86
  leaked because that slug is the one claimed by TWO published rows (ids 44 and 45, `sitemapData.ts`),
  so a row of it survives in `/all_articles`. The guard reads the same map and normalises it the same
  way the middleware does, so the next fold is covered by construction. Proved against the REAL
  source with the crawl stubbed: old code 137 URLs / 1 redirect listed, new code 136 / 0, exactly one
  URL dropped and every other entry byte-identical, plus 8 edge cases (upper-case key, surrounding
  whitespace, an Arabic key, that key with a literal newline, a survivor, an unrelated article, a slug
  that merely starts with a merged key) all passing. **Verify live tomorrow: blog.xml = 136 `<loc>`.**
- [ ] **One buyable Gold Standard SKU of 21, and the unqualified money query is answered by a dead
  one** `(needs: owner)` — measured 05/10 from `/api/productsBySubCategoryId/whey-proteine`
  (168 SKUs, **13 buyable**). The Gold Standard line holds **21 URLs and exactly one buyable page**:
  the 2,27 kg at **379 DT, qte 59**. The other 20 are qte 0 — the 908 g at 155 DT, the 4,5 kg at
  529 DT, and **19 iHerb flavour imports priced 332 DT (907 g) and 587 DT (2,27 kg)**, i.e. 55 %
  above our own price for the identical format. The repo half of this is **already done and verified
  live today**: `productVariantCanonicals.ts` (shipped 28/09) canonicalises all 19 flavours — 11 to
  the 2,27 kg, 8 to the 908 g — and drops them from the sitemap (checked on the Rocky Road 2,27 kg:
  canonical = the buyable page, `index, follow`, 0 occurrences in `products-*.xml`). What is left is
  owner-only: **restock or a Redirections row for the 908 g**, which still holds the unqualified
  query's slot. Note the 28/09 decision that 8 small-format flavours canonicalise INTO that 908 g
  page; re-pointing them is a canonical rewrite and must not be done during the spam update.
- [ ] **We are the most expensive of five Tunisian shops on the SKU behind the densest query
  cluster** `(needs: owner)` — same SERP set, 05/10, identical Optimum Nutrition Gold Standard
  2,27 kg: protein-shop-tunisia **299 DT**, gohardnutrition **320 DT (rupture)**, stock-x **360 DT**,
  nutribeast **360 DT**, **protein.tn 379 DT**. The 02/10 log flagged 299 at two competitors; the full
  set is now priced. Prices are outside what the routine may touch — this is the number, not a
  recommendation.
- [ ] **`meta_title` is corrupt on 2 of the 13 buyable whey SKUs, and it blocks the routine's own
  lever** `(needs: owner)` — read from the API 05/10. `whey-regime-2kg-william-bonac` stores a
  `meta_title` of `"description;Whey Regime William Bonac 2,21 kg avec 25 g de protéines…"` (158
  chars, a leaked field name), and `tantor-whey-protein-908-g-scenit-nutrition` stores raw meta-tag
  attribute soup (`name="title" content="…" name="description" content="…" name="robots"
  content="index,follow"`, ~200 chars). **Neither reaches the live `<title>`** — verified on both
  pages today, `productTitle()` prefers `seo_title` and both `seo_title` values are clean — so this is
  latent, not a live SERP defect. The consequence is narrower and real: `seo:products-apply-copy`
  fills `meta_title`/`meta_description` **only when the column is empty**, so these two products can
  never be repaired by a `resources/seo/products` entry without `"force": true`, and forcing would
  override a column a person may have meant. Backend cleanup, like the `seo_title` importer item above.
  **And the same mechanism applies far beyond those two:** measured 05/10, `meta_title` and
  `meta_description` are non-empty on **all 13** buyable whey SKUs (what is empty is
  `seo_title`/`seo_description`, on 10 of them), so a `resources/seo/products` batch can only ever
  land `append_html` and `faq` on this shelf — never a description. The non-empty values are the
  generic `"<NAME> — Whey Protéine en Tunisie. Livraison 24-72h…"` boilerplate, which `productDescription()`
  already detects as formulaic and replaces at render time with body copy + price; that is why the
  live snippets differ from the column. Any future run planning a description pass on PDPs must read
  the columns first.
- [ ] **`mass gainer` is now answered by THREE of our URLs, two of them near-duplicate blog posts** —
  SERP look 05/10 (extended) on `prise de masse tunisie gainer prix acheter`: the set holds
  `/mass-gainers` (a shape change — on 28/09 only the blog was in it), **and both**
  `/blog/mass-gainer-prix-tunisie` **and** `/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025`.
  Two posts whose slugs differ by a suffix answering one query beside the category is the cleanest
  cannibalisation case on the board. Saturday's theme: the category wins, the two posts link to it
  with the exact anchor via `blogSeoConfig.ts`, and whether the two posts should be one is the
  owner's call (the DB owns the bodies).
- [~] **`/vitamines` is NOT this week's category target — withdrawn 05/10 on price evidence.** The
  original reasoning (683 words, the thinnest money-ish listing) was answered by the 29/09 rebuild:
  1,855 bot words, 6 words above the grid, FAQPage, and the live audit measures it at 1,139 words
  today. What is left is not a copy gap. SERP look 05/10 (extended) on `vitamines tunisie
  multivitamines prix acheter complément`: parashop ×2, **primini.tn** (price aggregator),
  maparatunisie, bonheur.tn, tunisiepara, nutribeast, sf-nutrition, bioherbs — protein.tn **absent
  for the third look in a row**, and the set's multivitamins sell at **20–40 DT** against our
  **60–270 DT** imported shelf (10 buyable of 1,870). No page edit closes a 3× price gap on a
  parapharmacy query. Reopen only if the catalogue gains a budget multivitamin; until then the hours
  belong to the whey shelf (see the Gold Standard items above).

- [ ] **4,344 of 7,389 product titles exceed 65 characters** (measured 24/09 over the live
  catalogue, mean 72.3). Google truncates them, so the brand and "Prix Tunisie" — the two things
  a Tunisian buyer scans for — fall off the end. `humanProductTitle` already drops the brand tail
  to fit, but the NAME alone is over budget on the imported catalogue. Needs a shortening rule
  that keeps the head noun + format and sheds the marketing tail ("Premium Women's Fat Burner
  with Raspberry Ketones – Premium Women's Fat Burner with Raspberry Ketones – 60 gélules"
  literally repeats itself). Measure the CTR of a sample before/after; do NOT touch the watchlist
  PDPs before the 05/10 freeze lifts.
- [ ] **Decide who owns the generic `pre workout`** — 393 impressions, **0 clicks**, query-average
  position 7.0 (GSC 28 d to 22/09), the biggest zero-click row on the site. The impressions match
  `/pre-workout/pre-workout-born-rage-original-eric-favre` (385 impr, 1 click, pos 5.4) almost
  exactly, so a generic browse term is being answered by one niche PDP. This is Saturday's
  cannibalisation theme, not a title rewrite — `/pre-workout` is inside the 05/10 freeze. Read the
  Pages breakdown for the query first (`gsc.mjs --query=`, or the owner's Chrome with
  `hl=fr&gl=tn&pws=0`); the PDP outranking the category may be the correct outcome to keep.
- [ ] **`/sante-vitalite` is page-one with 1 click on 405 impressions** (pos 8.4). Its title and
  description are already to standard, so the loss is elsewhere — check what the query set
  actually is before rewriting anything.

- [ ] **Commercial-first category landing pages — `/creatine` first** (owner analysis 21/09:
  House Nutrition / NutriBeast win "créatine tunisie" with a plain shop page; ours buries the
  grid under the guide). In `frontend/src/app/(shop)/category/[slug]/page.tsx` (+ the category
  JSON): H1 = the head term ("Créatine en Tunisie"), one commercial sentence, **product grid
  immediately** (in-stock first), format/type chips, a compact comparison table (type · format ·
  prix · prix/100 g, computed from the API — no invented numbers), FAQ, then the guide. Keep every
  existing block (nothing deleted, only reordered) so the 250-word gate and FAQ schema stay.
  Measure before/after with audit-live + a screenshot at 390/1440. Then whey-proteine,
  mass-gainers, pre-workout, proteines. One category per run, gates green, design-system clean.
- [ ] **Topical hierarchy for Google**: category → brand-within-category → product. Add a
  "Marques" strip on the four money categories (OstroVit, Biotech USA, Optimum Nutrition… linking
  to `/marques/<brand>` or the filtered listing), and make every in-stock product page link back
  to its category with the exact head-term anchor. Internal links are the cheapest authority.

- [x] **Product FAQ + guide on the watchlist products that have none** — CONFIRMED LIVE 24/09:
  all four PDPs now serve `FAQPage` and audit `ok` (no "no FAQPage" P1 left on any of them), so
  the 23/09 `seo-copy-apply` VPS run did apply. Original entry below for the record.
- [~] **Extend the FAQ + guide pass to the rest of the in-stock catalogue** — **essentially DONE on
  everything that can be bought, verified 30/09.** Cross-tabulated the audit's own `avail` column
  against its own findings on the 30/09 sample: of the **48** PDPs reporting `P1: no FAQPage`,
  **48 are `BackOrder` and 0 are `InStock`**. Both honest candidate sets were then checked by hand
  and are complete: all **7** in-stock `/pre-workout` PDPs and all **10** in-stock `/vitamines`
  PDPs already carry FAQPage live AND already have entries in `resources/seo/products/2026-09-28.json`.
  So the recurring 48-item P1 is now an **out-of-stock-only** backlog, where copy earns nothing
  because nobody can buy — it must not outrank real work again. Re-open only for a product that
  becomes buyable. Original note: the audit found **39 of 68 sampled PDPs with no FAQPage** (24/09),
  almost all of it the imported long-tail. How the four were written (21/09 record): Ostrovit creatine, ISO 100 Dymatize, Nitro-Tech Whey Gold, C4 Original — **all four written
  23/09** in `filament/resources/seo/products/2026-09-23.json` (guide 221–269 w + 6 FAQ pairs
  each) and `seo-copy-apply` queued. Marked `[~]` not `[x]` until the VPS run is confirmed: the
  copy lands in the DB after the merge, so **verify the FAQPage is live tomorrow** before closing.
  Deliberately NO `meta_title`/`meta_description` on these four — all four are already inside the
  standard (titles 53–64, descriptions 133–158) and those strings are generated with the **live**
  price, so writing the DB column would freeze a promo price (`productDescription()` gives the
  explicit column precedence). Nitro Tech carries no nutritional figure at all: its fiche
  publishes none.
  Next: extend to every in-stock product in `KEYWORDS.md` "Product-name SERPs".
- [ ] **Thin in-stock legacy products** (`seo:products-legacy-reindex` dry-run lists word counts —
  queue `seo-legacy-reindex-dry-run` to read them from the VPS log via `vps-run`; or measure with
  `audit-live.mjs`): shaker 450 ml (id 404), Ashwagandha BioTech (383), ring de boxe (313), Iso
  Hydro Zero (496), Whey Testo Mr.X (466), Creatine Real Pharm 150 g (462), Magnesium B6 (527),
  hack squat (513). Real copy 150–400 words each via `append_html`, 2–4 per run.
- [ ] **Head terms where the blog or the homepage outranks the category** (`gsc.mjs` "split
  queries"): `creatine tunisie`, `proteine tunisie`, `whey protein tunisie`, `serious mass
  tunisie`. For each: strengthen the category page (intro answers the query in sentence one, FAQ
  mirrors People-Also-Ask, best products block), and add exact-anchor internal links from the
  ranking blog posts via `frontend/src/config/blogSeoConfig.ts` (per-article `bodyLinkHtml` /
  `internalLinks`) and the synonym map in `app/(shop)/blog/[slug]/page.tsx` — repo-controlled,
  no owner needed. One head term per target page (the injector routes "mass gainer" to
  `/prise-de-masse` today — decide the winner before adding anchors).
- [ ] **Page-one zero-click queries** (`gsc.mjs` section 2): rewrite title/description of the
  ranking page for CTR — price anchor, stock, delivery, brand. Category → JSON; product → JSON
  entry with `force: true` and the GSC numbers in `why`.
- [ ] `whey gold standard prix tunisie` (22 impr/7d, pos 6.2, 0 clicks), `monster prix tunisie`
  (21, 5.3, 0 clicks), `whey protein 1kg prix tunisie` (33, 9.8, 0 clicks): find the ranking URL
  (`gsc.mjs --query=`), fix its title/description, make sure the in-stock PDP is the target.
- [ ] **Negative-stock legacy products are indexable doorways** (pattern found 21/09 on omega-3:
  ids 206, 208, 246, 288, 494 all qte ≤ 0, all index). A dead SKU that ranks steals the query from
  the category and converts nobody. Per SKU: `(needs: owner)` restock or retire (Filament
  Redirections row → category, 301 live in 5 min, no deploy). Prepare the list from the API
  (`/api/productsBySubCategoryId/<slug>?meta_only=1` shows qte) and put it in the log.
- [ ] `homepage` meta description is 180 chars (audit-live P1) — trim to ≤ 155 in the home page
  metadata source; keep "Protéine Tunisie" first.

## P2 — technical & tooling

- [x] **The in-content injector spent link slots on shelves the page already linked — all three
  sources now subtracted** (30/09 did the CMS body, 02/10 the two curated blocks). 02/10 measured all
  223 published articles after the 30/09 deploy: body duplicates **0** (the fix holds), but **30**
  injected links in **25** articles duplicated a curated block — 29 against the "Lire aussi" chips
  (`blogSeoConfig.internalLinks` via `BlogSeoBlock`) and 1 against the "Voir aussi sur la boutique"
  nav (`article.related_shop_categories`). `/whey-proteine` 13 · `/proteines` 9 · `/whey-isolate`,
  `/vitamines`, `/mass-gainers`, `/creatine` 2 each; **14 of the 25 at the 6-link cap**, so there the
  duplicate displaced a first link. Shipped: `excludeLinkedDestinations()` in `util/internalLinks.ts`
  (reusing the 30/09 normaliser) + `resolveBlogSeoLinks()` in `config/blogSeoConfig.ts` as the single
  source of the chip rule, read by both the route and `BlogSeoBlock`. The injector yields and the
  curated anchor keeps the shelf, because the curated anchor is the better one every time
  ("whey protéine en Tunisie" vs a bare "whey") and that is the direction the existing bridge
  exclusion already took. **Verify on production once `deploy-frontend.yml` carries it:** 0
  duplicates against all three sources, body duplicates still 0, and each of the 14 at-cap articles
  showing a *new* sixth destination rather than one link fewer.

- [x] **`audit-live.mjs` called the category route's intended transient-5xx a P0** — fixed 02/10
  after it had spent two mornings (30/09 and 02/10) on `/sante-vitalite`. `category/[slug]/page.tsx`
  rethrows an upstream 429/5xx/timeout deliberately so Next answers with an uncached 5xx and the
  crawler retries; the checker already gave the analogous "head with no metadata" shape one
  confirming re-fetch for exactly this reason and the rule was never extended to the status code. Now:
  429/5xx → one re-fetch after 1.5 s, clean → measure from the good render and record **P2**,
  non-200 → **P0** naming both statuses; **4xx gets no re-fetch**. Proved against a local fake origin
  (`/flaky-500` exit 0 + P2, `/always-500` exit 1, `/gone-404` exit 1 unchanged, `/healthy` exit 0)
  before being trusted, then on production: the 120-URL sweep exits 0 with `/sante-vitalite` P2.

- [ ] **P3: `audit-live.mjs` `classify()` calls any ≥ 2-segment path a product**, so an ad-hoc probe
  of `/brand/Optimum%20Nutrition/17` (three segments) reports `P0: no Product JSON-LD` on what is
  really a 301 to a brand page. **Cannot affect the daily exit code** — the sample draws only from
  `products-*.xml` and `watchlist.txt` holds no 3-segment non-product URL — so it is a nit, not a
  defect. Found 02/10. Fix it on a day when nothing else touches the tool: a classifier change
  changes what every future run measures.

- [ ] **P2: an all-lowercase catalogue name has appeared** — `title-case-check.mjs` counts them and
  its own note says to decide the `needsRecasing` branch "if this number leaves 0". It was **0 on
  25/09** and is **1 on 02/10**: `banc de musculation développé incliné`
  (`/materiel-de-musculation/banc-de-musculation-developpe-incline`). The builder passes such names
  through untouched although the comment says they should be re-cased. Catalogue-wide builder change,
  so it ships on its own day, not alongside anything else.

- [ ] **CMS body links need an editorial pass** `(needs: owner)` — found 30/09 while measuring the
  in-content injector. `articles.description` carries author-written anchors the repo must not touch
  (TipTap JSON round-trips, duplicate links, no revert path — playbook rule). Two concrete defects on
  `/blog/quelles-sont-les-meilleures-proteines` alone: **two** anchors to `/prise-de-masse` on an
  article about protéines (the injector added a third until today's fix), and an anchor whose text
  reads **"whey"** pointing at `/blog/creatine-tunisie-tout-ce-que-vous-devez-savoir` — a créatine
  article. Anchor text that names one subject and links another is the weakest possible internal
  link. The 31 articles listed in `log/2026-09-30.md` are where to look first, since each is known to
  carry at least one CMS anchor to a money shelf.

- [x] **Lock the casing contract with a check script** — SHIPPED 25/09 as
  `seo-agent/tools/title-case-check.mjs`. Imports the real builder through a `registerHooks`
  resolve hook (no reimplementation), runs it over catalogue names from
  `productsBySubCategoryId/<slug>` with each page's own brand, and asserts five rules: (a) pinned
  initialism not Titlecased, (b) micro sign never Greek `Μ`, (c) no glued unit, (d) intentional
  catalogue capitals survive, (e) 11 offline golden pairs so a change that DISABLES the humanizer
  cannot pass a–d. `KEEP_UPPER` is a frozen copy, not an import — a check that reads its
  expectations out of the thing it checks cannot catch a deletion. Findings and candidates are
  separate columns. Not wired into `prebuild`. First full-catalogue run found 2 live µ defects.
  `--offline` ~30 s, full catalogue ~12 min.
- [ ] **`needsRecasing` has no branch for an all-lowercase name** (found 25/09 by
  `title-case-check.mjs`). The comment above it says a name "typed entirely in lower case" still
  gets the full treatment, but the test is `lower === 0` — which `upper > lower` already covers —
  where it would need `upper === 0`. Measured over all 11,367 catalogue names: **1** such name
  exists (`/materiel-de-musculation/banc-de-musculation-developpe-incline`, which reads correctly
  as it is), so the disagreement is latent, not a live defect. `title-case-check.mjs` pins the
  current behaviour in its golden pairs AND counts these names every run. Decide the branch the
  day that count leaves 0 — not before, and not during a Google update.
- [ ] **`KEEP_UPPER` candidates from the live brand table** (listed by `title-case-check.mjs`
  every run, 25/09). Confirmed: **`OstroVit` → `Ostrovit`** (×1, the shop's own table spells the
  interior capital). Ambiguous: **18 brands the table itself spells ALL CAPS** (ALLMAX, BIG,
  BIOTECH, CHROME, DYMATIZE, FITNESS, KAL, KEVIN, …) that a shouting name Titlecases — Titlecase
  may well be the correct rendering there and the catalogue cannot say. Decide each against the
  brand's own site, then add to `KEEP_UPPER` **and** to the tool's frozen copy, in one pass with
  a full before/after diff. Same product also shows a dangling separator:
  `CREATINE MONOHYDRATE OSTROVIT- 500GR` → `Creatine Monohydrate Ostrovit- 500 g` (the brand-tail
  strip misses a brand glued to a hyphen mid-string).
- [ ] **`/sante-vitalite` served one headless render on 25/09** — 200, body 1,012 words and full
  JSON-LD, but no title, canonical, description or robots. Not reproducible (14/14 clean
  immediately after; `ok` 45 min earlier). `audit-live.mjs` now records that shape P2 after a
  clean confirming re-fetch instead of exit-1. **If it recurs on two consecutive runs it is a
  streaming-metadata P0** — the page is dynamic-rendered through the crawler rewrite, so the
  suspect is metadata that never reached the stream, not the category JSON.
- [ ] **`BOUTEILLE D'EAU 2.2 LITRES` → "Bouteille D'eau 2.2 Litres"** (2 products). Three small
  wrongs: French elision should be `d'eau`, the decimal should be a comma (`2,2`), and `litres`
  is a unit word that should stay lowercase. Deliberately NOT fixed on 24/09: a `d'` rule that
  lowercases the article but leaves the caser to capitalise the noun yields `d'Eau`, which is no
  better, and "litres"/"gommes" only need the UNIT_WORDS list extended. Worth doing together,
  with the same 7,389-name before/after diff as evidence.

- [ ] `(needs: owner)` **Gated listings stay in `sitemaps/listings.xml` while serving noindex**
  (found 23/09): `/barres-proteinees` and `/intra-workout` are both `<loc>` entries and both
  answer `noindex, follow`, which GSC reports as "Submitted URL marked noindex". Not a defect to
  fix blind — the sitemap builder cannot know, because the `?fields=index` projection carries no
  `qte`/`rupture` (the owner documented this in `9c9dc83`: the in-stock gate there is wired but
  inert pending one backend column). Keeping them listed also helps Google notice the day stock
  returns. Decide deliberately; do not "fix" it by dropping the URLs.
- [ ] **`/shop/nitro-tech-whey-gold-23-kg/` resolves in 2 hops** (→ `/whey-proteine`), a dead slug
  variant Google still holds indexed under the stale title "Proteine Tunisie | SOBITAS" (seen in
  the 23/09 SERP look). It works, so it is low priority; collapse to one hop in `redirects.js` on
  a technical-sweep Friday. The live product slug `/shop/nitro-tech-whey-gold-2-3kg` is a clean
  single hop, as are `/shop/<slug>` and `/blogs/<slug>` generally (verified 23/09).

- [ ] **323 duplicate product URL pairs** `(needs: owner)` — found 22/09, evidence in
  `seo-agent/data/duplicate-product-slugs.json`. A slug ending in `-<5+ digits>` whose stem is
  also a published product; both members answer 200 and are self-canonical (duplicate content),
  and on `/barres-proteinees` the suffixed member is priced 54 DT while the stem is 117–169 DT
  for the same bar — **two prices for one product**. Concentrated in vitamines (86), antioxydants
  (58), sommeil-stress (54), plantes-et-herbes (20), boosters-hormonaux (18). Per pair: keep one,
  Filament Redirections row (301) on the other. The routine never picks the survivor or touches a
  price — owner's call which SKU is real.
- [x] ~~`audit-live.mjs` compared the canonical against the REQUESTED path~~ — fixed 22/09 (run 2).
  A watch URL that is a deliberate redirect source (`/Intra-Workout/<p>`, kept in `watchlist.txt`
  to prove it 301s once and stops) was reported as a P0 every run although its canonical correctly
  points at the redirect target. Now compared against `res.url`; identical where nothing redirects.
- [ ] **Extend `suggest.mjs` seeds beyond the head terms.** On 22/09 it surfaced only whey /
  creatine / mass / proteine long-tails because the seed list is the head terms only — nothing
  for bars, omega-3, bcaa, pre-workout, brûleurs. Add the money-category terms to the seed array
  so weekly discovery covers every category we own a page for.
- [ ] **Title > 65 on the long-name iHerb PDPs** — 17 of 40 sampled 22/09 (66–74 chars), a
  humanizer pattern, not per-page. If the next `--sample` repeats it on the same page type the
  checklist promotes it to P0 → fix in `productMetaDescription.ts` (truncate to ≤ 60 at a word
  boundary, keep brand + format).
- [x] ~~`blog:apply-links` artisan command~~ — NOT needed (verified 22/09): blog → category links
  are already repo-controlled and live (`frontend/src/util/internalLinks.ts` first-mention
  injector + `frontend/src/config/blogSeoConfig.ts` per-article links/FAQ; a 30-article sample
  showed ~4 injected category anchors per post). Edit those files to change anchors/targets;
  never write links into `articles.description`.
- [ ] **GSC credential** `(needs: owner)`: without `GSC_SERVICE_ACCOUNT_JSON_B64` in the cloud
  environment, the routine works from the dated CSV exports in `protein.tn/` and live SERP looks.
  Steps are printed by `node seo-agent/tools/gsc.mjs`.
- [ ] **Unpublishing a product never busts the sitemap / pings IndexNow** — `ProductSeoObserver::
  saved` returns early when `!publier`. One-line fix: let `wasChanged('publier')` through the
  gate (SeoNotifier already suppresses IndexNow for noindex rows).
- [ ] **`content/categories/*.json` `bestProductSlugs` may be phantom** (omega-3's were; block
  renders empty). One-off audit: every slug in every JSON vs `sitemaps/products-*.xml`; fix.
- [ ] GSC coverage: 647 "Not found (404)" — export (needs GSC), fix internal links / add 301s
  where there is traffic history; 4,954 "Page with redirect" are mostly intended `/category/x →
  /x` — spot-check chains only. "Products missing a return policy" (Merchant): add
  `hasMerchantReturnPolicy` to the Product/Offer schema in `structuredData.ts`.
- [ ] Product 391 Psychotic filed under brand "Invictus" while copy + barcode say Insane Labz →
  wrong `brand.name` in schema `(needs: owner)` to confirm the tub.
- [ ] Double-encoded UTF-8 in `description_fr` on ids 517, 177, 254 (`âœ”`, `ðŸ’ª`) — the frontend
  repairs names but not bodies; a `seo:repair-mojibake` command (idempotent, model saves) fixes
  the rows — add it + a vps-run task.

## P3 — content & structure (compounding)

- [ ] **Blog inventory vs money terms** (224 articles): map which article ranks for which
  cluster (GSC pages ↔ queries); strengthen + interlink the ones that already rank; consolidate
  duplicates (`/blog/omega-3-tunisie` vs `/blog/omega-3-tunisie-bienfaits-…` — keep the richer,
  301 the other `(needs: owner)` Redirections row). New article only where no article covers the
  cluster — and only once `blog:apply-links` exists (blog HTML is DB-only today).
- [ ] **Category ↔ sub-category keyword split**: each sub-category JSON must target a DIFFERENT
  query than its parent (e.g. `/whey-proteine` = "whey protein tunisie", `/whey-isolate` = "whey
  isolate tunisie", `/proteines` = "proteine tunisie"). Audit the 51 JSONs' `metaTitle` for
  overlaps; fix the overlaps first.
- [ ] Product rich snippets (stars) are withheld until attested reviews exist — the VPS review
  engine needs Aramex credentials `(needs: owner)`; monitor `audit-live` "rating" column.
- [ ] "AI Assistant" referral channel (ChatGPT/Claude-type traffic) — keep key pages citable:
  clear factual answers, FAQ schema, concise product facts.

## Monitor

- **Checkpoint 12/10/2026 — blog repositioning of 27/09.** `/blog/mass-gainer-prix-tunisie-guide-complet-pour-2025`
  (23 clicks/28 d to 19/09) and `/blog/prix-de-la-creatine-en-tunisie` (14/393 at 8.8) were retitled off
  "prix … Tunisie" so /mass-gainers and /creatine can own it. Read GSC Pages for `mass gainer prix tunisie`,
  `creatine prix tunisie`: if the category has not gained AND the post lost clicks, restore the query words in
  the post's `blogSeoConfig` headline. The Arabic best-creatine post was restored on 28/09 (no competing page).
- **28/09 changes to re-measure from the 06/10 and 12/10 exports:** category page 1 on-topic ordering
  (efd7f71c), brand strip on categories, price hooks in 12 category meta descriptions, blog in-stock product
  block (61 articles), 25 refreshed blog bodies, 38 legacy slugs → products, Gold Standard variant canonicals,
  INP fixes (ff335d8e, 3013747c) — GSC CWV mobile INP report should start moving ~28 days after.
- `https://www.protein.tn/` still shows impressions in GSC although www → 308 → apex is correct.
  Stale on Google's side; no action.
- 5xx bucket draining after the 11–14/09 downtime (199 → 39 → 36); "Validate fix" once ~0.

---

## Baseline (GSC, 7-day windows, clicks · impr · CTR · pos)
- 7d to 19/09: 670 · 10.9K · 6.2% · 9.6 — 7d to 17/09: 690 · 11.6K · 5.9% · 9.7 — 7d to 13/09:
  760 · 13.2K · 5.8% · 10.3. Indexed 6.19K / not indexed 20K on 21/09 (noindex 12,206 before the
  index-all ratchet — expect this bucket to fall over 2–4 weeks; redirect 5,760; crawled-not-indexed
  1,255; 404 633; 5xx 36).
- Top queries: sobitas (432), protein tunisie (420), proteine tunisie (151), sobitas sousse (87).
