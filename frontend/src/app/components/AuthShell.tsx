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

export function AuthShell({ children }: { children: ReactNode }) {
  const { headerLogoUrl } = useSiteLogos();

  return (
    <div className="pt-no-chrome flex min-h-dvh items-stretch bg-sunken sm:items-center sm:py-6 lg:py-8">
      <Container className="flex sm:block">
        <main className="relative grid w-full overflow-hidden border-0 border-hairline bg-elevated shadow-card sm:min-h-[44rem] sm:rounded-3xl sm:border lg:min-h-[42rem] lg:grid-cols-12">
          <span className="absolute inset-x-0 top-0 z-20 h-1 bg-brand" aria-hidden="true" />

          <div className="pt-plate relative z-10 flex min-h-dvh flex-col p-4 pt-5 sm:min-h-[44rem] sm:p-6 sm:pt-8 lg:col-span-7 lg:min-h-[42rem] lg:p-10 xl:p-12">
            <div data-auth-header="" className="flex min-h-[44px] items-center justify-between gap-4">
              <Link
                href="/"
                className="flex min-h-[44px] items-center rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
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
              <Link
                href="/"
                className="group -me-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-xs font-medium text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:text-sm"
              >
                <ArrowLeft
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Retour à la boutique</span>
                <span className="sm:hidden">Boutique</span>
              </Link>
            </div>

            <div data-auth-body="" className="flex flex-1 items-start pb-4 pt-8 sm:items-center sm:py-6 lg:py-8">
              <div data-auth-card="" className="mx-auto w-full sm:max-w-md">
                {children}
              </div>
            </div>
          </div>

          <aside
            className="relative hidden min-h-[42rem] overflow-hidden border-s border-hairline bg-brand-50 lg:col-span-5 lg:block"
            aria-label="Athlète Protein.tn"
          >
            <Image
              src={AUTH_ATHLETE}
              alt="Athlète tunisienne portant le maillot Protein.tn"
              fill
              sizes="(min-width: 1280px) 34vw, 40vw"
              className="object-cover object-center"
              priority
            />

            <div className="pt-scrim absolute bottom-6 start-6 max-w-xs rounded-xl border border-rule p-5 shadow-card xl:bottom-8 xl:start-8 xl:p-6">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
                Espace client
              </p>
              <p className="mt-2 font-display text-2xl font-bold uppercase leading-none tracking-tight text-ink-1 xl:text-3xl">
                Votre effort.<br />Vos avantages.
              </p>
            </div>
          </aside>
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
