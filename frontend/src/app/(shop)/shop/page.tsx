import { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getShopPage, getShopFacets, getCategories, getInStockCount } from '@/services/api';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { buildShopSchemas, shopCanonicalPath } from '@/util/shopJsonLd';
import { loadForCache } from '@/util/loadForCache';
import {
  parseShopQuery,
  isShopFiltered,
  buildShopUrl,
  SHOP_PER_PAGE,
  type RawSearchParams,
  type ShopQuery,
} from '@/util/shopQuery';
import { ShopPageClient } from './ShopPageClient';

/**
 * ── /shop NOW READS searchParams, WHICH REVERSES AN EARLIER DECISION. READ THIS BEFORE UNDOING IT ─
 *
 * This file used to carry a long note explaining that it deliberately did NOT read `searchParams`,
 * because doing so is a dynamic API: it opts the whole route out of static rendering, so
 * `revalidate = 300` never took effect and the live page answered `Cache-Control: no-store` to every
 * visitor with `cf-cache-status: DYNAMIC`. All of that was true and none of it has changed.
 *
 * What changed is what the alternative costs. Filtering in the browser requires the browser to HAVE
 * the catalogue, and getAllProductsComplete() stops at 3,000 rows:
 *
 *     10,669 published products.  3,097 reachable.  71% of the shop did not exist.
 *
 * And it was worse than a missing tail, because every facet — brand, price, flavour, availability —
 * was computed over that truncated third. The pager counted pages of a number that was already
 * wrong. Nothing 500'd; the grid looked full.
 *
 * A cacheable page that shows a third of the catalogue is not better than an uncached page that
 * shows all of it. So the trade is taken deliberately, and the cost is paid down rather than
 * ignored:
 *
 *   • The render is now 12 products, not 3,000 — the payload went from 3.35 MB to roughly 120 KB.
 *   • The data fetch is ONE API call, not a ~30-page sequential walk at ~5s a page. That walk was
 *     also competing with the sitemap crawler for the API's per-IP budget, which is how
 *     /sitemap.xml ended up in its 503 fallback.
 *   • getShopFacets() is cached for 10 minutes server-side (Laravel) so the sidebar costs one query
 *     set per ten minutes across all visitors, not one per render.
 *
 * The facet noindex rules stay where they are — `X-Robots-Tag: noindex, follow` in next.config.js,
 * matched per query key. They are evaluated per request and work regardless of how this renders,
 * and since 22/09/2026 generateMetadata emits the matching page-level directive as well so the
 * two halves of the response stop contradicting each other (see the robots note below).
 */

type PageProps = {
  // Next 15: searchParams is a Promise. Awaiting it is what makes the route dynamic.
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = parseShopQuery(await searchParams);

  /*
   * ── CANONICAL: SELF ON PAGED VIEWS, /shop ON FACETED ONES ──────────────────────────────────
   * These are two different situations and collapsing them is a real indexing mistake.
   *
   * A FACETED view (?brand=72, ?search=whey) is a filtered slice of the boutique. It carries
   * noindex,follow and canonicalises to /shop so it consolidates rather than competing.
   *
   * A PAGED view (?page=7) is NOT a duplicate — it holds twelve products that appear on no other
   * URL. Canonicalising ?page=7 to /shop tells Google those twelve products' listing does not
   * exist, and with 890 pages of catalogue that is the difference between a crawl path to product
   * 10,669 and no path at all. Google's own guidance since rel=prev/next was retired is that
   * paginated pages should self-canonicalise. So page N points at page N.
   */
  const isPaged = query.page > 1;

  /*
   * ── ?page=N BEYOND THE END IS A 308, AND IT HAS TO BE DECIDED **HERE** ────────────────────
   * `page` is deliberately absent from next.config's FACET_KEYS, and the root layout defaults to
   * index/follow. So before this, `GET /shop?page=5000` answered 200, rendered "Aucun résultat",
   * and declared itself canonical and indexable: an unbounded space of indexable empty pages
   * hanging off the site's most important listing URL.
   *
   * (The 470 REAL page numbers are indexable again — see the robots note at the return below.
   * Only the past-the-end case is decided here, and it is decided HERE rather than by adding
   * `page` to FACET_KEYS because a header rule cannot know where the series ends. The object this
   * function returns is what /x-crawler/shop re-exports, so the bot and the shopper cannot
   * disagree.)
   *
   * THE FIRST ATTEMPT PUT THIS IN THE PAGE BODY AND IT SILENTLY DID NOT WORK. `permanentRedirect`
   * throws NEXT_REDIRECT, and in the page component that throw happens after `await getShopData`
   * — by which time the shell has been flushed and streaming has begun. Next converts it into a
   * client-side redirect embedded in the body: measured, `/shop?page=99999` answered **HTTP 200**
   * with `NEXT_REDIRECT` and `page=470` inside 291 KB of HTML. A browser follows it; Googlebot
   * records a 200 and an indexable empty page, which is the entire thing this guard exists to
   * prevent.
   *
   * MOVING IT TO `generateMetadata` DID NOT HELP EITHER — measured, same 200. Next 15 streams
   * metadata as well, so there is no point in a route handler's own code where a throw still owns
   * the status line. The project note is blunt about this class of bug: page-body redirects and
   * notFound()s in this app do not set the status, and SEO codes have to be verified against a
   * real build rather than assumed from the API that was called.
   *
   * SO THE HEAD DOES THE WORK THE STATUS LINE COULD NOT. `robots: noindex, follow` is a directive
   * Google obeys unconditionally, it rides in the <head> which is flushed with the shell, and it
   * closes the actual hole: the unbounded space stops being indexable. `follow` is deliberate —
   * the products linked from a stray page number are still worth crawling. The canonical points at
   * the real last page rather than at itself, so any link equity that arrived at ?page=99999
   * consolidates somewhere that exists.
   *
   * The body keeps its `permanentRedirect` for HUMANS: streamed or not, a browser follows it and
   * lands on page 470 instead of staring at an empty grid.
   *
   * The fetch is the same `unstable_cache` entry the body is about to read, keyed identically — a
   * cache lookup, not a second round trip — and it only runs when `page > 1`.
   */
  let overflowedTo: number | null = null;
  /*
   * True only when the probe came back WITHOUT a pagination envelope on a paged URL, i.e.
   * loadForCache turned a 429/5xx/timeout into the empty fallback above.
   *
   * This mattered less when every ?page=N was noindex regardless: an outage produced an empty grid
   * that was never going to be indexed anyway. Now that the real page numbers are indexable, an
   * outage would hand Googlebot an EMPTY listing carrying `index, follow` and a self-canonical —
   * up to 473 URLs asserting themselves as thin pages for the length of the incident. Treat "I do
   * not know how long this series is" as a reason not to invite indexing of what was rendered.
   *
   * It is deliberately NOT `!probe.products.length`: a healthy last page can legitimately be short,
   * and an empty page inside a healthy series is the overflow case, which `overflowedTo` covers.
   */
  let paginationUnknown = false;
  if (isPaged) {
    const probe = await loadForCache(
      cachedShopPageFor(query),
      { products: [], brands: [], categories: [] } as Awaited<ReturnType<typeof getShopPage>>
    );
    const lastPage = Math.max(1, probe.pagination?.last_page ?? 1);
    // `probe.pagination` guards an outage: loadForCache returns an empty response on a throw,
    // lastPage falls back to 1, and without this every paginated page would canonicalise to page 1
    // for the length of it.
    if (!probe.pagination) paginationUnknown = true;
    else if (query.page > lastPage) overflowedTo = lastPage;
  }

  // Shared with the JSON-LD and the crawler route — see util/shopJsonLd.ts. It used to be spelled
  // out here and as a bare '/shop' inside the CollectionPage builder, which is how the <head> came
  // to carry a canonical of ?page=7 next to structured data claiming to be /shop.
  const canonicalPath =
    overflowedTo !== null
      ? shopCanonicalPath({ ...query, page: overflowedTo })
      : shopCanonicalPath(query);
  const canonical = buildCanonicalUrl(canonicalPath);

  /*
   * ── THE TITLE LEADS WITH WHAT IS SEARCHED, NOT WITH THE FURNITURE ─────────────────────────
   * It was "Boutique Protéines & Compléments en Tunisie | Protéine Tunisie" — 62 characters of
   * which the first nine are a navigation label nobody types, and the brand appears twice
   * ("Protéines"/"Protéine Tunisie"). Google truncates the SERP title around 580px; "Boutique "
   * costs ~62px of that for no query it can win.
   *
   * The replacement leads on the head term this business is actually chasing and states the one
   * fact that differentiates a Tunisian storefront from an international one, which is that it
   * ships here. The page-N suffix stays after the count so paginated titles stay unique.
   */
  const suffix = isPaged ? ` — Page ${query.page}` : '';
  const title = `Protéines & Compléments Alimentaires en Tunisie${suffix} | Protein.tn`;
  const description =
    'Whey, créatine, gainers, BCAA, vitamines et équipement — plus de 11 000 références en stock ou sur commande. Prix en dinars, livraison dans les 24 gouvernorats, paiement à la livraison.';

  return {
    title: { absolute: title },
    description,
    /*
     * ── ?page=N IS INDEXABLE AGAIN. FACETS AND PAST-THE-END ARE `noindex, follow` ─────────────
     *
     * THIS REVERSES THE BLANKET `isPaged` NOINDEX THAT USED TO LIVE HERE. Read why before undoing
     * it again.
     *
     * The old rule noindexed all 473 paginated /shop URLs because they were near-duplicates of
     * page 1. That was measured and it was true of the CATEGORY pager — but not of this one.
     * Live 22/09/2026, Googlebot UA, /shop vs /shop?page=2: the title already differs (` — Page 2`,
     * built from `suffix` above), the crawler view carries one sentence of intro and no FAQ, both
     * pages emit two <h2>s and zero FAQPage blocks. The only thing page 2 repeats is the H1, which
     * Google does not require to be unique across a paginated sequence.
     *
     * What noindex cost instead is the crawl path. Google's pagination guidance is self-canonical
     * + indexable, and Mueller's position (office-hours, Dec 2017) is that a long-lived
     * `noindex, follow` decays to `noindex, nofollow`: once the URL drops out of the index Google
     * stops re-crawling it, and `follow` stops meaning anything. The pager is the only internal
     * link path into the middle of a 474-page chain — /shop links page 2, page 2 links page 3, and
     * nothing else on the site links the rest. Letting that decay orphans the tail of an 11,000-
     * product catalogue from internal PageRank (the sitemap still discovers the PDPs; it does not
     * pass equity to them).
     *
     * And the flip can only add. GSC 23/08→19/09 still shows paginated listings ranking WHILE
     * noindexed — /shop?page=172, ?page=440, ?page=432 and ?page=423 took a click each, and
     * /pre-workout?page=9 took 1 click from 14 impressions at position 43.9. Those are URLs Google
     * is being told to drop; the deep-page demand for them is real. Page 1 is untouched.
     *
     * WHAT STAYS NOINDEX:
     *   • The overflow case (?page=99999) — an unbounded space of empty pages hanging off the
     *     site's biggest listing. `overflowedTo` is only ever set when `isPaged`, and it keeps its
     *     last-page canonical below.
     *   • A paged URL rendered during an API outage (`paginationUnknown` — see the probe above).
     *     The grid is empty and the series length is unknown, so the page has nothing to index.
     *   • Faceted views (?brand=72, ?search=whey, ?sort=…). These were noindexed ONLY by the
     *     `X-Robots-Tag` header in next.config.js, while this page-level meta said `index, follow`
     *     in the same response — measured live 22/09/2026 on /shop?brand=72 and /shop?search=whey.
     *     Google resolves a conflict to the most restrictive directive so the outcome was already
     *     right, but a response that carries both directives is one no one can read.
     *
     *     BE CLEAR ABOUT WHAT THIS CLAUSE CAN AND CANNOT REACH. Every UA in util/isCrawler.ts —
     *     Googlebot, bingbot, GPTBot and the rest — is rewritten by middleware.ts to
     *     /x-crawler/shop with ONLY `page` forwarded, so `query` here is unfiltered for them and
     *     this clause never fires; the header is what noindexes those requests and it must stay.
     *     What the clause fixes is every other reader of the same URL: an unlisted or brand-new
     *     crawler, a preview/unfurler, and URL Inspection's rendered HTML. `isShopFiltered`
     *     already ignores `page`, so the two clauses above do not overlap. The header also covers
     *     keys the parser does not model (`filter`, `orderby`), which is a second reason to keep
     *     it.
     *
     * WHAT IS DELIBERATELY NOT CHANGED:
     *   • The self-canonical on a paged view. noindex and rel=canonical answer two different
     *     questions; pointing ?page=7 at /shop would tell Google those twelve products' listing
     *     does not exist.
     *   • rel=prev/next. Retired in 2019, not reintroduced.
     *   • Unfiltered page 1: both clauses are false, the key is absent from the object entirely,
     *     and the root layout's index/follow applies exactly as before, byte for byte.
     */
    ...(overflowedTo !== null || paginationUnknown || isShopFiltered(query)
      ? { robots: { index: false, follow: true } }
      : {}),
    alternates: { canonical },
    openGraph: {
      title: { absolute: title },
      description,
      type: 'website',
      url: canonical,
      images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: 'Boutique Protéines & Compléments en Tunisie' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Boutique Protéines & Compléments en Tunisie${suffix}`,
      description: 'Découvrez nos protéines, créatine, gainer et BCAA en Tunisie. Large choix, livraison rapide.',
      images: ['/og-banner.jpg'],
    },
  };
}

/**
 * Fetch one page of the boutique plus the sidebar's description of the whole catalogue.
 *
 * Products use loadForCache for the reason it has always been used here: getShopPage rethrows on the
 * server, and a transient upstream failure (the known one is the runner getting Cloudflare-403'd)
 * must render empty WITHOUT that emptiness being cached. Facets, categories and brands are
 * incidental — they fail soft, because a sidebar missing its counts is a smaller problem than a
 * boutique with no products in it.
 */
// NOT exported: a Next App Router page module may only export the fields the framework knows
// (default, generateMetadata, revalidate, …). Any other export fails the build's route-type check.
/**
 * The boutique's paged fetch, cached, as a FACTORY — because two things in this file need the same
 * entry and one of them is `generateMetadata`.
 *
 * ── THE PAGE SIZE IS PART OF THE KEY, and leaving it out is a bug I shipped and then measured ──
 * The key was `['shop-page', buildShopUrl(query)]`, which describes the QUERY but not the shape of
 * the answer. When SHOP_PER_PAGE went 12 -> 24, every cached entry still held twelve rows, and
 * Next's file-system cache handler persists these to disk — so `/shop?in_stock=1` kept rendering
 * 12 products under a pager that had been recalculated for 24, through a rebuild and a restart.
 * Nothing errored; the grid was just short, on exactly the queries a visitor had already warmed.
 *
 * Any value that changes what the fetch RETURNS for a given URL has to be in the key.
 *
 * ── unstable_cache IS WHAT PAYS FOR GOING DYNAMIC ────────────────────────────────────────────
 * Reading searchParams costs this route its ISR entry. Without a data cache that would mean one
 * API call per visitor on the busiest page on the site, and — the part that actually matters — no
 * protection at all when the origin is unwell. The API has been observed answering 504 on every
 * endpoint; today's cached page keeps serving its last good data through that.
 *
 * `loadForCache` stays OUTSIDE every call site: it converts a throw into an empty render, and
 * inside the wrapper that empty render is what would be cached.
 */
function cachedShopPageFor(query: ShopQuery) {
  return unstable_cache(
    () => getShopPage(query),
    ['shop-page', String(SHOP_PER_PAGE), buildShopUrl(query)],
    { revalidate: 300, tags: ['shop', 'products'] }
  );
}

async function getShopData(query: ShopQuery) {
  /*
   * ── unstable_cache IS WHAT PAYS FOR GOING DYNAMIC ─────────────────────────────────────────
   * Reading searchParams costs this route its ISR entry (see the note at the top). Without a data
   * cache that would mean one API call per visitor on the busiest page on the site, and — the part
   * that actually matters — no protection at all when the origin is unwell. The API has been
   * observed answering 504 on every endpoint; today's ISR page keeps serving its last good render
   * through that, and a naively dynamic page would answer with an empty boutique instead.
   *
   * Keyed on the serialised query, so /shop, /shop?page=2 and /shop?brand=72 are three entries
   * rather than one wrong one. 300s to mirror the ISR window this replaces.
   *
   * loadForCache stays OUTSIDE: it converts a throw into an empty render, and if it were inside,
   * that empty render is what would be cached — the PR #77 empty-bake, moved rather than avoided.
   * Inside, the throw propagates, unstable_cache stores nothing, and the previous good page keeps
   * being served for the rest of the window.
   */
  const cachedShopPage = cachedShopPageFor(query);

  /*
   * ── THE OTHER THREE FETCHES ARE CACHED TOO, AND THEY WERE NOT ─────────────────────────────
   * `getShopFacets`, `getCategories` and `getInStockCount` all went through the module-scope axios
   * instance — XHR, invisible to Next's Data Cache — so nothing was memoising them. They share one
   * `Promise.all` and therefore cost max(latency) rather than the sum, but that is still three
   * origin round trips inside the TTFB of every request, including every pager click on a
   * 470-page series.
   *
   * Three different windows because they answer three different questions: a facet range moves
   * when a price changes (10 min), the six aisles move when somebody edits the catalogue tree
   * (1 hour), and the in-stock count moves whenever an order ships (5 min, matching the page).
   * The tags match what /api/revalidate already purges.
   */
  const cachedFacets = unstable_cache(() => getShopFacets(), ['shop-facets'], {
    revalidate: 600,
    tags: ['shop', 'products'],
  });
  const cachedCategories = unstable_cache(() => getCategories(), ['shop-categories'], {
    revalidate: 3600,
    tags: ['categories'],
  });
  const cachedInStockCount = unstable_cache(() => getInStockCount(), ['shop-in-stock-count'], {
    revalidate: 300,
    tags: ['shop', 'products'],
  });

  const [productsResponse, facets, categories, inStockCount] = await Promise.all([
    loadForCache(
      cachedShopPage,
      { products: [], brands: [], categories: [] } as Awaited<ReturnType<typeof getShopPage>>
    ),
    cachedFacets(),
    cachedCategories().catch(() => [] as Awaited<ReturnType<typeof getCategories>>),
    // See getInStockCount: 133 of 11,263 products are shippable, and the availability checkbox is
    // unreadable without that number printed next to it.
    cachedInStockCount(),
  ]);

  /*
   * ── getAllBrands() IS GONE FROM THIS PAGE, AND IT WAS COSTING MORE THAN IT LOOKED ────────
   *
   * It supplied the sidebar's brand checkboxes, and to do that it:
   *   • made SIX sequential API calls per render, because /api/all_brands is walked 100 rows at a
   *     time and there are 589 brands — on the busiest page on the site, against the origin whose
   *     php-fpm pool ran out earlier today;
   *   • put ~100 KB in the page, because each row carries logo, alt_cover, created_at and
   *     updated_at, and a filter checkbox renders none of those.
   *
   * /api/shop_facets already had to compute `brand_counts` for the numbers beside those checkboxes,
   * so it now returns the id/name/slug alongside them. One query it was already making, no extra
   * round trip, and the list is restricted to brands that HAVE a published product — 23 of the 589
   * do not, and a filter offering a value that can only ever return zero results is a dead end the
   * shopper has to discover by clicking it.
   *
   * The Brand type declares everything except id and designation_fr optional, so this is a
   * narrowing rather than a cast: what is dropped is what was never read.
   */
  const brands = facets.brands.map((b) => ({ id: b.id, designation_fr: b.designation_fr }));

  /*
   * ── THE BRAND LIST WAS BEING SERIALISED TWICE ───────────────────────────────────────────
   *
   * Measured on the live page: `designation_fr` appeared 1,269 times in the HTML, 1,212 of them in
   * a single RSC flight chunk. 566 of those are the brand rail above — and the other 566 were the
   * SAME brands travelling again inside `facets`, because the whole facets object was handed to the
   * client and it carries `brands` for this page to derive the rail from.
   *
   * Deriving and then also shipping the source is a bug that only ever shows up on a scale: at 84
   * brands it was 5 KB nobody would notice, and at 566 it is 36 KB of pure duplicate.
   *
   * `subcategories` goes the same way and for a blunter reason — the memo that read it was dead
   * code, computed on every render and consumed by nothing (see the note where it used to live).
   *
   * The fields are emptied rather than the type loosened: ShopFacets still describes what the
   * ENDPOINT returns, which is what a future consumer needs to know. What changes is only what this
   * page forwards, and it forwards exactly what it uses — price bounds, flavours and the two count
   * maps.
   */
  const facetsForClient = { ...facets, brands: [], subcategories: [] };

  /*
   * ── THE CATEGORY TREE, PROJECTED TO WHAT THE CLIENT ACTUALLY RENDERS ────────────────────
   *
   * The untrimmed /api/categories response is 17,502 bytes for 6 categories and 50 subcategories,
   * because every row carries sort_order, cover, cover_media, sitemap_include, sitemap_priority,
   * sitemap_changefreq, robots_index, seo_enabled, created_at and updated_at. ShopPageClient reads
   * three of those fields — slug, designation_fr, sous_categories — and renders none of the rest.
   *
   * Re-serialising just those is 4,023 bytes: ~13.5 KB saved raw, more once JSON-escaped into the
   * flight chunks, on every single request to the busiest page on the site. Same argument as the
   * `facetsForClient` projection above and the brand narrowing before it; this was the third copy
   * of the same mistake in one function.
   *
   * The FULL list stays in scope for `enrichProductsWithSubcategory`, which runs on the server and
   * does want the whole row.
   */
  const categoriesForClient = (categories ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    designation_fr: c.designation_fr,
    sous_categories: (c.sous_categories ?? []).map((sc) => ({
      id: sc.id,
      slug: sc.slug,
      designation_fr: sc.designation_fr,
    })),
  }));

  return {
    inStockCount,
    productsData: {
      products: productsResponse.products,
      brands: productsResponse.brands,
      categories: productsResponse.categories,
      pagination: productsResponse.pagination,
    },
    // facetsForClient, not facets: the brand list is already travelling as `brands` above, and
    // shipping the source it was derived from as well put 566 duplicate brand records in the page.
    facets: facetsForClient,
    // The server keeps `categories` (full rows) for enrichProductsWithSubcategory; the client gets
    // the projection.
    categories,
    categoriesForClient,
    brands,
  };
}

export default async function ShopPage({ searchParams }: PageProps) {
  const query = parseShopQuery(await searchParams);
  const { productsData, facets, categories, categoriesForClient, brands, inStockCount } =
    await getShopData(query);

  const baseUrl = getBaseUrl();
  const products = Array.isArray(productsData.products) ? productsData.products : [];

  const total = productsData.pagination?.total ?? products.length;
  const totalPages = Math.max(1, productsData.pagination?.last_page ?? 1);
  // Clamp: ?page=99999 must not render an empty grid and claim to be page 99999.
  const currentPage = Math.min(Math.max(1, productsData.pagination?.current_page ?? query.page), totalPages);

  /*
   * FOR HUMANS. This throw is after the shell has flushed, so Next turns it into a client-side
   * redirect embedded in the body and the status line stays 200 — which is exactly why the
   * INDEXING half of this problem is solved in `generateMetadata` with a robots directive instead
   * (read the note there before touching either). A browser still follows this and lands on the
   * last real page rather than on an empty grid, which is the whole job it has left.
   */
  if (productsData.pagination && query.page > totalPages && query.page !== totalPages) {
    permanentRedirect(buildShopUrl({ ...query, page: totalPages }));
  }

  // ONE builder, called from here and from /x-crawler/shop, so a bot and a shopper cannot be
  // served different structured data for the same URL. See util/shopJsonLd.ts.
  const schemas = buildShopSchemas({
    products,
    categories,
    currentPage,
    canonicalPath: shopCanonicalPath({ ...query, page: currentPage }),
    baseUrl,
  });

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <ShopPageClient
        productsData={productsData}
        categories={categoriesForClient as never}
        brands={brands}
        serverQuery={{ ...query, page: currentPage }}
        facets={facets}
        inStockCount={inStockCount}
        serverPagination={{ total, totalPages, currentPage, perPage: SHOP_PER_PAGE }}
      />
    </>
  );
}
