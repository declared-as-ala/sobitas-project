import type { Product } from '@/types';
import { getProductStockStatus } from './cartStock';
import { getPriceDisplay } from './productPrice';

function normalized(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function coreTokens(product: Product): Set<string> {
  let name = ` ${normalized(product.designation_fr)} `;
  const brand = normalized(product.brand?.designation_fr ?? '');
  if (brand) name = name.split(` ${brand} `).join(' ');
  // "4.5KG" normalises to "4 5kg": split a number from the unit glued to it, or the format
  // survives as a token and "…GOLD STANDARD – 4.5KG" never matches "… – 2.27KG" (real names, 28/09).
  name = name.replace(/(\d)([a-z])/g, '$1 $2');
  // Remove complete formats, including decimal weights and counted capsules/servings.
  name = name.replace(/\b\d+(?: \d+)? (?:kg|g|gr|mg|ml|l|caps?|capsules?|gelules?|tabs?|tablets?|comprimes?|servings?|softgels?|doses?|sachets?)\b/g, ' ');
  return new Set(name.trim().split(/\s+/).filter(Boolean));
}

function buyable(product: Product): boolean {
  const status = getProductStockStatus(product);
  return !status.isUnknown && !status.isOutOfStock;
}

/** Match another size of the same named line, never merely another item from its category. */
export function findInStockSibling(product: Product, candidates: Product[]): Product | null {
  if (buyable(product) || product.brand_id == null) return null;
  const own = coreTokens(product);
  if (own.size < 2) return null;

  let best: Product | null = null;
  let bestShared = -1;
  for (const candidate of candidates) {
    if (candidate.id === product.id || candidate.brand_id !== product.brand_id || !buyable(candidate)) continue;
    const other = coreTokens(candidate);
    const shorter = own.size <= other.size ? own : other;
    const longer = shorter === own ? other : own;
    if (shorter.size < 2 || ![...shorter].every((token) => longer.has(token))) continue;
    const shared = shorter.size;
    if (shared > bestShared || (shared === bestShared && best &&
      getPriceDisplay(candidate).finalPrice < getPriceDisplay(best).finalPrice)) {
      best = candidate;
      bestShared = shared;
    }
  }
  return best;
}
