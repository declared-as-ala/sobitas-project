import type { Order } from '@/types';
import type { OrderLifecycle } from '@/util/orderStatus';
import { formatProtinas, REDEEM_POINTS_PER_DT } from '@/util/loyaltyPoints';
import { storedProtinasSplit, type StoredProtinasSplit } from '@/util/checkoutPricing';

/**
 * ── THE RECEIPT: WHAT WAS CHARGED, AND WHY IT IS NOT THE SUM OF THE ARTICLES ────────────────
 *
 * The block this replaces printed three lines — "Sous-total / Livraison / Total" — from
 * `prix_ht`, `frais_livraison` and `prix_ttc`. On a full-price order those three add up. On every
 * order carrying a coupon, a pack discount or a points redemption they DO NOT, because
 * `CommandeController` computes
 *
 *     prix_ttc = max(0, prix_ht − (coupon + pack + points)) + frais_livraison
 *
 * and none of the three subtractions was on the page. A customer who bought 412 DT of product,
 * used a code and 300 Protinas, and paid 355.80 DT was shown 412 + 8 and then 355.80, with the
 * missing 64.20 DT unexplained. That is the specific defect this component exists to close, and
 * it is why every row below comes from `order.totals`, a SERVER-COMPUTED object — nothing here
 * subtracts one figure from another to invent a discount.
 *
 * ── `reconciled` IS THE HONESTY SWITCH ──────────────────────────────────────────────────────
 * The server sets it false when the itemised components do not reproduce `total` — a legacy order
 * predating the discount columns, or one whose totals an admin overwrote in Filament. A column of
 * labelled numbers that does not add up to what was paid is worse than no column at all, so in
 * that case this falls back to the one figure that is still exact by definition: the residual
 * between (articles + livraison) and the total, labelled simply "Remise".
 *
 * ── DECIMALS ARE CHOSEN ONCE, FOR THE WHOLE COLUMN ──────────────────────────────────────────
 * Points convert at 20 to the dinar, so a redemption that is not a multiple of 20 produces a
 * millime (301 Protinas = 15.05 DT). Formatting each row independently would print "15.05" beside
 * "412.00" and the column would look like it had been rounded differently in different places.
 * `decimalsFor` picks 3 for the whole receipt as soon as ANY row needs a millime, and 2 otherwise.
 *
 * ── PROTINAS V3: THE DELIVERY CAN BE PAID WITH PROTINAS ─────────────────────────────────────
 * From 02/10/2026 `frais_livraison` is stored NET of the Protinas that paid it, and the server
 * sends `shipping_gross` + `points_shipping` beside it. The receipt then shows the delivery at its
 * real price and a separate « Livraison réglée avec vos Protinas » reduction, so the column still
 * adds up row by row (goods − remises + delivery − delivery paid in Protinas = total) and the
 * customer sees what their Protinas actually paid. `points_discount` is the articles part only.
 *
 * The engine pays the delivery first with every Protina used, gift included. Shown that way, a 15 DT
 * welcome gift on a 180 DT basket would read « Livraison réglée avec vos Protinas » plus « Protinas
 * utilisées −5 », a split the checkout never showed. So the receipt uses the checkout's allocation
 * (`storedProtinasSplit`): the gift keeps its own « Protinas cadeau » row, and only EARNED Protinas
 * cross the delivery out. Same rows, same total, the story the customer was told.
 */

type Totals = NonNullable<Order['totals']>;

/**
 * 3 decimals as soon as any figure carries a millime, 2 otherwise — decided ONCE, over every
 * number printed on the card, including the line totals above the receipt. Exported because the
 * page owns the line items and this component owns the totals, and a card that prints "96.9 DT"
 * on a line and "96.90 DT" in the subtotal directly beneath it reads as two different roundings.
 */
export function moneyDecimals(values: number[]): number {
  return values.some((v) => Math.round(Math.abs(v) * 1000) % 10 !== 0) ? 3 : 2;
}

/** Every figure this component prints, for callers that need the same precision as the receipt. */
export function receiptFigures(totals: Totals): number[] {
  const split = protinasSplit(totals);
  return [
    totals.goods,
    totals.shipping,
    totals.shipping_gross ?? totals.shipping,
    totals.points_shipping ?? 0,
    totals.coupon_discount,
    totals.other_discount,
    totals.points_discount,
    split.giftDt,
    split.earnedGoodsDt,
    split.shippingPointsDt,
    totals.total,
  ];
}

/** The checkout's allocation of this order's Protinas (see the docblock above). */
function protinasSplit(totals: Totals, order?: Order, pointsRedeemed?: number): StoredProtinasSplit {
  const separated = order?.pack_discount_ht != null && order?.points_discount_ht != null;
  return storedProtinasSplit({
    goodsPointsDt: separated ? Number(order?.points_discount_ht) : totals.points_discount,
    shippingPointsDt: totals.reconciled ? Math.max(0, totals.points_shipping ?? 0) : 0,
    netShippingDt: totals.shipping,
    pointsRedeemed: order?.points_redeemed ?? totals.points_redeemed ?? pointsRedeemed ?? 0,
    giftPoints: totals.points_redeemed_gift ?? order?.points_redeemed_gift ?? 0,
  }, REDEEM_POINTS_PER_DT);
}

/** A signed row of the receipt. `sign` is what the amount DOES to the total, not its stored sign. */
type Row = {
  key: string;
  label: string;
  /** Secondary text on its own line under the label — a coupon code, a points count. */
  detail?: string;
  amount: number;
  sign: 'add' | 'subtract' | 'neutral';
};

const TOTAL_LABEL: Record<OrderLifecycle, string> = {
  open: 'Total à payer',
  delivered: 'Total payé',
  cancelled: 'Total de la commande',
};

const TOTAL_NOTE: Record<OrderLifecycle, string> = {
  open: 'Montant à régler à la réception du colis.',
  delivered: 'Montant réglé pour cette commande.',
  // Never "payé" on a cancelled order: the money side of a cancellation is settled off-site and
  // this page has no field that says whether anything changed hands.
  cancelled: 'Cette commande a été annulée.',
};

function buildRows(totals: Totals, pointsRedeemed: number, order?: Order): Row[] {
  const rows: Row[] = [
    { key: 'goods', label: 'Sous-total articles', amount: totals.goods, sign: 'neutral' },
  ];
  const pointsShipping = totals.reconciled ? Math.max(0, totals.points_shipping ?? 0) : 0;
  const split = protinasSplit(totals, order, pointsRedeemed);

  if (totals.reconciled) {
    const separated = order?.pack_discount_ht != null && order?.points_discount_ht != null;
    if (totals.coupon_discount > 0) {
      rows.push({
        key: 'coupon',
        label: separated && order?.coupon_code_snapshot ? `Code ${order.coupon_code_snapshot}` : 'Remise boutique',
        detail: totals.coupon_code ? `Code ${totals.coupon_code}` : undefined,
        amount: totals.coupon_discount,
        sign: 'subtract',
      });
    }
    if (separated && Number(order?.pack_discount_ht) > 0) {
      rows.push({ key: 'pack', label: 'Remise pack', amount: Number(order?.pack_discount_ht), sign: 'subtract' });
    } else if (totals.other_discount > 0) {
      // `remise` minus its points half. It is a pack/lot tier for orders placed through the pack
      // builder and a hand-entered commercial gesture for orders created in the back office, and
      // the column does not record which — so it is labelled for what it certainly is.
      rows.push({ key: 'other', label: 'Remise supplémentaire', amount: totals.other_discount, sign: 'subtract' });
    }
    if (split.giftDt > 0) {
      rows.push({ key: 'gift', label: 'Protinas cadeau', detail: formatProtinas(split.giftPoints), amount: split.giftDt, sign: 'subtract' });
    }
    if (split.earnedGoodsDt > 0) {
      // v3: points_redeemed also counts the gift and the Protinas that paid the delivery (own rows).
      rows.push({
        key: 'points',
        label: 'Protinas utilisées',
        detail: split.earnedGoodsPoints > 0 ? formatProtinas(split.earnedGoodsPoints) : undefined,
        amount: split.earnedGoodsDt,
        sign: 'subtract',
      });
    }
  } else {
    // Exact by construction: total = goods + shipping − residual. One row, no itemisation.
    const residual = Math.round((totals.goods + totals.shipping - totals.total) * 1000) / 1000;
    if (residual > 0) {
      rows.push({ key: 'residual', label: 'Remise appliquée', amount: residual, sign: 'subtract' });
    } else if (residual < 0) {
      rows.push({ key: 'residual', label: 'Ajustement', amount: -residual, sign: 'add' });
    }
  }

  if (pointsShipping > 0) {
    const gross = totals.shipping_gross ?? split.shippingGrossDt;
    rows.push({ key: 'shipping', label: 'Livraison', amount: gross, sign: gross > 0 ? 'add' : 'neutral' });
    if (split.shippingPointsDt > 0) {
      rows.push({
        key: 'shipping-points',
        label: 'Livraison réglée avec vos Protinas',
        detail: formatProtinas(split.shippingPoints),
        amount: split.shippingPointsDt,
        sign: 'subtract',
      });
    }
  } else {
    rows.push({ key: 'shipping', label: 'Livraison', amount: totals.shipping, sign: totals.shipping > 0 ? 'add' : 'neutral' });
  }

  return rows;
}

export function OrderReceipt({
  totals,
  lifecycle,
  pointsRedeemed,
  decimals,
  order,
}: {
  totals: Totals;
  lifecycle: OrderLifecycle;
  /** Gross points debited at checkout, from the ledger — labels the redemption row. */
  pointsRedeemed: number;
  order?: Order;
  /** Shared with the line items above (see `moneyDecimals`); falls back to this card's own. */
  decimals?: number;
}) {
  const rows = buildRows(totals, pointsRedeemed, order);
  const places = decimals ?? moneyDecimals([...rows.map((r) => r.amount), totals.total]);
  const money = (n: number) => `${n.toFixed(places)} DT`;

  return (
    /* The `data-receipt-*` hooks are read by scripts/measure-order-detail.mjs, which parses the
       RENDERED strings and re-adds them up. Reading the props back would only prove this component
       can echo its own input; reading the text proves the column on screen reconciles. */
    <div className="border-t border-rule pt-5" data-receipt={totals.reconciled ? 'itemised' : 'residual'}>
      <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-1">Détail du montant</h3>

      <dl className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.key} data-receipt-row={row.key} data-receipt-sign={row.sign} className="flex items-start justify-between gap-4">
            <dt className="min-w-0 text-sm text-ink-2">
              {row.label}
              {row.detail && <span className="mt-0.5 block text-xs text-ink-3">{row.detail}</span>}
            </dt>
            <dd
              data-receipt-amount=""
              className={`shrink-0 font-display text-sm font-semibold tabular-nums ${
                row.sign === 'subtract' ? 'text-ok' : 'text-ink-1'
              }`}
            >
              {/* The sign is the point of the row: a reduction has to LOOK like one, in the
                  character and in the colour, or it reads as another charge. */}
              {row.sign === 'subtract' ? '−' : row.sign === 'add' ? '+' : ''}
              {money(row.amount)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
        <span data-receipt-total-label="" className="font-display text-base font-bold uppercase tracking-tight text-ink-1 sm:text-lg">
          {TOTAL_LABEL[lifecycle]}
        </span>
        <span data-receipt-total="" className="font-display text-xl font-bold tracking-tight tabular-nums text-brand sm:text-2xl">
          {money(totals.total)}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-3">{TOTAL_NOTE[lifecycle]}</p>
    </div>
  );
}
