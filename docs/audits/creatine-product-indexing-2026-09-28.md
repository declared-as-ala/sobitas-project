# Créatine product discovery and content audit — 2026-09-28

Scope: the 24 products in the live first-page `ItemList` at `https://protein.tn/creatine`.
Requests used a Googlebot user agent. This is a point-in-time audit, not a claim that Google
has indexed each URL or that any particular word count determines ranking.

## Technical checks

- Category: HTTP 200, indexable, 24 product links and 24 `<img src>` elements in server HTML.
- All 24 linked product pages: HTTP 200, indexable, self-canonical, `Product` JSON-LD with an
  image and a TND `Offer` price.
- All 24 packshot URLs: HTTP 200 and an image content type to the Googlebot user agent.
- All 24 canonical product URLs and their images occur in the three live product sitemaps.
- Browser and Googlebot category `ItemList` URL sets are identical (24/24). A sampled PDP had
  identical canonical, product name, price, stock, image, and robots directives for both agents.

The category's live Search Console **"1 valid item" is its Breadcrumb**, not a count of its
products. Its Google-indexed snapshot, last crawled by Googlebot smartphone on **2026-09-26
12:35 PM**, still reports six older Product snippet and Merchant listing items plus one
Breadcrumb. A fresh live URL test on **2026-09-28 2:22 AM** reports only the one valid
Breadcrumb and says the page can be indexed. The live category now uses `CollectionPage` and
`ItemList` without category-level `Product` nodes; each linked PDP has its own `Product`.
Google's Product rich-result documentation supports individual product pages, not category
listings. The difference between the indexed and live enhancement counts is a recrawl/reporting
lag, not evidence that only one of the 24 products was server-rendered.

Search Console URL Inspection spot-check on 2026-09-28:

- `/creatine/terra-origin-healthy-creatine-sans-arome-515-g-161216` (97-word description,
  back-order): **Page is indexed**, with one valid Product snippet item and one valid Merchant
  listing item. Product snippets has non-critical issues only.
- `/creatine/platinum-100-creatine-monohydrate-450g-muscletech` (784-word description,
  in stock): **Page is indexed**, with one valid Product snippet item and one valid Merchant
  listing item.

These examples disprove any claim that short copy automatically prevents indexing or Product
snippet eligibility. They do not prove that the whole 24-product set is indexed or that content
depth has no influence on search performance.

## Content queue

Measured the visible `Description` section in the Googlebot HTML. The 12 in-stock products
range from 207 to 1,376 words. Eleven of the 12 back-order products have descriptions of
94–110 words, mostly boilerplate. The remaining back-order page has 275 words. These counts
identify pages needing an editorial review; they are **not** a Google minimum-word rule.

| Back-order product path | Description words |
| --- | ---: |
| `/creatine/neocell-creatine-multi-collagen-bio-peptides-protein-sans-arome-285-g` | 110 |
| `/creatine/lemme-creatine-body-toning-gummies-blue-raspberry-60-gommes` | 100 |
| `/creatine/lemme-creatine-body-toning-gummies-sour-apple-60-gommes` | 108 |
| `/creatine/animal-creatine-chews-smarties-edition-120-chewable-tablets` | 98 |
| `/creatine/sunwarrior-active-creatine-monohydrate-blue-raspberry-332-g` | 108 |
| `/creatine/animal-creatine-hmb-powder-sans-arome-270-g` | 100 |
| `/creatine/ancient-nutrition-creatine-collagen-lemon-30-ml` | 94 |
| `/creatine/animal-creatine-hmb-powder-smarties-edition-345-g` | 102 |
| `/creatine/sunwarrior-protein-creatine-sans-arome-504-g` | 102 |
| `/creatine/megafood-micronized-creatine-monohydrate-powder-sans-arome-500-g` | 104 |
| `/creatine/terra-origin-healthy-creatine-sans-arome-515-g-161216` | 97 |

For each, verify the exact product and format against the maker's page or physical label;
add only useful, product-specific facts (ingredients, directions, package size, flavor,
allergens, and stock/ordering terms where documented). Do not infer nutrition values,
health claims, or reviews. Follow `docs/architecture/seo-engine.md`: draft first, human
approval in Filament before publication. Do not automatically noindex pages solely because
they are short; that tradeoff requires an editorial decision and Search Console evidence.

## Next verification

After approved copy is published, inspect representative URLs in Search Console and compare
the Product snippets and page-indexing reports after recrawl. Search Console's historical
"noindex" report must not be treated as the live state: the public catalog health endpoint
reported zero currently published products with a noindex flag on this date.
