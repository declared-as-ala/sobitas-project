'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CONTACT_PHONE } from '@/util/company';
import { ArrowLeft, ArrowRight, Check, Clock3, Columns2, Equal, LayoutGrid, Loader2, PackageCheck, PackageSearch, Phone, Target, TrendingDown, TrendingUp, Truck, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/app/components/ui/sheet';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ComparisonProductImage } from '@/app/components/product/ComparisonProductImage';
import { getSimilarProducts, sendContact } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { buildComparison, type ComparisonRow } from '@/util/productComparison';
import { visibleNutrients, type ComparisonFacts } from '@/util/productComparisonFacts';
import { getProductPrimarySubCategory } from '@/util/productUrl';
import { formatTnd } from '@/util/productPrice';
import type { Product } from '@/types';

export interface ProductRequestDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; product: Product;
  productName: string; productPath?: string; priceText?: string; alternatives?: Product[];
}

/**
 * ── WHAT THIS SCREEN IS FOR ───────────────────────────────────────────────────────────────────
 * 11,368 published products; 145 of them actually held. A shopper who taps a product is, 98.7% of
 * the time, looking at something we cannot ship, so this sheet is not an edge case — it is the
 * majority path through the shop. Its job is to turn "I want that one" into "I'll take this one,
 * today", and the only currency it may spend is true, checkable fact: real stock, the real price
 * gap, the real format difference, the published delivery window, and the fact that the requested
 * item has no confirmed date.
 *
 * NOTHING ON THIS SCREEN IS MANUFACTURED. No countdown, no "N personnes regardent", no invented
 * stock number, nothing pre-ticked, and the request path is never hidden, delayed or disabled. A
 * shopper talked into a swap returns it and does not come back, so a persuaded-but-wrong choice
 * costs more than a lost one. `scripts/measure-relead.mjs` asserts all of that on rendered text.
 *
 * ── PASS 3: THE SCREEN, NOT THE HIERARCHY ─────────────────────────────────────────────────────
 * Two earlier passes fixed WHICH control wins (every alternative ends in a full-width primary; the
 * request is a footer link) and WHY a swap is fair (the comparison reveal). Both were right and
 * both survive. What they could not fix was that the shopper only ever saw ONE of them. Measured
 * at 390x844 before this pass, on a real sur-commande product with three in-stock equivalents:
 *
 *     heading + description   200px   two display lines that wrapped, then a 3-line sentence
 *     the item they can't buy 135px   an 80px hero for the one product on screen that is unbuyable
 *     first alternative       325px   a 160px fixed pane inside a 6-row card
 *     ── fold at 844 ──               exactly ONE alternative reachable; the second cut in half
 *
 * So the sheet said "here is a substitute, or ask", when the fact that converts is "we have three
 * of these and they leave tomorrow". Everything below is that one edit, applied three times:
 *
 *   1. THE HEADER STATES THE STOCK, NOT THE SITUATION. `{n} équivalents` is `rows.length`. The
 *      old description repeated, in prose, what the requested-item chip and every card already
 *      said — three statements of "sur commande / 24-72 h" costing ~90px of the first screen.
 *   2. THE REQUESTED ITEM IS A REFERENCE LINE, NOT A CARD. It keeps the one thing only it can say
 *      — no confirmed date — at 44px instead of 135px. Orientation, not a hero.
 *   3. THE CARD LEADS WITH DIFFERENCES. The 160px fixed pane held ~120px of content and each card
 *      restated "Livré en 24-72 h" that the header now says once. In its place: a chip row where
 *      every chip is a distinct fact with a named source (see `signals`), and the declared protein
 *      with its own basis, which is the question someone swapping whey actually has.
 *
 * Net at 390x844: the first "Choisir celui-ci" moves from 695 to ~460, and the SECOND alternative
 * becomes fully visible without scrolling. Three alternatives is `buildComparison(…, 3)`; the data
 * layer is untouched by this pass.
 */
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
  const aisle = getProductPrimarySubCategory(product);
  const subId = aisle?.id || product.sous_categorie_id;
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
  const hasRows = Boolean(requested) && rows.length > 0;

  /*
    The heading may only promise what the screen can deliver, and it must not claim to know more
    than it does. "En stock, livrable maintenant" is the owner's phrase and the point of the whole
    surface — but printing it above an empty pane would be the one dishonest thing on it. And a
    FAILED lookup is not an empty shelf: "rien d'équivalent en stock" after a 503 states a fact
    about the catalogue that is really a fact about the request, which is the same class of error
    as a dash meaning "the manufacturer withheld this" on a creatine's protein row.
  */
  const title = step === 'sent' ? 'Demande reçue'
    : step === 'form' ? 'Demander ce produit'
    : loading ? 'Recherche d’équivalents en stock'
    : hasRows ? 'En stock, livrable maintenant'
    : loadError ? 'Équivalents indisponibles'
    : 'Rien d’équivalent en stock';
  const subtitle = step !== 'alternatives' ? 'Nous vous confirmons le prix et le délai avant toute commande.'
    : loading ? 'Nous regardons ce que nous avons en rayon pour ce produit.'
    : hasRows ? `${rows.length} équivalent${rows.length > 1 ? 's' : ''} que nous avons en stock, livré${rows.length > 1 ? 's' : ''} en 24-72 h.`
    : loadError ? 'Nous n’avons pas pu consulter le stock. Voici les autres voies.'
    : 'Voici ce que nous pouvons faire pour ce produit.';

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
      {/*
        ── THE HEADING NAMES THE OUTCOME, NOT THE DETOUR ─────────────────────────────────────
        It read "Avant de faire une demande, découvrez ces alternatives en stock", which frames the
        in-stock products as something to get past on the way to the real action. It then became a
        promise plus a three-line explanation, which was right but paid ~200px of a 844px phone for
        a fact the cards below repeat. The subtitle now carries the only number that is new here —
        HOW MANY we hold — and the delivery window is stated once, for the whole screen.
      */}
      <SheetHeader className="shrink-0 border-b border-hairline p-4 pe-16 text-left sm:px-5">
        {/* The icon is a phone-width casualty, not a decoration removed for taste: at 390 the
            available line is 294px (p-4 plus the 64px the close button reserves) and 20px of icon
            plus its gap is exactly what pushes "EN STOCK, LIVRABLE MAINTENANT" onto a second line.
            The heading is the promise of the screen; it gets the width. */}
        <SheetTitle className="flex items-center gap-2 font-display text-xl font-bold uppercase leading-tight tracking-tight text-ink-1">
          {step === 'alternatives' && hasRows && <Truck className="hidden h-5 w-5 shrink-0 text-ok sm:block" aria-hidden="true" />}
          {title}
        </SheetTitle>
        <SheetDescription className="text-sm text-ink-2">{subtitle}</SheetDescription>
        <SheetClose disabled={sending} className="absolute end-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg text-ink-2 hover:bg-sunken focus-visible:ring-2 focus-visible:ring-focus" aria-label="Fermer"><X className="h-5 w-5" /></SheetClose>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:px-5" data-request-body>
        {step === 'alternatives' ? <>
          {/*
            ── WHAT THEY ASKED FOR IS A REFERENCE, NOT A PRODUCT CARD ──────────────────────────
            This was an 80px thumbnail in a bordered card with three lines of text: 135px, at the
            very top, given to the single item on the screen that cannot be bought. A shopper knows
            what they just tapped; what they do not know is that it has no date. So the thumbnail
            drops to 44px and the block keeps exactly one thing the alternatives cannot say —
            "date non confirmée" — in `warn`, which is the honest reason to read on.
          */}
          <div className="flex items-start gap-3 rounded-xl border border-hairline bg-sunken p-3">
            <ComparisonProductImage src={product.cover || ''} name={productName} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-3">Vous aviez demandé</p>
              <p className="truncate text-sm font-semibold text-ink-1" title={productName}>{productName}</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-warn">
                <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Sur commande · date non confirmée
              </p>
            </div>
            {priceText && <p className="shrink-0 text-sm text-ink-2">{priceText}</p>}
          </div>

          {/*
            ── EACH ALTERNATIVE ENDS IN A FULL-WIDTH PRIMARY ACTION ─────────────────────────────
            Kept from pass 1, because it was the right call: the card used to end with a price on
            the left and a small "Voir le produit" chip on the right, while the only full-width
            button on the screen was the one that does NOT fulfil the order. The converting action
            is still the widest, highest-contrast thing in every card, and the first card is still
            marked as the closest match — `buildComparison` returns them in similarity order, and a
            list of equivalents with no ranking asks the shopper to redo work the catalogue did.
          */}
          {loading ? <div role="status" aria-label="Recherche des alternatives" className="mt-3 space-y-3"><Skeleton className="h-64 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>
            : requested && hasRows ? <>
              <div className="mt-3 space-y-3" data-request-alternatives>{rows.map((row, index) => <RequestAlternativeCard key={`${requested.id}-${row.id}`} row={row} requested={requested} closest={index === 0} onChoose={() => onOpenChange(false)} />)}</div>
              {/* Kept — it is true and a shopper swapping brands deserves it. Above the escape
                  hatch rather than immediately before it, so the last thing read before the
                  decision is not a reason to doubt every card above. */}
              <p className="mt-3 text-xs leading-relaxed text-ink-3">Une alternative n’est pas une formule identique : vérifiez les ingrédients et la portion sur la fiche.</p>
            </>
            : <NoAlternatives loadError={loadError} aisleName={aisle?.designation_fr} aisleSlug={aisle?.slug} onChoose={() => onOpenChange(false)} />}
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
      {step !== 'sent' && <div className="shrink-0 border-t border-hairline bg-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
        {step === 'alternatives' ? (
          /*
            ── THE ESCAPE HATCH IS A LINK WHEN THERE IS SOMETHING BETTER, AND THE BUTTON WHEN
               THERE IS NOT ────────────────────────────────────────────────────────────────────
            It was once a full-width bordered button in a pinned footer — the largest, most
            reachable control on the sheet, present before a single alternative had been read. It
            stays, always visible and never disabled, because somebody who genuinely wants that
            exact product must be able to ask for it and burying that would be a dark pattern
            rather than a conversion.

            The only thing that changes with state is its WEIGHT, and it changes in the shopper's
            favour: with equivalents in stock it is the secondary path and reads as a link; with
            none, asking IS the best available outcome, so it takes the primary button. Weighting
            the request DOWN in a state where it is the only real answer would be the same mistake
            as weighting it up in a state where it is not.
          */
          hasRows || loading ? <button
            type="button"
            onClick={() => setStep('form')}
            className="mx-auto flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-ink-2 underline underline-offset-4 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Aucune ne convient, demander ce produit
          </button> : <Button type="button" onClick={() => setStep('form')} className="min-h-12 w-full font-display font-bold uppercase tracking-wide hover:bg-brand-hover">Demander ce produit</Button>
        ) : <><Button form="product-request-form" type="submit" disabled={sending} className="min-h-12 w-full hover:bg-brand-hover">{sending ? <><Loader2 className="me-2 h-4 w-4 animate-spin" />Envoi…</> : 'Envoyer ma demande'}</Button><p className="mt-2 text-center text-xs text-ink-2">Sans paiement ni engagement.</p></>}
      </div>}
    </SheetContent>
  </Sheet>;
}

/**
 * ── AN EMPTY PANE IS NOT AN ANSWER ────────────────────────────────────────────────────────────
 * This state used to be one grey sentence. It is rare on live data — every subcategory holding a
 * sur-commande product was measured on 08/09/2026 to return 5-6 in-stock siblings — but it is
 * reachable three ways (the endpoint fails, the product has no subcategory, every sibling is a
 * pack or out of stock), and "rien à afficher" is the worst possible reply to somebody who has
 * just told us what they want.
 *
 * So it says the true thing, refuses to pad the list with an approximation, and offers the three
 * routes that actually lead somewhere: ask for it (the footer's primary button in this state),
 * browse the same aisle, or call. The aisle link is `getProductPrimarySubCategory(product).slug` —
 * a real category page. It says "parcourir", never "en stock", because that page is not filtered
 * by availability and promising otherwise here would be the lie this whole file avoids.
 */
function NoAlternatives({ loadError, aisleName, aisleSlug, onChoose }: {
  loadError: boolean; aisleName?: string; aisleSlug?: string; onChoose: () => void;
}) {
  return <div data-request-empty className="mt-4">
    <PackageSearch className="h-8 w-8 text-ink-3" aria-hidden="true" />
    <p className="mt-3 text-base font-semibold text-ink-1">{loadError ? 'Impossible d’afficher les équivalents' : 'Aucun équivalent en stock aujourd’hui'}</p>
    <p className="mt-1 text-sm leading-relaxed text-ink-2">{loadError
      ? 'La liste des produits disponibles n’a pas pu être chargée. Votre demande, elle, reste possible : nous vous confirmons le prix et le délai avant toute commande.'
      : 'Nous n’avons rien de comparable en rayon pour ce produit en ce moment, et nous préférons vous le dire plutôt que de vous proposer un à-peu-près.'}</p>
    <ul className="mt-4 space-y-2">
      {aisleSlug && <li><LinkWithLoading href={`/${aisleSlug}`} onClick={onChoose} className="flex min-h-12 items-center gap-3 rounded-xl border border-hairline px-3 text-sm font-semibold text-ink-1 transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        <LayoutGrid className="h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
        <span className="min-w-0 flex-1 break-words">Parcourir le rayon{aisleName ? ` ${aisleName}` : ''}</span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </LinkWithLoading></li>}
      <li><a href={`tel:${CONTACT_PHONE.e164}`} className="flex min-h-12 items-center gap-3 rounded-xl border border-hairline px-3 text-sm font-semibold text-ink-1 transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        <Phone className="h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
        <span className="min-w-0 flex-1">Appeler le {CONTACT_PHONE.national}</span>
      </a></li>
    </ul>
  </div>;
}

/**
 * A status chip: the colour lives in the border and the text, never in the plate.
 *
 * `bg-ok/10 text-ok` looks completely fine and measures 3.84-4.39:1 — a WCAG AA failure. The badge
 * this replaces (`bg-brand/10 text-brand`, "Le plus proche de votre choix") measured 4.21:1 against
 * a 4.5:1 floor in light mode, caught by `measure-relead` on the run before this pass. The tokens
 * are contrast-checked against an UNTINTED surface, so `bg-elevated` is the only backing they are
 * entitled to.
 */
function Signal({ tone, icon: Icon, children }: { tone: 'ok' | 'brand' | 'ink'; icon: LucideIcon; children: React.ReactNode }) {
  const paint = tone === 'ok' ? 'border-ok/40 text-ok' : tone === 'brand' ? 'border-brand/40 text-brand' : 'border-hairline text-ink-2';
  return <span className={`inline-flex items-center gap-1 rounded-lg border bg-elevated px-2 py-1 text-xs font-semibold ${paint}`}>
    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{children}
  </span>;
}

const priceKnown = (price: number) => Number.isFinite(price) && price > 0;
const displayPrice = (price: number) => priceKnown(price) ? formatTnd(price) : 'À confirmer';

/**
 * The declared protein, WITH the basis it was declared on.
 *
 * Not a delta. The catalogue's own bases disagree — the three in-stock wheys measured against this
 * sheet declare "par portion de 35 g", "de 31 g" and "de 34 g" — so subtracting one from another
 * produces a number no label supports, and the iHerb rows that make up most sur-commande products
 * declare no nutrition at all. Printing "+3 g de protéines" from that would be exactly the kind of
 * invented figure this screen exists to not have.
 *
 * So the basis is printed beside the value and nothing is computed. When the basis is vague
 * ("Base non précisée", a portion of unstated size) the line is dropped entirely: a protein figure
 * whose reference is unknown is not a buying signal, it is a decoration.
 */
function proteinLine(facts: ComparisonFacts): string {
  const specific = /^Par portion de /.test(facts.basis) || facts.basis === 'Pour 100 g';
  return facts.protein && specific ? `${facts.protein} de protéines — ${facts.basis.toLowerCase()}` : '';
}

/**
 * Phase 3: an explicit reveal replaces the summary in the SAME pane, and only that pane scrolls.
 * The price row, the 44px toggle and the full-width CTA sit outside it, so opening the comparison
 * cannot push "Choisir celui-ci" out of reach — `measure-relead` asserts that the CTA of the card
 * being compared is still above the fold at 390x844 after the reveal, rather than trusting it.
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
  const delta = priceKnown(row.price) && priceKnown(requested.price)
    ? Math.round((row.price - requested.price) * 1000) / 1000 : null;
  const saving = (item: ComparisonRow) => priceKnown(item.price) && item.oldPrice != null && Number.isFinite(item.oldPrice) && item.oldPrice > item.price
    ? `${formatTnd(item.oldPrice - item.price)} (au lieu de ${formatTnd(item.oldPrice)})` : 'Aucune réduction affichée';
  const allergen = (value: string, name: string) => value === 'Oui, indiqué sur la fiche' ? `Sans ${name}, indiqué sur la fiche` : value;
  const nutrients = visibleNutrients([requested.facts, row.facts]);
  const protein = proteinLine(row.facts);
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

  return <article data-request-card data-comparison-open={revealed} className={`overflow-hidden rounded-xl border p-3 ${closest ? 'border-brand/40' : 'border-hairline'}`}>
    <div ref={pane} id={panelId} role="region" aria-label={revealed ? `Comparaison de ${row.name} avec ${requested.name}` : row.name} tabIndex={0} className={`overflow-y-auto overscroll-contain rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${revealed ? 'h-56' : ''}`} data-request-comparison-pane>
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
        <div className="flex items-start gap-3">
          <ComparisonProductImage src={row.image} name={row.name} size="sm" />
          <div className="min-w-0 flex-1">
            <LinkWithLoading href={row.url} onClick={onChoose} className="flex min-h-11 items-center break-words text-sm font-semibold leading-snug text-ink-1 hover:text-brand focus-visible:ring-2 focus-visible:ring-focus">{row.name}</LinkWithLoading>
            <p className="break-words text-xs text-ink-2">{[row.brand, row.category].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {/*
          ── THE CHIP ROW IS THE ARGUMENT ────────────────────────────────────────────────────
          Every chip is one checkable difference against the item they asked for, and nothing
          appears here that is not read from the product:

            "Le plus proche"    first row of `buildComparison`, which ranks by similarity
            "En stock"          `isInStock(p)` — qte > 0 and rupture false
            price gap           `row.price - requested.price`, both from `getPriceDisplay`
            format              `extractFormat(name)` on both, REPORTED never divided

          What used to sit here instead was "Livré en 24-72 h" repeated on every card, which the
          header now states once for the whole screen, and a full-width "LE PLUS PROCHE DE VOTRE
          CHOIX" plate whose brand-on-brand-tint measured 4.21:1.
        */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {closest && <Signal tone="brand" icon={Target}>Le plus proche de votre choix</Signal>}
          <Signal tone="ok" icon={PackageCheck}>{row.inStock ? 'En stock' : 'Disponibilité à confirmer'}</Signal>
          {delta !== null && (delta === 0
            ? <Signal tone="ink" icon={Equal}>Même prix</Signal>
            : <Signal tone={delta < 0 ? 'ok' : 'ink'} icon={delta < 0 ? TrendingDown : TrendingUp}>{formatTnd(Math.abs(delta))} de {delta < 0 ? 'moins' : 'plus'}</Signal>)}
          {row.format && requested.format && row.format !== requested.format
            && <Signal tone="ink" icon={Columns2}>{row.format} au lieu de {requested.format}</Signal>}
        </div>
        {protein && <p className="mt-2 break-words text-xs text-ink-2">{protein}</p>}
      </>}
    </div>
    <div className="mt-2 flex min-h-11 flex-wrap items-center justify-between gap-x-2 border-t border-hairline">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <strong className="font-display text-xl text-brand">{displayPrice(row.price)}</strong>
        {row.oldPrice != null && <span className="text-xs text-ink-2 line-through">{formatTnd(row.oldPrice)}</span>}
      </div>
      <button type="button" aria-expanded={revealed} aria-controls={panelId} aria-label={`${revealed ? 'Revoir' : 'Comparer'} ${row.name}${revealed ? '' : ' avec votre choix'}`} onClick={() => { setRevealed(!revealed); if (pane.current) pane.current.scrollTop = 0; }} className="flex min-h-11 shrink-0 items-center justify-end gap-2 rounded-lg px-2 text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        <Columns2 className="h-4 w-4 shrink-0" aria-hidden="true" />{revealed ? 'Revoir le produit' : 'Comparer'}
      </button>
    </div>
    <LinkWithLoading href={row.url} onClick={onChoose} aria-label={`Choisir celui-ci : ${row.name}`} data-request-choose className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 font-display text-sm font-bold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-focus">Choisir celui-ci<ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></LinkWithLoading>
  </article>;
}
const INPUT = 'mt-1 block min-h-11 w-full rounded-lg border border-hairline bg-sunken px-3 py-2 text-base text-ink-1 placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus';
