# Why clicks fell — and what "not reachable from Google" actually turned out to be

**Date:** 2026-08-06 · **Data:** GSC export `protein.tn/Chart.csv` etc., Tunisia, 2026-04-30 → 2026-07-29
**Status of the data:** one week stale. Nothing after 29 July is in this repo.

Owner: *"we're not seeing any performance in Search Console, no new or updated or indexed pages,
we're going down for clicks, the website is not reachable from Google like before."*

---

## 1. The site is reachable. That part is not the problem.

Checked live today, not assumed:

| Check | Result |
|---|---|
| `GET /` as Googlebot UA | **200** |
| `GET /proteines`, `/pack-builder` as Googlebot | **200** |
| `robots.txt` | Allows everything except account / checkout / cart / auth / api / x-crawler |
| `sitemap.xml` | Healthy index; `products-0.xml` lastmod **2026-08-05**, `listings.xml` **2026-08-04** |
| Legacy `/category/*` redirects | **Fixed** — `/category/zma` now 308s to `/zma`, not to `/shop` |
| Product JSON-LD | Valid `Product` + `Offer` + `MerchantReturnPolicy` + `OfferShippingDetails` |
| Canonicals | Present and self-referencing |

Impressions confirm it from Google's side: **1,158 per day** in the worst fortnight. Google is
crawling the site, indexing it, and showing it roughly as often as it ever did.

---

## 2. What actually happened, in one comparison

Two fortnights with **the same reach**, ten weeks apart:

| Window | Impressions/day | Clicks/day | CTR | Avg position |
|---|---|---|---|---|
| **1–14 May** | 1,159.4 | **62.36** | 5.38% | 11.62 |
| **15–28 Jul** | 1,158.5 | **34.07** | 2.94% | 10.90 |

Same number of people saw the site. From a **slightly better** average position. **45% fewer of
them clicked.**

That single pair kills the two comfortable explanations at once:

- **Not seasonality.** A summer lull shows up as fewer impressions. Impressions are identical to
  within one per day.
- **Not a ranking collapse.** Average position went *down* (better) by 0.7.

And the break is dated. Of all seventy-eight 14-day windows in the series, **the five worst are all
July windows, and every one of them ends after the 15th**:

```
2026-07-15..07-28   34.07 clicks/day   CTR 2.94%   ← the worst in the series
2026-07-16..07-29   34.21              CTR 2.71%
2026-07-14..07-27   34.43              CTR 2.99%
2026-07-13..07-26   36.93              CTR 3.15%
2026-07-12..07-25   39.14              CTR 3.31%
```

**So the question is not "why did we stop ranking". It is "why did the result stop being clicked".**
Something about how protein.tn *looks* in the results page changed on or about 15 July.

---

## 3. What changed on those exact days

From `git log` on `origin/main`:

| Date | What shipped |
|---|---|
| **15 Jul** | ~20 PRs, including **#91** "stop title tags double-appending the brand" and **#99** "stop double brand in browser-tab titles" — **every title on the site was rewritten that day** |
| **16 Jul** | **#102** rebrand: online-facing "SOBITAS" → "Protein.tn". **#103** rich-result hardening + metadata polish |
| **28 Jul** | **#164** stop asserting unverified reviews to Google as `AggregateRating` — **star ratings removed from every product result** |

### The three candidates, ranked by what each can actually explain

**(a) The 15–16 July title rewrite + rebrand — best date fit.**
The break is 15 July. Titles changed site-wide on 15 July and the brand name in them changed on
16 July. Nothing else in the series lines up this precisely.

The specific mechanism worth checking: `sobitas` is the site's **single biggest query** — 589
clicks on 927 impressions, **63.54% CTR**, position 2.42. Someone typing "sobitas" is looking for a
word that, since 16 July, appears in **no title on the site**. That query alone cannot account for
the whole loss (it is ~6.5 clicks/day of a ~28/day fall), but a title rewrite that touched every
page could.

**(b) Rich results — explains the drop the owner is seeing THIS WEEK, not the July one.**
Search appearance over the period: Product snippets **956 clicks / 17,066 impressions**, Review
snippet **240 clicks / 4,602 impressions**. PR #164 (28 July) removed `AggregateRating` sitewide, so
the star ratings that earned those 240 clicks are going to zero over the following weeks. That is
*after* the 15 July break and is therefore a **second, separate decline now in progress**.

**This one was my decision and I would make it again.** Every sampled product carried ~200
"published" reviews with `verified = 0` and `commande_id = null`, drawn from a shared pool — a
shoulder-press machine and a lat pulldown share 72 byte-identical comments. Asserting those to
Google as an aggregate rating is a spam-policy violation that risks a **manual action on the whole
domain**. Losing the stars costs clicks; a manual action costs the entire channel.

The way to get the stars back is genuine reviews, and that is blocked on something else entirely:
**not one order in the database has ever been marked delivered** (1,082 orders; the `livree` status
appears zero times), so the post-delivery review request has never fired once.

**(c) A Google core update or SERP layout change in mid-July.** Cannot be confirmed or ruled out
from inside the repo. It has to be checked externally.

---

## 4. The four checks that settle it — 20 minutes in Search Console

The export in this repo **cannot** answer these: it has no per-day breakdown by query, page or
appearance. Only the live comparison view can.

Open **Performance → Compare → Custom → `2026-07-01..07-14` vs `2026-07-15..07-28`**, then:

1. **Search Appearance tab.** If "Review snippet" or "Product snippets" clicks fell sharply, the
   cause is rich results and no title change will fix it. *Kills or confirms (b).*
2. **Queries tab → filter `Query contains sobitas`.** Turns "the brand story is at most 29% of the
   loss" into an actual number. If brand-query CTR fell off a cliff, the rebrand did it.
   *Kills or confirms (a).*
3. **Queries tab, unfiltered, sorted by click difference.** If the loss is spread thinly across
   hundreds of queries, it is a SERP-wide change (c). If it is concentrated in ten, it is ours.
4. **Pages tab.** Expect the homepage to dominate — it is already 44.6% of all clicks — so read
   this one *after* the other three, not first.

Also worth one minute: **URL Inspection on `https://www.protein.tn/`** and read
*Google-selected canonical*. The www host carries 7,265 impressions at 2.26% CTR against the apex
host's 8.25%; if Google has not consolidated them, that is a real dilution.

---

## 5. "How long until I see results?"

Real numbers, so nothing is checked too early and read as failure:

| Stage | Realistic time |
|---|---|
| Search Console **data lag** | **~48 hours.** Nothing shipped today can appear before ~8 Aug — the graph is *always* two days behind |
| Googlebot re-crawls a changed page | hours → a few days (IndexNow is wired, PR #105) |
| A new **title/snippet** appears in results | **3–14 days** |
| A **readable trend** in the Performance graph | **14–28 days** |
| **Ranking** movement from content work | **4–12 weeks** |

**The first signal available today, with no waiting at all:** Search Console → **URL Inspection →
Test Live URL** on a changed page. It shows what Google renders right now.

**Before anything else ships, record the baseline.** Performance → last 28 days → screenshot the
clicks/day, CTR and average position. Without it there is nothing to compare against in three
weeks, and "did it work" becomes a matter of opinion.

Set **one** calendar check for **20 August**. Not sooner. Checking a two-day-lagged graph daily is
how a normal Tuesday gets read as a catastrophe.

---

## 6. What shipped with this PR, and what did not

**Shipped — both safe, neither reverses the rebrand:**

- `Organization.alternateName: ['SOBITAS', 'Sobitas']` and `SOBITAS` appended to the `WebSite`
  alternate names. After the rebrand the string appeared in **zero** machine-readable places while
  remaining the site's biggest query. This is entity disambiguation for the knowledge panel — it is
  **not** a ranking factor, and it will not move a query already at position 2.4. It is here because
  a company's other name should be stated *somewhere*.
- `/qui-sommes-nous` title → **"À propos de SOBITAS — Protein.tn | Protéine Tunisie"**. One page,
  the one whose job is to say the shop people knew as SOBITAS is now Protein.tn. Deliberately not
  applied to `/`, `/shop` or any category page: there the trading name is what the shopper wants,
  and a second brand in an already 60–70 character title costs more in truncation than it wins.
- The dead **YouTube URL removed from `sameAs`**. Verified with a control — `youtube.com/@Google`
  returns 200 from here, `youtube.com/@proteinetunisie` returns **404**. `sameAs` only works when
  the profile links back; a URL resolving to nothing corroborates nothing.

**Deliberately NOT shipped — needs the owner:**

- **The Facebook / Instagram / TikTok handles are wrong somewhere.** The schema says
  `facebook.com/protein.tn` and `instagram.com/protein.tn`; the footer links
  `facebook.com/proteinetunisie` and `instagram.com/sobitas.proteine.tunisie`. One side of each pair
  is wrong on every page of the site. This is **not guessable from a server**: Facebook returns 400
  to any non-browser request whether or not the page exists, and Instagram returns 200 for profiles
  that do not. Replacing one guess with another is not a fix.
  **→ Owner: paste the four real profile URLs and both blocks get corrected in one commit.**
  The footer's YouTube link (`@proteine-tunisie`) is also a 404 and needs the same answer.
- **No title change to `/`, `/shop` or the category pages.** Whether "SOBITAS" belongs back in the
  homepage title is a real question, and it should be answered by check #2 above rather than by my
  guess. Rewriting every title again — on a site whose clicks halved the last time every title was
  rewritten — without first reading the query data would be repeating the experiment blind.

---

## 7. The bigger finding, which is not about the drop at all

From `Pages.csv`: the homepage is **44.6% of all clicks** (2,159 of 4,840). The commercial listing
pages are close to dead weight, and they are outranked **by this site's own blog** on their own head
terms:

| Money page | Position | | Our blog post on the same term | Position |
|---|---|---|---|---|
| `/proteines` | **33.87** | | `/blog/whey-protein-en-tunisie` | 11.15 |
| `/whey-isolate` | **51.05** | | `/blog/iso-100-de-dymatize…` | 7.85 |
| `/creatine` | **25.83** | | `/blog/prix-de-la-creatine-en-tunisie` | 9.56 |

And the zero-click queries sitting at clickable positions:

| Query | Impressions | Clicks | Position |
|---|---|---|---|
| omega 3 fish oil | 2,827 | **0** | 7.46 |
| protein powder whey | 1,091 | **0** | 8.78 |
| creatine monohydrate | 651 | **0** | 11.39 |
| pre workout | 360 | **0** | 9.80 |

Position 7–9 with 0% CTR means the title and snippet are not answering the query. That is a bigger
prize than the July drop and it is fixable page by page.

**Suggested first move, one page, measured:** `/proteines` — 1,068 impressions at position 33.87 —
gets what the blog post outranking it already has: unique above-the-fold copy that answers the
query, and an internal link from `/blog/whey-protein-en-tunisie`. One page. Then read the result in
three weeks before touching the other 126.
