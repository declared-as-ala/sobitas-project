import { TrendingUp, PackageCheck, LineChart, ShieldCheck } from 'lucide-react';

/**
 * The right-hand panel of the affiliate login — passed to <AuthShell artwork={…}> so the affiliate
 * gateway reads as a distinct, business-facing door, NOT the consumer "Programme fidélité / 5%
 * Protinas" panel the customer /login shows. Same light vocabulary as AuthLoyaltyPanel (kicker →
 * display heading → filled hairline card), but the value proposition is the partner's: margin,
 * the live catalogue, real-time commission tracking. Reinforces the separation the owner asked for
 * between the normal-customer login and the affiliate login.
 */
const FEATURES = [
  { Icon: TrendingUp, title: 'Votre marge, votre prix', desc: 'Vous fixez le prix de vente. La différence est pour vous.' },
  { Icon: PackageCheck, title: 'Tout le catalogue, en direct', desc: 'Photos, stock et prix à jour pour commander en deux minutes.' },
  { Icon: LineChart, title: 'Suivi en temps réel', desc: 'Commandes, commissions et paiements, toujours à jour.' },
];

export function AffiliatePartnerPanel() {
  return (
    <div className="flex h-full flex-col justify-center p-8 xl:p-12">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-brand" aria-hidden="true" />
        <span className="pt-kicker text-ink-2">Espace Partenaire</span>
      </div>

      <h2 className="mt-6 max-w-sm font-display text-4xl font-bold uppercase leading-tight tracking-tight text-ink-1">
        Vos ventes vous rémunèrent.
      </h2>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-2">
        Passez les commandes de vos clients, fixez vos prix, et suivez chaque commission — de la
        vente jusqu’au versement.
      </p>

      <div className="mt-8 space-y-3">
        {FEATURES.map(({ Icon, title, desc }) => (
          <div key={title} className="flex gap-3 rounded-xl border border-hairline bg-elevated p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-1">{title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
