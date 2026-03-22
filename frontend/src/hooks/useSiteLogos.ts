'use client';

import { SITE_LOGO_PUBLIC_PATH } from '@/constants/branding';

/**
 * Navbar + footer logo: static asset from `public/sobitas-logo.png` (same URL for both).
 */
export function useSiteLogos() {
  return {
    headerLogoUrl: SITE_LOGO_PUBLIC_PATH,
    footerLogoUrl: SITE_LOGO_PUBLIC_PATH,
    loaded: true,
  };
}
