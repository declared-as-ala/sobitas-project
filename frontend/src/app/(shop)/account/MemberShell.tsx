'use client';

import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Coins,
  Home,
  LogOut,
  MessageSquareText,
  Package,
  Settings,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { LinkWithLoading as Link } from '@/app/components/LinkWithLoading';
import { useAuth } from '@/contexts/AuthContext';
import { useSiteLogos } from '@/hooks/useSiteLogos';
import { cn } from '@/app/components/ui/utils';
import type { ReactNode } from 'react';

const items = [
  { key: 'dashboard', label: 'Accueil', href: '/account', icon: Home },
  { key: 'orders', label: 'Commandes', href: '/account?section=orders', icon: Package },
  { key: 'reviews', label: 'Mes avis', href: '/account?section=reviews', icon: MessageSquareText },
  { key: 'fidelite', label: 'Mes points', href: '/account?section=fidelite', icon: Coins },
  { key: 'profile', label: 'Profil', href: '/account?section=profile', icon: Settings },
] as const;

export function MemberShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/account';
  const params = useSearchParams();
  const { user, logout } = useAuth();
  const { headerLogoUrl } = useSiteLogos();
  const section = pathname.startsWith('/account/orders')
    ? 'orders'
    : (params.get('section') || 'dashboard');

  return (
    <div className="pt-member pt-no-chrome min-h-dvh bg-sunken text-ink-1">
      <aside className="pt-slab fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-hairline lg:flex">
        <div className="flex h-20 items-center border-b border-hairline px-6">
          <Image src={headerLogoUrl} alt="Protein.tn" width={132} height={42} priority className="h-auto w-[132px]" />
        </div>
        <div className="px-5 py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-3">Espace membre</p>
          <p className="mt-2 truncate font-display text-xl font-bold uppercase tracking-tight text-ink-1">{user?.name || 'Mon compte'}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {user?.phone_verified ? 'Membre vérifié' : 'Vérification à terminer'}
          </p>
        </div>
        <nav aria-label="Navigation de l’espace membre" className="px-3">
          <ul className="space-y-1">
            {items.map(({ key, label, href, icon: Icon }) => {
              const active = section === key;
              return (
                <li key={key}>
                  <Link href={href} aria-current={active ? 'page' : undefined} className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors',
                    active ? 'bg-brand-fill text-on-brand-fill shadow-sm' : 'text-ink-2 hover:bg-elevated hover:text-ink-1',
                  )}>
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto space-y-1 border-t border-hairline p-3">
          <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-ink-2 hover:bg-elevated hover:text-ink-1">
            <Store className="h-[18px] w-[18px]" aria-hidden="true" />Retour à la boutique
          </Link>
          <button type="button" onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold text-ink-3 hover:bg-elevated hover:text-ink-1">
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />Déconnexion
          </button>
        </div>
      </aside>

      <div className="pt-member-content">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-hairline bg-elevated px-4 sm:px-6 lg:h-20 lg:px-8">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-ink-2 hover:bg-sunken hover:text-ink-1 lg:hidden">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />Boutique
          </Link>
          <Image src={headerLogoUrl} alt="Protein.tn" width={112} height={36} priority className="h-auto w-28 lg:hidden" />
          <div className="hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">Mon espace Protein.tn</p>
            <p className="mt-0.5 text-sm text-ink-2">Commandes, avis et avantages réunis au même endroit.</p>
          </div>
          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/shop" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-hairline bg-elevated px-4 text-sm font-semibold text-ink-1 hover:border-brand/40 hover:text-brand">
              <Store className="h-4 w-4" aria-hidden="true" />Voir la boutique
            </Link>
          </div>
        </header>

        <div className="min-h-[calc(100dvh-4rem)] pb-24 lg:min-h-[calc(100dvh-5rem)] lg:pb-0">{children}</div>
      </div>

      <nav aria-label="Navigation membre" className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-elevated pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid h-16 grid-cols-5">
          {items.map(({ key, label, href, icon: Icon }) => {
            const active = section === key;
            return (
              <li key={key}>
                <Link href={href} aria-current={active ? 'page' : undefined} className={cn(
                  'relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-semibold',
                  active ? 'text-brand' : 'text-ink-3',
                )}>
                  {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-brand" />}
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
