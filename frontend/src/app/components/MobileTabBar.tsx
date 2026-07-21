'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Heart, User, ShoppingCart } from 'lucide-react';
import { useCart } from '@/app/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { cn } from '@/app/components/ui/utils';

/**
 * Persistent mobile bottom navigation.
 *
 * Puts the cart, account and favourites one thumb-tap away instead of behind a scroll back to
 * the header — on the device driving most of the traffic. Mounted ONCE in the root layout, next
 * to WhatsAppFab, not per page.
 *
 * GEOMETRY CONTRACT: the bar's height lives in `--tabbar-h` (styles/tokens.css), which is also
 * what the body offset and every other fixed-bottom element in the app subtract against. Setting
 * that variable to 0px removes the bar's footprint everywhere at once — a kill switch that needs
 * no code revert. Do not hardcode 56px anywhere else.
 *
 * z-tabbar (40) sits deliberately BELOW the shadcn Sheet overlay and Drawer (both z-50), so the
 * mobile menu and cart drawer cover the bar rather than fighting it.
 */

/** Routes that own the bottom of the viewport, or intentionally have no chrome. */
const HIDDEN_ON = ['/checkout', '/login', '/register', '/forgot-password', '/reset-password'];

export function MobileTabBar() {
  const pathname = usePathname() || '/';
  const { getTotalItems, setCartDrawerOpen } = useCart();
  const { count: favoritesCount } = useFavorites();

  // /checkout already has its own fixed CTA footer (.checkout-cta-footer) plus a keyboard-open
  // variant. Two stacked fixed footers would eat the viewport and demote the one action that
  // matters on that screen.
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const cartCount = getTotalItems();
  const isShop = pathname.startsWith('/shop') || pathname.startsWith('/category') || pathname === '/offres' || pathname === '/packs';

  const items = [
    { key: 'home', label: 'Accueil', href: '/', Icon: Home, active: pathname === '/' },
    { key: 'shop', label: 'Boutique', href: '/shop', Icon: LayoutGrid, active: isShop },
    { key: 'fav', label: 'Favoris', href: '/favoris', Icon: Heart, active: pathname === '/favoris', badge: favoritesCount },
    { key: 'account', label: 'Compte', href: '/account', Icon: User, active: pathname.startsWith('/account') },
  ] as const;

  return (
    <nav
      aria-label="Navigation rapide"
      className="fixed inset-x-0 bottom-0 z-tabbar border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-800 dark:bg-gray-950 md:hidden"
    >
      <ul className="grid h-14 grid-cols-5">
        {items.map(({ key, label, href, Icon, active, badge }: any) => (
          <li key={key}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={badge > 0 ? `${label} — ${badge}` : label}
              className={cn(
                'relative flex h-full w-full flex-col items-center justify-center gap-0.5 transition-colors',
                active ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
              )}
            >
              {/* Active marker is a top rule, not a filled pill — Editorial Minimal (§3/§4). */}
              {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-red-600 dark:bg-red-400" aria-hidden="true" />}
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          </li>
        ))}

        {/* Cart opens the drawer rather than navigating to /cart — same behaviour as the header,
            and it keeps the shopper on the page they were browsing. */}
        <li>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            aria-label={cartCount > 0 ? `Panier — ${cartCount} articles` : 'Panier'}
            className="relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-gray-500 transition-colors dark:text-gray-400"
          >
            <span className="relative">
              <ShoppingCart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium leading-none">Panier</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
