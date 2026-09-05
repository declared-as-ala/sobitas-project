import type { ComparisonFacts } from '@/util/productComparisonFacts';
export function ComparisonNutrition({ facts }: { facts: ComparisonFacts }) {
  const nutrients = [
    ['Protéines', facts.protein],
    ['Glucides', facts.carbohydrates],
    ['Sucres', facts.sugars],
    ['Lipides', facts.fat],
    ['Énergie', facts.energy],
  ];

  return <div>
    <p className="mb-2 text-[11px] font-medium text-ink-3">{facts.basis}</p>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs xl:block xl:space-y-1.5">
      {nutrients.map(([label, value]) => <div key={label} className="flex min-w-0 justify-between gap-2"><dt className="text-ink-2">{label}</dt><dd className="truncate font-semibold text-ink-1">{value || '—'}</dd></div>)}
    </dl>
  </div>;
}
