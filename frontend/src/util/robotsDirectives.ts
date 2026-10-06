/**
 * One robots shape for every page that sets its own `robots` metadata.
 *
 * WHY THIS EXISTS: Next.js does not merge `robots` — a page that sets `robots: { index, follow }`
 * REPLACES the root layout's whole object, `googleBot` included. Every product, brand, category
 * and blog page set its own robots, so all of them lost `max-image-preview:large` (measured
 * 05/10/2026) while Google Images had grown to ~40% of impressions. Without that directive Google
 * may only show a thumbnail-sized preview of our images in Discover / Images.
 *
 * `googleBot.index` / `googleBot.follow` mirror the arguments, so a noindex page stays noindex
 * for Googlebot too — the preview directives only ever widen what an indexable page may show.
 */
export type SeoRobots = {
  index: boolean;
  follow: boolean;
  googleBot: {
    index: boolean;
    follow: boolean;
    'max-image-preview': 'large';
    'max-snippet': -1;
    'max-video-preview': -1;
  };
};

export function seoRobots(index: boolean, follow = true): SeoRobots {
  return {
    index,
    follow,
    googleBot: {
      index,
      follow,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}
