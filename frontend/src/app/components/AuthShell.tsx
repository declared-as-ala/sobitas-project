'use client';

import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, CircleDollarSign, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useSiteLogos } from '@/hooks/useSiteLogos';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';
import { Container } from '@/app/components/layout/Container';

export function AuthShell({ children, compact = false, artwork }: { children: ReactNode; compact?: boolean; artwork?: ReactNode }) {
  const { headerLogoUrl } = useSiteLogos();

  return (
    <div
      dir="ltr"
      className="pt-no-chrome flex min-h-dvh items-stretch bg-canvas lg:items-center lg:bg-sunken lg:py-4"
    >
      <Container width="wide" bleed className="flex sm:px-4 lg:px-6 xl:px-8">
        <main className="relative flex w-full flex-col bg-elevated sm:rounded-xl lg:grid lg:min-h-[40rem] lg:grid-cols-2 lg:border lg:border-hairline">
          <aside
            className="relative hidden overflow-hidden bg-sunken lg:order-2 lg:block lg:rounded-e-xl lg:border-s lg:border-hairline"
            aria-label={artwork ? 'Vérification Protein.tn' : 'Programme fidélité Protein.tn'}
          >
            {artwork ?? <AuthLoyaltyPanel />}
          </aside>

          {/* Mobile spends its height on the form: no artwork, overlapping card or fixed-height
              panel. Keep 12px below AuthAlt's expanded hit area. The fit guard includes this
              padding, not just the card. At 375px, register's closed initial state budgets:
              44 header + 32 title + 445 unchanged form + 32 account link + 12 padding = 565px;
              with the guard's 96px Google reserve, 661px. Compact screens keep their spacing. */}
          <div data-auth-column="" className={cn('relative flex min-w-0 flex-col px-4 pb-3 sm:p-8 lg:order-1 lg:p-8 xl:p-10', compact && 'px-5 py-4 sm:p-8')}>
            <div data-auth-header="" className="flex min-h-11 shrink-0 items-center justify-between gap-4">
              <Link
                href="/"
                aria-label="Retour à la boutique"
                className="group -ms-2 inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <ArrowLeft
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Retour à la boutique</span>
              </Link>
              <Link
                href="/"
                className="ms-auto flex min-h-11 items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                aria-label="Protein.tn — Accueil"
              >
                <Image
                  src={headerLogoUrl}
                  alt="Protein.tn"
                  width={230}
                  height={75}
                  sizes="145px"
                  className="h-7 w-auto object-contain"
                  priority
                />
              </Link>
            </div>

            <div data-auth-body="" className={cn('flex items-start sm:py-6 lg:flex-1 lg:items-center', compact && 'pb-4 pt-3')}>
              <div data-auth-card="" className="mx-auto w-full max-w-lg">
                {children}
              </div>
            </div>
          </div>
        </main>
      </Container>
    </div>
  );
}

/** The account's benefit is loyalty; delivery and authenticity also apply to guest orders.
 * Use the review section's factual dl and filled, hairline-bordered card vocabulary. */
function AuthLoyaltyPanel() {
  return (
    <div className="flex h-full flex-col justify-center p-8 xl:p-12">
      <div className="flex items-center gap-3">
        <CircleDollarSign className="h-5 w-5 text-brand" aria-hidden="true" />
        <span className="pt-kicker text-ink-2">Programme fidélité</span>
      </div>
      <h2 className="mt-6 max-w-sm font-display text-4xl font-bold uppercase leading-tight tracking-tight text-ink-1">
        Vos achats vous rapportent.
      </h2>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-2">
        Retrouvez vos Protinas dans votre compte et utilisez-les sur votre prochaine commande.
      </p>
      <div className="mt-8 rounded-xl border border-hairline bg-elevated p-6">
        <p className="font-display text-6xl font-bold leading-none tracking-tight text-ink-1">5 %</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          de vos achats en Protinas, après remises et hors livraison.
        </p>
        <dl className="mt-6 space-y-4 border-t border-hairline pt-4">
          <div>
            <dt className="text-xs text-ink-3">Créditées</dt>
            <dd className="mt-1 text-sm font-semibold text-ink-1">Une fois la commande livrée</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Valeur de vos points</dt>
            <dd className="mt-1 text-sm font-semibold text-ink-1">20 Protinas = 1 DT de remise</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

interface AuthCardHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
  subtitleDesktopOnly?: boolean;
}

export function AuthCardHeader({ kicker, title, subtitle, subtitleDesktopOnly }: AuthCardHeaderProps) {
  return (
    <div className="mb-2 sm:mb-6">
      {kicker && (
        <span className="mb-2 hidden items-center gap-2 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-brand sm:inline-flex">
          <span className="h-px w-4 bg-brand" aria-hidden="true" />
          {kicker}
        </span>
      )}
      <h1 className="font-display text-2xl font-bold uppercase leading-none tracking-tight text-ink-1 sm:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            'mt-2 text-sm leading-relaxed text-ink-2',
            subtitleDesktopOnly && 'hidden sm:block'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface AuthFieldProps extends Omit<React.ComponentProps<'input'>, 'id'> {
  label: string;
  Icon: LucideIcon;
  action?: ReactNode;
  hint?: string;
  reveal?: boolean;
}

export function AuthField({ label, Icon, action, hint, reveal = false, className, ...props }: AuthFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const [shown, setShown] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-semibold text-ink-1">
          {label}
        </Label>
        {action}
      </div>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3"
          strokeWidth={2}
          aria-hidden="true"
        />
        <Input
          id={id}
          aria-describedby={hint ? hintId : undefined}
          {...props}
          type={reveal ? (shown ? 'text' : 'password') : props.type}
          className={cn(
            'h-12 rounded-xl border-hairline bg-canvas ps-10 text-ink-1 shadow-sm placeholder:text-ink-3',
            'transition-[border-color,box-shadow,background-color] hover:border-rule-strong',
            'focus-visible:border-brand focus-visible:bg-elevated focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0',
            reveal && 'pe-11',
            className
          )}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShown((value) => !value)}
            className="absolute end-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {shown ? (
              <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
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
        'shadow-sm transition-[background-color,box-shadow,transform] duration-150 hover:bg-brand-hover hover:shadow-md active:scale-[0.99]',
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

export function AuthDivider({ label = 'ou' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-rule" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{label}</span>
      <span className="h-px flex-1 bg-rule" />
    </div>
  );
}

export function AuthAlt({ question, href, cta }: { question: string; href: string; cta: string }) {
  return (
    <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1 text-center text-[13px] leading-5 text-ink-2 sm:mt-6 sm:text-sm">
      {question}{' '}
      <Link
        href={href}
        className="-my-3 inline-flex min-h-[44px] items-center rounded px-1 font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {cta}
      </Link>
    </p>
  );
}
