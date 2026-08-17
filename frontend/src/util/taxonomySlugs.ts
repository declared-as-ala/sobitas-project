/**
 * THE LIVE CATEGORY/SUBCATEGORY SLUG SET, SO MIDDLEWARE CAN STOP GUESSING.
 *
 * ── THE 301-INTO-A-404 THAT THIS EXISTS TO END ────────────────────────────────────────────────
 * `resolveShopSlug` ended with:
 *
 *     // No numeric suffix: the slug may be a category served at /{slug}
 *     return `/${slug}`;
 *
 * "may be" is doing all the work there. When a product is discontinued the slug is not a category
 * either, so `/shop/monster-energy-drink` answered 301 → `/monster-energy-drink` → 404. Measured
 * against production on 14/08/2026, that is the single largest shape in the Search Console
 * "Not found (404)" bucket of 1,060 pages:
 *
 *     /shop/monster-energy-drink          301 → /monster-energy-drink          404
 *     /shop/carbo-z-mass-gainer-3-kg      301 → /carbo-z-mass-gainer-3-kg      404
 *     /products/100-isolate/reviews       301 → /100-isolate                   404
 *     /creatine/gold-creatine-300g        308 → /gold-creatine-300g            404
 *
 * A 301 into a 404 is strictly worse than the 404 it replaced: Google spends a hop, caches the
 * redirect, and still finds nothing — and the hop hides the real status from every report.
 *
 * With the real slug set in hand the middleware can tell the two cases apart, which is the whole
 * point: `/shop/omega-3` IS a category and must keep redirecting, while `/shop/monster-energy-drink`
 * is a product that no longer exists and must not pretend otherwise.
 *
 * ── WHAT A DISCONTINUED PRODUCT SHOULD ANSWER ────────────────────────────────────────────────
 * Google's own guidance for a product that is gone is a redirect to a RELEVANT page, and a 404/410
 * when no relevant page exists. An irrelevant redirect is treated as a soft 404 and earns nothing,
 * so `bestCategoryForSlug` demands a real token overlap rather than sending everything to /shop —
 * "carbo-z-mass-gainer-3-kg" shares `gainer` with Gainers Protéinés and that is a genuine answer;
 * a slug that shares nothing gets 410 Gone, which is the honest status and the one that empties the
 * bucket fastest.
 *
 * ── FAILS OPEN, ALWAYS ────────────────────────────────────────────────────────────────────────
 * Same contract as adminRedirects.ts. Any network or parse error yields `null` — "I do not know" —
 * never an empty set. An empty set read as fact would mean every product URL on the site is
 * suddenly "not a category", and the middleware would start 410-ing live pages during a backend
 * hiccup. Unknown must never be spendable as evidence of absence.
 */

const TTL_MS = 10 * 60 * 1000; // 10 minutes. The taxonomy changes a few times a year.

type Taxonomy = {
  /** Every category and subcategory slug that resolves at /{slug}. */
  slugs: Set<string>;
  /** slug → significant tokens of its display name, for the relevance match. */
  terms: Map<string, Set<string>>;
};

let cache: Taxonomy | null = null;
let cacheAt = 0;
let inflight: Promise<void> | null = null;

function apiBase(): string {
  return (
    process.env.API_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL?.replace('/api-proxy', '') ||
    'https://admin.protein.tn/api'
  );
}

/** Accent-fold to one ASCII character each, so "protéines" and "proteines" are one token. */
const FOLD: Record<string, string> = {
  à: 'a', â: 'a', ä: 'a', á: 'a', ã: 'a', å: 'a',
  ç: 'c',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', ö: 'o', õ: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ÿ: 'y', ñ: 'n',
};

/**
 * Words that cannot discriminate between categories on THIS site.
 *
 * "proteine" is in a large share of the taxonomy, so scoring on it would match every dead protein
 * slug to whichever protein category happened to sort first — a confident-looking wrong answer,
 * which is worse than 410 because it spends the redirect and earns a soft 404.
 */
const STOPWORDS = new Set([
  'tunisie', 'prix', 'pas', 'cher', 'acheter', 'vente', 'boutique', 'sport', 'sportive',
  'les', 'des', 'une', 'aux', 'par', 'sur', 'que', 'qui', 'pour', 'avec', 'sans', 'dans',
  'and', 'the', 'for', 'kit', 'pack', 'new', 'pro', 'plus', 'max', 'gold', 'best', 'ultra',
  // Unit and size noise: every product slug carries these and no category does.
  'kg', 'gr', 'gramme', 'grammes', 'caps', 'capsules', 'tabs', 'tablets', 'softgels',
  'ml', 'servings', 'packs', 'scoops',
]);

/**
 * Crude singular/adjective stem: drop a trailing "s", then a trailing "e".
 *
 * Product slugs and category names disagree about number and gender constantly — `protein-80-2-2kg`
 * against the category "Protéines", `vitamin-d3` against "Vitamines", `gainer` against "Gainers
 * Protéinés". Exact token equality misses every one of those, and each miss is a 410 on a URL that
 * had an obviously right home. A full stemmer is not worth the dependency for a set of ~60 category
 * names; this handles the only inflection that actually occurs here.
 */
function stem(word: string): string {
  return word.replace(/s$/, '').replace(/e$/, '');
}

function tokens(text: string): Set<string> {
  const folded = [...text.toLowerCase()].map((c) => FOLD[c] ?? c).join('');
  return new Set(
    folded
      .split(/[^a-z0-9]+/)
      // 3+, not 4+: "zma", "eaa", "bcaa" and "cla" are whole categories here.
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
      .map(stem)
  );
}

type ApiNode = {
  slug?: string | null;
  designation_fr?: string | null;
  name?: string | null;
  sous_categories?: ApiNode[] | null;
  subcategories?: ApiNode[] | null;
  children?: ApiNode[] | null;
};

function walk(nodes: ApiNode[] | null | undefined, out: Taxonomy): void {
  if (!Array.isArray(nodes)) return;

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;

    const slug = typeof node.slug === 'string' ? node.slug.trim() : '';
    if (slug) {
      out.slugs.add(slug);
      const name = node.designation_fr || node.name || '';
      // The SLUG's own words count too: a category named "PRISE DE MASSE" with slug
      // `prise-de-masse` should match a dead slug containing "masse" either way.
      out.terms.set(slug, new Set([...tokens(name), ...tokens(slug)]));
    }

    walk(node.sous_categories, out);
    walk(node.subcategories, out);
    walk(node.children, out);
  }
}

async function refresh(): Promise<void> {
  try {
    const res = await fetch(`${apiBase()}/categories?per_page=200`, {
      signal: AbortSignal.timeout(4000),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return;

    const body: unknown = await res.json();
    const rows = Array.isArray(body)
      ? body
      : Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data: ApiNode[] }).data)
        : null;
    if (!rows) return;

    const next: Taxonomy = { slugs: new Set(), terms: new Map() };
    walk(rows, next);

    // A response that parsed but produced nothing is a backend problem, not an empty taxonomy.
    // Keeping the previous cache is the fail-open behaviour; adopting the empty one would tell
    // middleware that every category on the site had ceased to exist.
    if (next.slugs.size === 0) return;

    cache = next;
    cacheAt = Date.now();
  } catch {
    // Swallowed on purpose. See the fail-open note in the file docblock.
  }
}

async function taxonomy(): Promise<Taxonomy | null> {
  const fresh = cache !== null && Date.now() - cacheAt < TTL_MS;
  if (fresh) return cache;

  // Stale-while-revalidate once warm; block only on the very first call after boot.
  if (cache !== null) {
    if (!inflight) {
      inflight = refresh().finally(() => {
        inflight = null;
      });
    }
    return cache;
  }

  if (!inflight) {
    inflight = refresh().finally(() => {
      inflight = null;
    });
  }
  await inflight;

  return cache;
}

/**
 * Is `slug` a real category or subcategory served at `/{slug}`?
 *
 * `null` means "could not find out" — the caller must fall through to the page rather than act on
 * it. Only `false` is a positive statement that the slug is not taxonomy.
 */
export async function isTaxonomySlug(slug: string): Promise<boolean | null> {
  const tax = await taxonomy();
  if (!tax) return null;

  return tax.slugs.has(slug);
}

/**
 * The most relevant category for a slug that is no longer a product, or null when nothing is
 * relevant enough to be worth a redirect.
 *
 * Scoring is intentionally blunt — one shared significant token is enough — because the input is a
 * slug, not a document, and anything cleverer would be unauditable from a middleware log.
 *
 * ONE token, not two, and that is a deliberate trade. "gold-creatine-300g" reduces to a single
 * significant token once `gold` is dropped as a stopword and `300g` as a number, and Créatine is
 * plainly its right home; a two-token rule would 410 it. The cost is the occasional loose match
 * (fitness gloves landing on Cardio & Fitness rather than an accessories rayon), which is still a
 * live, on-topic page for the visitor and for the crawler.
 *
 * What the threshold DOES refuse is the thing that matters: "monster-energy-drink" shares nothing
 * with any category, so it gets 410 rather than a lazy redirect to /shop. An irrelevant redirect is
 * treated as a soft 404 — it spends the hop and earns nothing — so a wrong guess here is worse than
 * an honest gone.
 */
export async function bestCategoryForSlug(slug: string): Promise<string | null> {
  const tax = await taxonomy();
  if (!tax) return null;

  const want = tokens(slug);
  if (want.size === 0) return null;

  let bestSlug: string | null = null;
  let bestScore = 0;

  for (const [candidate, have] of tax.terms) {
    let score = 0;
    for (const t of want) if (have.has(t)) score++;

    // Ties go to the MORE SPECIFIC category — the one whose own name is shortest — so a dead
    // creatine product lands on /creatine rather than on a broad parent that also matched.
    if (score > bestScore || (score === bestScore && score > 0 && bestSlug !== null && candidate.length < bestSlug.length)) {
      bestScore = score;
      bestSlug = candidate;
    }
  }

  return bestScore >= 1 ? bestSlug : null;
}

/* ── BRANDS ───────────────────────────────────────────────────────────────────────────────────
 *
 * Brand landing pages are served at `/{slug}` by the same `(shop)/[slug]` route as categories, so
 * middleware needs the same yes/no/unknown answer about them — and for the same reason.
 *
 * The Search Console export carries 105 legacy brand URLs in two shapes the old site emitted:
 *
 *     /brand/JX FITNESS/52          name with a space, and a trailing numeric id
 *     /brands/soul-project          already slugified
 *
 * Both were answered by `{ source: '/brand/:path+', destination: '/brands', permanent: true }` in
 * redirects.js — every one of them landing on the brand INDEX. Google documents a redirect to an
 * irrelevant page as a soft 404: the hop is spent, the URL is not dropped and not indexed, it just
 * moves from the "Not found" bucket to "Page with redirect". That is the shape that makes a
 * coverage report stop improving, and it is why this set has to exist: slugifying the name is easy,
 * but 301ing to `/jx-fitness` without knowing whether that brand exists just re-creates the
 * 301-into-a-404 this whole file was written to end.
 *
 * Same three-valued contract as `isTaxonomySlug`, and it matters more here than anywhere: `null`
 * means the brand list could not be read, and acting on it would 410 live brand pages during a
 * backend hiccup.
 */

const BRAND_TTL_MS = 10 * 60 * 1000;

let brandCache: Set<string> | null = null;
let brandCacheAt = 0;
let brandInflight: Promise<void> | null = null;

/** Mirrors `rawBrandSlug` in util/brandSlug.ts. Duplicated rather than imported: this module is
 *  reached from middleware, where the import graph is the bundle, and brandSlug.ts is shipped to
 *  the client. The two are checked against each other by scripts/check-gsc-coverage.mjs. */
function slugifyBrandName(name: string): string {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
}

async function refreshBrands(): Promise<void> {
  try {
    const next = new Set<string>();

    /* Paginated on purpose. `/all_brands` returns `data` with no total a caller can see, which is
       exactly how 124 blog articles once stayed out of the sitemap: half a list returned as if it
       were whole.

       ── AND THE CAP DID IT ANYWAY ────────────────────────────────────────────────────────────
       The guard was `page <= 5` under the note "128 brands over 100-row pages is two requests".
       That was true when it was written and stopped being true when the imported catalogue landed.
       Counted against production on 17/08/2026: 589 brands over six pages, so the loop read 500 and
       silently dropped page six — every brand from `Sunlipid` to `ZUMUB`, 89 of them, reported to
       middleware as NOT A BRAND.

       That is not a cosmetic truncation. `isBrandSlug` is what stops a legacy /brand/{name} URL
       being 410'd, so the tail of the alphabet was answered Gone while its landing page returned
       200 to anyone who typed the URL:

           /brand/Universal%20Nutrition/25   410        /universal-nutrition   200
           /brand/MUTANT/15                  301 → /mutant                     (page 4, fine)

       30 pages rather than 6 so the guard is a runaway-loop backstop again rather than a live
       ceiling — the loop already stops on the first short or empty page, which is what actually
       ends it. A cap sized to today's row count is a cap that expires. */
    for (let page = 1; page <= 30; page++) {
      const res = await fetch(`${apiBase()}/all_brands?per_page=100&page=${page}`, {
        signal: AbortSignal.timeout(4000),
        headers: { accept: 'application/json' },
      });
      if (!res.ok) return;

      const body: unknown = await res.json();
      const rows: unknown = Array.isArray(body) ? body : (body as { data?: unknown })?.data;
      if (!Array.isArray(rows) || rows.length === 0) break;

      for (const row of rows as Array<{ designation_fr?: string; slug?: string }>) {
        const slug = slugifyBrandName(row?.slug || row?.designation_fr || '');
        if (slug) next.add(slug);
      }
      if (rows.length < 100) break;
    }

    // Parsed but empty is a backend problem, not a site with no brands. Keep the previous cache.
    if (next.size === 0) return;

    brandCache = next;
    brandCacheAt = Date.now();
  } catch {
    // Fail open. See the docblock at the top of this file.
  }
}

/**
 * Is `slug` a real brand served at `/{slug}`?
 *
 * `null` means "could not find out" — never spendable as evidence of absence.
 */
export async function isBrandSlug(slug: string): Promise<boolean | null> {
  const fresh = brandCache !== null && Date.now() - brandCacheAt < BRAND_TTL_MS;
  if (!fresh) {
    if (!brandInflight) {
      brandInflight = refreshBrands().finally(() => {
        brandInflight = null;
      });
    }
    // Stale-while-revalidate once warm; block only on the very first call after boot.
    if (brandCache === null) await brandInflight;
  }

  if (brandCache === null) return null;
  return brandCache.has(slug);
}
