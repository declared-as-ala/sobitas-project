---
name: protein-ui
description: The Protein.tn design system, as a working contract. Load this BEFORE any UI, UX, visual, styling or layout work on the storefront — redesigning a page or component, building a new component, changing colours, spacing, typography, icons, motion, dark mode, responsiveness, or anything that touches a className. Also load it when reviewing a UI change, when a screenshot is being discussed, or when the owner says something "looks bad", "looks AI generated", "doesn't fit the design", or asks to "make it pro / clean / minimal".
---

# Protein.tn — designing on this codebase

This is a **storefront with a real design system that is enforced by scripts**. Most of what looks
like a free choice here has already been decided, measured, and written down. The fastest way to
produce work that gets rejected is to invent a value that already exists.

Two documents are authoritative. This skill is the operating layer over them, not a replacement:

| Scope | File |
|---|---|
| Brand — naming, the accent, faces, French-only, ≥44px | `DESIGN_SYSTEM.md` (repo root) |
| Storefront — tokens, bands, spacing, primitives, images, dark mode, LCP | `frontend/DESIGN_SYSTEM.md` |

---

## The golden rule

> **Change the look. Never the logic.**

Touch `className`, JSX structure, typography, spacing, icons, decorative motion.

Do **not** touch, as a side effect of visual work: data fetching, props, API calls,
`generateMetadata`, JSON-LD, SEO copy, `href`s, form behaviour, or where `'use client'` sits.

If a redesign genuinely needs a logic change, say so and do it as its own, named change.

---

## Before you write a single class

1. **Look at the real thing.** Run the site and screenshot the surface you are changing, at 390 and
   1440, in both themes. Design against pixels, not memory. Every "this looks fine" that shipped a
   defect here was written without opening the page.
2. **Find the primitive.** The failure mode is never ignorance of the primitive — it is
   copy-pasting the string the primitive exists to delete. See the table below.
3. **Read the neighbour.** A band's spacing is only correct relative to the band above it. A card's
   padding is only correct relative to its container's.
4. **Check the baseline.** `node scripts/lint-design.mjs --report <file>` tells you exactly what
   debt that file already carries. **A file not in `design-baseline.json` must stay at zero.**

---

## The eleven hard rules (`npm run lint:design`)

| Code | Banned | Write instead |
|---|---|---|
| DS001 | `bg-white`, `bg-gray-*` | `bg-canvas` · `bg-elevated` · `bg-sunken` |
| DS002 | manual `dark:` colour pairs | one theme-aware token |
| DS003 | `text-gray-*` | `text-ink-1` / `-2` / `-3` |
| DS004 | `border-gray-*`, `divide-gray-*`, `ring-gray-*` | `border-hairline` / `border-rule` |
| DS005 | arbitrary `shadow-[…]` | `shadow-sm` · `shadow-card` · `shadow-card-hover` |
| DS006 | arbitrary hex `[#…]` | add a token, or use an existing one |
| DS007 | inline `max-w-7xl` / `max-w-[…]` | `<Container width=…>` |
| DS008 | off-scale `py-*` on a section | `<Section spacing=…>` |
| DS009 | `backdrop-blur` — **outright**, badges included | a solid token surface |
| DS010 | emoji or dingbats as UI (`🎉 ⚡ ✓ ★ › →`) | lucide, monoline, `h-4 w-4` / `h-5 w-5` |
| DS011 | `red-*` | `brand-*` (same ramp; `red` is a legacy alias) |

**The ratchet has no slack.** Every one of the ~77 baselined files sits exactly on its recorded
number, per rule. Adding a *new rule id* to a file fails even if that file is already dirty in other
ways. `components/ui/*` is excluded (vendored shadcn). Comments are stripped before counting.

Not lint-enforceable, equally binding:

- **French only.** UI labels, `aria-label`s, dates via `toLocaleDateString('fr-FR', …)`. No English,
  no Arabic leftovers.
- **≥44×44px** hit area on every interactive control. A visually smaller control gets its target
  back with negative margin + padding (`-my-3 py-3`), not by shrinking the target.
- **Server-first.** No `'use client'` without state, effects, handlers or a browser API.

---

## Tokens — the whole vocabulary

Defined in `frontend/src/styles/tokens.css`, wired in `tailwind.config.ts`. Space-separated RGB, so
`/alpha` works everywhere (`bg-brand/10`, `text-ink-2/70`).

```
SURFACES    canvas · elevated · sunken            (page · card · alternating band)
BOUNDARIES  hairline · rule · rule-strong         (on a filled component · band seam · sole divider)
INK         ink-1 · ink-2 · ink-3                 (headings · body · meta)
ACCENT      brand · brand-hover · on-brand
            brand-fill / on-brand-fill            (a filled brand control inside a dark scope)
            brand-50…950                          (static ramp; 500 is graphical only, ~3.5:1)
STATUS      ok · warn · focus · destructive
```

**`--c-on-brand` is not a constant.** White on light-mode orange, near-black in dark mode, because
white on the dark accent `#FF8A4C` measures ~2.2:1. Never hardcode white on the accent.

**There is no `danger` utility** — use `destructive`. Tailwind emits nothing for an undefined colour
and the element silently inherits its band's ink. That shipped once and rendered a CTA at 1.37:1.

**No star/amber token exists.** Rating stars use `fill-amber-400 text-amber-400`
(`components/product/StarRating.tsx` is canonical) — a raw palette colour no rule matches.

**A status colour may not tint its own background.** `--c-ok` and `--c-warn` are 5.02:1 and
`--c-destructive` is 4.84:1 **measured against an untinted surface**. Put the same hue behind them
at 10% and the pair lands at 3.84–4.39:1 — a WCAG AA failure that looks completely fine. Status
chips are therefore `border border-ok/40 bg-elevated text-ok`: the colour lives in the border and
the text, never in the plate. This was measured on the account badges, not guessed.

---

## The band architecture

The page is a **sequence of bands**: full-bleed horizontal slabs, each owning its vertical padding.

> **Separation is a colour change plus a 1px rule. Never emptiness.**

Two consequences that get violated constantly:

1. **No two adjacent bands may share a surface.** The automatic seam has nothing to draw against
   when they do. Alternate `canvas ⇄ sunken`.
2. **The gap between two bands is the upper band's `pb` plus the lower band's `pt`.** Never add a
   compensating prop to fix a neighbour's spacing — fix the neighbour.

### The page is LIGHT. Black is an accent, not a surface.

The owner's governing constraint: *"I want something light, and it has a dark mode and a light mode.
Keep it white and just use black for important things."*

| Dark scope allowed | Dark scope banned |
|---|---|
| the 36px utility bar · the footer | any full-width content band above the footer |
| flash countdown tiles · product badges | the header · the hero band · product rails |
| a caption plate over photography | the category rail |

Budget: no more than ~12% of painted area above the footer, at 1440. `.pt-slab` paints its own
background — putting it on a full-width content band is the single most common way this gets broken.
**Never put a scope class on a focusable element**: the focus ring resolves in the element's scope
but paints on the parent band's surface.

Scrims over photography use `bg-black/xx`, never `bg-ink-1/xx` — `--c-ink-1` inverts with the theme,
so an ink scrim *brightens* in dark mode.

### Spacing — `<Section spacing=…>` only

`none` · `stage` (py-0) · `strip` (one row tall) · `tight` (support bands) · `default` (product and
content grids) · `feature` (**at most one per page**).

Read the real values from `components/layout/Section.tsx` — the table in `frontend/DESIGN_SYSTEM.md`
§3 has drifted one 8px notch and the code is the authority. Every number is a multiple of 8.

Below `sm` a band has almost no bottom padding: the gap is the *lower* band's `pt`, so bands read as
connected on a phone. Set `last` on the page's final band or its content butts into the footer.

---

## Primitives — reuse, do not re-invent

| Primitive | Replaces |
|---|---|
| `layout/Container` | inline `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| `layout/Section` | inline `py-12 sm:py-16 lg:py-20` |
| `SectionHeader` | a hand-rolled kicker + title + "Voir tout" |
| `PageHeader` | an interior-page H1 block |
| `ProductGrid` | `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4` |
| `ProductCard` | any product tile — **do not restyle it locally** |
| `ProductSection` | a whole rail: header + grid + cards |
| `LinkWithLoading` | `<Link>` for any internal navigation |
| `ui/skeleton` | every bare `animate-pulse` div |

**Reference implementations to copy from:** `components/CategoryRail.tsx` and
`PartnersPageClient.tsx` (zero violations).

A hand-rolled copy of a shared class string is how `/favoris` ended up rendering the product card at
a third of its designed width for weeks. If a primitive cannot do the one shape you need, **add the
prop** — do not fork the string.

### Type

Three faces: `font-display` (Archivo, section titles / hero / prices / badges), `font-sans` (Inter,
everything else), `font-poppins` (product cards only).

**`font-display` already means compressed** — `globals.css` sets `wdth 82` on it in `@layer base`.
`.font-compressed` is redundant beside it. This is the most surprising fact in the codebase.

Section headings come from `SectionHeader`'s `scale`, and **size follows commercial role, not
background colour and not taste**: `"1"` for the rails that sell, `"2"` for support bands, `"3"`
(the default) for bands that sell nothing.

Never uppercase body copy.

### Shape and motion

`rounded-xl` for cards, tiles and CTAs · `rounded-lg` for small chips · `rounded-full` for pills.

Flat. No glassmorphism, no gradient orbs, no multi-stop decorative gradients.

Motion is calm and, on this codebase, mostly *absent by default*. Allowed: `transition-colors`,
`transition-transform`, a small `group-hover:scale-*`, a trailing arrow's `group-hover:translate-x-*`.
Name the properties (`transition-[transform,box-shadow]`) rather than `transition-all`, which also
animates `ring-color`.

**The mobile motion clamp:** under 768px, `globals.css` forces every transition and animation to
0.2s on `*:not([data-motion])`. A component that genuinely needs longer on a phone must carry
`data-motion`. Do not widen that selector.

Respect `prefers-reduced-motion` for anything that moves more than a colour.

---

## Verify — this is not optional

`lint:design` reads source. Source cannot tell you what a page looks like, and three of the worst
defects in this codebase's history were invisible to it: a Tailwind colour that emitted nothing, a
divider that drew on 2 of 10 boundaries, and 16 white-on-white badges.

```bash
# static
npm run typecheck
npm run lint:design                       # the ratchet
npm run lint:design -- --report <file>    # side-effect free; what this file already owes

# a verify build never shares .next with a running dev server
NEXT_DIST_DIR=.next-verify npm run build
git checkout frontend/tsconfig.json       # Next rewrites `include` on every build

# against a running server
node scripts/audit-contrast.mjs <base> --widths 1440 390   # WCAG AA, BOTH themes, alpha composited
node scripts/check-console.mjs <base>                      # zero errors, warnings, failed requests
node scripts/measure-bands.mjs <base>                      # band scale + no two adjacent same surface
node scripts/check-seams.mjs <base>                        # no double separators
node scripts/check-overlay-contrast.mjs <base>             # menus, drawers, anything over an image
node scripts/visual-snap.mjs --routes /x --widths 390 1440 # the before/after artefact
```

There are also surface-specific measurers — `measure-card`, `measure-cart`, `measure-auth`,
`measure-account`, `measure-nav`, `measure-bands`, `check-inp`. **If you change a surface that has
one, run it.** If you change a surface that does not have one and the claim you are making is
numeric, write one.

`measure-account` is the template for **anything behind a login**: it seeds `localStorage.token`
with `evaluateOnNewDocument`, intercepts the three API calls with fixtures, and runs the shared
`lib/contrast-audit.mjs` per tab. Nothing reaches the real backend. Match on the request PATH, not
the host — in the browser these calls go to a same-origin `/api-proxy/*` rewrite, not to
`admin.protein.tn`.

**A guard that cannot fail is worse than no guard.** `measure-account`'s first version wrapped its
tab click in `.catch(() => {})` against a selector Radix does not render (`[role="tab"][value=…]`;
it is `id$="-trigger-<value>"`). It measured the default tab three times and reported three passes.
Never swallow a navigation error in a check — assert the state you navigated to.

Report what you measured. "Looks good" is not a result.

---

## Building a NEW component

1. Does a primitive already do this? Extend it before adding a sibling.
2. Server component unless it needs state, an effect, a handler or a browser API.
3. Tokens only — the file will be absent from the baseline, so it must be at **zero** violations.
4. Both themes and 320 / 390 / 768 / 1024 / 1440, from the first draft, not as a later pass.
5. Every interactive element ≥44px, keyboard reachable, `focus-visible:ring-focus`, French labels.
6. A skeleton, if it loads — matching the final layout's padding, gaps and aspect ratios exactly, or
   it ships CLS. Shared geometry goes in a constant both files import.
7. Write down *why*, next to the code, when the reason is not obvious from reading it. This codebase
   documents decisions inline and that is why a redesign three months later does not undo them.

---

## When the owner says it looks bad

They are usually pointing at something structural, and the literal words are a symptom. Actual
examples from this project and what each turned out to be:

| What was said | What it was |
|---|---|
| "the tabs inside look AI generated" | one cue (a 2px bar) doing a job that needed four |
| "the border left looks super noob" | an active state marked only by a hairline, on a dark rail |
| "why use that small" | a 1344px panel inside a 1536px page rail |
| "the card height is so long" | six stacked rows where four carried all the information |
| "make it more responsive" | a grid forcing a row-layout card into a third of its width |
| "the panier eats all the height" | 330px of chrome on a 900px panel |
| "the login page looks AI generated" | ~1,100px of panel, none of it about having an account |

So: **find the measurable thing** before changing anything. Screenshot it, measure it, name the
number, then fix that. A redesign that cannot say what was wrong will get the same note again.
