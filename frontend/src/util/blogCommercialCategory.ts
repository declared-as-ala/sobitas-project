import { commercialSeoMap } from '@/config/commercialSeoMap';

/** The first declared commercial owner of an article wins. */
export function blogCommercialCategory(slug: string): string | null {
  const articlePath = `/blog/${slug}`;
  for (const cluster of Object.values(commercialSeoMap)) {
    if (cluster.supporting.includes(articlePath)) {
      return cluster.owner === '/' ? null : cluster.owner.slice(1);
    }
  }
  return null;
}
