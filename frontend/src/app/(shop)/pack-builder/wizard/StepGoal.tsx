'use client';

/**
 * Step 1 — one question, four answers, no typing.
 *
 * ── WHY THE ANSWER ADVANCES IMMEDIATELY ────────────────────────────────────────────────────
 * There is no "Continuer" here. Choosing a goal only REORDERS the category steps — it never
 * filters, never hides a product, and can be changed from the progress rail at any point. An
 * action that is fully reversible and has no destructive branch does not need a confirmation, and
 * a confirm button on one is a step the visitor pays for and gets nothing back from.
 *
 * ── AND WHY THE CARDS ARE BIG AGAIN ────────────────────────────────────────────────────────
 * These same four cards were compressed into chips in the previous layout, because they were
 * sitting between the visitor and the products and cost 470 px of screen to collect one tap. On
 * their own step that argument disappears: nothing is behind them, so the space is free, and the
 * hint line under each label ("Gagner du muscle et du poids") is what makes the question
 * answerable by someone who does not already know supplement vocabulary — which is precisely the
 * visitor this flow exists for.
 */

import { m } from 'motion/react';
import { ArrowRight, Target } from 'lucide-react';
import { GOAL_LABELS, type Goal } from '@/util/nutritionTargets';
import { childVariants, tap } from './variants';

const GOALS = Object.keys(GOAL_LABELS) as Goal[];

export interface StepGoalProps {
  goal: Goal | null;
  onSelect: (goal: Goal) => void;
  onSkip: () => void;
  calm: boolean;
}

export function StepGoal({ goal, onSelect, onSkip, calm }: StepGoalProps) {
  const child = childVariants(calm);

  return (
    <div className="mx-auto max-w-2xl">
      <m.div variants={child} className="text-center">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Target className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-3 font-display text-2xl font-extrabold uppercase leading-tight tracking-tight text-ink-1 sm:text-3xl">
          Quel est votre objectif&nbsp;?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
          On classe les catégories dans l&apos;ordre qui vous concerne. Vous gardez accès à tout.
        </p>
      </m.div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GOALS.map((g) => {
          const active = goal === g;
          return (
            <m.button
              key={g}
              type="button"
              variants={child}
              whileTap={tap(calm)}
              onClick={() => onSelect(g)}
              aria-pressed={active}
              className={`group flex min-h-[84px] items-center justify-between gap-3 rounded-xl border p-4 text-left transition-[border-color,background-color] ${
                active
                  ? 'border-brand bg-brand/5'
                  : 'border-hairline bg-elevated [@media(hover:hover)]:hover:border-brand/50'
              }`}
            >
              <span className="min-w-0">
                <span className={`block font-display text-base font-bold ${active ? 'text-brand' : 'text-ink-1'}`}>
                  {GOAL_LABELS[g].label}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-2">{GOAL_LABELS[g].hint}</span>
              </span>
              <ArrowRight
                className={`h-4 w-4 shrink-0 transition-[transform,color] ${
                  active ? 'text-brand' : 'text-ink-3'
                } [@media(hover:hover)]:group-hover:translate-x-0.5`}
                aria-hidden="true"
              />
            </m.button>
          );
        })}
      </div>

      {/* An explicit way past a question that is genuinely optional. Without it, someone who knows
          exactly what they want has to answer a personal question to reach a shop. */}
      <m.div variants={child} className="mt-5 text-center">
        <button
          type="button"
          onClick={onSkip}
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-ink-3 underline-offset-4 transition-colors [@media(hover:hover)]:hover:text-brand [@media(hover:hover)]:hover:underline"
        >
          Je sais déjà ce que je veux
        </button>
      </m.div>
    </div>
  );
}
