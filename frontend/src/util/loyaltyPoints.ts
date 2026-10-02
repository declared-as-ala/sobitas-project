/**
 * Storefront fallbacks for the server's Protinas rules (GET /api/loyalty/rules). The server quote
 * prices every order; nothing in this file caps, computes or validates a redemption.
 *
 * Protinas v3 (02/10/2026):
 *   - earned Protinas (1 per DT paid for articles, usable after the return hold) pay up to 100 %
 *     of the articles AND the delivery;
 *   - gift Protinas (welcome, reviews) apply automatically, bounded by a hidden per-order budget
 *     whose only public trace is `gift.full_from_dt` (« les 15 DT en entier dès 180 DT »);
 *   - the pack discount counts promo lines; pack and code still compete (the larger wins).
 * There is no visible percentage ceiling any more, so none is published or hard-coded here.
 */
import { DELIVERY } from '@/util/company';

export interface LoyaltyRules {
  /** 3 = Protinas v3. 2 = the 02/10 rules (rollback); an older backend sends no version at all. */
  version?: number;
  points_per_dt: number;
  earn_per_dt: number;
  /** Rollback rules only (version 2). Never rendered as a hard-coded number. */
  max_total_discount_percent?: number;
  earned?: { max_percent: number; cover_shipping: boolean; hold_days: number; min_cash_dt: number; expires: boolean };
  gift?: { full_from_dt: number | null; valid_days: number; expires: boolean; auto_apply: boolean };
  pack: { tiers: { from_dt: number; percent: number }[]; excludes_promo_lines: boolean; stacks_with_coupon: boolean };
  delivery: { fee_dt: number; free_from_dt: number; points?: number };
  coupons?: { free_shipping_from_dt: number | null };
  welcome: { points: number; value_dt: number; unlock: string };
  refusal?: { forfeit_points: number };
  /**
   * Rule 17: days a phone must have been verified before Protinas may pay half an order or more, and
   * the cash that must stay due at the door until then.
   */
  cod?: { trusted_phone_days: number; confirm_below_cash_dt?: number };
  /** Rule 19: subcategories outside the programme (machines): no pack, no gift, no earning, no free delivery. */
  program?: { excluded_subcategory_slugs: string[] };
}

export const EARN_RATE = 1;
export const REDEEM_POINTS_PER_DT = 20;
export const CASHBACK_PERCENT = Math.round((EARN_RATE / REDEEM_POINTS_PER_DT) * 100);
export const REVIEW_POINTS_AWARD = 10;
export const VERIFIED_PURCHASE_REVIEW_POINTS_AWARD = 50;

/**
 * The launch values (code defaults of config/loyalty.php at m = 15 %). Shown only while the rules
 * endpoint is unreachable; every amount on an order still comes from the server quote.
 */
export const FALLBACK_LOYALTY_RULES: LoyaltyRules = {
  version: 3,
  points_per_dt: REDEEM_POINTS_PER_DT,
  earn_per_dt: EARN_RATE,
  earned: { max_percent: 100, cover_shipping: true, hold_days: 14, min_cash_dt: 0, expires: false },
  gift: { full_from_dt: 180, valid_days: 60, expires: true, auto_apply: true },
  pack: { tiers: [{ from_dt: 200, percent: 3 }, { from_dt: 350, percent: 5 }, { from_dt: 500, percent: 7 }], excludes_promo_lines: false, stacks_with_coupon: false },
  delivery: { fee_dt: DELIVERY.feeDt, free_from_dt: DELIVERY.freeFromDt, points: Math.round(DELIVERY.feeDt * REDEEM_POINTS_PER_DT) },
  coupons: { free_shipping_from_dt: 130 },
  welcome: { points: 300, value_dt: 15, unlock: 'phone_verification' },
  refusal: { forfeit_points: 400 },
  cod: { trusted_phone_days: 14, confirm_below_cash_dt: 20 },
  program: { excluded_subcategory_slugs: ['materiel-de-musculation', 'cardio-fitness'] },
};

let rulesCache: { value: LoyaltyRules; expires: number } | null = null;
let rulesRequest: Promise<LoyaltyRules> | null = null;

/**
 * Cache the public rules for five minutes; keep a safe fallback during an API outage.
 * `?v=3` is a distinct URL from the pre-v3 one, so neither the browser's HTTP cache nor the Next
 * route's data cache can hand back rules cached before the v3 deploy.
 */
export async function loadLoyaltyRules(): Promise<LoyaltyRules> {
  if (rulesCache && rulesCache.expires > Date.now()) return rulesCache.value;
  if (rulesRequest) return rulesRequest;
  rulesRequest = fetch('/api/loyalty/rules?v=3', { headers: { Accept: 'application/json' } })
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

/** The last rules loaded (or the fallback), for code that cannot wait for the fetch (search rows). */
export function cachedLoyaltyRules(): LoyaltyRules {
  return rulesCache?.value ?? FALLBACK_LOYALTY_RULES;
}

type ProgrammeProduct = { sous_categorie?: { slug?: string | null } | null } | null | undefined;

/**
 * Rule 19: a product outside the Protinas programme (the machines). Read from the legacy single
 * subcategory, like Product::isLoyaltyExcluded() on the server; a product without one is IN the
 * programme. Display only — the checkout quote is what prices an order.
 */
export function isLoyaltyExcludedProduct(product: object | null | undefined, rules: Pick<LoyaltyRules, 'version' | 'program'>): boolean {
  if (!isProtinasV3(rules)) return false;
  // Cart items may be the light catalogue shape, which carries no subcategory: those count as IN.
  const slug = (product as ProgrammeProduct)?.sous_categorie?.slug?.trim().toLowerCase();
  if (!slug) return false;
  return (rules.program?.excluded_subcategory_slugs ?? []).some(excluded => excluded.trim().toLowerCase() === slug);
}

/**
 * True when the welcome gift waits for the first delivered order: WELCOME_BONUS_UNLOCK_ON_DELIVERY
 * turned back on, or a backend older than Protinas v3 (the storefront can land before it, and the
 * old backend publishes `unlock: 'first_delivered_order'`). The fallback rules say phone verification.
 */
export function welcomeOnDelivery(rules: Pick<LoyaltyRules, 'welcome'>): boolean {
  return !!rules.welcome?.unlock && rules.welcome.unlock !== 'phone_verification';
}

/** « 15 DT » from the published welcome value. */
export function welcomeValueLabel(rules: Pick<LoyaltyRules, 'welcome'>): string {
  const value = Math.round((Number(rules.welcome?.value_dt) || 0) * 1000) / 1000;
  return `${value.toLocaleString('fr-FR')} DT`;
}

/**
 * The welcome teaser before phone verification, true under either backend: « 15 DT offerts tout de
 * suite » when the gift is credited at verification, « …débloqués à la réception de votre premier
 * colis » when it still waits for the first delivered order.
 */
export function welcomeTeaser(rules: Pick<LoyaltyRules, 'welcome'>): string {
  return `Vérifiez votre numéro : ${welcomeOffer(rules)}`;
}

/** The offer half of the teaser (after « Vérifiez votre numéro : »). */
export function welcomeOffer(rules: Pick<LoyaltyRules, 'welcome'>): string {
  const value = welcomeValueLabel(rules);
  return welcomeOnDelivery(rules)
    ? `${value} offerts, débloqués à la réception de votre premier colis.`
    : `${value} offerts tout de suite.`;
}

/** True when the published rules are Protinas v3 (gift wallet, delivery payable, no ceiling). */
export function isProtinasV3(rules: Pick<LoyaltyRules, 'version'>): boolean {
  return (rules.version ?? 2) >= 3;
}

/** Protinas that pay the whole delivery fee (200 at 10 DT and 20 per DT). */
export function deliveryPoints(rules: Pick<LoyaltyRules, 'delivery' | 'points_per_dt'>): number {
  return rules.delivery.points ?? Math.round(rules.delivery.fee_dt * rules.points_per_dt);
}

export function pointsForSpend(amountDt: number, earnPerDt = EARN_RATE): number {
  if (!Number.isFinite(amountDt) || amountDt <= 0) return 0;
  return Math.floor(amountDt * earnPerDt);
}

export function pointsToDt(points: number, pointsPerDt = REDEEM_POINTS_PER_DT): number {
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.round((points / pointsPerDt) * 1000) / 1000;
}

export function formatProtinas(points: number): string {
  return `${points.toLocaleString('fr-FR')} ${points === 1 ? 'Protina' : 'Protinas'}`;
}

export const formatPoints = formatProtinas;

/** A wallet date as the copy writes it: « 16/10/2026 », or « 16/10 » when `short`. Null on a bad value. */
export function formatProtinaDate(value: string | null | undefined, short = false): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', short ? { day: '2-digit', month: '2-digit' } : { day: '2-digit', month: '2-digit', year: 'numeric' });
}
