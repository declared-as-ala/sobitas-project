/**
 * Unique French description fallback for brand landing pages.
 *
 * WHY: brand pages whose `description_fr` is empty render no copy at all, leaving a thin page
 * that Google buckets as "Crawled - currently not indexed". This builds a distinct paragraph
 * from REAL data derived from the brand's own product list (product count, real category names,
 * real min price). It never fabricates: missing values are simply omitted from the sentence.
 */

export interface BrandDescriptionFallbackInput {
  /** Brand display name, e.g. "Optimum Nutrition". */
  name: string;
  /** Number of products this brand has on the page (real count). */
  productCount?: number;
  /** Real category names the brand's products belong to, most prominent first. */
  topCategories?: string[];
  /** Lowest effective price (DT) among the brand's products, if known. */
  priceMin?: number | null;
}

/** "A", "A et B", "A, B et C" — French enumeration. */
function frenchList(items: string[]): string {
  const list = items.filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} et ${list[list.length - 1]}`;
}

function uniqueTrimmed(items: string[], max: number): string[] {
  return [...new Set(items.map((s) => (s || '').trim()).filter(Boolean))].slice(0, max);
}

export function generateBrandDescriptionFallback({
  name,
  productCount,
  topCategories = [],
  priceMin,
}: BrandDescriptionFallbackInput): string {
  const brand = (name || '').trim() || 'cette marque';
  const count = typeof productCount === 'number' && productCount > 0 ? productCount : null;
  const cats = frenchList(uniqueTrimmed(topCategories, 3));
  const hasPrice = typeof priceMin === 'number' && Number.isFinite(priceMin) && priceMin > 0;

  // Sentence 1 — offer + real count + real min price.
  const s1parts: string[] = [
    count
      ? `Retrouvez ${count} produits ${brand} disponibles en Tunisie`
      : `Retrouvez les produits ${brand} disponibles en Tunisie`,
  ];
  if (hasPrice) s1parts.push(`à partir de ${Math.round(priceMin as number)} DT`);
  const s1 = `${s1parts.join(' ')}.`;

  // Sentence 2 — real categories the brand covers (topical depth + internal signals).
  const s2 = cats ? `La marque ${brand} est présente dans nos gammes ${cats}.` : '';

  // Sentence 3 — trust close (brand-consistent, no fabricated stats).
  const s3 =
    'Produits 100% authentiques et importés officiellement, avec livraison 24-72h partout en Tunisie et paiement à la livraison.';

  return [s1, s2, s3].filter(Boolean).join(' ');
}
