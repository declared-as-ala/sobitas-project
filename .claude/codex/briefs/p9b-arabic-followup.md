# Phase 9b — answer: no route regrouping. Do the other six, plus one substitution.

You asked:

> May I mechanically regroup the existing routes to give articles their own root layout,
> preserving public URLs and protected page implementations?

**No.** You were right to stop and ask, and your diagnosis is correct — Next 15 gives a layout only
its own ancestors' params, so `app/layout.tsx` cannot see the article slug. But regrouping the route
tree to get a second root layout would move protected product, checkout and account directories to
buy one HTML attribute. The last change that reached into the root layout for a language feature
flipped 23 routes from static to dynamic and was reverted whole. The risk is not proportional.

So: **fix 1 is cancelled as specified.** Everything else in `p9-arabic-serp.md` still stands, and
one substitution replaces most of what fix 1 was worth.

## The substitution — this is the important part

Fix 1 mattered mainly because `globals.css:291` gates the **entire** RTL stylesheet on
`html[dir="rtl"]`, and `<html>` is never `rtl`. But `ArticleDetailClient.tsx:339-341` already sets
`dir` and `lang` correctly on the article body:

```tsx
<div dir={resolveArticleBodyDir(article)} lang={...} className="article-body-root ...">
```

That element is server-rendered and correct today. So **re-gate the RTL rules on a selector that
this element actually matches** — `[dir='rtl']` and its descendants — rather than `html[dir='rtl']`.
The ~70 dead rules come alive for the article body, server-side, with no layout change.

Do this carefully and report exactly what you did:

- Some of those rules are genuinely root-scoped (page-level `text-align`, drawer/sheet direction,
  anything positioned against the viewport). Those must NOT start applying inside an article — a
  rule that flips the site header or a modal because an article is Arabic is a worse bug than the
  one you are fixing. Go through them; keep root-only ones on `html[dir='rtl']`, move the
  content-scoped ones. Say in your report which you moved and which you left, and why.
- `.article-body-root` currently has no CSS rule anywhere in the repo — it is a pure hook. You may
  use it.
- Do not set `dir` on `<html>` from client JS as a workaround. It would not help a crawler and it
  would cause a hydration mismatch.

## Also, you found something I did not brief

> `I18nProvider.tsx` also overwrites document language/direction with French after hydration.

Good catch. Investigate and report it. If it is overwriting `lang`/`dir` unconditionally after
hydration, that is a real defect worth fixing on its own terms — a reader who switches to Arabic
should not be reset to French, and it may be fighting the anti-FOUC script at `layout.tsx:284-291`.
Fix it if the fix is contained to that provider; if it needs the same routing change I just
refused, describe it and stop.

## Still to do, unchanged from the original brief

2. `var(--font-arabic)` is undefined at `globals.css:292`, which invalidates the whole
   `font-family` declaration so the `"Noto Sans Arabic", Tahoma` fallbacks never apply either.
3. Localize the breadcrumb on Arabic articles — `blog/[slug]/page.tsx:292-293` emits
   `Accueil › Blog` into the BreadcrumbList that Google prints as the URL line.
   Add `alternateName` (Arabic) to the Organization/WebSite schema in `util/structuredData.ts` so
   the site-name line can render Arabic too.
4. Arabic synonyms in the auto-link target map, `blog/[slug]/page.tsx:265-271` — the list is Latin
   only, so Arabic prose matches nothing and those articles get ~2 pillar links against 7–8 on a
   French one.
5. `localityHint` is appended at `page.tsx:152` then truncated away at `:160`. Reserve its length
   or apply it before the cut.
6. `og:description` / `twitter:description` at `page.tsx:175`,`:184` take the CMS value
   unconditionally without `buildMetaDescription`, so a 500-char double-encoded `&nbsp;` ships.
7. Arabic headings are set in `font-display` (Archivo, latin subset only) with `uppercase` and
   letter-spacing — `ArticleDetailClient.tsx:284`, `:368`, `:280`, `:392`, `:409`. `uppercase` is a
   no-op on Arabic and letter-spacing breaks cursive joining.

## Don't

- Do not touch `src/config/blogSeoConfig.ts`. It changed under you while you were reading — 27 new
  Arabic entries landed — and I have already verified and staged it.
- Do not touch product routes, `x-crawler/product/**`, `util/productMetaDescription.ts`,
  `content/categories/*.json`, checkout or account.
- No new font unless you argue for it explicitly with its weight.
- Do not commit, stage or push. **No network.**

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p9b npm run build     # a dist dir that does not exist yet
```

**Build into a directory you just created.** A reused `NEXT_DIST_DIR` served stale compiled output
earlier today and made a correct fix look broken for half an hour.

Report the Static/SSG/Dynamic counts (baseline 24 / 8 / 29 — if yours differ, stop and tell me),
the breadcrumb names emitted for one Arabic and one French article, and the pillar-link count in an
Arabic article body before and after.
