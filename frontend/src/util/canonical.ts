/**
 * SEO: canonical URLs and tracking-param stripping.
 * Use for alternates.canonical so search engines consolidate signals.
 */

const TRACKING_PARAM_PATTERN = /^(?:utm_[a-z_]*|fbclid|gclid|srsltid|msclkid|mc_[a-z_]*|ref|source)$/i;

/**
 * Base URL for the site (no trailing slash).
 */
export function getBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  return 'https://protein.tn';
}

/**
 * Removes known tracking/click-id query params from a URL search string.
 * Keeps pagination and legitimate filters (e.g. page, search, category, brand).
 */
export function stripTrackingParams(search: string): string {
  if (!search || !search.startsWith('?')) return '';
  const params = new URLSearchParams(search);
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (!TRACKING_PARAM_PATTERN.test(key)) {
      kept.set(key, value);
    }
  });
  const s = kept.toString();
  return s ? `?${s}` : '';
}

/**
 * Builds a full canonical URL for a path and optional query.
 * Query is stripped of tracking params only; page, search, category, brand are kept.
 */
export function buildCanonicalUrl(path: string, search?: string): string {
  const base = getBaseUrl();
  const pathPart = path.startsWith('/') ? path : `/${path}`;
  const cleanSearch = search ? stripTrackingParams(search.startsWith('?') ? search : `?${search}`) : '';
  return `${base}${pathPart}${cleanSearch}`;
}
