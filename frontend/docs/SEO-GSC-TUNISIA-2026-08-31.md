# Protein.tn — Search Console and Tunisia SEO baseline

Date: 2026-08-31
Source: Google Search Console domain property (`sc-domain:protein.tn`), 3-month view, plus the checked-in CSV export.

## Baseline

- 4,464 clicks, 114,213 impressions, 3.9% CTR, average position 11.4.
- 1,079 indexed URLs and 7,949 URLs not indexed.
- Mobile Core Web Vitals: 467 URLs need improvement because INP is above 200 ms; desktop has 467 good URLs.
- Generative AI features: 9,339 impressions. Arabic informational articles account for most non-homepage AI visibility.
- Product and merchant markup: 303 valid items and no invalid items. Optional review warnings must not be “fixed” with invented reviews.

## Priority keyword-to-page map

One search intent has one primary landing page. Do not create a second page just to repeat the term.

| Cluster | Primary page | GSC opportunity |
| --- | --- | --- |
| protein / protéine Tunisie | `/` and `/proteines` | High volume; protect brand/home intent and use `/proteines` for comparison intent |
| whey protein Tunisie / whey Tunisie | `/whey-proteine` | 1,500+ impressions around positions 10–11 |
| créatine Tunisie / créatine monohydrate | `/creatine` | Strong volume, average position roughly 18 for the broad local term |
| mass gainer / Serious Mass Tunisie | `/mass-gainers` plus canonical product URLs | Several page-one terms and legacy `/shop/` URLs still consolidating |
| omega 3 fish oil | `/omega-3/omega-3-fish-oil-240-softgel-weightworld` | 3,475 impressions, 0.75% CTR, average position 7.4 |
| complément alimentaire Tunisie | `/complements-alimentaires` | Page-one impressions with very low CTR |
| pre workout Tunisie | `/pre-workout` | Near page one; collection page is the commercial target |
| Arabic creatine-food questions | Existing Arabic blog URLs | Top article: 5,834 impressions, 0.29% CTR, average position 7.9 |
| Arabic supplement beginner questions | Existing Arabic blog URLs | Strong impressions and AI-search visibility; improve answers instead of minting duplicates |

## Indexing diagnosis

- `404` (861): legacy review, product and category URLs need either a direct relevant 301 or a terminal 404/410. Never redirect deleted products to an unrelated page or the home page.
- `Page with redirect` (822): mostly expected legacy consolidation. This bucket is not a defect by itself; canonical destinations and internal links must use the final URL.
- `Crawled — currently not indexed` (1,214): dominated by deep `/shop?page=N` URLs. Product discovery and crawl depth should be measured before changing pagination indexability.
- `noindex` (381) and `alternate canonical` (65): validate samples, but do not force intentionally excluded account/search/filter URLs into the index.
- Structured data is healthy. Product review properties remain absent unless the page displays genuine eligible reviews.

## Changes in this pass

- Curated unique SERP titles for the highest-impression commercial product URLs.
- Refined whey and creatine category snippets around comparison intent; removed stale hard-coded price promises from FAQ answers.
- Added Arabic FAQ/internal-link overlays for the highest-impression informational pages.
- Replaced the favicon family with a high-resolution, transparent Protein.tn mark and consistent brand colour.
- Coalesced global scroll work with `requestAnimationFrame` and avoided redundant React updates.
- Added GA `web_vital` reporting so mobile INP can be diagnosed by real route/device data while Search Console's 28-day field window catches up.

## Guardrails

- No bot-only text, hidden keyword blocks, doorway pages, fake reviews or fabricated ratings.
- No hard-coded prices, stock, certifications, import status or delivery promises unless the application can prove them at render time.
- Keep `protein.tn` as the canonical host; `www`, `/shop/` and legacy taxonomy paths only consolidate to the final canonical URL.
- Recheck GSC weekly by query/page/device. Judge title work by CTR at comparable position, not by rank alone.
