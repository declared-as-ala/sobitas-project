# Blog SEO: the Arabic articles rank on page 1 and nobody clicks them

## The measurement

From the owner's Search Console export (`protein.tn/Pages.csv`), blog pages that rank **≤ 15** with
**CTR < 1%** and **≥ 200 impressions**:

```
9 pages · 13,563 impressions · 54 clicks · blended CTR 0.40%
7 of the 9 are Arabic-script URLs, carrying 11,582 of those impressions
at a modest 3% CTR they would earn ~407 clicks (+353)
```

Worst offender: `ما هي الأطعمة التي تحتوي على الكرياتين؟` — **5,834 impressions, 17 clicks, 0.29%
CTR, average position 7.92**. A page sitting at position 8 that nobody clicks does not have a
ranking problem. It has a *snippet* problem.

## What I already found — verify it, do not re-derive it

Fetched that URL with a Googlebot user-agent. The page is entirely Arabic — title, meta description
and body — and:

| Signal | Value | Should be |
|---|---|---|
| `<html lang>` | **`fr`** | `ar` |
| `dir` | **absent** | `rtl` |
| hreflang tags | **0** | fr/ar alternates |
| `og:locale` | `ar_TN` | already correct |
| `<title>` | good Arabic, descriptive | fine — not the problem |

**`src/app/layout.tsx:281` hardcodes `<html lang="fr">` for the entire site.** Meanwhile
`ArticleDetailClient.tsx:340` already sets `lang={article.content_lang ?? resolveArticleLanguage(article).code}`
on the article *body*. So the app knows each article's language and applies it inside the document
while the document itself claims French.

The titles are good. Do not rewrite copy to chase CTR — fix the signal that is provably wrong.

## Files

- `frontend/src/app/layout.tsx` — the hardcoded `lang`
- `frontend/src/app/(shop)/blog/[slug]/page.tsx` — `generateMetadata` for the article route
- `frontend/src/app/(shop)/blog/[slug]/ArticleDetailClient.tsx` — already language-aware, read it
- `frontend/src/util/` — `resolveArticleLanguage` lives near the blog utils; reuse it, do not
  write a second language resolver
- Data: `Article.content_lang` (`src/types/index.ts:384`)

## Do

1. Reproduce the four rows in that table yourself against production before changing anything.
2. Make the **document** language and direction match the article on blog article routes.
   Next's App Router allows `<html>` in a root layout only, so this is a real design decision and
   it is yours: a middleware-set header the root layout reads, a segment-aware root layout, or a
   pre-hydration inline script — whichever you can defend. Say which you chose and why in your
   report. It must be present in the **server-rendered HTML**, not applied after hydration; a
   `useEffect` that patches `documentElement` after paint is not a fix for a crawler signal.
3. Emit **hreflang alternates** via `generateMetadata` → `alternates.languages`, including
   `x-default`. Only annotate a pair that genuinely exists — if an article has no counterpart in
   the other language, do not invent one.
4. Check whether RTL rendering is actually correct once `dir="rtl"` is set. If the layout breaks,
   that is part of this task, not a follow-up. Test at 390 and 1440.
5. Re-check the other two non-Arabic underperformers in the list
   (`salle-de-sport-a-sousse-…`, and the second `أفضل وقت لتناول البروتين` URL, which looks like a
   **duplicate** of an existing article at a different path — 508 impressions at 0.20% CTR). If it
   is a duplicate, say so in RISKS with the evidence; do not delete or redirect anything yourself.

## Don't

- Do not rewrite article titles or meta descriptions. They are good, they are the owner's, and
  CTR-chasing copy is not what the data points at.
- Do not touch the PDP, checkout, account, reviews, or the landing sections — separate work is in
  flight in `VentesFlashSection`, `BrandsSection` and `BlogSection`.
- Do not commit, stage or push.
- Do not change `og:locale`; it is already right.

## Acceptance

I will verify, myself, with a Googlebot UA against a real build:

```
cd frontend
npx tsc --noEmit
npm run lint:design
NEXT_DIST_DIR=.next-verify npm run build && git checkout tsconfig.json
node scripts/check-url-contract.mjs
node scripts/check-sitemap-routes.mjs
```

Then, per article route: `<html lang>` matches the article, `dir="rtl"` on Arabic, hreflang present
and reciprocal, `og:locale` unchanged, French articles still `lang="fr"` and **unaffected** — a
regression that flips 200 French articles to Arabic would be far worse than the bug being fixed.
