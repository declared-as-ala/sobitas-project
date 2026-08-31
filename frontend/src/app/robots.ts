import type { MetadataRoute } from 'next';

/**
 * robots.txt optimisé pour l'indexation classique et les robots d'IA.
 * @see https://developer.chrome.com/docs/lighthouse/seo/robots-txt/
 */
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
const ORIGIN = BASE_URL.replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  // Chemins à ne jamais indexer (sécurité et expérience utilisateur)
  const disallow: string[] = [
    /*
     * ── /cart /checkout /account /login /register /forgot-password /reset-password ARE NOT HERE ──
     *
     * They used to be, and it was the one thing keeping them permanently stuck in Search Console's
     * "Blocked by robots.txt" bucket, which no amount of validating can ever clear.
     *
     * All seven answer 200 with `noindex` today — verified 19/08/2026, as Googlebot:
     *     /cart              noindex, follow
     *     /checkout /account /login /register /forgot-password /reset-password
     *                        noindex, nofollow
     *
     * A Disallow does not remove a URL from the index, it removes Google's PERMISSION TO LOOK. So
     * a page that is both disallowed and noindex is in the worst possible state: Google keeps the
     * URL, cannot fetch it, and therefore can never discover the noindex that would drop it. And
     * every one of these is linked from the header or footer of every page on the site, so
     * discovery never stops either.
     *
     * Crawlable + noindex is Google's own documented answer, and it is the reasoning this file
     * already applies to the faceted /shop params below. The cost is a handful of crawls of pages
     * that render nothing without a session; the gain is that they leave the report instead of
     * sitting in it forever.
     *
     * What stays blocked below is machine paths and per-order URLs — none of them linked, so none
     * of them accumulating, and /order-confirmation carries an order id that should not be fetched
     * speculatively at all.
     */
    '/api/',
    // The Laravel API as this origin serves it: next.config.js rewrites /api-proxy/:path* to the
    // backend. Only `/api/` was listed, so every /api-proxy/** endpoint was fully crawlable —
    // measured 18/08/2026, /api-proxy/blog_tags and /api-proxy/all_articles both answered 200 JSON
    // with no X-Robots-Tag at all. JSON in the index is "Crawled - currently not indexed" bloat at
    // best, and it publishes the shape of every endpoint at worst.
    '/api-proxy/',
    '/admin',
    '/admin/',
    '/order-confirmation/',
    // Internal crawler-rewrite target (middleware routes bots here). Not meant to be
    // reached or indexed directly — belt-and-suspenders alongside the route's own noindex.
    '/x-crawler',
    '/x-crawler/',
    // NOTE: We intentionally do NOT Disallow the faceted query-param URLs
    // (?search=, ?brand=, ?category=, ?page=) any more.
    // Those variants are now served with `<meta robots="noindex,follow">` and a
    // clean rel=canonical (see app/shop/page.tsx). Blocking them in robots.txt
    // would PREVENT Googlebot from recrawling to SEE the noindex — which is exactly
    // why the previously-indexed `/shop?search=…` / `/shop?brand=…` URLs got stuck
    // in the index ("blocked by robots.txt" + duplicate buckets in Search Console).
    // Let them be crawled once so the noindex can drop them, then they fall out.
  ];

  // Liste exhaustive des robots d'IA majeurs à autoriser explicitement
  const aiBots = [
    'GPTBot',            // OpenAI (ChatGPT)
    'ChatGPT-User',      // Requêtes directes via ChatGPT
    'Google-Extended',   // Google Gemini & SGE
    'Claude-Web',        // Anthropic Claude
    'PerplexityBot',     // Perplexity AI
    'CCBot',             // Common Crawl (utilisé par de nombreux LLMs)
    'Omgilibot',         // Utilisé pour l'entraînement de données IA
    'FacebookBot',       // Meta AI
  ];

  return {
    rules: [
      // Règle générale pour tous les autres moteurs (Google, Bing, etc.)
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      // Configuration spécifique pour les robots d'IA
      ...aiBots.map((bot) => ({
        userAgent: bot,
        allow: '/',
        disallow, // On applique les mêmes blocages pour protéger les données privées
      })),
    ],
    /*
     * URL absolue du sitemap INDEX (et de lui seul).
     *
     * /sitemap.xml is a <sitemapindex> that points at the child sitemaps under /sitemaps/
     * (products-0.xml, listings.xml, blog.xml…). Declaring the index is enough: Google follows it
     * to every child, and the split stays a pure implementation detail we can rechunk freely.
     *
     * DO NOT add the children here. A child that is BOTH listed in robots.txt and reachable
     * through the index counts as submitted twice, which splits Search Console coverage across two
     * submission sources — destroying exactly the per-content-type diagnosability ("products
     * indexed" separately from "blog indexed") that the index split exists to buy.
     *
     * Nothing under /sitemaps/ is in `disallow` above, and it must stay that way: blocking the
     * children would make the index point at URLs Googlebot is forbidden to fetch.
     */
    sitemap: `${ORIGIN}/sitemap.xml`,
  };
}
