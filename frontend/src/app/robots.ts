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
    '/api/',
    '/admin',
    '/admin/',
    '/order-confirmation/',
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
