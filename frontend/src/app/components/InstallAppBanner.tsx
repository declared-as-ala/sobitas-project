'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, Download, Share, Plus } from 'lucide-react';

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
    const t = setTimeout(() => setShow(true), 2000);

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

  if (!ready) return null;

  return (
    <>
      {/* ─── Fixed bottom banner ─── */}
      <div
        role="dialog"
        aria-label="Installer l'application"
        style={{
          transform: show ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.45s cubic-bezier(0.32,0.72,0,1)',
        }}
        className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-6px_32px_rgba(0,0,0,0.15)] md:hidden"
      >
        {/* App icon */}
        <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow">
          <Image src="/favicon-192x192.png" alt="Protein.tn" fill className="object-cover" unoptimized />
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-[13px] font-bold text-gray-900 dark:text-white">
            Installer l&apos;application
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            Accès rapide · protein.tn
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleInstall}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-[12px] font-bold text-white active:bg-red-800 hover:bg-red-700 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Installer
        </button>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 transition-colors"
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl px-5 pt-4 pb-safe-or-8 shadow-2xl animate-slide-up pb-8">
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />

            {/* Title row */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <Image src="/favicon-192x192.png" alt="Protein.tn" fill className="object-cover" unoptimized />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Protein.tn</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">protein.tn</p>
                </div>
              </div>
              <button onClick={dismiss} aria-label="Fermer" className="rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-[15px] font-bold text-gray-900 dark:text-white">
              {ios ? 'Ajouter à l\'écran d\'accueil' : 'Installer depuis le navigateur'}
            </p>

            {/* Steps */}
            <div className="space-y-3">
              {ios ? (
                <>
                  <Step icon={<Share className="h-4 w-4 text-red-600 dark:text-red-400" />} bg="bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800">
                    <span>Appuyez sur <strong>Partager</strong> <Share className="inline h-3.5 w-3.5 mx-0.5 align-middle" /> en bas de Safari</span>
                  </Step>
                  <Step icon={<Plus className="h-4 w-4 text-red-600 dark:text-red-400" />} bg="bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800">
                    <span>Choisissez <strong>« Sur l&apos;écran d&apos;accueil »</strong></span>
                  </Step>
                  <Step icon={<span className="text-sm">✓</span>} bg="bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800">
                    <span>Appuyez sur <strong>Ajouter</strong> — c&apos;est fait !</span>
                  </Step>
                </>
              ) : (
                <>
                  <Step icon={<span className="text-base">⋮</span>} bg="bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800">
                    <span>Ouvrez le menu du navigateur <strong>(⋮)</strong> en haut à droite</span>
                  </Step>
                  <Step icon={<Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />} bg="bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800">
                    <span>Appuyez sur <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong></span>
                  </Step>
                  <Step icon={<span className="text-sm">✓</span>} bg="bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800">
                    <span>Appuyez sur <strong>Ajouter</strong> pour confirmer</span>
                  </Step>
                </>
              )}
            </div>

            <button
              onClick={dismiss}
              className="mt-6 w-full rounded-xl bg-gray-100 dark:bg-gray-800 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
        .animate-slide-up { animation: slide-up 0.35s cubic-bezier(0.32,0.72,0,1) both; }
      `}</style>
    </>
  );
}

function Step({
  icon,
  bg,
  children,
}: {
  icon: React.ReactNode;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${bg}`}>
        {icon}
      </div>
      <p className="pt-1 text-sm text-gray-800 dark:text-gray-100 leading-snug">{children}</p>
    </div>
  );
}
