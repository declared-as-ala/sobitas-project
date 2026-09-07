'use client';

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
import { ProtinaAmount, ProtinaMark } from '@/app/components/loyalty/Protina';

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
      {/* The coin was a fixed 96px at every width. At 320 that is 30% of the plate, and
          "Valeur disponible : 17.00 DT" wrapped onto a second line to make room for it — a
          decorative mark pushing the one number this panel exists to state. It steps down to
          64px below `sm`, which is still unmistakably the mark and returns 32px to the text. */}
      <section className="pt-slab relative overflow-hidden rounded-2xl p-5 shadow-card sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(220,58,0,0.3),transparent_38%)]" />
        <div className="relative flex items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-brand">Solde Protina</p>
            <p className="mt-2 font-display text-4xl font-bold tracking-tight tabular-nums text-ink-1 sm:text-5xl">{balance.toLocaleString('fr-FR')} <span className="text-base text-brand">Protinas</span></p>
            <p className="mt-1 whitespace-nowrap text-sm tabular-nums text-ink-3">Valeur disponible : {valueDt.toFixed(2)} DT</p>
          </div>
          <ProtinaMark size="lg" className="h-16 w-16 shrink-0 sm:h-24 sm:w-24 md:h-28 md:w-28" decorative={false} />
        </div>
      </section>

      {/*
        ── THE TWO RULES, AS TWO FACTS ────────────────────────────────────────────────────
        This was one paragraph carrying both rates and the caveat: 8 lines and 138px at 320,
        6 lines at 390. It sat between the balance and the history — the wall you scroll past
        — and it hid the only two numbers a member needs from it, because a rate written into
        running prose has to be read rather than seen.

        Same facts, same caveat, nothing removed. The two rates are now the two things you can
        see without reading, and the honesty note keeps its own line under a rule: the earn
        figure is computed BEFORE redemption and credited only on delivery, which is the
        sentence that stops "gagnez 5%" from being a promise this shop cannot keep.

        `min-[380px]` rather than `sm`, because the pair fits side by side well below 640 and
        stacking them to 768 wastes the width a phone does have.
      */}
      {/* `bg-elevated`, NOT `bg-brand/5`. The tinted plate is what the old paragraph used, and
          it was fine there because the text on it was `text-ink-2`. Putting the brand kicker on
          the same tint measured 4.21:1 against the required 4.5 — `measure-account` failed it
          before this shipped. DESIGN_SYSTEM's rule for exactly this: the colour lives in the
          border and the text, never in the plate. */}
      <div className="rounded-xl border border-brand/20 bg-elevated p-3.5">
        <dl className="grid gap-3 min-[380px]:grid-cols-2 min-[380px]:gap-4">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">Vous gagnez</dt>
              <dd className="mt-0.5 text-sm font-semibold leading-snug text-ink-1">{EARN_RATE} Protina par DT</dd>
              <dd className="mt-0.5 text-xs leading-snug text-ink-3">soit {CASHBACK_PERCENT}% du prix des produits</dd>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Gift className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand">Vous échangez</dt>
              <dd className="mt-0.5 text-sm font-semibold leading-snug text-ink-1">{REDEEM_POINTS_PER_DT} Protinas = 1 DT</dd>
              <dd className="mt-0.5 text-xs leading-snug text-ink-3">de remise sur votre prochaine commande</dd>
            </div>
          </div>
        </dl>
        <p className="mt-3 border-t border-hairline pt-2.5 text-xs leading-snug text-ink-3">
          Le calcul porte sur le prix des produits, avant l’utilisation de vos Protinas. Votre solde est crédité après la livraison.
        </p>
      </div>

      {/* Transactions history */}
      <Card className="rounded-xl border border-hairline bg-elevated shadow-sm overflow-hidden">
        <CardHeader className="border-b border-hairline">
          <CardTitle className="flex items-center gap-2 font-display uppercase tracking-tight text-lg text-ink-1">
            <History className="h-5 w-5 text-brand" aria-hidden="true" />
            Historique Protina
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
                Aucun mouvement pour le moment. Passez une commande pour commencer à gagner des Protinas.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 sm:space-y-2.5">
              {transactions.map((tx) => {
                const meta = TYPE_META[tx.type] ?? TYPE_META.adjustment;
                const positive = tx.points >= 0;
                return (
                  /*
                    ── THE DESCRIPTION GETS THE ROW, NOT A THIRD COLUMN OF IT ──────────────
                    Measured before: three columns — icon, text, amount — with the amount at
                    ~105px whatever the width, because "+249 Protinas" is fixed content. At 320
                    that left the description 56px, which is six characters:

                      320px   desc  56px /  9 lines   row 307px
                      390px   desc 126px /  3 lines   row 155px
                      768px   desc 456px /  1 line    row  99px

                    A 307px row for one transaction, and `break-words` on a 56px column split
                    "gagnées" into "gagnée" and "s". The layout only ever worked at 768.

                    Now the head row carries the two SHORT things — the type badge and the
                    figure — and the description spans the full width beneath them, with the
                    date, order and running balance folded into one wrapping meta line. Nothing
                    competes with prose for horizontal space at any width.
                  */
                  <li
                    key={tx.id}
                    className="rounded-xl border border-hairline bg-sunken p-3 sm:p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${
                          positive
                            ? 'bg-ok/10 text-ok'
                            : 'bg-brand/10 text-brand'
                        }`}
                      >
                        {positive ? (
                          <TrendingUp className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <Badge className={`font-display uppercase tracking-wide ${meta.className}`}>
                            {meta.label}
                          </Badge>
                          {/* `compact` — the word "Protinas" is already on the card title, the
                              balance above and the coin to its left. See Protina.tsx. */}
                          <span
                            className={`shrink-0 font-display text-sm font-bold tracking-tight tabular-nums ${
                              positive ? 'text-ok' : 'text-brand'
                            }`}
                          >
                            <ProtinaAmount value={tx.points} signed compact />
                          </span>
                        </div>

                        <p className="mt-1.5 text-sm leading-snug text-ink-2">
                          {tx.description}
                        </p>

                        {/* One wrapping meta line instead of a date row plus a right-hand
                            balance column. The separators are decorative, so they are hidden
                            from assistive technology rather than read out as "middle dot". */}
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs tabular-nums text-ink-3">
                          <span>{formatDate(tx.created_at)}</span>
                          {tx.commande_id != null && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Commande #{tx.commande_id}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>Solde&nbsp;{tx.balance_after}</span>
                        </p>
                      </div>
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
