'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';

/**
 * ── SIGN IN WITH GOOGLE ─────────────────────────────────────────────────────────────────────
 * Owner, 20/08/2026: *"add login via google in backend and frontend and make it easy to
 * integrate it."*
 *
 * ── WHY GOOGLE IDENTITY SERVICES AND NOT AN OAUTH REDIRECT ──────────────────────────────────
 * The obvious build is Laravel Socialite: /auth/google/redirect -> Google -> /auth/google/callback
 * -> mint a token -> bounce back to the SPA with it in the URL. It is more moving parts than this
 * site can carry:
 *
 *   - a composer dependency and a second set of routes on the API host;
 *   - the token arrives back as a QUERY STRING, which lands in server logs, in the Referer header
 *     of the next request, and in the browser history;
 *   - the redirect leaves protein.tn and comes back, so an in-progress cart or a `?redirect=`
 *     destination has to be smuggled through Google's `state` parameter.
 *
 * GIS keeps everything on our own origin. Google hands the browser a signed ID TOKEN (a JWT), we
 * POST it to /api/auth/google, and the server verifies the signature with Google before trusting
 * a single field of it. No redirect, no callback route, no dependency.
 *
 * ── WHAT MAKES IT "EASY TO INTEGRATE" ───────────────────────────────────────────────────────
 * One environment variable on each side and nothing else:
 *
 *   frontend/.env.local     NEXT_PUBLIC_GOOGLE_CLIENT_ID=…apps.googleusercontent.com
 *   filament/.env           GOOGLE_CLIENT_ID=…apps.googleusercontent.com   (the SAME value)
 *
 * With the variable absent this component renders NOTHING — no dead button, no console error, no
 * layout hole. So the code can ship before the Google Cloud project exists, which is the whole
 * point of "easy to integrate": the integration step is pasting one string, not a deploy.
 *
 * In the Google Cloud console the OAuth client needs `https://protein.tn` (and
 * `http://localhost:3000` for development) under **Authorised JavaScript origins**. It does NOT
 * need a redirect URI — this flow never redirects.
 *
 * ── THE BUTTON IS GOOGLE'S, DELIBERATELY ────────────────────────────────────────────────────
 * `renderButton` draws Google's own control. A hand-built button with our own type and radius
 * would match the card better and would breach Google's branding terms, which govern the mark,
 * the wording and the proportions. The two theme variants below are the closest the API gets to
 * our surfaces: `outline` on the white card, `filled_black` in dark mode.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

type CredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

/** Load the GIS script once per page, however many buttons ask for it. */
function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('GIS load failed')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GIS load failed'));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({
  onCredential,
  disabled = false,
}: {
  /** Receives Google's ID token. Exchange it for a session at /api/auth/google. */
  onCredential: (credential: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const { resolvedTheme } = useTheme();

  /* The callback is handed to Google once, at initialize(), and Google keeps that reference for
     the life of the page. A ref keeps the latest handler reachable without re-initialising GIS
     every time the parent re-renders — re-initialising mid-flow cancels a prompt in progress. */
  const handler = useRef(onCredential);
  handler.current = onCredential;

  const onCredentialResponse = useCallback((response: CredentialResponse) => {
    if (response?.credential) void handler.current(response.credential);
  }, []);

  useEffect(() => {
    if (!CLIENT_ID || !holder.current) return;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !holder.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: onCredentialResponse,
          /* One Tap is deliberately NOT enabled. It is a floating card that covers the top-right
             of the viewport, which on a phone is exactly where this form's own fields are. The
             button is an invitation; One Tap is an interruption. */
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: true,
        });

        holder.current.replaceChildren();
        window.google.accounts.id.renderButton(holder.current, {
          type: 'standard',
          theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          locale: 'fr',
          /* Google caps this at 400 and rejects a percentage. The card's content box is 376px at
             its widest (27rem card, 32px of padding either side at `sm`), and the button is
             centred by its holder below that width. */
          width: Math.min(400, Math.round(holder.current.getBoundingClientRect().width) || 376),
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [onCredentialResponse, resolvedTheme]);

  // No client id configured, or Google is unreachable (it is blocked in a few networks): render
  // nothing at all rather than a button that cannot work. The password form below is complete on
  // its own, so there is nothing for a fallback to say.
  if (!CLIENT_ID || failed) return null;

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : undefined}>
      <div ref={holder} className="flex items-center justify-center" />
      {/* The placeholder occupies the button's own height, so the card does not jump when
          Google's script lands on a slow connection. */}
      {!ready && (
        <div className="flex h-10 items-center justify-center gap-2 text-sm text-ink-3">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Chargement…
        </div>
      )}
    </div>
  );
}
