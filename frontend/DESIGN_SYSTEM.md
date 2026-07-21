# Protein.tn Design System — v3 "Editorial Minimal, one-accent red"

> **v3 (2026-07-21) — what changed.** The system moved from *athletic/dense* to **Editorial
> Minimal**: whitespace-led, photography-first, fewer elements, red spent sparingly. Concretely:
> the red header slab is gone (§2), cards are hairline-bordered rather than shadow-stacked (§3),
> real design tokens exist (§11), `Container`/`Section` replace copy-pasted layout strings (§6),
> there is a mobile bottom tab bar (§6), and the hero has a written LCP contract (§12).
> §9 is no longer a freeze list — see §9.


The canonical visual language for the whole site. Every page and component must read as one
art-directed brand, not assembled parts. When redesigning a surface, conform it to this document.
This was established on the landing page (hero, product cards, section headers, trust strip) and is
now the standard everywhere.

> **Golden rule for redesign work:** change the *look*, never the *logic*. Only touch
> `className`, JSX layout/structure, typography, spacing, icons, and decorative motion. Do **not**
> alter data fetching, props, API calls, `generateMetadata`, JSON-LD/structured data, SEO copy,
> `href`s, form behavior, or server/client boundaries (`'use client'` stays exactly where it is).

---

## 1. Typography

| Role | Font | Utility | Notes |
| --- | --- | --- | --- |
| Display — titles, hero, prices, badges, countdowns | **Oswald** (condensed) | `font-display` | Always `uppercase tracking-tight`. Weights 600/700. |
| Body / UI — paragraphs, labels, inputs, nav | **Inter** | `font-sans` (default) | Never uppercase for body copy. |

- **Section titles:** `font-display uppercase tracking-tight leading-[0.95] font-bold` (see `SectionHeader`).
- **Page (H1) titles:** same, via `PageHeader`.
- **Kicker (eyebrow):** `font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400`, usually preceded by a `h-px w-5 bg-red-600` rule.
- **Prices / numbers:** `font-display font-bold tracking-tight tabular-nums`.
- Body paragraphs stay Inter, normal case, `text-gray-600 dark:text-gray-400` for secondary.

## 2. Color — one accent, and only one

- **Accent = red-600**, now the brand red `#E01B24` (see §11). This is the ONLY brand color.
  Do not introduce a second accent (no amber/orange/blue/green gradients as decoration).
- **Spend it sparingly.** Red marks: the primary CTA, the price/promo, an active state, a kicker
  rule, a count badge. Nothing else. A full-width red band was removed from the header in v3
  precisely because when red is the background, red can no longer mean anything.
- **Important:** the shadcn `--primary` token is near-black (`#030213`) **and currently broken**
  (see §11), so the default `<Button>` is **not** red. Use `variant="brand"`, which exists for
  exactly this — do not re-type the old `bg-red-600 hover:bg-red-700 …` string.
- **Never invert an asset to fit a background.** The old header forced the logo white with
  `brightness-0 invert` to survive the red bar. If an asset needs inverting to be legible, the
  surface is wrong. (`dark:` inversion for dark mode is fine.)
- **Surfaces:** white / `dark:bg-gray-950`, cards `dark:bg-gray-900`. Neutral grays for everything non-accent.
- **Icon chips:** red monoline lucide icon inside `bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400` rounded square.
- Semantic colors (green success, red error) are allowed only for genuine status (stock, form errors, toasts).

## 3. Surfaces & shape

- **Flat.** No glassmorphism, no `backdrop-blur` decoration, no floating gradient "orbs"/blurred blobs,
  no multi-stop decorative gradients. Removed on purpose during the landing redesign — do not reintroduce.
- **Radius:** `rounded-xl` for cards/tiles/CTAs; `rounded-lg` for small chips/icon squares; `rounded-full`
  only for pills/avatars.
- **Borders/dividers:** thin — `border border-gray-100 dark:border-gray-800` (or `gray-200`/`gray-700`).
  Prefer a hairline border + subtle shadow over heavy shadows.
- **Shadows:** restrained. Cards are **hairline border + `shadow-sm` at rest → `hover:shadow-md`**.
  No arbitrary `shadow-[0_2px_12px_rgba(...)]` values (use `shadow-card` if a custom one is truly
  needed), no `hover:-translate-y-*` lift, no `shadow-2xl` glow stacks.
- **`backdrop-blur` is banned outright**, including on small chips and badges. Beyond the visual
  rule, each instance forces its own compositing layer — on a product grid that is one per card.
- **Image tiles:** `aspect-[4/3]` (category/blog) or `aspect-square` (product), `object-cover`, `rounded-xl overflow-hidden`.

## 4. Motion — calm, minimal

- Prefer **no** entrance animation. Decorative `framer-motion`/`motion` staggers, spring physics, animated
  SVGs, ping/pulse loops, marquees and shine sweeps are **out**. (We deleted ~490 lines of this from the trust strip.)
- Allowed: cheap CSS transitions — `transition-colors`, `transition-transform`, `sm:group-hover:scale-105`
  (subtle), `group-hover:translate-x-1` on a trailing arrow. Keep hover states quiet (no red ring pulses).
- Where a component is currently `'use client'` only for motion, and removing motion lets it become a server
  component, prefer that — but never change the client/server boundary if it also does state/effects/handlers.

## 5. Icons

- **lucide-react** only, monoline, `strokeWidth={1.75}`ish, sized `h-4 w-4`/`h-5 w-5`.
- Feature/trust/step icons sit in a `bg-red-50` rounded square (see §2). Inline meta icons are plain red or gray.

## 6. Shared building blocks (reuse — do not re-invent)

- **`SectionHeader`** (`components/SectionHeader.tsx`) — for a section *inside* a page: red kicker + Oswald
  title + optional subtitle + optional right-aligned "Voir tout" link. Use for every titled section.
- **`PageHeader`** (`components/PageHeader.tsx`) — for the top of an *interior page*: red kicker + Oswald
  uppercase H1 + optional subtitle, optional breadcrumb/children slot. Use on listing/content/account pages.
- **`ProductCard`** (`components/ProductCard.tsx`) — reuse for product grids; do **not** restyle it.
  Its image geometry comes from `util/productCardFrame.ts` and is shared with `ProductCardSkeleton`
  — if you change one, the shared constant is the only correct place to do it (§10).
- **`Container`** (`components/layout/Container.tsx`) — the horizontal rail. Replaces inline
  `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. `width="wide"` is the legacy `max-w-[1400px]` rail used
  by the header/hero; both exist so adoption is a zero-pixel refactor.
- **`Section`** (`components/layout/Section.tsx`) — vertical rhythm + optional `surface="sunken"`
  band. Replaces inline `py-12 sm:py-16 lg:py-20`.
- **`Kicker`** (`components/layout/Kicker.tsx`) — the red eyebrow.
- **`MobileTabBar`** (`components/MobileTabBar.tsx`) — mounted once in the root layout. Anything
  `fixed` at the bottom of the viewport MUST offset against `--tabbar-h` (`bottom-tabbar`, or a
  `calc()` that composes with it) or it will sit behind the bar. Never hardcode its height.
- **Buttons:** primary CTA = `<Button variant="brand" size="cta">`. Secondary =
  `variant="brandOutline"`. Quiet = `variant="brandGhost"`. Tertiary = text link with a trailing
  `ArrowRight`. Do **not** hand-write `bg-red-600 hover:bg-red-700 …` — that string exists as a
  variant precisely so it stops being copy-pasted.

## 7. Layout & spacing

- Content width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (rails may use `max-w-[1400px]`).
- Section vertical rhythm: `py-12 sm:py-16 lg:py-20` (hero/flagship sections a bit larger).
- Grids: products `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6`; categories `aspect-[4/3]` tiles.
- Mobile-first; everything responsive; never cause horizontal body scroll (wide content scrolls in its own container).

## 8. Dark mode

Every color needs a `dark:` counterpart. Standard pairs: text `text-gray-900 dark:text-white` /
`text-gray-600 dark:text-gray-400`; surface `bg-white dark:bg-gray-950` / card `dark:bg-gray-900`;
border `border-gray-100 dark:border-gray-800`; accent `text-red-600 dark:text-red-400`.

## 9. Centrally owned — change deliberately, not incidentally

This was a freeze list. It is now a **care list**: these are shared or load-bearing, so changing
them affects every page. Change them in a *dedicated* PR with a visual pass — never as a side
effect of redesigning one page.

- **Shared components:** `ProductCard` + `ProductCardSkeleton` (must move together — §10),
  `SectionHeader`, `PageHeader`, `ProductGrid`, `Container`, `Section`, `Kicker`, `MobileTabBar`.
- **Config & global CSS:** `tailwind.config.ts`, `globals.css`, `styles/tokens.css`, `layout.tsx`.
- **Do not restyle** `components/ui/*` (shadcn primitives) — extend them additively instead, the
  way `Button` gained its `brand` variants without altering `default`.
- **Off-limits to visual work entirely:** `middleware.ts`, `app/x-crawler/*`, anything under
  `structuredData`/metadata, and the hero LCP contract in §12.

---

## 10. Refinement standards (v2 — density, responsive, loaders, perf, copy)

The second pass raises craft: compact, clear, fast. Apply these on top of §1–§9.

### Spacing & rhythm
- Section vertical padding: `py-12 sm:py-16 lg:py-20` (flagship/hero sections may reach `lg:py-24`). Never `py-8` or `py-28` — one rhythm across the whole page. Section titles keep `mb-8 sm:mb-10` (via SectionHeader/PageHeader).
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` everywhere (product rails may use `max-w-[1400px]`). Never exceed it (no 1600px). Keep every section's left edge aligned.
- Card padding `p-4 sm:p-5`; compact tiles `p-3`. Favor compact, scannable density over loose padding — but stay breathable.

### Responsive & tap targets
- Mobile-first. Every interactive control has a ≥ 44×44px hit area (`min-h-11 min-w-11`, or an icon-only button as `h-11 w-11 flex items-center justify-center`).
- Product grids use the shared **`ProductGrid`**: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6`. No orphan rows. Category tiles `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.
- No horizontal body scroll; wide content scrolls inside its own `overflow-x-auto` container.

### Loaders (ONE system)
- The placeholder atom is `components/ui/skeleton` `<Skeleton>` (`bg-gray-200 dark:bg-gray-700 animate-pulse`). No bare `animate-pulse` divs, no hand-rolled border-spinners, no local `SkeletonLine` copies.
- Skeletons MUST match the final layout — same container padding, same grid gaps, same aspect ratios — so there is **zero layout shift**. Reuse `ProductCardSkeleton` / `ProductsSkeleton` / `ProductDetailSkeleton` / `BlogCardSkeleton`.
- Every data-fetching / `force-dynamic` route ships a `loading.tsx` with a layout-matching skeleton. Client pages that gate on `localStorage`/`isLoaded` render a skeleton, never a flash of the empty state.
- `LoadingSpinner` = indeterminate/action loads only (pure-CSS spinner, no motion, server-safe). The click-triggered `GlobalLoader` must never obscure a route skeleton (no dark scrim + artificial delay over a route that has its own `loading.tsx`).

### No emojis / glyphs (hard rule)
- Zero emoji or dingbat glyphs as UI — `🎉 ⚡ ✓ ✦ ★ › → ⋮` etc. Always a lucide icon. Broken-image fallbacks render a lucide icon via React state, never `document.createElement`/`innerHTML`.

### Copy & i18n
- French only. No English UI labels (`New`→`Nouveau`, `OFF`/`-30% OFF`→`-30%`, `Brands`→`Marques`) and no Arabic leftovers. aria-labels in French too.
- Tight, non-redundant microcopy; one obvious primary action per screen; real empty / loading / error states everywhere. French dates must use French month names (`toLocaleDateString('fr-FR', …)`).

### Performance & maintainability
- Server-first: no `'use client'` without state/effects/handlers/browser-API. No `framer-motion`/`motion` on the shopping-critical path (cards, rails, home sections) — use CSS transitions.
- `next/image`: correct `sizes`, `priority` only on the true LCP image, `unoptimized` only for already-optimized storage/remote images (`unoptimized={isStorageImageUrl(src)}`), never blanket.
- Prefer shared primitives (`ProductGrid`, `Skeleton`, `SectionHeader`, `PageHeader`, `EmptyState`) over copy-pasted markup. Delete dead code rather than reskinning it.

---

## 11. Design tokens (v3)

Defined in `src/styles/tokens.css`, wired in `tailwind.config.ts`. Values are space-separated RGB
triplets so Tailwind's `<alpha-value>` works (`bg-brand/10`, `text-ink-2/70`).

| Token | Utility | Value (light / dark) |
| --- | --- | --- |
| Brand accent | `bg-brand`, `text-brand`, `hover:bg-brand-hover` | `#E01B24` / `#F87171` |
| Page canvas | `bg-canvas` | `#FFFFFF` / `#0A0A0B` |
| Card / sheet | `bg-elevated` | `#FFFFFF` / `#141416` |
| Alternating band | `bg-sunken` | `#F7F6F4` (warm sand) / `#101012` |
| Hairline | `border-hairline` | `#E8E5E1` / `#26262A` |
| Ink 1 / 2 / 3 | `text-ink-1` … | headings / body / meta |

**The `red-*` palette is overridden to the brand ramp.** So existing `bg-red-600` is already brand
red — there is no half-migrated state. New code should prefer `brand`. The ramp is
**luminance-matched** to stock Tailwind red (600 sits at relative luminance 0.1676, identical to
`#dc2626`), so contrast ratios were preserved when it changed; keep that property if you re-tune it.

**Known broken — do not build on it:** `tailwind.config.ts` declares the shadcn colors as
`hsl(var(--x))` while `styles/theme.css` defines them as hex/oklch. `hsl(#ffffff)` is invalid CSS,
so **every semantic shadcn utility is a silent no-op** — `bg-background`, `text-foreground`,
`bg-primary`, `border-border`. That is why the codebase hardcodes `bg-white`. Repairing it would
restyle all 47 shadcn components at once (the default `<Button>` would jump from transparent to
near-black), so it needs its own PR with a full visual pass. Until then, use the tokens above.

**Motion opt-out:** `globals.css` clamps `transition-duration` to `.2s !important` for everything
under 768px. New components that need a longer transition must carry `data-motion` to opt out.

---

## 12. Hero & LCP contract (do not break)

The homepage hero is the mobile LCP element. Its speed rests on one invariant:

> The `<link rel="preload">` and the `<source>`/`<img>` the browser actually paints must resolve to
> the **byte-identical URL** under the **same media query**. If they drift, the image downloads
> twice and the preload is wasted.

They were once two hand-maintained copies. They are now derived from a single object —
`buildHeroImageSet()` in `src/util/heroImage.ts`. `page.tsx` renders `set.preload`; `Hero` renders
`set.sources`. **Never hand-write a hero preload.**

Rules that fall out of this, each with a reason:

- **No `next/image` on slide 1.** It emits a `srcset` and the browser picks a candidate at runtime,
  so the server cannot know which URL to preload. Use a raw `<img>` with one deterministic URL.
- **Fixed widths only** (`w=828` mobile, `w=1920` desktop) and they must be members of
  `images.deviceSizes`, or the optimizer returns 400.
- **Never downscale a landscape image for mobile.** `object-cover` then scales by *height* and
  drops under 1:1. Only a dedicated portrait crop gets `w=828`.
- **No `crossOrigin` on the preload.** The fetch is same-origin and non-CORS; a mismatched CORS
  mode makes the browser download the image twice.
- **No embla on the hero.** It replaces native scrolling with JS transforms and cannot work until
  hydrated — exactly the window the LCP element must survive. Use a CSS scroll-snap track with
  anchor-link dots. Embla stays for product rails.
- **Keep the fixed heights** (`min-h-[588px] … xl:h-[640px]`). Never an aspect-ratio box: that
  resizes with the image and reintroduces CLS.
- Slide 1 is `eager` + `fetchPriority="high"`; slides 2+ are `lazy` + `fetchPriority="low"`.

**Infrastructure this depends on:** Next's optimizer cache lives at `/app/.next/cache/images`. The
Dockerfile must `chown` it to the runtime user *after* the `COPY`s, and docker-compose mounts a
named volume so it survives deploys. When that write fails, Next logs `Failed to write image to
cache` and serves anyway — so a cold cache is **silent** and every request re-transcodes. Verify
with `x-nextjs-cache: HIT` on a second request.

---

## 13. RTL

`globals.css` overrides physical-direction utilities with `!important` for `html[dir="rtl"]`
(~85 lines). New components should prefer logical properties, or they will break in Arabic.
