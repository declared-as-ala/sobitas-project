# Ranking plan — créatine & protéine, Tunisia

**Written:** 09/09/2026, after the overnight execution run.
**Sources:** SemRush TN exports 08/09/2026 (`gap.keywords` 316 kw, `Positions` 362 kw, `PagesV3`
192 pages, `backlinks_matrix`), the repository's Google Search Console exports (`Queries.csv`,
`Pages.csv`, Web, last 3 months), and live Googlebot-UA fetches of production and of competitor
pages.

This is the one page to open when asking "did it work". Everything else is commit messages.

---

## 1. The diagnosis, in one table

Of our 58 top-20 keyword entries, **41 (71%) come from the homepage or a blog post**, not from a
page that can sell.

| site | top-20 entries | from category/brand | from product | from homepage | from blog |
|---|---:|---:|---:|---:|---:|
| **protein.tn** | 58 | **9** | 8 | **17** | **24** |
| housenutrition.tn | 118 | 58 | 51 | 8 | 0 |
| nutribeast.tn | 150 | 89 | 54 | 7 | 0 |

Neither competitor has a single blog post in their top-20 set.

**This is not a backlink problem.** Referring domains: protein.tn **357** (7,333 backlinks),
nutribeast 302, body-shop 300, protein-shop-tunisia 294, **housenutrition 96**. We out-link every
competitor and lose to the site with 96 referring domains. Exactly one authority domain
(ascore >= 40) links to a competitor and not to us.

**housenutrition wins with a weaker page.** Their `/category/whey`, fetched live: **1,625 words,
no JSON-LD at all, 8 internal links, H1 "Whey protein"**. It ranks **1, 2, 3, 4, 7, 9 and 10**
across the whole protein cluster. Its only advantage is exclusivity — it is the *one* page on
their site answering that intent, where we answered it from nine.

`nutribeast` is the larger threat, not housenutrition: 113 top-10 keywords to their 77, and 6,902
modelled daily visits to housenutrition's 2,803 and our 1,237.

---

## 2. Target assignment — one page per intent

This is the decision. Every change below serves it.

| intent | the page that must own it |
|---|---|
| whey / whey protein / whey protein tunisie / protein / proteine tunisie | **`/whey-proteine`** |
| protéines in general, the catalogue | `/proteines` |
| créatine / creatine monohydrate / creatine tunisie | **`/creatine`** |
| mass gainer / prise de masse | **`/mass-gainers`** |
| pre workout | **`/pre-workout`** |

---

## 3. The scoreboard — measure these, in this order

Positions are SemRush TN, 08/09/2026 (the BEFORE column is frozen; re-pull to fill "now").

| keyword | vol | KD | our best BEFORE | our category page BEFORE | competitor at top | what changed overnight |
|---|---:|---:|---|---|---|---|
| `whey protein tunisie` | 1300 | 7 | **14 — homepage** | `/whey-proteine` unranked | house `/category/whey` **1** | homepage now links `/whey-proteine` with anchor "Whey Protein Tunisie" above the fold; page 1,968 -> **3,392** words |
| `proteine tunisie` | 880 | 7 | **10 — homepage** | `/proteines` 45, `/whey-proteine` 58, `/proteine-tunisie` 68 | house **3** | homepage anchor "Protéine Tunisie" -> `/proteines`; `/proteine-tunisie` retargeted to informational and routes up |
| `protein tunisie` | 720 | 10 | 9 organic **+ position 1 AI overview** | `/proteines` 37 | house **4** | see above. NOTE: the AI overview already captures most of this click — low upside |
| `whey protein` | 2900 | 17 | **59 — `/proteines`** | — | nutribeast 6, house 9 | `/whey-proteine` given the depth; `/proteines` differentiated as parent catalogue |
| `whey tunisie` | 260 | 9 | **16 — homepage** | `/whey-proteine` **55** | house **1** | `/whey-tunisie` 308 retargeted from `/whey-isolate` -> `/whey-proteine` (it was answering an isolate query) |
| `creatine monohydrate tunisie` | 480 | **4** | **16 — a blog post** | **`/creatine` 54** | house `/category/creatine` **2** | `/creatine` title now leads with the query (62 -> 56 ch); page 1,699 -> **3,077** words; blog links up with the exact anchor |
| `creatine monohydrate` | 3600 | 14 | 26 — a product page | `/creatine` unranked | house 17, nutribeast 8 | same |
| `creatine` | 6600 | 36 | 26 — a blog post | — | nutribeast product page 9 | same |
| `mass gainer` | 1600 | 8 | **14 — `/mass-gainers`** | — | — | `/mass-gainers` given the deeper guide (1,484 -> **3,295** words, 22 FAQ); `/prise-de-masse` rewritten as a hub that stops competing |
| `pre workout` | 720 | 15 | unranked | `/pre-workout` | nutribeast **2** (5,311 words, no JSON-LD) | `/pre-workout` 2,099 -> **2,986** words; `/performance` dropped pre-workout from its title (it was competing at 47) |
| `pre workout tunisie` | 320 | 7 | **24 — `/pre-workout`** | — | — | same |

**Re-pull SemRush TN Positions in 3-4 weeks and check the CATEGORY row moved**, not the aggregate.
A blog post or the homepage improving is not this working — it is this failing in a new way.

---

## 4. Why depth, and not more schema

Measured on the pages actually beating us:

| page | words | JSON-LD | ranks |
|---|---:|---|---|
| nutribeast `/pre-workout` | 5,311 | **none** | 2 for the head term |
| nutribeast `/l-glutamine` | 3,310 | **none** | 5 |
| housenutrition `/category/whey` | 1,625 | **none** | 1, 2, 3, 4, 7, 9, 10 |
| housenutrition `/brand/gsn` | 1,002 | one `ItemList` | 3 on a 2,400-vol keyword |

We already emit `Organization`, `LocalBusiness`, `WebSite`, `BreadcrumbList`, `CollectionPage`,
`ItemList`, `FAQPage` and per-product `Product` on every one of these pages. **We beat all of them
on markup comprehensively and lose anyway.** So the overnight work added ~1,250 words of real
per-SKU editorial copy per page and changed **zero** JSON-LD nodes — verified by hashing every node
before and after, on both user agents.

Adding more structured data to these pages is the most tempting wrong move available. Don't.

---

## 5. What is still holding us back, ranked

1. **6,566 product pages are `noindex`** and cannot leave it: the content pipeline has fetched
   nothing since 11/08/2026 because fr.iherb.com answers every product page with
   `403 cf-mitigated: challenge`. Full write-up in `docs/catalog-content-breaker.md`. Needs a
   decision on a prose source — this is the largest single item on the site.
2. **Stock.** 23 of 24 products on `/citrulline` are out of stock; the owner's own figure is 145
   in stock against 4,802 indexed. Ranking a commercial page whose products cannot be bought
   converts at zero however well it is written.
3. **Two brands with ~2,900 searches/month are not in the catalogue at all** — American Wolf and
   Impact Sport Nutrition, both currently 404.
4. **`/l-carnitine` renders the fat-burner guide** — `CONTENT_SLUG_ALIASES` maps it to
   `bruleurs-de-graisse`. Its own file is written and inert; activating it needs `intro`/`h1`/FAQs
   written first, or a `FAQPage` entity is lost.
5. **Catalogue data**: a duplicate Terra Origin SKU reading "5,15 g" for 515 g on page one of
   `/creatine`; The Vitamin Shoppe Carnipure listed twice on `/l-carnitine`.
6. **`sameAs` handles disagree** between the schema and the footer.

---

## 6. What NOT to do

- **Do not add `aggregateRating` to products.** There is no attested first-party review to base it
  on, and inventing one risks a manual action on the whole domain.
- **Do not bulk-generate product descriptions to clear the 250-word gate.** That gate exists
  specifically to keep scaled content out of the index — `config/catalog.php` says so at length.
- **Do not touch the homepage's brand-term targeting.** `protein tn` is position 1 at 60.9% CTR.
- **Do not change the `/complements-alimentaires` -> `/proteines` redirect** without first
  confirming which URL Google actually ranks for that phrase.
- **Do not report a ranking win from the current SemRush export.** All 362 rows have
  `Previous position` identical to `Position`; that file cannot show movement.
