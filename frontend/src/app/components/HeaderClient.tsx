'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
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
  Gift,
  Shield,
  Lock,
  X,
  BadgeCheck,
} from 'lucide-react';
import { SearchBar } from './SearchBar';
import { Button } from '@/app/components/ui/button';
import { useTheme } from 'next-themes';
import { ProductsDropdown } from './ProductsDropdown';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
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
import { cn } from '@/app/components/ui/utils';
import { getNavigationItems, getCategories } from '@/services/api';
import { useSiteChrome } from '@/contexts/SiteChromeContext';
import { useSiteLogos } from '@/hooks/useSiteLogos';
import type { SiteNavigationItem } from '@/types';
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

/*
  NAV_ICON_MAP and its <NavigationIcon> wrapper are DELETED, not left for later.

  They existed to draw a 20px glyph beside every mobile nav row, keyed off a free-text `icon`
  column in the navigation table. Anything the admin typed that was not one of these twelve keys
  rendered NOTHING — the component returned null — so the column was ragged by construction, and
  the rows that did resolve mostly resolved to the same two or three generic marks. The redesigned
  drawer (owner, 18/08/2026) is uppercase type with no icons, which is what the reference does and
  what a list of destinations wants; with the last call site gone, keeping a dead icon registry
  around is how the next person re-adds the column by accident.
*/

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
    /*
     * ── prefetch={false}: 800 KB OFF EVERY PAGE ON THE SITE ────────────────────────────────
     * MEASURED on /shop (production build, cold cache): 4,392 KB transferred, of which 1,556 KB
     * was `fetch` — and it was not the shop's data. It was Next prefetching the RSC payload of
     * every nav link that happened to be in the viewport, which on this header is all of them:
     *
     *     /?_rsc=…              187 KB   (twice — the logo and ACCUEIL are two links to /)
     *     /brands?_rsc=…        132 KB
     *     /pack-builder?_rsc=…  108 KB
     *     /qui-sommes-nous      87 KB
     *     …
     *
     * Next 15's default (`prefetch` unset) prefetches the FULL flight data for a STATIC route, and
     * `/`, `/brands` and `/qui-sommes-nous` are all statically rendered — so the header downloads
     * four other pages before the visitor has looked at this one. On a Tunisian 3G connection that
     * is several seconds of contention against the page's own images.
     *
     * ── AND THE SENTENCE THAT USED TO FOLLOW THAT ONE WAS WRONG ────────────────────────────
     * It read: *"`false` disables the VIEWPORT prefetch only. Next still prefetches on hover and
     * on touchstart, so a deliberate move toward a link is as fast as it was."* That is true of
     * the PAGES router and false here. From next/dist/client/app-dir/link.js:
     *
     *     const prefetchEnabled = prefetchProp !== false;
     *     onMouseEnter:  if (!prefetchEnabled || NODE_ENV === 'development') return;
     *     onTouchStart:  if (!prefetchEnabled) return;
     *
     * One flag, all three strategies. So every item in this header — and every row of the mobile
     * drawer, which renders through the same component — has had NO prefetch of ANY kind since the
     * day that prop was added. Not viewport, not hover, not touch. The saving above was real and
     * the cost was invisible.
     *
     * `LinkWithLoading` is the component that already resolves this correctly, and it has been
     * sitting one directory over: it keeps `prefetch={false}` (so the viewport prefetch stays off,
     * which is the whole point of the measurement above) and adds `router.prefetch()` on a 90ms
     * hover, on pointerdown and on touchstart — a gesture toward a link, which IS evidence of
     * intent, unlike being on screen. It also puts the loading bar up in the same frame as the
     * click, so a nav item now answers the tap instead of sitting there.
     *
     * External hrefs are handled above and never reach this branch.
     */
    <LinkWithLoading href={item.href} className={className} onClick={onClick} {...targetProps} {...currentProps}>
      {content}
    </LinkWithLoading>
  );
}

/**
 * Badge subscriptions live in leaf controls. Keeping either count in HeaderClient makes one heart
 * or cart tap reconcile the entire header, including both navigation systems and the search.
 */
function DesktopFavoritesAction() {
  const count = useFavoritesCount();

  return (
    <Link
      href="/favoris"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-1 transition-[background-color,transform] duration-200 hover:bg-ink-1/[0.04] active:scale-95 dark:text-gray-100 dark:hover:bg-white/5"
      aria-label={count > 0 ? `Favoris - ${count} produits` : 'Favoris'}
    >
      <Heart className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-on-brand ring-2 ring-canvas">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function DesktopCartAction({ onOpen }: { onOpen: () => void }) {
  const count = useCartCount();

  return (
    <button
      type="button"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-1 transition-[background-color,transform] duration-200 hover:bg-ink-1/[0.04] active:scale-95 dark:text-gray-100 dark:hover:bg-white/5"
      onClick={onOpen}
      aria-label={count > 0 ? `Panier - ${count} articles` : 'Panier'}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-on-brand ring-2 ring-canvas">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

function MobileCartMenuAction({ onOpen }: { onOpen: () => void }) {
  const count = useCartCount();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink-1 transition-colors hover:bg-sunken dark:text-gray-100 dark:hover:bg-gray-800"
    >
      <ShoppingCart className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
      <span className="flex-1 text-left">Panier</span>
      {count > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-brand">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

function MobileFavoritesMenuAction({ onNavigate }: { onNavigate: () => void }) {
  const count = useFavoritesCount();

  return (
    <Link
      href="/favoris"
      onClick={onNavigate}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink-1 transition-colors hover:bg-sunken dark:text-gray-100 dark:hover:bg-gray-800"
    >
      <Heart
        className={cn('h-5 w-5 shrink-0', count > 0 ? 'fill-brand text-brand' : 'text-ink-3')}
        aria-hidden
      />
      <span className="flex-1">Favoris</span>
      {count > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-brand">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

export function HeaderClient() {
  const { translateLegacy } = useI18n();
  const { headerLogoUrl } = useSiteLogos();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  /*
    ── THE SIDEBAR NO LONGER SEARCHES (owner, 18/08/2026) ────────────────────────────────────
    *"in the sidebar take off the search, since we have the search icon in the header"*.

    It was a second, complete search implementation — its own query state, its own debounce, its
    own `searchProducts` call, its own results list, its own skeletons, its own empty state and its
    own "voir tous les résultats" button — sitting 40px below a header that already has a search
    control. Two pipelines for one feature is two places to fix every bug, and the sidebar's copy
    had already drifted (it used raw `.toFixed(2)` rather than the shop's `formatCurrency`).

    Deleted here rather than hidden: ~120 lines of JSX and five pieces of state.
  */
  /** Second level of the sidebar accordion: which category has its sub-categories open (one at a
   *  time, so the list never becomes an unreadable wall on a phone). */
  const [openCategoryId, setOpenCategoryId] = useState<number | null>(null);
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

  // Mutators are stable. Badge subscriptions live in the four small action components above, so
  // changing a count no longer rerenders this full header.
  const { setCartDrawerOpen } = useCartActions();
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
    // Reset the drawer to its resting state so the next open starts from the nav rather than
    // from a half-expanded accordion.
    setOpenCategoryId(null);
  };

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
        className="pt-site-header bg-canvas font-poppins sticky top-0 z-50 w-full border-b border-rule"
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
            {/*
              ── ONE ROW OF ICONS, AND A SHORTER BAR ────────────────────────────────────────
              Owner, 17/08/2026: *"for the header why Compte and Panier have names under them,
              take them off — make them like a row once like the impact so we can make the height
              of header more little"*.

              Two of the five controls in this cluster were `flex-col` — icon over an 11px French
              label — and three were plain 40px icon squares. So the row was a mix of two shapes
              and its height was set by the taller one. The labels also said the least: a cart
              glyph and a person glyph are the two most universally understood icons in commerce,
              and both already carry an `aria-label` for the readers who need words.

              All five are the same 40px square now, and the bar comes down 72 -> 64px resting and
              58 -> 52 compact. With the nav row that is the whole header at 148 -> 132px resting,
              on every page of the site.
            */}
            <div className="pt-hdr-bar pt-hdr-bar-desktop flex h-16 items-center gap-6">
              <LinkWithLoading href="/" className="flex-shrink-0 transition-opacity duration-200 hover:opacity-80" aria-label="Proteine Tunisie - Accueil">
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
              </LinkWithLoading>

              {/* Search grows to fill the WHOLE middle (flex-1) so the icon cluster is pushed flush
                  to the right edge. Without this wrapper the search capped at max-w-2xl and the
                  leftover space fell after the icons (default justify-start), stranding them mid-row.
                  The field itself stays capped at max-w-2xl and left-aligned inside the wrapper. */}
              <div className="flex flex-1 min-w-0 justify-start">
                <SearchBar variant="desktop" className="w-full" />
              </div>

              <div className="flex flex-shrink-0 items-center gap-0.5">
                {MULTILOCALE_ENABLED && <LanguageSwitcher />}

                {/* Compte — icon + french label. Keeps the auth dropdown when signed in. */}
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-1 transition-[background-color,transform] duration-200 hover:bg-ink-1/[0.04] active:scale-95 dark:text-gray-100 dark:hover:bg-white/5"
                        aria-label="Mon compte"
                      >
                        <User className="h-5 w-5" aria-hidden />
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
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-1 transition-[background-color,transform] duration-200 hover:bg-ink-1/[0.04] active:scale-95 dark:text-gray-100 dark:hover:bg-white/5"
                    aria-label="Connexion"
                  >
                    <User className="h-5 w-5" aria-hidden />
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

                <DesktopFavoritesAction />
                <DesktopCartAction onOpen={() => setCartDrawerOpen(true)} />
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
                        'group relative inline-flex items-center h-full text-[13.5px] font-semibold tracking-[0.02em] whitespace-nowrap transition-colors duration-200 after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-brand after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100',
                        active
                          ? 'text-brand after:scale-x-100'
                          : 'text-ink-1 dark:text-gray-200 hover:text-brand'
                      )}
                    >
                      {/*
                        ── NO ICON ────────────────────────────────────────────────────────
                        Owner, 17/08/2026, with the reference storefront's header beside ours:
                        *"polish it and fix it and make the design of it good and more
                        minimalistic but same functionality, like the design of the header of
                        impact"*.

                        Six glyphs sat in this row — a house, a box, a shop, a book, an envelope
                        and an info circle — one per nav item. None of them was doing any work:
                        the labels beside them already read ACCUEIL, BOUTIQUE, PACKS, MARQUES,
                        BLOG, CONTACT, and no reader has ever needed a house to understand the
                        word "accueil". What they DID do was add roughly 22px per item, which is
                        why the row was crowded enough to need a horizontal scroller on a small
                        laptop. The reference has none, and that is most of why its chrome reads
                        as calmer than ours did.

                        `NavigationIcon` stays — the mobile menu and the products dropdown both
                        use it, and there an icon in a vertical list IS a scanning aid.
                      */}
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

                  There is still exactly one WhatsApp affordance per breakpoint: the dark contact
                  strip above on desktop, and the WhatsApp row in the mobile menu on phones.

                  UPDATED 10/08/2026: the floating bubble that used to cover phones (WhatsAppFab) is
                  gone entirely — owner: "take off the popup button of whatsapp from mobile, keep it
                  only in the sidebar". The mobile-menu row further down this file is now the only
                  phone affordance, which is why it must not be removed without replacing it. */}

              {/* Accès Pro lives HERE now, beside the pack CTA — not on /pack-builder.
                  Owner: "the Accès Pro button should be beside the composez votre pack in the
                  header… the page of generating a pack is only for generating a pack."

                  They are right, and the reason is structural rather than cosmetic: a B2B signup
                  link is a NAVIGATION item — it belongs wherever you are on the site, not stapled
                  to one page's heading where it competed with that page's own first action.
                  Outlined against the filled pack CTA, so the nav row still has exactly one button
                  that sells and this one reads as a door rather than a shout. */}
              {/*
                A LINK, not an outlined box. It was a bordered pill 12px from the filled orange
                pack CTA — two button SHAPES side by side, which makes the reader weigh them
                against each other before reading either. Stripping the outline leaves exactly one
                object in this row that looks pressable, and the one that looks pressable is the
                one that sells. The 44px target is kept by padding rather than by a border.
              */}
              <Link
                href="/partenaires"
                className="shrink-0 inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap px-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:text-brand"
              >
                <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
                <span>Accès Pro</span>
              </Link>

              {/*
                ── THE BUTTON STOPS FILLING ITS ROW ───────────────────────────────────────────
                Owner, 18/08/2026: *"the header, make some inner padding — don't make the buttons
                stick to borders! or make buttons smaller"*.

                Both halves of that describe the same object. MEASURED at 1536: this pill was 36px
                tall inside a 48px nav row, so it cleared the row's own rules by 6px top and
                bottom, and its right edge sat exactly ON the page rail. Correct alignment — every
                band on this site ends at that rail — but a saturated orange rectangle pressed
                into all three edges of its row reads as jammed in rather than placed.

                The rail cannot move: `max-w-site` + `px-4 lg:px-8` is shared with the header bar
                above, the footer and every band between them, and a header that insets further
                than the page would step visibly at both edges. So the mass comes down instead,
                which is the owner's own alternative. 36 -> 32px tall, 14 -> 13px label, and the
                icon follows: 8px of air above and below now, and the pill reads as sitting in the
                row rather than filling it.
              */}
              {packBuilderLink && (
                <NavigationLink
                  item={packBuilderLink}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-on-brand shadow-[0_2px_8px_rgba(255,90,0,0.25)] transition-all duration-200 hover:bg-brand-hover hover:shadow-[0_4px_12px_rgba(255,90,0,0.35)] active:scale-[0.98] whitespace-nowrap"
                >
                  <Gift className="h-3.5 w-3.5" aria-hidden />
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

            {/*
              ── 2 — WHO YOU ARE, THEN THE ONE THING TO DO ─────────────────────────────────
              Owner, 18/08/2026, with a screenshot of Impact's drawer: *"in the top have login,
              signup, and instead of 'install app' we put composer the pack generator"*.

              That reference opens with identity and one coloured CTA, and it is the right shape
              for a phone: the two questions a returning shopper has at the top of a menu are "am I
              signed in" and "where do I start", and both are answered above the fold instead of
              after eleven nav rows. Ours answered the first one at the BOTTOM of a scroll, under
              WhatsApp and Favoris.

              `S'inscrire` is the filled half and `Connexion` the outline: this shop's account
              conversion problem is registration, not sign-in. Signed in, the pair becomes the
              account link and a sign-out, so the row never disappears and never lies.
            */}
            {/* THE SCROLLER — everything below the logo bar scrolls, including the account
                buttons and the pack CTA. */}
            <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* NOT `shrink-0` any more, and no longer a sibling of the scroller — it is the
                first thing INSIDE it (owner, 18/08/2026: *"the buttons at the top, don't make them
                stick; make them relative — when I scroll they don't keep on the top"*).

                Pinned, they held ~120px of a 660px drawer permanently, and on a phone in landscape
                that was a third of it. They are the first thing you see when the drawer opens,
                which is what matters; once you are eleven rows down the nav you are not looking
                for a sign-in button. */}
            <div className="px-4 pt-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/account"
                    onClick={closeMobileMenu}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-ink-1 font-display text-[14px] font-bold uppercase tracking-[0.02em] text-ink-1 transition-colors hover:border-brand hover:text-brand"
                  >
                    <User className="h-4 w-4 shrink-0" aria-hidden />
                    Mon compte
                  </Link>
                  <button
                    type="button"
                    onClick={() => { logout(); closeMobileMenu(); }}
                    className="flex h-12 shrink-0 items-center justify-center rounded-xl px-4 text-[13px] font-medium text-ink-3 transition-colors hover:bg-sunken hover:text-ink-1"
                  >
                    Déconnexion
                  </button>
                </div>
              ) : (
                /* The reference's pair, in this site's voice: 48px, the display face in caps,
                   and the outline half drawn in `border-ink-1` rather than the hairline — at
                   `border-rule` on white the button read as a disabled field rather than as the
                   equal-weight alternative it is. The two now carry the same visual weight and
                   differ only in fill, which is the whole point of an outline/filled pair. */
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="flex h-12 items-center justify-center rounded-xl border-2 border-ink-1 font-display text-[14px] font-bold uppercase tracking-[0.02em] text-ink-1 transition-colors hover:border-brand hover:text-brand"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobileMenu}
                    className="flex h-12 items-center justify-center rounded-xl bg-brand font-display text-[14px] font-bold uppercase tracking-[0.02em] text-on-brand transition-colors hover:bg-brand-hover"
                  >
                    S&apos;inscrire
                  </Link>
                </div>
              )}

              {/* The reference's "Installer l'application" slot. This shop has no app; what it has
                  is the pack builder, which is the highest-intent path on the site and was
                  previously buried between two dividers halfway down the scroll. */}
              {packBuilderLink && (
                <NavigationLink
                  item={packBuilderLink}
                  onClick={closeMobileMenu}
                  className="mt-2 flex h-12 items-center justify-between rounded-xl bg-brand px-4 text-[15px] font-semibold text-on-brand transition-colors hover:bg-brand-hover"
                >
                  <span className="flex items-center gap-2">
                    <Gift className="h-5 w-5 shrink-0" aria-hidden />
                    <span>{translateLegacy(packBuilderLink.label)}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
                </NavigationLink>
              )}
            </div>

              {/* 3 + 4 — NAVIGATION */}
              {/* No "NAVIGATION" kicker. It labelled the only list on the screen, in the one
                  colour this drawer should spend on its CTA — the reference has no such label and
                  does not need one. */}
              <div className="px-4 pb-2 pt-3">
                <nav className="space-y-0.5">
                  {sidebarLinks.map((link) => {
                    if (link.href === '/pack-builder') return null;

                    if (isProductsNavLink(link)) {
                      const shopActive = isActiveNav(link.href);
                      const hasCategories = sidebarCategories.length > 0;
                      return (
                        <div key={`${link.href}-${link.label}`}>
                          {/*
                            ── TAPPING BOUTIQUE GOES TO THE BOUTIQUE (owner, 20/08/2026) ──────
                            *"still when i click on boutique it's not instantly browsing to /shop
                            — fix it in the entire website."*

                            THIS ROW WAS THE BUG, and it was not slowness. It was a `<button>`, and
                            its only behaviour when categories had loaded — which is always, one
                            tick after the drawer opens — was `setProductsOpen(v => !v)`. Tapping
                            BOUTIQUE did not navigate to /shop. It could not: no branch of that
                            handler pushed a route unless `sidebarCategories` was EMPTY, i.e. only
                            when the API had failed. The one path the owner takes was the fallback
                            path for a broken fetch.

                            So the row now does what its label says, and the accordion moves to its
                            own control beside it. That is the same split the desktop mega-menu
                            already makes, for the same stated reason (see ProductsDropdown): the
                            link goes to /shop, the chevron opens the rayons, and merging them
                            forces a choice between navigating and browsing that neither a mouse
                            nor a keyboard should have to make.

                            `LinkWithLoading`, not `<Link>`: it warms /shop on `touchstart` — ~80ms
                            before the tap even completes — and it is what puts the loading state on
                            screen in the same frame as the tap. The chevron carries the label in
                            its `aria-label` so a screen reader can tell the two apart.
                          */}
                          <div
                            className={cn(
                              'flex items-stretch rounded-lg transition-colors',
                              shopActive ? 'text-brand' : 'text-ink-1 hover:bg-sunken dark:text-gray-100 dark:hover:bg-gray-800'
                            )}
                          >
                            <LinkWithLoading
                              href={link.href}
                              onClick={closeMobileMenu}
                              loadingMessage="Chargement de la boutique..."
                              aria-current={shopActive ? 'page' : undefined}
                              /* ── THE REFERENCE'S ROW (owner, 18/08/2026) ──────────────────
                                 Impact's drawer is a column of uppercase display type with a chevron
                                 where a row expands and nothing where it does not — no icons, no
                                 tinted active pill, no rounded hover plate. It reads as a list of
                                 destinations rather than as a toolbar, which is what a menu is.

                                 Ours had a 20px icon on every row, and the icons came from a
                                 free-text `icon` column in the DB: half of them fell back to the same
                                 generic glyph, so the column was six identical marks pretending to be
                                 information. The active row keeps its brand colour and loses its
                                 `bg-brand/10` plate — colour is enough on a list this short. */
                              className="flex min-h-[52px] flex-1 items-center px-3 font-display text-[15px] font-bold uppercase tracking-[0.02em]"
                            >
                              {translateLegacy(link.label)}
                            </LinkWithLoading>
                            {hasCategories ? (
                              <button
                                type="button"
                                aria-expanded={productsOpen}
                                aria-label={
                                  productsOpen
                                    ? 'Masquer les rayons'
                                    : `Afficher les rayons de ${translateLegacy(link.label)}`
                                }
                                onClick={() => {
                                  // Collapsing the whole section also collapses whichever category
                                  // was expanded, so reopening starts from a clean list.
                                  if (productsOpen) setOpenCategoryId(null);
                                  setProductsOpen((v) => !v);
                                }}
                                className="flex min-h-[52px] w-12 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                              >
                                {productsOpen ? (
                                  <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
                                ) : (
                                  <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                                )}
                              </button>
                            ) : (
                              <span className="flex min-h-[52px] w-12 shrink-0 items-center justify-center" aria-hidden>
                                <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                              </span>
                            )}
                          </div>

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
                          'flex items-center gap-3 min-h-[52px] rounded-lg px-3 font-display text-[15px] font-bold uppercase tracking-[0.02em] transition-colors',
                          active
                            ? 'text-brand'
                            : 'text-ink-1 hover:bg-sunken dark:text-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <span>{translateLegacy(link.label)}</span>
                      </NavigationLink>
                    );
                  })}
                </nav>
              </div>

              {/* divider — the pack CTA that used to sit between two of these now leads the
                  drawer, above the nav. One rule, not two around an empty slot. */}
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

                {/* The mobile half of the same move. Owner: "even in the sidebar of the mobile,
                    don't forget that." Without this the B2B programme would be desktop-only the
                    moment it left the pack-builder page — and coaches run their gym from a phone. */}
                <Link
                  href="/partenaires"
                  onClick={closeMobileMenu}
                  className="flex w-full items-center gap-3 min-h-[44px] px-3 rounded-xl text-[15px] font-medium text-ink-1 transition-colors hover:bg-sunken"
                >
                  <BadgeCheck className="h-5 w-5 shrink-0 text-brand" aria-hidden />
                  <span className="flex-1 text-left">
                    Accès Pro
                    <span className="block text-[12px] font-normal text-ink-3">Coachs &amp; salles de sport</span>
                  </span>
                </Link>

                <MobileCartMenuAction
                  onOpen={() => {
                    setCartDrawerOpen(true);
                    closeMobileMenu();
                  }}
                />

                <MobileFavoritesMenuAction onNavigate={closeMobileMenu} />

                {/* Connexion / Mon compte / Déconnexion used to live here, at the BOTTOM of a
                    scroll, under WhatsApp and Favoris. They are the first thing in the drawer now
                    — see the account row above — and repeating them here would be the same two
                    links twice in one panel. */}
              </div>
            </div>

            {/*
              ── 9 — THE TRUST STRIP, AT A THIRD OF THE HEIGHT (owner, 18/08/2026) ───────────
              *"the footer tags of the livraison etc are taking a lot of height, while that's our
              power on mobile — polish it"*.

              Both halves of that are right, which is why this shrinks rather than disappears. For
              a Tunisian cash-on-delivery shopper, "paiement à la livraison" IS the objection
              handler — it belongs in the drawer. But it was three filled cards, each with a 16px
              icon above two wrapped lines of 11px text, pinned to the bottom: ~92px of a 660px
              panel, permanently, to say three things nobody needs to read twice.

              One row, one line each, icon beside text instead of above it, no fills and no card
              radii — the three facts read as a footnote, which is what they are once the shopper
              is inside the menu. 92 -> ~34px, and the nav above it gets those 58px back.

              `<br>` gone too: the text wrapped by hand at a width that no longer exists.
            */}
            <div className="mt-auto shrink-0 border-t border-hairline px-4 py-2.5">
              <div className="flex items-center justify-between gap-2 text-[11px] leading-none text-ink-2">
                <span className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden />
                  Livraison 24–48h
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                  Paiement livraison
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                  100% sécurisé
                </span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </>
  );
}
