'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, Download, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_banner_dismissed_until';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 1024 || /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function wasDismissedRecently() {
  try {
    const until = localStorage.getItem(DISMISS_KEY);
    if (!until) return false;
    return Date.now() < parseInt(until, 10);
  } catch {
    return false;
  }
}

function saveDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
  } catch {
    // ignore
  }
}

export function InstallAppBanner() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed — never show.
    if (isInStandaloneMode()) {
      setInstalled(true);
      return;
    }

    // Not mobile — hide.
    if (!isMobileDevice()) return;

    // Dismissed recently — hide.
    if (wasDismissedRecently()) return;

    const deviceIsIOS = isIOS();
    setIos(deviceIsIOS);

    if (deviceIsIOS) {
      // iOS Safari never fires beforeinstallprompt — show banner after delay.
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }

    // Android/Chrome: wait for beforeinstallprompt.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install.
    const installedHandler = () => {
      setInstalled(true);
      setVisible(false);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (ios) {
      setShowIOSModal(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [ios, deferredPrompt]);

  const dismiss = useCallback(() => {
    saveDismissal();
    setVisible(false);
    setShowIOSModal(false);
  }, []);

  if (installed || !visible) return null;

  return (
    <>
      {/* ── Bottom Install Banner ── */}
      <div
        role="dialog"
        aria-label="Installer l'application"
        className={[
          'fixed bottom-0 left-0 right-0 z-[999]',
          'flex items-center gap-3 px-4 py-3',
          'bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700',
          'shadow-[0_-4px_24px_rgba(0,0,0,0.12)]',
          'transition-transform duration-500 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
          // Only show on mobile — hide on desktop via CSS just in case JS detection was off
          'md:hidden',
        ].join(' ')}
      >
        {/* App icon */}
        <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
          <Image
            src="/favicon-192x192.png"
            alt="Protein.tn"
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight">
            Installer l&apos;application
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5 truncate">
            Accès rapide depuis votre écran d&apos;accueil
          </p>
        </div>

        {/* Install CTA */}
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 shrink-0 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors"
          aria-label="Installer"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          Installer
        </button>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="shrink-0 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── iOS instruction modal (bottom sheet) ── */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-[1000] flex flex-col justify-end md:hidden"
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Sheet */}
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl px-5 pt-5 pb-8 shadow-2xl animate-slide-up">
            {/* Handle */}
            <div className="mx-auto w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                  <Image src="/favicon-192x192.png" alt="Protein.tn" fill className="object-cover" unoptimized />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Protein.tn</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">protein.tn</p>
                </div>
              </div>
              <button onClick={dismiss} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Ajouter à l&apos;écran d&apos;accueil
            </p>

            {/* Steps */}
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800">
                  <Share className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Appuyez sur <span className="font-bold">Partager</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Bouton <Share className="inline h-3.5 w-3.5 align-middle mx-0.5" /> en bas de Safari
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 pl-4">
                <div className="w-0.5 h-5 bg-gray-200 dark:bg-gray-700 ml-3.5" />
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800">
                  <Plus className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Appuyez sur <span className="font-bold">« Sur l&apos;écran d&apos;accueil »</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Faites défiler la liste d&apos;options vers le bas
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2 pl-4">
                <div className="w-0.5 h-5 bg-gray-200 dark:bg-gray-700 ml-3.5" />
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800">
                  <span className="text-sm">✓</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Appuyez sur <span className="font-bold">Ajouter</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    L&apos;app apparaîtra sur votre écran d&apos;accueil
                  </p>
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={dismiss}
              className="mt-6 w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Compris !
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1) both;
        }
      `}</style>
    </>
  );
}
