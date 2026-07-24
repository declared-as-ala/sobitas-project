'use client';

import { useState, useEffect, type ReactNode, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingCart,
  User,
  Menu,
  Moon,
  Sun,
  Phone,
  Package,
  MapPin,
  Truck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Heart,
  Home,
  ShoppingBag,
  Store,
  Newspaper,
  Mail,
  Info,
  Star,
  Tag,
  Gift,
  Search,
  Shield,
  Lock,
  X,
  type LucideIcon,
} from 'lucide-react';
import { SearchBar } from './SearchBar';
import { Button } from '@/app/components/ui/button';
import { useTheme } from 'next-themes';
import { ProductsDropdown } from './ProductsDropdown';
import { useCart } from '@/app/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetClose, SheetTitle } from '@/app/components/ui/sheet';
import { cn } from '@/app/components/ui/utils';
import { getNavigationItems } from '@/services/api';
import { useSiteChrome } from '@/contexts/SiteChromeContext';
import { useSiteLogos } from '@/hooks/useSiteLogos';
import type { SiteNavigationItem } from '@/types';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '@/i18n/I18nProvider';
import { MULTILOCALE_ENABLED } from '@/i18n';

// CartDrawer is interaction-gated (opens on cart click) and carries no SEO content, so lazy-load
// it — this keeps its `vaul` drawer chunk out of every page's first-load JS.
const CartDrawer = dynamic(() => import('./CartDrawer').then((m) => ({ default: m.CartDrawer })), { ssr: false });

const PHONE = '+216 27 612 500';
const PHONE_FIXE = '+216 73 200 169';
const MAPS_URL = 'https://maps.app.goo.gl/w2ytnYAKSZDmjznh6';
const DELIVERY_MSG = 'Livraison gratuite à partir de 300 DT';

type HeaderNavLink = {
  href: string;
  label: string;
  icon?: string | null;
  opensNewTab?: boolean;
};

const FALLBACK_NAV_LINKS: HeaderNavLink[] = [
  { href: '/', label: 'ACCUEIL', icon: 'home' },
  { href: '/shop', label: 'NOS PRODUITS', icon: 'shopping-bag' },
  { href: '/packs', label: 'PACKS', icon: 'package' },
  { href: '/brands', label: 'MARQUES', icon: 'store' },
  { href: '/blog', label: 'BLOG', icon: 'newspaper' },
  { href: '/contact', label: 'CONTACT', icon: 'mail' },
  { href: '/qui-sommes-nous', label: 'QUI SOMMES NOUS', icon: 'info' },
];

/** Always-present entry point to the pack composer, appended to whatever nav the backend ships. */
const PACK_BUILDER_LINK: HeaderNavLink = { href: '/pack-builder', label: 'COMPOSEZ VOTRE PACK', icon: 'gift' };

function withPackBuilder(links: HeaderNavLink[]): HeaderNavLink[] {
  return links.some((link) => link.href === '/pack-builder') ? links : [...links, PACK_BUILDER_LINK];
}

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  'shopping-bag': ShoppingBag,
  package: Package,
  store: Store,
  newspaper: Newspaper,
  mail: Mail,
  phone: Phone,
  info: Info,
  star: Star,
  heart: Heart,
  tag: Tag,
  gift: Gift,
};

/**
 * The backend nav occasionally ships English labels (e.g. "BRANDS") even though the site default is
 * French. Normalize known ones to French at the source so both the desktop nav and the mobile
 * sidebar read French — and locale switching still works (translateLegacy maps MARQUES→BRANDS for EN).
 */
const FRENCH_NAV_LABELS: Record<string, string> = {
  BRANDS: 'MARQUES',
  Brands: 'Marques',
  brands: 'Marques',
  HOME: 'ACCUEIL',
  SHOP: 'BOUTIQUE',
  BLOG: 'BLOG',
  CONTACT: 'CONTACT',
};

function frenchifyNavLabel(label: string): string {
  return FRENCH_NAV_LABELS[label.trim()] ?? label;
}

function normalizeNavigationItems(items: SiteNavigationItem[]): HeaderNavLink[] {
  return items
    .filter((item) => item?.is_visible !== false && item.label && item.url)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id)
    .map((item) => ({
      href: item.url,
      label: frenchifyNavLabel(item.label),
      icon: item.icon,
      opensNewTab: item.opens_new_tab,
    }));
}

function isExternalHref(href: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

function isProductsNavLink(link: HeaderNavLink): boolean {
  return link.href === '/shop' || link.label.toLocaleUpperCase('fr-FR').includes('PRODUIT');
}

function NavigationIcon({ name, className }: { name?: string | null; className: string }) {
  const Icon = name ? NAV_ICON_MAP[name] : undefined;
  return Icon ? <Icon className={className} aria-hidden /> : null;
}

function NavigationLink({
  item,
  className,
  children,
  onClick,
  ariaCurrent,
}: {
  item: HeaderNavLink;
  className: string;
  children?: ReactNode;
  onClick?: () => void;
  /** 'page' on the active nav item so assistive tech announces the current page. */
  ariaCurrent?: 'page';
}) {
  const content = children ?? item.label;
  const targetProps = item.opensNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const currentProps = ariaCurrent ? { 'aria-current': ariaCurrent } : {};

  if (isExternalHref(item.href)) {
    return (
      <a href={item.href} className={className} onClick={onClick} {...targetProps} {...currentProps}>
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className} onClick={onClick} {...targetProps} {...currentProps}>
      {content}
    </Link>
  );
}

export function HeaderClient() {
  const { translateLegacy } = useI18n();
  const { headerLogoUrl } = useSiteLogos();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState('');
  const { theme, setTheme } = useTheme();
  // Server-fetched nav (root layout → SiteChromeProvider): the real labels are in the SSR HTML,
  // so there is no first-paint "NOS PRODUITS" → "BOUTIQUE" swap anymore.
  const { navigation: ssrNavigation, categories: ssrCategories } = useSiteChrome();
  const [dynamicNavigation, setDynamicNavigation] = useState<{
    navbar: HeaderNavLink[];
    sidebar: HeaderNavLink[];
  }>(() => ({
    navbar: normalizeNavigationItems(ssrNavigation.navbar),
    sidebar: normalizeNavigationItems(ssrNavigation.sidebar),
  }));

  const { getTotalItems, cartDrawerOpen, setCartDrawerOpen } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { isAuthenticated, user, logout } = useAuth();
  const cartItemsCount = getTotalItems();

  useEffect(() => {
    // Fallback only: when the server fetch failed (empty SSR nav), fetch client-side as before.
    if (ssrNavigation.navbar.length > 0 || ssrNavigation.sidebar.length > 0) return;
    let active = true;

    getNavigationItems().then((items) => {
      if (!active) return;
      setDynamicNavigation({
        navbar: normalizeNavigationItems(items.navbar),
        sidebar: normalizeNavigationItems(items.sidebar),
      });
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleSidebarSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = sidebarQuery.trim();
    if (!q) return;
    router.push(`/shop?search=${encodeURIComponent(q)}`);
    closeMobileMenu();
    setSidebarQuery('');
  };

  const navLinks = withPackBuilder(dynamicNavigation.navbar.length > 0 ? dynamicNavigation.navbar : FALLBACK_NAV_LINKS);
  const sidebarLinks = withPackBuilder(dynamicNavigation.sidebar.length > 0 ? dynamicNavigation.sidebar : navLinks);

  const packBuilderLink = navLinks.find((link) => link.href === '/pack-builder');

  const isActiveNav = (href: string) => (href === '/' ? pathname === '/' : pathname === href);

  return (
    // A FRAGMENT, not a wrapper <div>. `position: sticky` only holds while the element's PARENT box
    // is in view — if the sticky <header> lived inside a short wrapper div (just utility+header),
    // it would un-stick and scroll away the moment you passed that ~160px box. Returning a fragment
    // makes the sticky <header> a direct child of the tall page-flow container, so it sticks for
    // the whole page. The utility bar sits before it and scrolls away on its own.
    <>
      {/* Utility bar — deliberately OUTSIDE the sticky wrapper so it simply scrolls off the top of
          the page under its own weight. No JS, no state, no max-height animation: this is what
          removes the old two-state "lag" where the `scrolled` boolean flipped back and forth at a
          single threshold. Only the main bar + nav below are sticky. */}
      <div className="font-poppins bg-[#111827] text-white">
        <div className="hidden md:flex max-w-[1400px] mx-auto h-9 px-4 lg:px-8 items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-[#FF5A00] transition-colors shrink-0" aria-label={`Appeler ${PHONE}`}>
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{PHONE}</span>
            </a>
            <span className="text-[#6B7280]">|</span>
            <a href={`tel:${PHONE_FIXE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-[#FF5A00] transition-colors shrink-0" aria-label={`Appeler ${PHONE_FIXE}`}>
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{PHONE_FIXE}</span>
            </a>
          </div>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[#FF5A00] transition-colors shrink-0"
            aria-label="Notre localisation"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Notre localisation</span>
          </a>
          <span className="flex items-center gap-1.5 shrink-0">
            <Truck className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" aria-hidden />
            <span>{DELIVERY_MSG}</span>
          </span>
        </div>
        <div className="md:hidden flex h-9 px-4 items-center justify-center text-[11px] text-gray-200">
          <Truck className="h-3.5 w-3.5 mr-1.5 shrink-0 text-[#22C55E]" aria-hidden />
          <span className="min-w-0 truncate">{DELIVERY_MSG}</span>
        </div>
      </div>

      {/* Sticky header = main bar + nav row only. Pure-CSS `sticky top-0`; no scroll listener, no
          collapse — nothing to jitter. z-50 keeps it above page content and the hero pin. */}
      <header className="font-poppins sticky top-0 z-50 w-full bg-white dark:bg-gray-950 border-b border-[#E5E7EB] dark:border-gray-800">
        {/* MOBILE main bar */}
        <div className="md:hidden">
          <div className="flex items-center justify-between w-full px-4 gap-1 h-14 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 min-h-11 min-w-11 flex-shrink-0 rounded-xl -ml-1 hover:bg-[#F5F6F8] dark:hover:bg-gray-800 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="h-6 w-6" aria-hidden />
            </Button>

            <Link href="/" className="flex items-center justify-center flex-1 min-w-0" aria-label="Proteine Tunisie - Accueil">
              {/* No `priority` — see the desktop logo note. The mobile logo preload was racing the
                  hero LCP image on phones. It stays eager (in the initial viewport) without a
                  fetchpriority=high preload. */}
              <Image
                src={headerLogoUrl}
                alt="Proteine Tunisie"
                width={140}
                height={48}
                className="h-8 min-h-[32px] w-auto max-w-full object-contain drop-shadow-sm"
                style={{ width: 'auto', height: 'auto' }}
                loading="eager"
              />
            </Link>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              <SearchBar variant="mobile" />
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 min-h-11 min-w-11 flex-shrink-0 rounded-xl hover:bg-[#F5F6F8] dark:hover:bg-gray-800 transition-colors"
                onClick={() => setCartDrawerOpen(true)}
                aria-label={cartItemsCount > 0 ? `Panier - ${cartItemsCount} article${cartItemsCount > 1 ? 's' : ''}` : 'Panier'}
              >
                <ShoppingCart className="h-6 w-6" aria-hidden />
                {cartItemsCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#FF5A00] text-white text-caption font-bold leading-none rounded-full">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </Button>

              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 min-h-11 min-w-11 flex-shrink-0 rounded-xl -mr-1 hover:bg-[#F5F6F8] dark:hover:bg-gray-800 transition-colors"
                  onClick={() => router.push('/account')}
                  aria-label="Mon compte"
                >
                  <User className="h-6 w-6" aria-hidden />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 min-h-11 min-w-11 flex-shrink-0 rounded-xl -mr-1 hover:bg-[#F5F6F8] dark:hover:bg-gray-800 transition-colors"
                  onClick={() => router.push('/login')}
                  aria-label="Connexion"
                >
                  <User className="h-6 w-6" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* DESKTOP main bar: white surface, orange logo, wide search, ghost icon buttons. */}
        <div className="hidden md:block bg-white dark:bg-gray-950">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
            <div className="flex items-center gap-6 h-[72px]">
              <Link href="/" className="flex-shrink-0" aria-label="Proteine Tunisie - Accueil">
                {/* Logo is NOT `priority`: next/image priority injects a fetchpriority=high preload
                    that ignores the responsive `hidden`/`md:block` split, so a phone was preloading
                    BOTH logo variants in a race with the hero LCP image. The logo is small and in
                    the always-visible sticky header — eager in-viewport loading is enough. */}
                <Image
                  src={headerLogoUrl}
                  alt="Proteine Tunisie"
                  width={200}
                  height={70}
                  className="h-9 lg:h-10 w-auto object-contain dark:brightness-0 dark:invert"
                />
              </Link>

              {/* Search grows to fill the WHOLE middle (flex-1) so the icon cluster is pushed flush
                  to the right edge. Without this wrapper the search capped at max-w-2xl and the
                  leftover space fell after the icons (default justify-start), stranding them mid-row.
                  The field itself stays capped at max-w-2xl and left-aligned inside the wrapper. */}
              <div className="flex flex-1 min-w-0 justify-start">
                <SearchBar variant="desktop" className="w-full" />
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {MULTILOCALE_ENABLED && <LanguageSwitcher />}

                {/* Compte — icon + french label. Keeps the auth dropdown when signed in. */}
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg text-[#111827] dark:text-gray-100 hover:bg-[#F5F6F8] dark:hover:bg-gray-800 transition-colors"
                        aria-label="Mon compte"
                      >
                        <User className="h-5 w-5" aria-hidden />
                        <span className="text-[11px] font-medium leading-none">Compte</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="z-[9999] min-w-[200px] rounded-xl shadow-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                      sideOffset={8}
                    >
                      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate text-gray-600 dark:text-gray-400">{user?.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <Link href="/account">Mon Compte</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <Link href="/account/orders">
                          <Package className="h-4 w-4 mr-2" />
                          Mes Commandes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={logout}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        Déconnexion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    href="/login"
                    className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg text-[#111827] dark:text-gray-100 hover:bg-[#F5F6F8] dark:hover:bg-gray-800 transition-colors"
                    aria-label="Connexion"
                  >
                    <User className="h-5 w-5" aria-hidden />
                    <span className="text-[11px] font-medium leading-none">Compte</span>
                  </Link>
                )}

                {/* Theme toggle — icon only. */}
                <button
                  type="button"
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-[#111827] dark:text-gray-100 hover:bg-[#F5F6F8] dark:hover:bg-gray-800 transition-colors shrink-0"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label="Changer le thème"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
                </button>

                {/* Favoris — icon only, keeps its count badge. */}
                <Link
                  href="/favoris"
                  className="relative h-10 w-10 flex items-center justify-center rounded-lg text-[#111827] dark:text-gray-100 hover:bg-[#F5F6F8] dark:hover:bg-gray-800 transition-colors shrink-0"
                  aria-label={favoritesCount > 0 ? `Favoris - ${favoritesCount} produits` : 'Favoris'}
                >
                  <Heart className="h-5 w-5" aria-hidden />
                  {favoritesCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#FF5A00] text-white text-[10px] font-bold leading-none rounded-full ring-2 ring-white dark:ring-gray-950">
                      {favoritesCount > 99 ? '99+' : favoritesCount}
                    </span>
                  )}
                </Link>

                {/* Panier — icon + french label + count badge. */}
                <button
                  type="button"
                  className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg text-[#111827] dark:text-gray-100 hover:bg-[#F5F6F8] dark:hover:bg-gray-800 transition-colors shrink-0"
                  onClick={() => setCartDrawerOpen(true)}
                  aria-label={cartItemsCount > 0 ? `Panier - ${cartItemsCount} articles` : 'Panier'}
                >
                  <span className="relative">
                    <ShoppingCart className="h-5 w-5" aria-hidden />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-[#FF5A00] text-white text-[10px] font-bold leading-none rounded-full ring-2 ring-white dark:ring-gray-950">
                        {cartItemsCount > 99 ? '99+' : cartItemsCount}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-medium leading-none">Panier</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP nav row — icon + label; active item is #FF5A00 with a 2px underline; the
            pack-builder entry renders as an orange button pinned to the right. */}
        <nav
          className="hidden md:block bg-white dark:bg-gray-950 border-t border-[#E5E7EB] dark:border-gray-800"
          aria-label="Navigation principale"
        >
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
            <div className="flex items-center gap-4 h-12">
              {/* The nav items scroll horizontally WITHIN this container (flex-1 min-w-0 +
                  overflow-x-auto) so a long nav can never overflow the page and force a body-level
                  horizontal scrollbar on tablet/small-laptop widths. The orange pack CTA is a
                  shrink-0 sibling OUTSIDE the scroller, so it stays pinned to the right at all
                  widths (matching the mockup). */}
              <div className="scrollbar-hide flex flex-1 min-w-0 items-center gap-5 lg:gap-7 xl:gap-9 h-full overflow-x-auto overflow-y-hidden">
                {navLinks.map((link) => {
                  if (link.href === '/pack-builder') return null;
                  if (isProductsNavLink(link)) {
                    return (
                      <ProductsDropdown
                        key={`${link.href}-${link.label}`}
                        label={translateLegacy(link.label)}
                        href={link.href}
                        opensNewTab={link.opensNewTab}
                      />
                    );
                  }
                  const active = isActiveNav(link.href);
                  return (
                    <NavigationLink
                      key={`${link.href}-${link.label}`}
                      item={link}
                      ariaCurrent={active ? 'page' : undefined}
                      className={cn(
                        'relative inline-flex items-center gap-1.5 h-full text-[14px] font-semibold whitespace-nowrap transition-colors',
                        active
                          ? 'text-[#FF5A00]'
                          : 'text-[#111827] dark:text-gray-200 hover:text-[#FF5A00]'
                      )}
                    >
                      <NavigationIcon name={link.icon} className="h-4 w-4" />
                      <span>{translateLegacy(link.label)}</span>
                      {active && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5A00]" aria-hidden />
                      )}
                    </NavigationLink>
                  );
                })}
              </div>

              {packBuilderLink && (
                <NavigationLink
                  item={packBuilderLink}
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[#FF5A00] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#E85200] transition-colors whitespace-nowrap"
                >
                  <Gift className="h-4 w-4" aria-hidden />
                  <span>{translateLegacy(packBuilderLink.label)}</span>
                </NavigationLink>
              )}
            </div>
          </div>
        </nav>
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="font-poppins w-[85vw] max-w-[340px] p-0 rounded-l-2xl overflow-hidden bg-white dark:bg-gray-900"
        >
          <div className="flex h-full min-h-0 flex-col">
            {/* 1 — HEADER: logo + close */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#E5E7EB] dark:border-gray-800 shrink-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Link href="/" onClick={closeMobileMenu} className="block" aria-label="Proteine Tunisie - Accueil">
                <Image
                  src={headerLogoUrl}
                  alt="Proteine Tunisie"
                  width={130}
                  height={40}
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <SheetClose
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B7280] hover:bg-[#F5F6F8] hover:text-[#111827] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </SheetClose>
            </div>

            {/* 2 — SEARCH */}
            <form onSubmit={handleSidebarSearch} role="search" className="shrink-0 px-4 pt-4 pb-2">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#6B7280]" aria-hidden />
                <input
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  value={sidebarQuery}
                  onChange={(e) => setSidebarQuery(e.target.value)}
                  placeholder="Rechercher un produit..."
                  aria-label="Rechercher un produit"
                  className="w-full min-h-[44px] rounded-xl border border-[#E5E7EB] bg-[#F5F6F8] pl-9 pr-11 text-[14px] text-[#111827] placeholder:text-[#6B7280] transition-colors focus:border-[#FF5A00] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:bg-gray-900"
                />
                <button
                  type="submit"
                  aria-label="Rechercher"
                  className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-white hover:text-[#FF5A00] dark:hover:bg-gray-700"
                >
                  <Search className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </form>

            {/* SCROLLABLE MIDDLE — nav list scrolls above the pinned trust chips */}
            <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* 3 + 4 — NAVIGATION */}
              <div className="px-4 pt-2 pb-2">
                <h3 className="px-1 mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#FF5A00]">
                  Navigation
                </h3>
                <nav className="space-y-1">
                  {sidebarLinks.map((link) => {
                    if (link.href === '/pack-builder') return null;

                    if (isProductsNavLink(link)) {
                      const shopActive = isActiveNav(link.href);
                      const hasCategories = ssrCategories.length > 0;
                      return (
                        <div key={`${link.href}-${link.label}`}>
                          <button
                            type="button"
                            aria-expanded={hasCategories ? productsOpen : undefined}
                            onClick={() => {
                              if (!hasCategories) {
                                router.push('/shop');
                                closeMobileMenu();
                                return;
                              }
                              setProductsOpen((v) => !v);
                            }}
                            className={cn(
                              'flex w-full items-center gap-3 min-h-[48px] px-3 rounded-xl text-[15px] font-semibold transition-colors',
                              shopActive
                                ? 'bg-[#FF5A00]/10 text-[#FF5A00]'
                                : 'text-[#111827] hover:bg-[#F5F6F8] dark:text-gray-100 dark:hover:bg-gray-800'
                            )}
                          >
                            <NavigationIcon
                              name={link.icon}
                              className={cn('h-5 w-5 shrink-0', shopActive ? 'text-[#FF5A00]' : 'text-[#6B7280]')}
                            />
                            <span className="flex-1 text-left">{translateLegacy(link.label)}</span>
                            {!hasCategories ? (
                              <ChevronRight className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden />
                            ) : productsOpen ? (
                              <ChevronUp className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-[#6B7280]" aria-hidden />
                            )}
                          </button>

                          {hasCategories && (
                            <div
                              className={cn(
                                'grid transition-[grid-template-rows] duration-300 ease-out',
                                productsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                              )}
                            >
                              <div className="overflow-hidden">
                                <ul className="mt-1 space-y-0.5 pb-1">
                                  {ssrCategories.map((cat) => {
                                    const catHref = `/${cat.slug}`;
                                    const catActive = pathname === catHref;
                                    return (
                                      <li key={cat.id}>
                                        <Link
                                          href={catHref}
                                          onClick={closeMobileMenu}
                                          aria-current={catActive ? 'page' : undefined}
                                          className={cn(
                                            'flex items-center gap-2 min-h-[40px] pl-12 pr-3 rounded-xl text-[14px] transition-colors',
                                            catActive
                                              ? 'font-semibold text-[#FF5A00]'
                                              : 'text-[#111827] hover:bg-[#F5F6F8] dark:text-gray-300 dark:hover:bg-gray-800'
                                          )}
                                        >
                                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF5A00]" aria-hidden />
                                          <span className="min-w-0 flex-1 truncate">{cat.designation_fr}</span>
                                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                                        </Link>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    const active = isActiveNav(link.href);
                    return (
                      <NavigationLink
                        key={`${link.href}-${link.label}`}
                        item={link}
                        onClick={closeMobileMenu}
                        ariaCurrent={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 min-h-[48px] px-3 rounded-xl text-[15px] font-semibold transition-colors',
                          active
                            ? 'bg-[#FF5A00]/10 text-[#FF5A00]'
                            : 'text-[#111827] hover:bg-[#F5F6F8] dark:text-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <NavigationIcon
                          name={link.icon}
                          className={cn('h-5 w-5 shrink-0', active ? 'text-[#FF5A00]' : 'text-[#6B7280]')}
                        />
                        <span>{translateLegacy(link.label)}</span>
                      </NavigationLink>
                    );
                  })}
                </nav>
              </div>

              {/* 5 — divider */}
              <div className="mx-4 border-t border-[#E5E7EB] dark:border-gray-800" />

              {/* 6 — PACK CTA */}
              {packBuilderLink && (
                <div className="px-4 py-3">
                  <NavigationLink
                    item={packBuilderLink}
                    onClick={closeMobileMenu}
                    className="flex h-12 items-center justify-between rounded-xl bg-[#FF5A00] px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#E85200]"
                  >
                    <span className="flex items-center gap-2">
                      <Gift className="h-5 w-5 shrink-0" aria-hidden />
                      <span>{translateLegacy(packBuilderLink.label)}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
                  </NavigationLink>
                </div>
              )}

              {/* 7 — divider */}
              <div className="mx-4 border-t border-[#E5E7EB] dark:border-gray-800" />

              {/* 8 — UTILITY ITEMS */}
              <div className="px-4 py-3 space-y-1">
                <button
                  type="button"
                  onClick={() => { setCartDrawerOpen(true); closeMobileMenu(); }}
                  className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-medium text-[#111827] transition-colors hover:bg-[#F5F6F8] dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  <ShoppingCart className="h-5 w-5 shrink-0 text-[#6B7280]" aria-hidden />
                  <span className="flex-1 text-left">Panier</span>
                  {cartItemsCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF5A00] px-1 text-[11px] font-bold text-white">
                      {cartItemsCount > 99 ? '99+' : cartItemsCount}
                    </span>
                  )}
                </button>

                <Link
                  href="/favoris"
                  onClick={closeMobileMenu}
                  className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-medium text-[#111827] transition-colors hover:bg-[#F5F6F8] dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  <Heart
                    className={cn('h-5 w-5 shrink-0', favoritesCount > 0 ? 'fill-[#FF5A00] text-[#FF5A00]' : 'text-[#6B7280]')}
                    aria-hidden
                  />
                  <span className="flex-1">Favoris</span>
                  {favoritesCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF5A00] px-1 text-[11px] font-bold text-white">
                      {favoritesCount > 99 ? '99+' : favoritesCount}
                    </span>
                  )}
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link
                      href="/account"
                      onClick={closeMobileMenu}
                      className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-medium text-[#111827] transition-colors hover:bg-[#F5F6F8] dark:text-gray-100 dark:hover:bg-gray-800"
                    >
                      <User className="h-5 w-5 shrink-0 text-[#6B7280]" aria-hidden />
                      <span>Mon compte</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => { logout(); closeMobileMenu(); }}
                      className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[14px] font-medium text-[#6B7280] transition-colors hover:bg-[#F5F6F8] hover:text-[#111827] dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                      <span className="pl-8">Déconnexion</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-medium text-[#111827] transition-colors hover:bg-[#F5F6F8] dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    <User className="h-5 w-5 shrink-0 text-[#6B7280]" aria-hidden />
                    <span>Connexion</span>
                  </Link>
                )}
              </div>
            </div>

            {/* 9 — TRUST CHIPS (pinned to bottom, always visible) */}
            <div className="mt-auto shrink-0 border-t border-[#E5E7EB] dark:border-gray-800 px-4 pt-3 pb-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1 rounded-lg bg-[#F5F6F8] dark:bg-gray-800 px-2.5 py-2">
                  <Truck className="h-4 w-4 shrink-0 text-[#22C55E]" aria-hidden />
                  <span className="text-[11px] leading-tight text-[#111827] dark:text-gray-200">
                    Livraison rapide
                    <br />
                    24–48h
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-[#F5F6F8] dark:bg-gray-800 px-2.5 py-2">
                  <Shield className="h-4 w-4 shrink-0 text-[#111827] dark:text-gray-200" aria-hidden />
                  <span className="text-[11px] leading-tight text-[#111827] dark:text-gray-200">
                    Paiement à
                    <br />
                    la livraison
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-[#F5F6F8] dark:bg-gray-800 px-2.5 py-2">
                  <Lock className="h-4 w-4 shrink-0 text-[#111827] dark:text-gray-200" aria-hidden />
                  <span className="text-[11px] leading-tight text-[#111827] dark:text-gray-200">
                    Paiement
                    <br />
                    100% sécurisé
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CartDrawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} />
    </>
  );
}
