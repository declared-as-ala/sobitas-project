/**
 * Crawler detection for the "Feed the Crawler First" dynamic-rendering layer.
 *
 * ┌─ COMPLIANCE — READ THIS ─────────────────────────────────────────────────┐
 * │ This is DYNAMIC RENDERING, not cloaking. The crawler variant must show    │
 * │ the SAME substantive content, prices, and text that a human can reach —   │
 * │ it only changes DELIVERY: fully server-rendered HTML, no client JS/       │
 * │ hydration, every "read more"/tab/accordion expanded inline, and the       │
 * │ complete structured-data graph. Showing bots different prices, extra      │
 * │ keywords, or text hidden from users is cloaking and can get the whole     │
 * │ domain deindexed. Keep parity.                                            │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * We match on User-Agent. UA strings are trivially spoofable, but that is fine
 * here: the crawler variant is a lossless, content-equivalent projection of the
 * same page, so a spoofing user just gets a plainer (still correct) render.
 */

/**
 * User-Agent substrings (lowercased) for the crawlers we serve the SSR variant to.
 * Kept in sync with the AI bots explicitly allowed in app/robots.ts.
 */
const CRAWLER_UA_PATTERNS: readonly string[] = [
  // Search engines
  'googlebot',
  'google-inspectiontool',
  'storebot-google',
  'bingbot',
  'slurp', // Yahoo
  'duckduckbot',
  'yandex',
  'baiduspider',
  'sogou',
  'exabot',
  'facebot',
  'facebookexternalhit',
  'ia_archiver',
  'applebot',
  'petalbot',
  'seznambot',
  // Social / link unfurlers (benefit from clean OG + SSR)
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'pinterest',
  'redditbot',
  'discordbot',
  'embedly',
  'quora link preview',
  'skypeuripreview',
  // AI crawlers (same allow-list as robots.ts)
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'google-extended',
  'claude-web',
  'claudebot',
  'anthropic-ai',
  'perplexitybot',
  'ccbot',
  'omgilibot',
  'bytespider',
  'amazonbot',
  'cohere-ai',
  // Generic SEO / audit tools (harmless to serve the SSR variant)
  'ahrefsbot',
  'semrushbot',
  'mj12bot',
  'dotbot',
  'screaming frog',
  'lighthouse',
];

/** Returns true if the User-Agent belongs to a known crawler/bot. */
export function isCrawlerUA(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  // Fast path: almost every real crawler contains "bot", "spider", or "crawl".
  // We still check the explicit list for the ones that do not (slurp, whatsapp…).
  return CRAWLER_UA_PATTERNS.some((p) => ua.includes(p));
}

/**
 * Query flag that forces crawler mode for manual QA
 * (e.g. open a product page with `?__crawler=1` to preview the SSR variant,
 *  or paste the URL into Google's Rich Results Test which sends its own UA).
 */
export const CRAWLER_PREVIEW_PARAM = '__crawler';

/** Header name middleware uses to tell downstream server components a request is a crawler. */
export const CRAWLER_HEADER = 'x-is-crawler';
