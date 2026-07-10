# Protein.tn Design System — "Athletic, one-accent red"

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

- **Accent = red-600** (`bg-red-600 hover:bg-red-700`, `text-red-600 dark:text-red-400`). This is the
  ONLY brand color. Do not introduce a second accent (no amber/orange/blue/green gradients as decoration).
- **Important:** the shadcn `--primary` token is near-black (`#030213`), so the default `<Button>` is
  **not** red. Brand CTAs must set red **explicitly**: `className="bg-red-600 hover:bg-red-700 text-white"`.
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
- **Shadows:** restrained. `shadow-sm` at rest, `hover:shadow-xl`/`shadow-md` on interactive cards. No `shadow-2xl` glow stacks.
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
- **`ProductCard`** (`components/ProductCard.tsx`) — already on-system (icon-led one-accent badges, Oswald
  price). Reuse it for product grids; do **not** restyle it.
- Buttons: primary CTA = `bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide`
  (use `<Button className="bg-red-600 hover:bg-red-700 ...">` or a plain styled `<Link>`). Secondary =
  `variant="outline"` with red text/border. Tertiary = text link with trailing `ArrowRight`.

## 7. Layout & spacing

- Content width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (rails may use `max-w-[1400px]`).
- Section vertical rhythm: `py-12 sm:py-16 lg:py-20` (hero/flagship sections a bit larger).
- Grids: products `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6`; categories `aspect-[4/3]` tiles.
- Mobile-first; everything responsive; never cause horizontal body scroll (wide content scrolls in its own container).

## 8. Dark mode

Every color needs a `dark:` counterpart. Standard pairs: text `text-gray-900 dark:text-white` /
`text-gray-600 dark:text-gray-400`; surface `bg-white dark:bg-gray-950` / card `dark:bg-gray-900`;
border `border-gray-100 dark:border-gray-800`; accent `text-red-600 dark:text-red-400`.

## 9. Do-not-touch (already on-system or owned centrally)

`ProductCard`, `SectionHeader`, `PageHeader`, `ProductSection`, `HeroSlider`, `FeaturesSection`,
`CategoryGrid`, `VentesFlashSection`, `BlogSection`, `BrandsSection`, `HomePageClient`, `HomeDeferredSections`,
`PromoBanner`; all of `components/ui/*` (shadcn primitives — use, don't restyle); `tailwind.config.ts`,
`globals.css`, `styles/*`, `layout.tsx`; `middleware.ts` and `app/x-crawler/*`; anything under
`structuredData`/metadata. Change none of these during a page redesign unless that is the explicit task.

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
