import Image from 'next/image';
import { ArrowRight, BadgeCheck, CircleDollarSign, Gift, Mail, ShieldCheck, Smartphone } from 'lucide-react';
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

export function RegistrationPanel() {
  return <div className="pt-slab relative flex h-full flex-col justify-between overflow-hidden p-8 text-ink-1 lg:p-10">
    <div aria-hidden="true" className="absolute -end-20 -top-24 h-72 w-72 rounded-full border border-brand/30" />
    <div aria-hidden="true" className="absolute -end-8 top-14 grid grid-cols-5 gap-2 opacity-60">
      {Array.from({ length: 20 }).map((_, index) => <span key={index} className="h-1 w-1 rounded-full bg-brand" />)}
    </div>
    <div className="relative z-10">
      <span className="pt-kicker text-brand-300">Bienvenue chez Protein.tn</span>
      <h2 className="mt-4 max-w-md font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
        Votre compte.<br /><span className="text-brand-300">Vos avantages.</span>
      </h2>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-2">
        Confirmez votre téléphone en quelques secondes et recevez votre cadeau de bienvenue.
      </p>
    </div>
    <div className="relative z-10 my-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <div className="rounded-2xl border border-hairline bg-elevated p-4">
        <CircleDollarSign className="h-6 w-6 text-brand-300" aria-hidden="true" />
        <strong className="mt-3 block font-display text-2xl">15 DT offerts</strong>
        <span className="mt-1 block text-xs text-ink-2">300 points après vérification</span>
      </div>
      <div className="rounded-2xl border border-hairline bg-elevated p-4">
        <ShieldCheck className="h-6 w-6 text-ok" aria-hidden="true" />
        <strong className="mt-3 block font-display text-lg">Compte protégé</strong>
        <span className="mt-1 block text-xs text-ink-2">Code SMS personnel de 3 minutes</span>
      </div>
    </div>
    <div className="relative z-10 flex items-center gap-3 rounded-2xl bg-brand p-4 text-on-brand">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-elevated text-brand"><Gift className="h-5 w-5" /></span>
      <div><strong className="block font-display uppercase">Simple et immédiat</strong><span className="mt-0.5 flex items-center gap-1 text-xs opacity-80">Compte <ArrowRight className="h-3 w-3" /> SMS <ArrowRight className="h-3 w-3" /> cadeau crédité</span></div>
    </div>
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
