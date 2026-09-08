# Phase 2 — The homepage is outranking its own category pages

## The evidence (live Google Search Console, read today, 3-month window)

Query `whey protein tunisie`: **1,851 impressions · 52 clicks · 2.8% CTR · average position 11.3**,
spread across 18 of our pages:

```
23 clicks / 1,105 impr   https://protein.tn/            ← the HOMEPAGE takes 60% of a category query
18 clicks /   774 impr   /blog/whey-protein-en-tunisie
 5 clicks /    76 impr   https://www.protein.tn/        (www, 308s to apex — consolidates on its own)
 4 clicks /    79 impr   /blog/whey-proteine-pas-cher-tunisie
 3 clicks /    39 impr   /whey-isolate
 0 clicks /    61 impr   /proteines
 0 clicks /    27 impr   /whey-proteine                 ← the page that should OWN this query
 0 clicks /    20 impr   /proteine-tunisie
```

`/whey-proteine` earns **27 impressions and zero clicks** for its own target keyword.

The titles explain it:

| Page | Title today | Keywords it claims |
|---|---|---|
| `/` (homepage) | Protéine Tunisie \| **Whey**, **Créatine** & Compléments – Protein.tn Sousse | protéine + whey + créatine |
| `/whey-proteine` | **Whey Protein Tunisie** \| Prix, Marques & Comparatif | whey |
| `/proteines` | **Protéine Tunisie** : Whey, Isolate & Prix | protéine + whey |
| `/proteine-tunisie` | **Protéine Tunisie** : Guide complet pour bien choisir… | protéine |
| `/whey-isolate` | Whey Isolate Tunisie : Prix & Comparatif | isolate ✓ distinct |

Two problems, and they are different:

1. **The homepage competes with every category it links to.** Its title claims protéine, whey AND
   créatine, so Google ranks it for all of them — which is also why it appeared in the creatine
   cluster in Phase 1.
2. **`/proteines` and `/proteine-tunisie` are two pages with near-identical titles**, both claiming
   "Protéine Tunisie". Between them they take 81 impressions and zero clicks.

## The one thing you must not break

The homepage is this site's best asset: query `protein tunisie` earns **417 clicks from 2,304
impressions at 19.69% CTR, position 8.14**. That is brand-plus-category intent and the homepage
*should* own it.

So this is not "strip the homepage". It is: the homepage keeps `protéine tunisie` (brand level) and
stops claiming `whey protein tunisie` and `créatine tunisie` (category level), which belong to
`/whey-proteine` and `/creatine`.

## Do

1. Read `docs/architecture/seo-engine.md` and `frontend/SEO_URL_MIGRATION_GUIDE.md` first. Titles
   are contract-tested — `check-url-contract`, `check-sitemap-routes` and
   `check-category-seo-content` run in prebuild.
2. Retitle the homepage so it owns brand + "protéine tunisie" without enumerating the categories it
   links to. Keep "Sousse" — local intent earns clicks here.
3. Resolve `/proteines` vs `/proteine-tunisie`. They cannot both be "Protéine Tunisie". Decide which
   is the category and which is the guide, and make the titles say so unmistakably. Put your
   reasoning in the report.
4. Strengthen internal linking **down** from the homepage to `/whey-proteine` and `/creatine` with
   descriptive anchors, so authority flows to the pages that should rank instead of pooling at the
   root.
5. Leave `/whey-isolate` alone — it is the one page in this set with a distinct claim.

## Don't

- **No redirects, no deletions.** `/proteines` and `/proteine-tunisie` both hold impressions; a 301
  is the owner's call. If you think one should merge, argue it in RISKS with the numbers.
- Do not weaken the homepage for `protein tunisie`. If your new title could plausibly lose that
  query, you have traded 417 clicks for a hypothesis.
- Do not touch product pages, checkout, account, reviews, the landing components, or the blog posts
  from Phase 1.
- Do not commit, stage or push. You have **no network** — do not try to fetch Google or run a server.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design
npm run lint
```

I run the build with its three SEO guards, the Googlebot fetches, and I re-check GSC. Report each
page's old title, new title, and the single query it is now built to win. If two of your titles
could rank for the same query, the problem has moved rather than gone.
