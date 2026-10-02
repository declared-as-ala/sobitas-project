/**
 * Storefront fallbacks for the server's Protinas rules. The server quote prices orders.
 * Spent Protinas no longer earn; coupon and pack compete, and their winning discount
 * plus Protinas is capped at 10% of goods (except an owner-approved larger coupon).
 */
import { DELIVERY } from '@/util/company';

export interface LoyaltyRules {
  points_per_dt: number;
  earn_per_dt: number;
  max_total_discount_percent: number;
  pack: { tiers: { from_dt: number; percent: number }[]; excludes_promo_lines: boolean; stacks_with_coupon: boolean };
  delivery: { fee_dt: number; free_from_dt: number };
  welcome: { points: number; value_dt: number; unlock: string };
}

export const EARN_RATE = 1;
export const REDEEM_POINTS_PER_DT = 20;
export const MAX_TOTAL_DISCOUNT_PERCENT = 10;
export const CASHBACK_PERCENT = Math.round((EARN_RATE / REDEEM_POINTS_PER_DT) * 100);
export const REVIEW_POINTS_AWARD = 10;
export const VERIFIED_PURCHASE_REVIEW_POINTS_AWARD = 50;

export const FALLBACK_LOYALTY_RULES: LoyaltyRules = {
  points_per_dt: REDEEM_POINTS_PER_DT,
  earn_per_dt: EARN_RATE,
  max_total_discount_percent: MAX_TOTAL_DISCOUNT_PERCENT,
  pack: { tiers: [{ from_dt: 200, percent: 3 }, { from_dt: 350, percent: 5 }, { from_dt: 500, percent: 7 }], excludes_promo_lines: true, stacks_with_coupon: false },
  delivery: { fee_dt: DELIVERY.feeDt, free_from_dt: DELIVERY.freeFromDt },
  welcome: { points: 300, value_dt: 15, unlock: 'first_delivered_order' },
};

let rulesCache: { value: LoyaltyRules; expires: number } | null = null;
let rulesRequest: Promise<LoyaltyRules> | null = null;

/** Cache the public rules for five minutes; keep a safe fallback during an API outage. */
export async function loadLoyaltyRules(): Promise<LoyaltyRules> {
  if (rulesCache && rulesCache.expires > Date.now()) return rulesCache.value;
  if (rulesRequest) return rulesRequest;
  rulesRequest = fetch('/api/loyalty/rules', { headers: { Accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) throw new Error('Règles Protinas indisponibles');
      const value = await response.json() as LoyaltyRules;
      if (!Array.isArray(value.pack?.tiers) || !value.delivery || !value.points_per_dt) throw new Error('Règles Protinas invalides');
      rulesCache = { value, expires: Date.now() + 300_000 };
      return value;
    })
    .catch(() => rulesCache?.value ?? FALLBACK_LOYALTY_RULES)
    .finally(() => { rulesRequest = null; });
  return rulesRequest;
}

export function pointsForSpend(amountDt: number, earnPerDt = EARN_RATE): number {
  if (!Number.isFinite(amountDt) || amountDt <= 0) return 0;
  return Math.floor(amountDt * earnPerDt);
}

export function pointsToDt(points: number, pointsPerDt = REDEEM_POINTS_PER_DT): number {
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.round((points / pointsPerDt) * 1000) / 1000;
}

/** Display fallback only; checkout uses pricing.protinas.max_usable_points. */
export function maxRedeemablePoints(balancePoints: number, goodsDt: number): number {
  const roomMillimes = Math.floor(Math.max(0, goodsDt) * 1000 * MAX_TOTAL_DISCOUNT_PERCENT / 100);
  return Math.max(0, Math.min(balancePoints, Math.floor(roomMillimes * REDEEM_POINTS_PER_DT / 1000)));
}

export function formatProtinas(points: number): string {
  return `${points.toLocaleString('fr-FR')} ${points === 1 ? 'Protina' : 'Protinas'}`;
}

export const formatPoints = formatProtinas;
