import { ShieldCheck } from 'lucide-react';
import type { Order } from '@/types';
import type { OrderLifecycle } from '@/util/orderStatus';
import { pointsToDt } from '@/util/loyaltyPoints';
import { formatTnd } from '@/util/productPrice';
import { ProtinaAmount, ProtinaMark } from './Protina';

/**
 * ── PROTINAS ARE NOT MONEY, SO THEY DO NOT LIVE IN THE RECEIPT ──────────────────────────────
 *
 * The dinars a redemption took off this order belong in `OrderReceipt` — that reduction is on the
 * invoice and the customer paid the reduced figure. What belongs HERE is the loyalty balance:
 * points spent, points that will arrive, points that were taken back. Mixing the two produced a
 * "Total" that a customer could not reconcile against either their bank or their balance.
 *
 * ── THE STATEMENT IS CONDITIONAL, AND THAT IS THE ENTIRE POINT ──────────────────────────────
 * `PointsService::syncOnStatusChange()` credits nothing until `etat` enters DELIVERED_STATUSES,
 * and `reverseForCommande()` claws the credit back — and refunds the redemption — the moment it
 * enters CANCELLED_STATUSES. So there are three different true sentences and this component must
 * never print the wrong one:
 *
 *   open       "Vous gagnerez N Protinas à la livraison."   (a promise, not a fact)
 *   delivered  "N Protinas créditées."                      (in the balance now)
 *   cancelled  "Aucune Protina gagnée."                     + what was given back
 *
 * `LoyaltyEarnLine` carries the same rule for the product and checkout pages and its docblock
 * explains why at length: a customer who is shown a number at checkout and finds no balance the
 * next morning has been lied to by the UI. A cancelled order is the sharper version of that —
 * the points really were removed, and the customer can see it in their own history.
 *
 * ── NUMBERS ─────────────────────────────────────────────────────────────────────────────────
 * Every points figure is a ledger sum computed by `ClientController::withCustomerTracking()`.
 * The only arithmetic done here is `pointsToDt`, the documented 20-points-to-the-dinar rate that
 * `util/loyaltyPoints.ts` mirrors from `PointsService::pointsToDt()` — the same conversion the
 * account balance and the checkout slider already display.
 */

type Movement = NonNullable<Order['protina']>;

/** The DT a redemption actually removed from the invoice, from the server's receipt. */
function RedemptionLine({ points, valueDt }: { points: number; valueDt: number | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-ink-2">
        Utilisées sur cette commande
        {valueDt !== null && <span className="mt-0.5 block text-xs text-ink-3">{formatTnd(valueDt)} de remise</span>}
      </span>
      <ProtinaAmount value={-points} className="shrink-0 text-sm font-bold text-brand" />
    </div>
  );
}

export function OrderProtinaOutcome({
  movement,
  lifecycle,
  redemptionValueDt,
}: {
  movement: Movement;
  lifecycle: OrderLifecycle;
  /** `totals.points_discount` — the server's figure, or null when the receipt is unavailable. */
  redemptionValueDt: number | null;
}) {
  const redeemed = movement.redeemed ?? movement.spent;
  const refunded = movement.refunded ?? 0;
  const revoked = movement.revoked ?? 0;
  const incoming = lifecycle === 'delivered' ? movement.earned : movement.pending;

  // Nothing happened on the ledger for this order — a guest checkout, or a basket under 20 DT.
  // An empty loyalty card is a card that teaches the customer the programme does not apply here.
  if (redeemed <= 0 && incoming <= 0 && refunded <= 0 && revoked <= 0) return null;

  return (
    <section
      data-protina-outcome={lifecycle}
      className="rounded-xl border border-brand/20 bg-elevated p-5 shadow-sm sm:p-6"
      aria-labelledby="order-protina-outcome"
    >
      <div className="flex items-start gap-3">
        <ProtinaMark size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Fidélité</p>
          <h2
            id="order-protina-outcome"
            className="mt-1 font-display text-lg font-bold uppercase tracking-tight text-ink-1"
          >
            Vos Protinas
          </h2>
        </div>
      </div>

      <div className="mt-4 space-y-3 border-t border-hairline pt-4">
        {redeemed > 0 && <RedemptionLine points={redeemed} valueDt={redemptionValueDt} />}

        {lifecycle === 'open' && incoming > 0 && (
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm text-ink-2">
              À créditer à la livraison
              <span className="mt-0.5 block text-xs text-ink-3">{formatTnd(pointsToDt(incoming))} de remise future</span>
            </span>
            <ProtinaAmount value={incoming} signed className="shrink-0 text-sm font-bold text-ok" />
          </div>
        )}

        {lifecycle === 'delivered' && incoming > 0 && (
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm text-ink-2">
              Créditées à la livraison
              <span className="mt-0.5 block text-xs text-ink-3">{formatTnd(pointsToDt(incoming))} de remise</span>
            </span>
            <ProtinaAmount value={incoming} signed className="shrink-0 text-sm font-bold text-ok" />
          </div>
        )}

        {lifecycle === 'cancelled' && refunded > 0 && (
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm text-ink-2">Remboursées après annulation</span>
            <ProtinaAmount value={refunded} signed className="shrink-0 text-sm font-bold text-ok" />
          </div>
        )}

        {lifecycle === 'cancelled' && revoked > 0 && (
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm text-ink-2">Reprises après annulation</span>
            <ProtinaAmount value={-revoked} className="shrink-0 text-sm font-bold text-ink-2" />
          </div>
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 border-t border-hairline pt-3 text-xs leading-relaxed text-ink-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
        {lifecycle === 'open' &&
          'Les Protinas sont créditées une fois la commande livrée. 20 Protinas = 1 DT de remise.'}
        {lifecycle === 'delivered' &&
          'Ces Protinas sont dans votre solde. 20 Protinas = 1 DT de remise sur une prochaine commande.'}
        {/* Only claim the refund when a refund row actually exists. The reversal is best-effort in
            PointsService and an order can sit cancelled with the ledger not yet compensated. */}
        {lifecycle === 'cancelled' &&
          (refunded > 0
            ? 'Cette commande est annulée : aucune Protina n’a été gagnée, et celles utilisées ont été remises sur votre solde.'
            : 'Cette commande est annulée : aucune Protina n’a été gagnée.')}
      </p>
    </section>
  );
}
