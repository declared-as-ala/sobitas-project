# Phase 8 — offline Product rich-result audit

## Scope and evidence

40 existing files in `frontend/scripts/fixtures/meta-descriptions/`, each run through
`sanitizeBackendProductJsonLd` (the preferred PDP path) and `buildProductJsonLd` (fallback).
Counts below are **distinct products failing either path**, not 80 independent products.
The before measurement was captured before editing the builder; fixture and builder SHA-256
hashes are in `frontend/scripts/fixtures/product-schema-before.json`.

**These are reduced payloads.** All 40 omit stock columns, top-level GTINs and the backend
Product `@type`; their `json_ld_product` contains only name, description and Offer.
All 40 do have a usable `seo.image`. 34 point to the external iHerb image CDN; six point
to admin.protein.tn. Fixture omissions do not contradict the owner's production measurements.
In particular, the 40 unknown-stock defects below are not an estimate of production prevalence.

The check is an application-specific implementation of documented constraints, not Google's
Rich Results Test or an exhaustive JSON-LD/schema.org validator. No network was used. These
documentation references were **not fetched or revalidated during this run**:

- [Product snippets](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
- [Merchant listings](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [Return policies](https://developers.google.com/search/docs/appearance/structured-data/return-policy)
- [Structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google Images guidance](https://developers.google.com/search/docs/appearance/google-images)

Product snippets require a name and at least one of offers, review or aggregateRating.
This storefront uses **offers**; missing reviews do not by themselves disqualify a price snippet.
Merchant listings require Product name/image and a priced Offer with currency. The additional
properties below have their own requirements when supplied, but missing recommended enhancements
are not equivalent to a critical Product error. Neither valid markup nor `BackOrder` guarantees display.

## Every measured rule

R = required for the stated feature; G = application consistency/validity guard;
D = source-data finding; W = recommended-field warning. Dates and GTINs are checked when present.
An absent optional property passes its validity check and is counted separately as missing.

| Rule | Class | Before /40 | After /40 |
|---|---|---:|---:|
| Product type and nonempty name | R | 0 | 0 |
| Snippet has offers; no rating needed | R | 0 | 0 |
| Merchant Product image present | R | 0 | 0 |
| Offer type; numeric, nonnegative dot-decimal price | R | 0 | 0 |
| Merchant price positive | R | 0 | 0 |
| ISO currency string, matching visible TND | G | 0 | 0 |
| Price equals visible effective price | G | 0 | 0 |
| Availability enum, if supplied | G | 0 | 0 |
| Availability follows stock; unknown omitted | G | 40 | 0 |
| Condition enum, if supplied | G | 0 | 0 |
| URL and ID fields absolute HTTP(S) | G | 0 | 0 |
| Public HTTP(S) image URLs, no data URI/credentials/local host | G | 0 | 0 |
| No logo/banner substituted for product photography | G | 0 | 0 |
| Unique images; associatedMedia type/URLs agree | G | 0 | 0 |
| Canonical Product/Offer URLs and stable Product ID | G | 40 | 0 |
| No conflicting types/values at a repeated ID | G | 0 | 0 |
| Local fragment references resolve to described entities | G | 0 | 0 |
| ItemList canonical links; no reuse of Product ID | G | 0 | 0 |
| Valid ISO calendar dates | G | 0 | 0 |
| Expiry not past; validFrom not later than expiry | D | 0 | 0 |
| Return-policy type, TN country, category, integer days | G | 0 | 0 |
| Return method/fee enums and conditional shipping fee | G | 0 | 0 |
| No delivery commitment for unknown/unavailable stock | G | 40 | 0 |
| Shipping type, destination, monetary rate, currency | G | 0 | 0 |
| Delivery types, DAY units, nonnegative ordered integer ranges | G | 0 | 0 |
| No stale secondary price, Offer ID or validThrough | G | 0 | 0 |
| GTIN digits, length, checksum; typed/generic agreement | D | 0* | 0* |
| No rating/review nodes emitted | G | 0 | 0 |
| Description nonempty text | W | 0 | 0 |
| Brand named and appropriately typed | W | 0 | 0 |
| SKU supplied as text | W | 0 | 0 |
| GTIN or MPN supplied | W | 40 | 40 |
| Availability supplied | W | 0 | 40 |
| Shipping details supplied | W | 0 | 40 |
| Return policy supplied | W | 0 | 0 |
| Price expiry supplied | W | 0 | 0 |

\* No GTIN values exist in this reduced cohort; validity has no real-fixture coverage.
The new availability/shipping warnings expose missing input rather than assert availability.
Numeric JSON strings such as `"26.125"` are valid prices; commas are not. The 40 fixture prices
already agreed with the visible price, including the active 99 DT promo on the local creatine.

The ID failures were in the fallback builder, which lacked Product `@id`, `url` and
`mainEntityOfPage`; these are consistency fixes, **not 40 Google-required-field failures**.
No Product/ItemList collision was found. Category code uses distinct ListItems with canonical
URLs and separate Product nodes. An entity identifier need not itself be a fetchable page;
embedded Brand nodes are described entities, not orphan references. The seller's Organization
reference resolves against the site graph. Compatible Organization/OnlineStore types are allowed.

## Code fixes and regression evidence

- Both builders derive availability from stock fields; stale `schema.availability` cannot override
  a forced stockout. Unknown stock omits availability and shipping commitments.
- `CrawlerProductView.tsx` now uses the same stock labels as the human PDP, including “Sur commande”,
  “Stock faible” and an explicit unknown state. Previously the crawler used a binary stock/rupture label.
- Rebuild the Offer from current commerce facts instead of spreading upstream fields. This removes
  stale `priceSpecification`, `validThrough`, foreign currency and conflicting Offer IDs, including
  the malformed object created by spreading an Offer array. A refreshed product GTIN also removes
  conflicting stale typed GTIN fields. The existing return policy was already
  valid and is retained. The Product admits backend identifiers instead of arbitrary nested entities.
- Preserve TND millimes; reject malformed or missing prices instead of inventing zero. Comma decimal
  input is normalized for schema, but comma prices remain a source-data/UI concern: `getPriceDisplay`
  does not parse them. No such source input occurs in these 40 fixtures; shared checkout price logic
  was not changed. The guard catches a future fixture with that discrepancy.
- Validate calendar dates; an active promo bounds any later declared expiry. Keep genuinely expired
  declared dates visible as data findings. Omit malformed supplied dates; retain the existing rolling
  horizon only where no explicit expiry exists. No new expiry feature was added.
- Validate and deduplicate image URLs, try remaining real image sources if one is invalid, and omit
  the image if no real one exists. Never replace missing product photography with the site banner.
- Give the fallback Product the same canonical entity identity as the backend path.

The guard includes 54 edge checks beyond the 40-product cohort, including five actual server-rendered
crawler stock states, stale schema stock/currency, Offer arrays, millime and comma prices, malformed
prices/dates/images, promo expiry precedence, and negative controls proving bad enums fail. No test
creates ratings or reviews. These edge checks are deliberately not reported as real product failures.

## OPERATIONAL

1. **Make a focused range genuinely purchasable and fulfil it.** This is the single change most likely
   to improve rich-result opportunities overall: the owner's measured 145/11,368 in-stock products
   leave very few offers backed by immediate stock. In code, `ProductRequestDialog.tsx` says price
   and timing are confirmed before ordering, and the PDP uses an inquiry CTA for backorders. An
   inquiry without a confirmed price/date is not evidence that a listed offer can actually be bought.
   Establish supplier availability, final TND price and fulfilment terms; do not change enums to simulate it.
2. Complete real deliveries and collect attested reviews through the existing flow. This enables
   star treatments; it is not a prerequisite for every Product price snippet. No rating changes were made.
3. Verify image access at the **actual host**. 34/40 fixture images rely on an external CDN.
   `next.config.js` allowing that CDN is not evidence of Googlebot access. Remote HTTP status,
   redirects, MIME type, robots.txt, WAF/hotlink restrictions and Googlebot-Image reachability are
   **unverified for all 40**. The local robots rules allow the public product/image paths; they cannot
   govern the admin or external CDN hosts. Image dimensions, clarity, actual product relevance and
   multiple useful aspect ratios also require image bytes; **40/40 unverified, not failed**.
4. Capture full payloads for the same cohort, including stock, identifiers, schema overrides and
   gallery data. All 40 reduced fixtures lack these fields. Confirm real barcodes against product
   packaging; do not infer their absence in production from these snapshots.
5. Confirm the actual seven-day, customer-paid mail return terms and in-stock shipping rates
   (10 DT below 300 DT, otherwise free; handling 0–1 and transit 1–3 days) against the published
   policy and operational practice. The emitted enums are valid; policy truth is not established offline.
6. Inspect canonical URL indexing, selected canonical, rendered Googlebot HTML, manual actions,
   merchant-program country/market eligibility and Search Console enhancement reports after release.
   This audit does not establish Tunisia's eligibility for each Google merchant surface. Category
   multi-product pages are not single-product snippet targets. Valid schema does not compel display.

Among the code fixes, the crawler availability parity change has the clearest production relevance:
it removes contradictory visible wording beside `BackOrder` on the pages Google is actually served.

## Verification

- `npx --no-install tsc --noEmit` — pass using the installed Windows `npx.cmd`.
- `npm run lint:design` — pass: **baseline holding**, 1,741 known violations across 61 files.
- `npm run lint` — pass: 0 errors, 296 warnings in the shared working tree.
- `node scripts/check-product-schema.mjs` — pass: 80 fixture graphs, 36 rules, 54 edge checks.
- `npm run build` with `NODE_OPTIONS=--require=./scripts/lib/product-schema-offline.cjs`,
  `NEXT_DIST_DIR=.next-phase8-verify`, `NEXT_TELEMETRY_DISABLED=1` — pass, including prebuild and
  postbuild. Outbound sockets/fetch were blocked before connection; API-dependent prerenders used
  their existing fallbacks. This proves compilation, not real production HTTP/indexing behavior.

The final build's blocker survives the build wrapper's `NODE_OPTIONS` override and reports
asynchronous connection failures without opening sockets. Earlier verification attempts exposed
that override (requests were rejected by the sandbox), then a synchronous-blocker prerender timeout;
the corrected asynchronous blocker completed all 38 static pages and postbuild checks.

The PowerShell npm/npx wrappers initially failed with missing Roaming npm CLI modules. The installed
`C:/Program Files/nodejs/npm.cmd` and `npx.cmd` worked without installation or configuration changes.
Only the build-added tsconfig include was removed afterward. Other sessions changed PDP/crawler
routes and productMetaDescription during this run; those edits were preserved and are not Phase 8 work.
