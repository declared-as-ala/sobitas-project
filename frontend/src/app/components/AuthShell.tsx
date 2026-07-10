'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { useSiteLogos } from '@/hooks/useSiteLogos';

/**
 * Shared scaffold for the auth screens (login / register / forgot / reset):
 * page background + Header + `max-w-md` centered column + Footer. Keeps the
 * four flows visually identical so spacing/branding can't drift.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}

interface AuthCardHeaderProps {
  /** Render the brand logo above the kicker (login / register). */
  showLogo?: boolean;
  /** Red uppercase eyebrow (e.g. "Espace client"). */
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
}

/**
 * The design-system kicker + Oswald title header for an auth card. Single-sources
 * the brand logo (same asset, same next/image props) so login and register can't
 * diverge on optimization/priority again.
 */
export function AuthCardHeader({ showLogo = false, kicker, title, subtitle }: AuthCardHeaderProps) {
  const { headerLogoUrl } = useSiteLogos();
  return (
    <CardHeader className="text-center">
      {showLogo && (
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center justify-center">
            <Image
              src={headerLogoUrl}
              alt="Protein.tn Logo"
              width={140}
              height={45}
              className="h-10 w-auto object-contain"
              style={{ maxWidth: '140px', height: 'auto' }}
              priority
            />
          </Link>
        </div>
      )}
      {kicker && (
        <span className="inline-flex items-center justify-center gap-2 mb-3 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400">
          <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
          {kicker}
        </span>
      )}
      <CardTitle className="font-display uppercase tracking-tight text-3xl font-bold text-gray-900 dark:text-white">
        {title}
      </CardTitle>
      {subtitle && (
        <CardDescription className="text-gray-600 dark:text-gray-400">{subtitle}</CardDescription>
      )}
    </CardHeader>
  );
}
