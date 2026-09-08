# protein.tn — Keyword & SERP Opportunity Map

**Date:** 08/09/2026
**Sources:** SemRush TN exports of 08/09/2026 (`gap.keywords` 316 kw, `Positions` 362 kw, `PagesV3` 192 pages, `backlinks_matrix`, `overview-trend`), plus live crawler-view fetches of 30 production URLs with a Googlebot UA and `?__crawler=1`.
**Scope:** research only. No application code was changed by this document.

---

## 0. The one number

Take the 316 keywords in the gap file (178,550 combined monthly volume). Count where each site's **top-20 entry comes from a commercial surface** — a category page, a brand page or a product page — versus the homepage or a blog post.

| Site | top-20 entries | category | brand | product | homepage | blog |
|---|---|---|---|---|---|---|
| **protein.tn** | 58 | **9 (cat+brand combined)** | — | 8 | **17** | **24** |
| housenutrition.tn | 118 | 35 | 23 | 51 | 8 | 0 |
| nutribeast.tn | 150 | 66 | 23 | 54 | 7 | 0 |
| protein-shop-tunisia.tn | 46 | 7 | 0 | 26 | 13 | 0 |
| body-shop.tn | 43 | 0 | (in product) | 38 | 5 | 0 |

Of our 58 top-20 entries, **41 (71%) come from the homepage or the blog**, carrying 30,340 of the 36,380 volume. Nine come from a category or brand page. Neither competitor has a single blog post in their top-20 set.

Top-10 coverage: nutribeast 113 keywords / 60,720 volume. housenutrition 77 / 43,430. **protein.tn 19 / 8,330.**

That is the whole diagnosis in one table. The site does not lack authority (357 referring domains vs housenutrition's 96) and it does not lack content (the category guides run 1,500–2,200 rendered words with valid `FAQPage`, `CollectionPage`, `ItemList` and `BreadcrumbList`). **It lacks commercial pages that Google has been given a reason to rank.** Every action below is a variant of "hand the query to the page that can sell it".

Also worth naming: the owner's mental model is anchored on housenutrition, but **nutribeast is the larger problem** — 113 top-10 keywords to housenutrition's 77, and 6,902 modelled daily traffic vs housenutrition's 2,803 and our 1,237 (`overview-trend`, 08/09/2026).

---

## 1. Premises that were wrong

Several premises in the brief do not survive the data. Correcting them changes what to do.

### 1.1 "`/pre-workout` … still ranks nothing"

**Wrong.** `/pre-workout` ranks **position 24 for `pre workout tunisie`** (320 vol, KD 7, commercial intent). It ranks nothing only for the bare head term `pre workout` (720, KD 15), which is the SemRush top-100 cutoff rather than an absence of indexing.

The live page is healthy and this was checked, not assumed:

```
/pre-workout?__crawler=1   HTTP 200   robots: index, follow
canonical https://protein.tn/pre-workout   (self, correct)
2,093 rendered words, 14 H2s, 24 products
JSON-LD: Organization/OnlineStore, LocalBusiness, WebSite, BreadcrumbList,
         CollectionPage, ItemList(24), FAQPage with 13 questions, 6× Product
present in /sitemaps/listings.xml
inbound from /proteines, /whey-proteine, /creatine, /glutamine, /prise-de-masse
```

So the anomaly is real but it is not the anomaly described. Two things actually explain it, and both are checkable:

1. **We compete with ourselves.** `/performance` also ranks for `pre workout tunisie`, at position 47. `/performance` is a 914-word hub whose first three H2s are "Avant la séance / Pendant la séance / Après la séance" and it links to `/pre-workout`, `/bcaa`, `/creatine`, `/beta-alanine`, `/citrulline`, `/eaa`, `/post-workout`, `/Intra-Workout`. It is a second door on the same intent.
2. **Depth, not schema.** nutribeast's `/pre-workout` — which ranks 2 for the head term — was fetched and measured: **5,311 words**, 33 H2s, 8 H1s, and **zero JSON-LD of any kind**. No `FAQPage`, no `Product`, no `ItemList`. Their advantage is not markup; we beat them on markup comprehensively. Their page carries a full editorial paragraph for *each* listed product ("Preworkout Inferno Stim Free GSN – Énergie & focus sans…", "Activation extrême. Congestion maximale…"). Ours lists 24 products as cards with no prose. They have 2.5× our body text and it is all on-topic.

The same holds for glutamine: nutribeast `/l-glutamine` is **3,310 words, no JSON-LD**, ranks 5 for `glutamine` (720, KD 15). Our `/glutamine` is 1,204 words with `FAQPage`(8) and ranks **13 for `glutamine tunisie`** (260, KD 7) — again, not nothing.

**Conclusion: structured data is not the lever on these two pages. Per-product editorial copy on the category page is.**

### 1.2 "`/mass-gainers` reads the thin `mass-gainers.json`"

**Wrong on "thin".** `mass-gainers.json` is 1,015 words with **10** FAQ entries — *more* FAQs than `mass-gainer.json`'s 8. Live, after the CMS merge, `/mass-gainers` renders **1,496 words with a 14-question `FAQPage`**. It is not a thin page. See §4 for what the real problem is.

### 1.3 "Five brand pages went from ~200 to ~1,000 words"

**At least six are enriched, and none reached 1,000.** Measured live tonight:

| brand page | words | FAQPage |
|---|---|---|
| `/muscletech` | 851 | 6 Q |
| `/optimum-nutrition` | 828 | 6 Q |
| `/biotech-usa` | 780 | 6 Q |
| `/ostrovit` | 762 | 6 Q |
| `/kevin-levrone` | 738 | 6 Q |
| `/dymatize` | 506 | 4 Q |

Everything else is bare. This matters because §5 turns on exactly which brand pages are still bare.

### 1.4 "`protein tunisie` … position 9"

Incomplete, in a way that halves the value. The export has **two rows**: position **1 with `Position Type = AI overview`** carrying 82 of the 88 modelled visits, and position **9 organic** carrying 6. We are already the cited source in the AI Overview for this query. Moving the organic row from 9 to 5 is worth far less than "position 9 on a 720-volume keyword" suggests, because the click has largely already been captured.

### 1.5 "`protéine cheveux` (1300, KD 11, position 14)" — real, but a trap

Position and volume are correct. What the export also says is that the SERP carries **Image pack, Video, Video Carousel, Short videos, People also ask, AI overview** and the intent is **informational**. A text result at 14 in that SERP is far below the visible fold, which is why the page earns **1 modelled visit** at position 14 and another **1** at position 18. And the buying intent behind "protéine cheveux" is cosmetic (keratin treatments, shampoo), not sports nutrition; our own `/beaute-cheveux` category sits at 81 for it. High volume, near-zero convertible value. **Ranked low deliberately below.**

### 1.6 The export carries no movement data

In all 362 rows of the Positions export, `Previous position` is **identical** to `Position`. This snapshot cannot show whether tonight's consolidation moved anything. Any claim that a change "worked" needs a fresh pull, not this file.

---

## 2. Priority-ranked actions

Ranked by realistic value — volume × commercial intent × how mechanical the fix is — not by raw volume.

### P1 — Point the commercial-intent Tunisian queries at the commercial pages

**The pattern, stated as data.** On 23 keywords the homepage or a blog post outranks our own matching category page by ten or more positions. The worst offenders on **commercial** intent:

| keyword | vol | KD | our best | our category page | gap | competitor at top |
|---|---|---|---|---|---|---|
| `proteine tunisie` | 880 | 7 | **10** — `/` | `/proteines` **45**, `/whey-proteine` **58**, `/proteine-tunisie` **68** | 35 | housenutrition `/category/whey` **3** |
| `protein tunisie` | 720 | 10 | **9** — `/` (+ AI overview 1) | `/proteines` **37**, `/whey-proteine` **60** | 28 | housenutrition `/category/whey` **4** |
| `creatine monohydrate tunisie` | 480 | 4 | **16** — blog `creatine-monohydrate-tunisie-guide-d-achat` | **`/creatine` 54** | 38 | housenutrition `/category/creatine` **2** |
| `whey tunisie` | 260 | 9 | **16** — `/` | **`/whey-proteine` 55** | 39 | housenutrition `/category/whey` **1** |
| `optimum nutrition tunisie` | 260 | 4 | **16** — `/` | `/optimum-nutrition` **27** | 11 | nutribeast `/brand/optimum-nutrition` **1** |
| `proteine prix tunisie` | 140 | 6 | **13** — `/` | `/proteines` **38** — *11 of our pages compete* | 25 | — |
| `creatine tunisia` | 140 | 4 | **14** — `/` | `/creatine` **58** | 44 | — |
| `vente proteines tunisie` | 140 | 8 | **16** — `/` | `/shop` **34** | 18 | — |

**Why housenutrition wins these.** Their `/category/whey` was fetched: **1,625 words, no JSON-LD at all, 8 internal links, H1 is just "Whey protein"**. It is *weaker* than our `/whey-proteine` (2,101 words, `FAQPage` with 17 questions, 44 internal links) on every measurable content signal. What it has that we do not is **exclusivity**: it is the *only* page on housenutrition.tn answering that intent, and it answers 16 of the 316 gap keywords by itself. We answer the same intent from `/`, `/proteines`, `/whey-proteine`, `/whey-isolate`, `/proteine-tunisie`, `/pure-protein`, `/shop`, `/offres` and `/proteine-sousse`. Their title also leads with the exact query — *"Whey Protéine Tunisie | Importateur Officiel des Plus Grandes Marques"* — where ours leads with the English *"Whey Protein Tunisie"*.

**Changes, in order of effect:**

1. **Retarget the homepage anchor that currently points at a dead-end.** The homepage links `/proteine-tunisie` with anchor text **"Proteine Tunisie"** — the exact match for an 880-volume commercial keyword. `/proteine-tunisie` is a 1,169-word editorial `WebPage` with **no products, no `FAQPage`, no `CollectionPage`, and 8 internal links**; it holds 8 keywords, **0 traffic**, and its best position on that term is **68**. The site's strongest commercial anchor is being spent on its weakest commercial page. Point that anchor at `/proteines` (or `/whey-proteine`) and either fold `/proteine-tunisie` into the category page with a 301, or strip its commercial targeting and let it be a genuinely informational guide that links up.
2. **Add the missing homepage link to `/mass-gainers`.** The homepage links `/prise-de-masse` and `/gainers-proteines` but **not `/mass-gainers`** — the page Google has actually chosen (§4).
3. **Fix `/whey-tunisie` → wrong target.** `https://protein.tn/whey-tunisie` returns **308 → `/whey-isolate`**. The query `whey tunisie` (260, commercial) is a whey-protein query, not an isolate query; housenutrition ranks **1** for it with a general whey category. That redirect should land on `/whey-proteine`.
4. **Fix five pillar pages linking to a redirect.** `/whey-proteine`, `/creatine`, `/pre-workout`, `/proteines` and `/prise-de-masse` all contain a top-level link to **`/proteine-whey`**, which returns **308 → `/whey-proteine`**. Five internal links through a hop, on the five most important pages. Point them at the canonical directly.
5. **On `creatine monohydrate tunisie` specifically**, the blog at 16 and `/creatine` at 54 is the cleanest commercial-intent inversion in the file (KD 4, 480 volume). The blog post should carry a prominent commercial link to `/creatine`, and `/creatine`'s title should lead with the query — currently *"Créatine Tunisie | Monohydrate, Prix & Comparatif"*, which buries "monohydrate".

**Verify with:** re-pull Positions in 3–4 weeks and check that the *category* row for each keyword above has moved, not just the aggregate.

---

### P2 — The bare brand pages: highest ratio of volume to work in the file

We own the URLs. They are `index, follow`, self-canonical, in `/sitemaps/listings.xml`, and they list real products. They are simply empty.

| keyword | vol | KD | our page | our words / FAQ | our pos | who beats us |
|---|---|---|---|---|---|---|
| `gsn` | **2400** | 14 | `/gsn-great-sport-nutrition` | **121 / none** — H1 "Produits GSN Great Sport Nutrition", 7 products | **16** | nutribeast `/brand/gsn-…` **2**, housenutrition `/brand/gsn` **3** |
| `ostrovit` | 320 | 19 | `/ostrovit` | 762 / 6 (enriched tonight) | **absent** | nutribeast **4**, housenutrition **8**, body-shop 16 |
| `muscletech` | 390 | 16 | `/muscletech` | 851 / 6 (enriched tonight) | **absent** | nutribeast `/brand/muscletech` **3** |
| `kevin levrone` | 480 | 43 | `/kevin-levrone` | 738 / 6 (enriched tonight) | **absent** | nutribeast **4**, housenutrition 10 |
| `ultimate` | 390 | 32 | `/ultimate-nutrition` | **134 / none** | **17** | *nobody* — uncontested |
| `applied nutrition` | 210 | 13 | `/applied-nutrition` | **96 / none**, only 3 products | **13** | nutribeast **2**, body-shop 6 |
| `real pharm` | 210 | 4 | `/real-pharm` | **185 / none**, 20 products | 19 *(a product page, not the brand page)* | nutribeast 3, housenutrition 4, body-shop 9 |
| `animal pak` / `animal pak tunisie` | 320 / 170 | 9 / 5 | `/animal` | **149 / none**, 9 products | 45 / 18 *(product pages)* | nutribeast **1**, housenutrition **2/3** |
| `c4 pre workout` | 140 | 9 | `/c4-cellucor` | **279 / none**, 17 products | **absent** | nutribeast **1** |
| `optimum` | 210 | 61 | `/optimum-nutrition` | 828 / 6 (enriched) | 48 | nutribeast 6 |

**What the competitor actually does.** `housenutrition.tn/brand/gsn` was fetched: **1,002 words**, a single `ItemList` and nothing else, H1 "Gsn". It ranks 3 for a 2,400-volume keyword. That is the bar — and it is low.

**`gsn` is the single best line item in this report:** 2,400 monthly volume, KD 14, navigational intent (so intent is trivially satisfied by a brand page), we are already at 16 on **121 words**, and both competitors rank top-3 with the same page type. The six brand pages enriched tonight went from bare to ~750–850 words + a 6-question `FAQPage`; applying that same treatment to `/gsn-great-sport-nutrition`, `/ultimate-nutrition`, `/applied-nutrition`, `/real-pharm`, `/animal` and `/c4-cellucor` is the same work, already proven repeatable, against ~3,600 combined monthly volume at KD 4–32.

One caveat found while checking: `/applied-nutrition` lists **3 products** and `/gsn-great-sport-nutrition` lists **7**. A brand page with 3 SKUs will not hold a top-3 position however well it is written. Check the catalogue depth before writing the copy.

---

### P3 — Give `/pre-workout` and `/glutamine` per-product editorial copy, and close the second door

See §1.1 for the diagnosis. Two concrete changes:

1. **`/performance` should stop targeting pre-workout intent.** It ranks 47 for `pre workout tunisie` against our own `/pre-workout` at 24. Either narrow it to a pure objective hub that links down to `/pre-workout` without competing for the term (drop "Pre-Workout" from its title — currently *"Compléments Performance Tunisie | Créatine, BCAA & Pre-Workout"*), or 301 it into `/pre-workout`. It holds **3 keywords and 0 traffic**, so there is nothing to lose.
2. **Add a short editorial block per listed product** on `/pre-workout` and `/glutamine`, the way nutribeast does. Two to three sentences each on the 8–10 flagship SKUs — formula, dose count, who it suits — takes `/pre-workout` from 2,093 to roughly 2,800–3,000 words of genuinely on-topic prose without a word of filler, and it comes from real product data rather than invention. This is also the only change that plausibly reaches the bare head term `pre workout` (720, KD 15), where nutribeast's 5,311-word page sits at 2.

Same target list applies to `/citrulline` (327-word content file, we rank 65, nutribeast 5 at 390 vol) and `/l-carnitine` (we rank 51/64, nutribeast 3 at 260 vol) if this pattern proves out.

---

### P4 — `/mass-gainers` vs `/prise-de-masse`: `/mass-gainers` should win, and it needs the deeper file

**The premise was that `/mass-gainers` is thin. It is not.** Both pages were fetched live:

| | `/mass-gainers` | `/prise-de-masse` |
|---|---|---|
| content file | `mass-gainers.json` (1,015 w, 10 FAQ) | `mass-gainer.json` (1,551 w, 8 FAQ) via `CONTENT_SLUG_ALIASES` |
| rendered words | 1,496 | **2,216** |
| H2s | 7 | **15** |
| products listed | 16 | **24** |
| `FAQPage` questions | **14** | 13 |
| title | "Mass Gainer Tunisie \| Serious Mass & Prise de Masse" | "Prise de Masse Tunisie \| Gainers & Mass Gainers" |
| H1 | "Mass Gainer en Tunisie" | "Prise de Masse en Tunisie" |
| linked from homepage | **no** | yes |
| in `/sitemaps/listings.xml` | yes | yes |

`/prise-de-masse` is the deeper page and its H2s target mass-gainer intent head-on: *"Qu'est-ce qu'un mass gainer ?"*, *"Meilleurs mass gainers disponibles en Tunisie"*, *"Weight Gainer vs Lean Gainer"*. So the two pages are not "one thin, one rich" — they are two rich pages fighting over the same query.

**Google has already chosen, and it chose `/mass-gainers`:**

| evidence | `/mass-gainers` | `/prise-de-masse` |
|---|---|---|
| keywords held (PagesV3) | **9** | 2 |
| traffic | **4** | 0 |
| `mass gainer` (1600, KD 8) | **14** | not in top 100 |
| `mass gainer prix tunisie` (480, KD 4) | 57 | 85 |
| `mass gainer tunisie` (390, KD 7) | 89 | 52 |
| `mega masse` (590) | **37** | absent |
| `serious mass` (720) | **43** | absent |
| `/mass-gainer` (singular) 308-redirects to → | **`/mass-gainers`** | — |

That last row is decisive: the singular URL, which is the more natural external-link target, permanently redirects into `/mass-gainers`. External and internal signals are already pooling there.

**Recommendation — make `/mass-gainers` the winner:**

1. Add `'mass-gainers': 'mass-gainer'` to `CONTENT_SLUG_ALIASES` in `frontend/src/util/categorySeoContent.ts` so the richer 1,551-word guide serves `/mass-gainers` instead of `/prise-de-masse`. (Note: the map's existing `'mass-gainer': 'mass-gainer'` entry is dead code — that URL 308s away and never reaches the loader.)
2. Add the missing homepage link to `/mass-gainers` with a commercial anchor.
3. Rewrite `/prise-de-masse` as a genuine **objective hub** — "how to gain weight in Tunisia" — whose job is to route to `/mass-gainers`, `/gainers-proteines`, `/glucides` and `/whey-proteine`, with its own H1/title dropping "mass gainer" entirely. It already has the sub-category structure for this role (24 products, sub-categories block, 44 internal links). If that is more work than it is worth, 301 `/prise-de-masse` → `/mass-gainers`; it holds 2 keywords and 0 traffic, so the loss is nil.

**Do not do the reverse.** Promoting `/prise-de-masse` means fighting the redirect and discarding the page that holds 9 of the 11 keywords.

**A second, larger gainer problem sits behind this one.** Five separate URLs answer gainer intent: `/mass-gainers`, `/prise-de-masse`, `/gainers-proteines`, `/glucides-energie` and `/gainers-haute-energie`. On `mass gainer tunisie` (390) our four best positions are 26 (`/gainers-proteines`), 34 (product), 52 (`/prise-de-masse`), 89 (`/mass-gainers`) — four pages, none in the top 20, while housenutrition answers with **one** `/category/mass-gainer` at 3 and nutribeast with **one** `/gainers` at 5. Consolidating to two (`/mass-gainers` commercial + `/prise-de-masse` hub) is the point of the exercise.

---

### P5 — Striking distance, verified line by line

Every keyword in the brief was checked against the export. Verdicts:

| keyword | vol | KD | claimed | **actual** | verdict |
|---|---|---|---|---|---|
| `mass gainer` | 1600 | 8 | 10 blog / 14 `/mass-gainers` | **confirmed** — plus 23 (2nd blog), 40 & 87 (products) | **Winnable, but not as stated.** Intent is **informational**; SERP has AI overview + PAA + video. A blog post at 10 is *correct behaviour*, not a bug. Fix = the blog post links hard to `/mass-gainers`, and the second blog at 23 folds into the first. Do not try to make the category outrank the blog here. |
| `proteine tunisie` | 880 | 7 | 10 | **confirmed**, homepage; 8 of our pages compete (10/37/45/58/68/75/83/95) | **Best single target in the file.** Commercial intent, KD 7, and the top-10 slot is already ours — the work is consolidation, not ranking. |
| `protein tunisie` | 720 | 10 | 9 | **1 (AI overview, 82 traffic) + 9 organic**; 8 pages compete | **Overstated** — see §1.4. Real headroom is the 6 organic clicks, not 720 volume. |
| `whey protein tunisie` | 1300 | 7 | 14 | **confirmed**, homepage; `/proteines` 29, `/whey-isolate` 36, `/proteine-tunisie` 45 | **Winnable but harder than KD 7 suggests** — housenutrition holds **1** with `/category/whey` and nutribeast **5**. Intent is informational despite the "tunisie" modifier. Highest volume of the genuine targets. |
| `creatine monohydrate tunisie` | 480 | 4 | 16 | **confirmed**, blog; `/creatine` 54 | **Strong. KD 4, commercial intent, clean inversion.** Best effort:reward ratio in the striking-distance set. |
| `proteine whey prix tunisie` | 260 | 4 | 6 | **confirmed**, homepage (10 traffic) | **Winnable, low ceiling.** Already 6 on 260 volume; 6→3 is worth a handful of visits. Do it as a by-product of P1, not as its own task. |
| `serious mass tunisie` | 320 | 6 | 11 | **confirmed**, blog — *only one URL of ours ranks* | **Winnable and clean.** No internal competition at all. But **five** competitors hold 1/5/6/8 with product pages. The move is to make `/mass-gainers/serious-mass-2-7-kg` (currently 0 traffic, 2 kw) the target and link it from the blog post. |
| `protéine cheveux` | 1300 | 11 | 14 | **confirmed** (14 *and* 18, same URL); 2nd blog 31, `/beaute-cheveux` 81 | **Deprioritise** — see §1.5. Video/image-dominated SERP, informational, non-commercial buyer. Three of our pages compete for it and it produced **2 modelled visits**. |

**One the brief missed:** `gsn` — 2,400 volume, KD 14, navigational, we are at **16** with a 121-word page. Higher volume than every entry in the table above except `mass gainer`, and by far the least work (§P2).

---

### P6 — Arabic: stop, do not optimise

The brief's GSC figures (21,558 impressions, 214 clicks, 0.99% CTR, avg position 8.1; Tunisian-intent 4.17% on 264 impressions, pan-Arabic 0.84% on 4,025) are consistent with the SemRush data, which adds three facts:

1. **The whole Arabic footprint is 7 distinct keywords, 2,580 combined volume, 13 modelled visits.** Positions 1, 1, 1, 6, 7, 10, 10, 11, 13 — genuinely good rankings.
2. **Not one Arabic keyword in the TN export contains `تونس`.** `كرياتين تونس` at position 13.4 with zero clicks does not appear in SemRush at all, because its volume is below the measurement floor. The 264-impression Tunisian-intent slice *is* the entire addressable Arabic market, and 4.17% of it is roughly eleven clicks.
3. **Every Arabic ranking URL is a blog post.** There is no Arabic commercial surface, and the Arabic cluster has the same cannibalisation disease as the French one: four posts compete on `مكملات غذائية`, four on `مكمل غذائي`, three on `كرياتين`, five URLs on `بروتين`.

Look at what position 1 buys: `مكمل غذائي` (590 vol) ranks **1** and earns **1** modelled visit. `مكملات غذائية` (260) ranks **1** and earns **0**.

**What is worth doing:** almost nothing.

- **Do not** write more generic Arabic informational content. It ranks; it cannot buy. The audience is pan-Arab and protein.tn ships to Tunisia.
- **Do not** treat the 0.99% CTR as a problem to fix with better titles. Nothing is wrong with the titles — the searcher is in Cairo.
- **Do** spend one hour on hygiene: merge the four `مكملات غذائية` / `مكمل غذائي` posts into the one already ranking 1 and 301 the other three. This buys no revenue; it stops four URLs diluting one another and removes three pages from the crawl. Do it when convenient, not as a priority.
- **Do not** build Arabic category pages. The ceiling is ~50 clicks. Revisit only if Tunisia-named Arabic impressions exceed roughly 2,000/period.

The blunt version: the Arabic segment is 33 pages earning 214 clicks. The six bare brand pages in P2 address ~3,600 monthly volume of Tunisian commercial demand. Those are not comparable investments.

---

### P7 — 473 indexable near-duplicate `/shop?page=N` URLs

Not in the brief, found while checking the sitemap.

`/sitemaps/listings.xml` contains **1,107 URLs, of which 473 (43%) are `/shop?page=2` … `/shop?page=474`**. `/shop?page=300` was fetched:

```
HTTP 200   robots: index, follow
canonical  https://protein.tn/shop?page=300          (self-canonical)
title      Protéines & Compléments Alimentaires en Tunisie — Page 300 | Protein.tn
H1         Boutique — Protéines & Compléments Alimentaires en Tunisie   (identical on all 473)
words      310
```

The reasoning in `frontend/src/util/sitemapSources.ts` is sound as far as it goes — the pager showed only `{1, current±1, last}`, so page 300 was ~150 hops from anywhere and ~11,000 products sat behind an uncrawlable chain. Keeping them in the sitemap as a **crawl path** is right.

The part that does not hold is `index, follow`. These are 473 URLs sharing one H1, one meta description and one title stem, at 310 words each. Meanwhile **6,566 products are held at `noindex` by a 250-word thin-content gate.** The site applies a strict quality bar to product pages and none at all to its own pagination.

**Recommendation:** keep them in the sitemap; switch them to `noindex, follow`. Discovery is preserved in full (Google still crawls and follows every product link), and 473 near-duplicate URLs stop competing for index space. This is a one-line change to the shop page's robots meta when `page > 1`, and it is consistent with the gate already applied to products.

Worth noting for expectation-setting: `/shop` itself ranks 22 for `protein shop sousse`, 34 for `vente proteines tunisie` and 37 for `proteine tunisie`. The pager pages rank for nothing at all — none appears in the 362-row Positions export.

---

### P8 — Smaller findings, all verified

- **`/proteines` holds 15 keywords and 0 traffic.** More keywords than any page except the homepage, and every position is 21+. It is 1,883 words with a 19-question `FAQPage` and 54 internal links — a well-built page that no query reaches, because `/whey-proteine`, `/whey-isolate`, `/proteine-tunisie`, `/pure-protein` and the homepage sit in front of it on every term it targets.
- **`/brands` ranks 58 and 76 for `whey tunisie`** — two separate rows for the same URL on a commercial query. A brand index page has no business answering "whey tunisie".
- **`/equipement` ranks 16 for `boogieman tunisie`** (390, KD 5) — a brand query answered by an equipment category. housenutrition answers it with `/brand/bigman` at 8. If Boogieman/Bigman is in the catalogue, it needs a brand page; if not, this is a purchasing question like the five 404 brands.
- **`/cure-hydration` ranks 46 and 47 for `electrolytes tunisie`** (1,900 vol, KD 11) — a genuinely large keyword with a low difficulty. `/glucides` (68) and `/mineraux` (82) also compete. nutribeast holds **3** with `/isotonique-hydratation-sportive`, housenutrition **6**. Four of our pages, none in the top 40. `/cure-hydration` has no content file in `frontend/content/categories/`. Worth a P3-class fix once the higher-priority pages are done.
- **`/omega-3` cluster:** `omega 3 prix tunisie` (1,300, KD 10) → our pages at 36, 53, 93; `omega 3 tunisie` (1,000, KD 9) → 42; `omega 3` (3,600) → 41. `omega-3.json` is 464 words. nutribeast ranks 10 and 7. Another 1,500-word-guide candidate, at ~5,900 combined volume.
- **`/collagene`**: `collagène` (2,400), `collagène tunisie` (480), `collagen tunisie` (260), `collagène marin tunisie` (390) → our positions 59, 39, 50, 50. `collagene.json` is 402 words. nutribeast ranks 6 and 7 with product pages.
- **The homepage links 21 brand pages with empty anchor text** (logo carousel). Those links pass no anchor signal to exactly the pages P2 is about.
- **`/creatine-monohydrate-tunisie`** is a live 1,339-word `WebPage` (with `HealthTopicContent` schema, no `FAQPage`), linked from the homepage, in `/sitemaps/pages.xml` — and **absent from the Positions export entirely**. It is a third page competing with `/creatine` and the creatine blog post for `creatine monohydrate tunisie`, and it ranks for nothing. Fold it into `/creatine` or into the blog post.

---

## 3. What not to do

- **No link building.** 357 referring domains beat housenutrition's 96 and they outrank us. Adding domain 358 changes nothing about which of our nine pages Google should pick for "whey tunisie".
- **No `aggregateRating`, no review markup, no invented ratings.** Zero orders reach "livrée", so no attested review exists. This stays true.
- **No adding the 6,566 noindexed products to the sitemap.** The thin-content gate is correct; §P7 argues for extending the same standard to pagination, not for relaxing it.
- **No new schema on `/pre-workout` or `/glutamine`.** We already beat the pages that outrank us on every markup dimension. Adding more is measuring the wrong thing.
- **No new Arabic content.** See §P6.
- **No new blog posts in the creatine, protein, mass-gainer or hair-protein clusters.** There are already 4 creatine posts competing on `creatine` (positions 26/50/72/86), 3 on `créatine` and 3 on hair protein. Each new post subtracts from the others.

---

## 4. Sequence

| # | Action | Volume addressed | Effort |
|---|---|---|---|
| 1 | Homepage anchor `Proteine Tunisie` → `/proteines`; add `/mass-gainers` link; fix `/proteine-whey` and `/whey-tunisie` redirect targets | ~2,900 commercial | hours |
| 2 | Enrich `/gsn-great-sport-nutrition`, `/ultimate-nutrition`, `/applied-nutrition`, `/real-pharm`, `/animal`, `/c4-cellucor` to the pattern already used on `/muscletech` | ~3,600 | 1 day (repeat of proven work) |
| 3 | `/mass-gainers` takes `mass-gainer.json`; `/prise-de-masse` becomes an objective hub or 301s | ~3,100 | half a day |
| 4 | Per-product editorial blocks on `/pre-workout`, `/glutamine` (then `/citrulline`, `/l-carnitine`); narrow or retire `/performance` | ~1,700 | 1 day |
| 5 | `noindex, follow` on `/shop?page=N` for N>1 | index hygiene | one line |
| 6 | Consolidate `/proteine-tunisie`, `/creatine-monohydrate-tunisie`, duplicate creatine and mass-gainer blog posts | removes competition on ~2,300 | half a day |
| 7 | Content files for `/cure-hydration`, `/omega-3`, `/collagene` at the 1,500-word standard | ~9,300 (higher KD, longer payback) | 2 days |

---

## Appendix — how every live claim here was checked

```bash
UA='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

# crawler view of any page (production caches by URL; the rewrite is invisible to the CDN)
curl -s -H "User-Agent: $UA" 'https://protein.tn/pre-workout?__crawler=1'

# redirect target
curl -s -o /dev/null -D - -H "User-Agent: $UA" 'https://protein.tn/whey-tunisie' | grep -i '^location:'

# sitemap composition
curl -s -H "User-Agent: $UA" https://protein.tn/sitemaps/listings.xml \
  | grep -c 'shop?page='      # 473 of 1107

# competitor pages: nutribeast 403s a Googlebot UA, use a browser UA
curl -s -A 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0' \
  https://nutribeast.tn/pre-workout
```

Every word count above is rendered body text with `<script>` and `<style>` stripped. Every JSON-LD type list is parsed from the page's own `application/ld+json` blocks. Every position, volume and KD is read from the 08/09/2026 SemRush TN exports, not from memory. Where the two disagree with the brief, §1 says so.
