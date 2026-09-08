# Phase 8 — Product rich results: find everything blocking them, fix what is code

## What I already know, so you do not re-derive it

The owner's question is *"why do we not get product rich snippets?"* I have measured this much
against production on 08/09/2026 — take it as given and go past it:

- The Product JSON-LD is **well-formed**. On a real PDP it emits `@type`, `name`, `sku`,
  `brand`, `offers`, `image`, `description`, `productID`, `mainEntityOfPage`, `url`,
  `associatedMedia`, plus `gtin`/`gtin12` when the product has one (87% of one sample did).
  A `BreadcrumbList` and `Organization`/`LocalBusiness`/`WebSite` graph are present too.
- `priceValidUntil` is already derived by both builders. I checked. Do not "add" it.
- **`aggregateRating` and `review` are absent on purpose.** No order reaches "livrée", so no review
  is attested. `buildAggregateRatingAndReviews` already emits them when real reviews exist. This is
  an operational blocker, not a code one.
- **`availability` is `BackOrder` on almost everything.** API counts: **11,368 products, 145 in
  stock (1.3%)**, and a randomised 73-product sample was 100% `rupture`. 4,802 product URLs are in
  the sitemaps.

So the obvious answers are already answered. Your job is to find what is left, with evidence.

## Do

1. Read `.claude/skills/protein-ui/SKILL.md` first.
2. **Validate the emitted Product graph properly**, offline, against Google's documented
   requirements for Product/Offer rich results — required vs recommended fields, allowed enum
   values, type correctness (numbers vs strings), date formats, URL absoluteness, image
   constraints, `@id` resolution, and whether anything in the graph is orphaned or self
   -contradictory. `frontend/scripts/fixtures/meta-descriptions/` holds **40 real API payloads**
   including `json_ld_product`; `frontend/src/util/structuredData.ts` is where the graph is built.
3. Write `frontend/scripts/check-product-schema.mjs` that builds the Product graph for every
   fixture and reports, per rule, how many products violate it. Exit non-zero on violations you
   have fixed, so it stays a guard. Print a summary table.
4. Fix everything that is genuinely a code defect. For anything that is a data or operational
   problem, **report it, do not paper over it** — I need the list to take to the owner.
5. Pay particular attention to things that silently disqualify a rich result rather than erroring:
   - `availability` value vs what the page actually says
   - `priceCurrency`/`price` types, and price as a string with a comma
   - `image` — absolute, crawlable, not a `data:` URI, and reachable by Googlebot
   - `hasMerchantReturnPolicy` / `shippingDetails` enum values (one was already stripped at Product
     level because the backend's copy carried an invalid `returnPolicyCategory` — check the Offer's)
   - duplicate or conflicting `@id` between the Product node and the category `ItemList`

## Don't

- **Do not add `aggregateRating`, `review`, or any rating to anything.** There are no attested
  reviews. Inventing them is the single fastest way to get a manual action, and it is the one
  instruction here that is absolute.
- Do not change `availability` to `InStock` for products that are not in stock.
- Do not touch the Laravel backend, the landing page, auth, checkout, or account.
- Do not touch `frontend/content/categories/*.json`, `blogSeoConfig.ts`, or
  `googleBusinessReviews.ts` — I am editing those.
- No new dependencies. Do not commit, stage or push. **No network.**

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
node scripts/check-product-schema.mjs
```

Report: every rule you checked, how many of the 40 products failed it before and after, and a
separate list headed **OPERATIONAL** for anything that cannot be fixed in code. Name the single
change you believe would most increase the chance of a rich result, and say why.
