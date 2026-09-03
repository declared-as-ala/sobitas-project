import Image from 'next/image';
import { BadgeCheck, Mail, Smartphone, ShieldCheck } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

/** Brand-native artwork: existing P asset + the site's monoline icon system.
 * No illustration download, animation, or text embedded in an image. */
export function VerificationArtwork({ kind = 'phone', compact = false }: {
  kind?: 'phone' | 'email' | 'success'; compact?: boolean;
}) {
  const Icon = kind === 'email' ? Mail : kind === 'success' ? ShieldCheck : Smartphone;
  return (
    <div aria-hidden="true" className={cn('relative mx-auto flex items-center justify-center', compact ? 'h-16 w-24' : 'h-72 w-72')}>
      <div className={cn('absolute rotate-6 rounded-3xl border border-brand/20 bg-brand/5', compact ? 'h-12 w-20' : 'h-52 w-64')} />
      <div className={cn('relative flex -rotate-3 items-center justify-center rounded-2xl border border-hairline bg-elevated shadow-sm', compact ? 'h-14 w-20 gap-1' : 'h-44 w-60 gap-5')}>
        <Image src="/favicon-192x192.png" alt="" width={64} height={64} className={compact ? 'h-7 w-7 object-contain' : 'h-16 w-16 object-contain'} />
        <span className="h-1/2 w-px bg-rule" />
        <Icon className={cn(kind === 'success' ? 'text-ok' : 'text-brand', compact ? 'h-7 w-7' : 'h-20 w-20')} strokeWidth={1.5} />
      </div>
      {!compact && <>
        <span className="absolute start-1 top-6 h-2 w-2 rounded-full bg-brand" />
        <span className="absolute end-1 bottom-7 h-2 w-8 rounded-full bg-brand/30" />
        <span className="absolute end-2 top-9 h-3 w-3 rounded-full border border-brand/50" />
      </>}
    </div>
  );
}

export function VerificationPanel({ kind }: { kind: 'phone' | 'email' | 'success' }) {
  return <div className="flex h-full flex-col items-center justify-center bg-sunken p-8 text-center">
    <VerificationArtwork kind={kind} />
    <p className="font-display text-2xl font-bold uppercase tracking-tight text-ink-1">{kind === 'success' ? 'Bienvenue dans l’équipe' : 'Votre compte, bien à vous'}</p>
    <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-2">{kind === 'success' ? 'Votre statut et vos points vous suivent dans votre espace client.' : 'Un code personnel pour confirmer vos coordonnées et protéger votre compte.'}</p>
  </div>;
}

/** This verifies contact ownership, never identity or purchase history. */
export function VerifiedContactBadge({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/40 bg-elevated px-2.5 py-1 text-xs font-semibold text-ok">
    <BadgeCheck className="h-4 w-4 shrink-0" aria-hidden="true" />{label}
  </span>;
}

export function VerifiedAvatar({ name }: { name: string }) {
  return <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-elevated font-display text-lg font-bold text-brand" aria-hidden="true">
    {name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('fr-FR')}
    <BadgeCheck className="absolute -bottom-1 -end-1 h-5 w-5 rounded-full bg-elevated text-ok" />
  </span>;
}
