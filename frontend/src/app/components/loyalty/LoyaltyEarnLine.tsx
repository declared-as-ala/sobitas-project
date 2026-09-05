'use client';

import Link from 'next/link';
import { Coins } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { pointsForSpend, pointsToDt, formatPoints, REDEEM_POINTS_PER_DT } from '@/util/loyaltyPoints';
import { formatTnd } from '@/util/productPrice';
import { cn } from '@/app/components/ui/utils';

/**
 * ── "GAGNEZ 179 POINTS" — THE LOYALTY PROGRAMME, WHERE THE DECISION IS MADE ─────────────────
 *
 * The programme was already complete before this component existed: a points ledger, a 5% earn
 * rate, a redemption slider in checkout, a balance and a full transaction history in the account.
 * All of it was reachable **only after logging in and opening the third tab of `/account`** —
 * that is, only by a customer who had already bought something and already knew.
 *
 * Nowhere on this site did the word "points" appear at the moment somebody decides to buy, and
 * nowhere did it appear as a reason to make an account. Which is the well-documented mistake:
 * the earning figure belongs next to the price, on the product page, above the add-to-cart —
 * where Sephora puts its tier counter and where Yotpo's guidance puts the badge.
 *
 * ── SO THIS RENDERS IN THREE PLACES AND SAYS TWO DIFFERENT THINGS ───────────────────────────
 * Signed in, it is a statement of fact: this basket pays you 8.95 DT.
 * Signed out, it is the offer: this basket WOULD pay you 8.95 DT, and here is the link.
 *
 * That second case is the entire commercial argument for the account, and it is the only honest
 * one this shop has — delivery, authenticity and cash-on-delivery are identical for a guest, so
 * a signup panel that lists those three is arguing for the shop, not for the account.
 *
 * ── HONESTY, WHICH IS LOAD-BEARING FOR A CASH-ON-DELIVERY SHOP ──────────────────────────────
 * Two things this deliberately does NOT do:
 *
 *   1. It never says "vous avez gagné". Points are credited when the order is **delivered**, and
 *      `title` carries that sentence on every instance. A customer who sees a number at checkout
 *      and no balance the next morning has been lied to by the UI.
 *   2. On a product it quotes `floor(price x qty)`, which is exact for a full-price order and an
 *      over-quote once a coupon lands. The checkout figure is computed after commercial savings
 *      but before loyalty redemption, so spending points never reduces the next reward.
 *
 * See `util/loyaltyPoints.ts` for why the base excludes delivery.
 */

/** Below this, the reward is worth less than a dinar and is not worth a row of the page. */
const REDEEM_FLOOR = REDEEM_POINTS_PER_DT;

const EARN_TITLE = 'Points crédités une fois la commande livrée. 20 points = 1 DT de remise.';

interface LoyaltyEarnLineProps {
  /** Goods amount in DT — price x quantity, or a cart subtotal excluding delivery. */
  amountDt: number;
  /**
   * `pdp` — a bordered chip under the price, the densest form.
   * `summary` — a borderless row for a cart or checkout total block, which already has its own box.
   */
  variant?: 'pdp' | 'summary';
  className?: string;
}

export function LoyaltyEarnLine({ amountDt, variant = 'pdp', className }: LoyaltyEarnLineProps) {
  const { isAuthenticated } = useAuth();
  const points = pointsForSpend(amountDt);

  // Under 20 points the reward rounds to less than 1 DT, and "gagnez 0.45 DT" reads as an insult
  // rather than an incentive. Below the threshold the programme is simply not mentioned.
  if (points < REDEEM_FLOOR) return null;

  const valueDt = pointsToDt(points);

  return (
    <div
      title={EARN_TITLE}
      className={cn(
        'flex items-center gap-2 text-[13px] leading-snug text-ink-2',
        variant === 'pdp' && 'w-full max-w-full rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 sm:w-fit',
        className
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-elevated text-brand">
        <Coins className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      </span>
      <p className="min-w-0">
        {isAuthenticated ? (
          <>
            <span className="font-semibold text-ink-1">Gagnez {formatPoints(points)}</span>{' '}
            <span aria-hidden="true">·</span>{' '}
            <span className="tabular-nums">{formatTnd(valueDt)}</span>
          </>
        ) : (
          <>
            <Link
              href="/register"
              className="-my-2 inline-flex min-h-11 items-center rounded font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Créez un compte
            </Link>{' '}
            <span aria-hidden="true"> · </span>
            <span className="font-semibold tabular-nums text-ink-1">{formatPoints(points)}</span>{' '}
            <span aria-hidden="true">·</span>{' '}
            <span className="tabular-nums">{formatTnd(valueDt)}</span>
          </>
        )}
      </p>
    </div>
  );
}
