import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';
import type { Order } from '@/types';
import { ProtinaAmount } from './Protina';

export function OrderProtinaSummary({ order }: { order: Order }) {
  const movement = order.protina;
  if (!movement || (movement.spent <= 0 && movement.earned <= 0 && movement.pending <= 0)) return null;
  const incoming = movement.earned || movement.pending;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/20 bg-elevated p-5 pr-24 shadow-sm" aria-labelledby="order-protina-title">
      <Image src="/member/protina-checkout-v1.webp" alt="" width={112} height={112} className="pointer-events-none absolute -bottom-5 -right-4 h-28 w-28 object-contain opacity-80" aria-hidden="true" />
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Solde sécurisé</p>
      <h2 id="order-protina-title" className="mt-1 font-display text-lg font-bold uppercase tracking-tight text-ink-1">Mouvement Protina</h2>
      <div className="mt-4 space-y-2 text-sm">
        {movement.spent > 0 && <div className="flex items-center justify-between gap-3"><span className="text-ink-2">Utilisées maintenant</span><ProtinaAmount value={-movement.spent} className="font-bold text-brand" /></div>}
        {incoming > 0 && <div className="flex items-center justify-between gap-3"><span className="text-ink-2">{movement.earned > 0 ? 'Créditées' : 'Après livraison'}</span><ProtinaAmount value={incoming} signed className="font-bold text-ok" /></div>}
      </div>
      <p className="mt-4 flex items-start gap-2 border-t border-hairline pt-3 text-xs leading-relaxed text-ink-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" />Le serveur débite chaque commande une seule fois.</p>
    </section>
  );
}
