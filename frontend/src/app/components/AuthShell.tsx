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
import { Container } from '@/app/components/layout/Container';

const AUTH_ATHLETE = '/auth/protein-athlete-studio-v3.png';
const AUTH_MOTION = '/auth/auth-motion-graphic-v1.png';

export function AuthShell({ children }: { children: ReactNode }) {
  const { headerLogoUrl } = useSiteLogos();

  return (
    <div
      dir="ltr"
      className="pt-no-chrome flex min-h-dvh items-stretch bg-brand-50 lg:items-center lg:bg-sunken lg:py-5 [@media(min-width:1024px)_and_(max-height:800px)]:!py-2"
    >
      <Container width="wide" bleed className="flex sm:px-4 lg:px-6 xl:px-8">
        <main className="relative flex w-full flex-col overflow-hidden bg-brand-50 shadow-card sm:rounded-3xl lg:h-[min(49rem,calc(100dvh-2.5rem))] lg:min-h-[40rem] lg:grid lg:grid-cols-[52fr_48fr] lg:border lg:border-hairline">
          <aside
            className="relative h-56 shrink-0 overflow-hidden bg-brand-50 sm:h-64 lg:order-2 lg:h-auto lg:min-h-[40rem] lg:border-s lg:border-hairline"
            aria-label="Athlète Protein.tn"
          >
            <Image
              src={AUTH_MOTION}
              alt=""
              fill
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="z-0 object-cover opacity-55 lg:object-contain lg:opacity-70"
              aria-hidden="true"
            />
            <Image
              src={AUTH_ATHLETE}
              alt="Athlète tunisienne portant le maillot Protein.tn"
              fill
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="z-10 object-cover object-[center_4%] lg:object-contain lg:object-bottom"
              priority
            />

            <Link
              href="/"
              className="pt-plate absolute start-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-ink-1 shadow-card transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:hidden"
              aria-label="Retour à la boutique"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </aside>

          <div className="pt-plate relative z-20 mx-3 -mt-6 flex flex-col rounded-2xl px-6 py-4 shadow-card sm:mx-6 sm:-mt-7 sm:p-8 lg:order-1 lg:mx-0 lg:mt-0 lg:min-h-[40rem] lg:flex-1 lg:rounded-none lg:p-10 lg:shadow-none xl:p-12 [@media(min-width:1024px)_and_(max-height:800px)]:!p-8">
            <div data-auth-header="" className="flex min-h-[44px] items-center gap-4 lg:justify-between">
              <Link
                href="/"
                className="group -ms-2 hidden min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:inline-flex"
              >
                <ArrowLeft
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
                Retour à la boutique
              </Link>
              <Link
                href="/"
                className="flex min-h-[44px] items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:ms-auto"
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

            <div data-auth-body="" className="flex items-start pb-4 pt-6 lg:flex-1 lg:items-center lg:py-6 [@media(min-width:1024px)_and_(max-height:800px)]:!py-1">
              <div data-auth-card="" className="mx-auto w-full max-w-[32.5rem]">
                {children}
              </div>
            </div>
          </div>
        </main>
      </Container>
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
      <h1 className="font-display text-[28px] font-bold uppercase leading-[0.98] tracking-tight text-ink-1 sm:text-[36px] lg:text-[40px]">
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
        className="-my-3 inline-flex min-h-[44px] items-center rounded px-1 font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {cta}
      </Link>
    </p>
  );
}
