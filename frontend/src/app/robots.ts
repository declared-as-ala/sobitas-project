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
    '/account',
    '/account/',
    '/checkout',
    '/checkout/',
    '/cart',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/api/',
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
    // URL absolue du sitemap pour Lighthouse
    sitemap: `${ORIGIN}/sitemap.xml`,
  };
}
