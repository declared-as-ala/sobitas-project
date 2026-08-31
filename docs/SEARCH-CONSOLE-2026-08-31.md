# Google Search Console audit — 31 August 2026

Property: `sc-domain:protein.tn`  
Source: authenticated Google Search Console reports, inspected on 30–31 August 2026.

## Performance baseline (last 3 months)

- 4,468 web clicks
- 114,139 impressions
- 3.9% CTR
- Average position 11.4

Highest-opportunity non-brand query groups:

| Query | Clicks | Impressions | CTR | Position | Action |
| --- | ---: | ---: | ---: | ---: | --- |
| protein tunisie | 439 | 2,336 | 18.8% | 9.7 | Protect homepage relevance |
| proteine tunisie | 151 | 2,341 | 6.5% | 12.5 | Align `/proteines` title and content |
| whey protein tunisie | 46 | 1,769 | 2.6% | 11.1 | Improve category/PDP snippets and internal links |
| creatine tunisie | 28 | 563 | 5.0% | 16.4 | Make curated `/creatine` metadata authoritative |
| whey tunisie | 4 | 425 | 0.9% | 15.5 | Strengthen category intent and product coverage |
| whey protein prix tunisie | 2 | 144 | 1.4% | 11.7 | Keep live price/stock language factual |

Measured category opportunities:

- `/proteines`: 28 clicks / 2,586 impressions / 1.1% CTR / position 27.8
- `/creatine`: 18 / 691 / 2.6% / position 23.2
- `/whey-isolate`: 17 / 775 / 2.2% / position 51.7
- `/pre-workout`: 17 / 1,183 / 1.4% / position 9.7
- `/omega-3`: 10 / 476 / 2.1% / position 24.9
- `/shop`: 14 / 2,010 / 0.7% / position 26.3

## Index coverage (last update 21 August 2026)

| Reason | Count | Classification |
| --- | ---: | --- |
| Not found (404) | 861 | Mostly retired legacy WooCommerce-style URLs; terminal 404/410 is correct when no successor exists |
| Page with redirect | 822 | Expected consolidation of `/shop`, `/product`, `/products`, `/produit`, `/category`, `www`, and legacy query URLs |
| Excluded by `noindex` | 381 | Mostly login, search/facets, APIs, and products intentionally gated from indexing |
| Alternate page with canonical | 65 | Expected for legacy product paths and query variants |
| Server error (5xx) | 2 | Fixed in current production; validation started 30 August 2026 |
| Crawled — currently not indexed | 1,214 | Primarily valid deep `/shop?page=N` pagination plus a small product tail |
| Discovered — currently not indexed | 4,546 | Primarily newly imported long-tail catalog pages awaiting crawl/promotion |
| Duplicate without selected canonical | 27 | Validation started; samples mostly facets, search, reviews and old brand URLs |
| Blocked by robots.txt | 24 | Expected for search/facet, checkout, cart and admin assets |
| Redirect error | 2 | Both now return one-hop 301s to canonical category URLs; validation already started |
| Soft 404 | 2 | One review URL is terminal 410 and one product redirects to a relevant category; validation already started |

Do **not** remove all redirects or expose every noindexed URL. That would turn resolved legacy URLs into new 404s and allow faceted/search pages to consume crawl budget. Old routes should be removed from internal links and sitemaps while useful one-hop redirects remain at the edge.

## Enhancements and experience

- Product snippets: 302 valid, 0 invalid
- Merchant listings: 302 valid, 0 invalid
- Breadcrumbs: 514 valid, 0 invalid
- HTTPS: 486 valid, 0 non-HTTPS
- Sitemap: success, 6,185 discovered pages, last read 29 August 2026
- Merchant recommendation: products missing a return policy
- Mobile Core Web Vitals: 575 URLs need improvement, 0 good, 0 poor
  - `/` group INP: 287 ms (481 URLs)
  - `/shop` group INP: 292 ms (94 URLs)
- Desktop Core Web Vitals: 575 URLs good

## Changes from this audit

1. Added the same factual `MerchantReturnPolicy` to the sitewide `OnlineStore` graph that is already emitted on each Product Offer.
2. Made checked-in, reviewed metadata authoritative for `/proteines`, `/creatine`, `/whey-isolate`, `/omega-3`, and `/pre-workout`, preventing stale Filament fields from overriding measured Search Console improvements.
3. Rewrote `/proteines` title around the demonstrated `protéine Tunisie` intent.
4. Removed stale hard-coded price, emoji and absolute nutrition claims from `/whey-isolate` metadata.
5. Started validation for the two historical 5xx URLs. Both currently resolve without a server error.

## Monitoring after deployment

Search Console is delayed. Compare 28-day periods only after recrawl:

- CTR and position for the five curated category pages
- Merchant return-policy recommendation status
- Mobile INP for `/` and `/shop` groups
- 5xx validation completion
- Indexed count versus newly promoted catalog pages
- Sitemap discovered URLs versus pages that pass the promotion/indexability gate

