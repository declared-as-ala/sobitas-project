'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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
  type LucideIcon,
} from 'lucide-react';
import { SearchBar } from './SearchBar';
import { Button } from '@/app/components/ui/button';
import { useTheme } from 'next-themes';
import { ProductsDropdown } from './ProductsDropdown';
import { MobileProductsMenu } from './MobileProductsMenu';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet';
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

const SCROLL_THRESHOLD = 24;
const MOBILE_NAV_SCROLL_THRESHOLD = 20;
const MOBILE_NAV_SCROLL_DELTA = 12;
const MOBILE_BREAKPOINT = 768;
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
}: {
  item: HeaderNavLink;
  className: string;
  children?: ReactNode;
  onClick?: () => void;
}) {
  const content = children ?? item.label;
  const targetProps = item.opensNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  if (isExternalHref(item.href)) {
    return (
      <a href={item.href} className={className} onClick={onClick} {...targetProps}>
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className} onClick={onClick} {...targetProps}>
      {content}
    </Link>
  );
}

export function HeaderClient() {
  const { translateLegacy } = useI18n();
  const { headerLogoUrl } = useSiteLogos();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProductsMenuOpen, setMobileProductsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const isMobileViewportRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);
  const { theme, setTheme } = useTheme();
  // Server-fetched nav (root layout → SiteChromeProvider): the real labels are in the SSR HTML,
  // so there is no first-paint "NOS PRODUITS" → "BOUTIQUE" swap anymore.
  const { navigation: ssrNavigation } = useSiteChrome();
  const [dynamicNavigation, setDynamicNavigation] = useState<{
    navbar: HeaderNavLink[];
    sidebar: HeaderNavLink[];
  }>(() => ({
    navbar: normalizeNavigationItems(ssrNavigation.navbar),
    sidebar: normalizeNavigationItems(ssrNavigation.sidebar),
  }));

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const syncViewport = () => {
      const mobile = mql.matches;
      isMobileViewportRef.current = mobile;
      setIsMobileViewport(mobile);

      const y = Math.max(0, window.scrollY);
      lastScrollYRef.current = y;
      setScrolled(y > SCROLL_THRESHOLD);
      if (mobile) setMobileNavVisible(y <= MOBILE_NAV_SCROLL_THRESHOLD);
      else setMobileNavVisible(true);
    };

    syncViewport();
    mql.addEventListener('change', syncViewport);
    return () => mql.removeEventListener('change', syncViewport);
  }, []);
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

  const onScroll = useCallback(() => {
    const currentScrollY = Math.max(0, (typeof window === 'undefined' ? 0 : window.scrollY));
    const last = lastScrollYRef.current;
    setScrolled(currentScrollY > SCROLL_THRESHOLD);

    if (!isMobileViewportRef.current) {
      lastScrollYRef.current = currentScrollY;
      return;
    }

    if (currentScrollY <= MOBILE_NAV_SCROLL_THRESHOLD) {
      setMobileNavVisible(true);
    } else if (currentScrollY > last + MOBILE_NAV_SCROLL_DELTA) {
      setMobileNavVisible(false);
    } else if (currentScrollY < last - MOBILE_NAV_SCROLL_DELTA) {
      setMobileNavVisible(true);
    }
    lastScrollYRef.current = currentScrollY;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        onScroll();
        tickingRef.current = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (mobileProductsMenuOpen && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [mobileProductsMenuOpen, mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen && mobileProductsMenuOpen) {
      setMobileProductsMenuOpen(false);
    }
  }, [mobileMenuOpen, mobileProductsMenuOpen]);

  const navLinks = withPackBuilder(dynamicNavigation.navbar.length > 0 ? dynamicNavigation.navbar : FALLBACK_NAV_LINKS);
  const sidebarLinks = withPackBuilder(dynamicNavigation.sidebar.length > 0 ? dynamicNavigation.sidebar : navLinks);

  const mobileNavHidden = isMobileViewport && !mobileNavVisible;

  return (
    <div
      className="font-poppins sticky top-0 z-50 w-full transition-transform duration-300 ease-out"
      style={
        mobileNavHidden
          ? { transform: 'translateY(-100%)' }
          : undefined
      }
    >
      {/* Top Info Bar — collapses on desktop once scrolled (the compact "takeover" state, in step
          with the hero widening). max-height + opacity animate cleanly; overflow-hidden clips the
          content as it closes. Mobile is untouched here (the whole header already slides away on
          scroll-down via the sticky root's translateY). */}
      <div
        className={cn(
          'bg-[#111827] text-white border-b border-white/5 overflow-hidden transition-[max-height,height,opacity,transform] duration-200 ease-out',
          scrolled ? 'md:max-h-0 md:opacity-0 md:border-b-0' : 'md:max-h-12 md:opacity-100'
        )}
      >
        <div className="hidden md:flex max-w-[1400px] mx-auto h-7 px-4 lg:px-8 items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-4">
            <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-red-500 transition-colors shrink-0" aria-label={`Appeler ${PHONE}`}>
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{PHONE}</span>
            </a>
            <span className="text-gray-600">|</span>
            <a href={`tel:${PHONE_FIXE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-red-500 transition-colors shrink-0" aria-label={`Appeler ${PHONE_FIXE}`}>
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{PHONE_FIXE}</span>
            </a>
          </div>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-red-500 transition-colors shrink-0"
            aria-label="Notre localisation"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Notre localisation</span>
          </a>
          <span className="flex items-center gap-1.5 shrink-0 text-gray-300">
            <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {DELIVERY_MSG}
          </span>
        </div>
        <div className="md:hidden flex h-7 px-4 items-center justify-center text-[11px] font-medium text-gray-200">
          <Truck className="h-3.5 w-3.5 mr-1.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">{DELIVERY_MSG}</span>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={cn(
          // dark:bg-gray-950 matches both inner bars and the page canvas; it was gray-900 here,
          // which left the mobile bar a different shade from the desktop one in dark mode.
          // One hairline divider for the whole header, no drop shadow (§3: flat surfaces).
          'bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800',
          'transition-[max-height,height,opacity,transform] duration-200 ease-out'
        )}
      >
        <div className="md:hidden">
          <div
            className={cn(
              'flex items-center justify-between w-full px-4 gap-1 transition-[max-height,height,opacity,transform] duration-200',
              scrolled ? 'h-11 py-1.5' : 'h-12 py-2'
            )}
          >
            <Link href="/" className="flex items-center justify-start flex-1 min-w-0 max-w-[11rem] sm:max-w-[12rem] -ml-1" aria-label="Proteine Tunisie - Accueil">
              {/* No `priority` — see the desktop logo note. The mobile logo preload was racing the
                  hero LCP image on phones. It stays eager (in the initial viewport) without a
                  fetchpriority=high preload. */}
              <Image
                src={headerLogoUrl}
                alt="Proteine Tunisie"
                width={140}
                height={48}
                className="h-8 min-h-[32px] w-auto max-w-full object-contain object-left drop-shadow-sm transition-[max-height,height,opacity,transform] duration-200"
                style={{ width: 'auto', height: 'auto' }}
                loading="eager"
              />
            </Link>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              <SearchBar variant="mobile" />
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 min-h-11 min-w-11 flex-shrink-0 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                onClick={() => setCartDrawerOpen(true)}
                aria-label={cartItemsCount > 0 ? `Panier - ${cartItemsCount} article${cartItemsCount > 1 ? 's' : ''}` : 'Panier'}
              >
                <ShoppingCart className="h-6 w-6" aria-hidden />
                {cartItemsCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-600 text-white text-caption font-bold leading-none rounded-full">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </Button>

              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 min-h-11 min-w-11 flex-shrink-0 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  onClick={() => router.push('/account')}
                  aria-label="Mon compte"
                >
                  <User className="h-6 w-6" aria-hidden />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 min-h-11 min-w-11 flex-shrink-0 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  onClick={() => router.push('/login')}
                  aria-label="Connexion"
                >
                  <User className="h-6 w-6" aria-hidden />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-11 min-w-11 flex-shrink-0 rounded-xl -mr-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-6 w-6" aria-hidden />
              </Button>
            </div>
          </div>
        </div>

        {/* Editorial Minimal: the desktop bar was a solid red slab with the logo forced white via
            `brightness-0 invert`. Red is the ONE accent (DESIGN_SYSTEM §2) — spending it on a
            full-width band leaves nothing for it to mean, and the inverted logo is a workaround
            for a background that should not have been red. White surface, ink logo, red reserved
            for the cart/favourites badges and hover states. */}
        <div className="hidden md:block bg-white dark:bg-gray-950">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
            {/* h-16 -> h-[58px], and shrinks again to h-12 once scrolled (the compact state). */}
            <div
              className={cn(
                'flex items-center justify-between gap-5 transition-[max-height,height,opacity,transform] duration-200 ease-out',
                scrolled ? 'h-12' : 'h-[58px]'
              )}
            >
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
                  className={cn(
                    'w-auto object-contain transition-[max-height,height,opacity,transform] duration-200 ease-out dark:brightness-0 dark:invert',
                    scrolled ? 'h-7 lg:h-8' : 'h-8 lg:h-9 xl:h-10'
                  )}
                />
              </Link>

              <SearchBar variant="desktop" className="mx-4 min-w-0" />

              <div className="flex items-center gap-3 flex-shrink-0">
                {MULTILOCALE_ENABLED && <LanguageSwitcher />}
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-10 px-4 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 gap-2 font-medium"
                        aria-label="Mon compte"
                      >
                        <User className="h-5 w-5" />
                        <span className="hidden lg:inline">{user?.name || 'Mon compte'}</span>
                        <span className="lg:hidden">Compte</span>
                      </Button>
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
                  <Button
                    className="h-10 px-4 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 gap-2 font-medium"
                    variant="ghost"
                    asChild
                  >
                    <Link href="/login">
                      <User className="h-5 w-5" />
                      <span className="hidden lg:inline">Connexion</span>
                      <span className="lg:hidden">Connexion</span>
                    </Link>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label="Changer le thème"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                <Link href="/favoris">
                  <Button
                    variant="ghost"
                    size="icon"
                      className="relative h-10 w-10 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
                    aria-label={favoritesCount > 0 ? `Favoris - ${favoritesCount} produits` : 'Favoris'}
                  >
                    <Heart className="h-6 w-6" />
                    {favoritesCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded-full ring-2 ring-white dark:ring-gray-950">
                        {favoritesCount > 99 ? '99+' : favoritesCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                    className="relative h-10 w-10 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 transition-colors shrink-0"
                  onClick={() => setCartDrawerOpen(true)}
                  aria-label={cartItemsCount > 0 ? `Panier - ${cartItemsCount} articles` : 'Panier'}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded-full ring-2 ring-white dark:ring-gray-950">
                      {cartItemsCount > 99 ? '99+' : cartItemsCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* The bar above is now white, so the old `border-t` would draw a hairline in the middle of
            one continuous white surface. The header's single dividing line lives on <header>. */}
        <nav
          className={cn(
            'hidden md:block bg-white dark:bg-gray-950 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[max-height,height,opacity,transform] duration-200 ease-out',
            // Collapses in the compact state so the scrolled header is just the main bar. Search +
            // cart + account stay reachable there; nav returns on scroll back to top.
            scrolled
              ? 'md:max-h-0 md:opacity-0 md:border-t-0'
              : 'md:max-h-16 md:opacity-100 border-t border-gray-100 dark:border-gray-900'
          )}
          /* `inert` when collapsed: max-h-0 + opacity-0 still leaves the links display:block, so
             without this a keyboard user could Tab into an invisible, off-screen nav (and the
             ProductsDropdown trigger anchored to a 0-height box). inert removes the whole subtree
             from the tab order AND the accessibility tree — aria-hidden alone would not drop it
             from focus. Undefined (not false) so the attribute is absent when expanded. */
          {...(scrolled ? { inert: true } : {})}
          aria-label="Navigation principale"
        >
          <div className="flex w-max mx-auto items-center gap-5 lg:gap-7 xl:gap-9 px-4 h-[42px]">
            {navLinks.map((link) => (
              isProductsNavLink(link) ? (
                <ProductsDropdown
                  key={`${link.href}-${link.label}`}
                  label={translateLegacy(link.label)}
                  href={link.href}
                  opensNewTab={link.opensNewTab}
                />
              ) : (
                <NavigationLink
                  key={`${link.href}-${link.label}`}
                  item={link}
                  /* Quiet hover: colour change only. The boxed grey hover fought the calm surface
                     and made a row of eight items read as eight buttons. */
                  /* font-sans (Inter), NOT the display face — and deliberately so, for two
                     measured reasons. (1) Archivo is no longer preloaded, and the nav is above
                     the fold on EVERY page, so using it here would guarantee a visible width
                     shift when the font swaps in; Inter is already preloaded, so there is no
                     FOUT at all. (2) Archivo at wdth 112% plus 0.13em tracking made this row
                     materially wider, and it lives in an `overflow-x-auto` + `mx-auto`
                     container where overflow to the LEFT is unreachable by scrolling.
                     At 12px uppercase with open tracking the two faces are nearly
                     indistinguishable anyway, so this costs the design almost nothing.
                     Keep in lockstep with the ProductsDropdown trigger. */
                  className="inline-flex items-center gap-1.5 font-sans uppercase tracking-[0.11em] text-[12px] font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white transition-colors whitespace-nowrap h-full px-0.5"
                >
                  <NavigationIcon name={link.icon} className="h-4 w-4" />
                  <span>{translateLegacy(link.label)}</span>
                </NavigationLink>
              )
            ))}
          </div>
        </nav>
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="right"
          className="w-[85vw] max-w-[320px] p-0 flex flex-col rounded-l-2xl overflow-hidden"
        >
          <SheetHeader className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Link href="/" onClick={closeMobileMenu} className="block max-w-[120px]">
              <Image
                src={headerLogoUrl}
                alt="Proteine Tunisie"
                width={120}
                height={38}
                className="h-8 w-auto object-contain"
              />
            </Link>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 flex flex-col [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="px-4 pb-4">
              <h3 className="font-display uppercase tracking-[0.2em] text-[11px] font-semibold text-red-600 dark:text-red-400 px-3 mb-2">Navigation</h3>
              <nav className="space-y-0.5">
                {sidebarLinks.map((link) => (
                  isProductsNavLink(link) ? (
                    <button
                      key={`${link.href}-${link.label}`}
                      onClick={() => {
                        closeMobileMenu();
                        setTimeout(() => setMobileProductsMenuOpen(true), 150);
                      }}
                      className="w-full text-left min-h-[48px] py-3 px-3 font-display uppercase tracking-wide text-[15px] font-semibold leading-snug text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-500 rounded-xl transition-colors -mx-1 flex items-center justify-between"
                    >
                      <span>{translateLegacy(link.label)}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ) : (
                    <NavigationLink
                      key={`${link.href}-${link.label}`}
                      item={link}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-3 min-h-[48px] py-3 px-3 font-display uppercase tracking-wide text-[15px] font-semibold leading-snug text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-500 rounded-xl transition-colors -mx-1"
                    >
                      <NavigationIcon name={link.icon} className="h-5 w-5 shrink-0 text-red-500" />
                      <span>{translateLegacy(link.label)}</span>
                    </NavigationLink>
                  )
                ))}
              </nav>
            </div>

            <div className="mt-auto pt-4 px-4 border-t border-gray-200 dark:border-gray-800 space-y-0.5">
              {MULTILOCALE_ENABLED && <LanguageSwitcher mobile />}
              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-xl text-base font-medium leading-snug -mx-1"
                onClick={() => { setCartDrawerOpen(true); closeMobileMenu(); }}
              >
                <ShoppingCart className="h-5 w-5 mr-3 shrink-0" />
                Panier{cartItemsCount > 0 ? ` (${cartItemsCount})` : ''}
              </Button>
              <Link href="/favoris" onClick={closeMobileMenu}>
                <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-base font-medium leading-snug -mx-1">
                  <Heart className={`h-5 w-5 mr-3 shrink-0 ${favoritesCount > 0 ? 'fill-red-600 text-red-600' : ''}`} />
                  Favoris{favoritesCount > 0 ? ` (${favoritesCount})` : ''}
                </Button>
              </Link>
              {isAuthenticated ? (
                <>
                  <Link href="/account" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-base font-medium leading-snug -mx-1">
                      <User className="h-5 w-5 mr-3 shrink-0" />
                      Mon Compte
                    </Button>
                  </Link>
                  <Link href="/account/orders" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-base font-medium leading-snug -mx-1">
                      <Package className="h-5 w-5 mr-3 shrink-0" />
                      Mes Commandes
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-base font-medium leading-snug text-red-600 -mx-1" onClick={() => { logout(); closeMobileMenu(); }}>
                    Déconnexion
                  </Button>
                </>
              ) : (
                <Link href="/login" onClick={closeMobileMenu}>
                  <Button variant="ghost" className="w-full justify-start h-12 rounded-xl text-base font-medium leading-snug -mx-1">
                    <User className="h-5 w-5 mr-3 shrink-0" />
                    Connexion
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start h-12 rounded-xl text-base font-medium leading-snug -mx-1"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5 mr-3 shrink-0" /> : <Moon className="h-5 w-5 mr-3 shrink-0" />}
                {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              </Button>
            </div>

            <div className="px-4 pt-4 pb-4 space-y-2 border-t border-gray-200 dark:border-gray-800 mt-4">
              <a
                href={`tel:${PHONE.replace(/\s/g, '')}`}
                onClick={closeMobileMenu}
                className="flex items-center gap-3 py-3 text-base font-medium leading-snug text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-500 transition-colors"
                aria-label={`Appeler ${PHONE}`}
              >
                <Phone className="h-5 w-5 text-red-500 shrink-0" aria-hidden />
                {PHONE}
              </a>
              <a
                href={`tel:${PHONE_FIXE.replace(/\s/g, '')}`}
                onClick={closeMobileMenu}
                className="flex items-center gap-3 py-3 text-base font-medium leading-snug text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-500 transition-colors"
                aria-label={`Appeler ${PHONE_FIXE}`}
              >
                <Phone className="h-5 w-5 text-red-500 shrink-0" aria-hidden />
                {PHONE_FIXE}
              </a>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 py-3 text-base font-medium leading-snug text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-500 transition-colors"
                aria-label="Notre localisation"
              >
                <MapPin className="h-5 w-5 text-red-500 shrink-0" aria-hidden />
                Notre localisation
              </a>
              <p className="flex items-center gap-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                <Truck className="h-4 w-4 text-red-500 shrink-0" aria-hidden />
                {DELIVERY_MSG}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CartDrawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} />
      <MobileProductsMenu open={mobileProductsMenuOpen} onOpenChange={setMobileProductsMenuOpen} />
    </div>
  );
}
