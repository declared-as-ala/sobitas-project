/**
 * WheyComparisonTable — the commercial comparison module for /whey-proteine.
 *
 * A PURE SERVER COMPONENT, for the same reason CreatineComparisonTable is one: it is mounted in
 * BOTH category renders — the human one (app/(shop)/category/CategorySeoLanding.tsx) and the
 * crawler one (app/components/crawler/CrawlerCategoryView.tsx, whose docblock commits it to having
 * "no client code of its own"). It fetches nothing, holds no state, imports no `'use client'`
 * module, and links with plain anchors rather than <LinkWithLoading>: one markup, two routes,
 * nothing to keep in step by hand.
 *
 * ── THE MEASUREMENT THAT CHOSE THESE COLUMNS ─────────────────────────────────────────────────
 * Taken 23/09/2026 from the live origin, `GET /api/productsBySubCategoryId/whey-proteine`.
 * /whey-proteine publishes **168 products**, of which exactly **12 are in stock and are not
 * bundles** — those 12 are the population every rate below was measured on, because they are the
 * only rows this table can ever draw.
 *
 *   price (prix / promo)                 12/12  100 %  → column
 *   pack size printed in the NAME        12/12  100 %  → column (REPORTED, never an operand)
 *   brand, resolved from `brands`        12/12  100 %  → column ONLY when `brands` is passed
 *   brand object on the product itself    0/12    0 %  → hence the prop, exactly as on creatine
 *   promotion currently running          12/12  100 %  → the struck-through old price, not a column
 *   aroma(s) on the product              10/12   83 %  → column, "Non renseigné" for the other two
 *   whey TYPE named in the NAME           0/12    0 %  → dropped. See below — this is the finding.
 *   protein per serving, structured       0/12    0 %  → dropped (no nutrition_facts in the payload)
 *   protein per serving, from marketing    1/12    8 %  → dropped, and it would be unusable anyway
 *   rating (`note`)                       0/12    0 %  → dropped
 *   source_facts (transcribed label)      0/12    0 %  → nothing to draw on
 *   stock status                         12/12  100 %  → NOT a column; it is the row filter
 *
 * ── WHY THERE IS NO "TYPE DE WHEY" COLUMN, WHICH IS THE WHOLE POINT OF THE PAGE ──────────────
 * Concentrée / isolate / hydrolysée is the single distinction a whey buyer cares about, and it is
 * the obvious analogue of the creatine table's Forme column. It fills **zero of twelve**.
 *
 * Not "mostly empty" — empty. `100% WHEY GOLD STANDARD – 2.27KG`, `PROSTAR 100% WHEY PROTEIN –
 * 907G`, `NITROTECH WHEY PROTEIN 1.81 KG MUSCLETECH`, `BIG WHEY 2KG - BIG RAMY LABS`: not one
 * in-stock name on this shelf contains the words concentré, isolat, hydrolysé or blend. The
 * category itself is not the answer either, since /whey-proteine, /whey-isolate and
 * /whey-hydrolysee are separate shelves and a product's presence here says only "it is a whey".
 *
 * Inferring the type from the brand's marketing, or from "most bulk whey is a concentrate", would
 * print a composition claim we did not read off a label — on the one page whose job is to be
 * trusted about exactly that. So the column is dropped and the distinction is taught in the
 * page's buying guide instead, where it can be explained rather than asserted per row.
 *
 * ── WHY THERE IS NO "PROTÉINES PAR PORTION" COLUMN ───────────────────────────────────────────
 * It is the most useful number this table could carry and it is not available. The listing payload
 * this page fetches carries no `nutrition_facts` at all (0/12), and parsing it out of the
 * marketing copy hits 1 of 12. Worse, the value is not a property of the product: measured on the
 * live product pages the same day, 100% Pure Whey 2,27 kg declares 21 g per 28 g serving while the
 * repo's own previous copy for that reference carried 22 g — the figure for the Natural version,
 * not the aromatised one this shop stocks. A per-serving column would therefore be wrong per
 * FLAVOUR even when it was right per product. The guide gives the reader the division to do
 * instead, with three values read off real fiches and dated.
 *
 * ── AND WHY THERE IS NO PRIX/KG, ON A SHELF WHERE IT WOULD SELL ──────────────────────────────
 * Same refusal as util/productComparison.ts, and this catalogue proves it on this very shelf: the
 * two Scenit Tantor pots are named "908 g" and "2,267 g". The second is not two grams of powder —
 * but nothing in the payload says what it is, and dividing a price by the number in a product name
 * yields 0,13 DT/kg or 130 DT/kg with equal confidence. The format is REPORTED exactly as the name
 * writes it and is never an operand. The day net weights are transcribed off the packs, this
 * column becomes defensible in one commit.
 */
import type { Brand, Product } from '@/types';
import { extractFormat } from '@/util/productComparison';
import { getPriceDisplay, formatTnd } from '@/util/productPrice';
import { getProductStockStatus } from '@/util/cartStock';
import { getProductLink } from '@/util/productUrl';

/** Shown wherever a fact is genuinely absent. Never a dash, never an assumption. */
const UNKNOWN = 'Non renseigné';

/**
 * How many flavours a cell prints before it summarises the rest.
 *
 * The measured maximum on this shelf today is two, so this never fires — it exists because a row
 * height is shared by the whole table, and one product gaining eight flavours would silently make
 * every other row as tall as that cell. The overflow is counted, not dropped.
 */
const MAX_AROMAS = 3;

export type WheyRow = {
  id: number | string;
  name: string;
  url: string;
  brand: string;
  format: string;
  /** The flavours listed on the fiche, as the shop writes them. Empty when none is listed. */
  aromas: string[];
  price: number;
  /** The pre-promotion price, only when a promotion is actually running. */
  oldPrice: number | null;
};

/**
 * A bundle is not comparable with a single tub — its size is the sum of its parts and its price
 * buys more than one product, so it would sit in a "format" column as a category error.
 *
 * Both tests are needed. `PACK PROFESSIONNEL` is published on this shelf with a LEADING SPACE in
 * its name, so the anchored regex misses it and only the `pack` flag catches it; other bundles
 * carry the word and not the flag.
 */
function isPack(product: Product): boolean {
  return Number(product.pack) === 1 || /^\s*pack\b/i.test(product.designation_fr || '');
}

/** The flavours the fiche lists, deduplicated, in payload order. No inference. */
function productAromas(product: Product): string[] {
  const list = Array.isArray(product.aromes) ? product.aromes : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const aroma of list) {
    const label = (aroma?.designation_fr ?? '').trim();
    /* Printed exactly as the catalogue stores it, including the English spellings ("Vanilla",
       "Cookies"). Translating them here would name a flavour differently from the selector the
       buyer meets on the product page, which is the one place the choice is actually made. */
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push(label);
  }
  return out;
}

/**
 * The rows, cheapest first.
 *
 * Exported so the two mounting sites can assert they receive the same set without rendering, and
 * so a check script can re-measure the fill rates above without a browser.
 */
export function buildWheyRows(products: Product[], brands: Brand[] = [], limit = 8): WheyRow[] {
  const list = Array.isArray(products) ? products : [];
  const brandName = new Map(
    (Array.isArray(brands) ? brands : []).map((b) => [b.id, (b.designation_fr || '').trim()])
  );
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
        aromas: productAromas(product),
        price: finalPrice,
        /* Guarded exactly as ProductCard guards it: a stale `prix` on a product whose promotion has
           expired must not render as a phantom saving. */
        oldPrice: hasPromo && oldPrice != null && oldPrice > finalPrice ? oldPrice : null,
      };
    });
}

/** "Vanilla · Fraise" — or "A · B · C +2" once a fiche lists more than MAX_AROMAS. */
function aromaLabel(aromas: string[]): string {
  if (aromas.length === 0) return '';
  if (aromas.length <= MAX_AROMAS) return aromas.join(' · ');
  return `${aromas.slice(0, MAX_AROMAS).join(' · ')} +${aromas.length - MAX_AROMAS}`;
}

export function WheyComparisonTable({
  products,
  brands = [],
  limit = 8,
}: {
  /** The products the page already fetched. This component never fetches. */
  products: Product[];
  /** Brand lookup for `brand_id`. The listing payload carries no brand object (0/12 measured), so
   *  without this the Marque column drops itself rather than printing twelve blanks. */
  brands?: Brand[];
  limit?: number;
}) {
  const rows = buildWheyRows(products, brands, limit);

  /* A table of one is not a comparison — it is a product card with extra rules. */
  if (rows.length < 2) return null;

  /* A column earns its place only if a clear majority of the rows can fill it. Below that the
     column is dropped outright, which is honest AND gives the remaining columns the width back —
     the same rule util/productComparisonFacts.ts applies to nutrients. */
  const majority = (predicate: (row: WheyRow) => boolean) =>
    rows.filter(predicate).length > rows.length / 2;
  const showBrand = majority((row) => Boolean(row.brand));
  const showFormat = majority((row) => Boolean(row.format));
  const showAromas = majority((row) => row.aromas.length > 0);
  const canShowUnknown =
    (showBrand && rows.some((row) => !row.brand)) ||
    (showFormat && rows.some((row) => !row.format)) ||
    (showAromas && rows.some((row) => row.aromas.length === 0));

  const headCell =
    'bg-sunken px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3 whitespace-nowrap';

  /* The table's floor width follows the number of columns it actually drew, so a table that
     dropped a column does not keep scrolling sideways over the gap that column left. Each option is
     written as a WHOLE class name rather than an interpolated fragment: Tailwind scans source text,
     and a class it cannot read as a literal is a class it never emits. */
  const columnCount = 2 + Number(showBrand) + Number(showFormat) + Number(showAromas);
  const tableWidth =
    columnCount >= 5 ? 'min-w-[640px]' : columnCount === 4 ? 'min-w-[520px]' : 'min-w-[400px]';

  return (
    <div data-whey-comparison>
      {/* The visible title sits OUTSIDE the scroller on purpose. A <caption> takes the TABLE's
          width, and on a 390px phone the table is wider than the screen — so a visible caption
          would scroll sideways away from the table it names. The element still exists, carries the
          full sentence and is announced first by a screen reader; it is just not what is drawn. */}
      <p className="mb-3 text-sm leading-relaxed text-ink-2">
        Les whey actuellement en stock, de la moins chère à la plus chère.
      </p>

      {/* Below the table's floor width this is the horizontal viewport onto it. `tabIndex` + `role`
          because a scrollable region reachable only by swiping is unreachable by keyboard. */}
      <div
        className="overflow-x-auto overscroll-x-contain rounded-2xl border border-hairline bg-elevated shadow-card focus-visible:ring-2 focus-visible:ring-focus"
        tabIndex={0}
        role="region"
        aria-label="Tableau comparatif des whey protéines, défilement horizontal"
      >
        <table className={`w-full ${tableWidth} border-collapse text-sm`}>
          <caption className="sr-only">
            Whey protéines en stock sur Protein.tn, classées du prix le plus bas au prix le plus
            élevé. Marque, format et parfums repris tels que la fiche les indique.
          </caption>
          <thead>
            <tr>
              {/* Sticky so the product name stays beside whichever column the thumb has scrolled
                  to. A sticky cell must paint its own background or the scrolling columns slide
                  visibly underneath it. */}
              <th
                scope="col"
                className={`${headCell} sticky left-0 z-[2] w-[180px] min-w-[180px] border-r border-hairline`}
              >
                Produit
              </th>
              {showBrand && <th scope="col" className={headCell}>Marque</th>}
              {showFormat && <th scope="col" className={headCell}>Format</th>}
              {showAromas && <th scope="col" className={headCell}>Parfums</th>}
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
                {showBrand && <td className="px-4 py-3 text-ink-2">{row.brand || UNKNOWN}</td>}
                {showFormat && (
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink-1">
                    {row.format || UNKNOWN}
                  </td>
                )}
                {showAromas && (
                  <td className="px-4 py-3 text-ink-2">{aromaLabel(row.aromas) || UNKNOWN}</td>
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
        Format et parfums repris tels que la fiche les indique, jamais déduits.
        {canShowUnknown && ` « ${UNKNOWN} » signifie que l’information ne figure pas sur la fiche.`}
        {' '}Le type de whey — concentrée, isolate ou hydrolysée — n’est pas comparé ici : aucun de
        ces noms de produit ne le précise, et il ne sera pas deviné. Aucun prix au kilo n’est affiché
        tant que la masse nette n’a pas été relevée sur l’emballage. Prix en dinars, susceptibles
        d’évoluer.
      </p>
    </div>
  );
}
