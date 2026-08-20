# Protein.tn Storefront Design System — v6

> Brand-level rules (logo, accent ramp, typefaces, French-only, lucide-only, ≥44px) are inherited
> from [`../DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md). This document owns the **storefront**: tokens,
> spacing, primitives, images, dark mode, and the LCP contract.

The canonical visual language for protein.tn. Every page and component must read as one
art-directed brand, not assembled parts. When redesigning a surface, conform it to this document.

> **This document is long because it records reasoning, and reasoning is what stops a decision being
> undone six weeks later. It is not the thing you read at the start of every task.**
>
> The operating layer is the **`protein-ui` skill** — `.claude/skills/protein-ui/SKILL.md` — which
> loads automatically for any UI, UX, visual, styling or layout work, and which every redesign is
> expected to have been read against. It carries the rules, the token vocabulary, the primitive
> table, the verification commands and the new-component contract, and it points back here for the
> *why*. **If you change a rule in this document, change it in the skill in the same commit** — a
> second source of truth that drifts is worse than one long file.

> **Golden rule:** change the *look*, never the *logic*. Only touch `className`, JSX
> layout/structure, typography, spacing, icons, and decorative motion. Do **not** alter data
> fetching, props, API calls, `generateMetadata`, JSON-LD, SEO copy, `href`s, form behaviour, or
> server/client boundaries (`'use client'` stays exactly where it is).

---

## 0. How this document is kept true

v3 drifted across **seven** commits without a single doc update. It claimed the accent was red when
the site had gone orange, that the display face was Oswald when it had become Archivo, and that
`max-w-7xl` was the page rail when `max-w-site` was. It drifted because **it restated values instead
of pointing at the one place that defines them**.

**The governing rule for v4:**

> Every number in this document is either **(a)** a pointer to the `file:line` that defines it, or
> **(b)** enforced by a `lint:design` rule. Prose that is neither is marked `(non-normative)`.

`npm run lint:design` walks `src/**/*.tsx` against `design-baseline.json`. It **fails** when a file
exceeds its baseline, and **fails** when a file absent from the baseline has any violation — new
code must be clean. Counts auto-lower as debt is paid, so progress cannot be undone.

*Why a script and not an ESLint rule:* `next.config.js:21` sets `eslint: { ignoreDuringBuilds: true }`
and lint runs with `--max-warnings 999`, so an ESLint rule **cannot gate a build here**.

*Why a baseline and not a clean rule:* there are **5,788 violations across 108 files** today. A rule
that fails on all of them gets disabled within a day. The baseline makes the debt visible and
strictly monotonic without blocking anyone.

```
npm run lint:design                    check — this is what CI runs
npm run lint:design -- --report        rank the worst files: the migration work queue
npm run lint:design -- --report <file> itemise one file, with line numbers
npm run lint:design:update             regenerate the baseline (review the diff in the PR)
```

`components/ui/*` is excluded — it is upstream shadcn vocabulary, updated by re-vendoring rather
than by hand. Comments and `console.*` calls are stripped before counting: a file should never look
worse for documenting the rule it is explaining, and a developer log line is not UI.

### The four checks that run against the RENDERED page

`lint:design` reads source. Source cannot tell you what a page actually looks like, and three of the
worst defects in this codebase's history were invisible to it — a phantom Tailwind colour that
emitted nothing, a divider rule that only drew on 2 of 10 boundaries, and 16 white-on-white badges.
These four scripts run against a live server (`npm run dev`, then point them at `:3000`):

| script | asserts | exits non-zero when |
|---|---|---|
| `scripts/measure-bands.mjs` | the band architecture | a band's padding is off the scale, or two adjacent bands share a surface |
| `scripts/audit-contrast.mjs` | WCAG 1.4.3 in **both** themes | any text element fails AA, with the background stack composited including alpha |
| `scripts/check-console.mjs` | runtime health | any console error/warning, page exception or failed request |
| `scripts/visual-snap.mjs` · `snap-region.mjs` | what it looks like | — (review artefacts) |

**Both snapshot scripts wait on a CONDITION, not a duration.** They scroll the document to trigger
lazy images and then block until every `img` reports `complete && naturalWidth > 0`. The earlier
fixed `setTimeout` produced a capture whose brand wall was twelve empty cells and whose blog rail was
three grey rectangles — both were then investigated as layout bugs, and both were fine. They also
force `content-visibility: visible`, or every deferred band reports its `contain-intrinsic-size`
placeholder instead of its real height and every measurement is fiction.

**`NEXT_DIST_DIR` exists so these can run safely.** `next dev` and `next build` both write `.next/`;
running a build while a dev server is up leaves the running server pointing at stylesheet hashes
that no longer exist, and the site renders as unstyled HTML. Use
`NEXT_DIST_DIR=.next-verify npm run build`.

*Caveat:* Next rewrites `tsconfig.json`'s `include` to add `<distDir>/types/**/*.ts` on every build,
so a verify build leaves a `.next-verify/types` entry behind. `git checkout -- frontend/tsconfig.json`
after, and never commit it.

---

---

## 0.5 The band architecture (the organising idea)

The page is a **sequence of bands**. A band is a full-bleed horizontal slab of colour that owns its
own vertical padding. Everything below follows from one rule:

> **Separation is a colour change plus a 1px rule. Never emptiness.**

### v6: the page is LIGHT. Black is an accent, not a surface.

v5 read "use more black" as licence to make bands black, and turned **six** of them near-black: the
header, the hero stage, the trust strip, the category captions, Ventes flash and Nos packs. On a
1440px screen that was roughly 62% of the first three screens painted `#0E0E12`.

The owner's verdict (2026-08-03), which is now the governing constraint:

> "I don't want to make a dark version. I want something light, and it has a dark mode and a light
> mode. Keep it white and just use black for important things."

They were right, and the failure is worth naming precisely: **black stopped being emphasis and
became the base colour.** An accent that covers most of the page is not an accent — it is a theme,
and every element that was supposed to stand out against it (the flash countdown, the CTAs, the
product cards) lost the contrast that made it stand out.

**Where a dark scope is allowed:**

| allowed | banned |
|---|---|
| the 36px utility bar | any full-width content band above the footer |
| the flash countdown tiles | the header |
| the hero caption plate & slider controls (over photography) | the hero band |
| product badges (`Rupture`, `Top vente`) | product rails |
| the footer | the category rail |

Alternation is now **canvas ⇄ sunken** (white ⇄ warm sand), plus exactly **one** saturated orange
strip. Checkable rather than arguable: on the homepage at 1440px, no more than ~12% of painted area
above the footer may be a dark surface. Measured after v6: **8.4%**.

### The homepage band sequence

Decided in `HomePageClient.tsx`, never inside a section component:

```
hero            canvas      the artwork supplies the darkness
trust strip     sunken
catégories      canvas
plus vendus     sunken
ventes flash    canvas      + four black countdown tiles
nouveautés      sunken
packs           canvas
promo strip     ORANGE      the one saturated band
blog            sunken
marques         canvas
bloc SEO        sunken
```

`node scripts/measure-bands.mjs` asserts both invariants — every band padding is one of the four
values in the scale, and no two adjacent bands share a surface. It exits non-zero otherwise.

### Why the band model replaced the old one

Measured on the live homepage before v5, at 1440px:

| | |
|---|---|
| dead vertical space between bands | **1,004px — 11.0% of the document** |
| the three worst gaps | **160px each** |
| distinct section-heading sizes | **7** (13, 24, 26, 30, 40, 52, 60px) |
| band backgrounds | essentially all white |

Every 160px gap was two adjacent `py-20` paddings on two identical **white** backgrounds: 80 + 80,
with no colour change to justify either. That is what "looks like WordPress" actually is —
undifferentiated sections separated by air.

### The five surfaces

| surface | light | dark | used for |
|---|---|---|---|
| `base` (canvas) | `#FFFFFF` | `#0A0A0B` | hero, category rail, flash, packs, brands |
| `sunken` | `#F7F6F4` | `#191A1D` | the alternating band: trust strip, best-sellers, nouveautés, blog, SEO |
| `slab` | `#0E0E12` | `#2A2A30` | **accents only** — utility bar, countdown tiles, badges, footer |
| `scrim` | `#0A0A0B` @ 86% | same | the one dark surface that sits *over* content: hero caption, slider controls |
| `promo` | `#D03B04` | `#8A2E0C` | the single orange strip |

**The slab is defined as "the surface that steps AWAY from the canvas."** In light theme that is
down (19.26:1 against white). In dark theme the page is already near-black, so the slab steps **up**
to #2A2A30 and sits *proud* of the page. The alternation survives even though the polarity inverts.
That is why the slab is a token scope rather than a `bg-black`, and why an element that must stay
dark in both themes takes `.pt-slab` and never `bg-ink-1` — `--c-ink-1` is the colour of *type*,
and the colour of type is supposed to flip. `bg-ink-1 text-white` shipped 16 white-on-white product
badges at 1.10:1 in dark mode before `scripts/audit-contrast.mjs` caught it.

`.pt-scrim` shares every token pointer with `.pt-slab` and differs only in its fill (86% alpha), so
the two are declared together in `tokens.css` and cannot drift apart.

### Token scopes, not variant props

`.pt-slab`, `.pt-plate` and `.pt-promo` (`styles/tokens.css`) re-point the whole `--c-*` set for
their subtree. A component written in `bg-elevated text-ink-1 border-hairline` therefore renders
correctly on **all four surfaces, in both themes, with no `dark:` variant and no `onSlab` prop**.
The band decides; the component does not know.

`.pt-plate` is the inverse: a white card punched out of a black slab restores page scope. It
re-declares `color` as well as `background-color` — without that, the slab's inherited ink lands on
a white card at **1.70:1**.

Three rules that are not negotiable:

1. **Never put a scope class on a focusable element.** The focus ring resolves in the element's own
   scope but paints on the *parent* band's surface — a #FF8A4C ring on white is 2.34:1. Scope the
   plate, not the link.
2. **The scope class and `.pt-defer` must be the same element.** `content-visibility: auto` skips a
   subtree's paint but **not** the element's own box decoration, so a slab background on a *child*
   of a deferred wrapper renders as a white rectangle until it scrolls in. `<Section defer>` exists
   so this cannot be got wrong.
3. **A surface maps to a scope class ONLY, never to a `bg-*` utility.** `tokens.css` is imported
   before `@tailwind utilities`, so a utility at equal specificity wins on source order and you get
   a band whose tokens flipped but whose background did not.

### The automatic seam

```css
[data-band]              { border-top: 1px solid rgb(var(--c-rule)); }
[data-band][data-band-first] { border-top: 0; }
```

Emitted by `<Section>`, never by call sites, so a seam cannot be forgotten.

**It is deliberately not `[data-band] + [data-band]`.** That was the first implementation and it
silently drew **2 of 10 seams**: the adjacent-sibling combinator needs DOM siblings, and most bands
sit inside `div.pt-reveal` motion wrappers as only-children. Nesting is a layout detail and must
never decide whether a structural rule exists.

The seam is what keeps dark mode honest. In light theme the fills do the work (slab vs canvas =
19.26:1). In dark they cannot (1.39:1) — so the rule, at 3.18:1 against the band and 4.41:1 against
the canvas, is what preserves the architecture. Without it "more black" would be an architecture
that only exists for half the users.

### Two boundary weights

| token | job | floor |
|---|---|---|
| `hairline` | a border on something that also has its own fill (card, input, chip) | none — decorative |
| `rule` | a band seam, alongside a fill change | none |
| `rule-strong` | a divider that is the **sole** boundary between identical surfaces | **3:1** (WCAG 1.4.11) |

The brand wall's `gap-px` matrix is the `rule-strong` case: 3.34:1 on white, 4.10:1 on the dark
plate. Using `hairline` there looks fine and measures **1.26:1**.

---

## 0.6 The accent is legal everywhere — and that is new in v6

v5's brand orange was `#D53B04`, which measured **4.36:1 on the sand band — below AA**. The doc
carried a rule saying "never put `text-brand` on `bg-sunken`", and that rule was a trap: v6's
light-dominant sequence puts **five** bands on sand and every one of them has a brand-coloured
kicker.

The accent is now **`#D03B04`** — five units of red darker, which is imperceptible:

| pair | ratio |
|---|---|
| `text-brand` on `sunken` (#F7F6F4) | **4.51:1** ✅ |
| `text-brand` on `canvas` (#FFFFFF) | **4.87:1** ✅ |
| white on `bg-brand` | **4.87:1** ✅ |

**Sand is the binding constraint.** Anything that passes on sand passes on white, so re-tune against
sand, never against white.

`brand-500` (#F8480C) is **graphical accents only**: 3.55:1 on white, and white-on-it is also
3.55:1. It must never carry text and never be a text background.

**Contrast is verified, not asserted.** `node scripts/audit-contrast.mjs --routes / /shop /blog
/packs --themes light dark` walks every text element, composites the full background stack
(including alpha), and exits non-zero on any AA failure. It must be run before any colour change
ships. The naive version of that script — read `color`, read `backgroundColor`, divide — is worse
than nothing: most elements are `rgba(0,0,0,0)`, and `bg-brand/10` over white is `#FBEBE6`, not
`#D03B04`.


## 1. Typography

Defined in `tailwind.config.ts:23-59`. **Three** faces, not two:

| Role | Face | Utility |
| --- | --- | --- |
| Display — section titles, hero, prices, badges, countdowns | **Archivo** (variable) | `font-display` |
| Body / UI — paragraphs, labels, inputs, nav | **Inter** | `font-sans` (default) |
| Product cards only | **Poppins** | `font-poppins` |

**`font-display` already means compressed.** `globals.css:75` sets `font-variation-settings: 'wdth' 82`
on it in `@layer base`, so `.font-compressed` is redundant on any element that already has
`font-display`. This is the single most surprising fact in the codebase — Archivo is not a condensed
face by default, and the compression is applied globally rather than at the call site.

- **Section titles:** `font-display uppercase tracking-tight` — use `SectionHeader`, don't re-type it.
- **Kicker (eyebrow):** use `Kicker` (`components/layout/Kicker.tsx`).
- **Prices / numbers:** `font-display font-bold tracking-tight tabular-nums`.
- Body copy stays Inter, normal case. **Never uppercase body copy.**

Semantic sizes exist at `tailwind.config.ts:50-59`: `text-display`, `text-lead`, `text-ui`,
`text-caption`.

## 1.5 The section heading scale — three sizes, chosen by commercial role

The homepage shipped **seven** section-heading sizes on desktop and six on mobile. Nobody chose
seven; seven *happened*, because five components each hardcoded their own clamp. Intermediate sizes
with no rule behind them are exactly what makes a page look like a purchased theme.

Every section `h2` on the page is now emitted by **one** component, `SectionHeader`, which takes
`scale` and defaults to the smallest:

| scale | mobile / desktop | reserved for |
|---|---|---|
| `"1"` | 40 / 56px | **the four rails that sell** — Les plus vendus, Ventes flash, Nouveaux produits, Nos packs |
| `"2"` | 30 / 40px | support bands — Acheter par objectif, Nos derniers articles, the SEO block |
| `"3"` | 22 / 28px | bands that sell nothing directly — Nos marques partenaires — and the **default** |

**Size follows commercial role, not background colour and not taste.** A logo wall getting a bigger
heading than the best-seller rail is the failure mode of any "consistent" scale that keys off
surface. Here the brand wall is deliberately the *smallest* heading on the page and the
highest-intent rail is the largest.

`scale` defaulting to `"3"` is what keeps `ProductDetailClient`'s "Produits similaires" from
out-ranking the product's own H1 across 391 PDPs.

Hierarchy is carried by Archivo's **variable width axis**, not by more sizes: a 12px kicker at
wdth 112 with 0.22em tracking over a 56px headline at wdth 82 with −0.02em tracking is a 4.7x size
ratio **and** a 30-point width delta **and** a 0.24em tracking delta — three axes of contrast from
two type sizes.

---

## 2. Colour — one accent, and only one

**The accent is ORANGE**, matched to the Protein.tn logo. Defined at `tailwind.config.ts:60-110`
and `styles/tokens.css:26-27`.

**Two working shades, and they are not interchangeable:**

| Shade | Hex | Contrast on white | Use |
| --- | --- | --- | --- |
| `brand-500` | `#F8480C` | ~3.5:1 | **Graphical only** — accent rules, icon fills, decorative marks. **Never white text on it, never body text in it.** |
| `brand-600` | `#D03B04` | **4.87:1 white / 4.51:1 sand (AA)** | **The action shade** — buttons, prices, links, active states. Darkened from `#D53B04` in v6 so it clears AA on the sand band too; see §0.6. |

Getting these backwards is the most common way to ship an accessibility failure here.

**`red-*` is remapped to the orange ramp** (`tailwind.config.ts:82-110`). This was a deliberate
zero-churn re-skin: ~300 existing `bg-red-600` call sites became brand orange with no file edits and
no half-migrated period. The utility is named "red" while rendering orange — that is the accepted
cost. **New code writes `brand-*`** (DS011).

- **Spend the accent sparingly.** It marks the primary CTA, the price, an active state, a kicker
  rule, a count badge. Nothing else. When the accent is the background, it can no longer mean anything.
- **Never invert an asset to fit a background.** If an asset needs `brightness-0 invert` to be
  legible, the surface is wrong. (`dark:` inversion for dark mode is fine.)
- Semantic colours (green success, red error) are for genuine status only — stock, form errors,
  toasts. `destructive` must stay **red, not brand orange**, or a delete button becomes
  indistinguishable from add-to-cart.

## 3. Spacing scale

**This section did not exist in v3, and its absence is what produced the CategoryRail defect.**

Vertical rhythm is owned by `<Section>` (`components/layout/Section.tsx:14-19`). These are the only
legal section paddings:

| Token | mobile / sm / lg (px) | Use |
| --- | --- | --- |
| `spacing="none"` | — | the section manages its own padding |
| `spacing="stage"` | `py-0` | 0 | a band fused to its neighbour |
| `spacing="strip"` | `12 / 16` | anything exactly one row tall — the trust strip |
| `spacing="tight"` | `32 / 40 / 48` | support bands: category rail, promo strip, blog, brand wall, SEO block |
| `spacing="default"` | `40 / 48 / 64` | every canvas/sunken product or content grid |
| `spacing="feature"` | `48 / 64 / 80` | **Ventes flash, and nothing else.** It is what makes that band physically dominate now that it is no longer black. Two dominant bands is zero dominant bands |

**Every number is a multiple of 8 — that is the v6 change.** v5's scale was
`12/14/16 · 24/32/36 · 32/40/48 · 40/48/56`, and three of those twelve (14, 36, 56) are off-grid. No
two bands were ever an exact multiple of each other's rhythm, and the eye reads a column of
near-misses as arbitrary. That is what the owner meant by "bad spacings, bad calculation". On an 8px
lattice the band padding, the grid gaps, the card padding and the icon insets all resolve as ratios.

Each step is the previous one plus exactly one 8px unit at mobile and two at desktop, so the
hierarchy between two adjacent bands is always legible and never accidental.

**`flagship` (`py-16 sm:py-20 lg:py-24`) is DELETED.** It was the top of the ladder that produced
the three 160px voids. Verified before removing: `grep -rn flagship src/` returned the definition
and nothing else — zero call sites — so nothing could silently keep 96px.

**Never invent a local `py-` on a section** (DS008). If a band needs a value that is not here, the
scale is wrong — fix the scale, do not add a sixth number in a call site. `scripts/measure-bands.mjs`
enforces this against the rendered page, so a hand-rolled padding fails the check even when it is
written as an arbitrary Tailwind value the linter's regex would miss. The hero's first draft failed
it with a bespoke 32px and was moved onto the `strip` value.

**Padding, never margin.** A margin between two bands paints the *parent's* colour, which
reintroduces exactly the gap this scale removes.

### The band-boundary rule

> The gap between two bands is the **upper band's `pb` plus the lower band's `pt`**. Never add a
> compensating prop to a component to fix a neighbour's spacing — **fix the neighbour.**

**Worked example — the `tightTop` anti-pattern.** `CategoryRail` hand-rolled `py-7 sm:py-9`: roughly
half the site rhythm, with no `lg:` step at all. To hide the resulting gap, `ProductSection` grew a
`tightTop` prop (`pt-3 sm:pt-4`). Two components were deformed to cover for one wrong number, and the
prop's own JSDoc had rotted into describing a component that no longer existed. The fix was to give
the rail a correct `spacing="tight"` and delete `tightTop` outright.

Header rhythm: `SectionHeader` uses `mb-6 sm:mb-8 lg:mb-10` (24 / 32 / 40) — one 8px unit per
breakpoint, matching the band scale's own growth, and always strictly smaller than the band's `pt`
so the heading reads as part of the band's body rather than as a third thing floating between the
padding and the content. `VentesFlashSection` hand-rolls its header (because of the countdown) and
must be kept in step by hand.

Card padding: `p-5 sm:p-6` (20 / 24) for content cards; `px-4 py-4` for the category captions;
`px-4 py-3` for strip cells. All on the 8/4 lattice.

**Do not nest a padded card inside the site container.** `Container` already applies
`px-4 sm:px-6 lg:px-8`; a card with `p-4` inside it is *additive*, so mobile content ends up 32px
from the edge instead of 16. That was the CategoryRail bug.

## 4. Layout rails

`Container` (`components/layout/Container.tsx:15-20`) owns horizontal width. Always
`mx-auto w-full … px-4 sm:px-6 lg:px-8`.

| `width` | Value | Use |
| --- | --- | --- |
| `narrow` | `max-w-3xl` | long-form reading |
| `default` | `max-w-7xl` | interior pages |
| `wide` | **`max-w-site` = 1600px** (`tailwind.config.ts:180-195`) | every full-width band: header, hero, category rail, product sections, footer |
| `full` | `max-w-none` | full-bleed |

**v3 was wrong here** — it named `max-w-7xl` as "THE" rail and instructed "never exceed it (no
1600px)". `max-w-site` is the homepage rail and has been since the width token landed.

The codebase currently runs **two** rails (`max-w-7xl` on interior routes, `max-w-site` on the
homepage). That is a real inconsistency, and it gets resolved in **one dedicated PR** once primitive
adoption is broad — never incidentally inside a redesign (`Container.tsx:10-13`).

Mobile-first. Never cause horizontal body scroll; wide content scrolls inside its own
`overflow-x-auto` container.

## 5. Tokens

Defined in `src/styles/tokens.css`, wired in `tailwind.config.ts`. Values are space-separated RGB
triplets so Tailwind's `<alpha-value>` works (`bg-brand/10`, `text-ink-2/70`).

**The shadcn semantic names now resolve to these same tokens** — `bg-background` is `--c-canvas`,
`bg-primary` is `--c-brand`, `border-border` is `--c-hairline`, and so on. One source of truth. Both
vocabularies are live and equivalent; prefer the `--c-*`-named utilities (`bg-canvas`, `text-ink-1`)
in app code, and let `components/ui/*` keep the shadcn names it ships with.

Two tokens exist only to be paired, and must not be replaced by literals:

| Token | Why it is not a constant |
| --- | --- |
| `--c-on-brand` | The foreground that sits **on** the accent. White in light mode; **near-black in dark**, because white on the dark accent `#FF8A4C` measures ~2.2:1 and fails AA outright. |
| `--c-danger` | Destructive stays **red in both themes**, never brand orange — a delete button must not look like add-to-cart. |

**Primary CTA = `<Button>` with no variant.** `variant="default"` *is* the brand button now that
`--primary` is the accent; `outline` is its secondary form and `ghost` the quiet one. The old
`brand` / `brandOutline` / `brandGhost` variants were deleted — they existed only because
`--primary` was near-black and broken, and they had zero usages.

| Token | Utility | Light / dark |
| --- | --- | --- |
| Brand accent | `bg-brand`, `text-brand`, `hover:bg-brand-hover` | `#D53B04` / `#FF8A4C` |
| Page canvas | `bg-canvas` | `#FFFFFF` / `#0A0A0B` |
| Card / sheet | `bg-elevated` | `#FFFFFF` / `#141416` |
| Alternating band | `bg-sunken` | `#F7F6F4` (warm sand) / `#101012` |
| Hairline | `border-hairline` | `#E8E5E1` / `#26262A` |
| Ink 1 / 2 / 3 | `text-ink-1` / `-2` / `-3` | headings / body / meta |

**These are theme-aware.** That is the whole point — see §8.

## 6. Shared building blocks (reuse — do not re-invent)

Each entry says *what it replaces*, because the failure mode here is not ignorance of the primitive,
it is copy-pasting the string it exists to delete.

| Primitive | Path | Replaces |
| --- | --- | --- |
| `Container` | `components/layout/Container.tsx` | inline `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (33 files) |
| `Section` | `components/layout/Section.tsx` | inline `py-12 sm:py-16 lg:py-20` (16 files) |
| `Kicker` | `components/layout/Kicker.tsx` | the hand-rolled eyebrow |
| `SectionHeader` | `components/SectionHeader.tsx` | kicker + title + optional "Voir tout" |
| `PageHeader` | `components/PageHeader.tsx` | interior-page H1 block |
| `ProductCard` | `components/ProductCard.tsx` | product grids — do **not** restyle |
| `ProductGrid` | — | `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6` |
| `Skeleton` | `components/ui/skeleton.tsx` | every bare `animate-pulse` div |
| `MobileTabBar` | `components/MobileTabBar.tsx` | mounted once in the root layout |

**Reference implementation: [`components/CategoryRail.tsx`](src/app/components/CategoryRail.tsx).**
Read that file rather than this paragraph. It is the canonical example of `Section spacing="tight"`,
`Container width="wide"`, a derived `sizes` string, and a tile grid with no nested card.

`ProductCard`'s image geometry lives in `util/productCardFrame.ts` and is shared with
`ProductCardSkeleton` — change the shared constant, never one of the two, or you ship CLS.

Anything `fixed` at the bottom of the viewport MUST offset against `--tabbar-h` (`bottom-tabbar`, or
a `calc()` that composes with it). Never hardcode the bar's height.

## 7. Images — how to derive `sizes`

**Getting `sizes` wrong is silent.** Too small and the browser upscales a blurry candidate; too
large and you ship bytes nobody sees. Neither shows up in a build, a typecheck, or a screenshot at
your own DPR.

**The rule:** `object-cover` scales by the **constraining axis**. If the source aspect and the tile
aspect differ, the required width is *not* the tile width.

> Source 4:3 in a **square** tile → the height constrains → required width = `tileWidth × 4/3`.
> Source 4:3 in a **4:3** tile → exact fit → required width = `tileWidth`.

**Worked example — `CategoryRail`** (gutters 16/24/32 per side; gaps 12 then 16; `max-w-site` 1600):

| Bracket | Geometry | Derivation | `sizes` |
| --- | --- | --- | --- |
| mobile | 2-up, `aspect-[4/3]`, 4:3 source → exact fit | `(vw − 44)/2`, peaks 46.6vw @639 | `47vw` |
| `sm` | 3-up, `aspect-square`, 4:3 source → scales by height | `(4/9)(1 − 80/vw)`, peaks 41.0vw @1023 | `42vw` |
| `lg` | 6-up, capped at 1600 | `(1600−64−80)/6 = 242.7 → ×4/3 = 323.6` | `340px` |

The previous `31vw` at `sm` asked for 317px where 419px was needed — a visible **1.09× upscale**.

**Verify, don't assume.** Load the page, inspect the element's `currentSrc`, and confirm the chosen
candidate width is ≥ the tile's CSS width × DPR. Buckets are `imageSizes` + `deviceSizes` in
`next.config.js:38-39`.

Other rules: `priority` only on the true LCP image (§12). `quality` must be a member of
`next.config.js:41`. Image tiles are `aspect-[4/3]` (category/blog) or `aspect-square` (product),
`object-cover`, `rounded-xl overflow-hidden`.

## 8. Dark mode — write **fewer** classes, not more

**v3 taught the opposite of this, and that is how 2,037 `dark:` variants across 114 files happened.**
It said "every colour needs a `dark:` counterpart" and listed the pairs to memorise.

**v4 rule: surfaces and ink come from tokens, and tokens are theme-aware, so they need no `dark:` at
all.** Two classes collapse into one, every time:

```
bg-white dark:bg-gray-950            → bg-canvas
bg-white dark:bg-gray-900            → bg-elevated
bg-gray-50 dark:bg-gray-900          → bg-sunken
border-gray-100 dark:border-gray-800 → border-hairline
text-gray-900 dark:text-white        → text-ink-1
text-gray-600 dark:text-gray-400     → text-ink-2
text-gray-500 dark:text-gray-400     → text-ink-3
text-red-600 dark:text-red-400       → text-brand
bg-red-600 hover:bg-red-700          → bg-brand hover:bg-brand-hover
```

`dark:` is now reserved for **asset inversion** and **genuine one-off contrast fixes** (DS002).
This table is the "use less CSS" instruction expressed mechanically — it is the only sanctioned way
to write a colour.

## 9. Surfaces, shape & motion

- **Flat.** No glassmorphism, no floating gradient orbs, no multi-stop decorative gradients.
- **`backdrop-blur` is banned outright** (DS009), including on chips and badges — beyond the visual
  rule, each instance forces its own compositing layer, one per card on a product grid.
- **Radius:** `rounded-xl` cards/tiles/CTAs; `rounded-lg` small chips; `rounded-full` pills/avatars only.
- **Shadows:** hairline border + `shadow-sm` at rest → `hover:shadow-md`. No arbitrary
  `shadow-[0_2px_12px_rgba(...)]` (DS005) — `shadow-card` / `shadow-card-hover` exist
  (`tailwind.config.ts`).
- **Motion is calm.** Prefer no entrance animation. Allowed: `transition-colors`,
  `transition-transform`, a subtle `group-hover:scale-*`, `group-hover:translate-x-*` on a trailing
  arrow. Prefer naming the properties (`transition-[transform,box-shadow]`) over `transition-all`,
  which also animates things like `ring-color`.
- **The mobile motion clamp:** `globals.css:291-301` forces
  `animation-duration/transition-duration: .2s !important` on `*:not([data-motion])` under 768px. A
  component needing a longer mobile transition must carry `data-motion`. Do not widen that selector —
  `.pt-reveal`'s reduced-motion carve-out depends on `*` staying untouched, and Radix primitives
  unmount on `animationend`.
- **Loaders are ONE system.** `components/ui/skeleton`. Skeletons must match the final layout
  exactly — same padding, gaps, aspect ratios — so there is zero layout shift.

## 10. Hard rules

| Code | Rule |
| --- | --- |
| DS001 | No `bg-white` / `bg-gray-*` — use `bg-canvas` / `bg-elevated` / `bg-sunken` |
| DS002 | No manual `dark:` colour pairs — tokens are theme-aware (§8) |
| DS003 | No `text-gray-*` — use `text-ink-1/2/3` |
| DS004 | No `border-gray-*` — use `border-hairline` |
| DS005 | No arbitrary `shadow-[…]` |
| DS006 | No arbitrary hex `[#…]` — add a token |
| DS007 | No inline `max-w-7xl` / `max-w-[1400px]` — use `<Container>` |
| DS008 | No off-rhythm `py-*` on a `<section>` — use `<Section spacing=…>` |
| DS009 | `backdrop-blur` banned |
| DS010 | Zero emoji or dingbats as UI (`🎉 ⚡ ✓ ★ › →`) — lucide icons only, monoline, `h-4 w-4`/`h-5 w-5` |
| DS011 | Prefer `brand-*` over `red-*` (`red` is a legacy alias for the same ramp) |

Plus, not lint-enforceable: **French only** — no English UI labels, no Arabic leftovers,
`aria-label`s in French, French month names via `toLocaleDateString('fr-FR', …)`. **≥44×44px** hit
area on every interactive control. **Server-first** — no `'use client'` without
state/effects/handlers/browser-API.

## 11. Centrally owned — change deliberately

Shared or load-bearing. Change in a *dedicated* PR with a visual pass, never as a side effect of
redesigning one page.

- **Shared components:** `ProductCard` + `ProductCardSkeleton` (must move together),
  `SectionHeader`, `PageHeader`, `ProductGrid`, `Container`, `Section`, `Kicker`, `MobileTabBar`.
- **Config & global CSS:** `tailwind.config.ts`, `globals.css`, `styles/tokens.css`, `layout.tsx`.
- **Do not restyle `components/ui/*`** — extend additively.
- **Off-limits to visual work entirely:** `middleware.ts`, `app/x-crawler/*`, anything under
  `structuredData`/metadata, and the LCP contract in §12.

## 12. Hero & LCP contract (do not break)

The homepage hero is the mobile LCP element. Its speed rests on one invariant:

> The `<link rel="preload">` and the `<img>` the browser actually paints must resolve to the
> **byte-identical URL** under the **same media query**. If they drift, the image downloads twice
> and the preload is wasted.

They are derived from a single object — `buildHeroImageSet()` in `src/util/heroImage.ts`. `page.tsx`
renders `set.preload`; `Hero` renders `set.sources`. **Never hand-write a hero preload.**

Rules that fall out of this, each with its reason:

- **No `next/image` on slide 1.** It emits a `srcset` and the browser picks at runtime, so the server
  cannot know which URL to preload. Raw `<img>`, one deterministic URL.
- **Fixed widths only** (`w=828` mobile, `w=1920` desktop), and they must be members of
  `images.deviceSizes` or the optimizer returns 400.
- **Never downscale a landscape image for mobile.** `object-cover` then scales by height and drops
  under 1:1. Only a dedicated portrait crop gets `w=828`.
- **No `crossOrigin` on the preload.** Same-origin, non-CORS; a mismatched CORS mode downloads twice.
- **No embla on the hero.** It replaces native scrolling with JS transforms and cannot work until
  hydrated — exactly the window the LCP element must survive. CSS scroll-snap + anchor dots instead.
  Embla stays for product rails.
- **Keep the definite heights** (`.pt-hero`, `globals.css:365-384`). Never an aspect-ratio box: that
  resizes with the image and reintroduces CLS.
- Slide 1 is `eager` + `fetchPriority="high"`; slides 2+ are `lazy` + `fetchPriority="low"`.
- **Everything below the hero stays `loading="lazy"`** — six eager category tiles competing with the
  preloaded hero is how you lose LCP.

**Infrastructure this depends on:** Next's optimizer cache lives at `/app/.next/cache/images`. The
Dockerfile must `chown` it to the runtime user *after* the `COPY`s, and docker-compose mounts a named
volume so it survives deploys. When that write fails, Next logs `Failed to write image to cache` and
serves anyway — a cold cache is **silent** and every request re-transcodes. Verify with
`x-nextjs-cache: HIT` on a second request.

## 13. Known broken / in-flight

Dated and owned. **The PR that fixes an entry deletes it in the same commit.**

### ~~Six near-black content bands — the page read as a dark theme~~ — *FIXED 2026-08-03 (v6)*

v5 turned the header, the hero stage, the trust strip, the category captions, Ventes flash and Nos
packs into full-width `#0E0E12` bands — about 62% of the first three screens at 1440px. The owner's
report was that it hurt to look at, and that is the correct read: sustained near-black-and-white at
that coverage is a glare/eye-strain problem, not a taste one.

The mistake is worth naming because it is easy to repeat: **"use more black" was implemented as
"make surfaces black", when what it meant was "make the important things black".** An accent that
covers most of the page has stopped being an accent. Everything that was supposed to stand out
*against* black — the countdown, the CTAs, the product plates — lost the contrast that made it stand
out, so the redesign defeated its own purpose.

Fixed by §0.5's allowed/banned table plus a measurable ceiling (≤12% dark coverage above the footer;
measured 8.4%). `spacing="feature"` and a live countdown now do the work the black fill was doing.

### ~~`bg-ink-1` used as a fill: 16 white-on-white badges in dark mode~~ — *FIXED 2026-08-03*

`ProductCard`'s Rupture and Top-vente chips were `bg-ink-1 … text-white`. `--c-ink-1` **inverts with
the theme**, so in dark mode the chip was `#FFFFFF` text on a `#F5F4F2` pill: **1.10:1**, sixteen
times on the homepage alone. Nobody saw it because nobody screenshots dark mode, and it was
introduced by a token *migration* — the very change that was supposed to make dark mode correct.

The rule: **an element that must stay dark in both themes is a SCOPE (`.pt-slab`), never an ink
token used as a fill.** `ink-1` means "the colour of type", and the colour of type is supposed to
flip. Found by `scripts/audit-contrast.mjs`, which now exists for exactly this class of defect.

### ~~`text-brand` was illegal on the sand band~~ — *FIXED 2026-08-03*

See §0.6. A colour token that is illegal on one of the page's two surfaces is a trap rather than a
rule, and v6 walks straight into it with five sand bands. `#D53B04` → `#D03B04`.

### ~~The hero controls relied on a text-shadow over admin artwork~~ — *FIXED 2026-08-03*

The slide counter and dots were bare white with `[text-shadow:0_1px_10px_rgba(0,0,0,0.6)]`, and the
arrows were `bg-black/45`. Over a bright banner — which is what a supplement brand ships — the
counter measured **1.08:1** and the arrow chevron **2.90:1**, under even the 3:1 graphical floor.
Both now sit on `.pt-scrim` pills.

Same principle as the caption plate, and it is general: **a scrim over an image the admin uploads
can never be proven to clear a ratio; a solid plate can.** If legibility depends on which
photograph someone picked, it is not a property of the component.

### ~~The token bridge is severed~~ — *FIXED 2026-08-02*

Resolved. The shadcn names now point at the `--c-*` tokens (§5). Kept here as a short record
because the failure mode is worth recognising again:

`hsl(var(--x))` wrapped around a hex/oklch value is **invalid CSS, so the browser drops the whole
declaration silently.** No build error, no console warning, no red squiggle — the utility simply
does nothing, and a codebase quietly grows 2,000 hardcoded workarounds around the hole. `body`'s
background, the universal border rule, and the default `<Button>`'s fill were all no-ops for months.

Two lessons that generalise:

1. **Verify tokens in the emitted stylesheet, not the config.** The config looked correct. The
   built CSS is where `hsl(#ffffff)` shows up. A missing `--tw-bg-opacity` next to a colour rule is
   the tell that a token is dead.
2. **Repairing a dead token activates it.** `text-muted-foreground` had never rendered, so nobody
   noticed that `--c-ink-3` failed WCAG AA (4.06:1 on the sand band). Fixing plumbing exposes
   whatever was hiding behind it — re-check contrast after any token repair, don't assume.

**Origin:** a Figma Make export (Tailwind v4 flavoured) hand-downgraded to v3. v4 reads raw colour
values; v3's convention is `hsl(var())`. Do not reintroduce v4 syntax until v4 is actually installed.

### ~~Alternating bands are invisible in dark mode~~ — *FIXED 2026-08-03*

`--c-sunken` was `#101012` against a `#0A0A0B` canvas: **1.041:1**. Every alternating band on the
entire site was invisible in dark theme — *less* separated than light mode's own 1.08:1. It had
been shipping for as long as the token existed, and nobody saw it because nobody screenshots dark
mode. Raised to `#191A1D` (1.14:1), with every ink re-checked on it (ink-1 15.83, ink-2 9.41,
ink-3 5.92, brand 7.45).

The generalisable lesson: **a surface pair needs a measured number, not an eyeball.** Two
near-blacks always "look different" on the display you designed them on.

### The hero caption sat on top of the previous-slide arrow — *FIXED 2026-08-03*

Measured overlap at every width from 768px up: 28px @768, 12px @1024, 4px @1280 and @1440. The
arrow is `left-2 sm:left-4` at 44x44, so from `sm` it occupies 16–60px, while the caption padded
32/48/56px — always short of 60. Now `sm:pl-[4.5rem]`.

### Brand-variant logo assets — *open, needs the owner*

The brand wall keeps light plates in **both** themes rather than logos on black, because the
supplied marks are dark-on-transparent third-party colour assets: `dark:invert` destroys them and
dropping them on #0E0E12 makes half of them vanish. "Logos on black" needs light-variant assets for
~40 brands — a content project, not a CSS change.

### Two page rails — *open*
`max-w-7xl` on interior routes vs `max-w-site` on the homepage. Resolve in one dedicated PR (§4).

### Two loyalty point systems — *open*
`LoyaltyPointTransaction` and `UserPointTransaction` run in parallel. Not a design-system issue, but
it surfaces in account UI.

### `CategoryGrid` has zero consumers — *open*
Kept deliberately: `HomePageClient.tsx:210-218` documents it as the intended block for category
landing pages. Delete it or use it; do not leave it undecided indefinitely.

## 14. RTL

`globals.css:196-281` overrides physical-direction utilities with `!important` for `html[dir="rtl"]`
(~85 lines). New components should prefer logical properties, or they will break in Arabic.

---

## 14b. Status colour — never tint the plate with the text's own hue

`--c-ok` and `--c-warn` are documented at **5.02:1**, `--c-destructive` at **4.84:1**. Those numbers
are measured against an *untinted* surface — the page canvas.

Compositing the same hue behind them destroys the margin. Measured on the account status badges,
which is where this rule came from:

| Chip | `bg-<token>/10` | `bg-elevated` |
|---|---|---|
| Livrée (`ok`) | 4.39:1 ✗ | 5.02:1 ✓ |
| En livraison (`warn`) | 4.38:1 ✗ | 5.02:1 ✓ |
| Annulée (`destructive`) | 4.14:1 ✗ | 4.84:1 ✓ |
| Gagnés, on a `bg-sunken` row | 4.08:1 ✗ | 5.02:1 ✓ |

So the canonical status chip keeps the colour in the **border and the text** and leaves the plate
alone:

```
border border-ok/40 bg-elevated text-ok
border border-warn/40 bg-elevated text-warn
border border-destructive/40 bg-elevated text-destructive
border border-rule bg-elevated text-ink-2          /* neutral */
```

A `/10` tint behind an ICON is fine — a graphical object needs 3:1, not 4.5:1, and the icon plates
in `AccountSummary` and `AuthShell`'s benefit list use exactly that.

## 15. The contract for a NEW component

Sections 1-14 describe surfaces that exist. This one is the checklist for one that does not yet,
because "conform it to this document" is not actionable when there is nothing to conform.

1. **Does a primitive already do this?** Extend it before adding a sibling. `ProductGrid` grew an
   `as`/`role` prop rather than letting Ventes flash keep its forked copy of the class string — and
   the fork had already drifted a whole breakpoint. A component that cannot be reused in the one
   shape a caller needs does not prevent the fork; it guarantees it.
2. **Server component** unless it needs state, an effect, a handler or a browser API.
3. **Tokens only.** A new file is absent from `design-baseline.json`, so `lint:design` requires it
   to be at **zero** violations. This is not a nice-to-have — it is the gate.
4. **Both themes and 320 / 390 / 768 / 1024 / 1440 from the first draft.** Not a later pass. 81% of
   this site's traffic is a phone, and 320 is also what a 360px Android reports at the largest
   display-size setting — i.e. someone who has asked the system for bigger text.
5. **≥44x44px** on everything interactive, keyboard reachable, `focus-visible:ring-focus`, French
   labels. A control that must *look* smaller keeps its target with `-my-3 py-3`, never by shrinking.
6. **A skeleton if it loads**, matching the final layout's padding, gaps and aspect ratios exactly.
   Shared geometry goes in a constant both files import — see `util/productCardFrame.ts`. Two
   hand-matched copies is how the card and its skeleton drifted into CLS.
7. **Write down why, next to the code**, wherever the reason is not obvious from reading it. Every
   long comment in this codebase exists because someone undid a decision that looked arbitrary.

Then verify against the rendered page, not the source (§0). If the component's claim is numeric
("the card is shorter", "the sheet fits on one screen"), write the measurement script — there are
eleven already in `scripts/` to copy from.
