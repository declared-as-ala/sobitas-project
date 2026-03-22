'use client';

import { useState, useEffect } from 'react';
import { getCoordinatesCached, getStorageUrl } from '@/services/api';
import { DEFAULT_LOGO_STORAGE_PATH } from '@/constants/branding';

function defaultHeaderUrl(): string {
  return getStorageUrl(DEFAULT_LOGO_STORAGE_PATH);
}

/**
 * Loads navbar + footer logos from GET /coordonnees (`logo`, `logo_footer`).
 * Falls back to {@link DEFAULT_LOGO_STORAGE_PATH} if the API omits them or errors.
 */
export function useSiteLogos() {
  const [headerLogoUrl, setHeaderLogoUrl] = useState(defaultHeaderUrl);
  const [footerLogoUrl, setFooterLogoUrl] = useState(defaultHeaderUrl);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getCoordinatesCached()
      .then((c) => {
        if (cancelled) return;
        const headerPath = c?.logo && String(c.logo).trim() ? String(c.logo).trim() : DEFAULT_LOGO_STORAGE_PATH;
        const footerPath =
          c?.logo_footer && String(c.logo_footer).trim()
            ? String(c.logo_footer).trim()
            : headerPath;

        setHeaderLogoUrl(getStorageUrl(headerPath));
        setFooterLogoUrl(getStorageUrl(footerPath));
      })
      .catch(() => {
        /* keep initial defaults */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { headerLogoUrl, footerLogoUrl, loaded };
}
