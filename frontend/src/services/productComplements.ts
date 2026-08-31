/**
 * Fetches the two or three products that actually complete this one's basket.
 *
 * The WHICH is decided in util/productComplements.ts — a curated shelf-to-shelf map, and the
 * docblock there explains why it is curated rather than computed. This file is only the HOW, and
 * the how has one interesting decision in it.
 *
 * ── WHY NOT `getProductsBySubCategory`, THE OBVIOUS CALL ────────────────────────────────────
 * It is the function the page already uses for "similar products", and reaching for it here would
 * have been a 400ms mistake per render. MEASURED against the live API on 17/08/2026:
 *
 *     /productsBySubCategoryId/accessoires     29 KB     15 products
 *     /productsBySubCategoryId/creatine       366 KB    213 products
 *     /productsBySubCategoryId/vitamines    2,976 KB  1,861 products
 *
 * That endpoint IGNORES `per_page` — the 1,861-row response above was a request for 100 — so a
 * health product asking for one vitamin to suggest downloads 2.9 MB to use 1.5 KB of it. It is
 * also over Next's 2 MB per-entry fetch-cache ceiling, so it would not even be cached: every ISR
 * revalidation of every health product page would pull the whole shelf again. This is the same
 * payload that makes /vitamines take 16.9s.
 *
 * `/all_products` filters SERVER-SIDE on exactly the three axes this needs — `subcategories` (by
 * slug), `in_stock=1`, and a `per_page` it actually honours — and `light=1` drops the 566-brand
 * array from the response. The same question costs 3 KB.
 *
 * ── IN STOCK IS A FILTER, NOT A POST-FILTER ────────────────────────────────────────────────
 * 10,535 of 10,669 published products are catalogue entries the shop does not physically hold, so
 * a bundle builder that fetched the first few products of a shelf and then filtered would return
 * empty on almost every shelf. `in_stock=1` asks the database instead. Creatine has 213 products
 * and 8 of them are addable; this asks for the 8.
 *
 * ── ONE PRODUCT PER SHELF, WHICH IS THE ENTIRE POINT ───────────────────────────────────────
 * A single query for all three slugs would be one round trip instead of three, and it would return
 * four creatines — the sort does not know it is meant to spread across shelves. Suggesting a whey,
 * a creatine and a shaker rather than three of one thing is the defect this whole change exists to
 * fix, so the fan-out is deliberate: one query per shelf, first row wins, three queries of 3 KB.
 */
import type { Product } from '@/types';
import { apiFetch } from '@/services/http';
import { isInStock } from '@/util/cartStock';
import { complementSubCategorySlugs } from '@/util/productComplements';

/** The block renders at most three companions; see FrequentlyBoughtTogether. */
const SLOTS = 3;

/**
 * One extra shelf beyond what we need, so a shelf that has gone out of stock costs a slot rather
 * than the whole block. Four 3 KB queries is still an eighth of one `similar_products` call.
 */
const SHELVES_TRIED = 4;

/** Two rows per shelf: the second is the fallback when the first collides with the product itself. */
const PER_SHELF = 2;

/**
 * The shop's own popularity order. Not price — "cheapest first" is what the previous version of
 * this block did, and on a shelf of 8 creatines it reliably surfaced the 39 DT unknown over the
 * Optimum Nutrition everybody came for.
 */
const SORT = 'popularity';

type LightList = {
  products?: Product[] | { data?: Product[] };
};

async function shelf(slug: string): Promise<Product[]> {
  const path =
    `all_products?subcategories=${encodeURIComponent(slug)}` +
    `&in_stock=1&per_page=${PER_SHELF}&light=1&sort=${SORT}`;
  try {
    /* An hour. These are shelf HEADS, not stock levels — the block re-checks `isInStock` on what
       comes back, and the buy box on the product's own page is the thing that must be fresh. */
    const data = await apiFetch<LightList>(path, { revalidate: 3600 });
    const raw = data?.products;
    return Array.isArray(raw) ? raw : (raw?.data ?? []);
  } catch {
    /* A shelf that 404s or times out costs one slot, never the page. */
    return [];
  }
}

export async function getComplementProducts(product: Product | null | undefined): Promise<Product[]> {
  /* The block cannot render for a product that is not itself addable, so do not pay for it. This
     is the guard that keeps the cost off 10,535 of 10,669 product pages. */
  if (!product?.id || !isInStock(product)) return [];

  const slugs = complementSubCategorySlugs(product).slice(0, SHELVES_TRIED);
  if (slugs.length === 0) return [];

  const shelves = await Promise.all(slugs.map(shelf));

  const picked: Product[] = [];
  const seen = new Set<number | string>([product.id]);

  for (const rows of shelves) {
    if (picked.length >= SLOTS) break;
    const best = rows.find((row) => row?.id && !seen.has(row.id) && isInStock(row));
    if (!best) continue;
    seen.add(best.id);
    picked.push(best);
  }

  return picked;
}
