'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, Download, Share, Plus, Check, MoreVertical } from 'lucide-react';
import { isChromeFreeRoute } from '@/app/components/MobileTabBar';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_banner_dismissed_until';
const DISMISS_DAYS = 7;

function getIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  // Check screen width OR touch capability OR mobile UA
  return (
    window.innerWidth < 1024 ||
    'ontouchstart' in window ||
    /android|iphone|ipad|ipod|mobile|tablet/i.test(navigator.userAgent)
  );
}

function dismissedUntil(): number {
  try {
    return parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
  } catch { return 0; }
}

function saveDismiss() {
  try {
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + DISMISS_DAYS * 86400 * 1000)
    );
  } catch { /* ignore */ }
}

export function InstallAppBanner() {
  const [ready, setReady] = useState(false);           // mounted + checks passed
  const [show, setShow] = useState(false);             // animate in
  const [ios, setIos] = useState(false);
  const [iosModal, setIosModal] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Run only on client
    if (isStandalone()) return;           // already installed
    if (!isMobile()) return;             // desktop — skip
    if (Date.now() < dismissedUntil()) return;  // dismissed recently

    const deviceIsIOS = getIOS();
    setIos(deviceIsIOS);

    // Capture Android/Chrome install prompt when available
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // Hide after successful install
    const onInstalled = () => { setShow(false); setReady(false); };
    window.addEventListener('appinstalled', onInstalled);

    // Show banner after 2 s regardless — don't wait for beforeinstallprompt
    setReady(true);
    const t = setTimeout(() => {
      /*
       * ── NEVER OVER A PAGE'S OWN BOTTOM CTA ──────────────────────────────────────────────
       * This banner is `fixed bottom-tabbar … z-sticky-cta`, and so is the product page's buy
       * bar. Measured on live production at 390px: the banner sat at 707-788 and the CTA at
       * 711-788 — identical band, identical z-index — so "Installer l'application" was painted
       * over "Ajouter au panier" on every product page, on the 81% of traffic that is mobile.
       *
       * An install is worth something. It is not worth a sale, and it is certainly not worth
       * being the thing that hides the button the visitor came to press. A page that owns the
       * bottom of the viewport says so with `data-has-sticky-cta` on <body>; this reads it at the
       * moment it would appear, which is 2s after mount and therefore long after any page-level
       * effect has run.
       *
       * Checked here rather than on mount on purpose: it is a question about the CURRENT route,
       * and this component lives in the root layout and survives navigation.
       */
      if (document.body.hasAttribute('data-has-sticky-cta')) return;
      /*
        Nor over a route that deliberately has no bottom chrome. Measured at 390px on /register:
        the banner landed on top of the "Créer mon compte" button — the one control the page
        exists for. The same list already governs the tab bar, and for the same reason.
      */
      if (isChromeFreeRoute(window.location.pathname)) return;
      setShow(true);
    }, 2000);

    return () => {
      clearTimeout(t);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (ios) { setIosModal(true); return; }

    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') { setShow(false); setReady(false); }
      setPrompt(null);
      return;
    }

    // Android but no prompt yet (Chrome waiting for engagement) → show manual help
    setIosModal(true);
  }, [ios, prompt]);

  const dismiss = useCallback(() => {
    saveDismiss();
    setShow(false);
    setIosModal(false);
    setTimeout(() => setReady(false), 400);
  }, []);

  // Flag the banner's presence on <body> so the WhatsApp FAB can lift above it
  // (and drop back once dismissed) — no cross-component state coupling needed.
  useEffect(() => {
    if (show) document.body.setAttribute('data-install-banner', '');
    else document.body.removeAttribute('data-install-banner');
    return () => document.body.removeAttribute('data-install-banner');
  }, [show]);

  if (!ready) return null;

  return (
    <>
      {/* ─── Fixed bottom banner ─── */}
      <div
        role="dialog"
        aria-labelledby="install-app-title"
        aria-describedby="install-app-description"
        style={{
          transform: show ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.45s cubic-bezier(0.32,0.72,0,1)',
          // Float above both the tab bar and its raised Boutique tile instead of making the
          // install prompt itself taller. This keeps the prompt compact and the two surfaces
          // visually separate at every safe-area inset.
          bottom: 'calc(var(--tabbar-h) + var(--tabbar-raise) + 0.5rem)',
        }}
        // The prompt is intentionally a small utility card, not a second navigation bar. A
        // max-width prevents it stretching into a banner on landscape phones and small tablets.
        className="fixed inset-x-3 z-sticky-cta mx-auto flex max-w-sm items-center gap-2 rounded-xl border border-hairline bg-elevated p-2 shadow-card md:hidden"
      >
        {/* App icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken">
          <Image
            src="/favicon-192x192.png"
            alt=""
            width={30}
            height={30}
            className="rounded-full"
          />
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0 leading-tight">
          <p id="install-app-title" className="truncate text-xs font-semibold text-ink-1">
            Installer Protein.tn
          </p>
          <p id="install-app-description" className="truncate text-[11px] leading-snug text-ink-3">
            Boutique en un clic
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleInstall}
          aria-label="Installer Protein.tn"
          className="flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-0 text-xs font-semibold text-on-brand transition-colors hover:bg-brand-hover min-[360px]:w-auto min-[360px]:px-3"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="hidden min-[360px]:inline">Installer</span>
        </button>

        {/* The glyph stays visually quiet while its control keeps the 44px touch-target floor. */}
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ─── iOS / manual instructions bottom-sheet ─── */}
      {iosModal && (
        <div
          className="fixed inset-0 z-[10000] flex flex-col justify-end md:hidden"
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={dismiss} />

          <div className="relative mx-auto w-full max-w-md rounded-t-xl bg-elevated px-4 pb-safe-or-8 pt-3 shadow-card animate-slide-up">
            {/* Handle */}
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-rule" />

            {/* Title row */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken">
                  <Image src="/favicon-192x192.png" alt="" width={28} height={28} className="rounded-full" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-1">Installer Protein.tn</p>
                  <p className="truncate text-xs text-ink-3">Accès direct à la boutique</p>
                </div>
              </div>
              <button onClick={dismiss} aria-label="Fermer" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-sm font-semibold text-ink-1">
              {ios ? 'Ajouter à l\'écran d\'accueil' : 'Installer depuis le navigateur'}
            </p>

            {/* Steps */}
            <div className="space-y-3">
              {ios ? (
                <>
                  <Step icon={<Share className="h-4 w-4" />}>
                    <span>Appuyez sur <strong>Partager</strong> <Share className="inline h-3.5 w-3.5 mx-0.5 align-middle" /> en bas de Safari</span>
                  </Step>
                  <Step icon={<Plus className="h-4 w-4" />}>
                    <span>Choisissez <strong>« Sur l&apos;écran d&apos;accueil »</strong></span>
                  </Step>
                  <Step icon={<Check className="h-4 w-4" />}>
                    <span>Appuyez sur <strong>Ajouter</strong> — c&apos;est fait !</span>
                  </Step>
                </>
              ) : (
                <>
                  <Step icon={<MoreVertical className="h-4 w-4" />}>
                    <span>Ouvrez le menu du navigateur <MoreVertical className="inline h-3.5 w-3.5 mx-0.5 align-middle" /> en haut à droite</span>
                  </Step>
                  <Step icon={<Plus className="h-4 w-4" />}>
                    <span>Appuyez sur <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong></span>
                  </Step>
                  <Step icon={<Check className="h-4 w-4" />}>
                    <span>Appuyez sur <strong>Ajouter</strong> pour confirmer</span>
                  </Step>
                </>
              )}
            </div>

            <button
              onClick={dismiss}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-hairline bg-sunken text-sm font-semibold text-ink-1 transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.35s cubic-bezier(0.32,0.72,0,1) both; }
      `}</style>
    </>
  );
}

function Step({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </div>
      <p className="pt-1 text-sm leading-snug text-ink-2">{children}</p>
    </div>
  );
}
