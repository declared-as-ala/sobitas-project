import { Truck, ShieldCheck, CreditCard, Headphones } from 'lucide-react';

// Slim flat trust strip. Replaced the previous "premium SaaS" block (glassmorphism cards,
// gradient orbs, per-card spring physics and bespoke animated SVGs — all framer-motion) with a
// lean, athletic row: monoline red lucide icons + Archivo uppercase labels + thin dividers.
// Server component (no 'use client') — zero JS for this section.

const features = [
  { Icon: Truck, title: 'Livraison rapide', description: 'Gratuite dès 300 DT, partout en Tunisie' },
  { Icon: ShieldCheck, title: '100% authentique', description: 'Produits originaux, certifiés' },
  { Icon: CreditCard, title: 'Paiement à la livraison', description: 'Ou par carte bancaire' },
  { Icon: Headphones, title: 'Support 7j/7', description: 'Une équipe à votre écoute' },
] as const;

export function FeaturesSection() {
  return (
    <section
      className="bg-white dark:bg-gray-950 border-y border-gray-100 dark:border-gray-800"
      aria-labelledby="features-heading"
    >
      <h2 id="features-heading" className="sr-only">
        Pourquoi choisir Protéine Tunisie
      </h2>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* One per row on phones (full width → titles never wrap awkwardly), 2×2 on sm, single
            row on desktop — every feature always visible (no hidden scroll content). Hairline
            dividers come from the gap-px grid background. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-800">
          {features.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="flex items-center gap-3.5 bg-white dark:bg-gray-950 py-4 sm:py-6 md:py-7 px-4 sm:px-5 md:px-6"
            >
              <span className="flex h-11 w-11 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-display uppercase tracking-wide text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                  {title}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
