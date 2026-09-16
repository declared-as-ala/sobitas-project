import { Clock } from 'lucide-react';

export function AffiliateComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink-1 sm:text-3xl">{title}</h1>
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-rule bg-elevated p-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
          <Clock className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-ink-1">Bientôt disponible</p>
          <p className="mt-1 text-sm text-ink-2">{description}</p>
        </div>
      </div>
    </div>
  );
}
