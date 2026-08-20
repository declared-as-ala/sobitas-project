'use client';

import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { ShieldCheck, Truck, CreditCard, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useSiteLogos } from '@/hooks/useSiteLogos';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';

/**
 * ── THE FOUR AUTH SCREENS, REBUILT ON THE DESIGN SYSTEM (owner, 20/08/2026) ─────────────────
 * *"redesign the login and signup page, make it fit the landing page and the other pages design
 * we made, make it super responsive on all mobiles."*
 *
 * These four screens (login / register / forgot / reset) were the last part of the site still
 * written in the pre-token vocabulary, and they were the WORST of it: 132 lint violations across
 * five files — `bg-white dark:bg-gray-950`, `text-red-600 dark:text-red-400`, `border-gray-100`,
 * `focus-visible:ring-red-500`, a three-stop `from-red-700/60 via-gray-950/85 to-gray-950`
 * gradient, and `brightness-0 invert` on the logo. Every one of those is a decision written twice
 * that drifts independently, on the surface where a customer decides whether this shop looks like
 * a real business.
 *
 * The colour was not merely off-system, it was off-BRAND. `red-600` is #DC2626, a signal red; the
 * shop's accent is #D03B04, a deep orange. Side by side with the landing page the two do not read
 * as the same company — which is exactly what the owner is describing when they say it does not
 * fit.
 *
 * ── WHAT CHANGED STRUCTURALLY, NOT JUST IN COLOUR ───────────────────────────────────────────
 *
 *   THE FORM SAT IN A WHITE VOID. The right half was `bg-white` with a 448px form floating in the
 *   middle of it — on a 1536 viewport that is ~1,090px of empty white beside a form. It is now a
 *   CARD (`bg-elevated`, hairline, `shadow-card`) on a `bg-sunken` field, which is the same
 *   figure-on-ground the rest of the site uses for every panel it owns.
 *
 *   THE PANEL IS A SLAB, NOT A GRADIENT. `.pt-slab` is the scope the footer and the header's
 *   contact strip already use, so the left panel inherits ink and accent that are correct on a
 *   dark surface in BOTH themes with no `dark:` variant anywhere. The photograph keeps a plain
 *   `bg-black/…` scrim — DESIGN_SYSTEM is explicit that a scrim is black, never `bg-ink-1/…`,
 *   because ink inverts with the theme and a scrim must not.
 *
 *   THE LOGO IS THE LOGO. `brightness-0 invert` turned the orange wordmark into a white
 *   silhouette — the one asset on the page that carries the brand, with the brand removed from
 *   it. The footer renders it untouched on its own dark surface and so does this.
 *
 *   ONE FIELD COMPONENT, NOT FIVE COPIES. The icon + input + focus-ring markup was written out
 *   nine times across four files, and it had already drifted (the reset screen's ring, the
 *   forgot screen's card chrome). `AuthField` is the single definition.
 *
 * ── MOBILE ──────────────────────────────────────────────────────────────────────────────────
 * `min-h-dvh`, not `min-h-screen`: on iOS Safari `100vh` includes the browser chrome, so the old
 * shell was ~90px taller than the visible viewport and every auth screen started life scrolled.
 * The brand panel is desktop-only, so phones get a compact slab strip with the wordmark instead
 * of a 50% image they would never see. Layout holds down to 320px.
 */

const TRUST: Array<{ Icon: LucideIcon; label: string; hint: string }> = [
  { Icon: ShieldCheck, label: '100% authentique', hint: 'Importé et distribué conformément aux autorisations' },
  { Icon: Truck, label: 'Livraison 24–72h', hint: 'Partout en Tunisie, offerte dès 300 DT' },
  { Icon: CreditCard, label: 'Paiement à la livraison', hint: 'Vous réglez le livreur, à la réception' },
];

export function AuthShell({ children }: { children: ReactNode }) {
  const { headerLogoUrl } = useSiteLogos();

  return (
    /* `.pt-no-chrome` is read by globals.css to drop the body's tab-bar reserve — these routes
       render no tab bar, and the padding was leaving a ~90px strip of canvas under the screen on
       every phone. It carries no styles of its own. */
    <div className="pt-no-chrome min-h-dvh bg-sunken lg:grid lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/*
        ── THE BRAND PANEL — DESKTOP ONLY ────────────────────────────────────────────────────
        `lg:flex` on a `hidden` element: the <Image> is never requested on a phone, which matters
        because it is the same 1.2 MB hero the homepage uses. `sizes="50vw"` is honest — this
        column is exactly half the grid from `lg` up.
      */}
      <aside className="pt-slab relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src="/slides/home-hero-web.webp"
            alt=""
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
          {/* Two layers, and they do different jobs. The black scrim buys contrast for the type;
              the brand wash on top of it is what stops a dark photograph reading as grey. Both
              are needed — a single orange gradient over a photo never gets dark enough for
              17.5:1 ink, and a single black one is a stock overlay with no brand in it. */}
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand/30 via-transparent to-transparent" />
        </div>

        <Link href="/" className="relative w-fit" aria-label="Protein.tn — Accueil">
          <Image
            src={headerLogoUrl}
            alt="Protein.tn"
            width={230}
            height={75}
            sizes="200px"
            className="h-12 w-auto object-contain"
            priority
          />
        </Link>

        <div className="relative">
          <h2 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-ink-1 xl:text-5xl">
            La nutrition sportive <span className="text-brand">n°1</span> en Tunisie
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-2">
            Whey, créatine, gainers et compléments authentiques — commandés depuis n’importe quel
            gouvernorat, payés à la réception.
          </p>
          <ul className="mt-8 space-y-4">
            {TRUST.map(({ Icon, label, hint }) => (
              <li key={label} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={2} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink-1">{label}</span>
                  <span className="block text-[13px] leading-snug text-ink-3">{hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-3">© Protein.tn — SOBITAS, Sousse, Tunisie</p>
      </aside>

      {/* ── THE FORM COLUMN ──────────────────────────────────────────────────────────────── */}
      <div className="flex min-h-dvh flex-col">
        {/* The escape hatch was `absolute left-5 top-5`, so on a short phone in landscape it
            overlapped the form it was meant to sit above. It is a real row now, in flow. */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10">
          <Link
            href="/"
            className="-ms-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Retour à la boutique</span>
            <span className="sm:hidden">Boutique</span>
          </Link>
          {/* `min-h-[44px]` on a link that wraps nothing but a 32px image: without it the logo is a
              32px target, and it is one of only two controls on the screen before the form. */}
          <Link href="/" className="flex min-h-[44px] items-center lg:hidden" aria-label="Protein.tn — Accueil">
            <Image
              src={headerLogoUrl}
              alt="Protein.tn"
              width={230}
              height={75}
              sizes="140px"
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:px-6 lg:px-10">
          <div className="w-full max-w-[27rem]">
            <div className="rounded-2xl border border-hairline bg-elevated p-5 shadow-card sm:p-8">
              {children}
            </div>

            {/* The trust points are the reason someone finishes a signup, and on a phone they
                were on the panel that phones never render. Three chips, one line each. */}
            <ul className="mt-5 grid gap-2 lg:hidden">
              {TRUST.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-[13px] text-ink-2">
                  <Icon className="h-4 w-4 shrink-0 text-brand" strokeWidth={2} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AuthCardHeaderProps {
  /** Brand wordmark above the kicker. The shell already shows one on phones, so this is off by
   *  default — it was `showLogo` on two of the four screens and produced two logos on mobile. */
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
}

/** Kicker + display-face title for an auth form. */
export function AuthCardHeader({ kicker, title, subtitle }: AuthCardHeaderProps) {
  return (
    <div className="mb-6">
      {kicker && (
        <span className="mb-3 inline-flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
          <span className="h-px w-5 bg-brand" aria-hidden="true" />
          {kicker}
        </span>
      )}
      <h1 className="font-display text-[26px] font-bold uppercase leading-tight tracking-tight text-ink-1 sm:text-3xl">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-2">{subtitle}</p>}
    </div>
  );
}

interface AuthFieldProps extends Omit<React.ComponentProps<'input'>, 'id'> {
  label: string;
  Icon: LucideIcon;
  /** Rendered on the label row, right-aligned — the "Mot de passe oublié ?" link. */
  action?: ReactNode;
  /** Help text under the field. */
  hint?: string;
  /** Adds a show/hide toggle and makes the input a password field. */
  reveal?: boolean;
}

/**
 * One field: label, leading icon, input, optional hint.
 *
 * `useId` rather than a hand-passed id — the four screens between them had `email` declared on
 * three different pages, which is only invisible because they never render together.
 *
 * The reveal toggle is new. A password field with no way to see what you typed, on a phone
 * keyboard, is the single most common reason a signup is abandoned twice.
 */
export function AuthField({ label, Icon, action, hint, reveal = false, className, ...props }: AuthFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [shown, setShown] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-[13px] font-semibold text-ink-1">
          {label}
        </Label>
        {action}
      </div>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute start-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3"
          strokeWidth={2}
          aria-hidden="true"
        />
        <Input
          id={id}
          aria-describedby={hint ? hintId : undefined}
          {...props}
          type={reveal ? (shown ? 'text' : 'password') : props.type}
          className={cn(
            'h-12 rounded-xl border-hairline bg-canvas ps-10 text-ink-1 placeholder:text-ink-3',
            'focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0',
            reveal && 'pe-11',
            className
          )}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            /* 44px target, but drawn as a 36px glyph box so it does not crowd a 48px field. */
            className="absolute end-1 top-1/2 flex h-11 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {shown ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-xs leading-snug text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * The primary action. A plain <button>, not the shadcn `Button`: every call site was overriding
 * `size`, height, colour and typography anyway, which is five props to reach the same place.
 */
export function AuthSubmit({
  loading,
  loadingLabel,
  children,
  ...props
}: React.ComponentProps<'button'> & { loading?: boolean; loadingLabel?: string }) {
  return (
    <button
      type="submit"
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4',
        'font-display text-[13.5px] font-bold uppercase tracking-[0.08em] text-on-brand',
        'transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
        'disabled:cursor-not-allowed disabled:opacity-60',
        props.className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel ?? 'Un instant…'}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** "ou" rule, between the password form and the Google button. */
export function AuthDivider({ label = 'ou' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-rule" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{label}</span>
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}

/** The "already have an account?" line under the card. */
export function AuthAlt({ question, href, cta }: { question: string; href: string; cta: string }) {
  return (
    <p className="mt-6 text-center text-sm text-ink-2">
      {question}{' '}
      <Link
        href={href}
        className="rounded font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {cta}
      </Link>
    </p>
  );
}
