import type { ComparisonFacts } from '@/util/productComparisonFacts';
export function ComparisonNutrition({ facts }: { facts: ComparisonFacts }) {
  return <div><p className="mb-2 text-xs text-ink-2">{facts.basis}</p><dl className="space-y-1 text-xs">
    {[['Protéines', facts.protein], ['Sucres', facts.sugars], ['Énergie', facts.energy]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-x-3"><dt className="text-ink-2">{label}</dt><dd className="font-semibold text-ink-1">{value || 'Non renseigné'}</dd></div>)}
  </dl></div>;
}
