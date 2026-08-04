'use client';

import { useState, useEffect, useRef, type ReactNode, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { buildWhatsAppHref, WHATSAPP_ARIA_LABEL, WHATSAPP_GREEN, WHATSAPP_ICON_PATH } from '@/util/whatsapp';
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
import { useCartActions, useCartCount } from '@/app/contexts/CartContext';
import { useFavoritesCount } from '@/contexts/FavoritesContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetClose, SheetTitle } from '@/app/components/ui/sheet';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/components/ui/utils';
import { getNavigationItems, getCategories, searchProducts, getStorageUrl } from '@/services/api';
import { useDebounce } from '@/util/debounce';
import { getPriceDisplay } from '@/util/productPrice';
import { buildProductUrlPath } from '@/util/productUrl';
import { useSiteChrome } from '@/contexts/SiteChromeContext';
import { useSiteLogos } from '@/hooks/useSiteLogos';
import type { SiteNavigationItem, Product } from '@/types';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '@/i18n/I18nProvider';
import { MULTILOCALE_ENABLED } from '@/i18n';

// CartDrawer no longer lives here — it moved to components/CartDrawerHost.tsx, mounted at the
// layout level. Keeping it here meant this ~1,050-line component had to subscribe to the drawer's
// open state, so every add-to-cart re-rendered the whole header inside the tap handler. See the
// note in CartDrawerHost for the measurements.

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
  /** Second level of the sidebar accordion: which category has its sub-categories open (one at a
   *  time, so the list never becomes an unreadable wall on a phone). */
  const [openCategoryId, setOpenCategoryId] = useState<number | null>(null);
  const [sidebarResults, setSidebarResults] = useState<Product[]>([]);
  const [sidebarSearching, setSidebarSearching] = useState(false);
  const { theme, setTheme } = useTheme();
  // Server-fetched nav (root layout → SiteChromeProvider): the real labels are in the SSR HTML,
  // so there is no first-paint "NOS PRODUITS" → "BOUTIQUE" swap anymore.
  const { navigation: ssrNavigation, categories: ssrCategories } = useSiteChrome();
  // The mobile Boutique accordion needs categories, but useSiteChrome().categories is empty at
  // runtime (the server-chrome fetch doesn't populate it). Mirror the desktop ProductsDropdown:
  // seed from SSR, then client-fetch as a fallback so the accordion always has data to expand.
  const [sidebarCategories, setSidebarCategories] = useState(ssrCategories);
  useEffect(() => {
    if (ssrCategories.length === 0) {
      getCategories().then((cats) => { if (Array.isArray(cats)) setSidebarCategories(cats); }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [dynamicNavigation, setDynamicNavigation] = useState<{
    navbar: HeaderNavLink[];
    sidebar: HeaderNavLink[];
  }>(() => ({
    navbar: normalizeNavigationItems(ssrNavigation.navbar),
    sidebar: normalizeNavigationItems(ssrNavigation.sidebar),
  }));

  // NARROW SUBSCRIPTIONS. `useCart()` here re-rendered all ~1,050 lines of this component on every
  // cart change; the header only ever needed the badge number and a way to open the drawer.
  // `useCartCount()` returns a number, so React bails out unless the count actually moved, and
  // `useCartActions()` never changes identity at all.
  const { setCartDrawerOpen } = useCartActions();
  const cartItemsCount = useCartCount();
  const favoritesCount = useFavoritesCount();
  const { isAuthenticated, user, logout } = useAuth();

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

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    // Reset the drawer to its resting state so the next open starts from the nav, not from a stale
    // search result list or a half-expanded accordion.
    setSidebarQuery('');
    setSidebarResults([]);
    setOpenCategoryId(null);
  };

  const handleSidebarSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = sidebarQuery.trim();
    if (!q) return;
    router.push(`/shop?search=${encodeURIComponent(q)}`);
    closeMobileMenu();
  };

  // Live sidebar search — same pipeline as the desktop bar (debounce → searchProducts), so results
  // appear as you type instead of only on submit. Only runs while the drawer is actually open.
  const debouncedSidebarQuery = useDebounce(sidebarQuery, 300);
  useEffect(() => {
    const q = debouncedSidebarQuery.trim();
    if (!mobileMenuOpen || !q) {
      setSidebarResults([]);
      setSidebarSearching(false);
      return;
    }
    let active = true;
    setSidebarSearching(true);
    searchProducts(q)
      .then(({ products }) => {
        if (active) setSidebarResults(Array.isArray(products) ? products : []);
      })
      .catch(() => {
        if (active) setSidebarResults([]);
      })
      .finally(() => {
        if (active) setSidebarSearching(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSidebarQuery, mobileMenuOpen]);

  const navLinks = withPackBuilder(dynamicNavigation.navbar.length > 0 ? dynamicNavigation.navbar : FALLBACK_NAV_LINKS);
  const sidebarLinks = withPackBuilder(dynamicNavigation.sidebar.length > 0 ? dynamicNavigation.sidebar : navLinks);

  const packBuilderLink = navLinks.find((link) => link.href === '/pack-builder');

  const isActiveNav = (href: string) => (href === '/' ? pathname === '/' : pathname === href);

  /**
   * COMPACT-ON-SCROLL. Writes one attribute on one DOM node; React is never told.
   *
   * That is the entire design constraint. This component is ~1,050 lines inside a client
   * boundary, so a `useState` here would re-render the nav, both dropdowns, the search island and
   * the cart badge on every scroll-direction change — on a site whose measured problem is INP.
   * A ref plus `toggleAttribute` costs one attribute write and lets CSS do the rest
   * (`[data-compact]` in globals.css).
   *
   * ── THE OSCILLATION BUG, AND WHY THE FIRST VERSION COULD NOT AVOID IT ─────────────────────
   * Owner, 2026-08-03: "when I scroll down and it collapses there is a bug — it keeps open and
   * close, open and close, open and close."
   *
   * That was not jitter and no amount of delta-filtering would have stopped it. THIS HEADER IS
   * `position: sticky`, WHICH MEANS IT IS STILL IN NORMAL FLOW. Collapsing it therefore makes the
   * DOCUMENT SHORTER by exactly the amount collapsed, and every element after it moves up by that
   * amount. Chrome's scroll anchoring then does its job: it picks a node in the viewport, notices
   * it moved, and adjusts `scrollY` by the same amount to keep it visually still.
   *
   * That adjustment is delivered to us as an ordinary `scroll` event — pointing the OTHER WAY:
   *
   *     collapse (−64px)  →  anchoring sets scrollY −= 64  →  we read moved = −64  →  "scrolling
   *     up!"  →  expand (+64px)  →  anchoring sets scrollY += 64  →  moved = +64  →  collapse …
   *
   * The first version's `DELTA 8` guard was written for ±1-3px rubber-band noise, so a phantom
   * delta of 64 sailed through it. The loop is deterministic, which is exactly why it read as a
   * continuous flicker rather than as an occasional glitch.
   *
   * Two things fix it, and both are needed:
   *
   *   SETTLE 320   After every flip, swallow all scroll events for longer than the CSS transition
   *                (180ms), resyncing `last` each time. Anchoring compensates continuously while
   *                the height interpolates, so the window has to outlast the animation. This is
   *                the actual fix: our own layout change can no longer be read as user intent.
   *   TRAVEL 40    Flip on CUMULATIVE one-way travel, not on a single event's delta, with the
   *                accumulator reset on every direction change. 3px of trackpad noise can never
   *                add up to 40, and a genuine reversal reaches it in one flick.
   *
   *   ENTER 160    Never compact near the top of the page.
   *   RELEASE 80   Always expanded near the top, whatever the direction — so the header cannot be
   *                left collapsed at y=0 by a fast fling.
   *   rAF coalesce `scroll` fires many times per frame; the handler only schedules, so the
   *                attribute is written at most once per frame and never mid-layout.
   *
   * `passive: true` so the listener can never block scrolling. Reading `window.scrollY` in a rAF
   * callback is a cheap cached read and does not force a synchronous layout the way reading
   * `getBoundingClientRect()` here would.
   *
   * scripts/check-header-compact.mjs now scrolls in realistic 40px steps and COUNTS the state
   * changes with a MutationObserver: a monotonic scroll down must produce exactly one. The old
   * test jumped straight from y=0 to y=900 in a single `scrollTo`, which is precisely why it
   * passed 6/6 on a header that flickered continuously in a real browser.
   */
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const ENTER = 160;
    const RELEASE = 80;
    const TRAVEL = 40;
    const SETTLE = 320;

    let last = window.scrollY;
    let travel = 0;
    let compact = false;
    let settleUntil = 0;
    let scheduled = false;

    const apply = () => {
      scheduled = false;
      const y = window.scrollY;
      const now = performance.now();

      // Everything inside this window is our own collapse rippling back through scroll anchoring.
      // `last` is resynced so the swallowed distance is not counted once the window closes.
      if (now < settleUntil) {
        last = y;
        travel = 0;
        return;
      }

      const moved = y - last;
      last = y;
      if (moved === 0) return;

      // Direction change resets the accumulator, so noise can never accumulate into a flip.
      travel = Math.sign(moved) === Math.sign(travel) ? travel + moved : moved;

      let next = compact;
      if (y <= RELEASE) next = false;
      else if (travel >= TRAVEL && y > ENTER) next = true;
      else if (travel <= -TRAVEL) next = false;

      if (next === compact) return;
      compact = next;
      travel = 0;
      settleUntil = now + SETTLE;
      el.toggleAttribute('data-compact', compact);
    };

    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(apply);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // While the shopper is typing, the drawer's scrollable middle shows results instead of the nav.
  const showSidebarSearch = sidebarQuery.trim().length > 0;
  // True between a keystroke and the debounce firing — keeps the skeleton up so results never flash
  // stale matches for the previous query.
  const sidebarSearchPending = sidebarQuery.trim() !== debouncedSidebarQuery.trim();

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
      {/* THE ONE DARK STRIP IN THE CHROME, and it is 36px tall.
          `.pt-slab` rather than `bg-ink-1`: `bg-ink-1` inverts with the theme, so in dark mode
          this row rendered a #F5F4F2 bar with `text-gray-300` on it — 1.6:1, unreadable. The
          scope keeps it dark in BOTH themes and gives its contents real ink tokens. */}
      <div className="pt-slab font-poppins">
        <div className="hidden md:flex max-w-site mx-auto h-9 px-4 lg:px-8 items-center justify-between text-xs text-ink-2">
          <div className="flex items-center gap-3">
            <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-brand transition-colors shrink-0" aria-label={`Appeler ${PHONE}`}>
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{PHONE}</span>
            </a>
            {/* A real 1px rule, not a "|" glyph. A pipe character is TEXT — it inherits a font,
                a line-height and a colour that a contrast audit then has to judge as text (it
                measured 3.61:1 and was reported as a failure it could never pass, because a
                divider is not supposed to be legible). A 1px box is unambiguously a separator. */}
            <span className="h-3 w-px shrink-0 bg-rule" aria-hidden="true" />
            <a href={`tel:${PHONE_FIXE.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-brand transition-colors shrink-0" aria-label={`Appeler ${PHONE_FIXE}`}>
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{PHONE_FIXE}</span>
            </a>
            <span className="h-3 w-px shrink-0 bg-rule" aria-hidden="true" />
            {/*
              WHATSAPP LIVES HERE NOW, not in the nav row (owner: "find a way for the WhatsApp
              button on desktop, and you can choose another icon for it").

              It was a filled #25D366 pill sitting immediately beside the orange pack CTA — two
              saturated buttons, 12px apart, competing at the loudest point of the chrome. In the
              contact strip it sits with the two phone numbers and the address, which is where a
              shopper looks for a way to reach a shop, and it stops fighting the one button on the
              page that is supposed to win.

              It also permanently settles the contrast problem. WhatsApp green is somebody else's
              brand, so it cannot be a token and cannot flip with the theme — and no single green
              literal passes AA on both a white bar and a near-black one. This strip is `.pt-slab`,
              i.e. dark in BOTH themes, so #25D366 measures 8.53:1 here and is simply correct.
            */}
            <a
              href={buildWhatsAppHref()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={WHATSAPP_ARIA_LABEL}
              className="flex shrink-0 items-center gap-1.5 font-medium text-[#25D366] transition-opacity hover:opacity-80"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
                <path d={WHATSAPP_ICON_PATH} />
              </svg>
              <span>WhatsApp</span>
            </a>
          </div>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-brand transition-colors shrink-0"
            aria-label="Notre localisation"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Notre localisation</span>
          </a>
          <span className="flex items-center gap-1.5 shrink-0">
            <Truck className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden />
            <span>{DELIVERY_MSG}</span>
          </span>
        </div>
        <div className="md:hidden flex h-9 px-4 items-center justify-center text-[11px] text-ink-2">
          <Truck className="h-3.5 w-3.5 mr-1.5 shrink-0 text-ok" aria-hidden />
          <span className="min-w-0 truncate">{DELIVERY_MSG}</span>
        </div>
      </div>

      {/* Sticky header = main bar + nav row only. Pure-CSS `sticky top-0`; no scroll listener, no
          collapse — nothing to jitter. z-50 keeps it above page content and the hero pin. */}
      {/* WHITE, not black (owner, 2026-08-03: "even the header going black, that's bad — keep it
          white and just use black for important things").

          `bg-canvas` + `border-b border-rule`, and the border weight is the load-bearing part: a
          sticky white bar over white page content has no fill difference to separate it, so the
          1px rule IS the boundary and it has to be the STRONGER of the two weights (#D6D2CC, not
          the #E8E5E1 hairline). No shadow — a drop shadow under a full-width bar is the single
          most recognisable "purchased theme" tell, and the rule does the same job at 1px. */}
      <header
        ref={headerRef}
        className="bg-canvas font-poppins sticky top-0 z-50 w-full border-b border-rule"
      >
        {/* MOBILE main bar — logo LEFT, then SEARCH + BURGER only (owner request). Compte and
            Panier used to live here too; they were removed because MobileTabBar already carries
            both, one thumb-tap away at the bottom of every screen. Duplicating them up here cost
            two extra 44px targets on a 320px phone and squeezed the logo for nothing. The burger
            stays on the right; it opens the 100%-width sidebar, which still lists Panier /
            Favoris / Compte for anyone who looks for them at the top. */}
        <div className="md:hidden">
          {/* h-16 (64px), up from h-14 (56px), with py-2.5 (owner: on mobile "the logo bigger, the
              search icon bigger, and the burger bigger").
              The bar grows by ONE 8px unit and every control grows into the space that creates:
              logo 40 → 44px, the two icon buttons 44 → 48px, their glyphs 24 → 26px. The controls
              were already at the 44px tap floor, so this is about legibility at arm's length
              rather than about hit area — a 24px glyph on a 6.1" screen at 60cm subtends less
              than a 16px glyph did on the phones this floor was written for. */}
          <div className="pt-hdr-bar pt-hdr-bar-mobile flex items-center justify-between w-full px-3 min-[380px]:px-4 gap-2 h-16 py-2.5">
            {/* min-w-0 + shrink: the LOGO is what gives way on a narrow phone. With only two
                controls left this is no longer tight, but the rule stays — it is what guarantees
                the burger can never be pushed off-screen and made unreachable. The icon cluster
                stays shrink-0 so every control keeps its 44px tap target. */}
            <Link
              href="/"
              className="flex min-w-0 shrink items-center overflow-hidden"
              aria-label="Proteine Tunisie - Accueil"
            >
              {/* No `priority` — see the desktop logo note. The mobile logo preload was racing the
                  hero LCP image on phones. It stays eager (in the initial viewport) without a
                  fetchpriority=high preload.
                  Sized by CLASS only: the old inline `height:auto` overrode the height class, so the
                  logo rendered at its intrinsic ~150px width and ate the space the burger needed.
                  h-11 (44px): exactly the row's content box (h-16 minus py-2.5), so the logo fills
                  the bar rather than floating in it. At this height the mark is ~129px wide, which
                  still leaves 320px phones room for the two 48px controls plus gutters. */}
              <Image
                src={headerLogoUrl}
                alt="Proteine Tunisie"
                width={140}
                height={48}
                className="pt-hdr-logo h-11 w-auto max-w-full object-contain object-left"
                loading="eager"
              />
            </Link>

            <div className="flex items-center gap-1 flex-shrink-0">
              <SearchBar variant="mobile" />

              {/* Burger — far right. 48px box, 26px glyph. */}
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 min-h-12 min-w-12 flex-shrink-0 rounded-xl -mr-1 hover:bg-ink-1/[0.04] transition-[background-color,transform] duration-200 active:scale-95"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="h-[26px] w-[26px]" aria-hidden />
              </Button>
            </div>
          </div>
        </div>

        {/* DESKTOP main bar: white surface, orange logo, wide search, ghost icon buttons. */}
        <div className="hidden md:block">
          <div className="max-w-site mx-auto px-4 lg:px-8">
            <div className="pt-hdr-bar pt-hdr-bar-desktop flex items-center gap-6 h-[72px]">
              <Link href="/" className="flex-shrink-0 transition-opacity duration-200 hover:opacity-80" aria-label="Proteine Tunisie - Accueil">
                {/* Logo is NOT `priority`: next/image priority injects a fetchpriority=high preload
                    that ignores the responsive `hidden`/`md:block` split, so a phone was preloading
                    BOTH logo variants in a race with the hero LCP image. The logo is small and in
                    the always-visible sticky header — eager in-viewport loading is enough. */}
                <Image
                  src={headerLogoUrl}
                  alt="Proteine Tunisie"
                  width={200}
                  height={70}
                  className="pt-hdr-logo h-9 lg:h-10 w-auto object-contain dark:brightness-0 dark:invert"
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
                        className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg text-ink-1 dark:text-gray-100 hover:bg-ink-1/[0.04] dark:hover:bg-white/5 transition-[background-color,transform] duration-200 active:scale-95"
                        aria-label="Mon compte"
                      >
                        <User className="h-5 w-5" aria-hidden />
                        <span className="text-[11px] font-medium leading-none tracking-wide">Compte</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="pt-plate z-[9999] min-w-[200px] rounded-xl border border-hairline shadow-lg"
                      sideOffset={8}
                    >
                      <div className="pt-plate px-3 py-2.5 border-b border-hairline">
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
                    className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg text-ink-1 dark:text-gray-100 hover:bg-ink-1/[0.04] dark:hover:bg-white/5 transition-[background-color,transform] duration-200 active:scale-95"
                    aria-label="Connexion"
                  >
                    <User className="h-5 w-5" aria-hidden />
                    <span className="text-[11px] font-medium leading-none tracking-wide">Compte</span>
                  </Link>
                )}

                {/* Theme toggle — icon only. */}
                <button
                  type="button"
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-ink-1 dark:text-gray-100 hover:bg-ink-1/[0.04] dark:hover:bg-white/5 transition-[background-color,transform] duration-200 active:scale-95 shrink-0"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label="Changer le thème"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
                </button>

                {/* Favoris — icon only, keeps its count badge. */}
                <Link
                  href="/favoris"
                  className="relative h-10 w-10 flex items-center justify-center rounded-lg text-ink-1 dark:text-gray-100 hover:bg-ink-1/[0.04] dark:hover:bg-white/5 transition-[background-color,transform] duration-200 active:scale-95 shrink-0"
                  aria-label={favoritesCount > 0 ? `Favoris - ${favoritesCount} produits` : 'Favoris'}
                >
                  <Heart className="h-5 w-5" aria-hidden />
                  {favoritesCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-brand text-on-brand text-[10px] font-bold leading-none rounded-full ring-2 ring-canvas">
                      {favoritesCount > 99 ? '99+' : favoritesCount}
                    </span>
                  )}
                </Link>

                {/* Panier — icon + french label + count badge. */}
                <button
                  type="button"
                  className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg text-ink-1 dark:text-gray-100 hover:bg-ink-1/[0.04] dark:hover:bg-white/5 transition-[background-color,transform] duration-200 active:scale-95 shrink-0"
                  onClick={() => setCartDrawerOpen(true)}
                  aria-label={cartItemsCount > 0 ? `Panier - ${cartItemsCount} articles` : 'Panier'}
                >
                  <span className="relative">
                    <ShoppingCart className="h-5 w-5" aria-hidden />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-brand text-on-brand text-[10px] font-bold leading-none rounded-full ring-2 ring-canvas">
                        {cartItemsCount > 99 ? '99+' : cartItemsCount}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-medium leading-none tracking-wide">Panier</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP nav row — icon + label; active item is #FF5A00 with a 2px underline; the
            pack-builder entry renders as an orange button pinned to the right. */}
        <nav
          /* Same white surface as the bar above it, divided by a hairline. The nav row is NOT
             given `bg-sunken` for structure, and that is a contrast decision rather than a taste
             one: the active item is `text-brand`, which measures 4.71:1 on white but only 4.36:1
             on sand — below AA. Structure here comes from the rule, not from a second fill. */
          className="pt-hdr-nav hidden md:block border-t border-hairline"
          aria-label="Navigation principale"
        >
          <div className="max-w-site mx-auto px-4 lg:px-8">
            {/* `pt-hdr-navrow` — the compact state shrinks this row 48 -> 40px rather than folding
                the whole nav away. The height has to be explicit in BOTH states or it cannot
                transition (see globals.css); `h-12` is that explicit resting value. */}
            <div className="pt-hdr-navrow flex items-center gap-4 h-12">
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
                        // Shared underline vocabulary: a 2px accent bar that wipes in from the left on
                        // hover and stays pinned open when active. `after:` on this desktop-only row
                        // (hidden md:block) so its 300ms is never hit by the mobile 0.2s clamp.
                        'group relative inline-flex items-center gap-1.5 h-full text-[14px] font-semibold whitespace-nowrap transition-colors duration-200 after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100',
                        active
                          ? 'text-brand after:scale-x-100'
                          : 'text-ink-1 dark:text-gray-200 hover:text-brand'
                      )}
                    >
                      <NavigationIcon name={link.icon} className="h-4 w-4" />
                      <span>{translateLegacy(link.label)}</span>
                    </NavigationLink>
                  );
                })}
              </div>

              {/* WhatsApp used to sit HERE, as a filled green pill 12px from the orange pack CTA.
                  Two saturated buttons side by side is two primary actions, which is none — and
                  the owner called it out directly. It moved up into the dark contact strip at the
                  top of this file, where the green is both legible in either theme and next to the
                  phone numbers a shopper is already scanning for. The desktop nav row now has
                  exactly ONE button, and it is the one that sells.

                  There is still exactly one WhatsApp affordance per breakpoint: the floating
                  bubble (WhatsAppFab) is `md:hidden` and covers phones. */}

              {packBuilderLink && (
                <NavigationLink
                  item={packBuilderLink}
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[14px] font-semibold text-on-brand shadow-[0_2px_8px_rgba(255,90,0,0.25)] transition-all duration-200 hover:bg-brand-hover hover:shadow-[0_4px_12px_rgba(255,90,0,0.35)] active:scale-[0.98] whitespace-nowrap"
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
          /* 100% width (owner request). `!w-full !max-w-none` overrides the Sheet primitive's
             `w-3/4 sm:max-w-sm` at every width with important so the panel is truly full-bleed even
             at 640–767px; no rounded left edge since there is no visible left seam. */
          className="pt-plate font-poppins !w-full !max-w-none p-0 overflow-hidden"
        >
          <div className="flex h-full min-h-0 flex-col">
            {/* 1 — HEADER: logo + close */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-hairline dark:border-gray-800 shrink-0">
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
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-sunken hover:text-ink-1 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" aria-hidden />
              </SheetClose>
            </div>

            {/* 2 — SEARCH */}
            <form onSubmit={handleSidebarSearch} role="search" className="shrink-0 px-4 pt-4 pb-2">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-3" aria-hidden />
                <input
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  value={sidebarQuery}
                  onChange={(e) => setSidebarQuery(e.target.value)}
                  placeholder="Rechercher un produit..."
                  aria-label="Rechercher un produit"
                  className="w-full min-h-[44px] rounded-xl border border-hairline bg-sunken pl-9 pr-11 text-[14px] text-ink-1 placeholder:text-ink-3 transition-colors focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-focus/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-400 dark:focus:bg-gray-900"
                />
                {showSidebarSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarQuery('');
                      setSidebarResults([]);
                    }}
                    aria-label="Effacer la recherche"
                    className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-white hover:text-brand dark:hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label="Rechercher"
                    className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-white hover:text-brand dark:hover:bg-gray-700"
                  >
                    <Search className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </form>

            {/* SCROLLABLE MIDDLE — live search results while typing, otherwise the nav list. Both
                scroll above the pinned trust chips. */}
            <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {showSidebarSearch ? (
                <div className="px-4 pt-2 pb-4">
                  {sidebarSearching || sidebarSearchPending ? (
                    <div className="space-y-1" role="status" aria-label="Recherche en cours">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl p-2">
                          <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-3.5 w-2/3" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                        </div>
                      ))}
                      <span className="sr-only">Recherche en cours…</span>
                    </div>
                  ) : sidebarResults.length === 0 ? (
                    <div className="py-12 text-center">
                      <Search className="mx-auto h-8 w-8 text-ink-3 dark:text-gray-600" aria-hidden />
                      <p className="mt-3 text-[14px] font-semibold text-ink-1 dark:text-gray-100">
                        Aucun produit trouvé
                      </p>
                      <p className="mt-1 px-4 text-[13px] leading-snug text-ink-3 dark:text-gray-400">
                        Rien ne correspond à «&nbsp;{sidebarQuery.trim()}&nbsp;». Essayez d&apos;autres termes.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="px-1 pb-2 text-[12px] font-semibold uppercase tracking-wide text-brand">
                        {sidebarResults.length} résultat{sidebarResults.length > 1 ? 's' : ''}
                      </p>
                      <ul className="space-y-0.5">
                        {sidebarResults.map((product) => {
                          const pd = getPriceDisplay(product);
                          return (
                            <li key={product.id}>
                              <Link
                                href={buildProductUrlPath(product)}
                                onClick={closeMobileMenu}
                                className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-sunken dark:hover:bg-gray-800"
                              >
                                <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sunken dark:bg-gray-800">
                                  {product.cover ? (
                                    <Image
                                      src={getStorageUrl(product.cover)}
                                      alt=""
                                      fill
                                      className="object-contain"
                                      sizes="48px"
                                      unoptimized
                                    />
                                  ) : null}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[14px] font-medium text-ink-1 dark:text-gray-100">
                                    {product.designation_fr}
                                  </span>
                                  <span className="mt-0.5 block text-[13px]">
                                    {pd.hasPromo && pd.oldPrice != null ? (
                                      <>
                                        <span className="text-ink-3 line-through dark:text-gray-500">
                                          {pd.oldPrice.toFixed(2)} DT
                                        </span>
                                        <span className="ml-1.5 font-semibold text-brand">
                                          {pd.finalPrice.toFixed(2)} DT
                                        </span>
                                      </>
                                    ) : (
                                      <span className="font-semibold text-ink-1 dark:text-gray-200">
                                        {pd.finalPrice.toFixed(2)} DT
                                      </span>
                                    )}
                                  </span>
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                      <button
                        type="button"
                        onClick={() => {
                          const q = sidebarQuery.trim();
                          if (!q) return;
                          router.push(`/shop?search=${encodeURIComponent(q)}`);
                          closeMobileMenu();
                        }}
                        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover"
                      >
                        <span>Voir tous les résultats ({sidebarResults.length})</span>
                        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                      </button>
                    </>
                  )}
                </div>
              ) : (
              <>
              {/* 3 + 4 — NAVIGATION */}
              <div className="px-4 pt-2 pb-2">
                <h3 className="px-1 mb-2 text-[12px] font-semibold uppercase tracking-wide text-brand">
                  Navigation
                </h3>
                <nav className="space-y-1">
                  {sidebarLinks.map((link) => {
                    if (link.href === '/pack-builder') return null;

                    if (isProductsNavLink(link)) {
                      const shopActive = isActiveNav(link.href);
                      const hasCategories = sidebarCategories.length > 0;
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
                              // Collapsing the whole section also collapses whichever category was
                              // expanded, so reopening starts from a clean list.
                              if (productsOpen) setOpenCategoryId(null);
                              setProductsOpen((v) => !v);
                            }}
                            className={cn(
                              'flex w-full items-center gap-3 min-h-[48px] px-3 rounded-xl text-[15px] font-semibold transition-colors',
                              shopActive
                                ? 'bg-brand/10 text-brand'
                                : 'text-ink-1 hover:bg-sunken dark:text-gray-100 dark:hover:bg-gray-800'
                            )}
                          >
                            <NavigationIcon
                              name={link.icon}
                              className={cn('h-5 w-5 shrink-0', shopActive ? 'text-brand' : 'text-ink-3')}
                            />
                            <span className="flex-1 text-left">{translateLegacy(link.label)}</span>
                            {!hasCategories ? (
                              <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                            ) : productsOpen ? (
                              <ChevronUp className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
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
                                  {sidebarCategories.map((cat) => {
                                    const catHref = `/${cat.slug}`;
                                    const catActive = pathname === catHref;
                                    const subs = cat.sous_categories ?? [];
                                    const catOpen = openCategoryId === cat.id;

                                    // Leaf category (no sub-categories): a plain link, as before.
                                    if (subs.length === 0) {
                                      return (
                                        <li key={cat.id}>
                                          <Link
                                            href={catHref}
                                            onClick={closeMobileMenu}
                                            aria-current={catActive ? 'page' : undefined}
                                            className={cn(
                                              'flex items-center gap-2 min-h-[44px] pl-12 pr-3 rounded-xl text-[14px] transition-colors',
                                              catActive
                                                ? 'font-semibold text-brand'
                                                : 'text-ink-1 hover:bg-sunken dark:text-gray-300 dark:hover:bg-gray-800'
                                            )}
                                          >
                                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                                            <span className="min-w-0 flex-1 truncate">{cat.designation_fr}</span>
                                            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                                          </Link>
                                        </li>
                                      );
                                    }

                                    // Has sub-categories → the row EXPANDS a third level instead of
                                    // navigating (owner request: tapping PROTÉINES should reveal its
                                    // sub-categories, like the desktop mega-menu). A "Tout voir" entry
                                    // inside keeps the category page itself one tap away.
                                    return (
                                      <li key={cat.id}>
                                        <button
                                          type="button"
                                          aria-expanded={catOpen}
                                          onClick={() =>
                                            setOpenCategoryId((prev) => (prev === cat.id ? null : cat.id))
                                          }
                                          className={cn(
                                            'flex w-full items-center gap-2 min-h-[44px] pl-12 pr-3 rounded-xl text-left text-[14px] transition-colors',
                                            catActive || catOpen
                                              ? 'font-semibold text-brand'
                                              : 'text-ink-1 hover:bg-sunken dark:text-gray-300 dark:hover:bg-gray-800'
                                          )}
                                        >
                                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                                          <span className="min-w-0 flex-1 truncate">{cat.designation_fr}</span>
                                          {catOpen ? (
                                            <ChevronUp className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                                          ) : (
                                            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                                          )}
                                        </button>

                                        <div
                                          className={cn(
                                            'grid transition-[grid-template-rows] duration-300 ease-out',
                                            catOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                                          )}
                                        >
                                          <div className="overflow-hidden">
                                            <ul className="space-y-0.5 py-0.5">
                                              <li>
                                                <Link
                                                  href={catHref}
                                                  onClick={closeMobileMenu}
                                                  className="flex items-center gap-2 min-h-[40px] rounded-xl pl-[4.5rem] pr-3 text-[13px] font-semibold text-brand transition-colors hover:bg-sunken dark:hover:bg-gray-800"
                                                >
                                                  <span className="min-w-0 flex-1 truncate">Tout voir</span>
                                                  <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                                </Link>
                                              </li>
                                              {subs.map((sub) => {
                                                const subHref = `/${sub.slug}`;
                                                const subActive = pathname === subHref;
                                                return (
                                                  <li key={sub.id}>
                                                    <Link
                                                      href={subHref}
                                                      onClick={closeMobileMenu}
                                                      aria-current={subActive ? 'page' : undefined}
                                                      className={cn(
                                                        'flex items-center gap-2 min-h-[40px] rounded-xl pl-[4.5rem] pr-3 text-[13px] transition-colors',
                                                        subActive
                                                          ? 'font-semibold text-brand'
                                                          : 'text-ink-2 hover:bg-sunken dark:text-gray-400 dark:hover:bg-gray-800'
                                                      )}
                                                    >
                                                      <span
                                                        className="h-px w-2.5 shrink-0 bg-gray-300 dark:bg-gray-600"
                                                        aria-hidden
                                                      />
                                                      <span className="min-w-0 flex-1 truncate">
                                                        {sub.designation_fr}
                                                      </span>
                                                    </Link>
                                                  </li>
                                                );
                                              })}
                                            </ul>
                                          </div>
                                        </div>
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
                            ? 'bg-brand/10 text-brand'
                            : 'text-ink-1 hover:bg-sunken dark:text-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <NavigationIcon
                          name={link.icon}
                          className={cn('h-5 w-5 shrink-0', active ? 'text-brand' : 'text-ink-3')}
                        />
                        <span>{translateLegacy(link.label)}</span>
                      </NavigationLink>
                    );
                  })}
                </nav>
              </div>

              {/* 5 — divider */}
              <div className="mx-4 border-t border-hairline dark:border-gray-800" />

              {/* 6 — PACK CTA */}
              {packBuilderLink && (
                <div className="px-4 py-3">
                  <NavigationLink
                    item={packBuilderLink}
                    onClick={closeMobileMenu}
                    className="flex h-12 items-center justify-between rounded-xl bg-brand px-4 text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover"
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
              <div className="mx-4 border-t border-hairline dark:border-gray-800" />

              {/* 8 — UTILITY ITEMS */}
              <div className="px-4 py-3 space-y-1">
                {/*
                  WhatsApp had no entry here at all, and on a phone the ONLY way to reach it was the
                  floating bubble. That made the bubble undeletable on any route, however crowded —
                  and `/pack-builder` measured 30.2% of an iPhone screen under fixed chrome.
                  Giving the channel a home in the menu (owner: "put it maybe in the header or in
                  the sidebar") is what makes suppressing the bubble on a route a layout decision
                  rather than a loss of the dominant ordering channel for Tunisian COD shoppers.

                  The green comes from `WHATSAPP_GREEN` as an inline style, not from an arbitrary
                  Tailwind class. It is a third-party brand mark, so it must not flip with the theme
                  and has no business being a token; and at 3.06:1 on the light sheet it is legal as
                  an ICON beside ink-coloured label text, never as the text colour itself.

                  Written in tokens (`text-ink-1`, `hover:bg-sunken`) rather than copying the
                  `dark:text-gray-100 dark:hover:bg-gray-800` pairs off the rows around it. Those
                  are legacy and predate the theme-aware tokens; propagating them into a new row is
                  how a 2,000-instance migration never finishes.
                */}
                <a
                  href={buildWhatsAppHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileMenu}
                  aria-label={WHATSAPP_ARIA_LABEL}
                  className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-medium text-ink-1 transition-colors hover:bg-sunken"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 shrink-0"
                    style={{ color: WHATSAPP_GREEN }}
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={WHATSAPP_ICON_PATH} />
                  </svg>
                  <span className="flex-1 text-left">Commander sur WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => { setCartDrawerOpen(true); closeMobileMenu(); }}
                  className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-medium text-ink-1 transition-colors hover:bg-sunken dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  <ShoppingCart className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
                  <span className="flex-1 text-left">Panier</span>
                  {cartItemsCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                      {cartItemsCount > 99 ? '99+' : cartItemsCount}
                    </span>
                  )}
                </button>

                <Link
                  href="/favoris"
                  onClick={closeMobileMenu}
                  className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-medium text-ink-1 transition-colors hover:bg-sunken dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  <Heart
                    className={cn('h-5 w-5 shrink-0', favoritesCount > 0 ? 'fill-brand text-brand' : 'text-ink-3')}
                    aria-hidden
                  />
                  <span className="flex-1">Favoris</span>
                  {favoritesCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                      {favoritesCount > 99 ? '99+' : favoritesCount}
                    </span>
                  )}
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link
                      href="/account"
                      onClick={closeMobileMenu}
                      className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-medium text-ink-1 transition-colors hover:bg-sunken dark:text-gray-100 dark:hover:bg-gray-800"
                    >
                      <User className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
                      <span>Mon compte</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => { logout(); closeMobileMenu(); }}
                      className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[14px] font-medium text-ink-3 transition-colors hover:bg-sunken hover:text-ink-1 dark:hover:bg-gray-800 dark:hover:text-white"
                    >
                      <span className="pl-8">Déconnexion</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-medium text-ink-1 transition-colors hover:bg-sunken dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    <User className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
                    <span>Connexion</span>
                  </Link>
                )}
              </div>
              </>
              )}
            </div>

            {/* 9 — TRUST CHIPS (pinned to bottom, always visible) */}
            <div className="mt-auto shrink-0 border-t border-hairline dark:border-gray-800 px-4 pt-3 pb-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1 rounded-lg bg-sunken dark:bg-gray-800 px-2.5 py-2">
                  <Truck className="h-4 w-4 shrink-0 text-ok" aria-hidden />
                  <span className="text-[11px] leading-tight text-ink-1 dark:text-gray-200">
                    Livraison rapide
                    <br />
                    24–48h
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-sunken dark:bg-gray-800 px-2.5 py-2">
                  <Shield className="h-4 w-4 shrink-0 text-ink-1 dark:text-gray-200" aria-hidden />
                  <span className="text-[11px] leading-tight text-ink-1 dark:text-gray-200">
                    Paiement à
                    <br />
                    la livraison
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-lg bg-sunken dark:bg-gray-800 px-2.5 py-2">
                  <Lock className="h-4 w-4 shrink-0 text-ink-1 dark:text-gray-200" aria-hidden />
                  <span className="text-[11px] leading-tight text-ink-1 dark:text-gray-200">
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

    </>
  );
}
