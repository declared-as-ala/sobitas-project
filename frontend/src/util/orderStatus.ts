/**
 * ── THE THREE THINGS AN ORDER'S `etat` DECIDES ──────────────────────────────────────────────
 *
 * A MIRROR of `PointsService::DELIVERED_STATUSES` and `PointsService::CANCELLED_STATUSES`
 * (filament/app/Services/PointsService.php). If either list changes in PHP it must change here in
 * the same commit — the same contract `util/loyaltyPoints.ts` carries for the earn/redeem rates.
 *
 * The three spellings of each are carried rather than normalised because all of them exist in the
 * `commandes` table. `livree`, `livrée` and `livre` are the same state written by three different
 * back-office generations, and a map that lists only one of them is how the orders list came to
 * render the raw string "livree" inside a display-face uppercase pill.
 *
 * The lifecycle is what the ORDER PAGE's copy hangs on, and getting it wrong is not cosmetic:
 *
 *   open       points are not credited yet. "Vous gagnerez N Protinas à la livraison."
 *   delivered  the transition that credited them. "N Protinas créditées."
 *   cancelled  PointsService::reverseForCommande() has clawed the earned points back and
 *              refunded the spent ones. Promising a reward here is a lie the customer can check
 *              against their own balance in two clicks.
 */
export const DELIVERED_STATUSES = ['livree', 'livrée', 'livre'] as const;

export const CANCELLED_STATUSES = [
  'annuler',
  'annulee',
  'annulée',
  'retour',
  'retourner',
  'retournee',
  'retournée',
] as const;

export type OrderLifecycle = 'open' | 'delivered' | 'cancelled';

export function orderLifecycle(etat: string | null | undefined): OrderLifecycle {
  const value = (etat ?? '').trim().toLowerCase();
  if ((DELIVERED_STATUSES as readonly string[]).includes(value)) return 'delivered';
  if ((CANCELLED_STATUSES as readonly string[]).includes(value)) return 'cancelled';
  return 'open';
}
