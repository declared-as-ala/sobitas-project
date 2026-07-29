'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Heart, User, ShoppingCart, type LucideIcon } from 'lucide-react';
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
 * LAYERING: z-sticky-cta (30) < z-tabbar (40) < Sheet/Drawer overlays (50).
 *
 * The bar outranks page-level bottom bars — the PDP add-to-cart bar and its skeleton, the cart
 * CTA, the install banner — because it is persistent app chrome and they are page chrome. Those
 * four were all ABOVE it (z-50, and z-[9999] for the banner), which is why the raised Boutique
 * tile below appeared half-buried on every page that has one. They now pad their content by
 * `--tabbar-raise` so the tile overlaps their surface and never their controls.
 *
 * It stays BELOW the shadcn Sheet overlay and Drawer, so the mobile menu and cart drawer cover
 * the bar rather than fighting it. That direction is deliberate; don't "fix" it.
 *
 * BOUTIQUE IS THE CENTRE TAB, AND IT IS RAISED (owner request). Two consequences worth knowing:
 *
 * 1. The order is Accueil · Favoris · BOUTIQUE · Compte · Panier — Boutique is index 2 of 5, the
 *    literal middle cell. Re-ordering or adding an item breaks the centring, so if a sixth entry
 *    ever lands here the raised tile has to move with it.
 * 2. The raised tile is absolutely positioned and anchored to the BOTTOM of its cell, so it grows
 *    UPWARD out of the bar instead of making the row taller. That is deliberate: `--tabbar-h`
 *    (56px) is the geometry contract the body offset and every other fixed-bottom element in the
 *    app subtract against, and it must keep describing the bar's actual footprint. The ~20px that
 *    protrudes floats over page content — that is the intended look, and the `ring-4` in the page
 *    background colour is what punches it visually out of the bar's top edge.
 */

/** Routes that own the bottom of the viewport, or intentionally have no chrome. */
const HIDDEN_ON = ['/checkout', '/login', '/register', '/forgot-password', '/reset-password'];

type TabItem = {
  key: string;
  label: string;
  href: string;
  Icon: LucideIcon;
  active: boolean;
  badge?: number;
};

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

  // Boutique is deliberately absent from these two lists — it is the raised centre tile rendered
  // between them, so the flanking tabs are 2 + 2 and the middle cell is the third of five.
  const leftItems: TabItem[] = [
    { key: 'home', label: 'Accueil', href: '/', Icon: Home, active: pathname === '/' },
    { key: 'fav', label: 'Favoris', href: '/favoris', Icon: Heart, active: pathname === '/favoris', badge: favoritesCount },
  ];

  return (
    <nav
      aria-label="Navigation rapide"
      className="fixed inset-x-0 bottom-0 z-tabbar border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-800 dark:bg-gray-950 md:hidden"
    >
      <ul className="grid h-14 grid-cols-5">
        {leftItems.map(({ key, label, href, Icon, active, badge }) => (
          <li key={key}>
            <TabLink label={label} href={href} Icon={Icon} active={active} badge={badge} />
          </li>
        ))}

        {/* CENTRE — Boutique. The primary destination on a shop, so it gets the one filled,
            elevated target on the bar; everything around it stays monoline and quiet, which is
            what makes it read as bigger rather than just louder.

            `relative` + an absolutely-positioned, bottom-anchored child: the tile grows upward out
            of the 56px row instead of stretching it, so `--tabbar-h` still describes the bar. */}
        <li className="relative">
          <Link
            href="/shop"
            aria-current={isShop ? 'page' : undefined}
            aria-label="Boutique"
            className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 pb-1.5"
          >
            {/* Static `red-600` (#D53B04), not the theme-aware `bg-brand`: brand lightens to
                #FF8A4C in dark mode and white-on-that fails AA. 600 clears 4.69:1 in both themes.
                `ring-4` in the surface colour is the cut-out that separates the tile from the bar
                edge it overlaps. */}
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-red-600 text-white shadow-md ring-4 ring-white transition-transform duration-200 active:scale-95 dark:ring-gray-950">
              <LayoutGrid className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </span>
            <span
              className={cn(
                'text-[10px] font-semibold leading-none transition-colors',
                isShop ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300',
              )}
            >
              Boutique
            </span>
          </Link>
        </li>

        <li>
          <TabLink
            label="Compte"
            href="/account"
            Icon={User}
            active={pathname.startsWith('/account')}
          />
        </li>

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

/** A flanking tab: monoline icon over a 10px label, active state marked by a top rule. */
function TabLink({
  label,
  href,
  Icon,
  active,
  badge,
}: {
  label: string;
  href: string;
  Icon: LucideIcon;
  active: boolean;
  badge?: number;
}) {
  const count = badge ?? 0;

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-label={count > 0 ? `${label} — ${count}` : label}
      className={cn(
        'relative flex h-full w-full flex-col items-center justify-center gap-0.5 transition-colors',
        active ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
      )}
    >
      {/* Active marker is a top rule, not a filled pill — Editorial Minimal (§3/§4). */}
      {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-red-600 dark:bg-red-400" aria-hidden="true" />}
      <span className="relative">
        <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}
