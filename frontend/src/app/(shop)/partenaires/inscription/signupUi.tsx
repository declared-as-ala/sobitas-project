'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';
import { Check, ChevronLeft, FlaskConical, Lock, Phone, TriangleAlert } from 'lucide-react';
import { Section } from '@/app/components/layout/Section';
import { cn } from '@/app/components/ui/utils';
import { SIGNUP_STEPS, type SignupStepId } from '../affiliateCopy';

/**
 * The furniture of the affiliate signup: the band, the progress, the headings, the buttons.
 *
 * ── WHY THESE LIVE TOGETHER ───────────────────────────────────────────────────────────────
 * Five screens share one frame. Keeping the frame in one file is what makes "one decision per
 * screen" enforceable: a step file receives a heading, a body and one primary action, and has
 * no way to grow a second toolbar or a different button height without editing this file first.
 *
 * Fields are NOT here. `AuthField` and `AuthSubmit` in components/AuthShell already own the
 * input recipe used by /login, /register and /verify-phone, and this form reuses them rather
 * than forking the string — the only addition was an `error` prop on AuthField, made there.
 */

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * The shell
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

export interface SignupShellProps {
  /** 0-based index into SIGNUP_STEPS, or `SIGNUP_STEPS.length` once the flow is finished. */
  stepIndex: number;
  /**
   * Which screen is showing, echoed onto `data-signup-step`.
   *
   * A measurement hook, and it exists because of a documented failure mode: a guard that clicks
   * through a flow and screenshots whatever comes back can pass three times on the same screen.
   * `scripts/measure-affiliate-signup.mjs` asserts this attribute after every transition, so a
   * click that silently did nothing fails the run instead of producing a tidy report.
   */
  stepId?: string;
  /** Drawn only while the stub is serving the flow. See `affiliateProgram.stub.ts`. */
  demoNotice?: ReactNode;
  children: ReactNode;
}

/**
 * ONE band, `sunken`, holding one white card.
 *
 * Sunken and not canvas because the card is `bg-elevated`, which is #FFFFFF in light theme —
 * the same value as canvas. On a canvas band the card would be a white rectangle on white with
 * a 1.26:1 hairline as its only edge. Sand behind white is the same relationship /login uses at
 * `lg` and it is the reason the form reads as an object rather than as page text.
 */
export function SignupShell({ stepIndex, stepId, demoNotice, children }: SignupShellProps) {
  return (
    /*
     * `bg-sunken` on the WRAPPER, matching the band inside it.
     *
     * With `bg-canvas` here the page had a white strip between the band and the footer on every
     * screen shorter than the viewport — measured at 390, roughly 340px of nothing under the
     * confirmation card, because `min-h-screen` paints the wrapper's colour and the band stops
     * at its own content. Matching the two makes the fill continuous and the footer's own seam
     * the only boundary.
     */
    <div className="min-h-screen bg-sunken">
      <main>
        <Section as="div" spacing="tight" width="default" surface="sunken" first last>
          <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
            <SignupAside stepIndex={stepIndex} />

            <div className="min-w-0 lg:max-w-2xl" data-signup-step={stepId}>
              <MobileProgress stepIndex={stepIndex} />
              {demoNotice}
              <div data-signup-card className="rounded-2xl border border-hairline bg-elevated p-5 sm:p-6">
                {children}
              </div>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}

/**
 * The desktop rail: a vertical stepper plus two reassurances.
 *
 * `hidden lg:block` rather than a responsive reflow. Below 1024 the same information is carried
 * by MobileProgress in a fifth of the height, and a phone screen spent on a list of steps the
 * visitor cannot act on is height taken from the one step they can.
 */
function SignupAside({ stepIndex }: { stepIndex: number }) {
  return (
    <aside className="hidden lg:block">
      <ol className="space-y-1">
        {SIGNUP_STEPS.map((step, index) => {
          const done = index < stepIndex;
          const current = index === stepIndex;
          return (
            <li key={step.id} className="flex gap-3 rounded-xl p-2">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold tabular-nums',
                  done && 'bg-ok text-canvas',
                  current && 'bg-brand text-on-brand',
                  !done && !current && 'border border-rule text-ink-3',
                )}
                aria-hidden
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="min-w-0 pt-0.5">
                <span
                  className={cn(
                    'block text-sm font-semibold',
                    current ? 'text-ink-1' : done ? 'text-ink-2' : 'text-ink-3',
                  )}
                >
                  {step.label}
                  <span className="sr-only">
                    {done ? ' — terminé' : current ? ' — étape en cours' : ' — à venir'}
                  </span>
                </span>
                {current && <span className="mt-0.5 block text-xs leading-snug text-ink-2">{step.help}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 space-y-3">
        <p className="flex gap-3 rounded-xl border border-hairline bg-elevated p-4 text-xs leading-relaxed text-ink-2">
          <Lock className="h-4 w-4 shrink-0 text-ok" aria-hidden />
          <span>
            Votre pièce d’identité sert uniquement à vérifier qui vous êtes. Elle n’est jamais
            publiée et n’est visible que par notre équipe.
          </span>
        </p>
        <p className="flex gap-3 rounded-xl border border-hairline bg-elevated p-4 text-xs leading-relaxed text-ink-2">
          <Phone className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          <span>
            Bloqué quelque part ? Appelez-nous au{' '}
            <a
              href="tel:+21627612500"
              className="font-semibold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              27 612 500
            </a>{' '}
            et nous remplissons le dossier avec vous.
          </span>
        </p>
      </div>
    </aside>
  );
}

/**
 * The phone's progress: a counter, the step name, and five segments.
 *
 * A real `role="progressbar"` with `aria-valuetext`, not five decorative divs. The visitor most
 * likely to abandon this form is also the one most likely to be using a screen reader or a
 * zoomed viewport, and "Étape 3 sur 5" spoken aloud is the whole reassurance.
 */
function MobileProgress({ stepIndex }: { stepIndex: number }) {
  const total = SIGNUP_STEPS.length;
  const clamped = Math.min(stepIndex, total - 1);
  const step = SIGNUP_STEPS[clamped];
  const finished = stepIndex >= total;

  return (
    <div className="mb-4 lg:hidden">
      <div className="flex items-baseline justify-between gap-3">
        <span className="pt-kicker text-brand">
          {finished ? 'Terminé' : `Étape ${clamped + 1} sur ${total}`}
        </span>
        <span className="text-xs font-medium text-ink-2">{finished ? 'Demande envoyée' : step.label}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={finished ? total : clamped + 1}
        aria-valuetext={finished ? 'Inscription terminée' : `Étape ${clamped + 1} sur ${total} : ${step.label}`}
        className="mt-2 flex gap-1.5"
      >
        {SIGNUP_STEPS.map((s, index) => (
          <span
            key={s.id}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              index < stepIndex ? 'bg-ok' : index === stepIndex ? 'bg-brand' : 'bg-rule',
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * Inside the card
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

export function StepHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl font-extrabold uppercase leading-none tracking-tight text-ink-1 sm:text-3xl">
        {title}
      </h1>
      {children && <p className="mt-2 text-sm leading-relaxed text-ink-2">{children}</p>}
    </div>
  );
}

/**
 * The one error surface on every step.
 *
 * `role="alert"` so it is announced the moment it appears, and the colour lives in the border
 * and the text — never in the plate. `--c-danger` measures 4.84:1 on an untinted surface and
 * 4.39:1 once the same hue tints the background at 10%, which is a WCAG failure that looks
 * completely fine. Same rule as the account status chips.
 */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="mb-4 flex gap-2.5 rounded-xl border border-destructive/40 bg-elevated p-3 text-sm leading-snug text-destructive"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/**
 * The "this is not the real backend" banner. Only ever drawn when `affiliateProgramApi.isStub`.
 *
 * It is not decoration and it is not a developer convenience: it is the thing that makes a stub
 * safe to have on a route a customer can reach. Nobody who reads this can mistake the flow for a
 * real submission, and the day the endpoints land it disappears on its own — `isStub` goes false.
 */
export function DemoNotice({ code }: { code?: string }) {
  return (
    <p className="mb-4 flex gap-2.5 rounded-xl border border-warn/40 bg-elevated p-3 text-sm leading-snug text-ink-2">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
      <span>
        <strong className="font-semibold text-ink-1">Mode démonstration.</strong> Le service
        d’inscription n’est pas encore branché : rien n’est réellement envoyé.
        {code && (
          <>
            {' '}
            Le code de confirmation est{' '}
            <strong className="font-display text-base tracking-widest text-ink-1">{code}</strong>.
          </>
        )}
      </span>
    </p>
  );
}

/**
 * "Retour". A text button, 44px tall, aligned with the card's left edge by a negative inset so
 * the LABEL lines up with the content above it while the TARGET keeps its full size.
 */
export function BackButton({ onClick, label = 'Retour' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ms-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-ink-2 transition-colors [@media(hover:hover)]:hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * A native <select>
 * ──────────────────────────────────────────────────────────────────────────────────────────*/

/**
 * Mirrors `AuthField`'s recipe deliberately rather than reusing it: AuthField wraps an `<input>`
 * and this is a `<select>`, which is a different element with a different focus behaviour and a
 * platform-drawn popup.
 *
 * And it IS a native select, not a styled listbox. The visitor is a gym owner on a phone, and
 * the OS wheel picker they already know beats anything we would draw for 24 gouvernorats.
 */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  Icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  error?: string;
  Icon: typeof Check;
}) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-ink-1">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3"
          aria-hidden
        />
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId : undefined}
          className={cn(
            'h-12 w-full appearance-none rounded-xl border border-hairline bg-canvas ps-10 pe-4 text-base text-ink-1 shadow-sm outline-none',
            'transition-[border-color,box-shadow,background-color] hover:border-rule-strong',
            'focus-visible:border-brand focus-visible:bg-elevated focus-visible:ring-2 focus-visible:ring-focus',
            error && 'border-destructive hover:border-destructive',
            !value && 'text-ink-3',
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option} className="text-ink-1">
              {option}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p id={messageId} className="text-xs leading-snug text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export type { SignupStepId };
