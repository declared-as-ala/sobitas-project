'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { gaEvent } from '@/lib/analytics/ga4';

/** Hosts util/whatsapp.ts links to (`https://wa.me/…`), plus WhatsApp's long-form API host. */
const WHATSAPP_HOSTS = new Set(['wa.me', 'api.whatsapp.com']);

function isWhatsAppHref(href: string): boolean {
  try {
    const url = new URL(href, window.location.href);
    return url.protocol === 'whatsapp:' || WHATSAPP_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/*
 * NO BEARER CREDENTIAL REACHES GA4. The confirmation e-mail links to
 * /order-confirmation/{id}?token={order_token}, and that token alone unlocks the order's name,
 * phone, e-mail and address (GET /api/commande/{id}?token=…); the review e-mail puts the same
 * token, or the review code, in the PATH (/avis/{code}). gtag.js sends the page URL with every hit
 * (`dl`), so the URL is redacted before the page_view and pinned with `gtag('set')` for every later
 * event on the page. Also: GA4 Admin → Data streams → Redact data → URL query parameters: `token`.
 *
 * THAT IS NOT ENOUGH ON ITS OWN — OWNER STEP REQUIRED. Stream G-0J0J27JZ7D has Enhanced measurement
 * → « Page changes based on browser history events » ON (live gtag config: enableHistoryEvents).
 * Every pushState/replaceState then fires GA4's OWN page_view whose `dl`/`dr` are the raw document
 * URLs: neither `send_page_view: false` nor the `gtag('set')` pin below changes them (measured
 * 05/10/2026 with every collect hit intercepted). So a client-side exit from /avis/{code} or
 * /order-confirmation/{id}?token=… sends the code/token as `dr`, and `Redact data` cannot help for
 * the /avis PATH. Fix in GA4: Admin → Data streams → protein.tn → Enhanced measurement (gear) →
 * Page views → Show advanced settings → untick « Page changes based on browser history events ».
 * This component already sends one cleaned page_view per route change, so unticking it also ends
 * the double count of every client-side navigation. Until then, links INTO /avis/{code} from the
 * shop are plain <a> (full load, no history event).
 */
const SENSITIVE_PARAMS = ['token', 'email', 'phone'];

function redactPath(pathname: string): string {
  return pathname.replace(/^\/avis\/[^/]+/, '/avis/[code]');
}

/** Same-origin URL without the sensitive query keys and with the /avis code replaced. */
function redactUrl(href: string): string {
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return href;
    for (const key of SENSITIVE_PARAMS) url.searchParams.delete(key);
    url.pathname = redactPath(url.pathname);
    return url.toString();
  } catch {
    return href;
  }
}

export function AnalyticsPageView() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const lastPagePath = useRef<string | null>(null);

  useEffect(() => {
    const pagePath = `${pathname}${search ? `?${search}` : ''}`;
    if (lastPagePath.current === pagePath) return;
    lastPagePath.current = pagePath;

    const location = redactUrl(window.location.href);
    let redactedPath = redactPath(pathname);
    try {
      const url = new URL(location);
      redactedPath = `${url.pathname}${url.search}`;
    } catch {
      /* keep the path without its query */
    }
    const pinned: Record<string, string> = { page_location: location };
    if (document.referrer) {
      const referrer = redactUrl(document.referrer);
      if (referrer !== document.referrer) pinned.page_referrer = referrer;
    }

    window.gtag?.('set', pinned);
    window.gtag?.('event', 'page_view', {
      page_location: location,
      page_path: redactedPath,
      page_title: document.title,
    });
  }, [pathname, search]);

  /*
   * A WhatsApp tap is the shop's most common lead: a COD shopper asking before ordering. One
   * capture-phase listener on the document sees every WhatsApp link (header, floating button,
   * contact page, product page) without each surface wiring its own event. `beacon` so the hit
   * survives the tab handing off to WhatsApp.
   */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || !isWhatsAppHref(anchor.href)) return;
      gaEvent('generate_lead', {
        method: 'whatsapp',
        lead_source: redactPath(window.location.pathname),
        transport_type: 'beacon',
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
