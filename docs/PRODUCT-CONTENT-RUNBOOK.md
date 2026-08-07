# Product content: what to run, in what order

Everything below is built, tested and committed on `product-content-pipeline`. None of it has run
against the production database — I have no access to it. This is the order to run it in, what each
step should print, and what to do when it prints something else.

Read the first section before running anything. It is the reason the plan changed.

---

## The finding that reshaped this work

**No external database covers this catalogue.** Measured 07/08/2026 against the 12 products that
currently carry a check-digit-valid barcode:

| Source | Matched | Why |
|---|---|---|
| NIH DSLD | **0 / 12** | It transcribes **US** labels. Our brands are Polish, Spanish, Portuguese. Even MuscleTech Nitro-Tech missed — EU packaging carries a different barcode from the US pack in DSLD. |
| Open Food Facts | **2 / 12** | Patchy outside mainstream food. |
| Open web | pages found for 4/4 | But only 1 of ~12 pages had machine-readable amounts. Manufacturers publish a nutrition *heading*; the numbers are often images. |

And the facts are not written anywhere on our own site either. Across 60 live crawler-view pages:
nutrition **3%**, ingredients **3%**, FAQ **0%**, allergens **0%**. What exists is marketing prose —
benefits 42%, usage 30%. Descriptions are not thin (median 319 words); the problem is that the
description *is* the whole page.

**Consequence:** the only source that covers all 309 products is the physical tub. Someone is
already handling every one of them to scan barcodes. That trip is the opportunity, and the admin now
turns it into structured, re-renderable data instead of a paragraph of HTML.

DSLD stays in the pipeline as a *verification* source — when it does match a barcode, it is
excellent — but it is not the coverage story. Expect it to fill a handful of products, not 309.

---

## Order of operations

### 0. Deploy and migrate

```bash
php artisan migrate          # adds products.nutrition_facts
php artisan config:clear && php artisan route:clear
```

The frontend needs a rebuild for the comparison table, the sanitiser and the label-photo rendering.

**Verify:** `php artisan tinker --execute="echo Schema::hasColumn('products','nutrition_facts') ? 'ok' : 'MISSING';"`

---

### 1. Recover the barcodes we already have

```bash
php artisan products:recover-gtin              # report only
php artisan products:recover-gtin --apply
```

Several products already hold a valid EAN-13 in `code_product`/`sku`. This promotes them into `gtin`
without anyone walking the warehouse.

**Expect:** around 12 products. It also reports *conflicts* (two columns disagreeing) and *duplicate*
barcodes across products — both are judgement calls, which is why the weekly schedule runs this
report-only and `--apply` is a human decision.

**If it reports a duplicate barcode:** two products claim the same trade item. One of them is wrong,
and leaving it means every future lookup for that product returns the other one's label. Fix before
continuing.

---

### 2. Scan the rest, and photograph the panel while you are there

This is the step everything else waits on, and it is not a code step.

For each product, in the warehouse:

1. **Scan the barcode** into the *Identifiants commerciaux* section (Tab 1 of the product form). An
   invalid check digit is rejected on save, so a mistyped code cannot be stored.
2. **Photograph the Supplement Facts panel** and upload it to *Images Nutritionnelles*. This is now
   rendered to Googlebot as well as to customers — previously it was human-only, so any product
   whose panel is a photo showed Google no nutrition content at all.
3. **Type the panel** into *Panneau nutritionnel* (Tab 4). Roughly two minutes per product.

Do the **top 80 by impressions first** — they carry 79.6% of product impressions.

**Why type it when the photo is already uploaded:** a photo cannot be searched, compared, or turned
into schema, and it is invisible to anyone using a screen reader. The typed version renders as a
proper French table on both views; the photo stays beside it as the evidence anyone can check it
against.

**What the form does for you:**
- Regulated nutrient names are translated automatically — type `Protein`, the page shows `Protéines`.
  Botanicals, blends and branded ingredients are **left exactly as typed**, on purpose.
- Sub-rows (`— dont`) render indented, because a sub-row is a component of the row above, not another
  line beside it.
- Three row types: a real quantity, *quantité non indiquée* (label gives only a %), and *mélange
  breveté*. These are genuinely different facts and the page marks them differently.
- **Référence des pourcentages** defaults to EU. Only change it for American packaging. Vitamin D's
  reference is 20 µg in the US against 5 µg in the EU, so the same capsule reads 100% on one label
  and 400% on the other — this is the field that keeps the page from printing a correct number under
  the wrong name.

**Nothing is calculated.** Do not convert units, do not add up a column, do not fill a blank with
something plausible. Copy what is printed. A missing cell stays missing.

---

### 3. Recover the FAQs already written into descriptions

```bash
php artisan products:extract-faq                 # dry run, prints the diff
php artisan products:extract-faq --apply
```

Lifts `FAQ`/`Questions fréquentes` headings out of the `description_fr` blob into the `faq` column,
where the `FAQPage` schema builder can see them. The schema is already wired on all three routes and
fires the moment the column is populated.

**Expect very little.** Measured across 60 pages: 0% carry a FAQ heading. This is worth running once
to catch the handful, not a source of coverage.

---

### 4. Draft the missing copy, then review it

```bash
php artisan products:generate-content --limit=15 --max-words=250
```

Already scheduled weekly (Wednesdays 03:30). Drafts land in `ai_*` columns which are hidden from the
API — customers and Googlebot cannot see them. **Publishing is the "Publier le contenu IA" bulk
action, and that human step is mandatory.**

The rate is deliberate. 95 of 309 products are under 250 words, and clearing that in one sweep is the
exact shape Google's scaled-content-abuse policy targets.

**Every figure in a draft must now appear in the evidence the model was shown.** Before this, the
figure check only ran when `nutrition_values` was empty — so a populated panel would have licensed
any number, including one the panel contradicts. Prices, pack sizes and delivery windows are in the
evidence block, so ordinary copy passes untouched.

**Do not ask for templated Q&A across the catalogue.** "Quel est le format de X ?" answered
identically on 309 pages is scaled content abuse, whoever writes it. Questions have to be worth
asking about that specific product.

---

### 5. Let DSLD fill what it can

```bash
php artisan products:enrich-dsld --limit=25            # report only
php artisan products:enrich-dsld --limit=25 --apply
```

Scheduled Tuesdays 02:45, before the Open Food Facts run, because DSLD carries the actual printed
supplement panel while OFF carries per-100 g food values.

**A GTIN match writes the panel. A name match writes nothing** — it records a pending observation and
proposes the label's barcode for someone to check against the tub. Expect mostly the second outcome;
see the finding above.

---

### 6. Measure

```bash
cd frontend && npm run audit:pdp
```

Runs against **protein.tn with a Googlebot user-agent**, because middleware rewrites bots to
`/x-crawler/product/[slug]` — an audit with a browser UA measures a page Google never sees. The
script asserts it reached the crawler view and aborts rather than reporting numbers for the wrong
page.

Baseline as of 07/08/2026, all 309 products:

| Metric | Now | Notes |
|---|---|---|
| `comparisonPct` | 0% | **Should jump on deploy alone** — needs no data |
| `faqSchemaPct` | 0% | Moves with step 3/4 |
| `supplementPanelPct` | 0% | Moves with step 2 |
| `nutritionImagePct` | 0% | Moves with step 2 |
| `refIsGtinPct` | 3.9% | Moves with steps 1–2 |
| `thinDescriptionPct` | — | <150 words; replaces `hasDescriptionPct`, which reads 100% and always will |

The baseline is a ratchet: coverage may never fall, and a product may never lose words.

---

## Things that will bite

**`nutrition_values` is now derived.** When `nutrition_facts` is filled, the HTML is regenerated on
every save and anything typed by hand into the HTML box is overwritten. The form says so. Products
with no structured facts keep their hand-typed HTML untouched.

**After changing the renderer, rebuild every panel:**
```bash
php artisan products:rebuild-nutrition-panels --dry-run
php artisan products:rebuild-nutrition-panels
```
Not hypothetical: French nutrient names and the percentage footnote both changed after the first
panels were written. Without this the catalogue splits between two vocabularies.

**Product creation used to be impossible outside one admin page.** `products` is a legacy table with
NOT NULL columns and no defaults, so under MySQL strict mode every programmatic `Product::create()`
died with `SQLSTATE[HY000] 1364`. That is fixed in the model, which is what makes the new **Dupliquer**
action — and any future importer — work at all. A duplicate deliberately drops `gtin`/`sku`/`mpn`/
`code_product` and is created unpublished with zero stock.

**Scraping needs a search API key.** Brave blocked us mid-test on 07/08/2026 after a few dozen
queries. Free tiers cover this: Google Programmable Search 100/day, Brave Search API 2,000/month. Set
`GOOGLE_CSE_KEY` + `GOOGLE_CSE_CX` or `BRAVE_SEARCH_KEY`. Until then `products:enrich-web` will find
little and will keep tripping its own circuit breaker, which is working as intended — a blocked host
yields nothing forever, so it backs off for 30 minutes rather than pushing through.

---

## Still open

- **Official brand video embeds** (one of the four blocks you chose) needs a YouTube Data API key and
  a place to store a verified video id. Not built. `<iframe>` is deliberately forbidden by the HTML
  sanitiser, so when it is built it must render through our own component with a known id — never an
  arbitrary iframe smuggled in through a description field on a page that takes payment.
- **Programmatic ingredient/goal/comparison pages** (`docs/architecture/seo-engine.md`) are scoped but
  not built, and should stay that way until the evidence base has something in it. ~470 pages
  generated from empty data is precisely the thin-content pattern they are meant to beat.
- **Mark delivered orders as delivered.** Still the blocker on real reviews, and real reviews are the
  only thing that can legitimately put stars on these pages.
