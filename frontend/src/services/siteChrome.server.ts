import type { Category, Coordinate, SiteNavigationItem } from '@/types';
import { getCmsPages, getCoordinates, type CmsPage } from '@/services/api';

/**
 * Server-side fetchers for the site "chrome" (header navigation + categories mega-menu),
 * rendered by the ROOT LAYOUT so the navbar is correct in the SSR HTML.
 *
 * Why this exists: HeaderClient/ProductsDropdown/MobileProductsMenu used to fetch
 * /navigation-items and /categories in useEffect on EVERY page load. First paint showed the
 * hardcoded fallback nav ("NOS PRODUITS"), which then swapped to the backend nav ("BOUTIQUE")
 * once the fetch resolved — a visible flash on every visit — and cost 3 client API calls per
 * page view. Fetching here instead uses native fetch + the Next Data Cache (shared across ALL
 * routes), so the backend is hit at most once per revalidate window, and the real nav is in
 * the server HTML from the first byte.
 *
 * URL choice: at runtime the Next server runs on the VPS next to the backend, so prefer the
 * internal Docker URL (API_BACKEND_URL, e.g. http://backend-nginx-v2/api) — no Cloudflare hop.
 * During `next build` on CI that env is unset and the public URL 403s (Cloudflare blocks the
 * runner IP); we catch and return empty, and the client components keep their fetch-on-mount
 * as a fallback for exactly that case. Fetch failures are NOT cached, so the first runtime
 * request self-heals the cache.
 *
 * The payloads are slimmed to the fields the header actually renders so the serialized props
 * embedded in every page's RSC payload stay small.
 */

const SERVER_API_BASE = (
  process.env.API_BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://admin.protein.tn/api'
).replace(/\/$/, '');

export type SiteNavigation = {
  navbar: SiteNavigationItem[];
  sidebar: SiteNavigationItem[];
};

export const EMPTY_NAVIGATION: SiteNavigation = { navbar: [], sidebar: [] };

const slimNavItem = (item: SiteNavigationItem): SiteNavigationItem => ({
  id: item.id,
  location: item.location,
  label: item.label,
  url: item.url,
  icon: item.icon ?? null,
  is_visible: item.is_visible,
  sort_order: item.sort_order,
  opens_new_tab: item.opens_new_tab,
});

export async function getServerNavigation(): Promise<SiteNavigation> {
  try {
    const res = await fetch(`${SERVER_API_BASE}/navigation-items`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600, tags: ['navigation'] },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      navbar: Array.isArray(data?.navbar) ? data.navbar.map(slimNavItem) : [],
      sidebar: Array.isArray(data?.sidebar) ? data.sidebar.map(slimNavItem) : [],
    };
  } catch (e) {
    // Empty → HeaderClient falls back to its client fetch (and hardcoded links) as before.
    console.error('[siteChrome] navigation fetch failed (header falls back to client fetch):', e);
    return EMPTY_NAVIGATION;
  }
}

export type ServerFooterData = {
  cmsPages: CmsPage[];
  coordinates: Coordinate | null;
};

export const EMPTY_FOOTER: ServerFooterData = { cmsPages: [], coordinates: null };

/**
 * Footer chrome: the "Services & Ventes" CMS links + the store address/phone/map. Fetched in the
 * root layout so they are in the SSR HTML (crawlable internal links, no post-hydration pop-in) and
 * not re-fetched on every client navigation. Reuses the existing getCmsPages/getCoordinates (which
 * carry their own fallbacks) and hard-catches so a failure can never throw the whole layout render.
 */
export async function getServerFooter(): Promise<ServerFooterData> {
  const [cmsPages, coordinates] = await Promise.all([
    getCmsPages().catch((e) => {
      console.error('[siteChrome] CMS pages fetch failed (footer falls back to client fetch):', e);
      return [] as CmsPage[];
    }),
    getCoordinates().catch((e) => {
      console.error('[siteChrome] coordinates fetch failed (footer falls back to client fetch):', e);
      return null;
    }),
  ]);
  return { cmsPages, coordinates };
}

/**
 * Homepage hero slides, admin-managed via Filament (Paramètres du site → Slides).
 *
 * Server-fetched for the same reason as the nav: the first slide is the mobile LCP element and
 * must be in the SSR HTML with a matching <link rel="preload">, which is impossible from a
 * client fetch. The backend already filters is_active and sorts by ordre, so this trusts the
 * order it receives.
 *
 * A failure (or an empty list) returns [] and the hero falls back to its built-in static image —
 * see buildHeroImageSet. That keeps the CI-build case safe too, where the public API 403s.
 */
export type ServerSlide = {
  id: number | string;
  cover: string | null;
  cover_mobile: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  link: string | null;
  alt: string | null;
};

export async function getServerSlides(): Promise<ServerSlide[]> {
  try {
    const res = await fetch(`${SERVER_API_BASE}/slides`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300, tags: ['slides'] },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

    return list
      .filter((s) => s && (s.cover || s.image))
      .map((s) => ({
        id: s.id,
        // `cover`/`image` and `link`/`lien` are both accepted: the API maps the legacy column
        // names, but this keeps working if either side is deployed first.
        cover: s.cover ?? s.image ?? null,
        cover_mobile: s.cover_mobile ?? s.image_mobile ?? null,
        title: s.title ?? s.titre ?? null,
        subtitle: s.subtitle ?? s.sous_titre ?? null,
        cta_label: s.cta_label ?? null,
        link: s.link ?? s.lien ?? null,
        alt: s.alt ?? null,
      }));
  } catch (e) {
    console.error('[siteChrome] slides fetch failed (hero falls back to its static image):', e);
    return [];
  }
}

export async function getServerNavCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${SERVER_API_BASE}/categories`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600, tags: ['categories'] },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const list: Category[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    // Slim to what the mega-menu renders: category + subcategory names/slugs.
    return list.map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      designation_fr: cat.designation_fr,
      sous_categories: (cat.sous_categories ?? []).map((sub) => ({
        id: sub.id,
        slug: sub.slug,
        designation_fr: sub.designation_fr,
      })),
    }));
  } catch (e) {
    console.error('[siteChrome] categories fetch failed (menus fall back to client fetch):', e);
    return [];
  }
}
