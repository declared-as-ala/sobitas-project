'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Truck, CreditCard, ArrowLeft } from 'lucide-react';
import { useSiteLogos } from '@/hooks/useSiteLogos';

/**
 * Full-screen split scaffold for the auth screens (login / register / forgot / reset).
 * Desktop: a branded left panel (hero image + red gradient + logo + trust points) beside the form.
 * Mobile: single column, the form fills the viewport. No shop Header/Footer — a "back to shop" link
 * keeps an escape hatch. Shared so the four flows can't drift.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { headerLogoUrl } = useSiteLogos();
  const trust = [
    { Icon: ShieldCheck, label: '100% authentique' },
    { Icon: Truck, label: 'Livraison 24–72h partout en Tunisie' },
    { Icon: CreditCard, label: 'Paiement à la livraison' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 lg:grid lg:grid-cols-2">
      {/* Left brand panel — desktop only */}
      <aside className="relative hidden overflow-hidden bg-gray-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0" aria-hidden="true">
          <Image src="/slides/home-hero-web.webp" alt="" fill priority sizes="50vw" className="object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-br from-red-700/60 via-gray-950/85 to-gray-950" />
        </div>
        <Link href="/" className="relative w-fit" aria-label="Protein.tn — Accueil">
          <Image
            src={headerLogoUrl}
            alt="Protein.tn"
            width={180}
            height={56}
            className="h-12 w-auto object-contain brightness-0 invert"
            priority
          />
        </Link>
        <div className="relative">
          <h2 className="font-display uppercase leading-[0.95] tracking-tight text-4xl font-bold text-white xl:text-5xl">
            La nutrition sportive <span className="text-red-500">n°1</span> en Tunisie
          </h2>
          <p className="mt-4 max-w-md text-white/75">
            Whey, créatine, gainers et compléments 100% authentiques — livraison rapide partout en Tunisie.
          </p>
          <ul className="mt-8 space-y-3">
            {trust.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-white/85">
                <Icon className="h-5 w-5 shrink-0 text-red-400" strokeWidth={2} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/45">© Protein.tn — Sousse, Tunisie</p>
      </aside>

      {/* Right — the form */}
      <div className="relative flex min-h-screen flex-col justify-center px-5 py-14 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="absolute left-5 top-5 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 sm:left-8 sm:top-8"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour à la boutique
        </Link>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

interface AuthCardHeaderProps {
  /** Render the brand logo above the kicker — shown on mobile/tablet only (desktop has the left panel). */
  showLogo?: boolean;
  /** Red uppercase eyebrow (e.g. "Espace client"). */
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
}

/** Kicker + Oswald title header for an auth form (left-aligned, no card chrome). */
export function AuthCardHeader({ showLogo = false, kicker, title, subtitle }: AuthCardHeaderProps) {
  const { headerLogoUrl } = useSiteLogos();
  return (
    <div className="mb-8">
      {showLogo && (
        <Link href="/" className="mb-8 flex justify-center lg:hidden" aria-label="Protein.tn — Accueil">
          <Image
            src={headerLogoUrl}
            alt="Protein.tn"
            width={150}
            height={48}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>
      )}
      {kicker && (
        <span className="mb-3 inline-flex items-center gap-2 font-display uppercase tracking-[0.2em] text-[11px] font-semibold text-red-600 dark:text-red-400 sm:text-xs">
          <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
          {kicker}
        </span>
      )}
      <h1 className="font-display uppercase tracking-tight text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-gray-600 dark:text-gray-400">{subtitle}</p>}
    </div>
  );
}
