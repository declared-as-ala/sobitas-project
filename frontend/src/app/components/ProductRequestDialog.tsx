'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Columns2, Loader2, PackageCheck, Truck, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/app/components/ui/sheet';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ComparisonProductImage } from '@/app/components/product/ComparisonProductImage';
import { getSimilarProducts, sendContact } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { buildComparison, type ComparisonRow } from '@/util/productComparison';
import { visibleNutrients } from '@/util/productComparisonFacts';
import { getProductPrimarySubCategory } from '@/util/productUrl';
import { formatTnd } from '@/util/productPrice';
import { CONTACT_PHONE } from '@/util/company';
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
  const comparison = buildComparison(product, products, 3);
  const requested = comparison.find(row => row.isCurrent);
  const rows = comparison.filter(row => !row.isCurrent);

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
      setError(Object.values(data?.errors ?? {}).flat()[0] || `Envoi impossible. Vos informations sont conservées : réessayez ou appelez le ${CONTACT_PHONE.national}.`);
    } finally { setSending(false); }
  };
  return <Sheet open={open} onOpenChange={next => { if (!sending) onOpenChange(next); }}>
    <SheetContent side="bottom" showCloseButton={false} style={{ backgroundColor: 'rgb(var(--c-elevated))' }} className="max-h-[94dvh] gap-0 overflow-hidden rounded-t-2xl border-hairline bg-elevated sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-dvh sm:w-full sm:max-w-xl sm:rounded-none">
      <SheetHeader className="shrink-0 border-b border-hairline p-4 pe-16 text-left sm:p-5 sm:pe-16">
        {/*
          ── THE HEADING NAMES THE OUTCOME, NOT THE DETOUR ─────────────────────────────────
          It read "Avant de faire une demande, découvrez ces alternatives en stock", which frames
          the in-stock products as something to get past on the way to the real action. The
          sentence tells a shopper the request is the destination and this screen is a speed bump.
          It now states the only fact that decides this: these ship in 24-72 h, the one you tapped
          has no confirmed date.
        */}
        <SheetTitle className="font-display text-2xl font-bold uppercase tracking-tight text-ink-1">{step === 'alternatives' ? 'En stock, livrable maintenant' : step === 'sent' ? 'Demande reçue' : 'Demander ce produit'}</SheetTitle>
        <SheetDescription className="text-sm text-ink-2">{step === 'alternatives' ? 'Ce produit est sur commande, sans date garantie. Ces équivalents partent sous 24-72 h.' : 'Nous vous confirmons le prix et le délai avant toute commande.'}</SheetDescription>
        <SheetClose disabled={sending} className="absolute end-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken focus-visible:ring-2 focus-visible:ring-focus" aria-label="Fermer"><X className="h-5 w-5" /></SheetClose>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5" data-request-body>
        {step === 'alternatives' ? <>
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-warn/30 bg-elevated p-3">
            <ComparisonProductImage src={product.cover || ''} name={productName} />
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-warn"><Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Sur commande · délai non garanti</p>
              <p className="mt-1 text-sm font-semibold text-ink-1">{productName}</p>
              {priceText && <p className="mt-0.5 text-sm text-ink-2">{priceText}</p>}
            </div>
          </div>
          {/*
            ── EACH ALTERNATIVE ENDS IN A FULL-WIDTH PRIMARY ACTION ─────────────────────────
            The card used to end with a price on the left and a small "Voir le produit" chip on
            the right, while the only full-width button on the screen — pinned in the footer,
            visible without scrolling — was "Je préfère demander ce produit". The screen's most
            prominent control was the one that does not fulfil the order, and the ones that do
            were inline chips a shopper had to scroll to find.

            Now the converting action is the widest, highest-contrast thing in every card, and it
            says what it does: this one, delivered. The first card is marked as the closest match,
            because a list of four equivalents with no ranking asks the shopper to do the work
            the catalogue already did — `buildComparison` returns them in similarity order.
          */}
          {loading ? <div role="status" aria-label="Recherche des alternatives" className="space-y-3"><Skeleton className="h-80 w-full rounded-xl" /><Skeleton className="h-72 w-full rounded-xl" /></div> : requested && rows.length ? <div className="space-y-3" data-request-alternatives>{rows.map((row, index) => <RequestAlternativeCard key={`${requested.id}-${row.id}`} row={row} requested={requested} closest={index === 0} onChoose={() => onOpenChange(false)} />)}</div> : <p className="py-4 text-sm text-ink-2">{loadError ? 'Les alternatives ne sont pas disponibles pour le moment. Vous pouvez continuer votre demande.' : 'Aucune alternative en stock pour le moment. Vous pouvez demander ce produit.'}</p>}
          {/* Kept — it is true and a shopper swapping brands deserves it. Moved ABOVE the escape
              hatch rather than immediately before it, so the last thing read before the decision
              is not a reason to doubt every card above. */}
          {rows.length > 0 && <p className="mt-3 text-xs leading-relaxed text-ink-3">Une alternative n’est pas une formule identique : vérifiez les ingrédients et la portion sur la fiche.</p>}
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
        {step === 'alternatives' ? (
          /*
            ── THE ESCAPE HATCH IS A LINK, NOT THE PRIMARY BUTTON ────────────────────────────
            This was a full-width bordered button in a pinned footer — the largest, most reachable
            control on the sheet, present before a single alternative had been read. On a phone it
            was the only thing visible above the fold that looked like an action.

            It stays, always available and never hidden: somebody who genuinely wants that exact
            product must be able to ask for it, and burying that would be a dark pattern rather
            than a conversion. But it is now weighted like what it is — the secondary path — and
            the card CTAs carry the primary weight. Nothing is disabled, delayed or obscured.
          */
          <button
            type="button"
            onClick={() => setStep('form')}
            className="mx-auto flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-ink-2 underline underline-offset-4 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Aucune ne convient, demander ce produit
          </button>
        ) : <><Button form="product-request-form" type="submit" disabled={sending} className="min-h-12 w-full hover:bg-brand-hover">{sending ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />Envoi…</> : 'Envoyer ma demande'}</Button><p className="mt-2 text-center text-xs text-ink-2">Sans paiement ni engagement.</p></>}
      </div>}
    </SheetContent>
  </Sheet>;
}

/**
 * Phase 3: an explicit reveal replaces the summary in the SAME 160px pane. Appending a full
 * nutrition table would move "Choisir celui-ci" out of reach. Only this pane scrolls when opened;
 * price, the 44px toggle and the full-width CTA stay outside it. No automatically opened panel or
 * additional step on the request path. Long names/facts wrap and remain available by scrolling.
 *
 * Compare declared values, not inferred equivalence: formats are never arithmetic operands and
 * nutrition keeps each product's basis. Missing prices must not become a fictional zero/saving.
 */
function RequestAlternativeCard({ row, requested, closest, onChoose }: {
  row: ComparisonRow; requested: ComparisonRow; closest: boolean; onChoose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const panelId = useId();
  const pane = useRef<HTMLDivElement>(null);
  const priceKnown = (price: number) => Number.isFinite(price) && price > 0;
  const displayPrice = (price: number) => priceKnown(price) ? formatTnd(price) : 'À confirmer';
  const delta = priceKnown(row.price) && priceKnown(requested.price)
    ? Math.round((row.price - requested.price) * 1000) / 1000 : null;
  const priceDifference = delta === null ? 'Écart de prix non disponible' : delta === 0 ? 'Même prix affiché que votre choix'
    : `${formatTnd(Math.abs(delta))} ${delta < 0 ? 'de moins' : 'de plus'} que votre choix`;
  const saving = (item: ComparisonRow) => priceKnown(item.price) && item.oldPrice != null && Number.isFinite(item.oldPrice) && item.oldPrice > item.price
    ? `${formatTnd(item.oldPrice - item.price)} (au lieu de ${formatTnd(item.oldPrice)})` : 'Aucune réduction affichée';
  const allergen = (value: string, name: string) => value === 'Oui, indiqué sur la fiche' ? `Sans ${name}, indiqué sur la fiche` : value;
  const nutrients = visibleNutrients([requested.facts, row.facts]);
  const fields = [
    { label: 'Format', requested: requested.format, alternative: row.format },
    { label: 'Prix affiché', requested: displayPrice(requested.price), alternative: displayPrice(row.price) },
    { label: 'Disponibilité', requested: 'Sur commande · date non confirmée', alternative: row.inStock ? 'En stock · livré en 24-72 h' : 'Disponibilité à confirmer' },
    { label: 'Marque', requested: requested.brand, alternative: row.brand },
    { label: 'Catégorie', requested: requested.category, alternative: row.category },
    ...(nutrients.length ? [
      { label: 'Base nutritionnelle', requested: requested.facts.basis, alternative: row.facts.basis },
      ...nutrients.map(({ key, label }) => ({ label, requested: requested.facts[key], alternative: row.facts[key] })),
    ] : []),
    { label: 'Gluten', requested: allergen(requested.facts.gluten, 'gluten'), alternative: allergen(row.facts.gluten, 'gluten') },
    { label: 'Lactose', requested: allergen(requested.facts.lactose, 'lactose'), alternative: allergen(row.facts.lactose, 'lactose') },
    ...(requested.oldPrice != null || row.oldPrice != null ? [{ label: 'Réduction', requested: saving(requested), alternative: saving(row) }] : []),
  ];

  return <div data-request-card data-comparison-open={revealed} className={`overflow-hidden rounded-xl border ${closest ? 'border-brand/40' : 'border-hairline'}`}>
    {closest && <p className="bg-brand/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand">Le plus proche de votre choix</p>}
    <div className="p-3">
      <div ref={pane} id={panelId} role="region" aria-label={revealed ? `Comparaison de ${row.name} avec ${requested.name}` : row.name} tabIndex={0} className="h-40 overflow-y-auto overscroll-contain rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus" data-request-comparison-pane>
        {revealed ? <>
          <table className="w-full table-fixed border-collapse text-left text-xs text-ink-2">
            <caption className="sr-only">{requested.name} comparé à {row.name}</caption>
            <thead className="sticky top-0 bg-elevated text-ink-1"><tr>
              <th scope="col" className="w-1/3 p-2 font-semibold">Critère</th>
              <th scope="col" className="w-1/3 p-2 font-semibold">Votre choix</th>
              <th scope="col" className="w-1/3 p-2 font-semibold">Celui-ci</th>
            </tr></thead>
            <tbody>{fields.map(field => <tr key={field.label} className="border-t border-hairline">
              <th scope="row" className="break-words p-2 align-top font-medium text-ink-1">{field.label}</th>
              <td className="break-words p-2 align-top">{field.requested || 'Non renseigné'}</td>
              <td className="break-words bg-sunken p-2 align-top text-ink-1">{field.alternative || 'Non renseigné'}</td>
            </tr>)}</tbody>
          </table>
          <p className="p-2 text-xs text-ink-2">Les prix concernent le format affiché, sans calcul au kilo. {nutrients.length > 0 && 'Les valeurs nutritionnelles suivent la base de chaque produit : vérifiez les portions avant de comparer. '}Une donnée non renseignée ne signifie pas zéro ni absence d’allergène.</p>
        </> : <>
          <div className="flex gap-3">
            <ComparisonProductImage src={row.image} name={row.name} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ok"><PackageCheck className="h-4 w-4 shrink-0" aria-hidden="true" />{row.inStock ? 'En stock' : 'Disponibilité à confirmer'}</p>
              <LinkWithLoading href={row.url} onClick={onChoose} className="flex min-h-11 items-center break-words text-sm font-semibold leading-snug text-ink-1 hover:text-brand focus-visible:ring-2 focus-visible:ring-focus">{row.name}</LinkWithLoading>
              <p className="break-words text-xs text-ink-2">{[row.category, row.format].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-1">{priceDifference}</p>
          {row.inStock && <p className="mt-1 flex items-center gap-1 text-xs text-ink-2"><Truck className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />Livré en 24-72 h</p>}
        </>}
      </div>
      <div className="mt-2 flex min-h-11 flex-wrap items-center justify-between gap-x-2 border-t border-hairline">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <strong className="font-display text-xl text-brand">{displayPrice(row.price)}</strong>
          {row.oldPrice != null && <span className="text-xs text-ink-2 line-through">{formatTnd(row.oldPrice)}</span>}
        </div>
        <button type="button" aria-expanded={revealed} aria-controls={panelId} aria-label={`${revealed ? 'Revoir' : 'Comparer'} ${row.name}${revealed ? '' : ' avec votre choix'}`} onClick={() => { setRevealed(!revealed); if (pane.current) pane.current.scrollTop = 0; }} className="flex min-h-11 w-40 shrink-0 items-center justify-end gap-2 rounded-lg px-2 text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
          <Columns2 className="h-4 w-4 shrink-0" aria-hidden="true" />{revealed ? 'Revoir le produit' : 'Comparer'}
        </button>
      </div>
      <LinkWithLoading href={row.url} onClick={onChoose} aria-label={`Choisir celui-ci : ${row.name}`} data-request-choose className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 font-display text-sm font-bold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-focus">Choisir celui-ci<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></LinkWithLoading>
    </div>
  </div>;
}
const INPUT = 'mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-sunken px-3 py-2 text-base text-ink-1 placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus';
