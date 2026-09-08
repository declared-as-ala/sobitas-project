# Phase 7 — Ventes flash, Nos marques partenaires, and motion on the Google proof

## The measurement

Every section of the live landing page, measured in the browser at **1536px** on 08/09/2026.
Page total **6,309px** across 13 sections:

```
MEILLEURES VENTES              628
Pourquoi choisir Protéine Tunisie 64
Acheter par objectif           251
LES PLUS VENDUS                612
VENTES FLASH                   303   contain-intrinsic-size: auto 320px
NOUVEAUX PRODUITS             1135
NOS PACKS                      645
JUSQU'À −24% SUR 4 PRODUITS    126
NOS DERNIERS ARTICLES          453   contain-intrinsic-size: auto 504px
NOS MARQUES PARTENAIRES        226   contain-intrinsic-size: auto 178px
ILS NOUS FONT CONFIANCE        875
PROTEIN.TN : VOTRE BOUTIQUE…   385
```

Three facts fall out of that table, and they are the brief.

### A. Ventes flash is the shortest content band on the page

**303px.** It sits between `LES PLUS VENDUS` (612) and `NOUVEAUX PRODUITS` (1135) — so the one
band on the page carrying *a discount and a deadline* is **less than a third** the height of "new
products", and smaller than every other product rail. A shopper scrolling reads size as importance,
and this page currently says new arrivals matter 3.7× more than the sale.

The owner has asked twice for this section to be better. It was rebuilt in `c7deb7df`; it is still
the smallest thing on the page. **Do not just add padding** — that is a taller band, not a stronger
one. Make it *earn* the height: the discount, the saving in dinars, the real countdown, the
products. `FlashDealCard.tsx` and `VentesFlashSection.tsx` are yours.

Rules that still bind:
- **Every number must be real.** Read the discount and the deadline from the product data. There is
  already a live example of doing this right: `PromoBanner` prints "Jusqu'à −24% sur 4 produits"
  from `{count, maxDiscount}` after a hardcoded "−30%" was removed. Do not invent a countdown, a
  stock number, or "X people are viewing".
- If a flash sale has genuinely expired or is empty, the section must degrade honestly, not show a
  frozen timer.
- The dark scope is allowed on flash countdown tiles (see the skill's table) but the band itself is
  a full-width content band — do not paint it dark.

### B. Two `contain-intrinsic-size` values are wrong

- `NOS MARQUES PARTENAIRES` reserves **178px**, actually renders **226px** → 48px short.
- `NOS DERNIERS ARTICLES` reserves **504px**, actually renders **453px** → 51px over.

This is the same bug class already fixed once on this page at 600px (`c7deb7df`, "a 600px phantom
band"). A deferred section whose placeholder disagrees with its real height moves the page under the
reader as it scrolls. Fix both to match whatever your rebuilt sections actually measure, and state
the measured numbers in your report.

### C. Nos marques partenaires — 226px of logo rail

Owner: *"the marques we have in the landing page, make it better."* It is a functional scroll rail
and nothing more. Make it read as a credential.

- Brand logos are real assets — do not generate, recolour or restyle them into something they aren't.
- If a logo is missing or renders badly, **report it**, do not paper over it.
- It links to brand pages; that internal linking is SEO value. Keep every link.

### D. Motion on the Google reviews section

Owner wants it animated. `GoogleReviewsSection.tsx` deliberately dropped a marquee — a row that
moves on its own means a reader chasing a sentence, and its own header comment records why. **Do
not bring the marquee back.**

Reveal-on-scroll is the right shape: cards settle in once, then stay still. Constraints:
- `prefers-reduced-motion` must disable it — the content must be fully visible, not stuck at
  `opacity: 0`. A reveal that depends on JS or an animation to become visible is how a section goes
  blank for real users. It must be visible by default and *enhanced* into animating.
- Under 768px `globals.css` clamps every transition/animation to 0.2s on `*:not([data-motion])`.
  If you genuinely need longer on a phone, carry `data-motion` — do not widen that selector.
- The section is server-rendered and has no `'use client'`. Prefer CSS (`animation-timeline`/
  `@starting-style` are not safe here) or a small client wrapper — if you add one, say why.

The reviews data changed under you: `googleBusinessReviews.ts` now has **20 entries in three
languages** (`fr`, `en`, `ar-Latn-TN`), multilingual ones first so the visible nine are diverse.
Each card already sets `lang={review.language}`. `ar-Latn-TN` is Tunisian Arabic in Latin script, so
it stays LTR — but if an Arabic-script review is added later the card must not break, so do not
hardcode text direction.

**Never add, invent, or "improve" a review.** They are real quotes from a real profile.

## Do

1. Read `.claude/skills/protein-ui/SKILL.md` first.
2. `VentesFlashSection.tsx`, `FlashDealCard.tsx`, `BrandsSection.tsx`, `GoogleReviewsSection.tsx`.
   Check each against `design-baseline.json` with `npm run lint:design -- --report <file>`; any file
   absent from it must finish at **zero**.
3. Measure at 320 / 390 / 768 / 1440 in **both themes**. `scripts/measure-bands.mjs` checks band
   scale and that no two adjacent bands share a surface — run it, the section order matters here.

## Don't

- No new dependencies, no carousel/animation library, no `backdrop-blur` (DS009).
- Do not touch the PDP, checkout, account, reviews, auth, or any SEO file — I have SEO work in
  flight and `[productSlug]/page.tsx` changed this morning.
- Do not commit, stage or push. **No network** — no dev server against prod, no fetching.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
node scripts/measure-bands.mjs <base>
```

Report: the measured height of Ventes flash, Brands and the Google section at 390 and 1440, the two
corrected `contain-intrinsic-size` values, and every flash-sale number with where you read it from.
Any figure not traceable to real product data is a defect.
