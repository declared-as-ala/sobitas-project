import { commercialSeoMap } from '@/config/commercialSeoMap';

/**
 * Same slug normalisation as getBlogSeoEntry: Next can hand the route an Arabic segment
 * percent-encoded, and the supporting lists in commercialSeoMap store it decoded. Without this the
 * five Arabic creatine posts (≈12,400 impressions in the 22/09 export) never matched their
 * category and rendered no in-stock product block (measured live 28/09).
 */
function normaliseSlug(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // A malformed escape keeps the raw value rather than failing the page.
  }
  return decoded.normalize('NFC');
}

/** The first declared commercial owner of an article wins. */
export function blogCommercialCategory(slug: string): string | null {
  const articlePath = `/blog/${normaliseSlug(slug)}`;
  for (const cluster of Object.values(commercialSeoMap)) {
    if (cluster.supporting.some((path) => path.normalize('NFC') === articlePath)) {
      return cluster.owner === '/' ? null : cluster.owner.slice(1);
    }
  }
  return null;
}
