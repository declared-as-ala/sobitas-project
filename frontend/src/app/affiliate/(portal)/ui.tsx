'use client';

import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';
import type { OrderTone } from '@/services/affiliatePortal';

/** Status chips carry their colour in the border + text, never a tinted plate (DS §status). */
export const TONE: Record<OrderTone, string> = {
  ok: 'border-ok/40 text-ok',
  warn: 'border-warn/40 text-warn',
  destructive: 'border-destructive/40 text-destructive',
  brand: 'border-brand/40 text-brand',
  info: 'border-hairline text-ink-2',
  neutral: 'border-hairline text-ink-2',
};

export function StatusBadge({ label, tone }: { label: string; tone: OrderTone }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border bg-elevated px-2.5 py-0.5 text-xs font-semibold', TONE[tone])}>
      {label}
    </span>
  );
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** A compact labelled figure for the summary strips above commissions / payments. */
export function SummaryStat({ label, value, accent }: { label: string; value: string; accent?: 'ok' | 'warn' | 'brand' }) {
  return (
    <div className="rounded-xl border border-hairline bg-elevated p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</p>
      <p className={cn(
        'mt-1 font-display text-lg font-bold tabular-nums',
        accent === 'ok' ? 'text-ok' : accent === 'warn' ? 'text-warn' : accent === 'brand' ? 'text-brand' : 'text-ink-1',
      )}>
        {value}
      </p>
    </div>
  );
}

/** Shared empty / error / skeleton frames so every list page reads the same. */
export function ListError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-elevated p-5 text-ink-2">
      <div>
        <p className="font-semibold text-ink-1">{message}</p>
        <button type="button" onClick={onRetry} className="text-sm font-semibold text-brand hover:text-brand-hover">Réessayer</button>
      </div>
    </div>
  );
}

export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-hairline bg-elevated p-4">
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-sunken" />
          <div className="ml-auto h-4 w-20 animate-pulse rounded bg-sunken" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-rule bg-elevated px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">{icon}</span>
      <h2 className="mt-4 font-display text-lg font-bold text-ink-1">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-2">{description}</p>
    </div>
  );
}
