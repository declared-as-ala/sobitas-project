'use client';

import { Gift, Percent, PhoneCall, Tag, Truck } from 'lucide-react';
import { LoyaltyEarnLine } from '@/app/components/loyalty/LoyaltyEarnLine';
import { cn } from '@/app/components/ui/utils';
import { formatProtinas, pointsToDt, type LoyaltyRules } from '@/util/loyaltyPoints';
import { checkoutSummaryView, couponNote, formatDt, giftLabel, isPricingV3, moneyPlaces, type CheckoutPricing } from '@/util/checkoutPricing';

// Lives in util/checkoutPricing (the quick-order drawer uses it too); re-exported for CheckoutPage.
export { couponNote };

/**
 * ── ONE SUMMARY, TWO PLACES ─────────────────────────────────────────────────────────────────
 * The desktop aside and the mobile bottom sheet used to carry two hand-written copies of these
 * rows, and they had already drifted (the sheet had no Protinas detail, the aside no pack note).
 * Protinas v3 adds four rows that must read identically in both — the crossed-out delivery, the
 * gift, the Protinas line and « Vous économisez » — so they live here once.
 *
 * Every figure is the server quote's. The only arithmetic is the PRESENTATION split explained in
 * `checkoutSummaryView` (the gift keeps its own line; earned Protinas cross the delivery out),
 * which reproduces `total_dt` exactly.
 *
 * Savings never count crossed-out list prices (Loi 98-40): `savings_dt` is the pack or code, the
 * Protinas and a free delivery, nothing else.
 */
export interface CheckoutTotalsProps {
  pricing: CheckoutPricing | null;
  quoteFailed: boolean;
  rules: LoyaltyRules;
  itemCount: number;
  /** Shown while the first quote is loading or when the quote service is down. */
  fallbackGoodsDt: number;
  fallbackShippingDt: number;
  fallbackTotalDt: number;
  isAuthenticated: boolean;
  /** The account's verified phone, masked — the number staff call when the order needs a confirmation. */
  confirmPhone?: string | null;
  /** The aside prints the free-delivery nudge; the sheet is a summary and leaves it out. */
  showDeliveryNudge?: boolean;
  /** False where the coupon box beside the summary already explains a code the quote did not apply. */
  showCouponNote?: boolean;
  totalSize?: 'lg' | 'md';
}

function Row({ label, detail, amount, tone = 'ink', icon: Icon }: {
  label: React.ReactNode;
  detail?: React.ReactNode;
  amount: React.ReactNode;
  tone?: 'ink' | 'ok';
  icon?: typeof Gift;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="min-w-0 text-ink-2">
        <span className="flex items-center gap-1.5">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />}
          <span>{label}</span>
        </span>
        {detail && <span className="mt-0.5 block text-xs text-ink-3">{detail}</span>}
      </span>
      <span dir="ltr" className={cn('shrink-0 text-end font-display font-semibold tabular-nums', tone === 'ok' ? 'text-ok' : 'text-ink-1')}>
        {amount}
      </span>
    </div>
  );
}

/**
 * « +175 Protinas à la livraison (8.75 DT pour la prochaine commande), utilisables 14 jours après. »
 * A promise, never « vous avez gagné »: Protinas are credited on delivery and held for the return
 * period. Signed-out visitors get the offer form of the same number (LoyaltyEarnLine).
 */
export function CheckoutEarnLine({ pricing, rules, isAuthenticated, className }: {
  pricing: CheckoutPricing | null;
  rules: LoyaltyRules;
  isAuthenticated: boolean;
  className?: string;
}) {
  if (!pricing) return <p className={cn('text-xs text-ink-3', className)}>Protinas confirmées à la validation.</p>;
  const points = Math.max(0, Math.floor(pricing.earn_on_delivery_points || 0));
  if (!isAuthenticated) {
    const earnPerDt = Math.max(1, rules.earn_per_dt);
    return <LoyaltyEarnLine amountDt={points / earnPerDt} variant="summary" className={className} />;
  }
  if (points <= 0) return null;
  const hold = pricing.earn_available_after_days ?? rules.earned?.hold_days ?? 0;
  // A debt is repaid first by the next earnings (rule 16): only what is left is for the next order.
  const repaid = Math.min(points, Math.max(0, Math.floor(pricing.protinas.debt_points ?? 0)));
  const usable = points - repaid;
  return (
    <p className={cn('text-sm leading-snug text-ink-2', className)} data-checkout-earn="">
      <span className="font-semibold text-ink-1">+{formatProtinas(points)} à la livraison</span>
      {repaid > 0 && `, dont ${formatProtinas(repaid)} compensent votre solde à compenser`}
      {usable > 0
        ? <>{' '}({formatDt(pointsToDt(usable, rules.points_per_dt))} pour la prochaine commande){hold > 0 ? `, utilisables ${hold} jours après.` : '.'}</>
        : '.'}
    </p>
  );
}

export function CheckoutTotals({
  pricing,
  quoteFailed,
  rules,
  itemCount,
  fallbackGoodsDt,
  fallbackShippingDt,
  fallbackTotalDt,
  isAuthenticated,
  confirmPhone,
  showDeliveryNudge = true,
  showCouponNote = true,
  totalSize = 'lg',
}: CheckoutTotalsProps) {
  const ppd = Math.max(1, rules.points_per_dt);
  const view = pricing ? checkoutSummaryView(pricing, ppd) : null;
  const places = view?.places ?? moneyPlaces([fallbackGoodsDt, fallbackShippingDt, fallbackTotalDt]);
  const money = (n: number) => formatDt(n, places);
  const v3 = isPricingV3(pricing);
  const total = view?.totalDt ?? fallbackTotalDt;

  const coupon = pricing?.coupon;
  const pack = pricing?.pack;
  const programmeGoods = pricing?.programme_goods_dt ?? pricing?.goods_dt ?? fallbackGoodsDt;
  const promoIncluded = v3 && !rules.pack.excludes_promo_lines && !!pricing && programmeGoods > pricing.full_price_goods_dt;
  const packLabel = pack && !pack.capped && pack.percent > 0
    ? `Remise pack −${pack.percent} %${promoIncluded ? ' (promos comprises)' : ''}`
    : 'Remise pack';

  const remainingForFree = Math.max(0, rules.delivery.free_from_dt - programmeGoods);
  const hasMachines = v3 && (pricing?.excluded_goods_dt ?? 0) > 0;
  // Asked for and earned by the basket, yet nothing on this order (its budget left none): said
  // plainly, so the −x % the cart and the pack builder promised does not vanish without a word.
  const packUnavailable = v3 && !!pack && pack.percent > 0 && !pack.applied && !coupon?.applied
    && (pack.reason === 'not_available' || pack.capped === true);
  // Applied but held below its tier (a low-margin product, an affiliate's commission): the pack
  // builder promised the full −x %, so the smaller « Remise pack » says why. An amount, never the budget.
  const packCapped = v3 && !!pack && pack.applied && pack.capped === true && pack.percent > 0 && pack.amount_dt > 0;
  const charged = view ? view.chargedDt : fallbackShippingDt;
  const canPayDeliveryWithPoints = !!pricing && v3 && isAuthenticated && rules.earned?.cover_shipping !== false
    && (pricing.protinas.max_earned_points ?? 0) >= (view?.deliveryPoints ?? Infinity) && (view?.shippingCashDt ?? 0) > 0;
  const note = pricing && showCouponNote ? couponNote(pricing, rules, places) : null;
  const giftLeft = pricing?.protinas.gift_left_points ?? 0;
  const giftName = pricing ? giftLabel(pricing, rules) : 'Cadeau';

  return (
    <div className="space-y-2.5 text-sm" data-checkout-totals="">
      <Row label={`Articles (${itemCount})`} amount={money(view?.goodsDt ?? fallbackGoodsDt)} />

      {coupon?.applied && coupon.amount_dt > 0 && (
        <Row icon={Tag} label={<>Code <bdi dir="auto">{coupon.code}</bdi></>} amount={`−${money(coupon.amount_dt)}`} tone="ok" />
      )}
      {pack?.applied && pack.amount_dt > 0 && (
        <Row icon={Percent} label={packLabel} amount={`−${money(pack.amount_dt)}`} tone="ok" />
      )}

      {/* Livraison: offerte, or crossed out when earned Protinas pay it, or what is still due. */}
      {view && view.freeShipping ? (
        <Row
          label="Livraison"
          detail={pricing?.free_shipping_reason === 'coupon' && coupon?.code ? <>avec le code <bdi dir="auto">{coupon.code}</bdi></> : undefined}
          amount={<span className="inline-flex items-center gap-1"><Truck className="h-4 w-4" aria-hidden="true" />Offerte</span>}
          tone="ok"
        />
      ) : view && view.shippingPointsDt > 0 ? (
        <div className="flex items-start justify-between gap-3" data-checkout-delivery="protinas">
          <span className="min-w-0 text-ink-2">
            Livraison
            {view.shippingCashDt > 0 && (
              <span className="mt-0.5 block text-xs text-ink-3">dont {money(view.shippingPointsDt)} réglés avec {formatProtinas(view.shippingPoints)}</span>
            )}
          </span>
          <span className="shrink-0 text-end">
            <s dir="ltr" className="me-2 font-display tabular-nums text-ink-3">{money(view.chargedDt)}</s>
            {view.shippingCashDt > 0
              ? <span dir="ltr" className="font-display font-semibold tabular-nums text-ink-1">{money(view.shippingCashDt)}</span>
              : <span className="font-semibold text-ok">Réglée avec {formatProtinas(view.shippingPoints)}</span>}
          </span>
        </div>
      ) : (
        <Row label="Livraison" amount={charged > 0 ? money(charged) : <span className="inline-flex items-center gap-1 text-ok"><Truck className="h-4 w-4" aria-hidden="true" />Offerte</span>} />
      )}

      {view && view.giftDt > 0 && (
        <Row icon={Gift} label={`${giftName} (${formatProtinas(view.giftPoints)})`} amount={`−${money(view.giftDt)}`} tone="ok" />
      )}
      {view && view.earnedDt > 0 && (
        <Row label={`Vos Protinas (${view.earnedPoints.toLocaleString('fr-FR')})`} amount={`−${money(view.earnedDt)}`} tone="ok" />
      )}

      {showDeliveryNudge && charged > 0 && remainingForFree > 0 && !(view && view.shippingCashDt === 0) && (
        <div className="flex items-start gap-2 rounded-xl border border-hairline bg-sunken p-3">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <p className="text-xs font-medium text-ink-2">
            Plus que {formatDt(remainingForFree)}{hasMachines ? ' d’articles hors machines' : ''} pour la livraison offerte{canPayDeliveryWithPoints ? `, ou réglez-la avec ${formatProtinas(view?.deliveryPoints ?? 0)}` : ''}.
          </p>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-3 border-t border-rule pt-4">
        <span className={cn('font-display font-extrabold uppercase tracking-tight text-ink-1', totalSize === 'lg' ? 'text-lg' : 'text-base')}>Total à payer à la livraison</span>
        <span dir="ltr" data-checkout-total="" className={cn('shrink-0 font-display font-extrabold tracking-tight tabular-nums text-brand', totalSize === 'lg' ? 'text-2xl' : 'text-xl')}>
          {money(total)}
        </span>
      </div>
      {(!pricing || quoteFailed) && (
        <p className="text-end text-[11px] leading-snug text-ink-3">Total confirmé à la validation.</p>
      )}

      {view && view.savingsDt > 0 && (
        <p className="font-semibold text-ok" data-checkout-savings="">Vous économisez {money(view.savingsDt)} sur cette commande.</p>
      )}

      {v3 && pricing && (pricing.total_dt === 0 || pricing.requires_phone_confirmation) && (
        <p className="flex items-start gap-2 rounded-xl border border-hairline bg-sunken p-3 text-xs leading-relaxed text-ink-2" data-checkout-confirmation="">
          <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          <span>
            {pricing.total_dt === 0
              ? 'Rien à payer à la livraison : vos Protinas règlent toute la commande. Nous vous appelons pour confirmer avant l’envoi.'
              : confirmPhone
                ? <>Nous vous appelons au <bdi dir="ltr">{confirmPhone}</bdi> pour confirmer avant l’envoi.</>
                : 'Nous vous appelons pour confirmer avant l’envoi.'}
          </span>
        </p>
      )}

      <CheckoutEarnLine pricing={pricing} rules={rules} isAuthenticated={isAuthenticated} />

      {view && view.giftPoints > 0 && giftLeft > 0 && (
        <p className="text-xs leading-relaxed text-ink-2">Vous gardez {formatProtinas(giftLeft)} cadeau pour votre prochaine commande.</p>
      )}
      {packUnavailable && (
        <p className="text-xs leading-relaxed text-ink-2" data-checkout-pack-note="">La remise pack −{pack?.percent} % ne s’applique pas à cette commande.</p>
      )}
      {packCapped && (
        <p className="text-xs leading-relaxed text-ink-2" data-checkout-pack-note="">Votre remise pack −{pack?.percent} % est limitée à {money(pack?.amount_dt ?? 0)} sur cette commande.</p>
      )}
      {note && <p className="text-xs leading-relaxed text-ink-2" data-checkout-coupon-note="">{note}</p>}
      {hasMachines && (
        <p className="text-xs leading-relaxed text-ink-3">Machines et matériel de musculation : hors livraison offerte, code promo, remise pack et cadeau ; sans Protinas gagnées ; vos Protinas gagnées peuvent les régler.</p>
      )}
    </div>
  );
}

/** « 20 123 456 » → « 20 *** *56 »: enough for the customer to recognise it, nothing more. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00216')) digits = digits.slice(5);
  else if (digits.startsWith('216') && digits.length > 8) digits = digits.slice(3);
  if (digits.length < 6) return null;
  return `${digits.slice(0, 2)} *** *${digits.slice(-2)}`;
}
