import Link from 'next/link';
import type { Product } from '@/types';
import { brandFamilyLink } from '@/util/brandCategoryNames';
import { getProductLink } from '@/util/productUrl';
import { humanProductHeading } from '@/util/productMetaDescription';
import { extractFormat } from '@/util/productComparison';
import { formatTnd, getPriceDisplay } from '@/util/productPrice';

/**
 * « {Marque} en stock : formats et prix » — the brand's buyable products as a real <table>.
 *
 * WHY A TABLE AND NOT A SECOND GRID: the grid above already shows every card. What a shopper on
 * « optimum nutrition tunisie » wants next is the short answer — what can I order today, in which
 * size, for how much — and a table states that in a shape Google can lift into a snippet. The rows
 * are `copy.inStockProducts` (every in-stock row, listing order — no cap, the heading reads as the
 * complete list), all read from the brand listing the
 * page already fetched, so every value here is also printed on the card it links to.
 *
 * FORMAT IS NEVER GUESSED. extractFormat() reads « nombre + unité » off the name and nothing else;
 * a pack is labelled « Pack » because its name carries the size of only one of its items, and an
 * unreadable name says « Non renseigné » rather than inventing a size. So does a gram value with
 * decimals: « Tantor Whey Protein 2,267 g » is a 2,267 kg tub misnamed in the admin, and the cell
 * must not repeat the typo.
 *
 * NO PAGE-LEVEL HORIZONTAL SCROLL. Below `sm` each row is a two-column grid (name + family on the
 * left, price + format on the right); from `sm` it is a normal table. The overflow wrapper is a
 * second guard: if a long unbroken name ever outgrows the column, the table scrolls inside its card
 * and the page does not.
 */

function formatOf(product: Product): string {
  const name = (product.designation_fr ?? '').trim();
  if (Number(product.pack) === 1 || name.toLowerCase().startsWith('pack')) return 'Pack';
  const format = extractFormat(name);
  if (/^\d+,\d+ g$/.test(format)) return 'Non renseigné';
  return format || 'Non renseigné';
}

const CELL = 'sm:table-cell sm:border-t sm:border-hairline sm:py-2 sm:align-middle';
// Mobile-only label in front of a cell's value, from its data-label. A pseudo-element, so the HTML
// a crawler reads stays one value per cell — the <th> already names the column.
const MOBILE_LABEL =
  'before:mr-1.5 before:text-[11px] before:font-semibold before:uppercase before:tracking-wide before:text-ink-3 before:content-[attr(data-label)] sm:before:content-none';
const LINK =
  'inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

export function BrandInStockTable({ title, products }: { title: string; products: Product[] }) {
  const rows = (products ?? []).filter((p) => p && p.designation_fr);
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="brand-instock-heading" className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-6">
      <h2 id="brand-instock-heading" className="font-display text-xl font-extrabold uppercase tracking-tight text-ink-1 sm:text-2xl">
        {title}
      </h2>
      <div className="mt-3 overflow-x-auto">
        <table aria-labelledby="brand-instock-heading" className="block w-full border-collapse text-left text-sm sm:table">
          <thead className="sr-only sm:not-sr-only">
            <tr>
              <th scope="col" className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Produit</th>
              <th scope="col" className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Famille</th>
              <th scope="col" className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Format</th>
              <th scope="col" className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-3">Prix</th>
            </tr>
          </thead>
          <tbody className="block sm:table-row-group">
            {rows.map((p, i) => {
              const price = getPriceDisplay(p);
              // brandFamilyLink: the family index's own rules (canonical path, product-level
              // label), with a duplicate shelf (`glucides-energie`) resolved to its twin.
              const family = brandFamilyLink(p.sous_categorie);
              return (
                <tr
                  key={`${p.id ?? p.slug}-${i}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-t border-hairline py-2 first:border-t-0 sm:table-row sm:border-t-0 sm:py-0"
                >
                  <td className={`col-start-1 row-start-1 min-w-0 sm:pr-4 ${CELL}`}>
                    <Link href={getProductLink(p)} prefetch={false} className={`${LINK} font-semibold leading-snug text-ink-1`}>
                      {humanProductHeading(p)}
                    </Link>
                  </td>
                  <td data-label="Famille" className={`col-start-1 row-start-2 min-w-0 text-ink-2 sm:pr-4 ${MOBILE_LABEL} ${CELL}`}>
                    {family ? (
                      <Link href={family.url} prefetch={false} className={`${LINK} underline-offset-4 hover:underline`}>
                        {family.name}
                      </Link>
                    ) : (
                      'Non renseignée'
                    )}
                  </td>
                  <td data-label="Format" className={`col-start-2 row-start-2 self-center whitespace-nowrap text-right text-ink-2 sm:pr-4 sm:text-left ${MOBILE_LABEL} ${CELL}`}>
                    {formatOf(p)}
                  </td>
                  <td className={`col-start-2 row-start-1 self-center whitespace-nowrap text-right ${CELL}`}>
                    <span className="font-display font-bold tabular-nums text-ink-1">{formatTnd(price.finalPrice)}</span>
                    {price.hasPromo && price.oldPrice ? (
                      <del className="block text-xs tabular-nums text-ink-3">{formatTnd(price.oldPrice)}</del>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
