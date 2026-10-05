'use client';

import { useId, useState } from 'react';
import { CircleAlert, Gift } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { cn } from '@/app/components/ui/utils';
import { formatProtinaDate, formatProtinas, pointsToDt, type LoyaltyRules } from '@/util/loyaltyPoints';
import { formatTnd } from '@/util/productPrice';
import { checkoutSummaryView, formatDt, giftLabel, isPricingV3, moneyPlaces, toMillimes, type CheckoutPricing } from '@/util/checkoutPricing';
import { ProtinaMark } from './Protina';

interface LoyaltyPointsRedeemerProps {
  /** The last server quote. Every maximum and every amount below comes from it. */
  pricing: CheckoutPricing;
  rules: LoyaltyRules;
  /** Protinas v3: EARNED Protinas requested (the gift applies on its own). Rollback rules: every Protina. */
  value: number;
  onChange: (points: number) => void;
  /** false = « Garder pour plus tard »: the quote and the order are sent with use_gift=false. */
  useGift: boolean;
  onUseGiftChange: (useGift: boolean) => void;
  /**
   * Replaces the default `border-t border-rule pt-5` seam.
   *
   * That seam is correct in the desktop summary column, where this sits directly under the
   * coupon row and needs a rule to separate the two. It is wrong in the mobile form column,
   * where it is already inside its own card and the rule would draw a second boundary 1px
   * from the card's own border — the double-separator `check:seams` exists to catch.
   */
  className?: string;
}

/**
 * ── « PAYER AVEC MES PROTINAS » — PROTINAS V3 ───────────────────────────────────────────────
 * Two wallets, one block:
 *   gift    applied on its own, as much as this basket allows (the server's hidden budget). One
 *           line and one link: « Garder pour plus tard ».
 *   earned  the customer's own money. Three chips — « Payer la livraison », « Tout utiliser »,
 *           « Choisir un montant » — and a slider in steps of 1 DT whose LAST step is the exact
 *           maximum, so « Tout utiliser » can take the total to 0.000 instead of leaving 0.03 DT
 *           to collect at the door.
 *
 * Nothing here computes a limit. `max_earned_points` and `max_gift_points` are the server's; the
 * only arithmetic is the DT value of the number under the thumb and what will be left.
 *
 * At most ONE contextual hint, then the single rule sentence the customer sees at checkout. More
 * than that and the block becomes the terms and conditions, which nobody reads at a till.
 */
export function LoyaltyPointsRedeemer({ pricing, rules, value, onChange, useGift, onUseGiftChange, className }: LoyaltyPointsRedeemerProps) {
  /* Was a hardcoded literal id. This renders TWICE on checkout now — the
     desktop summary aside is `hidden lg:block`, which keeps it in the DOM at every width, so a
     literal id would have put two of them on the page and `aria-labelledby` would resolve to
     whichever came first. `useId` is stable across SSR and hydration; a counter is not. */
  const titleId = useId();
  const sliderId = useId();
  const [open, setOpen] = useState(false);

  const v3 = isPricingV3(pricing);
  const ppd = Math.max(1, rules.points_per_dt);
  const step = ppd; // 1 DT
  const p = pricing.protinas;
  const view = checkoutSummaryView(pricing, ppd);
  const blocked = v3 ? p.blocked_reason ?? null : null;
  const earnedMax = Math.max(0, Math.floor(v3 ? p.max_earned_points ?? 0 : p.max_usable_points));
  const safeValue = Math.max(0, Math.min(Math.floor(value), earnedMax));

  const giftBalance = v3 ? Math.max(0, p.gift_balance ?? 0) : 0;
  const giftUsed = useGift ? Math.max(0, p.used_gift_points ?? 0) : 0;
  const giftLeft = Math.max(0, p.gift_left_points ?? giftBalance - giftUsed);
  const giftShown = giftBalance > 0 && blocked === null;
  const giftName = giftLabel(pricing, rules);
  const giftExpires = formatProtinaDate(p.gift_expires_at);

  // « Disponibles » is what this order may use: nothing while the account is blocked (the header
  // then reads « Solde »), and no gift while the gift is frozen or blocked for this delivery phone.
  const nothingUsable = blocked === 'unverified' || blocked === 'debt';
  const available = !v3
    ? Math.max(0, p.balance)
    : nothingUsable
      ? Math.max(0, p.balance)
      : Math.max(0, (p.earned_spendable ?? 0) + (blocked === null ? giftBalance : 0));
  const pending = v3 ? Math.max(0, p.earned_pending ?? 0) : 0;
  const pendingDate = formatProtinaDate(p.pending_available_at, true);

  // What the earned Protinas may still pay once the gift is on: the server's last step is exact,
  // so the DT shown under the thumb is capped there too (801 Protinas on 40.030 DT = 40.030 DT).
  // Without a trusted phone (rule 17) the server's rest is its capped payable minus the gift, not the
  // amount due: 1 000 Protinas there pay 49.999 DT, never « −50.000 » beside « au plus 49.999 DT ».
  const minCashMm = toMillimes(rules.earned?.min_cash_dt);
  const limitedRestMm = v3 && p.limited_reason && typeof p.limited_max_dt === 'number'
    ? Math.max(0, toMillimes(p.limited_max_dt) - toMillimes(p.used_gift_dt))
    : Number.POSITIVE_INFINITY;
  const restMm = v3
    ? Math.min(Math.max(0, toMillimes(pricing.total_dt) + toMillimes(p.used_earned_dt) - minCashMm), limitedRestMm)
    : Number.POSITIVE_INFINITY;
  // The amount the quote priced is the server's own figure; only other positions are estimated.
  const earnedValueDt = (points: number) => v3 && points > 0 && points === p.used_earned_points && typeof p.used_earned_dt === 'number'
    ? p.used_earned_dt
    : Math.min(points * 1000 / ppd, restMm) / 1000;

  const coverShipping = v3 && rules.earned?.cover_shipping !== false;
  const payDelivery = view.deliveryPoints;
  const showDeliveryChip = coverShipping && !view.freeShipping && payDelivery > 0
    && payDelivery < earnedMax && safeValue < payDelivery;

  const positions = Math.ceil(earnedMax / step);
  const position = Math.min(positions, Math.round(safeValue / step));
  const fromPosition = (index: number) => Math.min(Math.max(0, index) * step, earnedMax);
  const remaining = Math.max(0, p.balance - giftUsed - safeValue);
  const usedDt = earnedValueDt(safeValue);

  const set = (points: number) => onChange(Math.max(0, Math.min(Math.floor(points), earnedMax)));

  const hint = pickHint({ pricing, rules, blocked, giftBalance, giftUsed, giftLeft, useGift, minCashMm });
  const forfeit = rules.refusal?.forfeit_points ?? 400;
  const chip = (pressed: boolean) => cn(
    'inline-flex min-h-11 items-center rounded-lg border bg-elevated px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
    pressed ? 'border-brand text-brand' : 'border-hairline text-ink-1 hover:border-brand/40 hover:text-brand',
  );

  return (
    <section className={cn('border-t border-rule pt-5', className)} aria-labelledby={titleId} data-protinas-redeemer="">
      <div className="overflow-hidden rounded-xl border border-brand/20 bg-elevated">
        <div className="flex items-center gap-3 border-b border-brand/15 bg-brand/5 p-4">
          <ProtinaMark size="md" decorative={false} />
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1">
              Payer avec mes Protinas
            </h3>
            <p className="mt-1 text-sm leading-snug text-ink-2">
              {nothingUsable ? 'Solde' : 'Disponibles'} : <span className="font-bold tabular-nums text-ink-1">{formatProtinas(available)}</span>
              {' '}= <span className="whitespace-nowrap tabular-nums">{formatDt(pointsToDt(available, ppd))}</span>
              {pending > 0 && (
                <span className="text-ink-3"> · {pending.toLocaleString('fr-FR')} en attente{pendingDate ? `, disponibles le ${pendingDate}` : ''}</span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {giftShown && (
            /* The link sits UNDER the amount, not beside it: at 390 a side-by-side link squeezed
               « Cadeau de bienvenue appliqué : −11.30 DT » into four lines. */
            <div className="flex items-start gap-3 rounded-lg border border-hairline bg-sunken p-3" data-protinas-gift={useGift ? 'applied' : 'kept'}>
              <Gift className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm leading-snug">
                {useGift ? (
                  giftUsed > 0 ? (
                    <p className="text-ink-1">
                      {giftName} appliqué : <span className="whitespace-nowrap font-semibold tabular-nums text-ok">−{formatDt(p.used_gift_dt ?? 0, view.places)}</span>
                    </p>
                  ) : (
                    <p className="text-ink-1">{giftName} : {formatProtinas(giftBalance)}</p>
                  )
                ) : (
                  <p className="text-ink-1">{giftName} gardé pour plus tard : {formatProtinas(giftBalance)}</p>
                )}
                {giftExpires && <p className="mt-0.5 text-xs text-ink-3">À utiliser avant le {giftExpires}.</p>}
                {(giftUsed > 0 || !useGift) && (
                  <button
                    type="button"
                    onClick={() => onUseGiftChange(!useGift)}
                    className="-mb-2 inline-flex min-h-11 items-center rounded-lg text-xs font-semibold text-brand underline underline-offset-4 hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {useGift ? 'Garder pour plus tard' : 'Utiliser mon cadeau'}
                  </button>
                )}
              </div>
            </div>
          )}

          {earnedMax > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Protinas gagnées à utiliser">
                {showDeliveryChip && (
                  <button type="button" onClick={() => set(payDelivery)} className={chip(false)}>
                    Payer la livraison · {formatProtinas(payDelivery)}
                  </button>
                )}
                <button
                  type="button"
                  aria-pressed={safeValue === earnedMax}
                  onClick={() => set(safeValue === earnedMax ? 0 : earnedMax)}
                  className={chip(safeValue === earnedMax)}
                >
                  {/* Rollback rules cap the Protinas below the balance: « Tout utiliser » would read as 1 540. */}
                  {v3 ? 'Tout utiliser' : 'Utiliser le maximum'} · {formatProtinas(earnedMax)}
                </button>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={sliderId}
                  onClick={() => setOpen(o => !o)}
                  className={chip(open)}
                >
                  Choisir un montant
                </button>
              </div>

              {(open || safeValue > 0) && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-ink-2" aria-live="polite">
                    Protinas utilisées : <span className="font-bold tabular-nums text-ink-1">{safeValue.toLocaleString('fr-FR')}</span>
                    {' '}= <span className="whitespace-nowrap font-semibold tabular-nums text-ok">−{formatDt(usedDt, view.places)}</span>
                  </p>
                  {safeValue > 0 && (
                    <button
                      type="button"
                      onClick={() => set(0)}
                      className="-my-2 inline-flex min-h-11 shrink-0 items-center rounded-lg px-1 text-xs font-semibold text-ink-2 underline underline-offset-4 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      Retirer
                    </button>
                  )}
                </div>
              )}

              {open && (
                <div id={sliderId}>
                  <input
                    type="range"
                    min={0}
                    max={positions}
                    step={1}
                    value={position}
                    onChange={(event) => set(fromPosition(Number(event.target.value)))}
                    className="h-11 w-full cursor-pointer accent-brand"
                    aria-label="Protinas gagnées à utiliser"
                    aria-valuetext={`${safeValue} Protinas, soit ${formatDt(usedDt, view.places)} de remise`}
                  />
                  <p className="text-xs text-ink-2">
                    Il vous restera {formatProtinas(remaining)} ({formatDt(pointsToDt(remaining, ppd))}).
                  </p>
                </div>
              )}
            </div>
          )}

          {hint}

          {earnedMax === 0 && !giftShown && !hint && (
            <p className="text-sm text-ink-2">Aucune Protina utilisable sur cette commande. Votre solde reste sur votre compte.</p>
          )}

          {v3 && (
            <p className="border-t border-hairline pt-3 text-xs leading-relaxed text-ink-3" data-protinas-rule="">
              {coverShipping ? 'Vos Protinas règlent vos articles et la livraison' : 'Vos Protinas règlent vos articles'} ; si un colis est refusé après l&apos;envoi, {forfeit.toLocaleString('fr-FR')} Protinas sont retenues pour l&apos;aller-retour et le reste vous est rendu.
            </p>
          )}
          {/* Rollback rules (or a backend not yet on v3): the ceiling is real, so it is said, from the rules. */}
          {!v3 && (rules.max_total_discount_percent ?? 0) > 0 && (
            <p className="border-t border-hairline pt-3 text-xs leading-relaxed text-ink-3" data-protinas-rule="">
              Code promo ou remise pack + Protinas : jusqu&apos;à {rules.max_total_discount_percent} % de vos articles ; le reste de vos Protinas reste sur votre compte.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** The one contextual hint, most important first. Null when nothing needs saying. */
function pickHint({ pricing, rules, blocked, giftBalance, giftUsed, giftLeft, useGift, minCashMm }: {
  pricing: CheckoutPricing;
  rules: LoyaltyRules;
  blocked: CheckoutPricing['protinas']['blocked_reason'];
  giftBalance: number;
  giftUsed: number;
  giftLeft: number;
  useGift: boolean;
  minCashMm: number;
}) {
  const p = pricing.protinas;
  const line = (text: React.ReactNode) => (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-2" data-protinas-hint="">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );

  if (blocked === 'unverified') {
    return line(<>Vérifiez votre téléphone ou votre email pour utiliser vos Protinas.{' '}
      <LinkWithLoading href="/verify-account" className="-my-3 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4">Vérifier mon compte</LinkWithLoading></>);
  }
  if (blocked === 'debt') {
    return line(`Solde à compenser : ${(p.debt_points ?? 0).toLocaleString('fr-FR')} Protinas. Vos prochains achats le compensent automatiquement.`);
  }
  if (blocked === 'gift_frozen' && giftBalance > 0) {
    const until = formatProtinaDate(p.gift_frozen_until);
    return line(`Vos Protinas cadeau sont suspendues${until ? ` jusqu'au ${until}` : ''} après plusieurs colis refusés. Vos Protinas gagnées restent utilisables.`);
  }
  if (blocked === 'welcome_phone_used' && giftBalance > 0) {
    return line('Ce numéro de livraison a déjà profité d’un cadeau de bienvenue : vos Protinas cadeau ne s’appliquent pas à cette commande. Vos Protinas gagnées restent utilisables.');
  }
  if (p.limited_reason === 'phone_not_trusted') {
    // The binding cap is the LOWER of « under half the amount due » and « at least the cash floor
    // left to pay » (rule 17), so the server sends the figure itself; « la moitié » alone was false
    // under 40 DT, and said nothing when the floor left no Protina at all.
    const from = formatProtinaDate(p.phone_trusted_from);
    const days = rules.cod?.trusted_phone_days ?? 14;
    const floor = rules.cod?.confirm_below_cash_dt ?? 20;
    const max = typeof p.limited_max_dt === 'number' ? Math.max(0, p.limited_max_dt) : null;
    const maxText = max !== null ? formatDt(max, moneyPlaces([max])) : null;
    const verifyLink = <LinkWithLoading href="/verify-phone" className="-my-3 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4">Vérifier mon téléphone</LinkWithLoading>;
    if (from) {
      if (max === 0) return line(`Vos Protinas ne peuvent pas régler cette commande avant le ${from} : d’ici là, il doit rester au moins ${floor} DT à payer à la livraison.`);
      return line(maxText
        ? `Votre téléphone est vérifié depuis moins de ${days} jours : vos Protinas peuvent régler au plus ${maxText} sur cette commande (possible en entier dès le ${from}).`
        : `Votre téléphone est vérifié depuis moins de ${days} jours : vos Protinas règlent une partie de cette commande, et toute la commande dès le ${from}.`);
    }
    return line(<>{max === 0
      ? `Sans téléphone vérifié, vos Protinas ne peuvent pas régler cette commande : il doit rester au moins ${floor} DT à payer à la livraison.`
      : maxText
        ? `Sans téléphone vérifié, vos Protinas peuvent régler au plus ${maxText} sur cette commande.`
        : 'Sans téléphone vérifié, vos Protinas ne règlent qu’une partie de cette commande.'}{' '}{verifyLink}</>);
  }
  if (!useGift || giftBalance <= 0 || giftLeft <= 0) return null;

  // The gift stopped short of the amount due → the basket's budget is what held it back, not the total.
  const dueMm = toMillimes(pricing.total_dt) + toMillimes(p.used_dt);
  if (toMillimes(p.used_gift_dt) >= dueMm - minCashMm) return null;

  const giftDt = formatDt(p.used_gift_dt ?? 0);
  const discounted = (pricing.pack.applied && pricing.pack.amount_dt > 0) || (pricing.coupon.applied && pricing.coupon.amount_dt > 0);
  if (discounted) {
    const by = pricing.pack.applied && pricing.pack.amount_dt > 0 ? 'Avec votre remise pack' : `Avec votre code ${pricing.coupon.code ?? ''}`.trim();
    return line(`${by}, ${giftDt} de cadeau s’appliquent ici ; vous gardez ${formatProtinas(giftLeft)} cadeau pour la prochaine commande.`);
  }
  // An explicit null is the server saying no generic threshold holds for THIS order (an affiliate's
  // commission is reserved first); only a missing field (rollback rules) falls back to the rules.
  const fullFrom = p.gift_full_from_dt === null ? null : (p.gift_full_from_dt ?? rules.gift?.full_from_dt ?? null);
  // « En entier dès 180 DT » only while the basket's programme goods are below that threshold:
  // machines never count toward it, and above it the budget (not the basket size) held the gift back.
  const programmeGoods = pricing.programme_goods_dt ?? pricing.goods_dt;
  const machines = (pricing.excluded_goods_dt ?? 0) > 0;
  const threshold = giftBalance === rules.welcome.points && !!fullFrom && programmeGoods < fullFrom;
  if (giftUsed <= 0 && !threshold) {
    // No bigger basket would change it (the budget, not the basket size, holds the gift back).
    return line('Votre cadeau ne s’applique pas à cette commande ; il reste sur votre compte.');
  }
  const whole = threshold
    ? `les ${formatTnd(pointsToDt(giftBalance, rules.points_per_dt))} en entier dès ${fullFrom} DT d’articles${machines ? ' hors machines' : ''}`
    : `le reste (${formatProtinas(giftLeft)}) vous attend pour une prochaine commande`;
  return line(giftUsed > 0
    ? `Votre cadeau : ${giftDt} sur ce panier — ${whole}.`
    : `Votre cadeau s’applique sur un panier plus grand — ${whole}.`);
}

