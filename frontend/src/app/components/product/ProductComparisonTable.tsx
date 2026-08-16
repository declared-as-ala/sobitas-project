/**
 * "Comparer avec des produits similaires".
 *
 * ── WHAT WAS WRONG WITH IT ──────────────────────────────────────────────────────────────────
 * The data was right and the presentation was unusable on a phone. Six columns — Produit, Marque,
 * Catégorie, Format, Prix, Disponibilité — inside `overflow-x-auto` at 390px means the table is
 * roughly 2.3 screens wide and everything past "Marque" is off-screen behind a horizontal scroll
 * nobody discovers, on the 81% of this site's traffic that is mobile. A comparison you have to
 * scroll sideways to perform is not a comparison.
 *
 * ── WHY COLUMNS DROP RATHER THAN THE TABLE BECOMING CARDS ───────────────────────────────────
 * The obvious fix is a card list below `md` and a table above it, and it is the wrong one: it means
 * every fact exists twice in the DOM, on ~11,263 pages, which is both weight and a duplicate-content
 * signal on the exact pages we are trying to rank.
 *
 * So there is ONE table, and the three columns a phone cannot fit are `hidden md:table-cell`. Brand
 * and format do not disappear on a phone — they move into the product cell as a sub-line, where
 * they are worth more anyway, because on a narrow screen you read a row at a time rather than a
 * column at a time.
 *
 * Content parity with `/x-crawler/product/[slug]` is unaffected: same helper, same rows, same
 * columns, same order. Googlebot is served that route, and a fact shown to one and not the other is
 * either invisible or cloaking — see util/productComparison.ts.
 */
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import type { ComparisonRow } from '@/util/productComparison';
import { formatTnd } from '@/util/productPrice';
import { cn } from '@/app/components/ui/utils';

const HEAD_CELL = 'px-3 py-2.5 text-left font-display text-[11px] font-semibold uppercase tracking-wide text-ink-3';

export function ProductComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-hairline bg-sunken">
            <th scope="col" className={HEAD_CELL}>Produit</th>
            <th scope="col" className={cn(HEAD_CELL, 'hidden md:table-cell')}>Marque</th>
            <th scope="col" className={cn(HEAD_CELL, 'hidden md:table-cell')}>Catégorie</th>
            <th scope="col" className={cn(HEAD_CELL, 'hidden md:table-cell')}>Format</th>
            <th scope="col" className={cn(HEAD_CELL, 'text-right')}>Prix</th>
            <th scope="col" className={cn(HEAD_CELL, 'text-right')}>Stock</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            /* The phone's substitute for the two dropped columns, assembled once so an empty brand
               does not print a dangling separator. */
            const subLine = [row.brand, row.format].filter(Boolean).join(' · ');

            return (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-hairline last:border-b-0 align-top',
                  /* The current row is marked by a brand rule on its leading edge rather than by a
                     tint alone: a tint has to be strong enough to survive both themes, and at that
                     strength it fights the price column. A 2px rule reads at any contrast. */
                  row.isCurrent && 'border-s-2 border-s-brand bg-sunken'
                )}
              >
                <th scope="row" className="px-3 py-3 text-left font-normal">
                  {row.isCurrent ? (
                    <span aria-current="true" className="font-semibold text-ink-1">
                      {row.name}
                      <span className="ms-2 inline-block whitespace-nowrap rounded-full bg-brand px-2 py-0.5 align-middle font-display text-[10px] font-bold uppercase tracking-wide text-on-brand">
                        Cette page
                      </span>
                    </span>
                  ) : (
                    <Link href={row.url} className="font-medium text-ink-1 underline-offset-2 hover:text-brand hover:underline">
                      {row.name}
                    </Link>
                  )}
                  {subLine && <span className="mt-0.5 block text-xs text-ink-3 md:hidden">{subLine}</span>}
                </th>

                <td className="hidden px-3 py-3 text-ink-2 md:table-cell">{row.brand || '—'}</td>
                <td className="hidden px-3 py-3 md:table-cell">
                  {row.category ? (
                    row.categoryUrl ? (
                      <Link href={row.categoryUrl} className="text-ink-2 underline-offset-2 hover:text-brand hover:underline">
                        {row.category}
                      </Link>
                    ) : (
                      <span className="text-ink-2">{row.category}</span>
                    )
                  ) : (
                    '—'
                  )}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-ink-2 tabular-nums md:table-cell">{row.format || '—'}</td>

                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <span className="font-display font-bold tabular-nums text-ink-1">{formatTnd(row.price)}</span>
                  {row.oldPrice != null ? (
                    <span className="mt-0.5 block text-xs text-ink-3 line-through tabular-nums">{formatTnd(row.oldPrice)}</span>
                  ) : row.hasPromo ? (
                    <span className="mt-0.5 block text-xs font-medium text-ok">promo</span>
                  ) : null}
                </td>

                <td className="whitespace-nowrap px-3 py-3 text-right">
                  {/*
                    Icon plus text, never colour alone. "En stock" green against "En rupture" red is
                    invisible to the ~8% of men with a red-green deficiency, and this column is the
                    one a shopper is scanning down.
                  */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium',
                      row.inStock ? 'text-ok' : 'text-ink-3'
                    )}
                  >
                    {row.inStock ? (
                      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">{row.inStock ? 'En stock' : 'Sur commande'}</span>
                    <span className="sm:hidden">{row.inStock ? 'Oui' : 'Non'}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
