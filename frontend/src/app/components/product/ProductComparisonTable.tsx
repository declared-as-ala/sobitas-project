import { ArrowUpRight, Check, Minus } from 'lucide-react';
import type { ComparisonRow } from '@/util/productComparison';
import { formatTnd } from '@/util/productPrice';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ComparisonProductImage } from './ComparisonProductImage';
import { ComparisonNutrition } from './ComparisonNutrition';
import styles from './ProductComparisonTable.module.css';

export function ProductComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (!rows.length) return null;
  return <div data-comparison>
    <p className="mb-3 text-sm text-ink-2">Des alternatives en stock. Comparez aussi la taille des portions : les valeurs ne sont pas toujours données pour la même quantité.</p>
    <div className="overflow-hidden rounded-xl border border-hairline bg-elevated">
      <table className={styles.table}>
        <caption className="sr-only">Produit consulté et alternatives disponibles</caption>
        <thead className={styles.head}><tr>{['Produit', 'Valeurs nutritionnelles', 'Mentions de la fiche', 'Prix', 'Disponibilité'].map(label => <th key={label} scope="col" className="bg-sunken px-4 py-3 text-left text-xs font-semibold text-ink-2">{label}</th>)}</tr></thead>
        <tbody className={styles.body}>{rows.map(row => <tr key={row.id} className={styles.row} data-current={row.isCurrent || undefined}>
          <th scope="row" className={styles.product}>
            <div className="flex items-start gap-3">
              <ComparisonProductImage src={row.image} name={row.name} />
              <div className="min-w-0">
                {row.isCurrent ? <p aria-current="true" className="font-semibold text-ink-1">{row.name}</p> : <LinkWithLoading href={row.url} className="inline-flex min-h-11 items-center font-semibold text-ink-1 hover:text-brand focus-visible:ring-2 focus-visible:ring-focus">{row.name}</LinkWithLoading>}
                <p className="mt-1 text-xs text-ink-2">{[row.brand, row.format].filter(Boolean).join(' · ')}</p>
                {row.categoryUrl && <LinkWithLoading href={row.categoryUrl} className="inline-flex min-h-11 items-center text-xs text-ink-2 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-focus">{row.category}</LinkWithLoading>}
                {row.isCurrent && <span className="mt-1 block text-xs font-semibold text-brand">Produit consulté</span>}
              </div>
            </div>
          </th>
          <td className={styles.nutrition}><ComparisonNutrition facts={row.facts} /></td>
          <td className={styles.claims}>
            <dl className="space-y-2 text-xs"><div><dt className="text-ink-2">Sans gluten</dt><dd className="mt-0.5 font-medium text-ink-1">{row.facts.gluten}</dd></div><div><dt className="text-ink-2">Sans lactose</dt><dd className="mt-0.5 font-medium text-ink-1">{row.facts.lactose}</dd></div></dl>
          </td>
          <td className={styles.price}><span className="whitespace-nowrap font-display text-xl font-bold text-brand">{formatTnd(row.price)}</span>{row.oldPrice != null && <span className="block text-xs text-ink-2 line-through">{formatTnd(row.oldPrice)}</span>}</td>
          <td className={styles.stock}>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${row.inStock ? 'text-ok' : 'text-ink-2'}`}>{row.inStock ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}{row.inStock ? 'En stock' : 'Sur commande'}</span>
            {!row.isCurrent && <LinkWithLoading href={row.url} className="mt-2 flex min-h-11 items-center justify-center gap-1 rounded-lg bg-brand px-3 text-sm font-semibold text-on-brand hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-focus">Voir le produit<ArrowUpRight className="h-4 w-4 shrink-0" /></LinkWithLoading>}
          </td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="mt-3 text-xs leading-relaxed text-ink-2">Informations issues des fiches produits. « Non renseigné » ne signifie pas « sans allergène ». Vérifiez l’étiquette du format et de l’arôme choisis.</p>
  </div>;
}
