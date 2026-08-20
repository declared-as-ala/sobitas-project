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
 * ── THE AUTH SCREENS, ON THE SITE'S OWN VOCABULARY (owner, 20/08/2026) ──────────────────────
 * *"completely redesign the login and signup page, make it fit the vibe of the website and the
 * landing page, and use the colours of the website."*
 *
 * The previous pass fixed the COLOUR — it was `red-600` (#DC2626, a signal red) where the brand
 * is #D03B04, so side by side with the homepage the two did not read as the same company. That
 * part was right and it stays.
 *
 * What it got wrong is the thing the owner is now pointing at: **it made dark a SURFACE.**
 *
 * ── HALF THE SCREEN WAS A DARKENED PHOTOGRAPH ───────────────────────────────────────────────
 * The brand panel was `.pt-slab` with the hero image under `bg-black/70` plus a brand gradient on
 * top. At 1536 that is ~768 x 869px — 44% of the viewport — painted near-black. DESIGN_SYSTEM §0.5
 * is unambiguous about this and it is the owner's own constraint, quoted there:
 *
 *     "I want something light, and it has a dark mode and a light mode. Keep it white and just
 *      use black for important things."
 *
 * The budget is ~12% of painted area. A 70% black scrim over half the page spends it four times
 * over — and it spends it on a photograph it simultaneously destroys. The source image is a
 * beautifully lit studio shot: five products, warm rim light, an athlete on a bench. Under
 * `bg-black/70` it is a brown smear in which none of that is legible. We were paying 135 KB and
 * half the composition to show nothing.
 *
 * ── SO THE PAGE IS LIGHT AND THE PHOTOGRAPH IS AN OBJECT ────────────────────────────────────
 * Which is exactly what the landing page does, and is the pattern this screen should have copied
 * in the first place. On the homepage the hero is not a background — it is a contained, rounded,
 * hairline-bordered card sitting on white, beside a white best-sellers panel. The category tiles
 * are the same move: dark photograph, rounded, with a light caption row under it.
 *
 * So here: the brand column is `bg-canvas`, and the photograph is a `rounded-2xl` card in it,
 * UNDARKENED. The dark is still there — it is simply an object with edges instead of a curtain,
 * and now you can see the products in it. Painted-dark area at 1536 drops from ~44% to ~9%.
 *
 * ── AND THE TRUST ROWS ARE THE HOMEPAGE'S TRUST STRIP ───────────────────────────────────────
 * They were a bare `<ul>` of icon + two lines. The homepage states the same three facts in a
 * bordered, hairline-divided strip — the site's most recognisable small component. Reusing that
 * shape is most of what "fit the vibe" means: a returning customer has already read this row on
 * the homepage, and meeting it again on the signup screen is continuity rather than decoration.
 *
 * ── FIGURE ON GROUND, WHICH IS WHY THE COLUMNS ARE THESE WAY ROUND ──────────────────────────
 * `--c-canvas` and `--c-elevated` are BOTH #FFFFFF in light mode. So a white card needs a
 * non-white field or it disappears, leaving only its hairline. The form column is therefore
 * `bg-sunken` (warm sand) with a `bg-elevated` card on it, and the brand column is `bg-canvas`.
 * That also makes the two halves the site's own canvas <-> sunken alternation, turned on its side,
 * with a hairline on the seam — §0.5's rule that no two adjacent surfaces may match.
 *
 * ── MOBILE ──────────────────────────────────────────────────────────────────────────────────
 * `min-h-dvh`, not `min-h-screen`: on iOS Safari `100vh` includes the browser chrome, so the old
 * shell was ~90px taller than the visible viewport and every auth screen started life scrolled.
 * The brand column is `hidden lg:flex`, so a phone never requests the 135 KB photograph; it gets
 * the same trust strip under the card instead. Layout holds to 320px.
 *
 * `.pt-no-chrome` is read by globals.css to drop the body's tab-bar reserve — these routes render
 * no tab bar, and the reserve was leaving a ~90px strip of canvas below the fold.
 */

const TRUST: Array<{ Icon: LucideIcon; label: string; hint: string }> = [
  { Icon: ShieldCheck, label: '100% authentique', hint: 'Importé et distribué conformément aux autorisations' },
  { Icon: Truck, label: 'Livraison 24–72h', hint: 'Partout en Tunisie, offerte dès 300 DT' },
  { Icon: CreditCard, label: 'Paiement à la livraison', hint: 'Vous réglez le livreur, à la réception' },
];

/**
 * The three facts, in the homepage trust strip's shape: one bordered box, hairline-divided rows,
 * an 18px brand glyph, an uppercase label and a quiet hint.
 *
 * `hint` is dropped on the phone (`compact`) — under a 5-field signup form, three second lines are
 * 60px of reassurance nobody scrolls to. The labels alone carry it.
 */
function TrustStrip({ compact = false }: { compact?: boolean }) {
  return (
    <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-canvas">
      {TRUST.map(({ Icon, label, hint }) => (
        <li key={label} className="flex items-start gap-3 px-4 py-3">
          <Icon className="mt-px h-[18px] w-[18px] shrink-0 text-brand" strokeWidth={2} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-[12px] font-bold uppercase tracking-[0.06em] text-ink-1">{label}</span>
            {!compact && <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{hint}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  const { headerLogoUrl } = useSiteLogos();

  return (
    <div className="pt-no-chrome min-h-dvh bg-sunken lg:grid lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* ── THE BRAND COLUMN — DESKTOP ONLY ──────────────────────────────────────────────── */}
      <aside className="hidden border-e border-hairline bg-canvas lg:flex lg:flex-col lg:justify-between lg:gap-10 lg:p-10 xl:p-12">
        <Link
          href="/"
          /* `min-h-[44px]` on a link whose only child is a 40px image. Without it this is a 40px
             target — caught by measure-auth, not by looking at it, which is the entire argument
             for that script: the logo LOOKS like a comfortable click at any zoom level. */
          className="flex min-h-[44px] w-fit items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Protein.tn — Accueil"
        >
          <Image
            src={headerLogoUrl}
            alt="Protein.tn"
            width={230}
            height={75}
            sizes="200px"
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <div className="max-w-xl">
          <span className="mb-3 inline-flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
            <span className="h-px w-5 bg-brand" aria-hidden="true" />
            La boutique
          </span>
          {/* `font-display` already carries wdth 82 from globals.css — `font-compressed` beside it
              is redundant. Same headline treatment as every section title on the site. */}
          <h2 className="font-display text-[38px] font-bold uppercase leading-[0.95] tracking-tight text-ink-1 xl:text-[46px]">
            La nutrition sportive <span className="text-brand">n°1</span> en Tunisie
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-2">
            Whey, créatine, gainers et compléments authentiques — commandés depuis n’importe quel
            gouvernorat, payés à la réception.
          </p>

          {/* THE ONE DARK OBJECT ON THE PAGE. No scrim: nothing is written over it, so nothing
              needs contrast bought, and the photograph is the only thing here that is not type.
              `aspect-[16/9]` is the source's own ratio, so `object-cover` crops nothing. */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-hairline shadow-card">
            <div className="relative aspect-[16/9]">
              <Image
                src="/slides/home-hero-web.webp"
                alt=""
                fill
                sizes="(min-width: 1280px) 46vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="mt-8">
            <TrustStrip />
          </div>
        </div>

        <p className="text-xs text-ink-3">© Protein.tn — SOBITAS, Sousse, Tunisie</p>
      </aside>

      {/* ── THE FORM COLUMN ──────────────────────────────────────────────────────────────── */}
      <div className="flex min-h-dvh flex-col">
        {/* The escape hatch was `absolute left-5 top-5`, so on a short phone in landscape it
            overlapped the form it was meant to sit above. It is a real row now, in flow. */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10">
          <Link
            href="/"
            className="group -ms-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ArrowLeft
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Retour à la boutique</span>
            <span className="sm:hidden">Boutique</span>
          </Link>
          {/* `min-h-[44px]` on a link that wraps nothing but a 32px image: without it the logo is a
              32px target, and it is one of only two controls on the screen before the form. */}
          <Link
            href="/"
            className="flex min-h-[44px] items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:hidden"
            aria-label="Protein.tn — Accueil"
          >
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

            {/* Same component the brand column uses, in its compact form. The trust points are the
                reason someone finishes a signup, and on a phone they were on the panel phones
                never render. */}
            <div className="mt-5 lg:hidden">
              <TrustStrip compact />
            </div>
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
        /* Named properties, not `transition-all` — that would also animate the focus ring's
           colour, which should appear instantly. The 0.99 press is the only motion on this
           screen and it is what makes a 12px-tall colour change read as a button being pressed
           rather than as a repaint. */
        'transition-[background-color,transform] duration-150 hover:bg-brand-hover active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
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
