# Indexation strategy — protein.tn

Decided 22/09/2026. These are the rules that now hold, not a plan. Every number below comes from
`protein.tn/GSC-2026-09-22.md`, the CSVs in `protein.tn/2026-09-22-28d/` and `2026-09-22-3m/`, the
source files cited, or a Googlebot-UA fetch made on 22/09/2026. Nothing here is estimated.

## 0. The measurement that forced the decision

Search Console, 22/09/2026 (`GSC-2026-09-22.md:11-14`):

- **6,190 indexed · 20,030 not indexed**, of which **noindex 12,206** — nearly twice the indexed set.
- page with redirect 5,760 · crawled-not-indexed 1,255 · not found 633 · 5xx 36 · redirect error 31.
- Sitemap index read 21/09, Success, **12,242 discovered** — the sitemap advertises about as many
  URLs as Search Console is excluding for noindex. Those two numbers have to converge (§6).

Live, Googlebot UA, 22/09/2026 (HTTP 200, no `noindex` in either response):

- `/cla` — 24 tiles, **0 "En stock"**, 48 "Sur commande" (two occurrences per tile).
- `/creatine` — 24 tiles, **8 "En stock"** (16 occurrences), 16 "Sur commande".

## 1. The three states of a product URL

The deciding column is `products.seo_robots_index`: nullable, fillable and cast `boolean`
(`filament/app/Models/Product.php:26,79`). **NULL means indexable.**
`getEffectiveSeoRobotsIndexAttribute()` (`Product.php:611-615`) returns `true` for NULL, and the
sitemap agrees — `frontend/src/util/sitemapSources.ts:628-631` reads the flat column as `undefined`
when it is null and excludes a product only on an explicit `false`.

Why the NULL semantics are load-bearing: the Filament Toggle hydrated NULL as OFF and wrote a hard
`0` on any save. On 14/09/2026 that left **95 legacy published products at `seo_robots_index = 0`,
69 of them in stock**, including the store's best sellers by order lines — Serious Mass 5.45 kg,
Gold Standard Whey 2.27 kg, Levro Legendary Mass, every in-stock creatine
(`filament/app/Console/Commands/SeoProductsLegacyReindex.php:22-29`). It was not an operator
decision; it was a NULL read as OFF. Fixed in `EditProduct::mutateFormDataBeforeFill`, repaired by
`php artisan seo:products-legacy-reindex --apply`.

| state | condition | URL behaviour |
| --- | --- | --- |
| **INDEX** | `publier = 1` and `seo_robots_index` NULL or 1 | 200, self-canonical, `index, follow`, in the sitemap. The default. Stock plays no part in this test. |
| **NOINDEX** | `publier = 1` and `seo_robots_index = 0` | 200, `noindex`, and **out of the sitemap** (§6). Reserved for a body under the content gate: `catalog.promotion.min_body_words = 250` (`filament/config/catalog.php:557`). Reversible without a deploy — the observer revalidates the page, busts the sitemap cache and submits to IndexNow (`SeoProductsLegacyReindex.php:38-44`). |
| **ARCHIVED-BUT-KEPT** | `publier = 0` | Not offered to search engines, dropped from the sitemap (`sitemapSources.ts:580`). The slug is kept; it is never 404'd or 410'd, so it can be republished or redirected later on purpose. |

Owner decision recorded 21/09/2026 (the `--force` flag on the legacy reindex): **no published
product stays noindex**; word counts below 250 are an enrichment worklist, not a suppression list.

## 2. Out of stock is NOT a noindex trigger

An out-of-stock product stays indexable, with availability stated honestly. Three reasons, in order
of weight:

1. **Google's own guidance.** Availability is a property of the *offer*, not of the page's
   usefulness. The page still answers the query; the correct signal is the `availability` enum, not
   removal. Noindexing or redirecting on stock discards the URL's crawl history and ranking, and
   buys it back slowly when stock returns.
2. **The enum already does the job, correctly.** `availabilityFor()`
   (`frontend/src/util/structuredData.ts:151-157`) emits `InStock`; `BackOrder` for the imported
   catalogue — **10,535 rows at `qte=0, rupture=true, force_out_of_stock=false`** against **134 rows
   of real inventory**, measured 13/08/2026 (`frontend/src/util/cartStock.ts:82-83`); and
   `OutOfStock` only for `force_out_of_stock`, the owner's explicit "do not sell this" switch.
   `shippingDetails` is withheld while out of stock rather than faked (`structuredData.ts:130-139`).
3. **The long tail lives on product URLs, not on the listings.** From `GSC-2026-09-22.md:31,40,41,43`
   (3 m unless noted): PDP `born-rage` 380 impressions at pos 5.3 on *pre workout*; PDP
   `bcaa-12-000` 1 click / 19 impr / pos 16.4; PDP biotech creatine 300 g 4 clicks / 156 / 12.4;
   query `creatine gsn 200g` 34 impressions at pos 2.5. A stock-driven noindex deletes exactly these.

The precedent in §1 is the argument's last word: the one time this catalogue mass-noindexed pages
that were fine, it cost the best sellers their pages. Do not reintroduce that through a stock rule.

## 3. What legitimately justifies noindex on a product

All of the following, **together**:

> no stock **AND** no demand **AND** no unique content **AND** no backlinks **AND** no likely restock.

The AND is the safety margin, because every leg on its own is a false positive:

- *No stock* alone kills the long tail (§2) — and 98.7% of the catalogue is not physically held.
- *No demand* alone is the normal state of a deep-catalogue URL Google has not settled on yet;
  1,255 URLs currently sit in crawled-not-indexed and are not worthless, only unranked.
- *No unique content* alone is an enrichment job (the 250-word gate), and it already has a tool.
- *No backlinks* describes nearly every one of 12k product URLs.
- *No likely restock* alone is a merchandising fact, not a search judgement.

Only the conjunction describes a page that is genuinely worth nothing. **If any leg is unknown,
leave the URL indexed and report it.** Conservative is the default: a wrong noindex is expensive and
slow to undo, a wrong index costs crawl budget.

## 4. Categories: nothing buyable → `noindex, follow`

**A commercial listing with nothing buyable renders `noindex, follow`. It is never deleted, never
301'd, and it stays in the navigation.**

- **Why not 410/301.** Stock returns. A 410 throws the URL away with its history and orphans the
  breadcrumb parent of every product under it; a 301 to a parent becomes a redirect to unwind the
  day stock arrives — and redirect debt is already the site's second-largest exclusion bucket
  (page-with-redirect 5,760).
- **It reverses itself.** The day one product is buyable the page is indexable again with no
  intervention and no deploy — the same self-correcting shape the route already uses for empty
  subcategories (`frontend/src/app/(shop)/category/[slug]/page.tsx:530-540`) and the sitemap uses
  for brands and empty subcategories (`sitemapSources.ts:731-741`, `:820-826`).
- **`follow`, and understood to decay.** The route's own note records that a long-lived `noindex`
  behaves as `noindex, nofollow` in practice: the page stops being recrawled and its links stop
  being followed (`category/[slug]/page.tsx:553-558`). So this state is one to *exit*. A category
  still empty after a restock cycle is a merchandising problem, not an SEO one.
- **Scope and failure direction.** Only listings with nothing buyable. A listing with no products
  but a real editorial guide stays indexable (`page.tsx:534`, `sitemapSources.ts:741`); a top-level
  category that lists subcategories is not a dead end. If the count is unavailable — 429, 5xx,
  changed payload — the page **stays indexable**: a wrong noindex across 50 subcategories is the
  expensive direction to fail in (`page.tsx:332-337`).

### The nine zero-stock listings, and the correction the CSVs force

Measured with zero buyable stock: `/cla`, `/post-workout`, `/intra-workout`, `/probiotiques`,
`/digestion`, `/immunite`, `/sommeil-stress`, `/plantes-et-herbes`, `/glucides-energie`. They are
**not** all at zero traffic — `2026-09-22-28d/Pages.csv` and `2026-09-22-3m/Pages.csv` say:

| listing | 28 d clicks / impr / pos | 3 m clicks / impr / pos |
| --- | --- | --- |
| /cla | 1 / 2 / 22.0 | 2 / 7 / 22.9 |
| /glucides-energie | 1 / 1 / 1.0 | 1 / 1 / 1.0 |
| /post-workout | not in file | 1 / 4 / 12.3 |
| /intra-workout | 0 / 5 / 2.6 | not in file |
| /probiotiques, /digestion, /immunite, /sommeil-stress, /plantes-et-herbes | not in file | not in file |

So **five of the nine are clean noindex candidates**. The other four earn clicks or hold a top-3
average position, and the standing rule is that a URL earning clicks is only ever touched to improve
it — they are **exempt from automatic noindex** and go to the owner with the restock question (§7).
This corrects the working assumption that all nine sat at ~0 clicks / ~0 impressions; the exports
say otherwise.

`/creatine` is **not** in scope for noindex under any reading: 8 buyable of 24, and 2 clicks / 204
impressions / pos 22.2 over 28 d, 9 / 730 / 24.1 over 3 m (`Pages.csv`, both folders). It is a
merchandising and ordering problem (§5, §7).

## 5. Ordering inside a commercial listing

**In stock → low stock → temporarily unavailable ("Sur commande" / BackOrder) → archival.** The same
order on every listing surface.

The first screen is what a shopper and Googlebot conclude the page is. `/creatine` renders 24 tiles
of which 8 say "En stock" (§0) and nothing guarantees those 8 come first; `/cla` renders 24 tiles
that all say "Sur commande". This ordering is also what keeps §4 rare — a listing with 3 buyable of
24 is still a good page when the 3 are first.

Stock state for ordering comes from `getProductStockStatus()`
(`frontend/src/util/cartStock.ts:124-145`), the single source of truth behind every badge, the cart
and the schema. Do not write a second stock test for sorting; that is how a grid and a detail page
came to disagree before.

## 6. Robots and sitemap are decided together

Never submit a URL that renders `noindex` — that is the "Submitted URL marked 'noindex'" bucket, and
the sitemap builder refuses it on purpose (`sitemapSources.ts:610-613`). Every decision above is
therefore a pair: the directive and the sitemap membership move at the same time. 12,242 discovered
against 12,206 excluded-by-noindex has to close from both ends — fewer wrongly noindexed products
(§1) and no noindex URL submitted.

## 7. Not decided — the owner has to answer

1. **Which imported catalogue lines should be archived at all** (`publier = 0`). 10,535 rows arrived
   at `qte = 0` (`cartStock.ts:83`). Only the owner can say which are permanently unobtainable
   versus merely not held. Until then they stay published, `BackOrder`, and indexable if they clear
   250 words.
2. **The stock ceiling on head terms** — no 1 kg creatine, no 500 g whey in stock. That is why
   `/creatine` shows 8 buyable of 24 and sits at pos 22.2. No indexation rule can fix it.
3. **The four zero-stock listings that still earn clicks** (`/cla`, `/glucides-energie`,
   `/post-workout`, `/intra-workout`): restock, or noindex despite the clicks?
