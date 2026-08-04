'use client';

/**
 * "Trouvez votre pack" — the guided entry point to the pack builder.
 *
 * ── WHY IT IS SHAPED LIKE THIS ─────────────────────────────────────────────────────────────
 * The builder before this was a wall of five product grids and a running total. It asked the
 * visitor to already know what a gainer is, which category they need, and how much. Most people
 * arriving at a supplement store do not, so the page converted the minority who did and lost the
 * rest. This flow inverts it: state a goal, optionally give a profile, and the page proposes
 * where to start.
 *
 * Progressive disclosure is deliberate. Goal first — one tap, no typing, and it alone is enough
 * to order the catalogue usefully. The measurements are OPTIONAL and only appear afterwards,
 * because a form asking a stranger's weight before showing them anything is where people leave.
 *
 * ── WHAT IT WILL NOT DO ────────────────────────────────────────────────────────────────────
 * It never converts a nutritional target into a quantity of product. `nutritionTargets.ts`
 * computes a daily protein range from published equations; turning that into "buy N pots" needs
 * each product's protein-per-serving, which this project does not synthesise. So the advisor
 * suggests CATEGORIES and explains why, and the visitor chooses quantities in the builder. The
 * targets are shown as context for that decision, with their source named, never as a
 * prescription.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ACTIVITY_LABELS,
  GOAL_CATEGORY_EMPHASIS,
  GOAL_LABELS,
  GOAL_RATIONALE,
  LIMITS,
  computeTargets,
  validateProfile,
  type ActivityLevel,
  type Goal,
  type Profile,
  type Sex,
  type Targets,
} from '@/util/nutritionTargets';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, Calculator, Flame, Info, Target, TrendingUp } from 'lucide-react';

const GOALS = Object.keys(GOAL_LABELS) as Goal[];
const ACTIVITIES = Object.keys(ACTIVITY_LABELS) as ActivityLevel[];

export interface AdvisorResult {
  goal: Goal;
  /** Category slugs, most relevant first. The builder uses this to order its groups. */
  categoryOrder: string[];
  targets: Targets | null;
}

interface PackAdvisorProps {
  onApply: (result: AdvisorResult) => void;
  /** Slugs the builder actually has products for, so we never point at an empty group. */
  availableSlugs: string[];
  /**
   * The goal already chosen in `PackGoalBar`, if any.
   *
   * When it is set, step 1 is not rendered: the four chips are sitting directly above this panel,
   * so drawing the same question again inside it would make the visitor answer twice and leave two
   * controls able to disagree about the same value. When it is null — someone who opened the
   * calculator before answering anything — step 1 appears as before, because a goal is required to
   * compute an energy target at all.
   */
  initialGoal?: Goal | null;
}

/** A labelled numeric field. `inputMode="numeric"` gets the phone keypad without a spinner. */
function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  min,
  max,
  error,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  error?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 w-full rounded-xl border bg-canvas px-3 pr-12 font-display text-lg font-bold tabular-nums text-ink-1 outline-none transition-colors [appearance:textfield] focus:border-brand focus:ring-2 focus:ring-brand/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            error ? 'border-destructive' : 'border-hairline'
          }`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">{unit}</span>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function PackAdvisor({ onApply, availableSlugs, initialGoal = null }: PackAdvisorProps) {
  const [goal, setGoal] = useState<Goal | null>(initialGoal);
  // Opened deliberately from a control labelled "Calculer mes besoins", so the form is already the
  // thing that was asked for. Making the visitor click a second "Calculer mes besoins" inside it
  // would be a door behind a door.
  const [showProfile, setShowProfile] = useState(initialGoal !== null);
  const [sex, setSex] = useState<Sex>('homme');
  const [activity, setActivity] = useState<ActivityLevel>('modere');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [targets, setTargets] = useState<Targets | null>(null);
  const [touched, setTouched] = useState(false);

  const numbers = useMemo(
    () => ({ age: Number(age), heightCm: Number(heightCm), weightKg: Number(weightKg) }),
    [age, heightCm, weightKg],
  );

  const filled = age !== '' && heightCm !== '' && weightKg !== '';
  const errors = useMemo(() => (filled ? validateProfile(numbers) : []), [filled, numbers]);
  const errorFor = (field: 'age' | 'heightCm' | 'weightKg') =>
    touched ? errors.find((e) => e.field === field)?.message : undefined;

  /** Recommended categories, filtered to what the builder can actually show. */
  const categoryOrder = useMemo(() => {
    if (!goal) return [];
    const emphasis = GOAL_CATEGORY_EMPHASIS[goal].filter((s) => availableSlugs.includes(s));
    const rest = availableSlugs.filter((s) => !emphasis.includes(s));
    return [...emphasis, ...rest];
  }, [goal, availableSlugs]);

  const handleCalculate = useCallback(() => {
    setTouched(true);
    if (!goal || !filled || errors.length > 0) return;
    setTargets(computeTargets({ sex, activity, goal, ...numbers } as Profile));
  }, [goal, filled, errors.length, sex, activity, numbers]);

  const handleApply = useCallback(() => {
    if (!goal) return;
    onApply({ goal, categoryOrder, targets });
  }, [goal, categoryOrder, targets, onApply]);

  return (
    <div className="pt-plate font-poppins overflow-hidden rounded-2xl border border-hairline">
      {/* ── Step 1 · goal ─────────────────────────────────────────────────────────────── */}
      {initialGoal === null && (
      <div className="border-b border-hairline p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Target className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1 sm:text-lg">
              Quel est votre objectif&nbsp;?
            </h2>
            <p className="text-xs text-ink-3">Une seule réponse suffit pour commencer.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {GOALS.map((g) => {
            const active = goal === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGoal(g);
                  setTargets(null);
                }}
                aria-pressed={active}
                className={`min-h-[76px] rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-hairline bg-canvas [@media(hover:hover)]:hover:border-brand/40'
                }`}
              >
                <span className={`block text-sm font-bold leading-tight ${active ? 'text-brand' : 'text-ink-1'}`}>
                  {GOAL_LABELS[g].label}
                </span>
                <span className="mt-1 block text-xs leading-snug text-ink-3">{GOAL_LABELS[g].hint}</span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* ── Step 2 · optional profile ─────────────────────────────────────────────────── */}
      {goal && (
        <div className="border-b border-hairline bg-sunken p-5 sm:p-6">
          {!showProfile ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Calculator className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                <p className="text-sm text-ink-2">
                  Vous voulez connaître vos besoins quotidiens&nbsp;? C&apos;est optionnel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand"
              >
                Calculer mes besoins
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Calculator className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1 sm:text-lg">
                    Votre profil
                  </h2>
                  <p className="text-xs text-ink-3">Sert uniquement au calcul. Rien n&apos;est enregistré.</p>
                </div>
              </div>

              {/* sex */}
              <fieldset className="mb-4">
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Sexe</legend>
                <div className="inline-flex rounded-xl border border-hairline bg-canvas p-1">
                  {(['homme', 'femme'] as Sex[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSex(s)}
                      aria-pressed={sex === s}
                      className={`min-h-[44px] rounded-lg px-5 text-sm font-semibold capitalize transition-colors ${
                        sex === s ? 'bg-brand text-white' : 'text-ink-2'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-3 gap-3">
                <NumberField
                  id="adv-age"
                  label="Âge"
                  unit="ans"
                  value={age}
                  onChange={setAge}
                  min={LIMITS.age.min}
                  max={LIMITS.age.max}
                  error={errorFor('age')}
                />
                <NumberField
                  id="adv-height"
                  label="Taille"
                  unit="cm"
                  value={heightCm}
                  onChange={setHeightCm}
                  min={LIMITS.heightCm.min}
                  max={LIMITS.heightCm.max}
                  error={errorFor('heightCm')}
                />
                <NumberField
                  id="adv-weight"
                  label="Poids"
                  unit="kg"
                  value={weightKg}
                  onChange={setWeightKg}
                  min={LIMITS.weightKg.min}
                  max={LIMITS.weightKg.max}
                  error={errorFor('weightKg')}
                />
              </div>

              {/* activity */}
              <fieldset className="mt-4">
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">
                  Niveau d&apos;activité
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {ACTIVITIES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setActivity(a)}
                      aria-pressed={activity === a}
                      className={`min-h-[60px] rounded-xl border p-2.5 text-left transition-colors ${
                        activity === a ? 'border-brand bg-brand/5' : 'border-hairline bg-canvas'
                      }`}
                    >
                      <span
                        className={`block text-xs font-bold leading-tight ${activity === a ? 'text-brand' : 'text-ink-1'}`}
                      >
                        {ACTIVITY_LABELS[a].label}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">
                        {ACTIVITY_LABELS[a].hint}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <Button type="button" onClick={handleCalculate} className="mt-4 min-h-[48px] w-full sm:w-auto">
                Calculer mes besoins
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Step 3 · what we suggest ──────────────────────────────────────────────────── */}
      {goal && (
        <div className="p-5 sm:p-6">
          {targets && (
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-hairline bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Métabolisme de base</p>
                <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink-1">
                  {targets.bmr.toLocaleString('fr-FR')} <span className="text-base font-bold text-ink-3">kcal</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-3">au repos, sur 24&nbsp;h</p>
              </div>
              <div className="rounded-xl border border-hairline bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
                  <Flame className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
                  Énergie conseillée
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink-1">
                  {targets.energy.min === targets.energy.max
                    ? targets.energy.min.toLocaleString('fr-FR')
                    : `${targets.energy.min.toLocaleString('fr-FR')}–${targets.energy.max.toLocaleString('fr-FR')}`}{' '}
                  <span className="text-base font-bold text-ink-3">kcal</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-3">par jour, pour {GOAL_LABELS[goal].label.toLowerCase()}</p>
              </div>
              <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  <TrendingUp className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
                  Protéines
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink-1">
                  {targets.protein.min}–{targets.protein.max} <span className="text-base font-bold text-ink-3">g</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-3">par jour, alimentation comprise</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-hairline bg-sunken p-4">
            <p className="text-sm leading-relaxed text-ink-2">{GOAL_RATIONALE[goal]}</p>
          </div>

          <Button type="button" onClick={handleApply} className="mt-4 min-h-[48px] w-full">
            Voir les produits conseillés
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
          </Button>

          {targets && (
            <p className="mt-4 flex gap-2 text-[11px] leading-relaxed text-ink-3">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                Estimation calculée avec l&apos;équation de Mifflin-St&nbsp;Jeor (1990) et les apports protéiques de
                la position de l&apos;ISSN (2017). Ces équations prédisent un individu moyen à environ ±10&nbsp;%.
                Il s&apos;agit d&apos;un repère, pas d&apos;un avis médical&nbsp;: en cas de pathologie, de grossesse
                ou de traitement, demandez conseil à un médecin ou à un diététicien.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
