import { Truck, ShieldCheck, CreditCard, Headphones } from 'lucide-react';

// Slim flat trust strip. Replaced the previous "premium SaaS" block (glassmorphism cards,
// gradient orbs, per-card spring physics and bespoke animated SVGs — all framer-motion) with a
// lean, athletic row: monoline red lucide icons + Oswald uppercase labels + thin dividers.
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex md:grid md:grid-cols-4 overflow-x-auto md:overflow-visible snap-x md:snap-none scrollbar-hide divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
          {features.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-shrink-0 w-[72%] sm:w-[46%] md:w-auto snap-start items-center gap-3 py-6 sm:py-7 px-1 sm:px-5 md:px-6"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
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
