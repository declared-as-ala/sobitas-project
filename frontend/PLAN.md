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

## Shipped — 2026-07-11 session (PRs #37–#48)

**UX / mobile:** design-system store-rating + brand JSON-LD (#37); checkout mobile pass (#38);
home squeeze + empty-categories resilience + floating-button declutter + sidebar rebrand + bundle
wins (#39); hardcoded category fallback so the grid never blanks (#40); **product detail page
rebuilt around a grouped buy card** (#41); homepage empty-`accueil` resilience — categories +
product rails backfilled from dedicated endpoints (#40/#43); free-shipping progress nudge in the
cart drawer (#47).

**INDEXING (the crisis fixes):**
- **Sitemap had 0 product URLs** → now the **full 303-product catalogue** (canonical `/{subcat}/{slug}`)
  via `enrichProductSubcategory` (#44). It also **throws instead of caching a product-less sitemap**,
  and stops submitting noindex blog-tag / CMS URLs (#45).
- **Middleware served Googlebot a 404 for `/sitemap.xml` AND `/robots.txt`** (the "couldn't fetch"
  cause) → fixed with a dot-guard + matcher exclusion; verified `curl -A Googlebot` = 200 (#45).
- Canonical internal links: home/offres/brand/packs/shop product links + ItemList now canonical,
  not the `/shop/` 301 (#42/#45). Product FAQPage policy fix (drop invisible sitewide-FAQ) (#45).
- `/products/{slug}` redirect chain collapsed to one hop (#46).

**Thin content + internal linking (targets "Crawled – currently not indexed"):**
- Category pages now link their **subcategories**; blog **taxonomy** pages get inbound links from
  every article; unique auto-generated intro/description copy for **category & brand** pages (from
  real product data, never fabricated); blog cat/tag intros (#46).

**Schema / navigation:** sitewide **SiteNavigationElement** ItemList so crawlers understand the
hub structure (#48); CMS pages get WebPage + Breadcrumb (#48).

**Perf:** i18n client bundle slimmed — AR/EN dictionaries tree-shaken off first-load JS (kept in
repo for future server-side i18n) (#48); heavy client islands lazy-loaded + mobile image `sizes` (#48).

**Store ratings:** product `AggregateRating`/`Review` from real reviews live; `OnlineStore`
aggregateRating gated on real operator numbers (`NEXT_PUBLIC_STORE_RATING_VALUE`/`_COUNT`).

## Next / backlog

- Perf: reduce first-load JS. Done so far: removed `motion`/framer-motion, lazy-loaded `CartDrawer`.
  Remaining biggest lever is the ~8–12KB-gz of unused AR/EN i18n on every page — but see the i18n
  decision below: we are **keeping** the dictionaries, so this is deferred to the server-i18n rework.
- OG on remaining pages (about/CMS/blog-cat-tag); article `published_time`/`author` OG.

### i18n / multilingual SEO (decision — 2026-07-11)
Goal: rank in **fr / ar / en**. Decision: **keep** the AR/EN dictionaries (do NOT strip them for bundle
size — they'll be used). The current client-side text-swap is **not** SEO-viable (Google only sees the
server's French HTML). When enabling AR/EN, migrate to **server-rendered, locale-prefixed URLs**:
- Locale in the **path** (`/ar/...`, `/en/...`, French at root). Prefer paths over `?l=ar` query params
  — Google treats distinct paths as clean, separately-indexable language versions; query-param locales
  are weaker and risk duplicate-content signals.
- Emit **`hreflang`** alternates (`ar` / `fr` / `en` / `x-default`) on every page.
- Set `<html lang dir>` server-side (RTL for `ar`).
- Each locale URL must return fully server-rendered content in that language (App Router i18n routing:
  `[locale]` segment + middleware locale detection + server dictionaries).

## Indexing (GSC "Why pages aren't indexed") — status 2026-07-11

**Already fixed in code (verified live):**
- **Sitemap now includes the FULL catalogue.** It previously had **0 product URLs** — `/all_products`
  ships products with only `sous_categorie_id`, so the "skip products without a subcategory" guard
  dropped all 303. Now enriched from the categories payload → **519 URLs incl. 303 products** as
  canonical `/{subcat}/{slug}`. This was the primary reason so few pages were indexed.
- Sitemap is clean — sampled URLs all return **200**, no `/shop/` fallbacks, gated against live slugs.

**Old "Page with redirect" URLs (751) — do NOT delete.** These old URLs (`/shop/{slug}`, `/product/…`,
`/brand/…`, old category URLs) correctly 301 to the canonical page. "Page with redirect" is *not* an
error — Google indexes the target and the 301 preserves any inbound link equity + keeps old
links/bookmarks working. Deleting them (404/410) would lose equity and break inbound links. The count
shrinks on its own as Google consolidates to the targets. Only return **410 Gone** for URLs of
permanently-removed products that have NO replacement (that's the 404 bucket, not the redirect bucket).
- `robots.txt` correct (blocks account/checkout/cart/api/admin/x-crawler; deliberately allows faceted
  URLs so their `noindex` can be seen and drop them).
- Faceted URLs (`/shop?search=…`, `?brand=`) → `<meta robots="noindex, follow">`.
- Legacy URLs 301 via middleware: `/shop/{slug}`, `/product/*`, `/products/*`, `/brand/*`,
  `/category/*`, `/en|/ar` locale prefixes.
- `www` → apex is a **308** (Cloudflare/NPM) — fine for SEO.
- Product canonical always computed from subcategory; unpublished → `noindex`.
- **NEW:** list-page product links + ItemList JSON-LD (home/offres/brand) now resolve the canonical
  `/{subcat}/{slug}` via `enrichProductSubcategory` instead of the `/shop/{slug}` 301 → shrinks the
  "Page with redirect" bucket and stops wasting a crawl hop.

**Mostly Google-side / historical (self-heals as Google re-validates the now-clean site):**
- *Not found (404) 889* — old/deleted product URLs Google still remembers; sitemap no longer emits them.
- *Page with redirect 751* — legacy URLs that correctly 301; reduced further by the canonical-link fix.
- *Crawled/Discovered – not indexed (1204/29)* — content-quality/crawl-budget; improve via internal
  linking (brand ItemList, product cross-links) + unique copy. Largely Google's call.

**Backend bug to fix (flag):** `GET /api/redirections` returns **500** and `getRedirections()` is unused.
Fixing it would let admin-defined old→new 301s catch many of the 889 404s that DO have a new home.

## Operator-only (cannot be done from code — needs dashboard access)

- **Cloudflare Cache Rule `/_next/image*` → Cache Everything** (edge-cache all product/category
  images; currently `Cf-Cache-Status: DYNAMIC`). Biggest remaining perf lever.
- **Cloudflare**: make `/slides/*` and `/_next/static/*` true edge `HIT`s (Edge Cache TTL ≥ 1 day)
  — today they're `REVALIDATED` (origin round-trip each hit).
- **www→non-www 301** at Nginx Proxy Manager.
- **Google Customer Reviews / Merchant Center** enrollment for real store/seller ratings; set
  `NEXT_PUBLIC_STORE_RATING_VALUE` / `NEXT_PUBLIC_STORE_RATING_COUNT` to the genuine aggregate.
- Remove unused GSC verification token in GSC settings.
