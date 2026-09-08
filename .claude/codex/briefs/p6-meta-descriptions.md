# Phase 6 — The product meta description guard catches 4 of 39

## The measurement

`productDescription()` in `frontend/src/app/(shop)/[slug]/[productSlug]/page.tsx` (line ~91) exists
to catch backend-generated template copy and replace it with something worth clicking. It has a
detector, `isGenericImportTemplate`, that requires **three** markers at once:

```
/livraison\s+24\s*[-–]\s*72h/  AND  /paiement\s+[àa]\s+la\s+livraison/  AND  /authentique/
```

I sampled 39 real products from `products-0.xml` via `admin.protein.tn/api/product_details/…`
and ran that predicate over the description each one would actually use
(`seo_description || meta_description || meta_description_fr`):

```
sampled                                                    39
  template B  "<name>. Rayon <categ>, marque <brand>, sur Protéine Tunisie."     32
  other / hand-written                                                            7
  CAUGHT by the current guard                                                      4
```

So **32 of 39 formulaic descriptions ship to Google unchanged.** The guard was written against one
template ("… Livraison 24-72h … paiement à la livraison … authentique"), and the backend now emits
at least two more shapes that do not contain the word *authentique*:

- **Template A** — `"CREATINE MONOHYDRATE 300G - ULTIMATE NUTRITION — en vente en Tunisie. Livraison 24-72h partout en Tunisie. Paiement à la livraison."`
  (has two of the three markers, missing `authentique`)
- **Template B** — `"21st Century Chewable Vitamin D3, Orange, 110 comprimés. Rayon Vitamines, marque 21st Century, sur Protéine Tunisie."`
  (has none of the three)

Both are *distinct per product* — 39/39 sampled were unique strings — so this is not a duplicate
content problem. It is a **CTR** problem: the description restates the title and the category and
says nothing a shopper would choose on. The existing comment in the file records the cost already
measured on this exact failure — Omega 3 Fish Oil, 3,475 impressions at position 7.4, **0.75% CTR**.

## What makes this fixable rather than just annoying

`description_fr` is NOT empty. Across the same 39 products it holds real French product copy at a
**median of 7,355 characters** (min 1,557, max 9,359) — benefits, dosage, composition. The function
already has a path that builds from it (the `buildMetaDescription(product.description_fr, …)`
fallback at the end). Today that path is unreachable for these 32 products because `explicit`
is truthy and the guard says "not a template", so it returns the formulaic string.

## Do

1. Read `.claude/skills/protein-ui/SKILL.md`, then the whole comment block above
   `productDescription()` — it explains why the 160-char budget matters and why restating the
   product name wastes ~40 of it. Keep that reasoning intact.
2. Replace `isGenericImportTemplate` with a detector that recognises **formulaic** copy generally,
   not one hardcoded sentence. Suggested shape, but decide for yourself and defend it:
   - matches template A, template B, and the original three-marker template
   - a description that is essentially `name + category + brand + shop name` and adds no product
     fact is formulaic **even if it is unique**
   - hand-written benefit copy must still win — do not enrich something an operator actually wrote
3. When the description IS formulaic, build the replacement from `description_fr` (the real copy)
   plus the price, the way the existing enrichment branch does. Keep it ≤160 chars, cut on a word
   boundary, French, and do not restate the product name.
4. Add **`priceValidUntil`** to the Offer in the Product JSON-LD. `price_valid_until` is null on
   100% of the 39 sampled products, so derive a sane value (e.g. promo expiry when
   `promo_expiration_date` is set, otherwise a rolling date) and say in your report what you chose
   and why. Google warns on offers without it.

## Verify — you have NO network, so I have staged the data

`frontend/.seo-fixtures/products/` holds the **40 real API payloads** I sampled (gitignored; do not
commit them, do not delete them). Write `frontend/scripts/check-meta-descriptions.mjs` that:

- loads every fixture,
- computes the description each product would get **before** and **after** your change,
- prints the count still formulaic, the count enriched, any over 160 chars, and any that lost the
  price when one exists,
- exits non-zero if any fixture still yields formulaic copy.

To do that you will probably need `productDescription` out of the page file and into a util it can
import. That is a fine refactor — move it, keep behaviour identical for the non-formulaic path, and
leave the page importing it. **Do not change `generateMetadata`'s shape, the title, canonical,
OpenGraph, or any other metadata field.**

Report the before/after counts from your own run of that script.

## Don't

- Do not touch the Laravel backend. `meta_description_fr` is generated there; we are overriding on
  read, deliberately, because a backend change needs a deploy and a data migration.
- Do not touch `sourceBoilerplate.ts` or the retailer-name redaction — that logic is correct and
  load-bearing (see its header; a competitor's name in `Product.description` across 21,273 pages).
- Do not add `aggregateRating` or `review` to anything. There are no attested reviews and inventing
  them is the one thing that gets a site penalised. `buildAggregateRatingAndReviews` already handles
  the real ones.
- No new dependencies. No `backdrop-blur` (DS009). Do not commit, stage or push.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
node scripts/check-meta-descriptions.mjs
```

The page file is in `design-baseline.json` — do not add a new rule id to it. Any new file must be at
**zero** violations.

I will re-sample live products and re-run your script against fixtures I did not give you.
