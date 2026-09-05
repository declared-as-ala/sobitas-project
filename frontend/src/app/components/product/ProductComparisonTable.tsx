import { ArrowUpRight, Check, Minus, Scale, ShieldCheck } from 'lucide-react';
import type { ComparisonRow } from '@/util/productComparison';
import { formatTnd } from '@/util/productPrice';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ComparisonProductImage } from './ComparisonProductImage';
import { ComparisonNutrition } from './ComparisonNutrition';
import styles from './ProductComparisonTable.module.css';

export function ProductComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (!rows.length) return null;
  return <div data-comparison>
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-brand/15 bg-brand/5 p-3.5 sm:p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-elevated text-brand shadow-sm"><Scale className="h-4 w-4" aria-hidden="true" /></span>
      <div><p className="text-sm font-semibold text-ink-1">Choisissez avec des faits, pas seulement avec le prix.</p><p className="mt-0.5 text-xs leading-relaxed text-ink-2">Les valeurs sont affichées selon la portion déclarée par chaque fabricant. Vérifiez donc aussi la taille de la portion.</p></div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-card">
      <table className={styles.table}>
        <caption className="sr-only">Produit consulté et alternatives disponibles</caption>
        <thead className={styles.head}><tr>{['Produit', 'Nutrition', 'Tolérance', 'Prix', 'Choisir'].map(label => <th key={label} scope="col" className="bg-sunken px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">{label}</th>)}</tr></thead>
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
            <dl className="space-y-2 text-xs"><div><dt className="text-ink-2">Sans gluten</dt><dd className="mt-0.5 font-semibold text-ink-1">{row.facts.gluten}</dd></div><div><dt className="text-ink-2">Sans lactose</dt><dd className="mt-0.5 font-semibold text-ink-1">{row.facts.lactose}</dd></div></dl>
          </td>
          <td className={styles.price}><span className="whitespace-nowrap font-display text-xl font-bold text-brand">{formatTnd(row.price)}</span>{row.oldPrice != null && <span className="block text-xs text-ink-2 line-through">{formatTnd(row.oldPrice)}</span>}</td>
          <td className={styles.stock}>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${row.inStock ? 'text-ok' : 'text-ink-2'}`}>{row.inStock ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}{row.inStock ? 'En stock' : 'Sur commande'}</span>
            {!row.isCurrent && <LinkWithLoading href={row.url} className="mt-2 flex min-h-11 items-center justify-center gap-1 rounded-xl bg-brand px-3 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-focus">Voir le produit<ArrowUpRight className="h-4 w-4 shrink-0" /></LinkWithLoading>}
            {row.isCurrent && <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-3"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Référence</span>}
          </td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="mt-3 text-xs leading-relaxed text-ink-3">Données transcrites depuis les fiches officielles. Un tiret signifie que le fabricant ne communique pas cette valeur ; il ne garantit jamais l’absence d’un allergène.</p>
  </div>;
}
