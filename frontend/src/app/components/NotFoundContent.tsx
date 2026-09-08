import Link from 'next/link';
import { Home, ShoppingBag } from 'lucide-react';

/**
 * The 404 body, without chrome.
 *
 * Shared by app/not-found.tsx (which lives OUTSIDE every route group and therefore has to add
 * Header/Footer itself) and app/(shop)/not-found.tsx (which inherits them from the group layout).
 * Keeping the content in one place means the two 404s can never drift apart.
 *
 * ── WHY THIS FILE IS NOW ON TOKENS ───────────────────────────────────────────────────────────
 * `audit-contrast` at 1440 and 390, dark theme: `#6B7280 on #0A0A0B`, 4.09:1 — under AA — on the
 * one sentence that tells a lost visitor what happened. The cause was `dark:text-gray-500`, which
 * is the LIGHT-mode value repeated: a manual dark pair whose two halves are identical does not
 * adapt, it just looks like it was considered. `text-ink-3` is 5.4:1 here in both themes.
 *
 * The rest of the file went with it rather than around it. It was carrying 24 baselined
 * violations — `red-*` (the legacy alias for `brand`), `gray-*` ink and borders, and six manual
 * `dark:` pairs — and every one of them is a value the tokens already hold. Nothing moved: same
 * geometry, same type scale, same two CTAs. The only visible change is the one the audit asked
 * for, plus a focus ring on two links that previously had none of their own.
 */
export function NotFoundContent() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
      <span className="inline-flex items-center gap-2 mb-3 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-brand">
        <span className="h-px w-5 bg-brand" aria-hidden="true" />
        Erreur 404
      </span>
      <h1 className="font-display uppercase tracking-tight leading-[0.95] font-bold text-6xl sm:text-8xl text-ink-1">
        404
      </h1>
      <p className="mt-4 text-lg text-ink-2">Page introuvable</p>
      <p className="mt-2 text-sm text-ink-3">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-display uppercase tracking-wide font-semibold text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          <Home className="h-4 w-4" />
          Accueil
        </Link>
        <Link
          href="/shop"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rule px-5 py-2.5 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          <ShoppingBag className="h-4 w-4" />
          Boutique
        </Link>
      </div>
    </main>
  );
}
