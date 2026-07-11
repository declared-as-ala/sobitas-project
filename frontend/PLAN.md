# protein.tn — Living work plan

_Last updated: 2026-07-11._ Companion to `DESIGN_SYSTEM.md`. This tracks **where we are** and
**what's next** across UX/UI, SEO/structured-data, internal linking, and performance. Golden rule
still holds: on redesign work, change the *look*, never the *logic* (no data/SEO/route/handler
changes unless that is the explicit task).

## Where we are (shipped)

- **Design system** "athletic one-accent red" rolled out site-wide (PR #29) + deep refinement
  pass (density, loaders, no-emoji, French copy) (PR #30).
- **SEO**: image sitemap, canonical www→apex strip, OG/Twitter images on listing pages, brand
  `/brand/[slug]` 301'd to `/{slug}` (PRs #31/#32). Product JSON-LD is complete & valid
  (Product+Offer+MerchantReturnPolicy+Shipping+AggregateRating/Review from **real** reviews);
  product pages also emit BreadcrumbList + WebPage + FAQPage. Sitewide Organization + OnlineStore
  + LocalBusiness + WebSite JSON-LD in `layout.tsx`.
- **Responsive**: hard mobile pass — shop filters are a bottom-sheet with grab handle + sticky
  footer + 44px targets; mobile nav (right sheet) + `MobileProductsMenu` bottom-sheet drill-down;
  dropdown/filter/blog-card redesign (PR #33).
- **Perf**: culled 11 unused heavy deps (PR #34); homepage/offres/packs → ISR (PR #35); hero LCP
  image → pre-optimized **direct-static AVIF**, edge-cached (PR #36).

## In progress (this batch)

1. **Mobile UX v3 — clarity & density.** No squeezed text; measured spacing; delete unhelpful
   copy/sections; smart use of full screen; no overlapping/"popped" components. Targets: product
   detail (tighten mobile sticky buy-bar + meta rows), cart/checkout, blog, footer/account.
2. **Store ratings (customer reviews in Google next to products).**
   - Product-level `AggregateRating`/`Review` from **real** reviews → already emitted (this is what
     puts star ratings next to products in Search). Keep robust.
   - Store/seller rating: emit `aggregateRating` on the `OnlineStore` Organization **only from real
     operator-supplied numbers** (`NEXT_PUBLIC_STORE_RATING_VALUE` + `NEXT_PUBLIC_STORE_RATING_COUNT`).
     Never fabricated. If unset, nothing is emitted.
   - **Operator note:** true Google *seller ratings* come from Google Customer Reviews / Merchant
     Center enrollment + third-party review sources — not from self-markup. See "Operator" below.
3. **Internal linking.** Contextual cross-links on product (related categories, brand, complementary),
   category (associated categories), and blog (recommended products / related articles).
4. **Automated JSON-LD + SEO audit.** Fill any page missing WebPage/Breadcrumb/CollectionPage;
   verify FAQ + Breadcrumb coverage per product.

## Next / backlog

- Perf: reduce first-load JS (bundle analysis → more server components; split heavy client islands).
- OG on remaining pages (about/CMS/blog-cat-tag); article `published_time`/`author` OG.

## Operator-only (cannot be done from code — needs dashboard access)

- **Cloudflare Cache Rule `/_next/image*` → Cache Everything** (edge-cache all product/category
  images; currently `Cf-Cache-Status: DYNAMIC`). Biggest remaining perf lever.
- **Cloudflare**: make `/slides/*` and `/_next/static/*` true edge `HIT`s (Edge Cache TTL ≥ 1 day)
  — today they're `REVALIDATED` (origin round-trip each hit).
- **www→non-www 301** at Nginx Proxy Manager.
- **Google Customer Reviews / Merchant Center** enrollment for real store/seller ratings; set
  `NEXT_PUBLIC_STORE_RATING_VALUE` / `NEXT_PUBLIC_STORE_RATING_COUNT` to the genuine aggregate.
- Remove unused GSC verification token in GSC settings.
