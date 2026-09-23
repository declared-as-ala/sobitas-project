# SEO changelog — protein.tn

Every SEO-motivated change, why it was made, what it should do, and how to confirm it. Newest first.

## 23 September 2026 — architecture pass: one declared category tree

Commits: `4b465dba` (architecture), `e9a460f0` (content). Measured with a Googlebot UA against
production on 23/09/2026; Search Console figures from `protein.tn/2026-09-22-28d/`.

### The diagnosis

Of the 56 live taxonomy URLs, the homepage linked **19**. `ProductsDropdown.tsx` held one rayon's
children in the DOM at a time (`activeSubs.map`) and swapped them on hover, and the panel itself was
portaled to `document.body`, which cannot render on the server. So the served HTML of every page
carried zero category links from the mega-menu, and 37 of 56 category URLs were reachable only after
landing on a rayon page.

    /              97 links   19/56        /proteines    72 links   16/56 (its own 8 children)
    /shop          61 links   10/56        /performance  69 links   17/56 (9 of its 10)
    /creatine      72 links   10/56 (none of its six amino siblings)

The tree existed one hop down. The global surface — the one on every page — was flat.

### What changed

`frontend/src/config/catalogTaxonomy.ts` declares the tree once. The header, the rayon pages, the
breadcrumbs (JSON-LD, visible, every PDP route, both crawler views), the related rails and the
sitemap all read it. **No URL changed** — a slug in that file IS the URL.

Four taxonomy defects corrected, all from the live API:

| defect | before | after |
|---|---|---|
| `acides-amines` | a *sibling* of bcaa, eaa, citrulline, l-arginine, beta-alanine | their parent |
| `glutamine`, `hmb` | under SANTÉ & VITALITÉ, beside Ashwagandha and Zinc | under Acides aminés |
| `glucides-energie` | 24 products, 0 in stock, duplicating `/glucides` | `nav:false`, linked only from its twin |
| SANTÉ & VITALITÉ | 21 flat children | four themes |

### Measured result (production build, Googlebot UA)

- Homepage taxonomy links **19 → 46 of 56**. The 10 held back are shelves with nothing buyable;
  they keep their URLs, keep `noindex, follow`, and stay one click away on their rayon page.
- `/glutamine`: `Boutique › SANTÉ & VITALITÉ › Glutamine` → `Boutique › Performance › Acides aminés › Glutamine`.
- `/magnesium`: → `Boutique › Santé & vitalité › Vitamines & minéraux › Magnésium`.
- Brand pages: `Accueil › Boutique › Optimum Nutrition` → `Accueil › Marques › Optimum Nutrition`,
  which states the node type without moving 570 brand URLs.

### A live robots bug this pass surfaced

`nothingBuyableHere` in the category route noindexed any listing whose first page was entirely out
of stock, and never consulted `protectedByTraffic`. Six URLs served `noindex` while earning search
traffic: `/caseine` (5 clicks @13.4), `/barres-proteinees` (157 impressions @10.3 — page one),
`/hmb`, `/mineraux`, `/articulations`, `/cla`. `/mineraux` was already a key of that list and was
noindexed anyway, which is what proved the list was decorative at that call site. All six are back
to `index, follow`; the ten genuinely empty shelves still correctly serve `noindex, follow`.

### Guard

`frontend/scripts/check-taxonomy.mjs`, in `prebuild`. Fails the build when a declared slug is not
live, a live slug is missing from the tree, a slug appears twice, a rayon has no visible children,
or a `protectedByTraffic` URL is marked `nav:false`. Fails **open** on a network error. Verified by
fault injection: exit 1 on each of the first four, exit 0 clean.

### Validation

    curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1)" https://protein.tn/       | grep -oE 'href="/[a-z0-9-]+"' | sort -u | wc -l     # expect the 46 nav slugs present
    curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1)" https://protein.tn/glutamine       | grep -o 'Acides aminés'                              # breadcrumb states the declared parent
    npm run check:taxonomy

Watch in Search Console over 2–4 weeks: "Submitted URL marked noindex" should fall by the six
rescued URLs plus the ten now withheld from the sitemap; `/whey-proteine`, `/creatine` and
`/mass-gainers` should gain internal-link count in the Links report.


## 22 September 2026 — audit pass

Source: `SEO_AUDIT.md` (145 findings, 135 surviving adversarial verification). Search Console data: `protein.tn/GSC-2026-09-22.md`. Implemented in ten file-disjoint batches, each reviewed by a second agent against the real diff, then typechecked, design-linted and built centrally.

### B1 · Routing & redirects

_Review: `fixed` — 3 issue(s) found and fixed in review; 7 left for a human._

**routing-canonical-redirects#1 — Taxonomy slug set is case-sensitive: every legacy URL that resolves to the 'Intra-Workout' rayon becomes a 2-hop 301…**

- *Files:* `frontend/src/util/taxonomySlugs.ts`
- *Change:* taxonomySlugs.ts walk() now stores `node.slug.trim().toLowerCase()`, so out.slugs, the out.terms keys and therefore bestCategoryForSlug()'s return value are all lowercase; isTaxonomySlug() folds its argument too (belt-and-braces for retiredSlug.ts / page-route callers that do not fold). Used the skeptic's inline fold rather than importing urlSlug, honouring the file's own convention (see the slugifyBrandName note) that this middleware-reached module does not pull in client-shipped modules. Added a docblock naming the measured chain so a refactor does not undo it. No DB rename, no middleware change, no brand change.
- *SEO reason:* sous_categories id 43 is the one mixed-case slug ('Intra-Workout'). Middleware lowercases every path before it looks anything up, so the Set missed, goneOrCategory handed back the raw key, middleware 301'd to /Intra-Workout and the case-fold block 301'd again. Every legacy prefix reaching that rayon paid two cacheable 301s to arrive at a destination the code already knew; Google tolerates the chain but counts it under 'Page with redirect' and delays consolidation.
- *Expected effect:* /shop/intra-workout, /category/intra-workout and /shop/intra-blast-nutrabio collapse from 2 hops to 1, landing directly on /intra-workout (200). Destination is unchanged, so no ranking can move down. /intra-workout has no clicks in GSC-2026-09-22 and is not a frozen rayon.
- *Risk:* low — the only behavioural difference is the case of a Map key; every caller already lowercases, and the destination URL is identical.
- *Validation:* After deploy: curl -sI -A "Googlebot/2.1" https://protein.tn/shop/intra-workout (expect 301 -> https://protein.tn/intra-workout, not /Intra-Workout), same for /category/intra-workout and /shop/intra-blast-nutrabio; /intra-workout must stay 200. Then node scripts/check-dead-product-urls.mjs.

**routing-canonical-redirects#4 — Same legacy slug 'proteine-whey' is sent to two different rayons depending on prefix: root → /whey-proteine,…**

- *Files:* `frontend/redirects.js`
- *Change:* redirects.js: destination changed on the three prefixed rules only — /category/proteine-whey, /subcategories/proteine-whey and /shop/proteines/proteine-whey now go to /whey-proteine instead of /whey-isolate. Every isolat-de-whey rule and the /product-category/proteines/whey-isolate rules are untouched. Added a comment recording the rationale next to the /category rule so the drift is not reintroduced.
- *SEO reason:* Legacy WooCommerce carried `proteine-whey` and `isolat-de-whey` as SIBLING subcategories, so `proteine-whey` named generic whey. redirects.js line 314 already sends the bare /proteine-whey to /whey-proteine and the file's own /whey-tunisie comment argues broad whey aliases belong on the full rayon; the three prefixed spellings were the outlier, handing one legacy intent to two different targets.
- *Expected effect:* /category/proteine-whey's 191 impressions (pos 43.4) consolidate onto /whey-proteine rather than /whey-isolate. Both destinations are live 200, so no chain is introduced and nothing is de-indexed.
- *Risk:* low — destination swap between two live 200 rayons; no title/H1/robots/canonical touched, so the 22/09 freeze is not engaged.
- *Validation:* curl -sI -A "Googlebot/2.1" https://protein.tn/category/proteine-whey (expect 308 -> https://protein.tn/whey-proteine), same for /subcategories/proteine-whey and /shop/proteines/proteine-whey; confirm /category/isolat-de-whey still 308 -> /whey-isolate. Pre-deploy: node -e "const l=require('./frontend/redirects.js')();console.log(l.filter(r=>r.source.includes('proteine-whey')))".

**availability-deleted-soft404#1 — Hard-coded 410 list retires two products that are still on sale under a renamed slug**

- *Files:* `frontend/src/middleware.ts`
- *Change:* middleware.ts: removed 'citruargin-300-g' and 'king-real-preworkout-500gr-real-pharm' from CONFIRMED_RETIRED_PRODUCT_SLUGS and added a module-level RESLUGGED_PRODUCT_SLUGS map consulted immediately BEFORE the 410 check (with a pathname!==target self-loop guard), emitting a 301 via the existing redirectPreservingQuery. Also amended the 410 set's docblock, which claimed 'the product API must positively answer 404' as the admission criterion — that is necessary but not sufficient, since a RENAME also 404s the old slug, and that is exactly how these two got in. redirects.js left alone: its /shop/ entries still win at next.config level and stay consistent.
- *SEO reason:* 410 is the strongest 'drop this and never come back' signal there is, and it was being returned for two live, in-stock products on every legacy address except /shop/ (which next.config rescues because its redirects run before middleware). Pre-workout is one of the five curated money categories, so every WordPress-era link into /product/, /products/, /category/ or /{old-cat}/ was being forfeited instead of consolidated.
- *Expected effect:* /product/king-real-preworkout-500gr-real-pharm and /products/citruargin-300-g (and every other prefix) turn from 410 into a single 301 onto the live PDP. The three GSC Not-found URLs carrying these slugs become redirects rather than Gone.
- *Risk:* low — both destinations verified 200, index,follow, InStock on 22/09/2026; the map has two entries and is consulted before an unconditional 410, so it can only turn a Gone into a redirect.
- *Validation:* After deploy: curl -sI -A "Googlebot/2.1" https://protein.tn/product/king-real-preworkout-500gr-real-pharm (expect 301 -> /pre-workout/king-real-preworkout-500gr-real-pharm-tunisie) and https://protein.tn/products/citruargin-300-g (expect 301 -> /citrulline/citruargin-300-g-real-pharm). NOTE: two guard scripts still pin the old 410 and will go red until updated — see needs_other_files.

**availability-deleted-soft404#2 — /blogs/{hyphenated-title} redirects into a 410 for 12 live articles whose real slug contains spaces/accents**

- *Files:* `frontend/src/util/blogSlugs.ts`, `frontend/src/middleware.ts`, `frontend/redirects.js`
- *Change:* blogSlugs.ts: refresh() now also builds a `folded` Map keyed by fold(slug) -> real slug (NFD, strip \p{M}, lowercase, collapse every non-\p{L}\p{N} run to '-', trim). Unicode classes, not [a-z0-9], because most of these articles are Arabic. A folded key claimed by two different live slugs is DELETED, never guessed at. Exported resolveArticleSlug(slug): string | false | null, which mirrors the existing miss-refresh + 30s cooldown + cacheComplete gate exactly; isArticleSlug is now a two-line wrapper over it, so its three-valued contract is unchanged. middleware.ts: the /blog/{slug} block calls resolveArticleSlug, keeps the 410 only on a definitive false, and otherwise 301s to…
- *SEO reason:* redirects.js rewrites only the /blogs prefix, so a WordPress-era hyphenated URL arrived at /blog/{hyphenated} and the exact Set could not see the article was alive — a 301 INTO a 410 for 12 live, sitemap-listed articles. That is the worst possible shape: Google spends the hop, caches it, and is told the destination is permanently gone.
- *Expected effect:* /blogs/{hyphenated} becomes 308 -> 301 -> 200 landing on the exact sitemap/canonical URL, for all 12 mapped articles including the Arabic creatine/protein posts. Invented slugs still 410; an ambiguous fold still 410s.
- *Risk:* low, and loop-proofed. The redirect guard compares blogHref(real) against blogHref(requested), not the raw slugs — some CMS slugs carry a literal newline, and blogHref collapses whitespace, so the space form and the newline form encode identically and the destination cannot be redirected back onto…
- *Validation:* After deploy: curl -sIL -A "Googlebot/2.1" "https://protein.tn/blogs/%D9%85%D8%A7-%D9%87%D9%88-%D8%A3%D9%81%D8%B6%D9%84-%D9%83%D8%B1%D9%8A%D8%A7%D8%AA%D9%8A%D9%86-%D9%81%D9%8A-%D8%AA%D9%88%D9%86%D8%B3%D8%9F" — expect 308, then 301, then 200 with url_effective equal to that article's <loc> in https://protein.tn/sitemaps/blog.xml. An invented slug (/blog/zzz-not-an-article) must still answer 410. Fold sanity re-run (no deploy needed): the script…

**availability-deleted-soft404#3 — Legacy /brand/{NAME} URLs answer 410 for brands that are live under a longer or corrected slug (~14 GSC URLs)**

- *Files:* `frontend/src/middleware.ts`
- *Change:* middleware.ts: added a module-level LEGACY_BRAND_ALIASES table applied to the output of slugifyName BEFORE isBrandSlug in the legacyBrand block — olimp->olimp-sport-nutrition, bsn-supplements->bsn, quamtrax-nutrition->quamtrax, kiven-levrone->kevin-levrone, nutrix-research->nutrex-research, galvanize-nutrition->galvanize-chrome. Deliberately NOT the proposed brandSlugByPrefix() heuristic: live brands like `pure` and `pink` would swallow any unknown /brand/pure-*, /brand/pink-* URL. RULE-1 dropped from scope as two skeptics advised and I re-confirmed live (/brand/RULE-1 already 301s to /rule-1, a live page).
- *SEO reason:* A brand that still exists under a longer or corrected slug has MOVED, not gone. isBrandSlug did an exact-Set match, so the legacy name fell through to retireLegacyPath and 410'd a live commercial listing, forfeiting every WordPress-era link. ~10-12 GSC brand URLs.
- *Expected effect:* /brand/OLIMP, /brand/BSN-SUPPLEMENTS, /brand/KIVEN-LEVRONE, /brand/NUTRIX%20RESEARCH, /brand/GALVANIZE-NUTRITION, /brand/Quamtrax%20Nutrition turn from 410 into one 301 onto the live brand page. Covers the spaced /brand/NAME/{id} forms too, since both shapes go through slugifyName.
- *Risk:* low — because the alias is applied before isBrandSlug, the existing live-brand check still validates the target, so a stale alias degrades to today's behaviour rather than 301ing into a 404. All six destinations verified 200 with a Googlebot UA on 22/09/2026.
- *Validation:* After deploy: curl -sI -A "Googlebot/2.1" https://protein.tn/brand/OLIMP (expect 301 -> /olimp-sport-nutrition, 200) and the same for /brand/BSN-SUPPLEMENTS, /brand/KIVEN-LEVRONE, /brand/GALVANIZE-NUTRITION, "/brand/NUTRIX%20RESEARCH", "/brand/Quamtrax%20Nutrition". Regression check: /brand/OSTROVIT must still 308 -> /ostrovit and /brand/RULE-1 still 301 -> /rule-1.

**availability-deleted-soft404#4 — Broad 'whey' legacy category URLs are consolidated onto /whey-isolate instead of the /whey-proteine money page**

- *Files:* `frontend/redirects.js`, `frontend/src/util/taxonomySlugs.ts`
- *Change:* Two parts. (a) redirects.js: the same three destination swaps as routing-canonical-redirects#4, plus a new explicit p('/product-category/whey', '/whey-proteine') next to the other single-segment /product-category rules — that URL was reaching /whey-isolate through the runtime fallback (measured 301 on 22/09). (b) taxonomySlugs.ts: added HEAD_TERM_HOME = { whey: 'whey-proteine' }, consulted after the scoring loop when bestScore === 1 and the single matched token is a key. I took the broader of the three skeptic variants (bestScore===1 rather than want.size===1) because a dead PDP slug such as `gold-whey-2kg-kevin-leverone` still reduces to one matching token and would otherwise keep drifting…
- *SEO reason:* bestCategoryForSlug breaks equal-score ties on the SHORTEST candidate slug, so the single token `whey` deterministically picks whey-isolate (12 chars) over whey-proteine (13). Every dead generic-whey URL was therefore feeding the isolate subcategory — the cannibalisation the ranking-constraint memo describes, against the head-term page KEYWORDS.md assigns 'whey protein tunisie' / 'whey tunisie' to.
- *Expected effect:* /product-category/whey and any future dead slug whose only significant token is `whey` land on /whey-proteine. A slug that also carries `isolat` or `hydrolys` scores 2 and keeps its specific rayon, so /category/isolat-de-whey is unaffected.
- *Risk:* low — the override fires only on a one-token match, is gated on the target existing in the live taxonomy, and moves equity between two live 200 rayons. No title/H1/robots change, so the freeze on /whey-proteine is not engaged.
- *Validation:* After deploy: curl -sI -A "Googlebot/2.1" https://protein.tn/product-category/whey (expect 308 -> /whey-proteine). Regression: /category/isolat-de-whey must still reach /whey-isolate, and /creatine-300gr-challenger-nutrition style creatine slugs must still reach /creatine. node scripts/check-gsc-coverage.mjs cross-checks redirects against the taxonomy.

**availability-deleted-soft404#6 — WooCommerce nested /shop/{cat}/{subcat}/{dead-product} URLs 410 without using the subcategory that is already in the URL**

- *Files:* `frontend/src/middleware.ts`
- *Change:* middleware.ts wpNestedShop block rewritten to capture all three segments. The last segment now goes through resolveShopSlug (not a bare lookupProduct), which adds the legacy '-N' suffix retry the old call skipped. On a definitive gone it tries isTaxonomySlug(subcategory) then isTaxonomySlug(category) — most specific first — 301ing to whichever is real, returns NextResponse.next() if the taxonomy is unreadable (never spend 'could not find out'), and only then falls to goneOrCategory, which still demands a token overlap before redirecting and 410s otherwise. Updated the block's own docblock bullet, which documented the old 'definitive API 404 -> 410' behaviour.
- *SEO reason:* Google's guidance — quoted in this same file's goneOrCategory docblock — is to redirect a discontinued product to its relevant category and reserve 410 for when none exists. Here the relevant category was literally in the URL and was thrown away: /shop/proteines/whey-isolate/iso-100-2-3-kg-dymatize/ answered Gone while /whey-isolate is a live 200 listing. 9 URLs in the export, but this is the WooCommerce default permalink shape and recurs for every re-slugged product.
- *Expected effect:* Nested WooCommerce product URLs whose product is re-slugged now resolve to the live PDP in one hop (via the -N retry or the API), and the rest land on the subcategory already named in the path instead of 410. A path whose segments are all meaningless still 410s.
- *Risk:* low — every new branch either produces a 301 to a URL positively confirmed as taxonomy, or falls back to the exact goneOrCategory/410 behaviour that was there before. The 4-segment shape has no route in the app router, so nothing live can match it.
- *Validation:* After deploy: curl -sIL -A "Googlebot/2.1" "https://protein.tn/shop/proteines/whey-isolate/iso-100-2-3-kg-dymatize/" — expect it to end on /whey-isolate/iso-100-dymatize-2-3kg (200) or /whey-isolate (200), not 410. Control: a path with three invented segments must still terminate at 410.

**availability-deleted-soft404#7 — WooCommerce ugly-permalink product URLs (/?product=slug) serve a 200 duplicate of the homepage**

- *Files:* `frontend/src/middleware.ts`
- *Change:* middleware.ts: extended WP_HOME_PARAMS with 'product_tag', 'product', 'post_type' and 'add-to-cart'; each hit keeps the existing 301 to '/'. Followed the skeptic and did NOT add a lookupProduct() call to the '/' block — that would put a 1.5 s-timeout backend fetch on the homepage request path for a URL shape with no observed GSC entries. 'orderby' left out: it is a real listing param and this block is '/'-only anyway.
- *SEO reason:* /?product={slug} and /?post_type=product&p={id} are WooCommerce's non-pretty permalinks and /?add-to-cart= is its action URL. Measured 22/09: /?product=abc answered 200 with the full 822 KB homepage — an unbounded query space where every variant is crawled and rendered in full before the canonical consolidates it.
- *Expected effect:* Those query shapes answer a cheap 301 to / instead of rendering 822 KB of homepage. The canonical was already correct, so nothing moves out of the index that was in it — this reclaims crawl budget.
- *Risk:* low — one-line list extension; only fires on pathname === '/', so real app and tracking params (category, brand, page, search, utm_*, gclid, fbclid) are untouched. No redirect loop: '/' carries none of these keys.
- *Validation:* After deploy: curl -sI -A "Googlebot/2.1" "https://protein.tn/?product=abc" and "https://protein.tn/?add-to-cart=55" (expect 301 -> https://protein.tn/). Regression: "https://protein.tn/?utm_source=x" must still be 200, and "https://protein.tn/?s=whey" must still 301 to /shop?search=whey.

**availability-deleted-soft404#8 — Creatine legacy URL is redirected to a whey-isolate PDP (irrelevant successor = soft-404 shape)**

- *Files:* `frontend/redirects.js`
- *Change:* redirects.js: p('/gold-creatine-kevin-levrone-300-g', ...) destination changed from '/whey-isolate/gold-iso-2-kg-kevin-levrone' to '/creatine/gold-creatine-kevin-levrone-300-g'. Took the skeptic's correction over the finding's own recommendation: the finding assumed the product was discontinued, but the identical slug is live, so the exact PDP is the right one-hop target rather than the /creatine rayon.
- *SEO reason:* Google documents a redirect to an unrelated page as a soft 404. A creatine URL was being sent to a whey isolate PDP — a hop spent that helped neither /creatine (a curated money page) nor the visitor. It was a bulk-mapping slip from the ~160-URL commit, not a deliberate placement.
- *Expected effect:* The legacy creatine URL reaches its own live PDP in one hop and stops being classified as a soft-404-shaped redirect.
- *Risk:* low — /creatine/gold-creatine-kevin-levrone-300-g verified 200 with a Googlebot UA on 22/09/2026; the target PDP is not frozen and nothing else references the old destination.
- *Validation:* After deploy: curl -sI -A "Googlebot/2.1" https://protein.tn/gold-creatine-kevin-levrone-300-g (expect 308 -> https://protein.tn/creatine/gold-creatine-kevin-levrone-300-g, which is 200).

### B2 · Indexability, pagination & facets

_Review: `needs_human` — 1 issue(s) found and fixed in review; 5 left for a human._

**index-noindex-pagination-filters#1 — Category/shop ?page=N are noindex,follow AND byte-duplicate page 1 (same title, H1, intro, how-to-choose, FAQ + FAQPage…**

- *Files:* `frontend/src/app/(shop)/shop/page.tsx`, `frontend/src/app/(shop)/category/[slug]/page.tsx`
- *Change:* Split into the half that is safe today and the half that is not, and shipped the safe half. (a) /shop pagination is INDEXABLE again. shop/page.tsx generateMetadata: `...(isPaged ? {robots:{index:false,follow:true}} : {})` became `...(overflowedTo !== null || isShopFiltered(query) ? {robots:{index:false,follow:true}} : {})`. Only the past-the-end case and faceted views stay noindex; the 473 real page numbers lose the directive and fall through to the layout's index/follow. Self-canonical, `follow`, rel=prev/next absence and page 1 are all untouched. The long `EVERY ?page=N IS noindex` docblock was rewritten rather than deleted, with the live measurement and the GSC rows that justify the…
- *SEO reason:* Verified live 22/09 with a Googlebot UA that the two pagers are NOT the same case, which is what let me ship one and hold the other. /shop vs /shop?page=2: title already differs (` — Page 2`), 2 h2 on both, 0 FAQPage on both, 218 vs 242 extracted words of which the shared furniture is one intro sentence plus the H1 — page 2 is thin but genuinely unique, so the reason for its noindex does not hold. /creatine vs /creatine?page=2: identical title, identical H1, 9 h2 on both, FAQPage present on…
- *Expected effect:* 473 /shop paginated URLs become indexable, restoring a crawl path that was decaying, and the 5 paginated URLs already earning clicks stop being suppressed. Category page-N titles stop duplicating the page-1 (frozen) title across up to 26 URLs per series. No change to any page-1 URL, so no performing URL moves.
- *Risk:* low-medium. The /shop flip is reversible in one line and page 1 is untouched. The residual risk is 473 thin-but-unique URLs entering the index; that is bounded by the fact that they are genuinely unique (measured above) and by the overflow guard that already closes the unbounded tail.
- *Validation:* Pre-deploy: `cd C:/mla && git diff "frontend/src/app/(shop)/shop/page.tsx" "frontend/src/app/(shop)/category/[slug]/page.tsx"` — 8 + 7 hunks, all in generateMetadata. Post-deploy, UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)": curl -s -A "$UA" https://protein.tn/shop?page=2 | grep -oE 'name="robots" content="[^"]*"|<title>[^<]*' → expect `index, follow` (was `noindex, follow`) and a title ending `— Page 2 |…

**index-noindex-pagination-filters#3 — Category faceted URLs (?brand=, ?sort=, ?flavors=, ?min_price=…) are index,follow with canonical to /{slug}; the /shop…**

- *Files:* `frontend/next.config.js`
- *Change:* next.config.js: the `facetedShopNoindex` rule map now uses `source: '/:slug'` instead of `source: '/shop'`, so the `X-Robots-Tag: noindex, follow` header fires on every single-segment listing (/creatine, /whey-isolate, /optimum-nutrition …) carrying any of the 14 FACET_KEYS, not only on /shop. `has`, the key list, the `page` omission and every other rule are unchanged. Added a docblock explaining the widening, the live measurement, and why this CANNOT be done in generateMetadata; adjusted the stale lead comment above it.
- *SEO reason:* Took the skeptic's fix over the finding's recommended_fix, because the recommended_fix would have been dead code. middleware.ts:1034-1036 rewrites crawler UAs to /x-crawler/category/{slug} and re-adds ONLY `page`, so the `searchParams` reaching generateMetadata never contain brand/sort/flavors for the visitor this targets — `isShopFiltered(metaQuery)` would be permanently false there. next.config headers match the original request URL before the rewrite, which is exactly why /shop?brand=72…
- *Expected effect:* Faceted category/brand URLs (?brand=, ?sort=, ?flavors=, ?min_price=) stop being indexable on a rel=canonical hint alone and get the same directive /shop's facets have had. Removes one of the two policies the site was running for the same facet.
- *Risk:* low
- *Validation:* Pre-deploy, the config still parses and the rule shape is right: cd C:/mla/frontend && node -e "require('./next.config.js').headers().then(h=>console.log(JSON.stringify(h.filter(r=>r.has&&r.has[0].type==='query').map(r=>r.source+'?'+r.has[0].key))))" → 14 entries, all `/:slug?<key>`. Post-deploy: curl -sI -A "$UA" 'https://protein.tn/creatine?brand=72' | grep -i x-robots → `X-Robots-Tag: noindex, follow` (absent today). curl -sI -A "$UA"…

**index-noindex-pagination-filters#4 — Category ?page beyond the last page answers 200 with an empty grid and a self-canonical to the non-existent page; /shop…**

- *Files:* `frontend/src/app/(shop)/category/[slug]/page.tsx`
- *Change:* category/[slug]/page.tsx generateMetadata: when metaQuery.page > 1 it now calls the file's own `loadListingPage(metaQuery, scope)` — with the scope derived from `type`, so it is the SAME unstable_cache key the body is about to read, i.e. a cache lookup, not a second round trip — and sets `overflowedTo = serverPagination.totalPages` when `serverPagination.total > 0 && metaQuery.page > serverPagination.totalPages`. The canonical for page > 1 is built with `page: overflowedTo ?? metaQuery.page`, so /creatine?page=99999 now canonicalises to /creatine?page=9 instead of to itself.
- *SEO reason:* Mirrors what shop/page.tsx:114-131 already does, for the 55 taxonomy listings it never covered. A self-canonical pointing at a URL that returns an empty grid is a soft 404 that asserts itself; today it is contained by the page>1 noindex, but it is the exact hole that would become unbounded the moment category pagination is flipped to indexable — which is the very next commit. Kept the `total > 0` guard the skeptic insisted on and documented it as non-optional: loadForCache turns a 429/5xx into…
- *Expected effect:* Link equity arriving at an out-of-range category page number consolidates on a URL that exists. Removes a soft-404 signal from 55 listings.
- *Risk:* low — no extra API call (same cache key), no change on page 1, no change when the page number is in range.
- *Validation:* Post-deploy: curl -s -A "$UA" 'https://protein.tn/creatine?page=99999' | grep -o 'rel="canonical" href="[^"]*"' → `https://protein.tn/creatine?page=9` (today: `?page=99999`). Regression: curl -s -A "$UA" 'https://protein.tn/creatine?page=2' | grep -o 'rel="canonical" href="[^"]*"' → still `https://protein.tn/creatine?page=2`, unchanged. The 200→308 half needs the x-crawler file — see needs_other_files.

**index-noindex-pagination-filters#5 — /shop faceted URLs send contradictory directives: X-Robots-Tag noindex,follow header + <meta name=robots> index,follow…**

- *Files:* `frontend/src/app/(shop)/shop/page.tsx`
- *Change:* shop/page.tsx:185 now spreads the robots object when `isShopFiltered(query)` is true as well as on overflow (one combined condition, shipped with #1's change to the same line). `isShopFiltered` is already imported at L10 and already ignores `page`, so no query spread was needed and the two clauses do not overlap. Also updated the stale line in the file-head docblock that said the facet rules live only in next.config.js.
- *SEO reason:* A response carrying `X-Robots-Tag: noindex, follow` and `<meta name="robots" content="index, follow">` at the same time is a contradiction no reader should have to resolve, even though Google resolves it to the restrictive one. I corrected the finding's and the skeptic's shared assumption in the docblock rather than repeating it: bingbot and GPTBot are both in util/isCrawler.ts, so middleware strips their facets too and this clause never fires for them either — the header is what protects every…
- *Expected effect:* Consistency only. No indexing outcome changes for Googlebot or any UA in isCrawler.ts.
- *Risk:* low
- *Validation:* Post-deploy, with a NON-crawler UA (this is the only UA where the clause is observable, because middleware strips facets for every crawler UA): curl -s 'https://protein.tn/shop?brand=72' | grep -o 'name="robots" content="[^"]*"' → `noindex, follow` (today `index, follow`). curl -s https://protein.tn/shop | grep -o 'name="robots" content="[^"]*"' → still `index, follow`. With the Googlebot UA the header keeps doing the work and the meta stays…

**sitemap-robots#5 — Empty subcategory listings are excluded from the sitemap as soft-404s but still render index,follow (e.g. /vetements)**

- *Files:* `frontend/src/app/(shop)/category/[slug]/page.tsx`
- *Change:* category/[slug]/page.tsx generateMetadata derives an `indexable` flag from data it already has in hand, and the robots line became `metaQuery.page > 1 || !indexable ? {index:false,follow:true} : {index:true,follow:true}`. `indexable` is false only when the slug resolves to a SUBcategory with zero published products AND no content file (`seoJson === null`) — the same two conditions util/sitemapSources.ts:663-664 uses to drop the URL from listings.xml. The count comes from the taxonomy payload already fetched (`pagination.total`, falling back to `products.length`), never from loadListingPage, because that helper converts a transient 429/5xx into an empty list. Rewrote the robots docblock's…
- *SEO reason:* The sitemap and the page were disagreeing about the same URL: sitemapSources drops an empty subcategory as a soft 404, the page served it `index, follow`, and /vetements is in navCategories so it is linked from every page on the site. Confirmed live today: /vetements → 200, `index, follow`, 'Aucun produit disponible pour le moment', and no `vetements.json` exists under frontend/content/categories/. The crawler route's brand branch has implemented exactly this rule since it was written…
- *Expected effect:* Empty subcategories stop being handed to Google as indexable listings, matching the sitemap's own rule. Self-correcting: the day a subcategory gets its first product it is indexable again with no intervention.
- *Risk:* low. Scoped to subcategories (top-level categories keep index:true unconditionally, mirroring the sitemap), guarded against both API outages and payload shape changes.
- *Validation:* Post-deploy: curl -s -A "$UA" https://protein.tn/vetements | grep -o 'name="robots" content="[^"]*"' → `noindex, follow`. The regression check is the one that matters — a POPULATED subcategory must not move: curl -s -A "$UA" https://protein.tn/whey-isolate | grep -o 'name="robots" content="[^"]*"' → still `index, follow`. curl -s -A "$UA" https://protein.tn/creatine | grep -o 'name="robots" content="[^"]*"' → still `index, follow` (freeze…

### B3 · Crawler category view

_Review: `clean`; 5 left for a human._

**category-metadata-h1-content#2 — Crawler view buries the product list under 1,500–3,200 words of editorial; human view shows products after ~190 words**

- *Files:* `frontend/src/app/components/crawler/CrawlerCategoryView.tsx`
- *Change:* Reordered CrawlerCategoryView: the 'Produits' section, the pagination nav and the 'Sous-catégories' section now render immediately after the editorial intro, before the 'Comment choisir' guide / long-bottom / FAQ. Pure JSX move, no prop or route change, every block kept. Added a short ORDER MATTERS note at the render site and updated the file docblock (which claimed a parity that did not exist). Product entries also gained image + price + stock (see images#1 / crawler-parity-rendering#4), so the list now reads as a listing.
- *SEO reason:* Google reads the crawler view (middleware bot rewrite). The product list sat after ~2,850 words of editorial on /creatine (human page: ~190), so the money categories looked like articles and lost transactional queries to the blog posts. Order parity with the human page is also the cloaking line the file's own docblock invokes.
- *Expected effect:* Bot HTML of /creatine, /whey-proteine, /mass-gainers, /pre-workout, /proteines puts 'Produits (N)' as the first H2 after the intro H2s; ~2,850 fewer words before the first product anchor. No title/H1/robots/canonical change, so the 22/09 freeze is untouched.
- *Risk:* low
- *Validation:* After deploy: curl -s -A 'Mozilla/5.0 (compatible; Googlebot/2.1)' 'https://protein.tn/creatine?__crawler=1' > /tmp/c.html then confirm the byte offset of 'Produits (' is smaller than that of 'Comment choisir' (e.g. node -e "const s=require('fs').readFileSync('/tmp/c.html','utf8');console.log(s.indexOf('Produits ('), s.indexOf('Comment choisir'))"). Locally: git diff frontend/src/app/components/crawler/CrawlerCategoryView.tsx.

**brands-hierarchy-breadcrumbs#1 — Crawler view reads the sub-category parent from a key the API never sends, so Googlebot's breadcrumb loses the parent…**

- *Files:* `frontend/src/app/x-crawler/category/[slug]/page.tsx`
- *Change:* x-crawler/category/[slug]/page.tsx now reads the sub-category parent from the key the payload actually carries: (data as {sous_category?:{categorie?:{slug,designation_fr}}}).sous_category?.categorie, instead of the non-existent top-level data.category. Parent crumb name is .trim()ed (stored values carry a trailing space) and its href goes through canonicalCategoryPath(). The stale comment claiming the fix already shipped was rewritten to say why it was dead code.
- *SEO reason:* The visible trail and the BreadcrumbList Googlebot receives had no structural link from any sub-category up to its hub (/performance, /proteines, /prise-de-masse, /sante-vitalite), while the browser render did — a bot/human divergence on a dynamically-rendered page type.
- *Expected effect:* Bot HTML of /creatine, /bcaa, /vitamines, /whey-isolate, /mass-gainers gains an href to the parent hub in both the visible <ol> and the BreadcrumbList JSON-LD (Accueil › Boutique › PERFORMANCE › Créatine).
- *Risk:* low
- *Validation:* Live API shape already confirmed today: curl -s 'https://protein.tn/api-proxy/productsBySubCategoryId/creatine?meta_only=1' returns sous_category.categorie = {slug:'performance', designation_fr:'PERFORMANCE'} and no top-level 'category'. After deploy: curl -A Googlebot 'https://protein.tn/creatine?__crawler=1' | grep -o 'href="/performance"' must return a hit (it currently returns nothing).

**internal-linking#3 — Sub-category crawler breadcrumb never links the parent category (reads a key the API does not send)**

- *Files:* `frontend/src/app/x-crawler/category/[slug]/page.tsx`
- *Change:* Same single edit as brands-hierarchy-breadcrumbs#1 (parent key in the crawler breadcrumb). relatedCategories was deliberately handled separately, under internal-linking#5.
- *SEO reason:* Removes the 'zero links to any other category' state on the bot-facing render of every sub-category page; BreadcrumbList JSON-LD is built from the same array, so both surfaces get the parent.
- *Expected effect:* 41 of 47 listing pages stop handing Googlebot a trail that skips their parent hub.
- *Risk:* low
- *Validation:* grep -n 'sous_category?.categorie' 'C:/mla/frontend/src/app/x-crawler/category/[slug]/page.tsx' ; after deploy the curl above.

**category-metadata-h1-content#10 — Crawler breadcrumb never resolves the parent category and uses the full H1 as the last crumb (bot and human…**

- *Files:* `frontend/src/app/x-crawler/category/[slug]/page.tsx`
- *Change:* In addition to the parent-key fix, the last crumb now uses merged.breadcrumbLabel?.trim() || title (same precedence as the human route) instead of the full H1.
- *SEO reason:* The bot breadcrumb named /creatine 'Créatine monohydrate en Tunisie : prix et formats' while the browser render named it 'Créatine' — two entities for one URL, and a 50-character crumb in any breadcrumb rich result.
- *Expected effect:* Bot BreadcrumbList last item becomes the short taxonomy label wherever breadcrumb_label is set in the CMS; falls back to today's value when it is not, so nothing regresses. H1 and <title> are untouched (freeze respected).
- *Risk:* low
- *Validation:* After deploy: curl -A Googlebot 'https://protein.tn/creatine?__crawler=1' | grep -o '"@type":"BreadcrumbList".\{0,400\}' and compare the item names with the Chrome-UA fetch of the same URL.

**brands-hierarchy-breadcrumbs#2 — Crawler view has no sibling/parent fallback for uncurated sub-categories, leaving them with zero category links for…**

- *Files:* `frontend/src/app/x-crawler/category/[slug]/page.tsx`
- *Change:* Added the human route's related-links fallback to the crawler route, without extracting a shared helper: when merged.relatedCategorySlugs is empty, a sub-category falls back to [siblings under the same parent, parent].slice(0,6) and a top category to the other top categories.slice(0,6). Slugs are then resolved against the taxonomy (see internal-linking#5).
- *SEO reason:* With the dead parent crumb, an uncurated sub-category (21 under /sante-vitalite, most under /performance and /equipement) linked to no category at all in the HTML Google indexes; link equity stopped at products and the hubs received no child links.
- *Expected effect:* /probiotiques and every other uncurated sub-category ship links to their siblings and to their parent hub in the bot render.
- *Risk:* low
- *Validation:* After deploy: curl -A Googlebot 'https://protein.tn/probiotiques?__crawler=1' | grep -oE 'href="/(sante-vitalite|probiotiques|[a-z0-9-]+)"' | sort -u — expect /sante-vitalite plus sibling slugs (today the only single-segment hrefs are /, /shop, /favoris, /account).

**internal-linking#5 — Crawler category view: related-category list uses raw slug words as anchors, has no sibling/parent fallback, and does…**

- *Files:* `frontend/src/app/x-crawler/category/[slug]/page.tsx`
- *Change:* Related categories are now resolved through the taxonomy. Added to the crawler route: getCachedCategories (unstable_cache on the SAME key/TTL/tag as the human route's loadCategoryListingSupport: ['shop-categories'], 3600s, tag 'categories') and a local resolveRelatedCategoryLinks() that mirrors the human resolveRelatedCategories — drops any slug absent from the taxonomy, names the anchor categoryAnchor(slug, designation_fr), and builds the href with canonicalCategoryPath(). If the taxonomy fetch fails (429/5xx), it falls back to the previous slug-derived anchors (via canonicalCategoryPath) so a transient error never deletes the links.
- *SEO reason:* Bot anchors were lowercase slug words ('gainers proteines', 'sante vitalite', 'pre workout') and the list linked slugs that 308 (/equipement-cardio-fitness → /cardio-fitness, /bandes-de-soutien-musculaire → back to itself). Anchor text is one of the few on-page levers for these head terms, and the bot/human anchors differed on the same URL.
- *Expected effect:* 'Catégories associées' on the bot render shows real designation_fr names (identical to the human LinkList) and no hrefs that redirect. Costs no extra origin call in steady state because the cache entry is shared with the human category route.
- *Risk:* low
- *Validation:* After deploy: curl -A Googlebot 'https://protein.tn/creatine?__crawler=1' | sed -n '/Catégories associées/,/<\/section>/p' — anchors should read the category names, not 'bcaa'/'pre workout'; and on /materiel-de-musculation no /equipement-cardio-fitness or /bandes-de-soutien-musculaire href should remain.

**category-metadata-h1-content#11 — Crawler 'Catégories associées' anchors are slug-derived ('bcaa', 'pre workout', 'gainers proteines') instead of the…**

- *Files:* `frontend/src/app/x-crawler/category/[slug]/page.tsx`
- *Change:* Covered by the same change as internal-linking#5 (taxonomy-resolved designation_fr anchors via categoryAnchor).
- *SEO reason:* Content/anchor parity between the two renders of one URL.
- *Expected effect:* Bot and human 'Catégories associées' emit identical name/url pairs.
- *Risk:* low
- *Validation:* Diff the related-block anchors between a Googlebot-UA and a Chrome-UA fetch of /creatine after deploy.

**brands-hierarchy-breadcrumbs#8 — Crawler 'Catégories associées' anchors are raw slugs ('sante vitalite', 'gainers proteines', 'pre workout') instead of…**

- *Files:* `frontend/src/app/x-crawler/category/[slug]/page.tsx`
- *Change:* Covered by the same change as internal-linking#5; the href now always passes through canonicalCategoryPath(), so an aliased slug (e.g. Intra-Workout) can no longer emit a link to a redirect.
- *SEO reason:* Raw slug anchors are a weaker relevance signal than the French category names, and bypassing canonicalCategoryPath risked linking redirects on 47 listing pages.
- *Expected effect:* No 3xx hrefs in the related block; anchors in French with accents.
- *Risk:* low
- *Validation:* After deploy: for each href in the related block, curl -o /dev/null -s -w '%{http_code}' — expect 200 only.

**images#1 — Crawler view of category/brand/shop pages ships zero product images**

- *Files:* `frontend/src/app/components/crawler/CrawlerCategoryView.tsx`
- *Change:* CrawlerCategoryView's product projection now carries cover (getStorageUrl), alt (buildProductAlt — which prefers the API's alt_cover, exactly what the human card uses), price, oldPrice and stockLabel. Each <li> renders a plain lazy <img width=300 height=300> (no next/image, no JS, matching CrawlerProductView) before the anchor. Applies to category, sub-category, brand and /shop bot renders, all of which use this component.
- *SEO reason:* The indexed HTML of the money categories contained zero product images (human: 27 on /creatine), so Google Images could associate nothing with the listing URL and the Product JSON-LD's image had no on-page counterpart.
- *Expected effect:* 12 <img> per category page (24 on /shop) in the bot HTML, each with the same alt string the human grid uses.
- *Risk:* low
- *Validation:* Live payload confirmed today: productsBySubCategoryId/creatine products carry cover + alt_cover ('CREATINE MONOHYDRATE OSTROVIT- 500GR — OstroVit — Tunisie'). After deploy: curl -A Googlebot 'https://protein.tn/creatine?__crawler=1' | grep -c '<img' — expect the page's product count, currently 0.

**crawler-parity-rendering#4 — Crawler category view emits 6 Product JSON-LD offers with prices but shows no visible price/stock on the page (docblock…**

- *Files:* `frontend/src/app/components/crawler/CrawlerCategoryView.tsx`, `frontend/src/app/x-crawler/category/[slug]/page.tsx`
- *Change:* Each product entry now shows '— {price}{ (au lieu de {oldPrice})} · {stockLabel}', using formatTnd/getPriceDisplay and getProductStockStatus (the same helpers the human card and CrawlerProductView use). formatTnd rather than the card's rounded price so the visible string equals the offers.price in the Product JSON-LD. Fixed the false docblock at x-crawler/category/[slug]/page.tsx (it claimed the view already rendered visible cards with prices) and recorded why it matters.
- *SEO reason:* Marked-up price/availability must be visible on the page for merchant-listing eligibility; the 6 Product/Offer nodes on these pages had no visible counterpart, and users saw prices while bots did not.
- *Expected effect:* 'DT' occurrences in the bot HTML rise from 2 (intro only) to one per product plus promos; the six JSON-LD prices each match a visible string (e.g. 149 DT, au lieu de 180 DT, En stock).
- *Risk:* low
- *Validation:* After deploy: curl -A Googlebot 'https://protein.tn/creatine?__crawler=1' | grep -o '149 DT' and confirm the first six Product nodes' offers.price each appear in the visible text.

**structured-data#1 — Category BreadcrumbList differs bot vs human: bot trail has no parent category and uses the H1 as the crumb; human…**

- *Files:* `frontend/src/app/x-crawler/category/[slug]/page.tsx`
- *Change:* Bot half implemented in the owned route: parent category resolved from sous_category.categorie, parent href via canonicalCategoryPath, last crumb = merged.breadcrumbLabel?.trim() || title. I kept the 'Boutique' crumb rather than dropping it (the skeptic on brands-hierarchy-breadcrumbs#1 suggested dropping it), because the VISIBLE human trail (ShopPageClient) and the PDP trail both include Boutique — so the outlier is the human JSON-LD, not the crawler. Making the two BreadcrumbLists byte-identical therefore needs one insert in the human route, which I do not own: see needs_other_files.
- *SEO reason:* One URL was emitting three different trails (bot JSON-LD, human JSON-LD, human visible), one of them bot-only — cloaking-shaped on a dynamically rendered page type — and none of the bot ones carried the parent hub.
- *Expected effect:* Bot trail becomes Accueil › Boutique › PERFORMANCE › Créatine, matching the human VISIBLE trail exactly. Full JSON-LD parity lands when the human route gains the Boutique item (needs_other_files SD1-human).
- *Risk:* low
- *Validation:* After deploy, fetch /creatine with Googlebot and with a Chrome UA and diff the BreadcrumbList item names; also compare against the visible nav[aria-label=breadcrumb] in the Chrome render.

### B4 · Crawler chrome & product view

_Review: `fixed` — 3 issue(s) found and fixed in review; 6 left for a human._

**crawler-parity-rendering#1 — Crawler views drop the whole site chrome: Googlebot sees 0 header/footer links on every category, brand, product and…**

- *Files:* `frontend/src/app/x-crawler/layout.tsx`
- *Change:* Added the missing route-group chrome for the whole crawler surface: new C:/mla/frontend/src/app/x-crawler/layout.tsx renders <ShopHeader />{children}<ShopFooter /> — effect-identical to app/(shop)/layout.tsx:19-27. This one file covers every x-crawler route (category, product, shop), so all four URL families middleware rewrites for bot UAs now carry the same header mega-menu and footer the human page carries. No middleware, next.config or view-file change; <Providers navigation/navCategories/cmsPages> is already mounted in app/layout.tsx so the header and footer SSR their anchors here exactly as under (shop). The layout carries a docblock with the measured before-numbers and the parity…
- *SEO reason:* The only visitor whose link graph decides rankings was reading the money pages on ~40% of the real internal link graph: /creatine 50 bot hrefs vs 68 human, PDP 23 vs 60, /shop 36 vs 57, with the bot-only gap being exactly the chrome (/proteine-tunisie, /creatine-monohydrate-tunisie, /blog, /brands, /packs, /prise-de-masse, /perte-de-poids, /performance, /proteine-sousse, /contact, /qui-sommes-nous, policy pages). This is the 'crawler link graph' half of the verified 22/09 diagnosis, and fewer…
- *Expected effect:* Every category, brand, PDP and /shop URL Googlebot fetches gains ~18-37 site-wide internal links, including the hub pages and the blog; internal PageRank into /creatine, /whey-proteine, /proteines, /mass-gainers, /pre-workout is computed on the full graph instead of a 40% projection. No title, H1, canonical or robots directive is touched, so nothing in GSC-2026-09-22.md is at risk and the 22/09…
- *Risk:* Low. Two client components are added to a route set that previously shipped no JS — they are the same two the human page ships, their anchors are server-rendered, and their nav data is already fetched once in the root layout, so no extra request and no ISR impact (the crawler routes keep…
- *Validation:* Pre-deploy: `git diff --stat` shows the new file only; `ls C:/mla/frontend/src/app/x-crawler/layout.tsx`. Post-deploy: `curl -s -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' https://protein.tn/creatine | grep -c '<footer'` must be >=1 (was 0), and `... | grep -o 'href="/[a-z0-9-]*"' | sort -u | wc -l` should rise from ~50 to ~68; same on a PDP and on /shop. Full check: `node…

**internal-linking#2 — PDP crawler view builds the 'Marque :' href with a naive slug: 46 of 579 brands link to a 404**

- *Files:* `frontend/src/app/components/crawler/CrawlerProductView.tsx`
- *Change:* CrawlerProductView.tsx: added `import { brandNameToSlug } from '@/util/brandSlug';` and replaced the inline `brandName.toLowerCase().replace(/\s+/g, '-')` at the 'Marque :' link (line ~159) with `brandNameToSlug(brandName)`. Exactly the skeptic's one-line fix; no other file.
- *SEO reason:* The crawler view was the only brand-href producer not using the shared slug helper, so every brand name containing an apostrophe, '.', '&', '/' or '+' emitted an internal 404 on the surface Google actually reads (~46 brands, ~1,225 indexable PDPs). Verified live 22/09: the Doctor's Best PDP served href="/doctor's-best" (404) while its own JSON-LD brand @id was /doctor-s-best (200).
- *Expected effect:* Those PDPs stop spending crawl budget on a dead link and start passing their PDP->brand link equity; 'Not found (404)' rows attributed to PDPs should drain. The href becomes byte-identical to the human PDP (ProductDetailClient.tsx:962), the sitemap and the JSON-LD, and inherits the api -> marque-api override for free.
- *Risk:* Low. brandNameToSlug is dependency-free and already used by the [slug] resolver, sitemap, /brands and the human PDP; output for clean brand names (Optimum Nutrition -> optimum-nutrition) is unchanged.
- *Validation:* `grep -n 'brandNameToSlug' C:/mla/frontend/src/app/components/crawler/CrawlerProductView.tsx` (import + call, and no remaining `toLowerCase().replace`). Post-deploy: `curl -s -A Googlebot https://protein.tn/magnesium/doctors-best-high-absorption-magnesium-120-comprimes | grep -o 'Marque : <a[^>]*>'` must show href="/doctor-s-best", and `curl -o /dev/null -w '%{http_code}' -A Googlebot https://protein.tn/doctor-s-best` -> 200.

**product-pages#3 — Crawler PDP brand link is built with a naive slug (lowercase + spaces→hyphen) and 404s for 46 brands / 1,225 products…**

- *Files:* `frontend/src/app/components/crawler/CrawlerProductView.tsx`
- *Change:* Same change as internal-linking#2 (the two findings are the same defect at CrawlerProductView.tsx:146 with the same corrected fix). Implemented once.
- *SEO reason:* Duplicate of internal-linking#2 — the crawler brand href diverged from util/brandSlug on ~1,225 PDPs.
- *Expected effect:* See internal-linking#2.
- *Risk:* Low — one line, shared helper.
- *Validation:* See internal-linking#2.

**product-pages#2 — Crawler PDP (the only view Googlebot gets) carries 18 internal hrefs vs 49 on the human PDP: no header/footer nav and…**

- *Files:* `frontend/src/app/x-crawler/product/[...slug]/page.tsx`, `frontend/src/app/components/crawler/CrawlerProductView.tsx`, `frontend/src/app/x-crawler/layout.tsx`
- *Change:* Two parts. (a) Chrome/footer parity is delivered by the new x-crawler/layout.tsx (crawler-parity-rendering#1) instead of the duplicated footer-link block the finding proposed — the real ShopFooter now renders, which is strictly better parity and needs no edit to FooterClient.tsx (not owned). (b) Cross-sell parity: x-crawler/product/[...slug]/page.tsx now imports getComplementProducts from '@/services/productComplements' and awaits it in the same Promise.all shape the human route uses at (shop)/[slug]/[productSlug]/page.tsx:279-284, passing complementProducts to the view. CrawlerProductView gained an optional `complementProducts?: Product[]` prop (default []) and renders, just before…
- *SEO reason:* The crawler PDP (~10.6k URLs, the largest crawl surface) was a dead end: every internal link pointed back at its own category, its brand or a sibling. The complement shelves are the only PDP-level links to OTHER money categories, and they already exist for humans — serving them to the bot too closes a parity gap rather than inventing links.
- *Expected effect:* In-stock PDPs gain 2-3 cross-shelf PDP anchors (a shaker, a creatine, a whey on a gainer page) plus, via the layout, the whole header/footer hub set — bot unique internal hrefs on the measured Serious Mass PDP should go from ~23 toward the human ~60. Out-of-stock/catalogue products (10,535 of 10,669) get [] immediately and render nothing, exactly as on the human route.
- *Risk:* Low. getComplementProducts returns [] unless the product is itself in stock, is wrapped in .catch(() => []), and its shelf queries are ~3 KB with `revalidate: 3600` cached fetches — no dynamic API, so the route keeps revalidate=300 + empty generateStaticParams (ISR intact). The returned list…
- *Validation:* `git diff -- 'C:/mla/frontend/src/app/x-crawler/product/[...slug]/page.tsx'` shows the Promise.all and the new prop. Post-deploy on an IN-STOCK PDP: `curl -s -A Googlebot https://protein.tn/mass-gainers/serious-mass-5-45-kg-optimum-nutrition | grep -A6 'Complétez votre commande'` must list 2-3 product anchors, and the same three hrefs must appear in the Chrome-UA fetch of the same URL (parity). Unique-href count: `curl -s -A Googlebot <url> |…

**images#4 — Crawler PDP hard-codes 640x640 on the cover and repeats the cover inside the gallery**

- *Files:* `frontend/src/app/components/crawler/CrawlerProductView.tsx`
- *Change:* CrawlerProductView.tsx line ~118: `const sourceGallery = productSourceGallery(product).filter((url) => getStorageUrl(url) !== cover);` — the skeptic's one-line version. The `photo {i+1}/{n}` alt renumbers itself because it indexes the filtered array. Width/height left alone, per the skeptic: cover_media is null for every affected (Cloudinary) product, the iHerb /l/ variant really is square, and the bot-only render never reaches CrUX.
- *SEO reason:* On imported products gallery[0] IS the cover, so the canonical PDP emitted the same image file twice with two competing alt strings ('… — NOW Foods — Tunisie' as hero, '… — photo 1/7' in the grid) on the only render Google reads. The human page already dedups the same list with a Set (ProductDetailClient.tsx:462-468).
- *Expected effect:* One alt string per image file for Google Images on ~6,100 imported PDPs; the gallery drops to n-1 photos and renumbers cleanly. No visible change for humans (this view is bot-only).
- *Risk:* Low. getStorageUrl passes absolute https URLs through unchanged, so the comparison matches the Cloudinary cover exactly; when product.cover is empty, `cover` is '' and nothing is filtered. Legacy products carry no source gallery and are unaffected.
- *Validation:* Post-deploy: `curl -s -A Googlebot 'https://protein.tn/whey-isolate/now-foods-sports-whey-protein-isolate-sans-arome-544-g' | grep -o 'now02172/l/53.jpg' | wc -l` must be 1 (was 2), and the gallery alts must read 'photo 1/6' … 'photo 6/6'.

### B5 · Category content files

_Review: `fixed` — 1 issue(s) found and fixed in review; 6 left for a human._

**images#2 — Category og:image is the favicon on 42/50 categories, missing on 6, and twitter:image accepts page URLs**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* Finished the half-applied og:image sweep. (a) C:/mla/frontend/content/categories/l-carnitine.json was the ONE content file the previous agent's sweep missed — it had no `ogImage` key at all (the other 51 had been moved from the 512px favicon or "" to https://protein.tn/og-banner.jpg), and it is now a live own-file page because this batch deleted its alias. Added "ogImage": "https://protein.tn/og-banner.jpg" as its first key, preserving the file's CRLF line endings. (b) Added the missing prebuild guard to C:/mla/frontend/scripts/check-category-seo-content.ts: ogImage, when present, must be an https URL ending in .jpg/.jpeg/.png/.webp/.avif and must not contain '/favicon-' — so neither a…
- *SEO reason:* The sweep's whole point was that the JSON must stop asserting a 512px favicon as 1200x630 artwork; leaving one file with no value at all reopens the same hole on a page that just gained its own identity, and an unguarded sweep is one paste away from regressing — the other four defects this batch fixed all got a guard, this one had none.
- *Expected effect:* /l-carnitine unfurls with the 1200x630 og-banner on WhatsApp/Facebook/X instead of nothing; all 52 content files now declare a real social image, and any future favicon or page-URL value fails prebuild with a named file and a suggested replacement.
- *Validation:* cd C:/mla/frontend && node --experimental-strip-types --no-warnings scripts/check-category-seo-content.ts — prints 'Category SEO content file checks passed (52 files).' (I ran it: passes). After deploy: curl -A Googlebot https://protein.tn/l-carnitine | grep og:image -> https://protein.tn/og-banner.jpg. To see the guard bite, temporarily set any file's ogImage to the old favicon URL and re-run the script.

**category-metadata-h1-content#1 — Content-file aliases now fan one title/H1/description out to 4 fat-burner URLs and 3 amino URLs (regression since the…**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* categorySeoContent.ts: new CONTENT_SERP_OWNER map ({'mass-gainer':'mass-gainers','whey-protein':'whey-proteine'}) + serpOwnerSlug(), and getCategorySeoContent now computes `const ownsSerpFields = serpOwnerSlug(contentSlug) === slug.trim().toLowerCase()` and gates h1/metaTitle/metaDescription on it while intro/howTo/faqs/related/bestProducts/ogImage stay shared. The `'l-carnitine': 'bruleurs-de-graisse'` line is deleted (replaced by a comment explaining the zero product overlap) and l-carnitine.json's `_note` is removed. Guard added in check-category-seo-content.ts (duplicate metaTitle / duplicate h1 across files). This is the skeptic's corrected_fix exactly — no interface change, no edit to…
- *SEO reason:* Seven indexable listing URLs now carry two identical <title>/H1/description sets. /perte-de-poids is the PARENT category (it renders a Sous-catégories block) but is titled after its own child 'Brûleur de Graisse'; /l-carnitine (85 products, zero overlap with fat burners per the file's own _note) is titled 'Brûleur de Graisse'; /eaa and /acides-amines are titled 'BCAA'. Google picks one URL per duplicate set and drops the rest, so the pages that were earning clicks on their own terms lose them.…

**cannibalization-keyword-map#10 — BCAA: /bcaa, /acides-amines and /eaa are three self-canonical, indexable, sitemapped URLs rendering the identical BCAA…**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* categorySeoContent.ts: `'acides-amines': 'bcaa'` and `'eaa': 'bcaa'` deleted, with a comment recording why (redirects.js deliberately removed the /acides-amines 308). Two new untracked files written: content/categories/acides-amines.json (h1 'Acides aminés en Tunisie : EAA, BCAA, glutamine et arginine', 376-word intro, 5 FAQs, hub links down to /eaa /bcaa /glutamine /l-arginine /citrulline) and content/categories/eaa.json (h1 'EAA en Tunisie : les neuf acides aminés essentiels', 362-word intro, 5 FAQs, EAA-vs-BCAA positioning). Both carry no invented price and only live internal hrefs. Blog injector step (page.tsx:333) is already `'acides-amines': ['acides aminés', ...]` — done by the agent…
- *SEO reason:* Three URLs with byte-identical title/H1/intro on one commercial intent is duplicate content with no canonical — Google picks one arbitrarily and the chosen one changes. GSC (window ends 2026-07-29): 'bcaa tunisie' 2/29/19.31; /bcaa 2/50/19.4; /acides-amines and /eaa absent from Pages.csv top rows. The redirects.js rationale (keep /acides-amines distinct) is defeated by the content alias, and the strongest in-content anchor ('BCAA') is wired to the non-BCAA page. 'eaa ostrovit' 1/10/5.4 shows…

**category-metadata-h1-content#5 — /gainers-proteines title and H1 both target 'Prise de Masse', cannibalising /prise-de-masse and /mass-gainers**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* gainers-proteines.json: metaTitle 'Gainers Protéinés Tunisie 🇹🇳 Prise de Masse dès 120 DT | Protein.tn' -> 'Gainer Protéiné Tunisie : Lean Gainer dès 120 DT | Protein.tn' (60 chars), h1 -> 'Gainers protéinés en Tunisie : lean gainer et gainer riche en protéines'. 'Prise de Masse' is gone from both; description untouched. GSC-2026-09-22.md confirms /gainers-proteines has 0 clicks, so the retitle costs nothing.
- *SEO reason:* Three listing URLs now compete for the 'prise de masse' / gainer cluster, the exact overlap BACKLOG.md:196-198 ('Category ↔ sub-category keyword split') asks to remove. Search Console (window ends 2026-07-29): /gainers-proteines 0 clicks / 28 impr / pos 33.75; /prise-de-masse 1 / 134 / 48.9; /mass-gainers 3 / 186 / 43.18; 'mass gainer tunisie' 149 impr pos 47.4, 'mass gainer prix tunisie' 53 impr pos 41.49, 0 clicks. Splitting the cluster over three weak pages keeps all three on page 4-5.

**brands-hierarchy-breadcrumbs#6 — /mass-gainers and /gainers-proteines split one product family (same brand, different pack size) across two…**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* Tier A of the skeptic's fix is in: the gainers-proteines.json h1 is suffix-free and intent-distinct (see #5). Tier B (reassigning 14 products in Filament, the /gainers-proteines -> /mass-gainers redirect row, repointing brandSeoConfig/blogSeoConfig/FooterClient/structuredData) is owner-gated and reverses the documented decision in redirects.js:294-297 — correctly left alone.
- *SEO reason:* Two commercial pages answer 'mass gainer / gainer tunisie' with half a catalogue each and split the brand-page and blog inbound links between them. GSC (window ends 2026-07-29): /gainers-proteines 33.75 (28 impr), /mass-gainers 43.18 (186 impr), /prise-de-masse 48.9 (134 impr), query `mass gainer tunisie` 47.4 on 149 impressions — none of the three in the top 30 while single PDPs rank 4–12. The H1 with '| Protein.tn' is a CMS title pasted into the h1 field.

**category-metadata-h1-content#6 — Stripping the 🇹🇳 pictograph leaves 18 live titles without a separator ('BCAA Tunisie Acides Aminés dès 70 DT')**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* Content sweep: all 31 '🇹🇳' occurrences replaced by a written ' : ' separator in metaTitle/h1 across the JSON files (e.g. bcaa.json 'BCAA Tunisie : Acides Aminés dès 70 DT | Protein.tn'). Code net: resolveCategorySeo.ts stripPictographs rewritten so a pictograph run BETWEEN two words becomes ' | ', one adjacent to a separator or at either end is just removed. I re-ran the new regex over 7 cases: 'BCAA Tunisie 🇹🇳 Acides…' -> 'BCAA Tunisie | Acides…', '🇹🇳 Lead' -> 'Lead', 'X | 🇹🇳 Y' -> 'X | Y', 'Y 🇹🇳 : Z' -> 'Y : Z'. Prebuild now rejects any new pictograph.
- *SEO reason:* 18 live category titles now read as a run-on keyword string (looks like stuffing, hurts CTR): bcaa/eaa/acides-amines 'BCAA Tunisie Acides Aminés dès 70 DT | Protein.tn', glutamine 'Glutamine Tunisie L-Glutamine dès 60 DT', zma 'ZMA Tunisie Zinc Magnésium B6 dès 40 DT', gainers-proteines 'Gainers Protéinés Tunisie Prise de Masse dès 120 DT', antioxydants 'Antioxydants en Tunisie Achetez au Meilleur Prix', articulations, ashwagandha, beaute-cheveux, beta-alanine, boosters-hormonaux, citrulline,…

**category-metadata-h1-content#7 — 14 live H1s carry the '| Protein.tn' brand suffix and a title-shaped 'X Tunisie – Y' pattern**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* All 25 JSON h1 values lost their ' | Protein.tn' suffix (ashwagandha, beta-alanine, boosters-hormonaux, citrulline, gainers-proteines, glucides, hmb, materiel-de-musculation, post-workout, proteine-de-boeuf, proteines-completes, proteines-en-poudre, proteines-vegetales, tribulus, whey-hydrolysee, zma, intra-workout, ceinture-de-musculation, bandes-de-soutien-musculaire, shakers, t-shirts, gants, equipement-cardio-fitness, equipements-et-accessoires, complements-*). Code net: stripBrandSuffix() applied to h1 only (never metaTitle) in mergeCategorySeoForSlug, plus a prebuild assertion. Verified no h1 consumer can render empty: page.tsx:655/667/703/849/854/886 and x-crawler:267 all fall back…
- *SEO reason:* The brand token dilutes the H1's topical signal and repeats what the <title> already says; the H1 is also used as the CollectionPage name, the crawler breadcrumb's last crumb (CAT-10) and the ItemList name, so 'Protein.tn' leaks into structured data names. Wasted heading weight on 14 secondary category pages.

**category-metadata-h1-content#8 — Five JSON descriptions exceed 155 chars, so truncateAtWord backs off to the previous sentence and the live snippet…**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* All five over-length descriptions rewritten under 155 chars with the delivery/CTA sentence kept: pre-workout 160->124 ('…Stock réel, livraison dans les 24 gouvernorats.'), bruleurs-de-graisse 165->139, bcaa 158->131, glutamine 163->136, articulations 156->140. Prebuild now asserts 70 <= metaDescription.length <= 155.
- *SEO reason:* The snippet gives up 27–45 chars of the ~155 Google shows, and the sentence lost is the one with the local delivery / cash-on-delivery argument that differentiates protein.tn from global results. Low-CTR pages already: /pre-workout 505 impr, 1.58% CTR, pos 10.83; /bcaa 4% CTR (GSC window ends 2026-07-29). Note: /pre-workout is under the 22/09 title/H1 freeze; the description is not part of the freeze.

**category-metadata-h1-content#9 — Intra-Workout.json never loads on the Linux VPS (filename case ≠ lowercased slug) and 11 more content files target…**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* git status shows `RM frontend/content/categories/Intra-Workout.json -> frontend/content/categories/intra-workout.json` (the case-only rename is correctly staged, and it is the ONLY staged path). resolveContentSlug now does `slug.trim().toLowerCase()`. Prebuild asserts every content filename is lowercase, and that every CONTENT_SLUG_ALIASES target has a file on disk. The cardio-fitness / accessoires aliases were correctly NOT added (owner must confirm the copy matches the live assortment).
- *SEO reason:* Reviewed title/H1/description/guide/FAQ copy exists for 12 categories and renders on none of them; /intra-workout ships a 37-char title with no value proposition, and /cardio-fitness and /accessoires render ALL-CAPS CMS intros (CAT-13) while a written guide sits unread in the repo. The silent ENOENT branch is the same failure class the file's own comment (:124-135) warns about.

**brands-hierarchy-breadcrumbs#12 — content/categories/Intra-Workout.json is unreachable on the case-sensitive production filesystem; l-carnitine.json is…**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* Same two fixes as #9: the rename, and the l-carnitine alias deletion that activates l-carnitine.json's 6,879-char buying guide. Confirmed live today with a Googlebot UA that /l-carnitine still serves the fat-burner title/H1/breadcrumb name ('Brûleurs de Graisse Tunisie : Thermogéniques & L-Carnitine'), i.e. the defect is real and this is the fix.
- *SEO reason:* Curated category content that exists in the repo is not served; /intra-workout renders the API-only shell and only 3 related links.

**category-metadata-h1-content#12 — CMS long-bottom stubs and repeated 'Livraison … Tunisie' sections pass the dedup guard and are rendered to Googlebot**

- *Files:* `frontend/content/categories/l-carnitine.json`, `frontend/scripts/check-category-seo-content.ts`, `frontend/src/util/categorySeoContent.ts`, `frontend/src/util/resolveCategorySeo.ts`, `frontend/content/categories/acides-amines.json`, `frontend/content/categories/eaa.json`, `frontend/content/categories/intra-workout.json`, `frontend/content/categories/gainers-proteines.json`, `frontend/content/categories/bcaa.json`, `frontend/content/categories/bruleurs-de-graisse.json`, `frontend/content/categories/glutamine.json`, `frontend/content/categories/pre-workout.json`, `frontend/content/categories/articulations.json`, `frontend/content/categories/ (44 further *.json swept for the 🇹🇳 separator, the '| Protein.tn' h1 suffix and the favicon ogImage)`
- *Change:* resolveCategorySeo.ts: new textWordCount() helper (used, not dangling) and longBottomHtml is now dropped when textWordCount < 40 OR when it duplicates `[intro, howToChooseBody].join('\n')` rather than the intro alone. That kills both the /whey-proteine 10-word stub and the second 'Livraison … Tunisie' H2 on the six money pages.
- *SEO reason:* An empty heading section and a second delivery block are thin/redundant content on the money pages; the second 'Livraison' H2 also dilutes the H2 outline Google uses to understand the page.

### B6 · Blog cluster & internal links

_Review: `clean` — 1 issue(s) found and fixed in review; 7 left for a human._

**blog-pages#3 — Gainer cluster equity is split across three category URLs (/prise-de-masse, /gainers-proteines, /mass-gainers) and the…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* Added the two missing Serious Mass entries to frontend/src/config/blogSeoConfig.ts ('serious-mass-le-gainer-ultime-pour-une-prise-de-masse-rapide' and 'serious-mass-d-optimum-nutrition-le-gainer-ideal-pour-une-prise-de-masse-rapide'), each with an openingLinkHtml whose first anchors are the two Serious Mass PDPs, plus internalLinks to /mass-gainers and /optimum-nutrition. No headline on either.
- *SEO reason:* GSC 22/09 shows `serious mass tunisie` (3 clicks / 89 impr) held by the homepage and these two articles, while the PDP that can sell the tub holds 1 impression. Both bodies linked /prise-de-masse, /proteines and /vitamines and never linked the product they are named after. openingLinkHtml is prepended to the body, so the PDP becomes the first anchor on the page — the anchor Google weighs.
- *Expected effect:* Each Serious Mass article now emits a PDP link and a /mass-gainers link in the server HTML; gainer equity stops pooling on /prise-de-masse. Titles/H1s unchanged, so the 4-week read is attributable to the link change alone.
- *Validation:* curl -A Googlebot https://protein.tn/blog/serious-mass-le-gainer-ultime-pour-une-prise-de-masse-rapide and grep for href="/mass-gainers/serious-mass-5-45-kg-optimum-nutrition" — it must appear before any other in-body anchor. Both PDP URLs and /optimum-nutrition were confirmed 200 with a Googlebot UA on 22/09.

**blog-pages#4 — Top commercial-looking articles still carry the category head term as title/H1 and hand the pillar only a generic first…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* Finished the per-article repositioning set. Added 'whey-protein-en-tunisie' (metaDescription + openingLinkHtml with the exact anchor 'whey protein en Tunisie' → /whey-proteine, NO headline) and 'whey-proteine-pas-cher-tunisie' (metaDescription + openingLinkHtml, NO headline); added informational headlines + metaDescriptions to the seven zero-click whey posts; added the Serious Mass and mass-gainer-prix-tunisie entries. The entries the earlier agent already wrote (creatine-tunisie-guide-complet…, les-meilleures-marques…, quelle-est-la-meilleure-creatine-monohydrate…, creatine-prix-en-tunisie…, the Arabic كرياتين entry) were left exactly as they were.
- *SEO reason:* These articles carried the category head term as their <title>/<h1> while handing the pillar only a bare auto-linked word. The skeptic's split was: additive first, titles second. I tightened it further against C:/mla/protein.tn/GSC-2026-09-22.md — whey-proteine-pas-cher-tunisie (13 clicks, 5 of them on `whey protein tunisie` at pos 13.9) and whey-protein-en-tunisie (10 clicks) are the site's two best whey URLs in the fresh 28-day window, so the hard rule 'any URL with clicks must never be…
- *Expected effect:* Seven zero-click whey URLs stop declaring themselves shop pages for the whey head term; the two that earn clicks gain an exact-match first anchor to /whey-proteine without any title churn. /whey-proteine (currently 4th on its own term at pos 34.4) gets the consolidated anchor signal.
- *Validation:* Every headline keeps the word required by ARTICLE_TOPIC_PATTERNS (whey / créatine / gainer), so topicAlignedArticleHeadline will not fall back to the CMS H1 — checked one by one against the live H1s fetched with a Googlebot UA. After deploy, curl each slug and confirm the new <title> and that /blog/whey-proteine-pas-cher-tunisie and /blog/whey-protein-en-tunisie still show their original titles.

**cannibalization-keyword-map#5 — Serious Mass: two near-identical blog posts earn 'serious mass tunisie' and link neither the 5.45 kg nor the 2.7 kg…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* Same two Serious Mass entries as above, written in the skeptic's shape: openingLinkHtml with both PDP formats, internalLinks to /mass-gainers and /optimum-nutrition, faqs: [], lang 'fr', dateModified '2026-09-22', and deliberately no headline.
- *SEO reason:* The skeptic's corrected_fix is explicit that the H1 is what earns the query today and that moving links and title in the same week makes the measurement unreadable.
- *Expected effect:* The 5.45 kg and 2.7 kg PDPs get their first blog inbound links; /mass-gainers gets two more in-body links from posts that rank for the product name.
- *Validation:* As above. redirects.js was deliberately NOT touched — the 301 consolidation of the 6-click twin is a post-measurement decision and redirects.js is not an owned file.

**cannibalization-keyword-map#2 — Whey: 9 'whey/protéine whey tunisie' blog posts titled as shop pages, best whey URL is a blog at 11.15 vs…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* Added blogSeoConfig entries for the whey cluster: proteine-whey-tunisie-guide-complet-2025, whey-proteine-prix-en-tunisie-comparatif-et-meilleurs-offres, whey-proteine-tunisie-guide-ultime-pour-choisir-la-meilleure-proteine, proteine-whey-tunisie-tout-ce-que-vous-devez-savoir-avant-d-acheter, proteine-whey-tunisie-le-guide-ultime-pour-musculation-et-recuperation, proteine-whey-tunisie-le-guide-ultime-pour-choisir-la-proteine-qui-vous-convient-protein-tn, meilleure-proteine-whey-2026 (headline + metaDescription + varied internalLinks, no openingLinkHtml), plus the two click-earning posts additively. The page.tsx half of this finding (removing 'whey isolate' from /whey-proteine and adding a…
- *SEO reason:* Nine posts titled as shop pages for `whey protein tunisie` left /whey-proteine as the 4th-best URL on its own term. Per the skeptic I skipped openingLinkHtml on the seven: the in-content linker already gives each a first 'whey' anchor to /whey-proteine, and a seventh identical paragraph across one cluster is the generated-looking pattern this config exists to avoid. Anchors are varied for the same reason — /whey-proteine was receiving the identical phrase 26 times across the config before this…
- *Expected effect:* One URL per whey sub-intent; /whey-isolate now wins the first isolate mention (the 26-char 'isolat de protéine de whey' outweighs /whey-proteine's 22-char 'protéine de lactosérum' in compileTargets).
- *Validation:* I ran the shipped injector over four live article bodies with the new allowlist + synonym map: whey-protein-en-tunisie now emits /whey-proteine → /proteines → /perte-de-poids → /acides-amines → /whey-isolate → /creatine (previously /sante-vitalite and /sommeil-stress took the first two slots). scripts/check-internal-links.mjs passes, including 'the more specific destination wins the sentence'.

**cannibalization-keyword-map#1 — Creatine: 5 URLs on 'prix/meilleure créatine tunisie', static /creatine-monohydrate-tunisie still carries the money…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* Implemented the owned part (step 3 only): added blogSeoConfig entries with informational headlines + metaDescriptions for the three remaining creatine posts whose CMS <title> IS the category head term — creatine-prix-tunisie-guide-complet-des-meilleurs-produits-en-2025, creatine-prix-tunisie-trouvez-la-meilleure-offre-pour-maximiser-vos-gains, creatine-tunisie-la-meilleure-qualite-a-prix-imbattable-livraison-rapide-and-gratuite-sur-protein-tn.
- *SEO reason:* All three carry 'Créatine Prix Tunisie' / 'Créatine Tunisie' in their <title> and all three earned 0 clicks in the 28 days to 19/09/2026, so repositioning them removes three claimants from the intent /creatine is titled for at zero measured cost. prix-de-la-creatine-en-tunisie was left untouched: it is a real top-10 with clicks and is the running BACKLOG P0 test.
- *Expected effect:* Three fewer URLs competing with /creatine on `creatine prix tunisie` / `creatine tunisie`; each keeps its URL and its clicks (there are none to lose).
- *Validation:* All three slugs were confirmed 200 with a Googlebot UA on 22/09 and their live titles read back before writing the replacements; each new headline contains 'créatine' so the alignment guard passes.

**cannibalization-keyword-map#12 — Compléments alimentaires: no commercial page owns the phrase — /complements-alimentaires 301s to /proteines, its…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* Added four additive blogSeoConfig entries for the compléments cluster — complements-alimentaires-tunisie, complement-alimentaire-en-tunisie-guide-complet-pour-une-meilleure-sante, les-10-meilleurs-complements-alimentaires-pour-sportifs-en-tunisie, top-5-des-complements-alimentaires-essentiels-pour-la-musculation-en-tunisie — each with an openingLinkHtml anchored 'compléments alimentaires en Tunisie' → /shop and internalLinks to /shop and /proteines. No headline on any of them.
- *SEO reason:* No commercial page owns the phrase: /complements-alimentaires 301s to /proteines, so /shop is the only page titled for it, and these four articles compete with each other and with /shop. The skeptic is explicit that which article holds the page-1 slot needs an owner GSC query→Pages read before any retitle, so this pass is links only.
- *Expected effect:* Each of the four articles gains a first anchor to the hub that can actually sell, which none of them had. No title or robots change, so nothing can regress.
- *Validation:* /shop verified 200, index,follow, self-canonical https://protein.tn/shop with a Googlebot UA on 22/09. All four slugs verified live (two in the fresh 28d Pages.csv, two fetched directly, both 200).

**cannibalization-keyword-map#4 — Mass gainer: the in-content injector and the brand pages route 'mass gainer' anchors to /prise-de-masse and…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* Completed the last owned piece of this finding: added the missing 'mass-gainer-prix-tunisie' entry (headline 'Prix d’un mass gainer : lire le coût au kilo et par portion', metaDescription, openingLinkHtml → /mass-gainers, internalLinks to /mass-gainers and /proteines).
- *SEO reason:* This post's CMS title is literally the category head term 'Mass Gainer Prix Tunisie'. It earned 0 clicks at position 42.9 in the 28 days to 19/09/2026, so it is the cheapest of the five gainer claimants to reposition. Its opening sentence deliberately differs from the sibling guide post's so the cluster does not read as boilerplate.
- *Expected effect:* Two URLs stop claiming the same phrase; /mass-gainers picks up another exact-intent inbound anchor.
- *Validation:* Slug confirmed 200 with a Googlebot UA; the headline keeps 'gainer' so topicAlignedArticleHeadline will not revert to the CMS H1. Simulated injection over the live body of the sibling post shows its first 'Mass Gainer' anchor now resolves to /mass-gainers, not /prise-de-masse.

**index-noindex-pagination-filters#2 — /blog self-canonicalises to ANY unknown query parameter and stays index,follow — unbounded indexable duplicates of the…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* frontend/src/app/(shop)/blog/page.tsx — L25 is now `const search = pageNum > 1 ? \`page=${pageNum}\` : '';` with the allow-list rationale comment, and the whole `stripTrackingFromSearch` helper (old L60-69) is deleted. `grep -c stripTrackingFromSearch` = 0, so no dangling reference. getBlogPrevNext (L73-85) reads the same `search` string, so rel=prev/next collapse with it: ?x=1 and ?page=1 now both canonicalise to /blog, ?page=2 stays self-canonical with prev=/blog.
- *SEO reason:* Any inbound link with a parameter not in the blocklist (igshid, yclid, twclid, ttclid, _ga, _hsenc, wbraid, gbraid, dclid, `?category=`, `?tag=`, `?q=`…) creates a new URL that declares itself canonical and indexable while rendering the same /blog content — the classic 'Duplicate without user-selected canonical' / crawl-waste trap, on the hub that links every article. The category/product/shop routes strip params correctly (verified: /creatine/creatine-monohydrate-300g-ostrovit?utm_source=x…

**blog-pages#8 — First-mention injector links generic single words ('performances', 'santé', 'énergie', 'stress', 'digestion',…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* frontend/src/util/internalLinks.ts — `targetsFromTaxonomy` gained `options: { allowSlugs?: readonly string[] }`, a `push` guard `if (allow && !allow.has(slug)) return;`, and the '&'-split halves are now filtered to `s.length >= 8`. frontend/src/app/(shop)/blog/[slug]/page.tsx — new `LINKABLE_CATEGORY_SLUGS` const (32 slugs) passed as `{ allowSlugs: LINKABLE_CATEGORY_SLUGS }`. Verified: all 32 slugs exist in the live taxonomy (56 slugs at admin.protein.tn/api/categories), so none is a silent no-op; omitting the option still filters nothing, which is what scripts/check-internal-links.mjs relies on (it passes, 56 targets).
- *SEO reason:* Four to five of the six slots per article go to lifestyle hubs on words that are not about the destination ('énergie' in a creatine sentence → a carbohydrate category), which reads as generated linking (the very pattern internalLinks.ts:28-36 says it avoids) and leaves the money pillars with the bare-word anchor or no in-body link at all (prix-de-la-creatine has no /whey-proteine link in prose despite mentioning whey).

**internal-linking#7 — Blog in-content linker routes 'mass gainer' to /prise-de-masse and the first 'BCAA' mention to /acides-amines, not to…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* frontend/src/app/(shop)/blog/[slug]/page.tsx L329-333 — 'gainer'/'mass gainer'/'weight gainer'/'ماس جينر' moved to a new `'mass-gainers'` key, `'prise-de-masse'` keeps only the two Arabic phrases, and 'bcaa' was removed from `'acides-amines'`. FooterClient.tsx was correctly left alone (skeptic's instruction, and it is not an owned file).
- *SEO reason:* 224 articles are the site's authority pool (blog = 38% of impressions per internalLinks.ts:13); the strongest in-body links for gainer and BCAA intent are wired to the objective hub and the parent instead of the pages Google already prefers (/mass-gainers 186 impressions vs /prise-de-masse 134; GSC window ends 2026-07-29), sustaining the 5-URL gainer cannibalisation documented in docs/seo-opportunity-map.md:203.

**blog-pages#9 — blogSeoConfig drift: 'meilleures-marques-de-creatine-en-tunisie' was retitled in the CMS to a women's-creatine article…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* frontend/src/config/blogSeoConfig.ts — key renamed to 'protein-the-essential-guide-to-its-benefits-sources-and-role-in-health' and to 'whey-protein-et-entrainement-strategies-pour-des-gains-musculaires-optimaux-protein-tn' (both confirmed live slugs in protein.tn/2026-09-22-28d/Pages.csv and protein.tn/Pages.csv); the 5 dead keys quest-ce-que-la-whey, whey-ou-isolate, comment-prendre-creatine, bcaa-utile-ou-pas, creatine-musculation-avis are deleted (which also removes the internalLink to /blog/comment-prendre-creatine, a 410); 'meilleures-marques-de-creatine-en-tunisie' rewritten for the women's-creatine topic the CMS retitled it to, with a comment explaining the drift.
- *SEO reason:* Off-topic FAQPage schema on a page about women and creatine is a structured-data/content mismatch; the dead keys mean intended overlays (headline + opening pillar link for the whey-training article) silently never render.

**internal-linking#8 — BlogSeoBlock renders duplicate 'Lire aussi' chips: 13 articles emit the same anchor+href 2-4 times**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* frontend/src/app/(shop)/blog/BlogSeoBlock.tsx — `entry.internalLinks` is deduped by href (first occurrence wins) before `hasLinks`/render. frontend/src/config/blogSeoConfig.ts — the duplicate rows were replaced with varied natural anchors ('comparer les créatines en stock', 'prix de la créatine chez Protein.tn', 'les créatines en stock chez Protein.tn', …). Re-checked the whole file after my additions: 73 entries, 0 duplicate hrefs inside any entry, 0 duplicate keys.
- *SEO reason:* Repeated identical exact-match anchors on one page read as a generated keyword strip, add no signal (Google counts the first anchor) and pull the site's anchor profile for /creatine toward a single phrase.

**cannibalization-keyword-map#4 — Mass gainer: the in-content injector and the brand pages route 'mass gainer' anchors to /prise-de-masse and…**

- *Files:* `frontend/src/config/blogSeoConfig.ts`
- *Change:* Owned parts done: page.tsx:329-333 synonym split (step 1) and blogSeoConfig line ~249 `{ anchor: 'mass gainer prix Tunisie', href: '/mass-gainers' }` plus the Arabic entry's 'ماس غاينر لزيادة الوزن' → /mass-gainers and 'meilleur-creatine-pour-prise-de-masse' → /mass-gainers (step 2). Line 220's headline left untouched per the skeptic.
- *SEO reason:* GSC (window ends 2026-07-29): 'mass gainer tunisie' 2/149/47.4, 'mass gainer 7kg prix tunisie' 2/82/11.66, 'gainer tunisie' 1/9/46.78, 'mass tunisie' 1/11/33.09. Pages: /mass-gainers 3/186/43.18, /prise-de-masse 1/134/48.9, /gainers-proteines 0/28/33.75, /blog/mass-gainer-prix-tunisie-guide-complet-pour-2025 28/541/8.19, /blog/mass-gainer-prix-tunisie 0/90/42.93, /blog/mass-gainer-tout-savoir… 0/113/51.79, /blog/mass-gainer-le-guide-ultime… 0/108/39.81. Four category URLs and four blog posts…

### B7 · Homepage & footer authority

_Review: `fixed` — 1 issue(s) found and fixed in review; 7 left for a human._

**homepage#1 — Mega-menu and mobile drawer category links are JS-only; sub-categories with GSC demand have zero SSR anchors on the…**

- *Files:* `frontend/src/app/components/HomePageClient.tsx`
- *Change:* Appended 6 sub-category pills to PRIORITY_SHOP_CATEGORY_LINKS (the SSR <nav aria-label="Catégories compléments populaires">): /whey-isolate, /whey-hydrolysee, /caseine, /omega-3, /vitamines, /zma. 8 -> 14 pills, no className/layout change. Skipped /mass-gainers (CategoryRail text row already gives it its first anchor) and /bruleurs-de-graisse (7 impressions in 28 d and a duplicate title with /perte-de-poids — one skeptic flagged it explicitly). Did NOT do the optional ProductsDropdown SSR-hidden rewrite: all three skeptics said no, and that file is not owned by this batch. Added a docblock recording why this nav is the only crawlable homepage->sub-category path.
- *SEO reason:* The homepage is the site's only page with real authority (GSC 28 d: 508 clicks / 5,580 impr / pos 8.26) and its crawlable link graph reached 15 of 634 listing URLs. The mega-menu and mobile drawer only enter the DOM on hover/tap, which Googlebot never does. The six added targets already earn demand with zero homepage links: /whey-isolate 3 clicks/231 impr, /omega-3 4/196, /whey-hydrolysee 2/107, /vitamines 10/95, /caseine 5/30, /zma 1/16.
- *Expected effect:* Six sub-categories gain a first-party link from the strongest page on the site; crawl priority and internal PageRank reach them for the first time. No existing URL loses an anchor.
- *Risk:* low — additive anchors only; no title, H1, canonical or robots touched. Visual risk is 3 extra rows in the lg:grid-cols-2 card; className deliberately unchanged.
- *Validation:* After deploy: curl -sA 'Googlebot/2.1' https://protein.tn/ | grep -c 'href="/whey-isolate"' — expect >=1 (baseline measured today: 0). Same for /omega-3, /vitamines, /caseine, /zma, /whey-hydrolysee (all 0 today). Repo-side: grep -n "whey-hydrolysee" C:/mla/frontend/src/app/components/HomePageClient.tsx

**homepage#10 — First anchor to /proteines is the tile caption 'Catalogue de protéines', contradicting CategoryRail's own first-anchor…**

- *Files:* `frontend/src/util/categoryAnchor.ts`, `frontend/src/app/components/HomePageClient.tsx`
- *Change:* categoryAnchor.ts:5 `proteines: 'Catalogue de protéines'` -> `'Protéines en Tunisie'` (the skeptic's corrected_fix: change the label, do NOT remove the entry — removing it would have made the counted first anchor the API designation 'PROTÉINES', which achieves nothing). Also changed the matching HomePageClient pill label from 'Catalogue de protéines' to 'Protéines en Tunisie'. Docblock added to categoryAnchor.ts explaining why an anchor may differ from its destination's title.
- *SEO reason:* The CategoryRail tile is the FIRST anchor to /proteines in the homepage document (the 'Protéine Tunisie' nav row is second), and it carried the destination's own title rather than the query. Its two siblings in the same helper already carry queries ('Whey protein en Tunisie', 'Créatine monohydrate en Tunisie'). /proteines: 19 clicks / 1,353 impr / pos 19.1.
- *Expected effect:* The first (and most-weighted) anchor to /proteines, plus the PDP breadcrumb, shop sidebar, mega menu and crawler views, now carry 'Protéines en Tunisie' instead of 'Catalogue de protéines'.
- *Risk:* low, but the blast radius is wider than one page: categoryAnchor feeds 10 components. The change is copy, not layout, and the new string is shorter than the 'Créatine monohydrate en Tunisie' sibling already rendered in the same tile grid. /proteines' own title/H1 (content/categories/proteines.json)…
- *Validation:* grep -n "Protéines en Tunisie" C:/mla/frontend/src/util/categoryAnchor.ts. After deploy: curl -sA 'Googlebot/2.1' https://protein.tn/ | grep -o 'href="/proteines"[^>]*>[^<]*' — first hit should read 'Protéines en Tunisie', second still 'Protéine Tunisie' (the CategoryRail nav row, untouched). Also spot-check a protein PDP breadcrumb.

**homepage#2 — Homepage splits gainer intent across three URLs: rail -> /mass-gainers, footer 'Gainers' -> /gainers-proteines,…**

- *Files:* `frontend/src/app/components/FooterClient.tsx`
- *Change:* FooterClient.tsx CATEGORIES: `['/gainers-proteines', 'Gainers']` -> `['/mass-gainers', 'Mass gainer en Tunisie']`. `['/prise-de-masse', 'Prise de masse']` kept as the hub link, per all three skeptics. Added a comment recording the decision and that /gainers-proteines is deliberately NOT redirected or noindexed. The structuredData.ts:1101 half of this finding is NOT owned by this batch — see needs_other_files.
- *SEO reason:* Five URLs answer 'mass gainer tunisie' and none is in the top 20. docs/seo-opportunity-map.md, the CategoryRail comment and scripts/check-commercial-intent-map.mjs all name /mass-gainers the winner, but the sitewide footer was still voting for /gainers-proteines. Google's canonicalisation guidance is to link the chosen URL consistently. GSC 28 d: /gainers-proteines 0 clicks / 48 impr / pos 46.5, so nothing performing loses a link.
- *Expected effect:* /mass-gainers gains a link from every page of the site; /gainers-proteines loses its sitewide vote but stays 200/indexable and keeps its PDP links.
- *Risk:* low — deliberate equity transfer to the URL the repo already chose. Nothing asserts the footer CATEGORIES list, and check-commercial-intent-map.mjs only forbids links to the redirecting /mass-gainer (singular), which this is not.
- *Validation:* node C:/mla/frontend/scripts/check-commercial-intent-map.mjs (must still pass). After deploy: curl -sA 'Googlebot/2.1' https://protein.tn/ | grep -c 'href="/mass-gainers"' — expect 2 (rail + footer; baseline today 1) and 'href="/gainers-proteines"' 0 (baseline 1). Note the JSON-LD will still emit /gainers-proteines until the structuredData.ts line lands.

**homepage#3 + internal-linking#4**

- *Files:* `frontend/src/config/cmsPageSeoConfig.ts`, `frontend/src/app/components/FooterClient.tsx`
- *Change:* Single source of truth rather than a second map in the footer. cmsPageSeoConfig.ts: added `navLabel?: string` to CmsPageSeoEntry + `getCmsPageNavLabel(slug)`; set navLabel 'Guide : bien choisir sa protéine' on the existing proteine-tunisie entry; added a new 'creatine-monohydrate-tunisie' entry with navLabel 'Guide : la créatine monohydrate', headingOverride 'Comment choisir sa créatine monohydrate ? Le guide', commercialIntro and one commercialLink to /creatine. FooterClient.tsx line ~362 now renders `getCmsPageNavLabel(p.slug) ?? p.title`. Updated the file's top docblock, which described the footer-anchor problem without fixing it. NOTE on internal-linking#4: I renamed the anchor instead…
- *SEO reason:* The two strongest exact-match anchors the site owns — 'Proteine Tunisie' and 'Créatine Monohydrate Tunisie' — were spent on every page of the site on editorial guides with no products, while /proteines sat at pos 19.1 and /creatine at 22.2. The créatine guide additionally had no link to /creatine at all; its only category link is a CMS-authored /category/creatine that 308s. Verified live today: the guide is 200, index,follow, self-canonical, exactly 1 h1, 0 occurrences of href="/creatine".
- *Expected effect:* The commercial phrases stop pointing at the guides sitewide; /creatine gains a direct in-body link high on a page that ranks pos 13.6 for its own query; the guide's H1 stops competing head-on with the category.
- *Risk:* low. Deliberately NO titleOverride on creatine-monohydrate-tunisie: its live title is already guide-framed and is what earns its impressions (28 d 0 clicks/39 impr/pos 13.6; 3 m 2/107/13.4) — the one skeptic who checked GSC said leave it, and headingOverride is the part all three agreed on.…
- *Validation:* grep -n navLabel C:/mla/frontend/src/config/cmsPageSeoConfig.ts. After deploy: curl -sA 'Googlebot/2.1' https://protein.tn/ | grep -o 'href="/creatine-monohydrate-tunisie"[^>]*>[^<]*' should read 'Guide : la créatine monohydrate' (today: 'Créatine Monohydrate Tunisie'), and /proteine-tunisie should read 'Guide : bien choisir sa protéine' (today: 'Proteine Tunisie'). Then curl -sA 'Googlebot/2.1' https://protein.tn/creatine-monohydrate-tunisie…

**homepage#4 — Footer social links contradict the Organization/LocalBusiness sameAs (4 of 5 profiles differ; footer YouTube handle is…**

- *Files:* `frontend/src/app/components/FooterClient.tsx`
- *Change:* FooterClient.tsx: replaced the hardcoded SOCIALS array with a derivation from SOCIAL_PROFILES (imported from '@/util/company', the same list every schema sameAs reads). A hostname->{label,icon} map (SOCIAL_ICONS) supplies the five marks the row was designed around; Pinterest and X fall out automatically because they have no icon. Iteration is over SOCIAL_ICONS order, not SOCIAL_PROFILES order, so the visible sequence stays exactly Facebook, Instagram, LinkedIn, TikTok, YouTube. The TikTok SVG was hoisted to a const. company.ts is NOT modified.
- *SEO reason:* The same page told Google two different stories about the shop's identity: four of the five visible footer profiles named different accounts than the Organization/LocalBusiness sameAs, and the visible YouTube link was @proteine-tunisie — a handle company.ts records as one of two verified 404s it removed. Outbound social links are used for entity reconciliation on the brand queries the homepage lives on.
- *Expected effect:* Footer links and sameAs can never diverge again; the dead YouTube link is gone. Visible handles change for Instagram, LinkedIn, TikTok and YouTube to the Google-Business-Profile-verified ones.
- *Risk:* low technically, but needs an owner nod before merge: the four swapped handles are the GBP-listed accounts per company.ts (verified 19/09/2026), yet the OLD Instagram and TikTok handles also resolve 200, so the owner should confirm which accounts customers should be sent to. The YouTube swap needs…
- *Validation:* After deploy: curl -sA 'Googlebot/2.1' https://protein.tn/ | grep -o 'youtube.com/@[a-z_-]*' | sort -u — '@proteine-tunisie' must be gone (it is present today) and '@protein_tn' must appear in BOTH the footer anchors and the JSON-LD sameAs. Visually: the social row still shows five circles in the same order.

**homepage#7 + internal-linking#11**

- *Files:* `frontend/src/app/components/BrandsSection.tsx`
- *Change:* BrandsSection.tsx: added FEATURED_BRAND_SLUGS (18 slugs ordered by GSC 28-d clicks) and a stable sort by index in that list before the existing `.slice(0, SELECTED_BRANDS)`. Unknown brands rank last and keep the API's alphabetical order. Same 24 tiles, same markup, same RAIL_LAYOUT/TILE_LAYOUT, same logo filter and same >=8 fallback. All 18 slugs verified against a live fetch of /brands today (every one resolves to a real brand URL).
- *SEO reason:* /api/all_brands is ordered by designation_fr, so the homepage brand wall was every brand from A to M and none after it — an alphabetical accident. The brands that earn clicks had one inbound link each (the /brands hub, one link among 683). GSC 28 d: /optimum-nutrition 47 clicks/1,614 impr, /weightworld 14, /ostrovit 12, /now-foods 12, /vital-proteins 11, /william-bonac 10, /big-ramy-labs 8, /rule-one-proteins 8, /proactive 7.
- *Expected effect:* The homepage's 24 brand links go to the 24 brand pages with demand instead of A-M. This also delivers the homepage half of cannibalization-keyword-map#6 (/optimum-nutrition, 0 homepage links today) and #7 (/ostrovit, 0 today).
- *Risk:* low — ordering only, no layout, no count change, no API change. If a featured brand has no logo it simply is not hoisted (the sort runs on the already-filtered list). The owner may want to adjust the list for stock/priority reasons.
- *Validation:* grep -n FEATURED_BRAND_SLUGS C:/mla/frontend/src/app/components/BrandsSection.tsx. After deploy: curl -sA 'Googlebot/2.1' https://protein.tn/ | grep -c 'href="/optimum-nutrition"' — expect >=1 (baseline today 0), same for /weightworld and /ostrovit (both 0 today). Tile count must stay 24: grep -c 'aria-label="Voir les produits'.

**homepage#8 — Heading outline: every footer column h2 is rendered twice (7 footer h2s at page-section level), and the first h2 in the…**

- *Files:* `frontend/src/app/components/FooterClient.tsx`
- *Change:* FooterClient.tsx FooterGroup: the `sm:hidden` accordion button now renders a <span> carrying FooterHeading's exact classes instead of <FooterHeading> (an h2). The `hidden sm:block` <h2> is untouched, so each column emits exactly one h2. Rewrote the component docblock, which stated the heading is rendered twice on purpose — it still is, but only one copy is now a heading, and the note explains why (a parser reads through display:none) and warns against collapsing the two into one h2. The HeroBestSellers.tsx half of this finding is not owned — see needs_other_files.
- *SEO reason:* display:none removes an element from the accessibility tree but not from the HTML Google parses, so every page on the site shipped duplicate h2s — Navigation x2, Catégories x2, Services & Ventes x2 — 8 of the homepage's 20 h2 being footer chrome. Heading-outline hygiene on the page that carries the brand queries.
- *Expected effect:* Footer h2s drop from 8 to 4 on every page; homepage h2 count goes 20 -> 16 (17 once the HeroBestSellers line lands elsewhere).
- *Risk:* low, zero pixel change: the span carries the identical class string, the button's accessible name is still the title, aria-expanded is untouched.
- *Validation:* After deploy: curl -sA 'Googlebot/2.1' https://protein.tn/ | grep -c '<h2' — expect 16 (baseline measured today: 20). And each of 'Navigation', 'Catégories', 'Services & Ventes' should appear exactly once in the h2 dump. Visually, the phone accordion headers must look identical.

**homepage#9 — Homepage meta description is 187 characters and gets truncated on the SERP that earns 'protein tunisie'**

- *Files:* `frontend/src/app/(shop)/page.tsx`
- *Change:* (shop)/page.tsx generateMetadata: the 187-char description replaced with a 138-char one — 'Protéine Tunisie : whey, créatine, gainer, BCAA et compléments authentiques chez Protein.tn (Sousse). Livraison rapide partout en Tunisie.' HOME_TITLE, the sr-only h1, keywords, canonical and the ISR settings are untouched; the same const feeds openGraph and twitter, so one edit covers all three. Comment added recording the length and why.
- *SEO reason:* Google cuts descriptions around 155-160 chars, so the old closing clause was truncated on the SERP for 'protein tunisie' — the homepage's best query (GSC 28 d: 125 clicks / 608 impr / pos 5.5 on the homepage) where the snippet is the whole CTR lever.
- *Expected effect:* A complete, non-truncated snippet on the homepage's highest-value SERPs. Head terms, the Sousse proof and the delivery promise all survive.
- *Risk:* low, and honestly a polish item — Google rewrites descriptions freely. No title, H1, canonical or robots change, so the protected 'protein tunisie' position is not exposed.
- *Validation:* node -e "console.log(require('fs').readFileSync('C:/mla/frontend/src/app/(shop)/page.tsx','utf8').match(/'Protéine Tunisie : whey[^']*'/)[0].length)" — expect 140 (138 + quotes). After deploy: curl -sA 'Googlebot/2.1' https://protein.tn/ | grep -o '<meta name="description"[^>]*>' and confirm the new text and that og:description matches.

**crawler-parity-rendering#3 (docblock only)**

- *Files:* `frontend/src/app/components/HomePageClient.tsx`
- *Change:* HomePageClient.tsx: replaced the stale comment that said the single h1 'now lives in the crawlable SEO block near the bottom' — it does not; it is the sr-only h1 at the top of <main>. The new note records where the h1 actually is, that sr-only means no visitor ever sees the heading targeting the head term, that making it visible reverses the owner's 18/08 'no copy strip' instruction and is therefore an owner decision, and that it must not be moved into Hero (a slide is an image and carries no text, owner 03/08). The h1 element itself is NOT changed.
- *SEO reason:* Documenting the open decision so the next session does not either (a) trust the stale comment or (b) silently reverse an explicit owner instruction. The underlying signal issue is real but is not mine to decide.
- *Expected effect:* No rendered change. The decision is now visible in the file where it has to be made.
- *Risk:* none — comment only.
- *Validation:* git diff C:/mla/frontend/src/app/components/HomePageClient.tsx — the only non-comment change in that file is the PRIORITY_SHOP_CATEGORY_LINKS array. curl of the live homepage still shows one h1 with class sr-only until the owner decides.

### B8 · Structured data

_Review: `needs_human`; 7 left for a human._

**structured-data#4 — Product.description on PDPs is the 155-char meta-description template, not the product description the page shows**

- *Files:* `frontend/src/util/structuredData.ts`
- *Change:* Added a single shared builder `productSchemaDescription(product)` in structuredData.ts and wired BOTH Product builders to it (buildProductJsonLd's `description` const, and sanitizeBackendProductJsonLd's `description:` chain). New order: visible copy first (`description_fr || description_cover`), then the meta template (`seo.description || seo_description || meta_description || meta_description_fr`), then factualProductDescription() as before. The visible branch only wins at >= 40 chars (the same floor the sanitize path already applies post-cleanSourceText), so a two-word cover blurb still falls through. Every branch now runs cleanSourceText -> stripHtml(500) -> decodeHtmlEntities ->…
- *SEO reason:* `description` is the field Google surfaces in product snippets and merchant listings. It was the ProductSeoDefaults template across the whole catalogue — one sentence with the name and category substituted in, i.e. the 'many pages differing only by a substituted noun' pattern the file's own factualProductDescription docblock exists to avoid — and it contradicted the visible page, which the WebPage node quotes correctly.
- *Expected effect:* Product.description becomes the real product copy on every PDP and category Product node, identical between the two builders and between PDP and category pages for the same @id. Removes ~20k near-duplicate description strings from the domain's structured data. No visible change, no title/H1/robots change, so nothing in the 22/09 freeze or the GSC-protected URL set is touched.
- *Risk:* low
- *Validation:* grep -n "productSchemaDescription" C:/mla/frontend/src/util/structuredData.ts (one definition, two call sites at the two builders). After deploy: curl -s -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' https://protein.tn/creatine/creatine-monohydrate-300g-ostrovit | node -e "let h='';process.stdin.on('data',d=>h+=d).on('end',()=>{for(const m of…

**product-pages#11 — A UPC stored in code_product is emitted only as `sku`/`productID`, never as `gtin` (Serious Mass 748927023800)**

- *Files:* `frontend/src/util/structuredData.ts`
- *Change:* Added `gtinFromCodeProduct(product)` to structuredData.ts: returns `code_product` only when it is a run of exactly 8/12/13/14 digits AND satisfies the GS1 modulo-10 check digit (weights 3,1 leftwards from the digit next to the check digit — one loop covers GTIN-8/12/13/14). Wired into both builders as an `else` branch that fires only when `product.gtin` is empty; in sanitizeBackendProductJsonLd it additionally requires that the backend graph carried no gtin/gtin8/gtin12/gtin13/gtin14 of its own, so a real barcode from the blob is never overwritten. `sku`/`productID` are untouched.
- *SEO reason:* A valid UPC/EAN is the strongest product-identity signal for merchant-listing and knowledge-panel matching, and it was published only in `sku`, a field that means 'the retailer's internal reference'. The check digit is what makes the inference safe: code_product also holds internal references of every shape, and a wrong gtin is worse than none.
- *Expected effect:* Legacy best-sellers whose code_product is a barcode (Serious Mass 5,45 kg = 748927023800) gain `"gtin":"748927023800"` alongside the existing sku. Products whose code_product is not a valid barcode (e.g. the DB-id fallbacks '355', '218') are unchanged — they emit no gtin, exactly as today.
- *Risk:* low
- *Validation:* Logic check without a build: node -e with the same loop on known barcodes — 748927023800 and 5999076234844 (EAN-13) and 96385074 (EAN-8) return the code; '355' and 'REF-8892' return null (I ran this, all pass). After deploy: curl -s -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' https://protein.tn/mass-gainers/serious-mass-5-45-kg-optimum-nutrition | grep -o '"gtin":"[0-9]*"' — expect "gtin":"748927023800"; the…

**structured-data#8 — BlogPosting.headline is the <title> tag (with ' | Protein.tn' suffix) instead of the article H1**

- *Files:* `frontend/src/util/structuredData.ts`
- *Change:* buildArticleSchema's headline chain reordered to `designation_fr || schema.headline || seo.title || 'Article'` and passed through decodeHtmlEntities + jsonLdText. Added the `decodeHtmlEntities` import from '@/util/htmlEntities' (server-safe, no DOM, no imports of its own — no cycle).
- *SEO reason:* Google's Article guidance wants headline to be the article title as shown on the page. `designation_fr` is exactly what ArticleDetailClient.tsx:312 renders in the H1, through the same decodeHtmlEntities. The old chain started at seo.title, the SERP title, so every post with one published the ' | Protein.tn' variant, which also wastes ~14 chars of the 110-char headline budget.
- *Expected effect:* On /blog/prix-de-la-creatine-en-tunisie headline becomes 'Prix de la créatine en Tunisie : comment comparer les formats et les marques ?' (= the H1) instead of 'Prix créatine Tunisie : comparer formats et marques | Protein.tn'. Across the 223-URL blog series the BlogPosting headline now matches the visible H1. This changes JSON-LD only — the <title>, the H1 and robots of that GSC-protected URL (6…
- *Risk:* low
- *Validation:* After deploy: curl -s -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' https://protein.tn/blog/prix-de-la-creatine-en-tunisie | grep -o '"headline":"[^"]*"' — must not contain '| Protein.tn' and must equal the text inside the page's <h1>.

**brands-hierarchy-breadcrumbs#11 — Brand JSON-LD node omits the brand logo even when the admin has one**

- *Files:* `frontend/src/util/structuredData.ts`
- *Change:* buildBrandSchema now accepts `logo?: string | null` and emits `logo: getStorageUrl(brand.logo)` (absolute; getStorageUrl passes an already-absolute URL through and returns '' for empty) only when the admin filed one — spread conditionally, so a brand with no logo emits the same four properties as before. brandJsonLd.ts needed no change: it already hands the full Brand object in. I REPLACED the docblock paragraph that said logo was deliberately left out, as the task requires: the note argued 'no Google feature reads Brand.logo' and 'some admin logos 404'. The second half is still true and is why emission is gated on a filed value (~8% of brands, the curated ones); what changed is the weight…
- *SEO reason:* The `about` Brand entity on the 16 curated brand pages (the ones with logos AND search demand — /optimum-nutrition is 7 clicks / 518 impr / pos 5.2 on 'optimum nutrition' per GSC 22/09) was described with four properties while thousands of PDPs point their brand.@id at it.
- *Expected effect:* /optimum-nutrition, /biotech-usa, /dymatize etc. gain `"logo":"https://…/storage/…"` inside the about.Brand node. Brands with a null logo are byte-identical to today. No effect on the page's title, H1, canonical or robots, so the GSC-protected /optimum-nutrition traffic is not at risk.
- *Risk:* low
- *Validation:* After deploy: curl -s -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' https://protein.tn/optimum-nutrition | grep -o '"about":{[^}]*}' — expect a logo key with an absolute https URL. THEN curl -I that logo URL for each of the 16 curated brands and confirm 200: this is the one failure mode the old docblock warned about and the code cannot detect.

**structured-data#2 (brand half only)**

- *Files:* `frontend/src/util/brandJsonLd.ts`
- *Change:* brandJsonLd.ts: removed the `.slice(0, 20)` before buildItemListSchema, with a comment recording why. The category-page half of this finding is in files I do not own — see needs_other_files.
- *SEO reason:* numberOfItems said 20 regardless of what the page listed. The crawler view (CrawlerCategoryView.tsx, the surface Google reads per PLAYBOOK) renders EVERY product of a brand as an <li> link and prints the real count in its own 'Produits (N)' heading, so on any brand holding more than 20 the ItemList contradicted the visible list and the products past the 20th appeared in no listing markup at all.
- *Expected effect:* numberOfItems now equals the number of product links the brand page actually renders; itemListElement keeps buildItemListSchema's own documented 30-entry payload cap. NOTE for the reviewer: /optimum-nutrition holds exactly 20 products (I verified this against the live capture — its bot view heading reads 'Produits (20)' and its ItemList already had 20/20), so that page will NOT change and is not…
- *Risk:* low
- *Validation:* git diff C:/mla/frontend/src/util/brandJsonLd.ts (one line changed). After deploy, pick a brand whose crawler heading shows N>20: curl -s -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' https://protein.tn/<brand> | grep -o 'Produits ([0-9]*)' and compare with grep -o '"numberOfItems":[0-9]*' — the two must now agree (before: the second always said 20).

### B9 · Brand pages & API pagination

_Review: `fixed` — 2 issue(s) found and fixed in review; 6 left for a human._

**brands-hierarchy-breadcrumbs#3 — Brand pages show only the API's first 20 products — no per_page, no pagination — so 30 of Optimum Nutrition's 50…**

- *Files:* `frontend/src/services/api.ts`
- *Change:* `getProductsByBrand` in services/api.ts now requests `/productsByBrandId/{id}?per_page=100&page=1`, reads `products_meta.last_page`, and when >1 fetches pages 2..last_page in Promise.all (each `.catch(() => [])` so one failed page cannot empty the brand), concatenating into `products` and returning `{...data, products}`. Mirrors the existing category loop at api.ts:880-906 exactly. Implemented the skeptic's corrected_fix: api.ts only, no route edits — every consumer (human SSR body, human client refetch in ShopPageClient:949/967, crawler brand branch, the `Produits (N)` heading and brandJsonLd's ItemList) reads `result.products` from this one function.
- *SEO reason:* Brand pages are the pages meant to win {brand}+tunisie queries and to hand link equity to the brand's PDPs. At per_page=20 the tail of every brand with >20 SKUs had no crawl path from its own brand page in either render (30 of Optimum Nutrition's 50).
- *Expected effect:* /optimum-nutrition goes from 20 to 50 product links and `Produits (20)` to `Produits (50)`; same for every brand over 20 SKUs, in both the human and crawler renders. ItemList `numberOfItems` reports the real count (brandJsonLd no longer slices); `itemListElement` stays capped at 30 by buildItemListSchema.
- *Risk:* low — measured live: the per_page=100 payload for brand 17 is 74 KB vs 28 KB, because the endpoint's single per_page knob also widens the incidental `brands` array from 20 to 100 rows (582 total). The category path already pays exactly this cost for the same reason, and the brand page's `brands`…
- *Validation:* Before (measured today, Googlebot UA): `curl -s -A Googlebot https://protein.tn/optimum-nutrition | grep -o 'Produits ([0-9]*)'` → `Produits (20)`. After deploy the same command must read `Produits (50)`, and grepping `numberOfItems":[0-9]*` on the same page must read 50. API ground truth: `/api/productsByBrandId/17?per_page=100&page=1` → products_meta {total:50,last_page:1}.

**blog-pages#1 — 123 of 223 blog articles have zero internal inbound links: getAllArticles() stops at per_page=100 and every blog link…**

- *Files:* `frontend/src/services/api.ts`
- *Change:* Added `fetchAllArticlePages(init)` in services/api.ts (with `ARTICLES_MAX_PAGES = 10` / `ARTICLES_PER_PAGE = 100`, mirroring util/blogSlugs.ts) that loops `/all_articles?per_page=100&page=N`, stops on `rows.length < 100`, on `page >= meta.last_page`, or on a plain-array response, and keeps what it has if a page AFTER the first fails (page 1 still throws, as the callers expect). `getAllArticles` and `getAllArticlesClient` are now thin wrappers over it, keeping their exact previous init: the server one keeps `next: { tags: ['blog'] }` on EVERY page request so POST /api/revalidate-blog still purges the whole corpus; the client one keeps `cache: 'no-store'` + the no-cache headers. No page file…
- *SEO reason:* 123 of 223 articles had zero internal inbound links: the /blog SSR archive, its page count, its ItemList and the 'Articles similaires' pool all read this one capped array. The GSC 28-day export shows those orphans carrying real traffic, so they are pages Google already ranks but crawls at the lowest priority and that pass no equity onward to the category pages they link to.
- *Expected effect:* /blog's `<details>` archive links all 223 articles instead of 100, its article counter and page count cover the full corpus, and the related rail on any article can draw from all 223. The article route's cached Promise.all now issues up to 3 tagged fetches instead of 1 — one extra origin round-trip per revalidation, not per render.
- *Risk:* low — additive pagination behind the same Data-Cache tag; a failure after page 1 degrades to the articles already collected instead of throwing, which is strictly safer than the previous single-request behaviour.
- *Validation:* Before (measured today): `curl -s -A Googlebot https://protein.tn/blog | grep -o 'href="/blog/[^"]*"' | sort -u | wc -l` = 100 while `curl -s -A Googlebot https://protein.tn/sitemaps/blog.xml | grep -c '<loc>'` = 223. After deploy the two numbers must match (223 today), and the archive summary's article counter must read 223. Spot-check that an orphan such as /blog/iso-100-de-dymatize... now appears in that href list.

**brands-hierarchy-breadcrumbs#13 — Brand page bodies refetch the brand listing uncached after generateMetadata already fetched it cached — two identical…**

- *Files:* `frontend/src/app/(shop)/[slug]/page.tsx`
- *Change:* (shop)/[slug]/page.tsx brand branch now calls `getCachedProductsByBrand(brand.id)` instead of the raw `getProductsByBrand(brand.id)`; the now-unused `getProductsByBrand` import was dropped from the '@/services/api' import line (getCachedProductsByBrand was already imported for metadataForBrand).
- *SEO reason:* Every brand render hit the shared per-IP API bucket twice for the same payload, doubling TTFB exposure on 579 URLs — and this batch's #3 fix makes that duplicated payload 74 KB rather than 28 KB, so deduping it matters more after the change than before.
- *Expected effect:* One `/productsByBrandId` request per brand render instead of two. No rendered-output change. `enrichProductsWithSubcategory` is pure (returns a new array), so sharing the cached object with generateMetadata is safe.
- *Risk:* low
- *Validation:* `grep -n 'getProductsByBrand' 'C:/mla/frontend/src/app/(shop)/[slug]/page.tsx'` must return nothing. After deploy, one brand render should show a single upstream `/productsByBrandId/{id}` hit in the API access log.

**brands-hierarchy-breadcrumbs#5 — Default brand title/H1 template (563 brands) says "Protéines & Compléments en Tunisie" and "Produits X" — no "{Brand}…**

- *Files:* `frontend/src/util/brandMeta.ts`
- *Change:* PARTIAL, deliberately. In util/brandMeta.ts: extracted `configEntryFor()`, added an OPTIONAL `categoryNames?: string[]` parameter to `buildBrandMetaTitle`, `buildBrandMetaDescription` and `buildBrandSocialMetadata`, with a `normaliseCategoryNames` helper (trim, drop blanks, case-insensitive dedupe, order preserved) and a 60-char title budget that drops trailing categories rather than the brand+geo head. Changed the NO-category default title from `{Brand} — Protéines & Compléments en Tunisie | Protéine Tunisie` to `{Brand} Tunisie | Compléments alimentaires — Protein.tn`. The with-categories form is `{Brand} Tunisie : cat1, cat2, cat3 | Protein.tn`. Description default unchanged when no…
- *SEO reason:* 562 of 579 brand URLs carried one boilerplate title whose only variable is the name and which never forms the `{brand} tunisie` bigram — the query shape that actually converts here (dymatize tunisie, ostrovit tunisie, biotech usa tunisie, muscletech tunisie) and the shape every curated title leads with. It also stamped 'Protéines' on brands that sell none (Boiron, Centrum, OLLY, Pink Stork), repeating a weak generic signal against /proteines 562 times.
- *Expected effect:* All 562 non-curated brand pages get a title that opens with `{Brand} Tunisie`, identically in the human and crawler views (single shared builder, and brandJsonLd's CollectionPage `name` follows automatically). The 17 curated entries are untouched. H1 stays `Produits {Brand}` until the paired H1 change lands.
- *Risk:* medium-low, and worth stating: the GSC 28-day Pages export has click-earning NON-curated brand pages — /now-foods 12, /vital-proteins 11, /doctor-s-best 9, /neurogum 9, /rule-one-proteins 8, /mr-x-v-shape-supps 7, /fond-bone-broth 7, /true-sea-moss 5, /nutricost 4 — so this does rewrite live,…
- *Validation:* After deploy: `curl -s -A Googlebot https://protein.tn/boiron | grep -o '<title>[^<]*</title>'` must read `Boiron Tunisie | Compléments alimentaires — Protein.tn` (was `Boiron — Protéines &amp; Compléments en Tunisie | Protéine Tunisie`), and the same on /ostrovit must be UNCHANGED (curated). Run frontend/scripts/check-crawler-parity.mjs against a production build — title, description and og:title must be identical between the two views for a…

**internal-linking#6 — 563 of 579 brand pages hand Googlebot zero category links (related categories come only from the 16 curated…**

- *Files:* `frontend/src/config/brandSeoConfig.ts`
- *Change:* PARTIAL. Fixed the anchor split in config/brandSeoConfig.ts: the two entries (dymatize :85, ostrovit :286) that pointed the anchor 'Mass gainers en Tunisie' at /gainers-proteines now point at /mass-gainers, matching muscletech (:234) and biotech-usa (:390). The distinct anchor 'Gainers protéinés en Tunisie' → /gainers-proteines (:891, :943) is untouched. Added a '── ONE ANCHOR, ONE DESTINATION ──' paragraph to the file's docblock recording the rule and the GSC evidence. The derived-relatedCategories fallback for the 562 non-curated brands needs the crawler route — see needs_other_files.
- *SEO reason:* Four brand pages were splitting the exact anchor Google reads for `mass gainer tunisie` across two self-canonical 200s, which is the cannibalisation GSC-2026-09-22.md shows on that query (/mass-gainers 0/12/51.4 AND /gainers-proteines 0/10/53.3 AND /prise-de-masse 0/12/54.1, one query).
- *Expected effect:* /mass-gainers gains 2 inbound brand anchors (4 total) and /gainers-proteines keeps 2 with its own distinct anchor text, so one anchor now has one destination. Both URLs verified 200 with a Googlebot UA today; neither is redirected, noindexed or 301'd by this change, and /mass-gainers' frozen title/H1/robots are untouched.
- *Risk:* low
- *Validation:* `grep -n "Mass gainers en Tunisie" C:/mla/frontend/src/config/brandSeoConfig.ts` — all four hits must carry url '/mass-gainers'. After deploy: `curl -s -A Googlebot https://protein.tn/dymatize | grep -o 'href="/mass-gainers"'` returns a hit and `grep -o 'href="/gainers-proteines"'` returns none on that page.

### B10 · Sitemap freshness

_Review: `clean`; 7 left for a human._

**sitemap-robots#1 — Cloudflare edge caches every sitemap file for 1h + 24h stale-while-revalidate, so the backend's…**

- *Files:* `frontend/src/util/sitemapXml.ts`
- *Change:* SITEMAP_CACHE_HEADER in frontend/src/util/sitemapXml.ts changed from 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' to 'public, max-age=0, s-maxage=300, stale-while-revalidate=300' (the skeptic's corrected one-line fix, all three skeptics converged on it). Added a docblock above the constant recording the 22/09 cf-cache-status HIT measurement, why the origin revalidateTag('sitemap') bust cannot reach the edge, why the Cloudflare purge was deliberately NOT added to SeoNotifier, and the fallback diagnosis (a Cloudflare Cache Rule overriding Edge TTL) if Age still climbs past ~600 after deploy. Both route handlers import this one constant, so nothing else changed.…
- *SEO reason:* An admin publish (product noindex->index, category rewrite) currently reaches Googlebot only after the edge copy expires: 1h fresh plus up to 24h served stale while Cloudflare revalidates. lastmod is the only sitemap field Google uses to schedule a recrawl, and index/child files expire independently so the index could advertise a lastmod the cached child did not carry. 300s bounds that at ~10 min.
- *Expected effect:* Worst-case edge staleness on /sitemap.xml and every /sitemaps/*.xml drops from ~25h to ~10 min. No change to URLs, titles, canonicals or robots. Origin cost is unchanged: the data crawl is still the 1h unstable_cache entry, so an edge revalidation is a cache read plus an XML render.
- *Risk:* low
- *Validation:* Pre-deploy: grep -n "SITEMAP_CACHE_HEADER =" C:/mla/frontend/src/util/sitemapXml.ts. Post-deploy: curl -sD - -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://protein.tn/sitemap.xml -o /dev/null | grep -i 'cache-control\|cf-cache-status\|^age:' — cache-control must read s-maxage=300, and Age must never exceed ~600 across repeated polls. If Age keeps climbing past 3600, the header is inert and a Cloudflare…

**sitemap-robots#3 — Category/subcategory <lastmod> ignores the editorial content files — listings.xml says /creatine last changed 14/08…**

- *Files:* `frontend/scripts/gen-category-content-dates.mjs`, `frontend/src/generated/categoryContentDates.ts`, `frontend/src/util/sitemapSources.ts`, `frontend/package.json`
- *Change:* New frontend/scripts/gen-category-content-dates.mjs writes frontend/src/generated/categoryContentDates.ts = { content-file slug -> committer date (%cI) of the commit that last touched content/categories/<slug>.json }. Wired as the FIRST step of the existing prebuild chain in frontend/package.json. In sitemapSources.ts: added contentFileDates: Map<string,Date> to SitemapBuildContext, populated it in loadSharedContext from that module, added a contentFileLastModified(slug, ctx, rowDate) helper that resolves the slug through the already-exported CONTENT_SLUG_ALIASES and returns the LATER of the DB row date and the content-file date, and used it at both taxonomy call sites (category and…
- *SEO reason:* listings.xml advertised /creatine as unchanged since 2026-08-14 while creatine.json was rewritten 08-09/09, and /barres-proteinees as 2026-08-10 while its file was written on 22/09. These are the exact pages GSC 22/09 shows at position 22-33 (/creatine 2 clicks / 204 impr / 22.2; /whey-proteine 8/761/24.7; /proteines 19/1353/19.1; /mass-gainers 1/146/32.2), i.e. the pages the programme rewrites most were telling Google nothing had changed for five weeks.
- *Expected effect:* Simulated against the live /sitemaps/listings.xml fetched 22/09: exactly 41 of its 634 URLs get a newer, true <lastmod> — /creatine 2026-08-14 -> 2026-09-08, /whey-proteine 2026-08-13 -> 2026-09-08 (via whey-protein.json), /mass-gainers 2026-08-14 -> 2026-09-08 (via mass-gainer.json), /proteines 2026-08-13 -> 2026-09-08, /pre-workout 2026-08-13 -> 2026-09-08, /omega-3 2026-08-14 -> 2026-09-22,…
- *Risk:* low
- *Validation:* 1) Idempotence/no-op safety: node C:/mla/frontend/scripts/gen-category-content-dates.mjs twice — second run prints 'OK (… unchanged)'. 2) The lastmod guard still passes: node C:/mla/frontend/scripts/check-sitemap-routes.mjs (run, prints OK — it is the check that fails the build if a lastmod is ever synthesised with new Date()). 3) Post-deploy: curl -s -A Googlebot https://protein.tn/sitemaps/listings.xml | grep -A1…

**brands-hierarchy-breadcrumbs#10 — Brand-page indexability and sitemap inclusion count published products, not indexable ones: 579 brand URLs in…**

- *Files:* `frontend/src/util/sitemapSources.ts`
- *Change:* PARTIAL, deliberately. Added ctx.brandIdsWithIndexableProducts, recorded in the same product crawl but AFTER the seo_robots_index filter, so it differs from brandIdsWithProducts by exactly the brands whose whole published range is noindex. brandsSource now demotes those brands from priority 0.75 to 0.4 and reports the count in its build-log note. It does NOT gate sitemap inclusion on the new set — every brand URL that is in listings.xml today is still in it. The docblock at the call site records why, with the GSC numbers.
- *SEO reason:* The finding's own text defers the inclusion change ('Re-evaluate only after the 21/09 legacy re-index is confirmed in GSC'), it carries risk: medium, and it had no skeptic pass. GSC-2026-09-22 28d Pages.csv contradicts the drop directly: 122 single-segment URLs earned clicks and the long tail of them is precisely these pages — /qualia, the finding's own 1-product example, has 1 click; /musclepharm 2; /swanson-vitamins 2; /doctor-s-best 9 clicks at 47% CTR; /neurogum 9 at 64%; /maryruth-s 4 at…
- *Expected effect:* No URL is added to or removed from any sitemap. Brands whose published products are all noindex carry <priority>0.40</priority> instead of 0.75 — a within-site hint Google is free to ignore, which cannot remove a URL. The real deliverable is the build-log line giving the exact count of such brands, so the deferred decision can be re-taken on a number instead of a sampled curl once the 21/09…
- *Risk:* low
- *Validation:* Post-deploy, read the frontend deploy log for '[sitemap] /all_brands … → N brand URL(s) (M with no indexable product, demoted to priority 0.4)'. Then: curl -s -A Googlebot https://protein.tn/sitemaps/listings.xml | grep -c '<loc>' must still be ~634 (URL count unchanged), and grep -A3 '<loc>https://protein.tn/qualia</loc>' must still find the entry, now with <priority>0.40</priority>.

### Deliberately not changed

- **[B1] availability-deleted-soft404#3 (RULE 1 sub-item)** — The finding proposed p('/brand/RULE-1','/rule-one-proteins') and p('/brands/rule-1','/rule-one-proteins'). Two of three skeptics refuted that sub-claim and I re-confirmed it live on 22/09: /brand/RULE-1 already answers 301 -> /rule-1, and /rule-1 is a live brand page — it is not a 410 case. One skeptic argues /rule-1 is an empty 0-product noindex page and the real fix is merging brand id 8 into 454 in Filament; that…
- **[B1] availability-deleted-soft404#1 (ring-de-boxe sub-item)** — One of three skeptics proposed also re-slugging 'ring-de-boxe' / 'ring-de-boxe-40' to /cardio-fitness/ring-de-boxe-professionnel, but its own text asks for an owner sanity check that 'Ring de boxe professionnel' (id 313) is what replaced the former 'Ring de boxe' (legacy id 40). The other two skeptics explicitly said not to re-audit the remaining set in this change. redirects.js contains no successor rule for it,…
- **[B1] availability-deleted-soft404#1 (re-audit of the other 10 410 slugs)** — The finding asks for one product_details call per remaining entry (compact-whey-gold-protein-1kg, amino-eaa-ultra-speed-300-g, creatine-monohydrate-powder-250g, …). That is a live-catalogue verification task against admin.protein.tn, outside this batch's read-only curl budget and outside its owned files. I instead amended the 410 set's docblock so the admission criterion now states that an API 404 on a slug does not…
- **[B1] availability-deleted-soft404#2 (near-successor blog pairs)** — Implemented only the year rename (meilleure-creatine-2025 -> -2026), which is unambiguous: the 2025 form is 410, the 2026 form is 200 and sitemap-listed. Dropped the other ~10 pairs (proteine-whey-tunisie, ou-acheter-creatine-tunisie, creatine-prix-tunisie-2025, prise-masse-tunisie-2025, la-creatine-peut-elle-vraiment-booster-votre-cerveau). The skeptic's live check found several of these have MORE THAN ONE live…
- **[B1] availability-deleted-soft404#7 (lookupProduct on /?product=)** — The finding proposed resolving /?product={slug} to the real PDP. Skipped on the skeptic's reasoning: it puts a 1.5 s-timeout backend fetch on the homepage request path, for a URL shape with zero observed GSC entries, when the canonical already consolidates it. The param strip gets the crawl-budget win at no request cost.
- **[B2] index-noindex-pagination-filters#1 (category robots flip)** — HELD BACK DELIBERATELY, not forgotten — the one-line change is `category/[slug]/page.tsx:560` → `robots: !indexable ? {index:false,follow:true} : {index:true,follow:true}` (dropping the `metaQuery.page > 1` clause). I own that line. I did not ship it because flipping it while the crawler view still re-renders the page-1 landing copy would be a net regression, and the dedupe lives in a file another agent owns right…
- **[B2] index-noindex-pagination-filters#1 (optional ±2 numbered pager)** — Marked optional by the finding and by two of three skeptics, and it lives in CrawlerCategoryView.tsx which I do not own. Low value while `first`/`last` anchors already exist — the /shop chain is 474 hops with or without ±2 neighbours. Not carried into needs_other_files to keep that list to changes that are actually required.
- **[B2] sitemap-robots#6** — The entire fix is in C:/mla/frontend/src/util/sitemapSources.ts, which is not in owned_files. Exact diff is in needs_other_files. Nothing in my owned files could implement it: the page side already ignores robots_index on purpose (and now documents the one exemption it does honour), so the sitemap is the half that has to move.
- **[B4] internal-linking#1** — Same defect as crawler-parity-rendering#1, but its corrected_fix is a worse and now-conflicting implementation. It proposes extracting FOOTER_NAVIGATION/FOOTER_CATEGORIES into a new src/config/footerLinks.ts, editing FooterClient.tsx and hand-rendering a duplicate hub <nav> inside CrawlerCategoryView/CrawlerProductView — three of those four files are not in my owned_files, and, more importantly, the…
- **[B4] internal-linking#12** — Skipped both halves deliberately; it is the only P2 in the batch and the only finding with no skeptic verification. (a) The de-duplication half (render the comparison table's category cell as plain text on repeat rows) would make the bot HTML carry FEWER anchors than the human table for zero measurable gain — the finding itself states that seven links to one URL count once — while creating exactly the bot/human…
- **[B5] images#2 (code half)** — The skeptic's corrected_fix is a single-file change to C:/mla/frontend/src/app/(shop)/category/[slug]/page.tsx (isSocialImageUrl guard + og-banner fallback + conditional 1200x630 dims). That file is not in B5's owned_files and is being edited by another agent right now. I did the JSON half and added the prebuild guard, which makes a favicon value impossible going forward; the page.tsx fallback for API-supplied page…
- **[B5] cannibalization-keyword-map#10 (steps 3 and 4)** — blog/[slug]/page.tsx and config/blogSeoConfig.ts are not owned. Step 3 is already done in the working tree by its owner (page.tsx:333 no longer contains 'bcaa' in the acides-amines alternation). Step 4 (blogSeoConfig entries) the skeptic explicitly rated unnecessary for de-duplication.
- **[B5] brands-hierarchy-breadcrumbs#6 (tier B)** — Owner-gated and out of scope twice over: it needs a Filament catalogue reassignment of 14 products plus a Redirections row, and it reverses the documented intent-split decision in redirects.js:294-297. The code follow-up would also touch brandSeoConfig.ts, blogSeoConfig.ts, FooterClient.tsx, structuredData.ts, nutritionTargets.ts and productComplements.ts — none of them owned by B5. Tier A (the h1) is done.
- **[B5] category-metadata-h1-content#1 (step 4)** — Per-slug body copy for /perte-de-poids vs /bruleurs-de-graisse is an owner/content task the finding itself says not to auto-write. The alias still shares the hub body deliberately; only the SERP identity is now per-slug.
- **[B5] category-metadata-h1-content#9 (cardio-fitness / accessoires aliases, orphan-file deletion, live-slug prebuild check)** — The two aliases are conditioned on the owner confirming the copy matches the live assortment — the cardio JSON sells vélos/tapis while the live page sells cordes à sauter/bandes, so adding the alias would publish wrong copy. Deleting the remaining orphan files would destroy reviewed copy on an owner's call. A prebuild assertion that every content file names a live taxonomy slug would need the sitemap/API at build…
- **[B6] cannibalization-keyword-map#1 (steps 1, 2, 4, 5)** — Not my files. Step 1 is frontend/src/config/cmsPageSeoConfig.ts (the 'creatine-monohydrate-tunisie' override), step 2 is FooterClient.tsx (labelling CMS pages through headingOverride), step 4 is redirects.js (blog→blog 301s), step 5 is content/categories/creatine.json. All belong to other agents running concurrently. Only step 3 was in owned_files and it is done.
- **[B6] cannibalization-keyword-map#2 (steps 1 and 3)** — redirects.js:480/498/552 (/category/proteine-whey and friends pointing at /whey-isolate instead of /whey-proteine) is not an owned file. Step 4 ('do not add canonical or noindex to any blog post') was honoured — nothing I added touches robots or canonical.
- **[B6] cannibalization-keyword-map#4 (steps 3, 5, 6)** — brandSeoConfig.ts:85/286, content/categories/gainers-proteines.json and CategoryRail/FooterClient are not owned files.
- **[B6] cannibalization-keyword-map#5 (step 3)** — redirects.js is not owned, and the skeptic is explicit that the 301 consolidation of the 6-click twin is a post-measurement decision, not something to auto-implement.
- **[B6] cannibalization-keyword-map#12 (steps 2, 3 and the headline part of step 1)** — redirects.js and content/categories/complements-alimentaires.json are not owned files. The headlines are owner-gated on a GSC query→Pages breakdown for `complément alimentaire tunisie` — the skeptic's corrected_fix says 'Do NOT set headline on any of them yet', so the four entries are links-only.
- **[B6] blog-pages#4 (item 3: prix-de-la-creatine-en-tunisie headline + openingLinkHtml)** — Two skeptics conflict here and the conservative one wins: the finding-7 skeptic says to leave this entry untouched because it is a genuine top-10 with clicks (15 in the old window, still the top /creatine-intent URL in the fresh GSC read at 6/13/27.3 on `creatine tunisie`) and is the running BACKLOG P0 four-week test. The earlier agent had already varied its duplicate anchor to 'créatine prix Tunisie'; I left it at…
- **[B6] blog-pages#9 (the check script)** — The finding suggests 'a lightweight check script that diffs config keys against /all_articles slugs'. frontend/scripts/ is not in owned_files and a new prebuild guard would change the build contract mid-batch. I did the equivalent manually instead: all 73 config keys with a French/Latin slug were reconciled against protein.tn/Pages.csv, protein.tn/2026-09-22-28d/Pages.csv, or a direct Googlebot-UA fetch.
- **[B7] crawler-parity-rendering#3 (the actual fix: make the h1 visible)** — Skipped on purpose, two independent reasons. (1) The skeptic's corrected_fix opens with 'Owner decision required first (it reverses the 18/08 "no copy strip under the hero" instruction)' — a documented owner instruction is not mine to reverse. (2) The brief forbids changing the visual design; putting a heading back on screen under the hero is exactly that. Risk was rated medium, the only P1 in this batch that was.…
- **[B7] homepage#1 step 2 (SSR the mega-menu / mobile drawer link graph)** — All three skeptics explicitly said not to do it in this change: it rewrites the site-wide header hover/close logic and the fixed-position panel on every page for the same link-equity result step 1 already delivers, and shipping display:none nav content would sit badly against the brief's no-hidden-text rule. ProductsDropdown.tsx and HeaderClient.tsx are also not in owned_files. Logged for the owner as a separate…
- **[B7] homepage#1 — /bruleurs-de-graisse and /mass-gainers pills** — /mass-gainers: already has its first anchor from the CategoryRail text row, which is the one that counts under the model this code documents — adding a second homepage pill buys nothing. /bruleurs-de-graisse: 0 clicks / 7 impressions in 28 d (the weakest of the candidates) and one skeptic flagged that its title duplicates /perte-de-poids, which should be fixed before it gets homepage equity. Both are one-line…
- **[B7] homepage#3 — titleOverride for /creatine-monohydrate-tunisie** — Two of three skeptics proposed one; the third checked GSC and said leave it, and I agree: the live <title> is already guide-framed ('Créatine Monohydrate en Tunisie : guide expert & prix 2026') and it is what earns the page's impressions (28 d 0 clicks / 39 impr / pos 13.6; 3 m 2 / 107 / 13.4). The brief's rule is to improve a ranking URL, never churn it. headingOverride — the part all three skeptics agreed on, and…
- **[B7] internal-linking#4 — filtering the two guides out of the footer entirely** — Implemented as an anchor rename instead (see the homepage#3 entry). The defect is the exact-match commercial anchor, not the link; filtering would leave two indexable 200s with no inbound link except the sitemap, which one skeptic acknowledged as a side effect it wanted recorded. The rename removes the anchor problem and keeps the crawl path. If the owner prefers the harder demotion, it is one line in FooterClient:…
- **[B8] structured-data#6** — Not implementable in my batch: every one of its four files is owned by another agent (blog/[slug]/ArticleDetailClient.tsx, blog/page.tsx, brands/page.tsx, (shop)/page.tsx). structuredData.ts is not involved — buildBreadcrumbListSchema is correct, the defect is that four callers emit it on pages with no visible trail. Full spec handed over in needs_other_files.
- **[B8] structured-data#11** — Its only file, app/(shop)/blog/page.tsx, is not in my owned_files. The builders it calls (buildCollectionPageSchema / buildItemListSchema / buildBreadcrumbListSchema) already support every option the fix needs via PageNodeOptions and options.pageUrl — no change was required on my side. Exact diff handed over in needs_other_files.
- **[B8] structured-data#2 (category half)** — app/(shop)/category/[slug]/page.tsx is not in my owned_files. I implemented the brand half in brandJsonLd.ts and specced the two category line edits in needs_other_files (note: the batch's line numbers 600/783 are stale — the slices are now at 681 and 864).
- **[B9] brands-hierarchy-breadcrumbs#4** — Not refuted, but not implementable in this batch: every file it needs is owned by another agent right now (x-crawler/category/[slug]/page.tsx, components/crawler/CrawlerCategoryView.tsx, (shop)/category/CategorySeoLanding.tsx, (shop)/category/[slug]/page.tsx, util/brandIntro.ts) and all of them are already modified in the working tree by other batches. Exact diffs are in needs_other_files. Per the skeptic on…
- **[B10] sitemap-robots#8** — Entirely PHP: the fix lives in C:/mla/filament/app/Services/Seo/SeoNotifier.php and C:/mla/filament/app/Observers/SitemapTouchObserver.php. filament/ is out of scope for every batch and neither file is in owned_files. The frontend half (/api/indexnow, route.ts:32-70) already exists, is functional, and needs no change — the key file https://protein.tn/84ddeaef0cbbc380f0bb96f4340b6a10.txt still answers 200. Exact…
- **[B10] brands-hierarchy-breadcrumbs#10 (inclusion gate only)** — Requiring membership in brandIdsWithIndexableProducts before emitting /{brand} would drop hundreds of brand URLs from listings.xml, including /qualia (the finding's own example), /musclepharm, /swanson-vitamins, /doctor-s-best, /neurogum and /maryruth-s — all of which have clicks in GSC-2026-09-22 (28d). The task's hard rule protects any URL with clicks, the finding itself says to re-evaluate only after the 21/09…

