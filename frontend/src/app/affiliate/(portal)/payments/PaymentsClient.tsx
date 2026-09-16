'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Hash } from 'lucide-react';
import { fmtDT, getAffiliatePayments, type AffiliatePaymentsPage } from '@/services/affiliatePortal';
import { StatusBadge, fmtDate, SummaryStat, ListError, RowsSkeleton, EmptyState } from '../ui';
import { Pager } from '../commissions/CommissionsClient';

export function PaymentsClient() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AffiliatePaymentsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback((p: number) => {
    setLoading(true);
    setError(false);
    getAffiliatePayments(p).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(page); }, [page, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-1 sm:text-3xl">Mes paiements</h1>
        <p className="mt-1 text-sm text-ink-2">L’historique des versements effectués sur votre compte.</p>
      </div>

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryStat label="Total versé" value={fmtDT(data.summary.paid)} accent="ok" />
          <SummaryStat label="Versement en préparation" value={fmtDT(data.summary.pending)} accent="warn" />
        </div>
      )}

      {error ? (
        <ListError message="Impossible de charger vos paiements." onRetry={() => load(page)} />
      ) : loading ? (
        <RowsSkeleton />
      ) : data && data.data.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-7 w-7" aria-hidden />}
          title="Aucun versement pour le moment"
          description="Vos versements apparaîtront ici. Les commissions confirmées sont réglées lors du prochain paiement."
        />
      ) : data ? (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-hairline bg-elevated md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((p) => (
                  <tr key={p.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-1">{fmtDate(p.paid_at ?? p.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {p.reference ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-ink-2"><Hash className="h-3.5 w-3.5 text-ink-3" aria-hidden />{p.reference}</span>
                      ) : <span className="text-ink-3">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink-1">{fmtDT(p.amount)}</td>
                    <td className="px-4 py-3 text-right"><StatusBadge label={p.status_label} tone={p.status_tone} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {data.data.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-elevated p-4">
                <div>
                  <div className="font-semibold text-ink-1">{fmtDT(p.amount)}</div>
                  <div className="text-xs text-ink-3">{fmtDate(p.paid_at ?? p.created_at)}{p.reference ? ` · ${p.reference}` : ''}</div>
                </div>
                <StatusBadge label={p.status_label} tone={p.status_tone} />
              </div>
            ))}
          </div>

          {data.meta.last_page > 1 && (
            <Pager page={data.meta.current_page} last={data.meta.last_page} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => p + 1)} />
          )}
        </>
      ) : null}
    </div>
  );
}
