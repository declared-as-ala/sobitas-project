'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Wallet, Clock, TrendingUp, ShoppingBag, Trophy, Banknote, Share2, Copy, Check, Link2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAffiliateDashboard, fmtDT, type AffiliateDashboard } from '@/services/affiliatePortal';
import { cn } from '@/app/components/ui/utils';

export function AffiliateDashboardClient() {
  const { user } = useAuth();
  const [data, setData] = useState<AffiliateDashboard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    getAffiliateDashboard()
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  const firstName = (user?.name ?? '').trim().split(' ')[0] || 'à vous';

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-elevated p-5 text-ink-2">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
        <div>
          <p className="font-semibold text-ink-1">Impossible de charger votre tableau de bord.</p>
          <p className="text-sm">Vérifiez votre connexion et réessayez.</p>
        </div>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const { balances, this_month, orders, chart, referral, next_payout } = data;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-1 sm:text-3xl">
          Bonjour {firstName}
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          Prochain versement <span className="font-semibold text-ink-1">vendredi {next_payout}</span>.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Payable maintenant"
          value={fmtDT(balances.payable)}
          hint={balances.held > 0 ? `${fmtDT(balances.held)} en attente de remise` : 'Prêt pour le prochain versement'}
          Icon={Wallet}
          tone="ok"
        />
        <Kpi
          label="En attente de livraison"
          value={fmtDT(balances.pending)}
          hint="Confirmé après livraison"
          Icon={Clock}
          tone="warn"
        />
        <Kpi
          label="Gagné ce mois"
          value={fmtDT(this_month.earnings)}
          hint={`${this_month.orders} commande(s) ce mois`}
          Icon={TrendingUp}
          tone="brand"
        />
        <Kpi
          label="Mes commandes"
          value={String(orders.total)}
          hint={`${orders.delivered} livrée(s) · ${orders.open} en cours`}
          Icon={ShoppingBag}
          tone="ink"
        />
      </div>

      {/* Chart + referral */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-hairline bg-elevated p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-2">Vos gains — 6 derniers mois</h2>
            <span className="text-xs text-ink-3">confirmé (DT)</span>
          </div>
          <EarningsChart labels={chart.labels} values={chart.confirmed} />
        </section>

        <ReferralCard referral={referral} />
      </div>

      {/* Balances strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat label="Solde confirmé" value={fmtDT(balances.confirmed)} Icon={Banknote} />
        <MiniStat label="Total gagné" value={fmtDT(balances.earned)} Icon={Trophy} />
        <MiniStat label="Total payé" value={fmtDT(balances.paid)} Icon={Wallet} />
      </div>
    </div>
  );
}

const TONES = {
  ok: 'text-ok bg-ok/10',
  warn: 'text-warn bg-warn/10',
  brand: 'text-brand bg-brand/10',
  ink: 'text-ink-2 bg-sunken',
} as const;

function Kpi({
  label, value, hint, Icon, tone,
}: { label: string; value: string; hint: string; Icon: typeof Wallet; tone: keyof typeof TONES }) {
  return (
    <div className="rounded-xl border border-hairline bg-elevated p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</span>
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', TONES[tone])}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-display text-xl font-extrabold tracking-tight text-ink-1 tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-ink-3">{hint}</p>
    </div>
  );
}

function MiniStat({ label, value, Icon }: { label: string; value: string; Icon: typeof Wallet }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline bg-elevated p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sunken text-ink-2">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</p>
        <p className="font-display text-base font-bold text-ink-1 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function EarningsChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(1, ...values);
  const W = 100;
  const H = 42;
  const gap = 4;
  const n = Math.max(1, values.length);
  const bw = (W - gap * (n - 1)) / n;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-40 w-full text-brand" role="img" aria-label="Gains confirmés par mois">
        {values.map((v, i) => {
          const h = (v / max) * (H - 4);
          const x = i * (bw + gap);
          const y = H - h;
          return <rect key={i} x={x} y={y} width={bw} height={Math.max(h, 0.6)} rx={1} fill="currentColor" opacity={v > 0 ? 1 : 0.18} />;
        })}
      </svg>
      <div className="mt-2 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
        {labels.map((l, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-ink-3">{l}</div>
        ))}
      </div>
    </div>
  );
}

function ReferralCard({ referral }: { referral: AffiliateDashboard['referral'] }) {
  const hasAny = Boolean(referral.link || referral.code);

  const copy = (text: string, what: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast.success(`${what} copié`));
    }
  };

  return (
    <section className="rounded-xl border border-hairline bg-elevated p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand">
          <Share2 className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-sm font-bold text-ink-1">Vos outils de parrainage</h2>
      </div>

      {hasAny ? (
        <div className="space-y-3">
          {referral.link && (
            <CopyRow label="Votre lien" value={referral.link} onCopy={() => copy(referral.link!, 'Lien')} mono={false} />
          )}
          {referral.code && (
            <CopyRow label="Votre code promo" value={referral.code} onCopy={() => copy(referral.code!, 'Code')} mono />
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-rule bg-canvas p-4">
          <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <p className="text-sm text-ink-2">
            Votre lien de parrainage sera activé après la validation de votre compte.
          </p>
        </div>
      )}

      {referral.reference && (
        <p className="mt-4 text-xs text-ink-3">
          Référence affilié : <span className="font-semibold text-ink-2">{referral.reference}</span>
        </p>
      )}
    </section>
  );
}

function CopyRow({ label, value, onCopy, mono }: { label: string; value: string; onCopy: () => void; mono: boolean }) {
  const [done, setDone] = useState(false);
  const click = () => {
    onCopy();
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</p>
      <div className="flex items-center gap-2">
        <span className={cn('min-w-0 flex-1 truncate rounded-lg border border-hairline bg-canvas px-3 py-2 text-sm text-ink-1', mono && 'font-mono tracking-wide text-brand')}>
          {value}
        </span>
        <button
          type="button"
          onClick={click}
          className={cn('inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-on-brand transition-colors', done ? 'bg-ok' : 'bg-brand hover:bg-brand-hover')}
        >
          {done ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">{done ? 'Copié' : 'Copier'}</span>
        </button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-8 w-48 animate-pulse rounded bg-sunken" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-hairline bg-elevated" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-56 animate-pulse rounded-xl border border-hairline bg-elevated lg:col-span-2" />
        <div className="h-56 animate-pulse rounded-xl border border-hairline bg-elevated" />
      </div>
    </div>
  );
}
