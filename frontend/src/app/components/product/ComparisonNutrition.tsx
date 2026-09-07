import { COMPARISON_NUTRIENTS, declaresNutrition, type ComparisonFacts, type ComparisonNutrientKey } from '@/util/productComparisonFacts';

/**
 * One product's nutrition cell in the comparison table.
 *
 * `nutrients` is decided ONCE for the whole table by `visibleNutrients` — see that function for
 * the measurement. Passing it in rather than hardcoding the five macros here is what stops a
 * creatine page printing "Protéines —".
 *
 * The other half is the empty state. A product that declares no panel at all used to render as a
 * column of identical dashes, one per nutrient, which reads as five separate failures rather than
 * one missing document. It now says so once.
 */
export function ComparisonNutrition({
  facts,
  nutrients = COMPARISON_NUTRIENTS,
}: {
  facts: ComparisonFacts;
  nutrients?: readonly { key: ComparisonNutrientKey; label: string }[];
}) {
  if (nutrients.length === 0) return null;

  if (!declaresNutrition(facts)) {
    return (
      <p className="text-xs leading-snug text-ink-3">
        Valeurs non publiées par le fabricant
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-medium text-ink-3">{facts.basis}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs xl:block xl:space-y-1.5">
        {nutrients.map(({ key, label }) => (
          <div key={key} className="flex min-w-0 justify-between gap-2">
            <dt className="text-ink-2">{label}</dt>
            <dd className="truncate font-semibold text-ink-1">{facts[key] || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
