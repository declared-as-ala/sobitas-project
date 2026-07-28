import { getProductPrimarySubCategory } from '@/util/productUrl';
import type { Product } from '@/types';

/**
 * A factual, per-brand intro paragraph built from the brand's own catalogue.
 *
 * WHY: all 55 brand pages were content-free — a median of 39 words for Googlebot, being an H1, a
 * breadcrumb and a bare product list. There is no brand description anywhere in the data model
 * that the API exposes, so there was nothing to render. Thin, near-identical pages across 55 URLs
 * is exactly the "scaled content" pattern Google discounts, and it wastes the brand+geo queries
 * ("dymatize tunisie", "ostrovit tunisie") that these pages exist to win.
 *
 * Rather than block on someone writing 55 descriptions, this states what is verifiably TRUE from
 * the catalogue: how many products, which categories they fall in, and the price range. That is
 * genuinely useful to a shopper deciding whether the brand is worth browsing, it differs per
 * brand, and it needs no maintenance — it tracks the catalogue automatically.
 *
 * It is a floor, not a ceiling: an admin-written description should override this when one exists.
 * Nothing here is invented — no claims about quality, origin or reputation.
 */
export function buildBrandIntroHtml(brandName: string, products: Product[]): string | null {
  const list = (products ?? []).filter((p) => p && p.designation_fr);
  if (list.length === 0) return null;

  const name = brandName.trim();

  // Distinct categories this brand actually sells into, in catalogue order.
  const categories: string[] = [];
  for (const p of list) {
    const label = getProductPrimarySubCategory(p)?.designation_fr?.trim();
    if (label && !categories.includes(label)) categories.push(label);
  }

  const prices = list
    .map((p) => Number((p as { prix?: unknown }).prix))
    .filter((n) => Number.isFinite(n) && n > 0);

  const sentences: string[] = [];

  const countLabel = list.length === 1 ? '1 produit' : `${list.length} produits`;
  sentences.push(
    `Retrouvez ${countLabel} ${escapeHtml(name)} en Tunisie sur Protein.tn.`,
  );

  if (categories.length > 0) {
    const shown = categories.slice(0, 5).map(escapeHtml);
    const joined = shown.length > 1
      ? `${shown.slice(0, -1).join(', ')} et ${shown[shown.length - 1]}`
      : shown[0];
    sentences.push(`La gamme couvre ${joined}.`);
  }

  if (prices.length > 0) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    sentences.push(
      min === max
        ? `Prix : ${formatTnd(min)}.`
        : `Prix de ${formatTnd(min)} à ${formatTnd(max)}.`,
    );
  }

  sentences.push(
    'Produits 100% authentiques, livraison 24-72h partout en Tunisie et paiement à la livraison.',
  );

  return `<p>${sentences.join(' ')}</p>`;
}

function formatTnd(value: number): string {
  return `${value.toFixed(3).replace(/\.?0+$/, '')} TND`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
