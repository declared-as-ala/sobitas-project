/**
 * Unique French intro fallback for category / subcategory landing pages.
 *
 * WHY: pages whose admin/content-file intro is empty ship near-identical boilerplate,
 * which Google buckets as "Crawled - currently not indexed" (thin / duplicate content).
 * This builds a distinct 2-3 sentence paragraph by interpolating REAL data from the page's
 * own product list (product count, real brand names, real min price, real subcategory names).
 * It never fabricates: every number/name is passed in from live data, and missing values are
 * simply omitted from the sentence.
 */

export interface CategoryIntroFallbackInput {
  /** Category / subcategory display name (the H1), e.g. "Whey Protéine". */
  name: string;
  /** Number of products available to the page (real count). */
  productCount?: number;
  /** Real brand names present in the product list, most prominent first. */
  topBrands?: string[];
  /** Lowest effective price (DT) among the products, if known. */
  priceMin?: number | null;
  /** Names of this category's subcategories, if any. */
  subcategoryNames?: string[];
}

/** Strip a trailing " Tunisie" so we don't render "Whey Tunisie en Tunisie". */
function cleanName(name: string): string {
  return (name || '').replace(/\s+tunisie\s*$/i, '').trim();
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

export function generateCategoryIntroFallback({
  name,
  productCount,
  topBrands = [],
  priceMin,
  subcategoryNames = [],
}: CategoryIntroFallbackInput): string {
  const label = cleanName(name) || 'compléments';
  const count = typeof productCount === 'number' && productCount > 0 ? productCount : null;
  const brands = frenchList(uniqueTrimmed(topBrands, 3));
  const subs = frenchList(uniqueTrimmed(subcategoryNames, 3));
  const hasPrice = typeof priceMin === 'number' && Number.isFinite(priceMin) && priceMin > 0;

  // Sentence 1 — offer + real count + real min price.
  const s1parts: string[] = [
    count
      ? `Découvrez notre sélection de ${count} produits ${label} en Tunisie`
      : `Découvrez notre sélection ${label} en Tunisie`,
  ];
  if (hasPrice) s1parts.push(`à partir de ${Math.round(priceMin as number)} DT`);
  const s1 = `${s1parts.join(' ')}.`;

  // Sentence 2 — real brands and/or real subcategories for topical depth + internal signals.
  let s2 = '';
  if (brands && subs) {
    s2 = `Retrouvez les marques ${brands} et explorez nos gammes ${subs}.`;
  } else if (brands) {
    s2 = `Retrouvez les meilleures marques comme ${brands}, sélectionnées pour leur qualité.`;
  } else if (subs) {
    s2 = `Explorez nos différentes gammes : ${subs}.`;
  }

  // Sentence 3 — trust close (brand-consistent, no fabricated stats).
  const s3 =
    'Livraison 24-72h partout en Tunisie, produits 100% authentiques et paiement à la livraison.';

  return [s1, s2, s3].filter(Boolean).join(' ');
}
