# SEO opportunity map — 25 August 2026

## Source and freshness

- Google Search Console export in `../protein.tn`, search type **Web**, covering **30 April–29 July 2026** (the export says “Last 3 months”).
- 4,840 clicks, 111,984 impressions, 4.32% CTR, weighted average position 11.47.
- The query and page tables are capped at 1,000 rows and are separate exports, so they cannot prove query-to-page cannibalisation. A fresh API export grouped by both query and page is the next measurement requirement.
- `gsc-coverage-report.json` was generated on 15 August 2026 and is used only for technical prioritisation. Historical Search Console issue labels can remain after a URL has already been fixed, so current HTTP status and redirect destination take precedence.

## What changed in the period

| Metric | First half | Second half | Change |
| --- | ---: | ---: | ---: |
| Clicks | 2,494 | 2,346 | -5.9% |
| Impressions | 50,303 | 61,681 | +22.6% |
| CTR | 4.96% | 3.80% | -23.4% |
| Average position | 11.54 | 11.42 | +1.0% better |

The first constraint is CTR, not visibility: impressions grew and position stayed almost flat, while fewer searchers clicked.

## Keyword opportunities

| Priority | Query / cluster | Impressions | CTR | Position | Best next move |
| --- | --- | ---: | ---: | ---: | --- |
| P0 | omega 3 fish oil | 2,827 | 0.00% | 7.46 | Strengthen the product snippet with the exact product, price and fulfilment facts; keep `/omega-3` as the supporting hub. |
| P0 | whey protein tunisie | 1,527 | 3.99% | 10.76 | Consolidate broad whey aliases on `/whey-proteine`; route article authority into the commercial category. |
| P0 | whey protein | 1,457 | 0.21% | 9.74 | Keep the category title concise and intent-matched; avoid generic blog titles competing for the same head term. |
| P0 | protein powder whey | 1,091 | 0.00% | 8.78 | Use `/whey-proteine` as the one broad commercial target and reinforce exact internal anchors naturally. |
| P1 | creatine monohydrate | 651 | 0.00% | 11.39 | Continue consolidating authority on `/creatine`; improve product snippets for the best-selling monohydrates. |
| P1 | creatine tunisie | 570 | 7.54% | 18.40 | Category content and internal links are the ranking lever; avoid creating another generic creatine article. |
| P1 | pre workout | 360 | 0.00% | 9.80 | Refresh `/pre-workout` title/snippet and connect relevant product and guide pages to it. |
| P1 | serious mass tunisie | 652 | 3.07% | 9.88 | Improve the product/article snippet pair and link both to the mass-gainer commercial hub. |
| P1 | Arabic creatine and protein guides | 8k+ page impressions across leading URLs | often <1% | 6–12 | Keep Arabic titles in Arabic, shorten them around the exact question, and add expert review before expanding YMYL claims. |

## Page opportunities

- `/omega-3/omega-3-fish-oil-240-softgel-weightworld`: 3,475 impressions, 0.75% CTR, position 7.44.
- Arabic “foods containing creatine” guide: 5,834 impressions, 0.29% CTR, position 7.92.
- Arabic protein-supplement guide: 2,604 impressions, 2.57% CTR, position 5.80.
- `/blog/impact-whey-protein-de-myprotein-avis-avantages-et-mode-d-emploi`: 1,804 impressions, 2.99% CTR, position 8.52.
- `/blog/whey-protein-en-tunisie`: 1,269 impressions, 2.60% CTR, position 11.15.
- `/page/creatine-monohydrate-tunisie`: 698 impressions, 0.29% CTR, position 9.58 in the export; the current redirect layer already removes the `/page/` prefix. Monitor consolidation rather than creating more competing URLs.

## Technical gaps and current state

- Host fragmentation in the export: `www.protein.tn` held 7,693 impressions and `protein.tn` 120,705. The live `www` URL now permanently redirects to the apex and canonical tags use the apex. Keep both signals and sitemap URLs aligned while Google consolidates them.
- Coverage retest: 2,544 rows resolved cleanly and 246 correctly return Gone. Remaining queue: 83 soft destinations, 45 dead URLs, 12 chains and 8 transient errors.
- The largest historical coverage bucket is “Crawled, currently not indexed” (1,000 sampled URLs). Many imported, unavailable products are intentionally `noindex`; do not force-index thin catalogue rows. Prioritise in-stock commercial pages with original descriptions, images and internal links.
- The export shows legacy `/category/*` traffic and faceted `/shop?...` variants. Current middleware redirects taxonomy aliases, and faceted shop requests carry `noindex, follow`; verify their decline in the next export.
- Several high-impression health articles make medical or performance claims. Add named expert review, sources and correction dates before expanding them. This is a quality and trust gap, not a place for more keyword repetition.

## Work started in this pass

1. Generic imported product descriptions now become unique commerce snippets containing the product name, current effective price, Tunisia delivery window and payment method. Hand-written benefit descriptions are preserved.
2. Blog SEO titles and descriptions can no longer drop the core subject or switch an Arabic article to Latin-only copy; misaligned titles use the concise first H1 clause and misaligned snippets use the article opening.
3. `/whey`, `/whey-protein` and `/proteine-whey` now consolidate on `/whey-proteine` instead of a 404 or the narrower isolate subset.
4. `scripts/analyze-gsc.mjs` makes the opportunity analysis repeatable when a fresh Search Console export replaces the current CSV files.

## Measurement cadence

- Export Search Console weekly with dimensions **query + page**, country Tunisia, device, and compare 28 days vs previous 28 days.
- Track P0 pages by impressions, CTR and average position; do not judge metadata changes before Google recrawls them.
- Re-run `node scripts/analyze-gsc.mjs`, the live indexability check, sitemap checks and SERP-title audit after every SEO release.
