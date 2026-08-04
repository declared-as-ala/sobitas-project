'use client';

/**
 * The goal question, as one row.
 *
 * ── WHAT IT REPLACES AND WHY ──────────────────────────────────────────────────────────────
 * The advisor asked this same question with four cards, each carrying a hint line, inside a bordered
 * plate with its own icon and heading: **470 px of screen to collect one tap**, and it sat between
 * the visitor and the products. Measured, the first "Ajouter" on a product was 1,117 px down — one
 * and a half iPhone screens of preamble before the page's actual feature became usable. Owner:
 * *"why should I see all those intros from the up… I want to directly start making my pack."*
 *
 * The question is worth keeping — it reorders five shelves usefully and costs one tap. The
 * PACKAGING was the problem. So: four chips, one row, horizontally scrollable, and answering
 * applies immediately. There is no "confirm" step, because a choice that only reorders (never
 * filters, never hides) is fully reversible — a confirm button on a reversible action is a tax.
 *
 * The calculator is not deleted. It moves behind "Calculer mes besoins", where it is available to
 * the minority who want it and invisible to everyone else. That is the correct shape for an
 * optional form: progressive disclosure, not a wall.
 */

import { useCallback, useState } from 'react';
import { Calculator, Target, X } from 'lucide-react';
import { GOAL_LABELS, type Goal } from '@/util/nutritionTargets';
import { PackAdvisor, type AdvisorResult } from './PackAdvisor';

const GOALS = Object.keys(GOAL_LABELS) as Goal[];

export interface PackGoalBarProps {
  /** The goal currently applied, or null when the visitor has not answered. */
  goal: Goal | null;
  onSelect: (goal: Goal) => void;
  onApplyAdvisor: (result: AdvisorResult) => void;
  onClear: () => void;
  availableSlugs: string[];
}

export function PackGoalBar({ goal, onSelect, onApplyAdvisor, onClear, availableSlugs }: PackGoalBarProps) {
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const handleApply = useCallback(
    (result: AdvisorResult) => {
      onApplyAdvisor(result);
      setCalculatorOpen(false);
    },
    [onApplyAdvisor]
  );

  return (
    <section aria-labelledby="pack-goal-h" className="mt-4">
      <div className="flex items-center gap-2.5">
        <Target className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        <h2 id="pack-goal-h" className="shrink-0 font-display text-xs font-extrabold uppercase tracking-tight text-ink-1">
          Votre objectif
        </h2>
        {goal && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-ink-3 transition-colors [@media(hover:hover)]:hover:text-brand"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Effacer
          </button>
        )}
      </div>

      {/* Bleeds to the edge on mobile for the same reason the shelves do: a chip row that stops at
          the container padding looks finished, and people do not try to scroll it. */}
      <div
        role="group"
        aria-label="Choisissez votre objectif"
        className="scrollbar-hide -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0"
      >
        {GOALS.map((g) => {
          const active = goal === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => onSelect(g)}
              aria-pressed={active}
              className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,color,transform] active:scale-95 ${
                active
                  ? 'border-brand bg-brand text-on-brand'
                  : 'border-hairline bg-canvas text-ink-2 [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand'
              }`}
            >
              {GOAL_LABELS[g].label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setCalculatorOpen((v) => !v)}
          aria-expanded={calculatorOpen}
          aria-controls="pack-calculator"
          className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed px-4 text-sm font-semibold transition-colors ${
            calculatorOpen ? 'border-brand text-brand' : 'border-hairline text-ink-3 [@media(hover:hover)]:hover:text-brand'
          }`}
        >
          <Calculator className="h-4 w-4" aria-hidden="true" />
          Calculer mes besoins
        </button>
      </div>

      {calculatorOpen && (
        <div id="pack-calculator" className="mt-3">
          <PackAdvisor onApply={handleApply} availableSlugs={availableSlugs} initialGoal={goal} />
        </div>
      )}
    </section>
  );
}
