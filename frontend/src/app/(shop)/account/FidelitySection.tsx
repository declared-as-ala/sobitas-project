'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getPointsHistory } from '@/services/api';
import { EARN_RATE, REDEEM_POINTS_PER_DT, CASHBACK_PERCENT } from '@/util/loyaltyPoints';
import type { PointsHistory, PointsTransaction } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Gift, TrendingUp, TrendingDown, Sparkles, History } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_META: Record<
  PointsTransaction['type'],
  { label: string; className: string }
> = {
  earn: {
    label: 'Gagnés',
    className:
      'border border-ok/40 bg-elevated text-ok',
  },
  redeem: {
    label: 'Utilisés',
    className:
      'border border-destructive/40 bg-elevated text-destructive',
  },
  adjustment: {
    label: 'Ajustement',
    className:
      'border border-rule bg-elevated text-ink-2',
  },
  expiry: {
    label: 'Expirés',
    className:
      'border border-warn/40 bg-elevated text-warn',
  },
};

function formatDate(value: string): string {
  try {
    return format(new Date(value), 'd MMMM yyyy', { locale: fr });
  } catch {
    return value;
  }
}

export function FidelitySection() {
  const { user } = useAuth();
  const [history, setHistory] = useState<PointsHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    getPointsHistory()
      .then((data) => {
        if (!ignore) setHistory(data);
      })
      .catch(() => {
        if (!ignore) setError('Impossible de charger votre historique de fidélité. Réessayez plus tard.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const transactions = history?.transactions ?? [];
  const balance = history?.balance ?? user?.points_balance ?? 0;
  const valueDt = history?.value_dt ?? user?.points_value_dt ?? balance / REDEEM_POINTS_PER_DT;

  return (
    <div className="space-y-6">
      <section className="pt-slab relative overflow-hidden rounded-2xl p-6 shadow-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(220,58,0,0.3),transparent_38%)]" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-brand">Cagnotte Protein.tn</p>
            <p className="mt-2 font-display text-4xl font-bold tracking-tight tabular-nums text-ink-1 sm:text-5xl">{balance.toLocaleString('fr-FR')} <span className="text-base text-brand">pts</span></p>
            <p className="mt-1 text-sm tabular-nums text-ink-3">Valeur disponible : {valueDt.toFixed(2)} DT</p>
          </div>
          <Image src="/member/protein-point-coin.webp" alt="Pièce fidélité Protein.tn" width={112} height={112} className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28" />
        </div>
      </section>

      <div className="flex items-start gap-2.5 rounded-xl border border-brand/20 bg-brand/5 p-3.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        <p className="text-[12.5px] leading-snug text-ink-2">
          Gagnez {EARN_RATE} point par DT de produits — soit {CASHBACK_PERCENT}% — et
          échangez {REDEEM_POINTS_PER_DT} points contre 1 DT de remise lors de votre prochaine
          commande. Le calcul reste basé sur le prix des produits avant l’utilisation de vos points, puis le serveur crédite la cagnotte après livraison.
        </p>
      </div>

      {/* Transactions history */}
      <Card className="rounded-xl border border-hairline bg-elevated shadow-sm overflow-hidden">
        <CardHeader className="border-b border-hairline">
          <CardTitle className="flex items-center gap-2 font-display uppercase tracking-tight text-lg text-ink-1">
            <History className="h-5 w-5 text-brand" aria-hidden="true" />
            Historique des points
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-brand">{error}</p>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center">
              <Gift className="mx-auto mb-3 h-10 w-10 text-ink-3" aria-hidden="true" />
              <p className="text-sm text-ink-3">
                Aucune transaction pour le moment. Passez une commande pour commencer à cumuler des points.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {transactions.map((tx) => {
                const meta = TYPE_META[tx.type] ?? TYPE_META.adjustment;
                const positive = tx.points >= 0;
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-3 rounded-xl border border-hairline bg-sunken p-3 sm:gap-4 sm:p-4"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        positive
                          ? 'bg-ok/10 text-ok'
                          : 'bg-brand/10 text-brand'
                      }`}
                    >
                      {positive ? (
                        <TrendingUp className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`font-display uppercase tracking-wide ${meta.className}`}>
                          {meta.label}
                        </Badge>
                        {tx.commande_id != null && (
                          <span className="text-xs text-ink-3">
                            Commande #{tx.commande_id}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-words text-sm text-ink-2">
                        {tx.description}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-3">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-display font-bold tracking-tight tabular-nums ${
                          positive ? 'text-ok' : 'text-brand'
                        }`}
                      >
                        {positive ? '+' : ''}
                        {tx.points} pts
                      </p>
                      <p className="text-xs tabular-nums text-ink-3">
                        Solde : {tx.balance_after}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
