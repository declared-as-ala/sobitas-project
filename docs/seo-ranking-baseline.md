# SEO ranking baseline — protein.tn

**Baseline date (T0): 23 September 2026.** This file freezes the state of the commercial clusters at
the moment the architecture change deployed, so that in 7 / 14 / 28 days we can say *what* moved, not
just *that* something moved.

It is a **measurement instrument, not a work log.** Nothing here changes the site. While this file is
being filled in over the next four weeks the architecture is frozen: no URL, taxonomy parent,
canonical, index/noindex rule, title sweep, redirect or schema change, unless a real bug is found.

---

## 0. How to read the numbers (the one thing that matters)

A Search Console **query position is an average over every protein.tn URL that appeared for that
query.** It is not the position of the page we want to rank. On this site the two disagree hard,
because our own blog posts outrank our own category pages:

- `creatine tunisie` — query-average **9.1** (28 d). But that averages three blog posts at 18–27
  **and** `/creatine`, and the owner page `/creatine` sits at **22.2** page-level. The 9.1 is a
  mirage; the 22.2 is the number the architecture change is trying to move.

So every cluster table below carries **two** positions:

| column | source | meaning |
|---|---|---|
| **Pos (query-avg)** | `Queries.csv` | GSC's blended number — the headline, and the misleading one |
| **Pos (owner URL)** | `Pages.csv`, or a per-query Pages-breakdown measured this session | where the page we *want* to win actually sits |

When the two are far apart, cannibalisation is the story and the owner-URL column is the truth.
**Always re-check the owner-URL number, never act on the query average.**

---

## 1. Data provenance — what is real, what needs import

| value | status at T0 |
|---|---|
| Pos (query-avg), impressions, clicks, CTR — **28 d & 3 m** | ✅ **real**, from `protein.tn/2026-09-22-28d/` and `2026-09-22-3m/` (exported 22/09/2026) |
| Pos (owner URL), page-level | ✅ **real** where the owner URL appears in `Pages.csv`; `⟨import⟩` where a per-query Pages breakdown is needed |
| Ranking URL per query | ✅ where measured live this session (cited); `⟨import⟩` otherwise — a standard CSV export does not cross-tab query × page |
| conversions / revenue | ⟨import⟩ **everywhere** — not exposed to this session; comes from the backend orders join or GA4, not GSC |
| +7 / +14 / +28 columns | empty by design — fill from a fresh export on those dates |

> The 22/09 export is **one day before** T0. It is the correct "before" snapshot: it predates the
> 23/09 deploy, so nothing in it reflects the architecture change. Do **not** overwrite these
> columns — they are the control.

**To refill on a measurement date:** GSC → Performance → set the date range → export → drop the CSVs
into `protein.tn/<YYYY-MM-DD>-28d/`, then re-run the extractor noted in §10 and paste into the
`+N days` columns. For the owner-URL / ranking-URL columns, filter GSC by the query and open the
**Pages** tab before writing anything down.

---

## 2. Deployment changelog (what T0 is measuring the effect of)

All three deployed to production on **23 September 2026** (frontend deploy green, ~8 min). No URL
changed in any of them — a slug in the taxonomy config *is* its URL.

| commit | time (UTC+1) | change | affected surface |
|---|---|---|---|
| `4b465dba` | 09:26 | **Architecture** — one declared category tree (`catalogTaxonomy.ts`) read by the header, rayon pages, breadcrumbs (JSON-LD + visible + every PDP + both crawler views), related rails and the sitemap | every page's global nav; all 56 taxonomy URLs' breadcrumbs; `/glutamine`, `/hmb` re-parented under Acides aminés; brand pages say "Marques" |
| `4b465dba` | 09:26 | **Robots fix** — `nothingBuyableHere` now consults `protectedByTraffic` | `/caseine`, `/barres-proteinees`, `/hmb`, `/mineraux`, `/articulations`, `/cla` returned from `noindex` → `index, follow` |
| `4b465dba` | 09:26 | **Sitemap** — `nav:false` shelves withheld from `listings.xml` | `/probiotiques`, `/digestion`, `/immunite`, `/post-workout`, `/vetements`, `/glucides-energie` + 4 others no longer submitted-while-noindex |
| `e9a460f0` | 10:16 | **Content** — whey intro 823→119 w, gainer 1,417→122 w; amino children each own one term; fat-loss body de-duplicated (`/cla`, `/perte-de-poids` given own files); whey comparison table (human + crawler); fabricated FAQ facts corrected | `/whey-proteine`, `/mass-gainers`, `/prise-de-masse`, `/acides-amines` + 7 amino children, `/bruleurs-de-graisse`, `/cla`, `/perte-de-poids`, `/glucides` |
| `0082aad8` | 10:17 | **Docs** — changelog entry only, no site effect | — |

**Measurement windows to compare:**
`BEFORE` = this file (22/09 export) · `+7 d` = 30/09/2026 · `+14 d` = 07/10/2026 · `+28 d` = 21/10/2026.
Google's own guidance: some effects show in days, site-level reassessment takes weeks. Do not read
+7 as final.

---

## 3. Owner actions that must land BEFORE re-requesting indexing

Measuring while a live-false fact is still cached measures the wrong page. These are owner-only
(none is a code change; they are all outside the frozen repo) and gate the "tell Google" step:

1. **`/creatine` "à partir de 29 DT" → real floor.** Confirmed live in the FAQPage JSON-LD on
   `/creatine`, and confirmed **CMS-only** — the sole repo hit is a comment, and `creatine.json`'s
   price FAQ already avoids a hard number. Fix in Filament (category SEO / FAQ field). Real floor
   measured 23/09 ≈ **59 DT**. Ideal is a derived `minimumCurrentPurchasablePrice(creatine)` (a
   future code batch, held until after this manual fix), but the urgent step is the CMS edit.
2. **Google Business Profile website: `www.protein.tn` → `https://protein.tn/`.** The `www` host
   took 50 clicks / 1,969 impressions @5.08 in the 28-day export — real traffic to the wrong host.
3. **The authenticity claim.** "importation officielle, jamais de contrefaçon" ships on ≥3 shelves
   (bcaa, glutamine, pre-workout) and is attested nowhere on the site. Keep only if documentable;
   otherwise soften to something factual (e.g. "Produits sélectionnés auprès de fournisseurs
   identifiés"). This session did **not** touch those three (pre-existing copy).
4. **Stock on the money categories.** `/whey-proteine` 168 catalogue / 13 buyable; `/caseine`
   14 / 0. The categories we rank hardest for must be the ones a Google visitor can buy from.

**Then, and only then:** GSC → URL Inspection → Request indexing for a *small* set —
`/`, `/creatine`, `/whey-proteine`, `/prise-de-masse`, `/pre-workout`, `/bcaa`, `/barres-proteinees`
— and confirm the sitemap is submitted. Repeated requests for the same URL do not speed anything.

---

## 4. Cluster: Creatine — owner `/creatine`

Owner `/creatine` page-level: **22.2** (28 d, 2 c / 204 i) · **24.1** (3 m, 9 c / 730 i).

| keyword | owner URL | ranking URL (measured) | Pos query-avg 28d | Pos owner 28d | Impr 28d | Clicks 28d | CTR 28d | conv/rev | Δ vs T0 |
|---|---|---|--:|--:|--:|--:|--:|--|--|
| creatine | /creatine | ⟨import⟩ | 63.9 | 22.2 | 25 | 0 | 0% | ⟨import⟩ | baseline |
| créatine | /creatine | ⟨import⟩ | 63.9¹ | 22.2 | 25¹ | 0 | 0% | ⟨import⟩ | baseline |
| creatine tunisie | /creatine | blog 18.5–27.3 take the clicks; /creatine ~64 (measured 22/09) | 9.1 | ~64² | 8 | 0 | 0% | ⟨import⟩ | baseline |
| creatine monohydrate | /creatine | ⟨import⟩ | 66.7 | ⟨import⟩ | 6 | 0 | 0% | ⟨import⟩ | baseline |
| creatine monohydrate tunisie | /creatine | ⟨import⟩ | 36.7 | ⟨import⟩ | 15 | 1 | 6.67% | ⟨import⟩ | baseline |
| creatine prix tunisie | /creatine | ⟨import⟩ | 16.9 | ⟨import⟩ | 7 | 3 | 42.86% | ⟨import⟩ | baseline |
| optimum nutrition creatine tunisie | /creatine (or PDP) | ⟨import⟩ | 10.7 | ⟨import⟩ | 14 | 0 | 0% | ⟨import⟩ | baseline |
| meilleure creatine tunisie | /creatine | ⟨import⟩ | — (3m: 23.0) | ⟨import⟩ | 0 | 0 | — | ⟨import⟩ | baseline |

¹ GSC folds `créatine`/`creatine` under one accent-normalised row. ² per-query Pages breakdown
measured this session, not in the CSV. 3-month context: `creatine tunisie` 26.3 query-avg, 1 c / 53 i.

**Watch:** does `/creatine` (owner-URL pos) climb from 22 toward the blog posts at 18–27, and do the
supporting blog posts hold their clicks while the owner gains? That is the cannibalisation unwinding.

---

## 5. Cluster: Whey — owner `/whey-proteine`

Owner `/whey-proteine` page-level: **24.7** (28 d, 8 c / 761 i) · **31.1** (3 m, 12 c / 1,169 i).
This is the biggest gap on the site — the page sits at 24.7 while two blog posts hold 12.5–13.9.

| keyword | owner URL | ranking URL (measured) | Pos query-avg 28d | Pos owner 28d | Impr 28d | Clicks 28d | CTR 28d | conv/rev | Δ vs T0 |
|---|---|---|--:|--:|--:|--:|--:|--|--|
| whey | /whey-proteine | ⟨import⟩ | 57.0 | 24.7 | 14 | 0 | 0% | ⟨import⟩ | baseline |
| whey tunisie | /whey-proteine | ⟨import⟩ | 15.8 | 24.7 | 107 | 0 | 0% | ⟨import⟩ | baseline |
| whey protein tunisie | /whey-proteine | blog /whey-proteine-pas-cher 13.9, /whey-protein-en-tunisie 12.5 take 9/13 clicks; owner 34 (measured 22/09) | 15.7 | ~34² | 346 | 13 | 3.76% | ⟨import⟩ | baseline |
| whey proteine tunisie | /whey-proteine | ⟨import⟩ | 12.0 | ⟨import⟩ | 6 | 0 | 0% | ⟨import⟩ | baseline |
| whey prix tunisie | /whey-proteine | ⟨import⟩ | 10.6 | ⟨import⟩ | 5 | 0 | 0% | ⟨import⟩ | baseline |
| whey isolate tunisie | /whey-isolate | ⟨import⟩ | 17.4 | 51.1³ | 7 | 0 | 0% | ⟨import⟩ | baseline |
| gold standard whey tunisie | PDP / /whey-proteine | ⟨import⟩ | 10.7 | ⟨import⟩ | 51 | 0 | 0% | ⟨import⟩ | baseline |
| proteine whey tunisie | /whey-proteine | ⟨import⟩ | 10.7 | ⟨import⟩ | 6 | 0 | 0% | ⟨import⟩ | baseline |

² measured live 22/09. ³ `/whey-isolate` page-level (own row). 3-month: `whey protein tunisie`
56 c / 1,894 i @11.7 — the single largest commercial term the whey family touches.

**Watch:** `/whey-proteine` owner-URL pos 24.7 → toward 12; the two protected blog posts must keep
their clicks (they were retargeted, not weakened). The new whey comparison table may lift CTR.

---

## 6. Cluster: Mass Gainer — owner `/mass-gainers`

Owner `/mass-gainers` page-level: **32.1** (28 d) · **42.9** (3 m). `/prise-de-masse` (the rayon,
now the method page): 58.4 / 55.6 — deliberately *not* competing for the product term.

| keyword | owner URL | ranking URL (measured) | Pos query-avg 28d | Pos owner 28d | Impr 28d | Clicks 28d | CTR 28d | conv/rev | Δ vs T0 |
|---|---|---|--:|--:|--:|--:|--:|--|--|
| mass gainer tunisie | /mass-gainers | split: /mass-gainers 51, /prise-de-masse 54, /gainers-proteines 53 (measured 22/09) | 56.1 | 32.1 | 55 | 0 | 0% | ⟨import⟩ | baseline |
| mass gainer prix tunisie | /mass-gainers | ⟨import⟩ | 63.3 | ⟨import⟩ | 20 | 0 | 0% | ⟨import⟩ | baseline |
| mass gainer | /mass-gainers | ⟨import⟩ | 58.0 | 32.1 | 57 | 0 | 0% | ⟨import⟩ | baseline |
| serious mass tunisie | blog + PDP | /blog/mass-gainer-prix... @4.6 (protected) | 14.4 | ⟨import⟩ | 89 | 3 | 3.37% | ⟨import⟩ | baseline |
| prise de masse tunisie | /prise-de-masse | ⟨import⟩ | — (0 impr) | 58.4 | 0 | 0 | — | ⟨import⟩ | baseline |
| gainer tunisie | /mass-gainers | ⟨import⟩ | — (0 impr) | — | 0 | 0 | — | ⟨import⟩ | baseline |

**Watch:** the three-way split (51/54/53) should collapse toward `/mass-gainers` as the only owner;
`/gainers-proteines` keeps its earning PDPs (never 301'd).

---

## 7. Cluster: Pre-workout — owner `/pre-workout`

Owner `/pre-workout` page-level: **13.5** (28 d, 6 c / 155 i) · **9.8** (3 m, 19 c / 1,246 i) — one
of the healthier owner pages already.

| keyword | owner URL | ranking URL (measured) | Pos query-avg 28d | Pos owner 28d | Impr 28d | Clicks 28d | CTR 28d | conv/rev | Δ vs T0 |
|---|---|---|--:|--:|--:|--:|--:|--|--|
| pre workout | /pre-workout | ⟨import⟩ (383 i, likely PDP mix) | 7.0 | 13.5 | 393 | 0 | 0% | ⟨import⟩ | baseline |
| pre workout tunisie | /pre-workout | ⟨import⟩ | 41.4 | 13.5 | 7 | 0 | 0% | ⟨import⟩ | baseline |
| preworkout tunisie | /pre-workout | ⟨import⟩ | — (3m 29.4) | ⟨import⟩ | 0 | 0 | — | ⟨import⟩ | baseline |
| c4 tunisie | PDP | ⟨import⟩ | — (0 impr) | — | 0 | 0 | — | ⟨import⟩ | baseline |

Note `pre workout` 393 i @7.0 with 0 clicks — high impressions, no clicks: a title/snippet or intent
question for SERP-stage work (§9), not architecture.

---

## 8. Cluster: BCAA — owner `/bcaa`

Owner `/bcaa` page-level: **12.7** (28 d, 0 c / 26 i) · **17.2** (3 m, 1 c / 82 i). Now a declared
child of `/acides-amines` (hub 10.7, 4 c / 42 i).

| keyword | owner URL | ranking URL (measured) | Pos query-avg 28d | Pos owner 28d | Impr 28d | Clicks 28d | CTR 28d | conv/rev | Δ vs T0 |
|---|---|---|--:|--:|--:|--:|--:|--|--|
| bcaa | /bcaa | ⟨import⟩ | — (3m 50.2) | 12.7 | ⟨import⟩ | 0 | — | ⟨import⟩ | baseline |
| bcaa tunisie | /bcaa | ⟨import⟩ | — (3m 19.6) | ⟨import⟩ | ⟨import⟩ | ⟨import⟩ | — | ⟨import⟩ | baseline |
| bcaa prix tunisie | /bcaa | ⟨import⟩ | — (3m 21.2) | ⟨import⟩ | ⟨import⟩ | 0 | — | ⟨import⟩ | baseline |
| acides amines tunisie | /acides-amines | ⟨import⟩ | — (0 impr) | 10.7 | 0 | 0 | — | ⟨import⟩ | baseline |
| eaa tunisie | /eaa | ⟨import⟩ | — (0 impr) | ⟨import⟩ | 0 | 0 | — | ⟨import⟩ | baseline |

BCAA barely registers in 28 d (mostly 3-month tail). Its clearest T0 signals are 3-month; watch
whether the re-parenting under `/acides-amines` lifts the whole amino cluster together.

---

## 9. Cluster: Protein (family / homepage) — owner `/` (homepage), hub `/proteines`

**Do not build a category to compete with the homepage here.** The homepage owns the head term and
must keep it.

| keyword | owner URL | ranking URL (measured) | Pos query-avg 28d | Pos owner 28d | Impr 28d | Clicks 28d | CTR 28d | conv/rev | Δ vs T0 |
|---|---|---|--:|--:|--:|--:|--:|--|--|
| protein tunisie | / | homepage takes 125 of 127 clicks @5.5 (measured 22/09) | 12.7 | **5.5**² | 687 | 127 | 18.49% | ⟨import⟩ | baseline |
| proteine tunisie | / | homepage (22 of 28 clicks, measured 22/09) | 16.1 | ⟨import⟩² | 152 | 7 | 4.61% | ⟨import⟩ | baseline |
| proteines tunisie | /proteines | ⟨import⟩ | 6.9 | 19.1³ | 15 | 2 | 13.33% | ⟨import⟩ | baseline |
| proteine sousse | / | local | 1.3 | ⟨import⟩ | 30 | 3 | 10% | ⟨import⟩ | baseline |
| complement alimentaire tunisie | / or /shop | ⟨import⟩ | 8.2 | ⟨import⟩ | 61 | 0 | 0% | ⟨import⟩ | baseline |

² per-query Pages breakdown measured this session; the homepage's **all-query** page-level average
is 8.26 (28 d). ³ `/proteines` rayon page-level: 19.1 (28 d, 19 c / 1,353 i). The rayon routes to
the types now; watch it **not** cannibalise the homepage on `protein/proteine tunisie`.

---

## 10. Important brands (own no category head term; anchor authority here)

Brand pages are a primary ranking surface and stay at the root (no `/brand/` move). `/optimum-nutrition`
is the 3rd best page on the site (47 c / 1,614 i, 28 d).

| keyword | owner URL | Pos query-avg 28d | Pos 3m | Impr 28d | Clicks 28d | CTR 28d | conv/rev | Δ vs T0 |
|---|---|--:|--:|--:|--:|--:|--|--|
| optimum nutrition | /optimum-nutrition | 5.2 | 5.5 | 518 | 7 | 1.35% | ⟨import⟩ | baseline |
| optimum nutrition tunisie | /optimum-nutrition | 7.9 | 9.3 | 105 | 8 | 7.62% | ⟨import⟩ | baseline |
| muscletech tunisie | /muscletech | 5.6 | 6.9 | 24 | 6 | 25% | ⟨import⟩ | baseline |
| dymatize tunisie | /dymatize | 3.8 | 5.4 | 15 | 3 | 20% | ⟨import⟩ | baseline |
| ostrovit tunisie | /ostrovit | 6.9 | 7.3 | 18 | 0 | 0% | ⟨import⟩ | baseline |
| biotech usa tunisie | /biotech-usa | 10.0 | 10.3 | 4 | 0 | 0% | ⟨import⟩ | baseline |
| real pharm tunisie | /real-pharm | — (0 impr 28d) | ⟨import⟩ | 0 | 0 | — | ⟨import⟩ | baseline |

---

## 11. Site totals (whole-site control row)

From the 28-day export (`Pages.csv` sum) and the homepage row — the denominator any per-cluster move
should be read against:

| metric | 28 d (to 22/09) | 3 m (to 22/09) |
|---|--:|--:|
| total clicks (sum of Pages.csv) | 2,217 | 5,368 |
| total impressions | 46,071 | 142,949 |
| homepage `/` clicks / impr / pos | 508 / 5,580 / 8.26 | 1,815 / 23,996 / 8.72 |
| `www.protein.tn` (wrong host) | 50 / 1,969 / 5.08 | ⟨import⟩ |

> The `www` row is item 3.2 above: real traffic leaking to a host the GBP link points at.

---

## 12. Refresh procedure (so a future session reproduces this exactly)

1. GSC → Performance → Search results → date range (28 d, then 3 m) → **Export** → Google Sheets/CSV.
2. Save into `protein.tn/<YYYY-MM-DD>-28d/` and `-3m/` (same layout as `2026-09-22-*`).
3. Query-level numbers: re-run the extractor used for this baseline —
   ```
   cd protein.tn && python - <<'PY'
   # normalise accents/case, look up each target keyword in Queries.csv (28d + 3m)
   PY
   ```
   (accent- and case-insensitive match; the exact script is in this session's history).
4. Owner-URL / ranking-URL positions: in GSC, filter by the query, open the **Pages** tab, read the
   owner URL's row. Do **not** take these from `Queries.csv` — it has no page dimension.
5. Live sanity spot-check with a Googlebot UA (no login needed):
   ```
   curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1)" https://protein.tn/creatine \
     | grep -oE '<meta name="robots"[^>]*>|Acides aminés'
   ```
6. Paste into the `+7 / +14 / +28` columns; never overwrite the T0 columns.
7. conversions/revenue: join backend orders to landing URL, or GA4 → Acquisition → Landing page.
   Not available from GSC.

---

## 13. What NOT to do while this is filling in

Frozen for ~2–3 weeks (until +28 d is measured), unless a real bug appears:
URL structure · taxonomy parents · canonical strategy · index/noindex rules · category title sweeps ·
redirect architecture · schema. The experiment is only valid if the page doesn't move under it.

The next code batch, when the freeze lifts, is **dynamic commercial facts** — derive prices, counts
and stock from the catalogue instead of hard-coding them, so the "29 DT" class of problem cannot
return. Held until after the manual CMS fix (§3.1).
