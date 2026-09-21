# Protein.tn — SEO backlog (prioritized)

The cloud routine reads this every morning, picks the highest-value item it can finish today,
lands it, then updates this file. `PLAYBOOK.md` says how; `KEYWORDS.md` says what to rank for.

Legend: `[ ]` open · `[~]` in progress · `[x]` done (one line of what shipped) · `(needs: owner)`
= cannot be done from the repo (DB row, Google account, credentials) — say it in the run summary.

**State on 21/09/2026 (owner session, all live):** every published product is `index, follow`
(11,368/11,368, 0 noindex — owner decision, thin pages included); sitemap 11,367 product URLs;
all 51 category JSONs render their titles; every product `<title>`/description humanized by
`productMetaDescription.ts`; 33,408 backlog reviews published (stars stay attested-only, so GSC
"missing aggregateRating" is expected); daily index ratchet + weekly review drip scheduled on the
VPS. The old local agent's SQL scripts live on the owner's PC (`seo-agent/sql/`, gitignored) —
from the cloud, express DB changes as Filament actions / artisan commands / `resources/seo` JSON.

---

## P0 — land what is already written but never reached main

- [ ] **Salvage PR #222 (`origin/seo/daily-2026-09-19`) + #223 (`origin/seo/daily-2026-09-21`).**
  `git fetch origin seo/daily-2026-09-19 seo/daily-2026-09-21`, then cherry-pick BY FILE onto
  today's branch (`git checkout origin/seo/daily-2026-09-21 -- <path>`), gate, ship:
  1. `frontend/content/categories/barres-proteinees.json` (16/09 "protein bar chocolate" page —
     52 impr/7d at pos 9.8, 0 clicks; live page is 177 words with the generic title) — take it.
  2. `frontend/content/categories/omega-3.json` from #223 (re-targeted to "omega 3 tunisie / prix
     omega 3 tunisie", real `bestProductSlugs`) — take it; verify every slug in it exists in
     `https://protein.tn/sitemaps/products-0.xml`.
  3. `frontend/src/util/productUrl.ts` + `app/(shop)/[slug]/[productSlug]/page.tsx` +
     `app/(shop)/category/[slug]/page.tsx` + `app/x-crawler/product/[...slug]/page.tsx` +
     `util/sitemapSources.ts` (19/09: folds the category segment to lowercase — fixes the
     infinite redirect loop on the 33 `/Intra-Workout/…` URLs GSC reports as "Redirect error").
     Read the diff first; if main's versions of the two route files moved, re-apply by hand.
  4. `filament/app/Filament/Resources/CategResource.php`, `SousCategoryResource.php` (slug
     lowercased on save) and `filament/config/catalog.php` — take them if the diff is only that.
  5. Do NOT take `productMetaDescription.ts`, `resolveCategorySeo.ts`, `SeoProductsRobotsAudit.php`,
     `LegacyProductPage.php` from the branch — main superseded them on 21/09 (curated list
     removed, humanizer added, `--force`). Compare before deciding anything else.
  After landing: `content/categories/Intra-Workout.json` never loads on prod (case-sensitive
  loader) — rename to `intra-workout.json` in the same run if its copy is fine.

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
  ranking blog posts — blog HTML is in the DB, so record the needed links as `(needs: owner)` until
  a `blog:apply-links` command exists (P2 below).
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

- [ ] **`blog:apply-links` artisan command** (mirror of `seo:products-apply-copy`): a JSON of
  `{slug: {append_html, links: [{anchor, href}]}}` applied to blog articles, so cannibalisation
  fixes and internal linking stop needing the owner. Add `blog-links-dry-run/apply` to vps-run.
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
