# Product pages – Rich Results & SEO QA

## Goal

Maximize eligibility for Google rich results on **all** product pages: image thumbnail, star ratings (when real), price, and stock availability in the snippet. Rich results are not guaranteed; we ensure every product page is **fully eligible** per Google’s rules.

---

## 1. Product structured data (JSON-LD) – SSR

- **One** Product JSON-LD per product page in the **initial HTML** (server-rendered on `/shop/:slug`).
- Implemented in: `util/structuredData.ts` (`buildProductJsonLd`) and `app/shop/[slug]/page.tsx` (single `<script type="application/ld+json">`).
- Includes:
  - `@context`, `@type: Product`, `name`, `image` (array of **absolute** URLs), `description`, `sku` / `productID`, `brand`, `offers` (Offer with `url`, `priceCurrency`, `price`, `availability`, `itemCondition`, `priceValidUntil`, optional `shippingDetails`).
- **Ratings:** `aggregateRating` and `review` only when **real reviews exist** (no fake ratings). `ratingValue` string, `reviewCount` integer.
- **Price:** numeric string only (e.g. `"380"` or `"380.00"`), no "DT" or spaces.
- **Availability:** schema.org URL: `https://schema.org/InStock` or `https://schema.org/OutOfStock`.

---

## 2. Image thumbnail for Google

- Main product image is present in the initial HTML (via SSR of the product page component).
- **OpenGraph & Twitter** on product pages (in `generateMetadata` for `/shop/[slug]`):
  - `og:type`: website (Next.js does not support `product` in metadata type; Product semantics come from JSON-LD).
  - `og:title`, `og:description`, `og:url` (canonical), `og:image` (absolute URL, high-res when possible).
  - `twitter:card`: `summary_large_image`, `twitter:image`, `twitter:title`, `twitter:description`.
- Image URL must: return 200, not be blocked by robots.txt, not be behind auth, have correct content-type and caching.

---

## 3. Canonical & indexing

- **Canonical product URL:** `/shop/:slug` only (e.g. `https://protein.tn/shop/whey-optimum-nutrition`).
- Product pages return **200** on the canonical URL (no redirect for valid products).
- **Robots:** `index, follow` on product pages (set in `generateMetadata`).
- **Duplicate routes:** `/products/:id` permanently redirects (301) to `/shop/:slug`; no duplicate product URLs.

---

## 4. Merchant / Shopping eligibility (optional)

- **Shipping:** `shippingDetails` in Product `offers` (delivery time 1–3 days, Tunisia).
- Return policy and product feed (Merchant Center) can be added when available.

---

## 5. Common blockers (fixed)

- **Single Product schema** per page (no multiple Product JSON-LD for the same product).
- **ratingValue:** number or string (e.g. `"4.8"`), never "5/5" text.
- **reviewCount:** integer only.
- **price:** numeric string (e.g. `"380.000"` or `"380"`), no "DT".
- **availability:** full schema.org URL, not "En stock" text.
- **No fake ratings:** `aggregateRating` and `review` only when `reviews.length > 0`.

---

## 6. Title, description, internal linking

- **Title format:** `{Product Name} – Prix Tunisie & Livraison Rapide | Protein.tn`
- **Meta description:** benefit + authenticity + delivery + location (Tunisie), max 160 chars.
- **BreadcrumbList** schema: Accueil → Boutique → Category → Subcategory → Product.
- **H1:** single, matches product name / title topic.
- Related products and related categories links are present on the product page (internal linking).
- FAQ + FAQPage schema when FAQs exist (sitewide or product-specific).

---

## 7. Validation & monitoring

### Validation script

- **Script:** `frontend/scripts/validate-product-rich-results.js`
- **Usage:**
  - With dev server: `BASE_URL=http://localhost:3000 node scripts/validate-product-rich-results.js`
  - Production: `BASE_URL=https://protein.tn node scripts/validate-product-rich-results.js`
  - Specific products: `SLUGS=slug1,slug2 BASE_URL=https://protein.tn node scripts/validate-product-rich-results.js`
  - Limit pages: `MAX_PAGES=10`
- **Checks:** presence of Product JSON-LD, required fields (name, image, offers, price, priceCurrency, availability, url), image absolute URLs, availability as schema.org URL, aggregateRating format when present.

### Rich Results Test

1. Open [Google Rich Results Test](https://search.google.com/test/rich-results).
2. Enter a product URL (e.g. `https://protein.tn/shop/<slug>`).
3. Expect: **Product** with image, offers (price, availability, url), optional AggregateRating/Review when reviews exist.
4. Fix any reported errors (missing fields, wrong format).

### Google Search Console

- **Enhancements → Product results:** monitor “Extraits de produits” and fix any issues.
- **URL Inspection:** open a product URL → “Test live URL” → “Validate Fix” after deploying changes.
- **Reindexing:** after schema/metadata changes, use “Request indexing” for important product URLs or rely on normal crawling.

---

## Checklist (definition of done)

- [ ] Every product page has **one** Product JSON-LD in initial HTML (SSR).
- [ ] Product schema has: name, image (absolute URLs), description, sku/productID, brand, offers (price string, priceCurrency, availability URL, url, priceValidUntil, itemCondition).
- [ ] aggregateRating/review only when real reviews exist; reviewCount integer, ratingValue number or string.
- [ ] OG and Twitter meta tags on product pages with absolute og:image/twitter:image.
- [ ] Canonical is `/shop/:slug`; robots index,follow; no duplicate product routes.
- [ ] Title format: `{Product Name} – Prix Tunisie & Livraison Rapide | Protein.tn`.
- [ ] Meta description includes benefit, authenticity, delivery, Tunisie.
- [ ] BreadcrumbList schema present; H1 unique.
- [ ] Validation script passes for sampled product URLs.
- [ ] Rich Results Test shows no errors for a sample product URL.
