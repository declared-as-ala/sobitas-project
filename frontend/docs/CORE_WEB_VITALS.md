# Core Web Vitals – Optimization & Measurement

## Prioritized changes and impact

| Priority | Change | Metric | Estimated impact |
|----------|--------|--------|------------------|
| **P0** | Preload first hero image (home) | **LCP** | High – browser discovers LCP image earlier, can save 200–600 ms on slow networks. |
| **P0** | Hero first slide: `priority` + `fetchPriority="high"` | **LCP** | Already done in `HeroSlider.tsx`; keeps LCP candidate high priority. |
| **P1** | Defer Toaster (sonner) until after idle | **INP** | Medium – less JS on initial load and first interaction. |
| **P1** | `optimizePackageImports` for sonner, motion, radix | **INP** | Medium – smaller main bundle, less parse/compile. |
| **P2** | Reserve space for images (aspect-square, min-height) | **CLS** | High – ProductCard, FlashProductCard, CategoryGrid already use fixed containers. |
| **P2** | Font `display: 'swap'` + `adjustFontFallback` | **CLS** | Already in layout (Inter); avoids invisible text. |
| **P3** | Dynamic import below-the-fold sections (Home) | **INP/LCP** | Already done: FeaturesSection, CategoryGrid, Footer, etc. |
| **P3** | Category/category hero: explicit image dimensions | **CLS** | Low–medium – ensure category cards and hero have size before load. |

---

## Code modifications applied

### 1. LCP – Preload first hero image

**File:** `src/app/page.tsx`

- Added `getFirstSlideImageUrl(slides)` to compute the first slide image URL (same logic as HeroSlider).
- Render `<link rel="preload" as="image" href={firstHeroImageUrl} fetchPriority="high" />` in the home page so the LCP image is requested early.

**File:** `src/app/components/HeroSlider.tsx` (existing)

- First slide uses `priority` and `fetchPriority="high"`; other slides use `loading="lazy"`.
- Hero section has fixed height: `min-h-[100dvh] h-[100dvh]` (mobile) and `sm:h-[65vh]` etc. (desktop) to reserve space and avoid CLS.

### 2. INP – Defer non-critical JS

**File:** `src/app/components/DeferredToaster.tsx` (new)

- Toaster (sonner) is loaded with `dynamic(import('sonner'))` and only mounted after `requestIdleCallback` (or `setTimeout` fallback).
- Reduces work during initial load and first user interaction.

**File:** `src/app/layout.tsx`

- Replaced `<Toaster />` with `<DeferredToaster />`.

**File:** `next.config.js`

- Added `sonner` to `experimental.optimizePackageImports` for better tree-shaking.

### 3. CLS – Reserve space for images

- **ProductCard / FlashProductCard:** `aspect-square` + explicit `width`/`height` on `Image` (400×400 / 500×500) + `min-h-[200px]` etc. so layout is stable before image load.
- **CategoryGrid:** Cards use fixed heights `h-40 sm:h-48 md:h-64` and `minHeight: 160px` so category images don’t shift layout.
- **Hero:** Section has explicit `min-h` / `h` so the hero image (fill) doesn’t cause vertical shift.
- **Font:** Inter uses `display: 'swap'` and `adjustFontFallback` in `layout.tsx` to avoid FOIT and reduce layout shift when the font loads.

---

## How to measure

### 1. Lighthouse (lab data)

1. Open Chrome DevTools → **Lighthouse**.
2. Select **Performance** (and optionally **Best practices**).
3. Choose **Desktop** or **Mobile** (mobile is stricter and closer to real users).
4. Run the report.
5. In **Performance**, check:
   - **Largest Contentful Paint (LCP)** – target &lt; 2.5 s (good), &lt; 4 s (needs improvement), ≥ 4 s (poor).
   - **Cumulative Layout Shift (CLS)** – target &lt; 0.1 (good), &lt; 0.25 (needs improvement), ≥ 0.25 (poor).
   - **Total Blocking Time (TBT)** / **Interaction to Next Paint (INP)** – lower is better; INP may appear in the breakdown or in CrUX (see below).

**Tips:**

- Test the **home page** (hero LCP) and a **category page** (category + product grid).
- Use **Clear storage** + **Disable cache** for a “cold” load, or leave cache on for repeat visits.
- For LCP, check “LCP element” in the report and confirm it’s the hero image (or intended element).

### 2. Chrome UX Report (CrUX) & Search Console (field data)

1. **Google Search Console**
   - Open [Search Console](https://search.google.com/search-console) → your property.
   - Go to **Experience** → **Core Web Vitals**.
   - You see **field data** (real users): LCP, INP (or FID), CLS by URL group (mobile/desktop).
   - “Good” / “Needs improvement” / “Poor” match the same thresholds as above.

2. **PageSpeed Insights**
   - Go to [PageSpeed Insights](https://pagespeed.web.dev/).
   - Enter your URL (e.g. `https://sobitas.tn` or `https://sobitas.tn/category/proteines`).
   - **Field data** (CrUX) shows real-user CWV when available.
   - **Lab data** (Lighthouse) shows a single run for the same URL.

3. **CrUX API / BigQuery**
   - For more detail or automation, use the [Chrome UX Report API](https://developer.chrome.com/docs/crux/api/) or BigQuery export to get LCP, INP, CLS by origin or URL.

### 3. Quick checklist

- [ ] Lighthouse Performance (mobile) on `/`: LCP &lt; 2.5 s, CLS &lt; 0.1.
- [ ] Lighthouse on `/category/proteines` (or another category): same targets.
- [ ] Search Console → Core Web Vitals: no “Poor” URLs; aim for mostly “Good”.
- [ ] PageSpeed Insights: Field data (if available) shows “Good” for LCP, INP, CLS.

---

## Optional next steps

- **LCP:** If the hero image is served from your own domain, consider adding a `<link rel="preload">` in the document `<head>` (e.g. via a layout that receives the first slide URL from the home route) so the preload is as early as possible.
- **INP:** Lazy-load or code-split heavy components (e.g. checkout, cart drawer) if they’re not already dynamic.
- **CLS:** For any new images or banners, always set dimensions or a fixed-aspect container so layout doesn’t shift when they load.
