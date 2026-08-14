/**
 * Build the "compare with similar products" table.
 *
 * ── WHY A TABLE AND NOT A LIST ────────────────────────────────────────────────────────────
 * The crawler view already linked to same-category products, as bare bullets. That helps crawl
 * depth and helps a shopper not at all: the question someone actually has on a whey page is "which
 * of these, and why", and a list of names answers none of it. A table with brand, format, price and
 * availability answers it in one glance, and it is built entirely from facts we already own — no
 * external source, no barcode, no waiting.
 *
 * ── WHAT IT REFUSES TO COMPUTE ────────────────────────────────────────────────────────────
 * No price-per-kilo column. It is the most useful thing this table could show and the easiest to get
 * catastrophically wrong: the format has to be read out of the product NAME, and the catalogue
 * already contains a product whose title says "2.267 kg" while its heading says "2,267 g" — a
 * thousandfold disagreement about the same tub. Dividing by that produces 0,13 DT/kg or 130 DT/kg
 * with equal confidence.
 *
 * So the format is REPORTED, exactly as the name states it, never used as an operand. When
 * structured net contents exist (transcribed from the label into nutrition_facts), a per-unit price
 * becomes defensible — and that is a reason to transcribe, not a reason to guess now.
 */
import type { Product } from '@/types';
import { getPriceDisplay } from './productPrice';
import { isInStock } from './cartStock';
import { getProductLink, getProductPrimarySubCategory } from './productUrl';

export type ComparisonRow = {
  id: number | string;
  name: string;
  url: string;
  brand: string;
  /**
   * The comparator's OWN subcategory, and a link to it.
   *
   * Owner: *"in the table of comparison there is a bug, it's not showing the other categories and
   * prices."* Both halves were real. `/similar_products` has always sent
   * `sous_categorie: {id, slug, designation_fr}` on every row and `row()` simply never read it, so
   * the table could not show a category — while the caption above it named the CURRENT product's
   * subcategory, which the rows do not necessarily share. A Googlebot fetch showed
   * "Autres barres & snacks protéinés" printed above four whey proteins.
   *
   * Showing each row's real category also adds 4-6 internal links to category pages from every one
   * of ~11,263 product pages, which is the crawl surface this table sits on.
   */
  category: string;
  categoryUrl: string;
  /** As printed in the product name, e.g. "2.27 kg" or "90 gélules". Empty when the name says nothing. */
  format: string;
  price: number;
  /**
   * The pre-promotion price, when there is one.
   *
   * `getPriceDisplay` has always returned it and this builder destructured `{finalPrice, hasPromo}`
   * and dropped it on the next line — so a discounted comparator could say the word "promo" and
   * never say what it was reduced FROM. On a table whose entire job is comparing prices, the
   * saving is the number the reader came for.
   */
  oldPrice: number | null;
  hasPromo: boolean;
  inStock: boolean;
  isCurrent: boolean;
};

/**
 * Pack size as the product name states it.
 *
 * Deliberately conservative. It matches a number followed by a unit and nothing else — no inference
 * from "family size", no summing "2 x 500 g", no unit conversion. An unreadable name yields '' and
 * the cell shows a dash, which is honest; a guess would not be.
 */
export function extractFormat(name: string | null | undefined): string {
  if (!name) return '';

  /*
   * Unit order matters: longer alternatives first.
   *
   * `gr` must precede `g`, or "500GR" fails entirely — `g` matches the G, then \b sees the R and
   * rejects, and the whole alternation gives up at that position. Measured against all 303 product
   * names: adding `gr` and `softgel` took format extraction from 62% to 67%, because "500GR" and
   * "240 softgel" are how this catalogue actually writes itself.
   *
   * The remaining third is correct behaviour, not a gap to close: pre-workouts, packs and gym
   * equipment have no size in their names, and those cells show a dash. Widening the regex until
   * they match would mean inventing a format, which is the failure this whole file is shaped to
   * avoid.
   */
  const match = name.match(
    /(\d+(?:[.,]\d+)?)\s*(kg|mg|grs?|g|ml|cl|l|gélules?|gelules?|softgels?|capsules?|comprimés?|comprimes?|caps|tabs|tablets?|sachets?|portions?|doses?|servings?)\b/i
  );
  if (!match) return '';

  const value = match[1].replace('.', ',');
  const unit = normaliseUnit(match[2]);

  return `${value} ${unit}`;
}

/** French, lowercase, singular-or-plural as the shop writes it. Unknown units pass through. */
function normaliseUnit(raw: string): string {
  const u = raw.toLowerCase();
  if (u === 'kg' || u === 'g' || u === 'mg' || u === 'ml' || u === 'cl' || u === 'l') return u;
  // "500GR" and "500G" are the same tub written two ways; the table should not imply otherwise.
  if (u === 'gr' || u === 'grs') return 'g';
  if (u.startsWith('softgel')) return 'capsules molles';
  if (u.startsWith('gél') || u.startsWith('gel')) return 'gélules';
  if (u.startsWith('caps')) return 'capsules';
  if (u.startsWith('comprim') || u === 'tabs' || u.startsWith('tablet')) return 'comprimés';
  if (u.startsWith('sachet')) return 'sachets';
  if (u.startsWith('portion') || u.startsWith('serving')) return 'portions';
  if (u.startsWith('dose')) return 'doses';
  return u;
}

/**
 * The current product first, then its siblings.
 *
 * The current product is included on purpose: a comparison table that omits the thing you are
 * looking at makes the reader hold it in their head while they scan. It is marked so the view can
 * show it as the current row rather than as another link.
 */
export function buildComparison(
  product: Product,
  similar: Product[] = [],
  limit = 6
): ComparisonRow[] {
  const row = (p: Product, isCurrent: boolean): ComparisonRow => {
    const { finalPrice, oldPrice, hasPromo } = getPriceDisplay(p);
    /* The row's OWN subcategory, never the current product's. That distinction is the whole bug:
       the two are frequently different, which is exactly why the column is worth showing. */
    const sub = getProductPrimarySubCategory(p);
    return {
      id: p.id,
      name: p.designation_fr ?? '',
      url: getProductLink(p),
      brand: p.brand?.designation_fr ?? '',
      category: sub?.designation_fr ?? '',
      categoryUrl: sub?.slug ? `/${sub.slug}` : '',
      format: extractFormat(p.designation_fr),
      price: finalPrice,
      /* Only meaningful alongside `hasPromo`; a stale `prix` on a product whose promo expired must
         not render as a phantom saving. Same guard ProductCard uses. */
      oldPrice: hasPromo && oldPrice != null && oldPrice > finalPrice ? oldPrice : null,
      hasPromo,
      inStock: isInStock(p),
      isCurrent,
    };
  };

  const seen = new Set<string>([String(product.id)]);
  const siblings = similar
    .filter((p) => {
      const key = String(p.id);
      if (!p?.id || seen.has(key) || !p.designation_fr) return false;
      seen.add(key);
      return true;
    })
    // Cheapest first: on a page about one product, the useful ordering of the alternatives is by
    // the thing the reader is weighing, not by whatever order the API returned.
    .sort((a, b) => getPriceDisplay(a).finalPrice - getPriceDisplay(b).finalPrice)
    .slice(0, limit)
    .map((p) => row(p, false));

  // A table of one is not a comparison — it is the product page again, in a box.
  if (siblings.length < 2) return [];

  return [row(product, true), ...siblings];
}
