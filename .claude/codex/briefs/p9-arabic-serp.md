# Phase 9 — Arabic pages are declared French, and Google prints two French lines on them

## The measurement

Search Console, 3 months to 06/09/2026, sc-domain:protein.tn. Segmented by whether the URL
contains Arabic script:

```
                pages   impressions   clicks    CTR    avg position
Arabic             33        21,558      214   0.99%           8.1
all non-Arabic    967       115,191    4,457   3.87%          14.6
```

Arabic pages rank **nearly twice as well** and convert **four times worse**. Two of them sit at
position 5.4 and 5.8 with 1,631 and 2,637 impressions.

Split further by whether the QUERY names Tunisia (تونس / سوسة / صفاقس):

```
Arabic queries naming Tunisia     19 queries    264 impr   11 clicks   4.17% CTR
Arabic queries not naming it     121 queries  4,025 impr   34 clicks   0.84% CTR
```

So a large part of the raw Arabic impression count is pan-Arab informational traffic that was never
going to buy from a Tunisian cash-on-delivery shop, and no snippet fix will move it. **Do not treat
the 0.99% as entirely recoverable.** The recoverable part is the Tunisian-intent set, which already
converts at 4.17% and where we rank badly — `كرياتين تونس` (the Arabic form of "creatine tunisie")
sits at **position 13.4 with 0 clicks**, `احسن كرياتين في تونس` at 5.7 with 0.

## What is wrong in the code

Audited 08/09/2026. Every claim below was verified against the served HTML.

**1. `<html lang="fr">` is a hardcoded literal — `app/layout.tsx:281` — and there is no `dir`.**
Every Arabic article is declared French and laid out LTR for every crawler and every first-time
visitor. The only thing that ever changes it is the anti-FOUC inline script at `layout.tsx:284-291`,
which reads `localStorage` — Googlebot has none.

Consequence: `globals.css:291` onwards gates the **entire** RTL stylesheet (~70 rules) on
`html[dir="rtl"]`, so all of it is dead on Arabic pages.

**2. `var(--font-arabic)` no longer exists** (`globals.css:292`). It was removed with the Noto Sans
Arabic font in `layout.tsx`, and the comment at `layout.tsx:12-16` claims the fallback chain still
resolves. It does not: an unresolvable `var()` with no fallback makes the declaration invalid at
computed-value time, so the whole `font-family` line is dropped and `"Noto Sans Arabic", Tahoma` is
never reached either.

**3. Google prints two French lines on an Arabic result.** The title and the meta description are
correctly Arabic. The other two lines are not:

| SERP line | source | what an Arabic searcher sees |
|---|---|---|
| site name | `WebSite`/`Organization` `name` in `util/structuredData.ts` | `Protéine Tunisie` |
| breadcrumb | `app/(shop)/blog/[slug]/page.tsx:292-293` | `Accueil › Blog` |

Verified in the served JSON-LD of the Arabic article. This is the cheapest real CTR change here.

**4. In-body links to the commercial pillars are absent on Arabic articles.** The auto-link targets
at `blog/[slug]/page.tsx:265-271` list only Latin synonyms (`'whey', 'créatine monohydrate',
'protéine en poudre'`). Arabic prose says `واي بروتين`, `الكرياتين`, `مصل اللبن`, so nothing matches.
Measured pillar links in the served HTML: Arabic article with no config entry has **2** (both from
page chrome, none from prose); comparable French articles have **7–8**.

**5. `localityHint` is appended then truncated away — dead code.** `page.tsx:152` appends ~45 chars
to the END of the description, then `page.tsx:160` cuts the result at 160. Live proof: the Arabic
description is 154 chars, ends in `…`, and contains neither `تونس` nor `بروتين تونس`. It has never
had an effect on any page whose base description exceeds ~115 chars.

**6. `og:description` / `twitter:description` bypass sanitisation** (`page.tsx:175`, `:184`) — the
CMS value wins unconditionally and is never run through `buildMetaDescription`. Live on the Arabic
page: a 500-char `og:description` containing a double-encoded `&amp;nbsp;`. This matters
disproportionately for Tunisian traffic, which shares on WhatsApp and Facebook.

**7. Arabic headings are set in a Latin-only face.** `ArticleDetailClient.tsx:284` (and `:368`,
`:280`, `:392`, `:409`) uses `font-display` — Archivo, self-hosted **latin subset only** — with
`uppercase tracking-tight`. `uppercase` is a no-op on Arabic, and negative or positive
`letter-spacing` **breaks Arabic cursive letter joining**. `tracking-[0.2em]` on the kickers is the
worst case.

## Do

1. Read `.claude/skills/protein-ui/SKILL.md` first.
2. Fix 1 → 7, in that order; 1 unblocks 2 and 7. The root layout is a Server Component, so the
   article language has to reach it — resolve it in the route and hoist, or move `/blog/[slug]`
   under a locale-aware segment. Decide, and defend the choice in your report.
3. **`export const revalidate` and the static/dynamic split must not change.** The build today is
   **24 Static / 8 SSG / 29 Dynamic**. A `headers()` call in the root layout flipped 23 routes to
   dynamic once before and was reverted whole. Print the three counts in your report; if your
   approach changes them, stop and tell me instead of shipping it.
4. For 4, add Arabic synonyms to the existing map. Do not build a new linking system.
5. `resolveArticleLanguage` in `util/articleLanguage.ts` already does script detection correctly and
   is used for the title, `og:locale` and `inLanguage`. Reuse it; do not write a second detector.

## Don't

- Do not touch `src/config/blogSeoConfig.ts` — another task is editing it right now.
- Do not touch product routes, `util/productMetaDescription.ts`, `x-crawler/product/**`,
  `content/categories/*.json`, the landing page, checkout or account.
- Do not transliterate or change any blog slug. The percent-encoded Arabic slugs all return 200 and
  rank at 5.4/5.8; changing them throws that away for a cosmetic gain.
- Do not invent an Arabic translation of a French article, or add hreflang pairs between articles
  that are not translations of each other.
- No new dependencies, no new font unless you say so explicitly and justify the weight. Do not
  commit, stage or push. **No network.**

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p9 npm run build   # a FRESH dist dir, see below
```

**Verify against a dist directory you just created.** A reused `NEXT_DIST_DIR` served stale compiled
output today and made a correct fix look broken for half an hour.

Report: the served `<html lang>`/`dir` for one Arabic and one French article, the breadcrumb names
on each, the pillar-link count in the Arabic article body before and after, and the
Static/SSG/Dynamic counts.
