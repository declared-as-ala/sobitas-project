/**
 * ── THE LOYALTY ECONOMY, ON THE CLIENT ──────────────────────────────────────────────────────
 *
 * The three constants below are a MIRROR of `filament/app/Services/PointsService.php`:
 *
 *     EARN_RATE            = 1     point per 1 DT
 *     REDEEM_POINTS_PER_DT = 20    points == 1 DT of discount
 *     MAX_REDEEM_FRACTION  = 0.5   points cover at most half a basket
 *
 * Effective cashback is therefore **5%**. If any of them changes in PHP it must change here in the
 * same commit — a storefront that promises 10 points and credits 5 is worse than one that promises
 * nothing, because the customer finds out after they have paid.
 *
 * This file exists because that arithmetic was previously written out three times: inline in
 * `CheckoutPage.tsx` (its own `const REDEEM_POINTS_PER_DT = 20`), inline in `FidelitySection.tsx`
 * (`balance / 20`), and in prose in two different reassurance strings. Three copies of a number
 * that is the price of the loyalty programme.
 *
 * ── WHAT THE BACKEND ACTUALLY PAYS, WHICH IS NOT WHAT YOU WOULD GUESS ───────────────────────
 * `PointsService::syncOnStatusChange()` computes the earn base as:
 *
 *     netPaid = commande.prix_ttc - commande.frais_livraison
 *
 * The backend restores the value of redeemed loyalty points before calculating the award. The
 * base is therefore **the goods total after commercial discounts, but before loyalty points are
 * spent, with delivery excluded** — never the reduced amount handed to the driver.
 *
 * Two consequences the UI has to respect and does:
 *
 *   1. Delivery never earns. Quoting points on a cart total that still contains the 8 DT delivery
 *      fee over-promises on every order under the free-shipping threshold.
 *   2. A coupon or pack discount reduces the points earned; redeeming old points does not. So a
 *      figure quoted on a product page is exact only for a full-price order, while checkout uses
 *      the real post-commercial-discount, pre-loyalty subtotal.
 *
 * ── AND THEY ARE CREDITED ON DELIVERY ───────────────────────────────────────────────────────
 * Not at checkout. `CommandeController` says why, and it is the right call for a cash-on-delivery
 * shop: crediting before the customer has paid would let a place-then-cancel loop farm points.
 * Every string in the UI that mentions earning therefore says "à la livraison". Do not shorten it.
 */

/** Points credited per dinar of goods (delivery excluded, before loyalty redemption). */
export const EARN_RATE = 1;

/** Points required for 1 DT of discount. */
export const REDEEM_POINTS_PER_DT = 20;

/** Points may cover at most this fraction of a post-coupon, post-pack subtotal. */
export const MAX_REDEEM_FRACTION = 0.5;

/** The programme as one number, for reassurance copy: "5%". */
export const CASHBACK_PERCENT = Math.round((EARN_RATE / REDEEM_POINTS_PER_DT) * 100);

/**
 * Points paid for a published review — mirrors `config/reviews.php` → `points.award`.
 *
 * A MIRROR, with the same contract as the three constants above: change it in PHP and change it
 * here in the same commit. The server is authoritative and will pay what it pays; this number only
 * decides what the storefront PROMISES, and the failure mode of letting the two drift is a customer
 * who was told 50 and credited 20.
 *
 * The promise is also conditional in a way the copy has to carry: points are paid only for a review
 * on a product you actually bought and received, and only when the authenticity check reads it as
 * human-written. See ReviewAuthenticity — both gates, or nothing.
 */
export const REVIEW_POINTS_AWARD = 10;
export const VERIFIED_PURCHASE_REVIEW_POINTS_AWARD = 50;

/**
 * Points earned on a goods amount in DT.
 *
 * FLOORED, exactly as `PointsService::earnForSpend()` floors it. Rounding here instead would
 * over-quote by a point on roughly half the catalogue — 179.5 DT earns 179, not 180.
 */
export function pointsForSpend(amountDt: number): number {
  if (!Number.isFinite(amountDt) || amountDt <= 0) return 0;
  return Math.floor(amountDt * EARN_RATE);
}

/**
 * The DT value of a points balance. Mirrors `PointsService::pointsToDt()` including its 3-decimal
 * rounding — the account page shows this next to a balance the API also computes, and two
 * different roundings would disagree on screen.
 */
export function pointsToDt(points: number): number {
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.round((points / REDEEM_POINTS_PER_DT) * 1000) / 1000;
}

/** The most DT a balance may take off a given subtotal — the 50% cap and the balance, whichever bites. */
export function maxRedeemableDt(balancePoints: number, subtotalDt: number): number {
  if (subtotalDt <= 0) return 0;
  return Math.min(pointsToDt(balancePoints), Math.round(subtotalDt * MAX_REDEEM_FRACTION * 1000) / 1000);
}

/**
 * The most whole points that may be spent on a subtotal.
 *
 * `REDEEM_POINTS_PER_DT` granularity, because a point that cannot be converted to a whole
 * millime of discount is a point the backend silently declines to spend — the slider in checkout
 * steps by 20 for the same reason.
 */
export function maxRedeemablePoints(balancePoints: number, subtotalDt: number): number {
  const capDt = maxRedeemableDt(balancePoints, subtotalDt);
  return Math.floor(capDt * REDEEM_POINTS_PER_DT);
}

/** A points figure as the shop writes it: "179 points", "1 point". */
export function formatProtinas(points: number): string {
  return `${points.toLocaleString('fr-FR')} ${points === 1 ? 'Protina' : 'Protinas'}`;
}

/** Kept for API-era callers; user-facing copy should prefer formatProtinas. */
export const formatPoints = formatProtinas;
