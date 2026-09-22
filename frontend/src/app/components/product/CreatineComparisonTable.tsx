/**
 * CreatineComparisonTable — the commercial comparison module for /creatine.
 *
 * A PURE SERVER COMPONENT. It fetches nothing, holds no state and imports no `'use client'`
 * module, because it is mounted in BOTH category renders: the human one
 * (app/(shop)/category/CategorySeoLanding.tsx + app/(shop)/shop/ShopPageClient.tsx) and the
 * crawler one (app/components/crawler/CrawlerCategoryView.tsx, whose own docblock commits it to
 * having "no client code of their own"). Anything this file renders, Googlebot and a shopper see
 * identically — which is the whole point, and the reason the product links below are plain
 * anchors rather than <LinkWithLoading>: one markup, two routes, nothing to keep in step by hand.
 *
 * ── WHAT THIS TABLE IS ALLOWED TO SAY, AND HOW THAT WAS DECIDED ──────────────────────────────
 * Every column here survived a measurement against the REAL creatine catalogue, taken 22/09/2026
 * from the live origin with a Googlebot UA. /creatine renders 24 products, of which exactly
 * **8 are in stock**; those 8 are the population every fill rate below was measured on.
 *
 *   price (prix / promo)                8/8  100 %   → column
 *   pack size printed in the NAME       8/8  100 %   → column (REPORTED, never an operand — below)
 *   creatine form named in the NAME     6/8   75 %   → column, "Non renseigné" for the other 2
 *   brand, from the product payload     8/8  100 % on /api/product_details
 *                                       0/8    0 % on the listing payload this page fetches
 *                                                   → column ONLY when `brands` resolves it
 *   stock status                        8/8  100 %   → NOT a column; it is the row filter (below)
 *   structured net weight               1/8   13 %   → dropped
 *   servings per container              1/8   13 %   → dropped
 *   serving size                        3/8   38 %   → dropped
 *   "Creapure" claim                    0/8    0 %   → dropped (folded into Forme when it appears)
 *   source_facts (transcribed label)    0/8    0 %   → nothing to draw on
 *
 * Two of those deserve the reasoning spelled out, because both look like missed opportunities.
 *
 * ── WHY THERE IS NO "PRIX POUR 5 G" COLUMN ───────────────────────────────────────────────────
 * 5 g is the standard daily creatine dose, so price per 5 g is the single most useful number this
 * table could carry. It needs a net weight, and a net weight this shop can stand behind exists for
 * **one** of the eight in-stock creatines (`nutrition_facts.net_quantity`, Kevin Levrone only).
 * 13 % is not a column; it is a mostly-empty column with a division sign in it.
 *
 * The tempting shortcut is to divide by the size in the product NAME, and util/productComparison.ts
 * refuses that catalogue-wide for a reason worth repeating here: the catalogue already contains a
 * product whose title says "2.267 kg" while its heading says "2,267 g", and dividing by that yields
 * 0,13 DT/kg or 130 DT/kg with equal confidence. So the format is REPORTED in its own column,
 * exactly as the label writes it, and never used as an operand. The day the net weights are
 * transcribed off the packs, this column becomes defensible and can be added in one commit — that
 * is a reason to transcribe, not a reason to guess now.
 *
 * ── WHY THERE IS NO "DISPONIBILITÉ" COLUMN ───────────────────────────────────────────────────
 * Stock is known for 100 % of products, so it passes the majority test easily — and it would still
 * print the same two words on every row, because the table only ever shows products in stock. A
 * shopper cannot compare 8 identical cells. The fact is asserted once, in the caption, and does the
 * work of the column at a fraction of a phone's horizontal budget. Out-of-stock creatines are not
 * hidden: the product grid this table sits above lists all 24 with their real stock labels.
 *
 * ── AND WHY THE FORM IS READ ONLY FROM THE NAME, LITERALLY ───────────────────────────────────
 * `productForm()` matches whole words in `designation_fr` and nothing else. "CREATINE REAL PHARM -
 * 300G" says neither monohydrate nor micronisée, so its cell reads "Non renseigné" — even though
 * nearly all bulk creatine on this market is monohydrate, and even though the category intro says
 * so. Inferring it would print a manufacturing claim we did not read off a label, on a page whose
 * job is to be trusted about exactly that. Two honest blanks beat eight confident guesses.
 */
import type { Brand, Product } from '@/types';
import { extractFormat } from '@/util/productComparison';
import { getPriceDisplay, formatTnd } from '@/util/productPrice';
import { getProductStockStatus } from '@/util/cartStock';
import { getProductLink } from '@/util/productUrl';

/** Shown wherever a fact is genuinely absent. Never a dash, never an assumption. */
const UNKNOWN = 'Non renseigné';

/**
 * The creatine forms this shop can name, most specific first.
 *
 * Whole-word, accent-folded matches against the product name ONLY. A product may legitimately hit
 * two (a "monohydrate micronisée"), and then both are printed, joined — the two facts are not
 * alternatives and collapsing them to one would lose the reason somebody pays more for the second.
 */
const FORMS: ReadonlyArray<{ re: RegExp; label: string }> = [
  { re: /\bcreapure\b/, label: 'Creapure®' },
  { re: /\bmonohydrate\b/, label: 'Monohydrate' },
  { re: /\bmicroni[sz]\w*\b/, label: 'Micronisée' },
  { re: /\b(?:hcl|chlorhydrate|hydrochloride)\b/, label: 'HCL' },
];

const fold = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** The form(s) the NAME states, or '' when it states none. No inference, ever. */
export function productForm(name: string | null | undefined): string {
  if (!name) return '';
  const folded = fold(name);
  return FORMS.filter(({ re }) => re.test(folded)).map(({ label }) => label).join(' · ');
}

export type CreatineRow = {
  id: number | string;
  name: string;
  url: string;
  brand: string;
  format: string;
  form: string;
  price: number;
  /** The pre-promotion price, only when a promotion is actually running. */
  oldPrice: number | null;
};

/**
 * A bundle is not comparable with a single tub — its size is the sum of its parts and its price
 * buys more than one product, so it would sit in a "format" column as a category error.
 */
function isPack(product: Product): boolean {
  return Number(product.pack) === 1 || /^pack\b/i.test(product.designation_fr || '');
}

/**
 * The rows, cheapest first.
 *
 * Exported so the mounting sites can assert the two renders receive the same set, and so a check
 * script can measure the fill rates above without a browser.
 */
export function buildCreatineRows(
  products: Product[],
  brands: Brand[] = [],
  limit = 8
): CreatineRow[] {
  const list = Array.isArray(products) ? products : [];
  const brandName = new Map((Array.isArray(brands) ? brands : []).map((b) => [b.id, (b.designation_fr || '').trim()]));
  const seen = new Set<string>();

  return list
    .filter((product) => {
      if (!product?.id || !product.designation_fr) return false;
      const key = String(product.id);
      if (seen.has(key)) return false;
      /* Only what a shopper can actually order today. An unknown stock state is NOT treated as
         available — see the third-state note in util/cartStock.ts. */
      const stock = getProductStockStatus(product);
      if (stock.isUnknown || stock.isOutOfStock || isPack(product)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => getPriceDisplay(a).finalPrice - getPriceDisplay(b).finalPrice)
    .slice(0, limit)
    .map((product) => {
      const { finalPrice, oldPrice, hasPromo } = getPriceDisplay(product);
      return {
        id: product.id,
        name: product.designation_fr ?? '',
        url: getProductLink(product),
        brand: (product.brand?.designation_fr ?? brandName.get(Number(product.brand_id)) ?? '').trim(),
        format: extractFormat(product.designation_fr),
        form: productForm(product.designation_fr),
        price: finalPrice,
        /* Guarded exactly as ProductCard guards it: a stale `prix` on a product whose promotion has
           expired must not render as a phantom saving. */
        oldPrice: hasPromo && oldPrice != null && oldPrice > finalPrice ? oldPrice : null,
      };
    });
}

export function CreatineComparisonTable({
  products,
  brands = [],
  limit = 8,
}: {
  /** The products the page already fetched. This component never fetches. */
  products: Product[];
  /** Optional brand lookup for `brand_id`. The listing payload carries no brand object, so without
   *  this the Marque column drops itself rather than printing eight blanks. */
  brands?: Brand[];
  limit?: number;
}) {
  const rows = buildCreatineRows(products, brands, limit);

  /* A table of one is not a comparison — it is a product card with extra rules. */
  if (rows.length < 2) return null;

  /* A column earns its place only if a clear majority of the rows can fill it. Below that the
     column is dropped outright, which is honest AND gives the remaining columns the width back —
     the same rule util/productComparisonFacts.ts applies to nutrients. */
  const majority = (predicate: (row: CreatineRow) => boolean) =>
    rows.filter(predicate).length > rows.length / 2;
  const showBrand = majority((row) => Boolean(row.brand));
  const showFormat = majority((row) => Boolean(row.format));
  const showForm = majority((row) => Boolean(row.form));
  const canShowUnknown =
    (showBrand && rows.some((row) => !row.brand)) ||
    (showFormat && rows.some((row) => !row.format)) ||
    (showForm && rows.some((row) => !row.form));

  const headCell =
    'bg-sunken px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3 whitespace-nowrap';

  /* The table's floor width follows the number of columns it actually drew, so a table that
     dropped a column does not keep scrolling sideways over the gap that column left. Each option is
     written as a WHOLE class name rather than an interpolated fragment: Tailwind scans source text,
     and a class it cannot read as a literal is a class it never emits. */
  const columnCount = 2 + Number(showBrand) + Number(showFormat) + Number(showForm);
  const tableWidth = columnCount >= 5 ? 'min-w-[640px]' : columnCount === 4 ? 'min-w-[520px]' : 'min-w-[400px]';

  return (
    <div data-creatine-comparison>
      {/* The visible title sits OUTSIDE the scroller on purpose. A <caption> takes the TABLE's
          width, and on a 390px phone the table is wider than the screen — so a visible caption
          would scroll sideways away from the table it names. The element still exists, carries the
          full sentence and is announced first by a screen reader; it is just not what is drawn. */}
      <p className="mb-3 text-sm leading-relaxed text-ink-2">
        Les créatines actuellement en stock, de la moins chère à la plus chère.
      </p>

      {/* Below the table's floor width this is the horizontal viewport onto it. `tabIndex` + `role`
          because a scrollable region reachable only by swiping is unreachable by keyboard. */}
      <div
        className="overflow-x-auto overscroll-x-contain rounded-2xl border border-hairline bg-elevated shadow-card focus-visible:ring-2 focus-visible:ring-focus"
        tabIndex={0}
        role="region"
        aria-label="Tableau comparatif des créatines, défilement horizontal"
      >
        <table className={`w-full ${tableWidth} border-collapse text-sm`}>
          <caption className="sr-only">
            Créatines en stock sur Protein.tn, classées du prix le plus bas au prix le plus élevé.
            Marque, format et forme repris tels que la marque les imprime.
          </caption>
          <thead>
            <tr>
              {/* Sticky so the product name stays beside whichever column the thumb has scrolled
                  to. A sticky cell must paint its own background or the scrolling columns slide
                  visibly underneath it. */}
              <th scope="col" className={`${headCell} sticky left-0 z-[2] w-[180px] min-w-[180px] border-r border-hairline`}>
                Produit
              </th>
              {showBrand && <th scope="col" className={headCell}>Marque</th>}
              {showFormat && <th scope="col" className={headCell}>Format</th>}
              {showForm && <th scope="col" className={headCell}>Forme</th>}
              <th scope="col" className={`${headCell} text-right`}>Prix</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-hairline align-top">
                <th
                  scope="row"
                  className="sticky left-0 z-[1] w-[180px] min-w-[180px] border-r border-hairline bg-elevated px-4 py-3 text-left font-normal"
                >
                  <a
                    href={row.url}
                    className="inline-flex min-h-11 items-center font-semibold leading-snug text-ink-1 hover:text-brand focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {row.name}
                  </a>
                </th>
                {showBrand && (
                  <td className="px-4 py-3 text-ink-2">{row.brand || UNKNOWN}</td>
                )}
                {showFormat && (
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-1">
                    {row.format || UNKNOWN}
                  </td>
                )}
                {showForm && (
                  <td className="px-4 py-3 text-ink-2">{row.form || UNKNOWN}</td>
                )}
                <td className="px-4 py-3 text-right">
                  <span className="whitespace-nowrap font-display text-lg font-bold text-brand">
                    {formatTnd(row.price)}
                  </span>
                  {row.oldPrice != null && (
                    <span className="block whitespace-nowrap text-xs text-ink-3 line-through">
                      {formatTnd(row.oldPrice)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        Format et forme repris tels que la marque les imprime sur son étiquette, jamais déduits.
        {canShowUnknown && ` « ${UNKNOWN} » signifie que l’information ne figure pas sur la fiche.`}
        {' '}Aucun prix au gramme n’est affiché tant que la masse nette n’a pas été relevée sur
        l’emballage. Prix en dinars, susceptibles d’évoluer.
      </p>
    </div>
  );
}
