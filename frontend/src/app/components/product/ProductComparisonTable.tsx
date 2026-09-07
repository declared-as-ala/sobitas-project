import { ArrowUpRight, Check, Minus, Scale, ShieldCheck } from 'lucide-react';
import type { ComparisonRow } from '@/util/productComparison';
import { visibleNutrients } from '@/util/productComparisonFacts';
import { formatTnd } from '@/util/productPrice';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ComparisonProductImage } from './ComparisonProductImage';
import { ComparisonNutrition } from './ComparisonNutrition';
import styles from './ProductComparisonTable.module.css';

/**
 * ── COMPARER AVEC DES PRODUITS SIMILAIRES ───────────────────────────────────────────────────
 * Owner, 07/09/2026: *"make it more user friendly and mobile responsive, and if a product doesn't
 * have something make it smart — creatine can't have protein."*
 *
 * Measured on `/creatine/creatine-real-pharm-300g` at 390px:
 *
 *   table height   3 294px   — six rows, on an 844px screen. Four screens of scrolling.
 *   fact cells        42
 *   em-dashes         30     — 71 % of the table was blank
 *   labels printed    Protéines · Glucides · Sucres · Lipides · Énergie, on creatine monohydrate
 *
 * Two different things were wrong and only one of them was visual.
 *
 * THE FACTUAL ONE: the footnote said a dash means the manufacturer does not publish that value.
 * On this page it did not. Creatine monohydrate has no protein to publish. The table asserted
 * something about six manufacturers that was really a fact about chemistry, thirty times, under a
 * heading inviting a shopper to "choose with facts". `visibleNutrients` now decides the nutrient
 * rows from what the compared products actually declare, so that page draws none of them and the
 * nutrition column disappears entirely — see productComparisonFacts.ts.
 *
 * THE VISUAL ONE: with the column gone the row has four things left, and the old grid gave the
 * nutrition and tolerance blocks a 50/50 split of every card whether or not they held anything.
 * The tolerance pair moved in beside the price, and the "Voir le produit" action moved onto the
 * same line as the stock state instead of below it.
 */
export function ProductComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (!rows.length) return null;

  const nutrients = visibleNutrients(rows.map((row) => row.facts));
  const showNutrition = nutrients.length > 0;
  /* The dash disclaimer is only true when a dash can actually appear. With the column dropped, or
     with every declared nutrient filled on every row, printing it would explain a symbol that is
     not on the page. */
  const canShowDash = showNutrition && rows.some((row) => nutrients.some(({ key }) => !row.facts[key]));
  const columns = showNutrition
    ? ['Produit', 'Nutrition', 'Tolérance', 'Prix', 'Choisir']
    : ['Produit', 'Tolérance', 'Prix', 'Choisir'];

  return (
    <div data-comparison>
      {/* Was two sentences. The second explained that portion sizes differ between manufacturers —
          true, and already stated on every nutrition cell as its own basis line ("Par portion de
          30 g"), which is where a reader needs it rather than in a preamble they scroll past. */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand/15 bg-elevated p-3.5 sm:p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Scale className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-ink-1">Choisissez avec des faits, pas seulement avec le prix.</p>
      </div>

      {/* `styles.scroller` turns this into the horizontal viewport below 1024 and is inert above
          it. `tabIndex={0}` because a scrollable region that only responds to a swipe is
          unreachable by keyboard — the same reason it carries a role and a label. */}
      <div
        className={`${styles.scroller} overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-card`}
        tabIndex={0}
        role="region"
        aria-label="Tableau comparatif, défilement horizontal"
      >
        <table className={styles.table} data-columns={showNutrition ? 'full' : 'lean'}>
          <caption className="sr-only">Produit consulté et alternatives disponibles</caption>
          <thead className={styles.head}>
            <tr>
              {columns.map((label) => (
                <th key={label} scope="col" className="bg-sunken px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className={styles.body}>
            {rows.map((row) => (
              <tr key={row.id} className={styles.row} data-current={row.isCurrent || undefined}>
                <th scope="row" className={styles.product}>
                  <div className="flex items-start gap-3">
                    <ComparisonProductImage src={row.image} name={row.name} />
                    <div className="min-w-0">
                      {row.isCurrent
                        ? <p aria-current="true" className="font-semibold leading-snug text-ink-1">{row.name}</p>
                        : <LinkWithLoading href={row.url} className="inline-flex min-h-11 items-center font-semibold leading-snug text-ink-1 hover:text-brand focus-visible:ring-2 focus-visible:ring-focus">{row.name}</LinkWithLoading>}
                      <p className="mt-0.5 text-xs text-ink-2">{[row.brand, row.format].filter(Boolean).join(' · ')}</p>
                      {row.categoryUrl && <LinkWithLoading href={row.categoryUrl} className="inline-flex min-h-11 items-center text-xs text-ink-2 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-focus">{row.category}</LinkWithLoading>}
                      {row.isCurrent && <span className="mt-0.5 block text-xs font-semibold text-brand">Produit consulté</span>}
                    </div>
                  </div>
                </th>

                {showNutrition && (
                  <td className={styles.nutrition}>
                    <ComparisonNutrition facts={row.facts} nutrients={nutrients} />
                  </td>
                )}

                <td className={styles.claims}>
                  <dl className="space-y-2 text-xs">
                    <div><dt className="text-ink-2">Sans gluten</dt><dd className="mt-0.5 font-semibold text-ink-1">{row.facts.gluten}</dd></div>
                    <div><dt className="text-ink-2">Sans lactose</dt><dd className="mt-0.5 font-semibold text-ink-1">{row.facts.lactose}</dd></div>
                  </dl>
                </td>

                <td className={styles.price}>
                  <span className="whitespace-nowrap font-display text-xl font-bold text-brand">{formatTnd(row.price)}</span>
                  {row.oldPrice != null && <span className="block text-xs text-ink-2 line-through">{formatTnd(row.oldPrice)}</span>}
                </td>

                <td className={styles.stock}>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${row.inStock ? 'text-ok' : 'text-ink-2'}`}>
                    {row.inStock ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Minus className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    {row.inStock ? 'En stock' : 'Sur commande'}
                  </span>
                  {!row.isCurrent && (
                    <LinkWithLoading href={row.url} className="mt-2 flex min-h-11 items-center justify-center gap-1 rounded-xl bg-brand px-3 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-focus">
                      Voir le produit<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </LinkWithLoading>
                  )}
                  {row.isCurrent && (
                    <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-3">
                      <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />Référence
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        Données transcrites depuis les fiches officielles.
        {canShowDash && ' Un tiret signifie que le fabricant ne communique pas cette valeur.'}
        {' '}Aucune mention ne garantit l’absence d’un allergène.
      </p>
    </div>
  );
}
