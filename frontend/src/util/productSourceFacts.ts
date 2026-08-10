/**
 * The specification rows a product page prints, from the facts the backend transcribed.
 *
 * ── WHY ONE FUNCTION AND NOT TWO RENDERS ──────────────────────────────────────────────────
 * Two routes show a product: the human page (ProductDetailClient) and /x-crawler/product/[slug],
 * which middleware rewrites every bot user-agent to. A fact on one and not the other is either
 * invisible to Google or cloaking, depending which way round it is. Both views therefore build
 * their rows from THIS function, so the parity is a property of the code and not of two JSX blocks
 * somebody has to remember to keep in step.
 *
 * ── EVERY VALUE IS TRANSCRIBED, NONE IS COMPUTED ──────────────────────────────────────────
 * `format` and `flavour` come from `product.source_facts`, which the API builds from
 * IHerbNormalizer's reading of the source product NAME — "1.32 lb (600 g)" yields "600 g" because
 * the label prints 600 g, never because a conversion factor was applied. This module does no
 * parsing, no unit maths and no fallback to reading the designation: a row exists only when the
 * backend already decided the fact was safe to state.
 *
 * ── AND IT IS EMPTY FOR EVERY HAND-MADE PRODUCT ───────────────────────────────────────────
 * `source_facts` is null unless the product was promoted from the import staging table, which the
 * 309 legacy products never were. rows() returns [] for them, both views render nothing, and the
 * page is byte-identical to today's. That is the intended permanent state for those products, not a
 * gap waiting to be filled.
 */
import type { Product } from '@/types';

export type SourceFactRow = {
  /** Stable key — also used as the React key and the <dt> id. */
  key: 'format' | 'flavour';
  /** French label, as the page prints it. */
  label: string;
  value: string;
};

export function productSourceFactRows(product: Pick<Product, 'source_facts'>): SourceFactRow[] {
  const facts = product.source_facts;
  if (!facts) return [];

  const rows: SourceFactRow[] = [];

  const format = facts.format?.trim();
  if (format) rows.push({ key: 'format', label: 'Conditionnement', value: format });

  const flavour = facts.flavour?.trim();
  if (flavour) rows.push({ key: 'flavour', label: 'Saveur', value: flavour });

  return rows;
}
