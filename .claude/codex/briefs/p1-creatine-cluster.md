# Phase 1 — Stop four pages fighting each other for "créatine tunisie"

## The evidence (live Google Search Console, read today, 3-month window)

Query `creatine tunisie`: **564 impressions · 24 clicks · 4.3% CTR · average position 16.3**, and
**24 different pages** of ours appear for it. The top ten:

```
11 clicks /  73 impr   /blog/prix-de-la-creatine-en-tunisie
 4 clicks /  43 impr   /creatine                                  ← the pillar, starved
 3 clicks /  78 impr   /                                          (homepage)
 3 clicks /  35 impr   /blog/creatine-tunisie
 1 click  / 328 impr   https://www.protein.tn/                     (www variant, 308s to apex — will consolidate)
 1 click  /   4 impr   /shop
 1 click  /   2 impr   /blog/creatine-tunisie-tout-ce-que-vous-devez-savoir
 0 clicks /  17 impr   /blog/ou-acheter-de-la-creatine-en-tunisie
```

Their titles are the problem, stated plainly:

| Page | Title today | Intent it claims |
|---|---|---|
| `/creatine` | Créatine Tunisie \| Monohydrate, **Prix** & Comparatif | commercial — this is the pillar |
| `/blog/prix-de-la-creatine-en-tunisie` | **Prix créatine Tunisie** : comparer formats et marques | duplicates the pillar's price angle |
| `/blog/creatine-tunisie-tout-ce-que-vous-devez-savoir` | **Créatine Tunisie** : Tout ce que vous devez savoir | duplicates the pillar wholesale |
| `/blog/ou-acheter-de-la-creatine-en-tunisie` | **Où acheter** créatine en Tunisie | buy intent — that is the pillar's job |
| `/blog/creatine-tunisie` | Créatine : bienfaits, dosage et conseils | genuinely distinct ✓ |

Three blog posts compete with the category page on the same commercial intent. Google cannot pick a
winner, so it ranks none of them well. The page is not weak — it is being outvoted by its own site.

## The shape of the fix

`/creatine` is the **pillar** and owns commercial intent (créatine tunisie / prix / acheter). Every
blog post becomes a genuinely different question, and each links **up** to the pillar.

## Do

1. Read `.claude/skills/protein-ui/SKILL.md` and `docs/architecture/seo-engine.md` first. Titles and
   metadata on this site are contract-tested — `npm run build` runs `check-url-contract`,
   `check-sitemap-routes` and `check-category-seo-content` in prebuild.
2. Retitle and re-angle the three conflicting posts so each answers a question the pillar does not.
   `prix-de-la-creatine-en-tunisie` earns 11 of the cluster's 24 clicks, so it keeps a price angle —
   but make it the *explainer* (what drives the price, cost per gram, how to compare) rather than a
   second listing page. The other two need real differentiation or they are just thin duplicates.
3. Add an explicit internal link from each of the four posts to `/creatine`, in the body, with
   descriptive anchor text. Not a nav link — a contextual one.
4. Leave `/blog/creatine-tunisie` (bienfaits/dosage) alone except for the link up. Its title is
   already distinct; only its slug overlaps, and renaming a slug that earns clicks is not worth it.
5. Strengthen `/creatine` itself as the pillar: it already has 1,193 words, 9 H2s, FAQPage and
   ItemList schema, so do **not** bulk it up. What it lacks is being pointed at.

## Don't

- **Do not add redirects or delete any page.** Three of these earn clicks. A 301 is a one-way door
  and that decision is the owner's, not ours. If you believe one should be merged, put the case in
  RISKS with its numbers.
- Do not rewrite article bodies wholesale or mass-generate paragraphs. `docs/PRODUCT-CONTENT-RUNBOOK.md`
  documents why sweeping content generation here is scaled-content-abuse shaped.
- Do not touch product pages, checkout, account, reviews, or the landing components.
- Do not commit, stage or push.
- You have **no network**. Do not try to fetch Google, start a dev server, or verify rankings.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design
npm run lint
```

I run the build (with its three SEO guards), the Googlebot fetches, and I re-check GSC. In your
report, list for each of the four posts: the old title, the new title, and the distinct question it
now answers. If two of your new titles could plausibly rank for the same query, you have not fixed
the problem — you have moved it.
