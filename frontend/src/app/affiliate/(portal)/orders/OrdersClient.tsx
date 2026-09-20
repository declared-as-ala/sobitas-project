'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Package, ShoppingBag, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import {
  getAffiliateOrders, fmtDT, type AffiliateOrder, type AffiliateOrdersPage,
} from '@/services/affiliatePortal';
import { StatusBadge, fmtDate } from '../ui';

export function OrdersClient() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AffiliateOrdersPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback((p: number) => {
    setLoading(true);
    setError(false);
    getAffiliateOrders(p)
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-1 sm:text-3xl">Mes commandes</h1>
          <p className="mt-1 text-sm text-ink-2">
            {data ? `${data.meta.total} commande(s) au total` : 'Vos commandes affiliées'}
          </p>
        </div>
        <LinkWithLoading
          href="/affiliate/orders/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-display text-[13.5px] font-bold uppercase tracking-[0.06em] text-on-brand shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Plus className="h-4 w-4" aria-hidden /> Nouvelle commande
        </LinkWithLoading>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-elevated p-5 text-ink-2">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <div>
            <p className="font-semibold text-ink-1">Impossible de charger vos commandes.</p>
            <button type="button" onClick={() => load(page)} className="text-sm font-semibold text-brand hover:text-brand-hover">
              Réessayer
            </button>
          </div>
        </div>
      ) : loading ? (
        <OrdersSkeleton />
      ) : data && data.data.length === 0 ? (
        <EmptyOrders />
      ) : data ? (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-hairline bg-elevated md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                  <th className="px-4 py-3">N° / Date</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 text-center">Articles</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((o) => (
                  <tr key={o.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-1">{o.numero}</div>
                      <div className="text-xs text-ink-3">{fmtDate(o.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink-1">{o.customer ?? '—'}</div>
                      <div className="text-xs text-ink-3">{[o.ville, o.phone].filter(Boolean).join(' · ') || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-ink-2">{o.items_count}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-1">{fmtDT(o.total)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-brand">{fmtDT(o.commission)}</td>
                    <td className="px-4 py-3 text-right"><StatusBadge label={o.status_label} tone={o.status_tone} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {data.data.map((o) => (
              <div key={o.id} className="rounded-xl border border-hairline bg-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink-1">{o.numero}</div>
                    <div className="text-xs text-ink-3">{fmtDate(o.created_at)}</div>
                  </div>
                  <StatusBadge label={o.status_label} tone={o.status_tone} />
                </div>
                <div className="mt-3 text-sm text-ink-2">{o.customer ?? '—'}{o.ville ? ` · ${o.ville}` : ''}</div>
                <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3 text-sm">
                  <span className="text-ink-3">{o.items_count} article(s)</span>
                  <div className="flex items-center gap-4">
                    <span className="tabular-nums text-ink-1">{fmtDT(o.total)}</span>
                    <span className="font-semibold tabular-nums text-brand">+{fmtDT(o.commission)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {data.meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-hairline bg-elevated px-3 text-sm font-semibold text-ink-2 transition-colors hover:text-ink-1 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> Précédent
              </button>
              <span className="px-2 text-sm text-ink-2">Page {data.meta.current_page} / {data.meta.last_page}</span>
              <button
                type="button"
                disabled={page >= data.meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-hairline bg-elevated px-3 text-sm font-semibold text-ink-2 transition-colors hover:text-ink-1 disabled:opacity-40"
              >
                Suivant <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-rule bg-elevated px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
        <ShoppingBag className="h-7 w-7" aria-hidden />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold text-ink-1">Aucune commande pour le moment</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-2">
        Créez votre première commande pour votre client : choisissez les produits, fixez votre prix, et suivez votre commission ici.
      </p>
      <LinkWithLoading
        href="/affiliate/orders/new"
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-display text-[13.5px] font-bold uppercase tracking-[0.06em] text-on-brand shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Plus className="h-4 w-4" aria-hidden /> Créer une commande
      </LinkWithLoading>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-hairline bg-elevated p-4">
          <Package className="h-5 w-5 text-ink-3/40" aria-hidden />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-sunken" />
          <div className="ml-auto h-4 w-20 animate-pulse rounded bg-sunken" />
        </div>
      ))}
    </div>
  );
}
