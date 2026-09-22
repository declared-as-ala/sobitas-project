# Protein.tn — SEO backlog (prioritized)

The cloud routine reads this every morning, picks the highest-value item it can finish today,
lands it, then updates this file. `PLAYBOOK.md` says how; `KEYWORDS.md` says what to rank for.

Legend: `[ ]` open · `[~]` in progress · `[x]` done (one line of what shipped) · `(needs: owner)`
= cannot be done from the repo (DB row, Google account, credentials) — say it in the run summary.

**State on 22/09/2026:** the URL-case contract, the bars category page and the omega-3 retarget
shipped on `claude/seo-daily-2026-09-22` (see `log/2026-09-22.md`); live audit 65 URLs, 0 P0.

**State on 21/09/2026 (owner session, all live):** every published product is `index, follow`
(11,368/11,368, 0 noindex — owner decision, thin pages included); sitemap 11,367 product URLs;
all 51 category JSONs render their titles; every product `<title>`/description humanized by
`productMetaDescription.ts`; 33,408 backlog reviews published (stars stay attested-only, so GSC
"missing aggregateRating" is expected); daily index ratchet + weekly review drip scheduled on the
VPS. The old local agent's SQL scripts live on the owner's PC (`seo-agent/sql/`, gitignored) —
from the cloud, express DB changes as Filament actions / artisan commands / `resources/seo` JSON.

---

## P0 — verified fix plan (22/09/2026 diagnosis; each item names the exact surface)

- [ ] **Bot/human parity on money categories (cloaking exposure).** ~350–500 words (the
  "Prix de la créatine en Tunisie" section) render only for bot UAs:
  `frontend/src/app/components/CategorySeoLanding.tsx` L112–114 clamps the human intro to 520
  chars and L183 drops it when a guide exists, while `CrawlerCategoryView.tsx` prints it whole.
  Make the two views textually identical (render the full intro to humans, or drop the bot-only
  text) and gate with a bot-vs-Chrome visible-word diff = 0 on /creatine, /whey-proteine,
  /mass-gainers, /pre-workout. Then (this week) exempt category routes from the bot rewrite in
  `frontend/src/middleware.ts` ~L940–1032 — the human route already SSRs H1 + grid + guide + FAQ;
  the "prerendered HTML is a skeleton" comment at ~L1020 is stale. (middleware.ts is on the land
  workflow's forbidden list: that half is `(needs: owner)` — write the exact diff in the log.)
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
- [ ] `(needs: owner)` **Stock is the ceiling** on several rows: creatine 8/221 in stock, no 1 kg
  creatine, no 500 g whey, glutamine 1 SKU, BCAA 2, brûleurs 2, omega-3 3 — "creatine tunisie
  1kg" and "whey protein 500g prix tunisie" have no product to land on. Purchasing.
- [ ] `(needs: owner)` **Weekly Google.tn check** — 10 queries from the owner's Chrome
  (`hl=fr&gl=tn&pws=0`) pasted into `seo-agent/log/` until the GSC credential exists; it is the
  only non-GSC source that is actually Google Tunisia.

## P0 — land what is already written but never reached main

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

- [ ] **Product FAQ + guide on the watchlist products that have none** (audit-live P1 on 21/09):
  Ostrovit creatine, ISO 100 Dymatize, Nitro-Tech Whey Gold, C4 Original. Write
  `filament/resources/seo/products/<date>.json` entries (README there), queue `seo-copy-apply`.
  Then extend to every in-stock product in `KEYWORDS.md` "Product-name SERPs".
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

- [ ] **323 duplicate product URL pairs** `(needs: owner)` — found 22/09, evidence in
  `seo-agent/data/duplicate-product-slugs.json`. A slug ending in `-<5+ digits>` whose stem is
  also a published product; both members answer 200 and are self-canonical (duplicate content),
  and on `/barres-proteinees` the suffixed member is priced 54 DT while the stem is 117–169 DT
  for the same bar — **two prices for one product**. Concentrated in vitamines (86), antioxydants
  (58), sommeil-stress (54), plantes-et-herbes (20), boosters-hormonaux (18). Per pair: keep one,
  Filament Redirections row (301) on the other. The routine never picks the survivor or touches a
  price — owner's call which SKU is real.
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
