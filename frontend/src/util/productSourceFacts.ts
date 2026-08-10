/**
 * Everything a product page renders from what the backend transcribed off the source product page.
 *
 * ── WHY ONE MODULE AND NOT TWO RENDERS ────────────────────────────────────────────────────
 * Two routes show a product: the human page (ProductDetailClient) and /x-crawler/product/[slug],
 * which middleware rewrites every bot user-agent to. A fact on one and not the other is either
 * invisible to Google or cloaking, depending which way round it is. Both views therefore build
 * their rows, sections, panel and gallery from THESE functions, so the parity is a property of the
 * code and not of two JSX blocks somebody has to remember to keep in step.
 *
 * ── EVERY VALUE IS TRANSCRIBED, NONE IS COMPUTED ──────────────────────────────────────────
 * `format` and `flavour` come from `product.source_facts`, which the API builds from
 * IHerbNormalizer's reading of the source product NAME — "1.32 lb (600 g)" yields "600 g" because
 * the label prints 600 g, never because a conversion factor was applied. Everything under
 * `source_facts.content` is markup the backend lifted out of the source page verbatim, filtered by
 * App\Services\Catalog\ImportedSourceContent, which is the ONE place that decides what may be
 * published — which language, which sections, which specification rows.
 *
 * This module does no parsing, no unit maths, no translation and no fallback to reading the
 * designation. It reshapes what the API sent and nothing else. In particular it must never
 * reconstruct a missing block from another field: an absent section means the source page did not
 * carry one, and inventing it here is the failure the whole pipeline is built to avoid.
 *
 * ── AND IT IS EMPTY FOR EVERY HAND-MADE PRODUCT ───────────────────────────────────────────
 * `source_facts` is null unless the product was promoted from the import staging table, which the
 * 309 legacy products never were. Every function below returns [] or null for them, both views
 * render nothing, and the page is byte-identical to today's. That is the intended permanent state
 * for those products, not a gap waiting to be filled.
 *
 * ── HTML FROM HERE IS NOT SAFE UNTIL IT IS SANITISED ──────────────────────────────────────
 * `html` on a section, and the nutrition panel, are third-party markup. Both views pass them
 * through util/sanitizeRichHtml before `dangerouslySetInnerHTML`, exactly as they already do for
 * `description_fr` and `nutrition_values`. That sanitiser's allow-list already covers tables,
 * because a Supplement Facts panel is one.
 */
import type { Product } from '@/types';

export type SourceFactRow = {
  /**
   * Stable key — also used as the React key and the <dt> id.
   *
   * `format` and `flavour` come from the product name; every other key is a specification row the
   * backend transcribed from the source page's spec list, and the set of those is decided there
   * (ImportedSourceContent::SPEC_COLUMNS), not here. Typed as a string rather than a closed union
   * so adding a row server-side does not require a frontend release to render it.
   */
  key: string;
  /** French label, as the page prints it. */
  label: string;
  value: string;
};

export type SourceSection = {
  key: string;
  /** Our French heading for the block. The block's CONTENT is verbatim. */
  heading: string;
  /** Raw source HTML. Sanitise before rendering. */
  html: string;
};

type SourceFacts = Pick<Product, 'source_facts'>;

/**
 * The specification rows a product page prints.
 *
 * The two name-derived facts first, then the transcribed spec rows, because the pack size and the
 * flavour are what a shopper is actually looking for and the physical dimensions are not. Both
 * views render this one list in this one order.
 */
export function productSourceFactRows(product: SourceFacts): SourceFactRow[] {
  const facts = product.source_facts;
  if (!facts) return [];

  const rows: SourceFactRow[] = [];

  const format = facts.format?.trim();
  if (format) rows.push({ key: 'format', label: 'Conditionnement', value: format });

  const flavour = facts.flavour?.trim();
  if (flavour) rows.push({ key: 'flavour', label: 'Saveur', value: flavour });

  for (const spec of facts.content?.specs ?? []) {
    const label = spec?.label?.trim();
    const value = spec?.value?.trim();
    // A row with no label or no value is not a row. The API already drops empties; this is what
    // stops a partially-populated one rendering as a dangling <dt>.
    if (!spec?.key || !label || !value) continue;
    rows.push({ key: spec.key, label, value });
  }

  return rows;
}

/**
 * The transcribed prose blocks — suggested use, other ingredients, warnings.
 *
 * Order comes from the API and is not re-sorted here: it is the order the backend constant declares
 * and therefore the order both routes print, which is what makes the parity checkable by reading
 * two files instead of reasoning about two sorts.
 */
export function productSourceSections(product: SourceFacts): SourceSection[] {
  const sections = product.source_facts?.content?.sections ?? [];

  return sections.flatMap((section) => {
    const heading = section?.heading?.trim();
    const html = section?.html?.trim();
    if (!section?.key || !heading || !html) return [];
    return [{ key: section.key, heading, html }];
  });
}

/**
 * The transcribed Supplement Facts panel, or null.
 *
 * Rendered in the page's nutrition slot on both routes, AFTER any admin-authored
 * `nutrition_values` — a panel read off the physical lot we hold beats a panel transcribed from a
 * retailer's rendering of it, so the human one keeps the top of the section when both exist.
 */
export function productSourceNutritionHtml(product: SourceFacts): string | null {
  const html = product.source_facts?.content?.nutrition_html?.trim();
  return html ? html : null;
}

/**
 * Product photographs the source page listed, already size-normalised by the API.
 *
 * The URLs point at a CDN host that is in frontend/next.config.js `images.remotePatterns` — the
 * same host the cover already uses. next/image THROWS on an unlisted host rather than degrading,
 * which is why the allow-list is enforced server-side and not re-derived here.
 */
export function productSourceGallery(product: SourceFacts): string[] {
  const gallery = product.source_facts?.content?.gallery ?? [];

  return gallery.filter((url): url is string => typeof url === 'string' && url.trim() !== '');
}

/**
 * One sentence about where the words came from, or null.
 *
 * Composed server-side, deliberately: it says whether the French is a machine translation, and on a
 * page whose transcribed text includes suggested use and contraindications that is not a detail to
 * have two wordings of. Rendered wherever the transcribed content is, on both routes.
 */
export function productSourceAttribution(product: SourceFacts): string | null {
  const note = product.source_facts?.content?.attribution?.trim();
  return note ? note : null;
}

/**
 * Does this product have any transcribed page content at all?
 *
 * ── WHAT THIS IS ACTUALLY FOR ─────────────────────────────────────────────────────────────
 * The human route (ProductDetailClient) renders the transcribed blocks inside ONE wrapper in the
 * description tab, so it needs a single "is there anything in here?" test; the crawler route has no
 * wrapper and gates each block on its own. This is that test, and it is imported by the human view
 * — its docblock used to claim both views called it while `grep` found no caller at all, which is a
 * comment describing a parity mechanism that was not in force.
 *
 * The ATTRIBUTION counts. It is the sentence saying the French may be a machine translation, the
 * backend emits it whenever the row publishes anything (including a spec row or a photograph), and
 * the crawler route prints it on exactly that condition. Leaving it out of this test is what let the
 * human page drop it in a state where the crawler kept it — and the two routes must render the same
 * facts.
 *
 * False for all 309 legacy products (no staging row, so `source_facts.content` is null), so neither
 * view emits so much as a container for them.
 */
export function hasProductSourceContent(product: SourceFacts): boolean {
  return (
    productSourceSections(product).length > 0 ||
    productSourceNutritionHtml(product) !== null ||
    productSourceGallery(product).length > 0 ||
    productSourceAttribution(product) !== null
  );
}
