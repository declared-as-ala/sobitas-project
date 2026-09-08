# Phase 15 — the homepage and the blog are eating the category pages

## The evidence (SemRush, tn database, 07/09/2026)

Keyword gap against the four Tunisian competitors, with the URL each site ranks:

| keyword | vol | KD | **our position + URL** | winner |
|---|---:|---:|---|---|
| whey protein tunisie | 1300 | **7** | **14 — `/` (homepage)** | housenutrition `/category/whey` — **1** |
| proteine tunisie | 880 | **7** | **10 — `/` (homepage)** | `/category/whey` — **3** |
| protein tunisie | 720 | 10 | **9 — `/` (homepage)** | `/category/whey` — **4** |
| protein | 1000 | 36 | 25 — `/blog/protein-the-essential-guide…` | `/category/whey` — **2** |
| whey protein | 2900 | 17 | **59 — `/proteines`** | nutribeast `/whey` — 6, house `/category/whey` — 9 |
| whey | 880 | 21 | 45 — `/blog/whey-protein-et-entrainement…` | `/category/whey` — 7 |
| proteine | 2400 | 30 | 19 — `/blog/proteines-tunisiennes…` | `/category/whey` — 10 |
| creatine | 6600 | 36 | 26 — `/blog/creatine-a-quoi-ca-sert…` | nutribeast product page — 9 |
| creatine monohydrate | 3600 | 14 | 26 — `/creatine/{a product}` | house `/category/creatine` — 17, nutribeast — 8 |
| creatine monohydrate tunisie | 480 | **4** | 16 — `/blog/creatine-monohydrate-tunisie…` | `/category/creatine` — **2** |

**housenutrition.tn ranks ONE page — `/category/whey` — at 1, 2, 3, 4, 7, 9 and 10 across the whole
protein cluster.** We answer the same intents from the homepage, three different blog posts and two
category pages, so no single URL ever accumulates authority for them.

**This is not a link problem. Do not propose link building.** Referring domains: protein.tn **357**
(7,333 backlinks), nutribeast 302, protein-shop-tunisia 294, body-shop 300, **housenutrition 96**.
We outlink every competitor and lose to a site with 96 referring domains. Exactly one authority
domain (ascore ≥40) links to a competitor and not to us. The gap is relevance and consolidation.

Two more facts that matter:

- **89.7% of all our organic traffic lands on the homepage** (SemRush PagesV3). The homepage is
  doing the work six category pages should be doing.
- `/proteines` ranks **59** for "whey protein" while `/whey-proteine` does not rank for it at all.
  Our two protein category pages are splitting the intent between them.

## The job

**Make one page per intent the strongest answer, and stop the homepage and the blog outranking it.**

Target assignment — this is the decision, work to it:

| intent | the page that must own it |
|---|---|
| whey / whey protein / whey protein tunisie / protein / proteine tunisie | **`/whey-proteine`** |
| protéines in general, the catalogue | `/proteines` |
| creatine / creatine monohydrate / creatine tunisie | **`/creatine`** |

### What to actually do

1. **Internal links must name the target.** Audit every internal link to `/whey-proteine`,
   `/proteines` and `/creatine` and make the anchor text carry the query the page must own
   ("whey protein en Tunisie", "créatine monohydrate en Tunisie"), not "voir tout" or "boutique".
   The header/nav and homepage links matter most — they are on every page.
2. **The homepage must point at the category, not compete with it.** Do NOT weaken the homepage's
   own brand terms (`protein tn`, `sobitas` — position 1, 60.9% CTR, leave them alone). What to
   change is that the homepage should link to `/whey-proteine` and `/creatine` with those commercial
   anchors, high in the page, so Google has an obvious better target than the homepage itself for
   "whey protein tunisie".
3. **The blog posts that currently outrank our category pages must link up to them** with the exact
   anchor. Some already do — `blogSeoConfig.ts` gained pillar links today. Check these specifically:
   `/blog/creatine-a-quoi-ca-sert-et-pourquoi-en-prendre`,
   `/blog/proteines-tunisiennes-tout-ce-que-vous-devez-savoir`,
   `/blog/protein-the-essential-guide-to-its-benefits-sources-and-role-in-nutrition`,
   `/blog/whey-protein-et-entrainement-strategies-pour-des-gains-musculaires`,
   `/blog/creatine-monohydrate-tunisie-guide-d-achat-bienfaits-et-meilleures-marques`.
   Each must link to its pillar with a commercial anchor, near the top of the body, not only in a
   footer block.
4. **`/proteines` vs `/whey-proteine` must stop competing.** Decide which owns "whey protein" —
   the table above says `/whey-proteine` — and make `/proteines` behave like the parent catalogue
   that links down to it, not a competitor for the same phrase. Check their titles, H1s and intros
   for the same phrases and differentiate them.
5. Report every change as: keyword → page that should win → what you changed to make that true.

## Don't

- **Do not add or change any `aggregateRating`, review or rating markup.** Unrelated, and dangerous.
- Do not touch `VentesFlashSection.tsx`, `FlashDealCard.tsx`, `GoogleReviewsSection.tsx`,
  `ReviewMarquee.*`, `BrandsSection.tsx`, `reviews/*`, `avis/*`, `QuickOrderDrawer.tsx`,
  `api/quick-order/route.ts`, `loyalty/*` — all carry work committed or in flight today.
- Do not redirect, delete or noindex any blog post. They earn real traffic; the fix is that they
  point up, not that they disappear.
- Do not change the homepage's brand-term targeting.
- No new dependencies. Do not commit, stage or push. **No network for code changes** — but you MAY
  curl live pages read-only to verify anchors and titles.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p15 npm run build   # a dist dir that does not exist yet
```

Report, per target page: the internal links now pointing at it and their anchor text, the title/H1
of each of the three competing surfaces (homepage, blog, category) for the same phrase, and what you
changed so they no longer say the same thing.
