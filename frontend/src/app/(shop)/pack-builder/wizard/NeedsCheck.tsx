'use client';

/**
 * The optional needs check on the last step — "on peut calculer vos besoins".
 *
 * ── THE LINE THIS COMPONENT WILL NOT CROSS, AND WHY IT MATTERS HERE MOST ───────────────────
 * The brief asks to "calculate and see if that pack is good for him or not". It does the first
 * half and deliberately stops short of the second in one specific way: it never converts a
 * nutritional target into a quantity of product.
 *
 * That is not caution for its own sake. Saying "your pack provides 140 g of protein a day"
 * requires each product's protein-per-serving, which this project does not hold and does not
 * synthesise — a standing constraint on the whole codebase, because people dose themselves on
 * those numbers. An invented figure here would be indistinguishable from a real one and acted on
 * exactly as if it were real.
 *
 * So the verdict this component contributes is: *here is the daily range the published literature
 * associates with your body and your goal, and here is which CATEGORIES your pack covers.* Joining
 * those two is a judgement the visitor makes, with both halves in front of them and the source of
 * each one named.
 *
 * Every equation comes from `util/nutritionTargets.ts`, where each is cited. Nothing is computed
 * here.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { m } from 'motion/react';
import { Flame, Info, TrendingUp } from 'lucide-react';
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  LIMITS,
  computeTargets,
  validateProfile,
  type ActivityLevel,
  type Goal,
  type Profile,
  type Sex,
  type Targets,
} from '@/util/nutritionTargets';
import { childVariants, popVariants, tap } from './variants';

const ACTIVITIES = Object.keys(ACTIVITY_LABELS) as ActivityLevel[];

/**
 * ── THE UNIT MOVED INTO THE LABEL, AND THAT IS A LAYOUT FIX, NOT A STYLE ONE ───────────────
 * These three fields sit in a `grid-cols-3` and the unit was an absolutely-positioned suffix
 * inside the box, reserved with `pr-11` — 44px of the field's width, permanently.
 *
 * At 320px that arithmetic collapses: the row is 288px wide, so each field is 88px, and 44px of
 * padding-right plus 12px of padding-left leaves THIRTY-TWO pixels for an 18px bold number. "180"
 * does not fit in 32px. The field was unusable at the narrowest viewport the site supports, and
 * the audit had never caught it because the panel is collapsed on first paint — nothing that only
 * measures the page as it loads can ever see inside it.
 *
 * "Taille (cm)" in the label says the same thing, costs no width inside the box, and deletes an
 * element per field. `pr-3` restores 32px to every field: 44px of room for the number at 320px,
 * and the number is what the field is for.
 */
function Field({
  id,
  label,
  value,
  onChange,
  min,
  max,
  error,
}: {
  id: string;
  /** Includes the unit, e.g. "Taille (cm)" — see the note above. */
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  error?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </label>
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
        className={`h-12 w-full rounded-xl border bg-sunken px-3 font-display text-lg font-bold tabular-nums text-ink-1 outline-none transition-colors [appearance:textfield] focus:border-brand focus:ring-2 focus:ring-brand/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
          error ? 'border-destructive' : 'border-hairline'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export interface NeedsCheckProps {
  /** The goal chosen in step 1. Required — the targets are goal-dependent. */
  goal: Goal;
  calm: boolean;
}

export function NeedsCheck({ goal, calm }: NeedsCheckProps) {
  const [sex, setSex] = useState<Sex>('homme');
  const [activity, setActivity] = useState<ActivityLevel>('modere');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [targets, setTargets] = useState<Targets | null>(null);
  const [touched, setTouched] = useState(false);

  const numbers = useMemo(
    () => ({ age: Number(age), heightCm: Number(heightCm), weightKg: Number(weightKg) }),
    [age, heightCm, weightKg]
  );
  const filled = age !== '' && heightCm !== '' && weightKg !== '';

  /**
   * Missing fields produce an error too.
   *
   * `validateProfile` only reports values that are OUT OF RANGE, and it was previously called only
   * when every field was already filled — so pressing "Calculer mes besoins" with a blank field did
   * nothing at all. No result, no message, no focus move, no disabled state to explain the
   * stillness. The visitor's only available conclusion was that the feature is broken.
   */
  const errors = useMemo(() => {
    const out = validateProfile(numbers);
    const missing: { field: 'age' | 'heightCm' | 'weightKg'; message: string }[] = [];
    if (age === '') missing.push({ field: 'age', message: 'Requis.' });
    if (heightCm === '') missing.push({ field: 'heightCm', message: 'Requis.' });
    if (weightKg === '') missing.push({ field: 'weightKg', message: 'Requis.' });
    return [...missing, ...out];
  }, [numbers, age, heightCm, weightKg]);

  const errorFor = (f: 'age' | 'heightCm' | 'weightKg') =>
    touched ? errors.find((e) => e.field === f)?.message : undefined;

  const resultRef = useRef<HTMLDivElement>(null);

  const calculate = useCallback(() => {
    setTouched(true);
    if (!filled || errors.length > 0) {
      // Send focus to the first field that needs attention. Without this the error messages appear
      // below the fold on a phone and a screen reader is told nothing at all.
      const first = errors[0];
      if (first) {
        const id = first.field === 'age' ? 'nc-age' : first.field === 'heightCm' ? 'nc-height' : 'nc-weight';
        document.getElementById(id)?.focus();
      }
      return;
    }
    setTargets(computeTargets({ sex, activity, goal, ...numbers } as Profile));
    /* `resultRef` was declared and attached and then never read — the one thing it was created for
       was never wired up. It matters on a phone: the three result cards render BELOW a five-field
       form, so at 390px pressing "Calculer mes besoins" scrolled nothing, changed nothing visible,
       and the answer sat off-screen. The button appeared to do nothing, which is the same symptom
       as the blank-field bug fixed above and just as easy to read as "this feature is broken".
       `block: 'nearest'` rather than 'start' so a result already in view is not yanked upward. */
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'nearest' })
    );
  }, [filled, errors, sex, activity, goal, numbers, calm]);

  const child = childVariants(calm);

  return (
    <div>
      <fieldset className="mb-4">
        <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Sexe</legend>
        <div className="inline-flex rounded-xl border border-hairline bg-sunken p-1">
          {(['homme', 'femme'] as Sex[]).map((s) => (
            <m.button
              key={s}
              type="button"
              whileTap={tap(calm)}
              onClick={() => setSex(s)}
              aria-pressed={sex === s}
              className={`min-h-[44px] rounded-lg px-6 text-sm font-semibold capitalize transition-colors ${
                sex === s ? 'bg-brand text-on-brand' : 'text-ink-2'
              }`}
            >
              {s}
            </m.button>
          ))}
        </div>
      </fieldset>

      {/* `gap-2` below `sm`, up to 3 above. At 320px three columns and 2×12px of gap left 88px per
          field; 2×8px leaves 90.7. Small, and it is 3% of a field that had none to spare. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Field id="nc-age" label="Âge (ans)" value={age} onChange={setAge} min={LIMITS.age.min} max={LIMITS.age.max} error={errorFor('age')} />
        <Field id="nc-height" label="Taille (cm)" value={heightCm} onChange={setHeightCm} min={LIMITS.heightCm.min} max={LIMITS.heightCm.max} error={errorFor('heightCm')} />
        <Field id="nc-weight" label="Poids (kg)" value={weightKg} onChange={setWeightKg} min={LIMITS.weightKg.min} max={LIMITS.weightKg.max} error={errorFor('weightKg')} />
      </div>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
          Niveau d&apos;activité
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACTIVITIES.map((a) => (
            <m.button
              key={a}
              type="button"
              whileTap={tap(calm)}
              onClick={() => setActivity(a)}
              aria-pressed={activity === a}
              className={`min-h-[56px] rounded-xl border p-2.5 text-left transition-colors ${
                activity === a ? 'border-brand bg-brand/5' : 'border-hairline bg-sunken'
              }`}
            >
              <span className={`block text-xs font-bold leading-tight ${activity === a ? 'text-brand' : 'text-ink-1'}`}>
                {ACTIVITY_LABELS[a].label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">{ACTIVITY_LABELS[a].hint}</span>
            </m.button>
          ))}
        </div>
      </fieldset>

      <m.button
        type="button"
        onClick={calculate}
        whileTap={tap(calm)}
        className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand font-display text-sm font-bold uppercase tracking-wide text-on-brand transition-colors [@media(hover:hover)]:hover:bg-brand-hover"
      >
        Calculer mes besoins
      </m.button>

      {/* `role="status"` so the computed figures are announced. Without it the button appears to do
          nothing to a screen-reader user: focus stays on the button, three cards render silently
          below it, and there is no cue that a result exists at all. */}
      {targets && (
        <m.div
          ref={resultRef}
          role="status"
          aria-live="polite"
          initial="enter"
          animate="center"
          variants={child}
          data-motion
          className="mt-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <m.div variants={popVariants(calm)} className="rounded-xl border border-hairline bg-sunken p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Métabolisme de base</p>
              <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-ink-1">
                {targets.bmr.toLocaleString('fr-FR')} <span className="text-sm font-bold text-ink-3">kcal</span>
              </p>
              <p className="mt-0.5 text-[11px] text-ink-3">au repos, sur 24 h</p>
            </m.div>

            <m.div variants={popVariants(calm)} className="rounded-xl border border-hairline bg-sunken p-3.5">
              <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                <Flame className="h-3 w-3" aria-hidden="true" />
                Énergie conseillée
              </p>
              <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-ink-1">
                {targets.energy.min === targets.energy.max
                  ? targets.energy.min.toLocaleString('fr-FR')
                  : `${targets.energy.min.toLocaleString('fr-FR')}–${targets.energy.max.toLocaleString('fr-FR')}`}{' '}
                <span className="text-sm font-bold text-ink-3">kcal</span>
              </p>
              <p className="mt-0.5 text-[11px] text-ink-3">par jour, pour {GOAL_LABELS[goal].label.toLowerCase()}</p>
            </m.div>

            <m.div variants={popVariants(calm)} className="rounded-xl border border-brand/30 bg-brand/5 p-3.5">
              <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-brand">
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                Protéines
              </p>
              <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-ink-1">
                {targets.protein.min}–{targets.protein.max} <span className="text-sm font-bold text-ink-3">g</span>
              </p>
              <p className="mt-0.5 text-[11px] text-ink-3">par jour, alimentation comprise</p>
            </m.div>
          </div>

          {/* "alimentation comprise" above, and this line, are the whole reason this can be shown
              at all: the figure is a DAILY TOTAL from food and supplements together, not a dose to
              take from the pack. */}
          <p className="mt-4 flex gap-2 text-[11px] leading-relaxed text-ink-3">
            <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Estimation calculée avec l&apos;équation de Mifflin-St&nbsp;Jeor (1990) et les apports protéiques de la
              position de l&apos;ISSN (2017). Ces équations prédisent un individu moyen à environ ±10&nbsp;%. Il
              s&apos;agit d&apos;un repère, pas d&apos;un avis médical&nbsp;: en cas de pathologie, de grossesse ou de
              traitement, demandez conseil à un médecin ou à un diététicien.
            </span>
          </p>
        </m.div>
      )}
    </div>
  );
}
