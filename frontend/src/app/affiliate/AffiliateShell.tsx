'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Percent, CreditCard, UserCircle, LogOut, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Container } from '@/app/components/layout/Container';
import { cn } from '@/app/components/ui/utils';

const NAV = [
  { href: '/affiliate', label: 'Tableau de bord', short: 'Accueil', Icon: LayoutDashboard, exact: true },
  { href: '/affiliate/orders', label: 'Mes commandes', short: 'Commandes', Icon: ShoppingBag, exact: false },
  { href: '/affiliate/commissions', label: 'Mes commissions', short: 'Commissions', Icon: Percent, exact: false },
  { href: '/affiliate/payments', label: 'Mes paiements', short: 'Paiements', Icon: CreditCard, exact: false },
  { href: '/affiliate/profile', label: 'Mon profil', short: 'Profil', Icon: UserCircle, exact: false },
] as const;

export function AffiliateShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const doLogout = () => {
    logout();
    router.replace('/affiliate/login');
  };

  return (
    <div className="min-h-dvh bg-sunken">
      <header className="sticky top-0 z-30 border-b border-hairline bg-elevated">
        <Container width="wide" className="flex h-16 items-center justify-between gap-4">
          <Link href="/affiliate" className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-ink-1">protein.tn</span>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">
              Affiliés
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden min-h-11 items-center gap-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-brand sm:inline-flex"
            >
              <Store className="h-4 w-4" aria-hidden /> Boutique
            </Link>
            <button
              type="button"
              onClick={doLogout}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-sm font-semibold text-ink-2 transition-colors hover:border-destructive/40 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </Container>
      </header>

      <Container width="wide" className="py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                    isActive(item) ? 'bg-brand/10 text-brand' : 'text-ink-2 hover:bg-elevated hover:text-ink-1',
                  )}
                >
                  <item.Icon className="h-[18px] w-[18px]" aria-hidden /> {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </Container>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-elevated lg:hidden" aria-label="Navigation affilié">
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item) ? 'page' : undefined}
              className={cn(
                'flex min-h-[52px] flex-col items-center justify-center gap-1 text-[10px] font-semibold',
                isActive(item) ? 'text-brand' : 'text-ink-3',
              )}
            >
              <item.Icon className="h-5 w-5" aria-hidden /> {item.short}
            </Link>
          ))}
        </div>
      </nav>
      <div className="h-14 lg:hidden" aria-hidden />
    </div>
  );
}
