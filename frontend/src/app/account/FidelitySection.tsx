'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPointsHistory } from '@/services/api';
import type { PointsHistory, PointsTransaction } from '@/types';
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
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900',
  },
  redeem: {
    label: 'Utilisés',
    className:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
  },
  adjustment: {
    label: 'Ajustement',
    className:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  },
  expiry: {
    label: 'Expirés',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
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

  // Prefer the freshly fetched balance; fall back to the profile balance while loading.
  const balance = history?.balance ?? user?.points_balance ?? 0;
  const valueDt = history?.value_dt ?? user?.points_value_dt ?? balance / 20;
  const transactions = history?.transactions ?? [];

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <Card className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="flex items-center gap-2 font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">
            <Gift className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            Programme de fidélité
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-wrap gap-6">
              <Skeleton className="h-16 w-40 rounded-xl" />
              <Skeleton className="h-16 w-40 rounded-xl" />
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Votre solde</p>
                <p className="font-display font-bold tracking-tight tabular-nums text-3xl sm:text-4xl text-red-600 dark:text-red-400">
                  {balance} <span className="text-lg text-gray-500 dark:text-gray-400">points</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Valeur</p>
                <p className="font-display font-bold tracking-tight tabular-nums text-2xl sm:text-3xl text-gray-900 dark:text-white">
                  {valueDt.toFixed(2)} <span className="text-base text-gray-500 dark:text-gray-400">DT</span>
                </p>
              </div>
            </div>
          )}
          <div className="mt-5 flex items-start gap-2 p-3 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
            <Sparkles className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs leading-snug text-gray-600 dark:text-gray-400">
              Gagnez 1 point par DT dépensé, et échangez 20 points contre 1 DT de remise lors de votre prochaine commande.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transactions history */}
      <Card className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="flex items-center gap-2 font-display uppercase tracking-tight text-lg text-gray-900 dark:text-white">
            <History className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
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
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center">
              <Gift className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        positive
                          ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400'
                          : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
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
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Commande #{tx.commande_id}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words">
                        {tx.description}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-display font-bold tracking-tight tabular-nums ${
                          positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {positive ? '+' : ''}
                        {tx.points} pts
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
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
