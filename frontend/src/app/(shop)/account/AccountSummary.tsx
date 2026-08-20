'use client';

import Link from 'next/link';
import { Coins, PackageCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  pointsToDt,
  formatPoints,
  REDEEM_POINTS_PER_DT,
  CASHBACK_PERCENT,
} from '@/util/loyaltyPoints';
import { formatTnd } from '@/util/productPrice';

/**
 * ── THE ACCOUNT'S ANSWER TO "WHAT DO I HAVE HERE?" ──────────────────────────────────────────
 *
 * `/account` opened onto the Profil tab — a form with the customer's own name already in it. So
 * the first thing the page said to somebody who had just logged in was "here is what you typed
 * when you registered", and the two facts they came for (what am I owed, and where is my order)
 * were each one click away behind a tab.
 *
 * This strip sits above the tabs and stays visible on all three of them, because both numbers are
 * true regardless of which tab is open and neither belongs to any one of them.
 *
 * ── THE BALANCE IS THE HEADLINE, AND IT IS SHOWN IN BOTH UNITS ──────────────────────────────
 * A points balance is a currency nobody has an intuition for. "340 points" means nothing until it
 * is also "17 DT", so it is always both — the same pairing `FidelitySection` makes, from the same
 * helper, so the two cannot drift.
 *
 * The CTA is conditional on purpose. Below `REDEEM_POINTS_PER_DT` a balance cannot buy a single
 * dinar of discount, so "utiliser mes points" would lead to a checkout that refuses to spend them
 * — the slider's own step is 20. Under the threshold the strip states the earn rate instead, which
 * is the useful thing to say to somebody with nothing to spend yet.
 */
export function AccountSummary() {
  const { user, orders, ordersLoading } = useAuth();

  const balance = user?.points_balance ?? 0;
  const valueDt = user?.points_value_dt ?? pointsToDt(balance);
  const orderCount = Array.isArray(orders) ? orders.length : 0;
  const canRedeem = balance >= REDEEM_POINTS_PER_DT;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-card">
      {/* `divide-y` below `sm`, `divide-x` above: one component, two reading orders. Stacked rows
          on a phone read as a list; side-by-side cells on a desktop read as a dashboard, and the
          rule between them is the separation — never a gap. */}
      <div className="divide-y divide-hairline sm:flex sm:divide-x sm:divide-y-0">
        <div className="flex items-center gap-3.5 p-4 sm:flex-1 sm:p-5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"
            aria-hidden="true"
          >
            <Coins className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Solde fidélité
            </p>
            <p className="font-display text-2xl font-bold leading-tight tracking-tight tabular-nums text-ink-1">
              {formatPoints(balance)}
            </p>
            <p className="text-[12.5px] tabular-nums text-ink-3">≈ {formatTnd(valueDt)} de remise</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 sm:flex-1 sm:p-5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"
            aria-hidden="true"
          >
            <PackageCheck className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Commandes
            </p>
            {ordersLoading ? (
              <Skeleton className="mt-1 h-7 w-16 rounded-lg" />
            ) : (
              <p className="font-display text-2xl font-bold leading-tight tracking-tight tabular-nums text-ink-1">
                {orderCount}
              </p>
            )}
            <p className="text-[12.5px] text-ink-3">
              {orderCount === 1 ? 'commande passée' : 'commandes passées'}
            </p>
          </div>
        </div>

        <div className="flex items-center p-4 sm:w-[15.5rem] sm:shrink-0 sm:p-5">
          {canRedeem ? (
            <Link
              href="/shop"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 font-display text-[13px] font-bold uppercase tracking-[0.06em] text-on-brand transition-[background-color,transform] duration-150 hover:bg-brand-hover active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Utiliser mes points
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <p className="text-[12.5px] leading-snug text-ink-3">
              Chaque commande livrée vous rapporte{' '}
              <span className="font-semibold text-ink-1">{CASHBACK_PERCENT}%</span> de son montant
              en points, à déduire de la suivante.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
