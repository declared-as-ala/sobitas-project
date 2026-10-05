import type { BackendCommandeFields, BackendOrderPayload } from '@/lib/orderPayload';
import type { LoyaltyRules } from '@/util/loyaltyPoints';

/** The quote needs no delivery form: only a complete phone / e-mail, for per-customer coupon limits. */
export type CheckoutQuotePayload = Omit<BackendOrderPayload, 'commande'> & { commande: Partial<BackendCommandeFields> };

export type ProtinasBlockReason = 'unverified' | 'debt' | 'gift_frozen' | 'welcome_phone_used';

/**
 * `pricing.protinas` from POST /checkout/quote. The first block exists under both rule sets; the
 * rest is Protinas v3 only (`rules_version: 3`) and is optional so a rollback to the 02/10 rules
 * (LOYALTY_RULES_VERSION=2) still renders.
 */
export interface CheckoutProtinas {
  balance: number;
  max_usable_points: number;
  max_usable_dt: number;
  used_points: number;
  used_dt: number;
  remaining_points: number;
  /** Rollback rules only. */
  pending_welcome_points?: number;
  earned_spendable?: number;
  earned_pending?: number;
  pending_available_at?: string | null;
  gift_balance?: number;
  gift_expires_at?: string | null;
  debt_points?: number;
  gift_frozen_until?: string | null;
  /** Gift Protinas this basket can take (the hidden budget's room), whether or not applied. */
  max_gift_points?: number;
  /** Earned Protinas the slider may request: what is left to pay after the gift. */
  max_earned_points?: number;
  used_gift_points?: number;
  used_earned_points?: number;
  used_gift_dt?: number;
  used_earned_dt?: number;
  used_on_shipping_dt?: number;
  used_on_goods_dt?: number;
  gift_applied?: boolean;
  gift_full_from_dt?: number | null;
  gift_left_points?: number;
  blocked_reason?: ProtinasBlockReason | null;
  /** The gift wallet holds a welcome gift (« Cadeau de bienvenue »); otherwise it is just « Cadeau ». */
  gift_has_welcome?: boolean;
  /**
   * 'phone_not_trusted': no phone verified long enough ago (rule 17), so this order's Protinas stay
   * under half of the amount due and leave at least the confirmation floor in cash.
   */
  limited_reason?: 'phone_not_trusted' | null;
  /** With `limited_reason`: the most this order's Protinas may pay (0 when the cash floor leaves nothing). */
  limited_max_dt?: number | null;
  /** When the current phone becomes trusted (null: no verified phone). */
  phone_trusted_from?: string | null;
}

export interface CheckoutPricing {
  rules_version?: number;
  goods_dt: number;
  /** Articles inside the programme (machines excluded); the pack, the code and delivery read this. */
  programme_goods_dt?: number;
  excluded_goods_dt?: number;
  full_price_goods_dt: number;
  /** `reason` 'not_available': the tier was earned but this order's budget left nothing for it. */
  pack: { percent: number; amount_dt: number; applied: boolean; capped?: boolean; reason?: 'not_available' | null };
  coupon: {
    code: string | null;
    type: string | null;
    amount_dt: number;
    applied: boolean;
    /** pack_better · budget · excluded_goods · free_shipping_minimum · shipping_already_free · too_many_attempts · a message */
    reason: string | null;
    capped?: boolean;
    min_goods_dt?: number | null;
    full_from_dt?: number | null;
  };
  free_shipping_reason: string | null;
  /** Rollback rules only. */
  ceiling_percent?: number;
  ceiling_dt?: number;
  room_dt?: number;
  total_discount_percent?: number;
  /** v3: the delivery fee before any code or Protinas. */
  shipping_gross_dt?: number;
  /** Delivery still due in cash (v3: net of the Protinas that paid it). */
  shipping_dt: number;
  protinas: CheckoutProtinas;
  /** v3: pack or code + Protinas + free delivery. Never crossed-out list prices (Loi 98-40). */
  savings_dt?: number;
  total_discount_dt: number;
  total_dt: number;
  earn_on_delivery_points: number;
  earn_available_after_days?: number;
  requires_phone_confirmation?: boolean;
  next_pack_tier: { from_dt: number; percent: number; remaining_dt: number } | null;
}

export async function quoteCheckout(payload: CheckoutQuotePayload, signal?: AbortSignal): Promise<CheckoutPricing> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const response = await fetch('/api/checkout/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) throw new Error('Devis momentanément indisponible');
  const body = await response.json();
  if (!body.pricing || !Number.isFinite(Number(body.pricing.total_dt))) throw new Error('Devis invalide');
  return body.pricing as CheckoutPricing;
}

export function isPricingV3(pricing: Pick<CheckoutPricing, 'rules_version'> | null | undefined): boolean {
  return (pricing?.rules_version ?? 2) >= 3;
}

/** Integer millimes from a DT figure, so every comparison below is exact. */
export function toMillimes(dt: number | null | undefined): number {
  return Math.round((Number(dt) || 0) * 1000);
}

/** Protinas worth `millimes`, rounded up the way the server rounds the last step. */
export function pointsForMillimes(millimes: number, pointsPerDt: number): number {
  return millimes > 0 ? Math.ceil((millimes * pointsPerDt) / 1000) : 0;
}

/**
 * 3 decimals for a whole column as soon as one figure carries a millime, 2 otherwise — the rule
 * OrderReceipt uses, so « 282.106 » never sits above « 15.00 ».
 */
export function moneyPlaces(values: Array<number | null | undefined>): 2 | 3 {
  return values.some(v => Math.round(Math.abs(Number(v) || 0) * 1000) % 10 !== 0) ? 3 : 2;
}

export function formatDt(value: number, places: 2 | 3 = 2): string {
  return `${(Number(value) || 0).toFixed(places)} DT`;
}

/**
 * The checkout summary, laid out the way the customer reads it.
 *
 * ── THE GIFT KEEPS ITS OWN LINE; EARNED PROTINAS PAY THE DELIVERY ROW ──────────────────────
 * The engine pays the delivery first with whatever Protinas are used (gift + earned together).
 * Shown that way, a 15 DT welcome gift on a 180 DT basket would read « Livraison réglée avec 200
 * Protinas » plus « Cadeau −5 DT » — the customer's 15 DT gift split in two. So the summary keeps
 * the gift whole on its own line and lets EARNED Protinas — the ones the customer chose with
 * « Payer la livraison » — cross the delivery out. Any allocation adds up to the same total:
 *
 *   goods − pack − code + (charged − earnedOnShip) − gift − (earned − earnedOnShip) = total
 *
 * `charged` is the delivery after a free-delivery code and before Protinas.
 */
export interface CheckoutSummaryView {
  v3: boolean;
  places: 2 | 3;
  goodsDt: number;
  /** Delivery owed before Protinas (0 when free). */
  chargedDt: number;
  /** Part of `chargedDt` shown as paid with earned Protinas, and how many Protinas that is. */
  shippingPointsDt: number;
  shippingPoints: number;
  /** What the delivery row still asks in cash. */
  shippingCashDt: number;
  /** Protinas that pay the whole delivery (« Payer la livraison · 200 Protinas »). */
  deliveryPoints: number;
  freeShipping: boolean;
  giftPoints: number;
  giftDt: number;
  earnedPoints: number;
  earnedDt: number;
  savingsDt: number;
  totalDt: number;
}

export function checkoutSummaryView(pricing: CheckoutPricing, pointsPerDt: number): CheckoutSummaryView {
  const v3 = isPricingV3(pricing);
  const p = pricing.protinas;
  const usedOnShipMm = toMillimes(p.used_on_shipping_dt);
  const chargedMm = toMillimes(pricing.shipping_dt) + usedOnShipMm;
  const giftMm = v3 ? toMillimes(p.used_gift_dt) : 0;
  // Rollback rules have no gift and never pay the delivery: every Protina is on the articles.
  const earnedMm = v3 ? toMillimes(p.used_earned_dt) : toMillimes(p.used_dt);
  const earnedOnShipMm = Math.min(usedOnShipMm, earnedMm, chargedMm);
  const shippingPoints = earnedOnShipMm >= chargedMm && chargedMm > 0
    ? pointsForMillimes(chargedMm, pointsPerDt)
    : pointsForMillimes(earnedOnShipMm, pointsPerDt);
  const earnedPointsTotal = v3 ? (p.used_earned_points ?? 0) : p.used_points;
  const earnedOnGoodsMm = Math.max(0, earnedMm - earnedOnShipMm);
  const figures = [pricing.goods_dt, pricing.pack.amount_dt, pricing.coupon.amount_dt, chargedMm / 1000,
    giftMm / 1000, earnedMm / 1000, pricing.total_dt, pricing.savings_dt ?? pricing.total_discount_dt];

  return {
    v3,
    places: moneyPlaces(figures),
    goodsDt: pricing.goods_dt,
    chargedDt: chargedMm / 1000,
    shippingPointsDt: earnedOnShipMm / 1000,
    shippingPoints,
    shippingCashDt: (chargedMm - earnedOnShipMm) / 1000,
    deliveryPoints: pointsForMillimes(chargedMm, pointsPerDt),
    freeShipping: chargedMm === 0,
    giftPoints: v3 ? (p.used_gift_points ?? 0) : 0,
    giftDt: giftMm / 1000,
    earnedPoints: Math.max(0, earnedPointsTotal - shippingPoints),
    earnedDt: earnedOnGoodsMm / 1000,
    savingsDt: pricing.savings_dt ?? pricing.total_discount_dt,
    totalDt: pricing.total_dt,
  };
}

/**
 * « Cadeau de bienvenue » only when the gift wallet really holds a welcome gift (the server says so:
 * `gift_has_welcome`); review rewards and refunded gifts are just « Cadeau ». An older backend
 * without the flag falls back to the balance test.
 */
export function giftLabel(pricing: CheckoutPricing, rules: Pick<LoyaltyRules, 'welcome'>): string {
  const p = pricing.protinas;
  const welcome = p.gift_has_welcome ?? (p.gift_balance ?? 0) >= rules.welcome.points;
  return welcome ? 'Cadeau de bienvenue' : 'Cadeau';
}

/**
 * The one sentence that explains what the server did with a code (kept for the pack, capped, refused
 * on this basket…). Null when the code simply applied in full. Shared by the checkout and the
 * quick-order drawer.
 */
export function couponNote(pricing: CheckoutPricing, rules: LoyaltyRules, places: 2 | 3): string | null {
  const c = pricing.coupon;
  const code = c.code ?? '';
  switch (c.reason) {
    case null:
    case undefined:
    case '':
      break;
    case 'pack_better':
      return `Votre remise pack est plus avantageuse que le code ${code} : nous l’avons gardée. Votre code reste utilisable plus tard.`;
    case 'budget':
      return c.full_from_dt
        ? `Le code ${code} s’applique en entier dès ${c.full_from_dt} DT d’articles${(pricing.excluded_goods_dt ?? 0) > 0 ? ' hors machines' : ''} ; il reste utilisable plus tard.`
        : `Le code ${code} ne s’applique pas sur ce panier ; il reste utilisable plus tard.`;
    case 'excluded_goods':
      return `Les machines et le matériel de musculation ne profitent pas des codes promo : le code ${code} reste utilisable plus tard.`;
    case 'free_shipping_minimum': {
      const from = c.min_goods_dt ?? rules.coupons?.free_shipping_from_dt ?? null;
      return from ? `Ce code offre la livraison dès ${from} DT d’articles.` : 'Ce code n’offre pas la livraison sur ce panier.';
    }
    case 'shipping_already_free':
      return `Votre livraison est déjà offerte : le code ${code} reste utilisable plus tard.`;
    case 'too_many_attempts':
      return 'Trop d’essais de code promo : réessayez dans quelques minutes.';
    default:
      // A validation message from the server, already written in French for the customer.
      if (!c.applied) return c.reason;
  }
  if (c.applied && c.capped && c.amount_dt > 0) {
    return `Code ${code} : −${formatDt(c.amount_dt, places)}, le maximum de ce code sur ce panier.`;
  }
  return null;
}

/**
 * The Protinas of a STORED order, split the way the checkout showed them (`checkoutSummaryView`):
 * the gift whole on its own line, earned Protinas crossing the delivery out first, the rest on the
 * articles. The engine pays the delivery first with gift and earned together, so reading
 * `points_shipping_dt` alone would relabel a 15 DT welcome gift as « Livraison réglée en Protinas »
 * plus « Protinas −5 » on the confirmation page and the receipt. The engine only caps the gift when
 * no earned Protinas are spent, so min(gift value, Protinas value) recovers it exactly.
 */
export interface StoredProtinasSplit {
  giftPoints: number;
  giftDt: number;
  /** Earned Protinas shown on the articles (the delivery part is `shippingPoints`). */
  earnedGoodsPoints: number;
  earnedGoodsDt: number;
  /** The delivery before Protinas (`frais_livraison` is net of them since v3). */
  shippingGrossDt: number;
  /** Part of the delivery shown as paid with earned Protinas, and how many. */
  shippingPointsDt: number;
  shippingPoints: number;
}

export function storedProtinasSplit(order: {
  /** `points_discount_ht`: the Protinas that paid the articles. */
  goodsPointsDt: number | null | undefined;
  /** `points_shipping_dt`: the Protinas that paid the delivery. */
  shippingPointsDt: number | null | undefined;
  /** `frais_livraison`: the delivery still due in cash. */
  netShippingDt: number | null | undefined;
  /** `points_redeemed`: every Protina the order debited (gift + earned). */
  pointsRedeemed: number | null | undefined;
  /** `points_redeemed_gift`. */
  giftPoints: number | null | undefined;
}, pointsPerDt: number): StoredProtinasSplit {
  const ppd = Math.max(1, pointsPerDt);
  const onShipMm = Math.max(0, toMillimes(order.shippingPointsDt));
  const grossMm = Math.max(0, toMillimes(order.netShippingDt)) + onShipMm;
  const valueMm = Math.max(0, toMillimes(order.goodsPointsDt)) + onShipMm;
  const giftPoints = Math.max(0, Math.floor(Number(order.giftPoints) || 0));
  const giftMm = Math.min(Math.floor((giftPoints * 1000) / ppd), valueMm);
  const earnedMm = valueMm - giftMm;
  const earnedOnShipMm = Math.min(onShipMm, earnedMm, grossMm);
  const shippingPoints = earnedOnShipMm >= grossMm && grossMm > 0
    ? pointsForMillimes(grossMm, ppd)
    : pointsForMillimes(earnedOnShipMm, ppd);
  const earnedPoints = Math.max(0, Math.floor(Number(order.pointsRedeemed) || 0) - (giftMm > 0 ? giftPoints : 0));

  return {
    giftPoints: giftMm > 0 ? giftPoints : 0,
    giftDt: giftMm / 1000,
    earnedGoodsPoints: Math.max(0, earnedPoints - shippingPoints),
    earnedGoodsDt: (earnedMm - earnedOnShipMm) / 1000,
    shippingGrossDt: grossMm / 1000,
    shippingPointsDt: earnedOnShipMm / 1000,
    shippingPoints,
  };
}
