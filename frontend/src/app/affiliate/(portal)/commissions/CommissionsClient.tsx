'use client';

import { useCallback, useEffect, useState } from 'react';
import { Percent, ChevronLeft, ChevronRight } from 'lucide-react';
import { fmtDT, getAffiliateCommissions, type AffiliateCommissionsPage } from '@/services/affiliatePortal';
import { StatusBadge, fmtDate, SummaryStat, ListError, RowsSkeleton, EmptyState } from '../ui';

export function CommissionsClient() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AffiliateCommissionsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback((p: number) => {
    setLoading(true);
    setError(false);
    getAffiliateCommissions(p).then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(page); }, [page, load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-1 sm:text-3xl">Mes commissions</h1>
        <p className="mt-1 text-sm text-ink-2">Vos gains, de la promesse à la commande jusqu’au versement.</p>
      </div>

      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryStat label="En attente de livraison" value={fmtDT(data.summary.pending)} accent="warn" />
          <SummaryStat label="Confirmées" value={fmtDT(data.summary.confirmed)} accent="brand" />
          <SummaryStat label="Déjà payées" value={fmtDT(data.summary.paid)} accent="ok" />
        </div>
      )}

      {error ? (
        <ListError message="Impossible de charger vos commissions." onRetry={() => load(page)} />
      ) : loading ? (
        <RowsSkeleton />
      ) : data && data.data.length === 0 ? (
        <EmptyState
          icon={<Percent className="h-7 w-7" aria-hidden />}
          title="Aucune commission pour le moment"
          description="Vos commissions apparaîtront ici dès votre première commande. Elles sont confirmées après la livraison."
        />
      ) : data ? (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-hairline bg-elevated md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                  <th className="px-4 py-3">Type / Date</th>
                  <th className="px-4 py-3">Détail</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                  <th className="px-4 py-3 text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((c) => (
                  <tr key={c.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-1">{c.type_label}</div>
                      <div className="text-xs text-ink-3">{fmtDate(c.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {c.commande && <span className="mr-2 rounded bg-sunken px-1.5 py-0.5 text-xs font-semibold text-ink-2">Cmd {c.commande}</span>}
                      <span className="text-xs">{c.description}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-brand">{fmtDT(c.amount)}</td>
                    <td className="px-4 py-3 text-right"><StatusBadge label={c.status_label} tone={c.status_tone} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {data.data.map((c) => (
              <div key={c.id} className="rounded-xl border border-hairline bg-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink-1">{c.type_label}</div>
                    <div className="text-xs text-ink-3">{fmtDate(c.created_at)}{c.commande ? ` · Cmd ${c.commande}` : ''}</div>
                  </div>
                  <StatusBadge label={c.status_label} tone={c.status_tone} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                  <span className="text-xs text-ink-3">{c.description}</span>
                  <span className="font-semibold tabular-nums text-brand">{fmtDT(c.amount)}</span>
                </div>
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

export function Pager({ page, last, onPrev, onNext }: { page: number; last: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" disabled={page <= 1} onClick={onPrev} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-hairline bg-elevated px-3 text-sm font-semibold text-ink-2 transition-colors hover:text-ink-1 disabled:opacity-40">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Précédent
      </button>
      <span className="px-2 text-sm text-ink-2">Page {page} / {last}</span>
      <button type="button" disabled={page >= last} onClick={onNext} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-hairline bg-elevated px-3 text-sm font-semibold text-ink-2 transition-colors hover:text-ink-1 disabled:opacity-40">
        Suivant <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
