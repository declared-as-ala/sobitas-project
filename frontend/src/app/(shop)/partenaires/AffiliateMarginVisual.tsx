import { BadgeCheck, PackageCheck, Wallet } from 'lucide-react';

const SELLING_PRICE = 330;
const AFFILIATE_PRICE = 285;
const GAIN = SELLING_PRICE - AFFILIATE_PRICE;

export function AffiliateMarginVisual() {
  return (
    <figure className="rounded-2xl border border-hairline bg-elevated p-5 sm:p-6">
      <p className="pt-kicker text-brand">Comment vous gagnez</p>
      <p className="mt-2 font-sans text-sm text-ink-2">Sur une vente à 330.000 DT</p>

      <div
        role="img"
        aria-label="Exemple : sur une vente à 330.000 DT, la boutique reçoit 285.000 DT et vous gardez 45.000 DT."
        className="mt-5 flex h-3 overflow-hidden rounded-full"
      >
        <span className="h-full bg-rule" style={{ width: `${(AFFILIATE_PRICE / SELLING_PRICE) * 100}%` }} />
        <span className="h-full bg-brand" style={{ width: `${(GAIN / SELLING_PRICE) * 100}%` }} />
      </div>

      <dl className="mt-5 grid grid-cols-[1fr_1fr_1.25fr] items-end gap-2 font-sans tabular-nums">
        <div className="min-w-0 text-ink-2">
          <dt className="text-xs leading-snug">La boutique reçoit</dt>
          <dd className="mt-2 text-sm font-semibold">285.000 <span className="block text-xs font-normal">DT</span></dd>
        </div>
        <div className="min-w-0 text-ink-2">
          <dt className="text-xs leading-snug">Votre prix</dt>
          <dd className="mt-2 text-sm font-semibold">330.000 <span className="block text-xs font-normal">DT</span></dd>
        </div>
        <div className="min-w-0 text-brand">
          <dt className="text-xs font-semibold leading-snug">Votre gain</dt>
          <dd className="mt-2 font-display text-2xl font-extrabold leading-none tracking-tight">
            +45.000 <span className="mt-1 block text-sm">DT</span>
          </dd>
        </div>
      </dl>

      <figcaption className="mt-4 text-xs leading-relaxed text-ink-3">
        Exemple. Vous fixez votre prix de vente ; vous gardez tout ce qui dépasse le prix affilié.
      </figcaption>

      <ul className="mt-5 flex flex-wrap gap-2 text-xs text-ink-2">
        <li className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-elevated px-2 py-1.5">
          <Wallet className="h-4 w-4 shrink-0" aria-hidden />
          Payé chaque vendredi
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-elevated px-2 py-1.5">
          <PackageCheck className="h-4 w-4 shrink-0" aria-hidden />
          Aucun stock
        </li>
        <li className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-elevated px-2 py-1.5">
          <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden />
          Aucune avance
        </li>
      </ul>
    </figure>
  );
}
