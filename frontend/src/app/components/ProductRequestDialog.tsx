'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Loader2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/app/components/ui/sheet';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ComparisonProductImage } from '@/app/components/product/ComparisonProductImage';
import { getSimilarProducts, sendContact } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { buildComparison } from '@/util/productComparison';
import { getProductPrimarySubCategory } from '@/util/productUrl';
import { formatTnd } from '@/util/productPrice';
import type { Product } from '@/types';

export interface ProductRequestDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; product: Product;
  productName: string; productPath?: string; priceText?: string; alternatives?: Product[];
}

/** One bounded fetch on opening a card; PDP reuses its server-rendered alternatives. */
export function ProductRequestDialog({ open, onOpenChange, product, productName, productPath, priceText, alternatives }: ProductRequestDialogProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState(alternatives ?? []);
  const [loading, setLoading] = useState(alternatives === undefined);
  const [loadError, setLoadError] = useState(false);
  const [step, setStep] = useState<'alternatives' | 'form' | 'sent'>('alternatives');
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [note, setNote] = useState('');
  const [company, setCompany] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const firstField = useRef<HTMLInputElement>(null);
  const sentHeading = useRef<HTMLParagraphElement>(null);
  const subId = getProductPrimarySubCategory(product)?.id || product.sous_categorie_id;
  useEffect(() => {
    if (!open || alternatives !== undefined) return;
    let active = true;
    if (!subId) { setLoading(false); return; }
    getSimilarProducts(subId).then(result => { if (active) setProducts(result.products); })
      .catch(() => { if (active) setLoadError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, subId, alternatives]);
  useEffect(() => { if (step === 'form') firstField.current?.focus(); if (step === 'sent') sentHeading.current?.focus(); }, [step]);
  const rows = buildComparison(product, products, 3).filter(row => !row.isCurrent);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (sending) return;
    if (!/^(?=(?:\D*\d){8,15}\D*$)[+0-9 ()-]{8,25}$/.test(phone.trim())) { setError('Indiquez un numéro de téléphone valide.'); return; }
    setError(''); setSending(true);
    try {
      await sendContact({ name: name.trim(), email: email.trim(), phone: phone.trim(), product_id: product.id, company,
        subject: 'Demande de produit', message: note.trim() || 'Je souhaite connaître le prix et le délai de ce produit.' });
      setStep('sent');
    } catch (e) {
      const data = (e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }).response?.data;
      setError(Object.values(data?.errors ?? {}).flat()[0] || 'Envoi impossible. Vos informations sont conservées : réessayez ou appelez le 27 612 500.');
    } finally { setSending(false); }
  };
  return <Sheet open={open} onOpenChange={next => { if (!sending) onOpenChange(next); }}>
    <SheetContent side="bottom" showCloseButton={false} style={{ backgroundColor: 'rgb(var(--c-elevated))' }} className="max-h-[94dvh] gap-0 overflow-hidden rounded-t-2xl border-hairline bg-elevated sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-dvh sm:w-full sm:max-w-xl sm:rounded-none">
      <SheetHeader className="shrink-0 border-b border-hairline p-4 pe-16 text-left sm:p-5 sm:pe-16">
        <SheetTitle className="font-display text-2xl font-bold uppercase tracking-tight text-ink-1">{step === 'alternatives' ? 'Disponibles sans attendre' : step === 'sent' ? 'Demande reçue' : 'Demander ce produit'}</SheetTitle>
        <SheetDescription className="text-sm text-ink-2">{step === 'alternatives' ? 'Avant de faire une demande, découvrez ces alternatives en stock.' : 'Nous vous confirmons le prix et le délai avant toute commande.'}</SheetDescription>
        <SheetClose disabled={sending} className="absolute end-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken focus-visible:ring-2 focus-visible:ring-focus" aria-label="Fermer"><X className="h-5 w-5" /></SheetClose>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5" data-request-body>
        {step === 'alternatives' ? <>
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-hairline bg-sunken p-3"><ComparisonProductImage src={product.cover || ''} name={productName} /><div className="min-w-0"><p className="text-xs text-ink-2">Votre sélection · Sur commande</p><p className="mt-1 text-sm font-semibold text-ink-1">{productName}</p>{priceText && <p className="mt-1 text-sm text-ink-2">{priceText}</p>}</div></div>
          {loading ? <div role="status" aria-label="Recherche des alternatives" className="space-y-3"><Skeleton className="h-32 w-full rounded-xl" /><Skeleton className="h-32 w-full rounded-xl" /></div> : rows.length ? <div className="space-y-3" data-request-alternatives>{rows.map(row => <div key={row.id} className="rounded-xl border border-hairline p-3">
            <div className="flex gap-3"><ComparisonProductImage src={row.image} name={row.name} /><div className="min-w-0 flex-1"><p className="text-xs font-medium text-ok">En stock</p><LinkWithLoading href={row.url} onClick={() => onOpenChange(false)} className="flex min-h-11 items-center text-sm font-semibold text-ink-1 hover:text-brand focus-visible:ring-2 focus-visible:ring-focus">{row.name}</LinkWithLoading><p className="text-xs text-ink-2">{[row.category, row.format].filter(Boolean).join(' · ')}</p></div></div>
            <div className="mt-3 border-t border-hairline pt-3 text-xs text-ink-2">{row.facts.protein ? <p><strong className="text-ink-1">{row.facts.protein} de protéines</strong> · {row.facts.basis.toLowerCase()}</p> : <p>Valeurs nutritionnelles non renseignées</p>}<p className="mt-1">Sans gluten : {row.facts.gluten}</p></div>
            <div className="mt-3 flex items-center justify-between gap-3"><strong className="font-display text-xl text-brand">{formatTnd(row.price)}</strong><LinkWithLoading href={row.url} onClick={() => onOpenChange(false)} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-on-brand hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-focus">Voir le produit<ArrowUpRight className="h-4 w-4" /></LinkWithLoading></div>
          </div>)}</div> : <p className="py-4 text-sm text-ink-2">{loadError ? 'Les alternatives ne sont pas disponibles pour le moment. Vous pouvez continuer votre demande.' : 'Aucune alternative en stock pour le moment. Vous pouvez demander ce produit.'}</p>}
          {rows.length > 0 && <p className="mt-3 text-xs text-ink-2">Vérifiez les ingrédients et la portion sur chaque fiche. Une alternative n’est pas une formule identique.</p>}
        </> : step === 'sent' ? <div className="space-y-4 py-4"><Check className="h-10 w-10 text-ok" /><p ref={sentHeading} tabIndex={-1} className="text-lg font-semibold text-ink-1">Merci {name}, votre demande est enregistrée.</p><p className="text-sm text-ink-2">Nous vous recontactons au {phone} pour <strong>{productName}</strong>. Ce n’est pas encore une commande.</p><p className="text-sm text-ink-2">Un récapitulatif est prévu à {email}.</p><Button onClick={() => onOpenChange(false)} className="min-h-11 w-full hover:bg-brand-hover">Continuer les achats</Button></div> : <form id="product-request-form" onSubmit={submit} className="space-y-3">
          <button disabled={sending} type="button" onClick={() => setStep('alternatives')} className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-ink-2 focus-visible:ring-2 focus-visible:ring-focus"><ArrowLeft className="h-4 w-4" />Revoir les alternatives</button>
          <p className="rounded-lg bg-sunken p-3 text-sm font-semibold text-ink-1">{productName}</p>
          {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
          <label className="block text-sm font-medium text-ink-1">Nom complet<input disabled={sending} ref={firstField} required maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={INPUT} placeholder="Votre nom" /></label>
          <label className="block text-sm font-medium text-ink-1">Téléphone<input disabled={sending} required type="tel" inputMode="tel" maxLength={25} autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className={INPUT} placeholder="20 000 000" /></label>
          <label className="block text-sm font-medium text-ink-1">Email pour le récapitulatif<input disabled={sending} required type="email" maxLength={255} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} placeholder="vous@exemple.com" /></label>
          <details><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-brand focus-visible:ring-2 focus-visible:ring-focus">Ajouter une précision (optionnel)</summary><label className="block text-sm text-ink-2">Quantité, arôme ou question<textarea disabled={sending} rows={2} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} className={INPUT} /></label></details>
          <div hidden aria-hidden="true"><label>Société<input tabIndex={-1} autoComplete="off" value={company} onChange={e => setCompany(e.target.value)} /></label></div>
          {productPath && <span className="sr-only">Produit : {productPath}</span>}
        </form>}
      </div>
      {step !== 'sent' && <div className="shrink-0 border-t border-hairline bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
        {step === 'alternatives' ? <Button variant="outline" onClick={() => setStep('form')} className="min-h-12 w-full whitespace-normal text-sm">Je préfère demander ce produit</Button> : <><Button form="product-request-form" type="submit" disabled={sending} className="min-h-12 w-full hover:bg-brand-hover">{sending ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />Envoi…</> : 'Envoyer ma demande'}</Button><p className="mt-2 text-center text-xs text-ink-2">Sans paiement ni engagement.</p></>}
      </div>}
    </SheetContent>
  </Sheet>;
}
const INPUT = 'mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-sunken px-3 py-2 text-base text-ink-1 placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus';
