# The SEO Engine — the moat

> Technical SEO is clean on all 391 pages. That was measured, and it is why the ranking problem
> has not moved: **the blocker is content depth and entity coverage, not code.** This document is
> about the layer that fixes that, and it is the single highest-value thing in the blueprint.

## 1. Where things actually stand

**Working, already invested in:** `SeoPage` and `Redirection` models · a `seo_health_checks` table ·
`PageSeoDefaults`, `ProductSchemaBuilder`, `ProductSeoDefaults`, `SeoHealthMonitor`, `SeoNotifier` ·
a scheduled `seo:health-check` that fetches the live site **as Googlebot** daily · `seo:self-heal` ·
IndexNow · a per-article language declaration that distinguishes the 31 Arabic posts from French.

**The real numbers:**

- 44 of 88 listing pages are **under 300 words**; median 307.
- **224 published articles, roughly 40 indexed.** That ratio is the cheapest unexploited win on the
  whole platform — the content is already written and paid for.
- 32 pages carry 29,101 impressions at **0.88% CTR**. Seven Arabic blog posts are ~11,600 of those
  at 0.33%.

**Diagnosis:** protein.tn ranks for its own product names and almost nothing else. There is no
topical surface. A competitor with 400 pages about *créatine* outranks a shop with 400 products.

## 2. The architecture: entities, not pages

Programmatic SEO done badly is a page generator, and Google's scaled-content-abuse policy exists
precisely for it. Done properly it is an **entity graph** where each page answers a real question
about a real thing, and the internal linking falls out of the graph rather than being hand-maintained.

### The entity model

| Entity | Source | Example | Count today |
|---|---|---|---|
| **Product** | `products` | Whey Isolate 2kg Optimum | 303 |
| **Brand** | `brands` | Optimum Nutrition | ~55 |
| **Category / SousCategory** | `categs`, `sous_categories` | Protéines → Whey | ~88 |
| **Ingredient** | **new** | Créatine monohydrate, BCAA 2:1:1, Beta-alanine | ~60 target |
| **Goal** | **new** | Prise de masse, Perte de poids, Endurance | ~10 |
| **Concept** | **new** | Fenêtre anabolique, Charge en créatine | ~80 target |
| **City** | **new** | Sousse, Tunis, Sfax | ~12 |

The three new entity types are the moat. `Ingredient` in particular: every product *contains*
ingredients, so an ingredient page is simultaneously a genuine informational answer **and** a
commercial hub linking to every product containing it. That relationship already exists implicitly
in the catalogue and is currently expressed nowhere.

```
Ingredient ──contains──> Product ──made_by──> Brand
    │                       │
    └──supports──> Goal <───┘
                    │
                 Concept
```

### Page templates that follow from it

| Template | Pattern | Intent | Est. pages |
|---|---|---|---|
| Ingredient | `/ingredients/{slug}` | informational | ~60 |
| Ingredient × Goal | `/creatine-prise-de-masse` | commercial investigation | ~120 |
| Goal hub | `/objectifs/{slug}` | commercial | ~10 |
| Brand × Category | `/optimum-nutrition/proteines` | commercial | ~150 |
| Comparison | `/comparatif/whey-vs-caseine` | commercial investigation | ~40 |
| Glossary | `/glossaire/{terme}` | informational | ~80 |
| City | `/proteine-{ville}` | local — `/proteine-sousse` already exists and works | ~12 |

**~470 pages, each with a genuine reason to exist.** That is the difference between a topical
authority and a doorway-page penalty, and the distinction is not the page count — it is whether
each page answers something a person actually asked.

## 3. The hard rules

These are what keep programmatic SEO on the right side of the line. They are non-negotiable.

1. **No page ships without a human-approved body.** The `ProductContentGenerator` pattern is already
   correct: AI writes to `ai_description_draft`, a human approves in Filament, and nothing reaches a
   customer or Googlebot before that. Every new template inherits this gate.
2. **No invented numbers.** No AI-generated Supplement Facts, dosages or nutrition values, ever.
   People dose themselves on those. No product in the catalogue carries a barcode
   (`gtin`/`sku`/`mpn` empty on all 40 sampled), so there is no reliable external source to join
   against either — a name-match probe against Open Food Facts returned a plausible hit for **2 of 8**.
   These are typed from the physical label or they are absent.
3. **No health claims.** `CLAIM_PATTERNS` already blocks *guérit / soigne / treats / approuvé par la
   FDA / clinically proven* in code, not merely in the prompt. Keep it that way — a prompt is a
   request, a regex is a guarantee.
4. **No fabricated reviews or ratings.** `AggregateRating` is emitted only from attested purchases.
   This is a Google spam-policy line and a manual-action risk, and it is also why the review system
   is purchase-token-gated.
5. **A template that cannot fill its body does not publish.** Thin pages are worse than no pages —
   they dilute the crawl budget that the 184 unindexed articles need.

## 4. Automated internal linking

Today's linking is hand-maintained. With an entity graph it becomes derivable:

- An ingredient page links to every product containing it, its goals, and related concepts.
- A product page links to each of its ingredients and its brand-category hub.
- A goal hub links to its ingredients, its top products, and its guides.
- Every link is generated from a relationship, so it cannot rot when a product is delisted.

This is also the mechanism that gets **184 unindexed articles crawled**: they are currently orphans
reachable only from a paginated blog index. Linking each from the ingredient or concept it discusses
gives it an internal path from a page that already has authority.

## 5. Schema

`ProductSchemaBuilder` exists. Extend per template:

| Template | Types |
|---|---|
| Product | `Product` + `Offer` + `AggregateRating` (attested only) + `BreadcrumbList` |
| Ingredient | `Article` or `DefinedTerm` + `FAQPage` + `BreadcrumbList` |
| Comparison | `Article` + `FAQPage` |
| Goal hub | `CollectionPage` + `ItemList` |
| City | `LocalBusiness` + `BreadcrumbList` |
| Glossary | `DefinedTermSet` / `DefinedTerm` |

## 6. Multilingual — measure before engineering

Verified against current Google documentation, not assumption: the "auto-translated without human
review" spam line was **deleted in March 2024** and replaced by *scaled content abuse* ("no matter
how it's created"). And: **"Google uses the visible content of your page to determine its language.
We don't use any code-level language information such as `lang` attributes, or the URL."**

Practical consequence: a `/ar/` URL prefix does **not** make a page Arabic — the content does. There
are already 31 Arabic articles ranking at root with no prefix, and they carry the site's largest
impression counts.

**So: no `/ar/` engineering yet.** Write 10–15 genuinely good Arabic guides on the existing blog,
give them 90 days in Search Console, and let measured demand justify the four hard middleware
blockers a locale prefix would require. Building the routing first is engineering ahead of evidence.

## 7. Sequence

1. **Fix indexation first.** 184 articles are written, published and invisible. Internal linking and
   sitemap segmentation cost days and unlock content that already exists.
2. **Ingredient entities.** ~60 pages, each a hub for products that already exist.
3. **Goal hubs.** ~10, the highest commercial intent on the list.
4. **Ingredient × Goal.** ~120, only after 2 and 3 prove they index and rank.
5. **Comparisons, glossary, brand × category.** The long tail.
6. **Arabic**, on measured demand.

Every step gated on the previous one being indexed and ranking. Publishing 470 pages at once into a
site that cannot get 224 articles indexed would waste all of it.
