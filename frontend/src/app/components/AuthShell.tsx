'use client';

import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useSiteLogos } from '@/hooks/useSiteLogos';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';

const AUTH_PHOTO = '/auth/protein-customer-ugc-v1.png';

function CustomerQuote({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        compact
          ? 'rounded-2xl border border-hairline bg-sunken p-2.5'
          : 'rounded-2xl border border-white/20 bg-ink-1/80 p-4 text-white'
      )}
    >
      {compact && (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-sunken">
          <Image src={AUTH_PHOTO} alt="" fill sizes="48px" className="object-cover object-[62%_36%]" />
        </div>
      )}
      <div className="min-w-0">
        <p
          dir="rtl"
          lang="ar-TN"
          className={cn(
            'font-semibold leading-snug',
            compact ? 'text-sm text-ink-1' : 'text-lg text-white'
          )}
        >
          وصل الكولي، يعيّشكم!
        </p>
        <p className={cn('mt-0.5 text-xs', compact ? 'text-ink-3' : 'text-white/75')}>
          Client Protein.tn · Sousse
        </p>
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  const { headerLogoUrl } = useSiteLogos();

  return (
    <div className="pt-no-chrome min-h-dvh bg-canvas lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(32rem,1.08fr)]">
      <aside className="hidden min-h-dvh bg-sunken p-4 lg:flex xl:p-6">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-hairline bg-sunken">
          <Image
            src={AUTH_PHOTO}
            alt="Client Protein.tn découvrant sa livraison à Sousse"
            fill
            sizes="(min-width: 1280px) 44vw, 46vw"
            className="object-cover object-center"
            priority
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent" />
          <Link
            href="/"
            className="absolute start-6 top-6 flex min-h-[44px] items-center rounded-xl bg-elevated px-3 shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label="Protein.tn — Accueil"
          >
            <Image
              src={headerLogoUrl}
              alt="Protein.tn"
              width={230}
              height={75}
              sizes="150px"
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
          <div className="absolute inset-x-5 bottom-5 max-w-sm xl:inset-x-7 xl:bottom-7">
            <CustomerQuote />
          </div>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col bg-canvas">
        <div
          data-auth-header=""
          className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-7 sm:py-4 lg:px-10 xl:px-16"
        >
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
              sizes="130px"
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        <div
          data-auth-body=""
          className="flex flex-1 items-center justify-center px-4 pb-6 pt-1 sm:px-7 sm:pb-10 lg:px-10 xl:px-16"
        >
          <div data-auth-card="" className="w-full max-w-[26rem]">
            <div className="mb-5 hidden [@media(min-height:760px)]:flex lg:!hidden">
              <CustomerQuote compact />
            </div>
            {children}
          </div>
        </div>
      </main>
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
    <div className="mb-5 sm:mb-7">
      {kicker && (
        <span className="mb-2 inline-flex items-center gap-2 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-brand">
          <span className="h-px w-4 bg-brand" aria-hidden="true" />
          {kicker}
        </span>
      )}
      <h1 className="font-display text-[28px] font-bold uppercase leading-[0.98] tracking-tight text-ink-1 sm:text-[34px]">
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
        <Label htmlFor={id} className="text-[13px] font-semibold text-ink-1">
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
            'h-12 rounded-xl border-hairline bg-sunken ps-10 text-ink-1 placeholder:text-ink-3',
            'focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0',
            reveal && 'pe-11',
            className
          )}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShown((value) => !value)}
            className="absolute end-1 top-1/2 flex h-11 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
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
    <p className="mt-5 text-center text-[13px] text-ink-2 sm:mt-6 sm:text-sm">
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
