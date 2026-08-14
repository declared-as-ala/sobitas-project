# iHerb as a catalogue source — complete technical specification

Everything the running pipeline knows about this source, written down so it can be reimplemented
independently. All of it was measured against the live site between 10/08/2026 and 14/08/2026; where
a number is a measurement, it says so.

**One thing this document deliberately does not contain:** any technique for defeating bot
protection — no header spoofing to look like a browser, no proxy rotation, no CAPTCHA handling, no
TLS-fingerprint work. If a request is refused, the correct response is to slow down or stop, and the
design below is built so that refusal is rare. Everything here works against endpoints iHerb's own
`robots.txt` permits, at a rate it tolerates.

---

## 1. The three-stage shape, and why it is three stages

| stage | what it reads | cost | writes |
|---|---|---|---|
| **discover** | 3 sitemap files | 3 requests for ~47,537 products | id, url, slug |
| **hydrate** | `/ugc/api/product/v2/{id}` | 1 request/product, ~600 bytes JSON | identity, brand, price, category |
| **content** | `/pr/{urlName}/{id}` | 1 request/product, ~2 MB HTML | prose, supplement facts, gallery, barcode |

They are separate because they fail differently. Hydration is small JSON that rarely changes shape;
content is HTML that changes whenever iHerb redesigns. Folding them together means one failure mode
stalls both, and it makes rows already hydrated ineligible for content without re-fetching their
JSON. **Two passes, two state columns, two independent things to resume.**

Each stage claims its rows with an atomic conditional `UPDATE` to a `fetching` state, so a killed
worker leaves a row that a `--reset-stuck` pass can return to the queue. The database is
authoritative; the job queue holds at most one batch. That is the entire resume logic.

---

## 2. Discovery — the sitemap

```
GET https://www.iherb.com/sitemap_index.xml
```

Look for `<loc>` entries containing `/products-`. Each is a gzipped product sitemap. Each entry:

```xml
<url>
  <loc>https://www.iherb.com/pr/doctor-s-best-5-htp-100-mg-60-veggie-caps/1</loc>
  <lastmod>2026-07-14</lastmod>
</url>
```

**The product id is the last path segment.** Parse `^/pr/(?<urlName>[^/]+)/(?<id>\d+)$`. This is the
only place the id comes from, and it is what every later stage keys on.

`lastmod` makes a weekly re-sync nearly free — only refetch what moved.

**Measured:** 47,537 products across the product sitemaps. Cap the download at ~24 MB per file.

**A dead end, so you do not repeat the experiment:** `/catalog/iherblive` looks like a catalogue
feed and is not. Measured 10/08 — `index=801` returns 50 items, `index=1001` returns zero. It caps
around 850 rows, repeats popular products, and is a live purchase feed with a buyer country per row.
It reaches **1.8%** of the catalogue.

---

## 3. Hydration — the identity endpoint

```
GET https://tn.iherb.com/ugc/api/product/v2/{id}
Accept: application/json
```

Substitute your own country subdomain. Returns JSON; the fields the pipeline reads:

| key | type | notes |
|---|---|---|
| `id` | int | echoes the id you asked for |
| `displayName` | string | full product title, including flavour and size |
| `brandName` | string | display name |
| `brandCode` | string | stable brand key — **match on this, not on the display name** |
| `partNumber` | string | iHerb's own SKU, e.g. `DRB-00066` |
| `url` | string | canonical `/pr/{urlName}/{id}` |
| `urlName` | string | the slug segment |
| `rootCategoryId` | int | **the relevance filter.** `101046` = Sports, `1855` = Supplements |
| `rootCategoryName` | string | human label for the above |
| `listPrice` | string/num | with currency |
| `discountPrice` | string/num | may be absent |
| `isAvailableToPurchase` | bool | |
| `isDiscontinued` | bool | |
| `primaryImageIndex` | int | which gallery index is the cover |

**There is no prose here and no barcode.** Fifteen keys, none of them a description. That is the
whole reason stage 3 exists.

**Image URLs are composed, not returned.** From `partNumber` and `primaryImageIndex`:

```
https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/{brandcode}/{partnumber}/l/{index}.jpg
```

e.g. `.../images/drb/drb00066/l/24.jpg`. Cloudinary negotiates format per browser (`f_auto`) and
tunes quality (`q_auto`), at five sizes. Referencing these is a decision with a real trade-off — the
product pages then depend on a competitor's CDN, and if they block referrers every imported image
breaks at once. Mirroring locally is the alternative and costs disk plus a backfill.

### Deriving size and flavour from the title

`displayName` carries them and the JSON does not. Parse with a units regex over
`g|kg|mg|mcg|ml|l|oz|lb|lbs|capsules|caps|softgels|gummies|lozenges|packets|servings|tablets`.

**The one trap worth spelling out:** a European-formatted `1,36 g` must not parse as `1`. Use a
negative lookbehind `(?<![\d,])` on the number, and strip any parenthesised `(… per …)` clause before
matching — "per serving" values otherwise win over the pack size.

---

## 4. Content — the product page

```
GET https://fr.iherb.com/pr/{urlName}/{id}
Accept: text/html
```

~2 MB of HTML per product. Cap at 6 MB.

### Which subdomain, and what it costs you

iHerb honours the country subdomain, **not** `Accept-Language`, and publishes 101 hreflang alternates
per product. Measured 10/08 from a Tunisian IP:

| host | result |
|---|---|
| `www.iherb.com` | 302 → `tn.iherb.com` |
| `tn.iherb.com` | `lang="ar-TN"`, `dir="rtl"` — Arabic |
| `fr.iherb.com` | `lang="fr"` — French, no redirect |
| `ca.iherb.com` | `lang="en-CA"` — English, no redirect |

**This is a real editorial decision, not a config default.** iHerb's French is machine-translated and
iHerb says so, in a disclaimer at the foot of every non-English page: *"Ce site web a été traduit
automatiquement à titre de courtoisie pour les clients. iHerb ne garantit pas que les traductions
sont complètes ou exemptes d'erreurs."* On a supplement, the translated sentences include **dosage
and contraindications**. The English page carries no such notice — those are the manufacturer's own
words.

Record the locale and the translated flag on every row, so the fact travels with the text.

### Extraction

The content blocks live under `#product-overview`, as repeated:

```html
<div class="row item-row">
  <div class="col-xs-24">
    <h3>Aperçu</h3>
    <div>…the prose…</div>
  </div>
</div>
```

Select `div` elements whose class list contains **both** `row` and `item-row`. Inside each, take the
first `h3`; the body is that heading's **next element sibling**.

Three blocks are identified by markup rather than by heading, because they are locale-free:

| test | meaning |
|---|---|
| body `id="disclaimer"` | iHerb's boilerplate. Read it only to detect the machine-translation notice — **never store it as product copy**, it is byte-identical on all 47,537 pages and names iHerb on your page |
| body `id="product-specs-list"` | specifications; parse the `<ul>` inside by its own ids/classes |
| body class contains `prodOverviewIngred` | other ingredients |

Everything else is decided by the heading text, normalised (lowercase, accents stripped):

| normalised heading | field |
|---|---|
| `apercu` / `overview` / `نظرة عامة` | `overview_html` |
| `usage suggere` / `suggested use` / `طريقة الاستخدام الموصى بها` | `suggested_use_html` |
| `avertissements` / `warnings` / `تحذيرات` | `warnings_html` |

**A heading you do not recognise must be RECORDED, not dropped.** Store it in an
`unmapped_sections` array. This is the single most important line in this document: iHerb changes
its markup, and a scraper that silently returns nothing looks exactly like a scraper that ran fine.
The same applies to a heading whose body is not its next element sibling — record it rather than
`continue`.

> **Live evidence for that warning.** On 14/08/2026 this pipeline had `supplement_facts_html`,
> `spec_*` and `gallery_image_urls` populated on ~50% of rows and **prose on 0%**. Every product body
> was the 74–123-word composed fact block, against a 250-word indexability gate, so ~10,259 products
> were published un-indexable. Nothing alarmed, because "the fetch returned 200" and "the extractor
> understood the page" were never separate measurements. **Count section yield per run and fail the
> run when it is zero.**

Also extract:

- `supplement_facts_html` — the `supplement-facts-container` table. This is the most valuable field
  on the page: real per-serving values, differentiated per product.
- `gallery_image_urls` — the Cloudinary URLs.
- `gtin` — the barcode, from the specs list. **This unlocks everything else**: with a GTIN you can
  query [DSLD](https://dsld.od.nih.gov/api-guide) (NIH, US-government, public domain, full label
  data) and [Open Food Facts](https://world.openfoodfacts.org/data) (ODbL) — both open, both stable,
  neither a competitor. A pipeline that captures GTIN early depends on iHerb much less.
- `manufacturer_url` — the brand's own site, which is a better long-term source than the retailer.

### Statuses you will meet

| status | meaning | handling |
|---|---|---|
| `410` | discontinued; the URL resolves to a different product | mark discontinued, do not retry |
| `451` | geo-blocked — common on food/household lines, rare on supplements | skip permanently |
| `404` | slug changed | re-discover from the sitemap |
| `200` + no sections | **markup changed** | alarm; do not treat as success |

A great many `urlName`s end in `-discontinued-item`. Five of six ids sampled that returned unusual
statuses were of that shape.

---

## 5. Pacing — the part that decides whether this keeps working

```
1.5 requests/second, across ALL iherb.com subdomains combined
```

**Pace on the host PATTERN, not the hostname.** The pipeline talks to `tn.iherb.com` for JSON and
`fr.iherb.com` for HTML; per-hostname buckets would give each the full rate and hit iHerb at 3 rps.
One bucket, one circuit breaker, shared across every worker — with several workers running a
47,537-product import, "several processes each politely pacing themselves" is not polite at all.

Circuit breaker: **5 consecutive failures → 30-minute cooldown.**

At 1.5 rps, 47,537 products is roughly 9 hours per full pass. Run it as a scheduled window
(dispatch a batch, stop, refill next window) rather than one long process — that is what makes it
killable at any moment.

### robots.txt — enforce it in code, not by convention

```
Disallow: /ugc/api/review/
Disallow: /ugc/api/product/*/review/summarization
```

Reviews are off limits. Do not write a method that can construct those URLs, and assert the
constraint on **every** request rather than relying on a robots matcher — a naive prefix matcher
cannot see a `*` in the middle of a rule and will happily allow the exact path that is forbidden.
That was a real bug here, found by checking rather than by assuming.

There is a second reason beyond robots.txt, and it is the stronger one: republishing another site's
ratings as your own `aggregateRating` is a Google structured-data violation whose penalty is a
**sitewide manual action**. Collect your own reviews instead.

---

## 6. What the extracted text can and cannot be used for

Reproducing a retailer's product description verbatim gives you a page that is a duplicate of a
stronger page. It will not rank, and at 10,000 pages it is the shape Google's scaled-content policy
targets.

The parts that are **facts** — Supplement Facts values, ingredient lists, serving size, pack size,
barcode, warnings — are not creative expression and are the same on the physical label. Those are
what to keep. Build the body from them, in your own words, per product, and the result is
differentiated because the facts are.

That is also why the GTIN matters so much: once you have it, DSLD gives you the same label data from
a public-domain US-government source, and the dependency on a competitor's HTML disappears.

---

## 7. If you reimplement this, the checklist that matters

1. Store the **id** from the sitemap. Everything keys on it.
2. Filter on `rootCategoryId`, not on the slug. A slug prefilter is a cheap heuristic — measured
   here, an early version denied 5,994 products and among them were every Cat's Claw product (93
   rows), Hair-Skin-Nails, Skin Eternal, Petadolex, and a supplement brand called AGELESS FOUNDATION
   LABORATORIES. A term wrongly on a deny list loses products **silently**; a term missing from it
   costs one HTTP request. Those errors are not symmetrical.
3. **Count what each stage yielded and alarm on zero.** Not "did it 200".
4. Record unmapped headings rather than dropping them.
5. Capture GTIN early and move to DSLD / Open Food Facts for label data.
6. One rate bucket per host *pattern*, shared across workers, with a breaker.
7. Never fetch reviews.
8. Keep promotion (making a product public) a separate, explicit step from acquisition. Acquisition
   should be safe to run unattended precisely because it cannot change a single public page.
