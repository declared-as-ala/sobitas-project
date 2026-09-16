'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search, Plus, Minus, Trash2, ImageIcon, ArrowLeft, ShoppingCart, Loader2, PackageSearch, Check,
} from 'lucide-react';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { SafeImage } from '@/app/components/SafeImage';
import { cn } from '@/app/components/ui/utils';
import {
  getAffiliateProducts, createAffiliateOrder, fmtDT,
  type AffiliateProduct, type AffiliateOrderError,
} from '@/services/affiliatePortal';

interface Line {
  product: AffiliateProduct;
  qte: number;
  price: number;
}

const CUSTOMER_FIELDS = ['nom', 'phone', 'email', 'region', 'ville', 'adresse1', 'code_postale', 'note'] as const;
type CustomerField = (typeof CUSTOMER_FIELDS)[number];

export function CreateOrderClient() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [searching, setSearching] = useState(true);

  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState<Record<CustomerField, string>>({
    nom: '', phone: '', email: '', region: '', ville: '', adresse1: '', code_postale: '', note: '',
  });
  const [shipping, setShipping] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<CustomerField | null>(null);
  const [lineError, setLineError] = useState<number | null>(null);

  // Debounced catalogue search (also runs once on mount with an empty term for the default list).
  useEffect(() => {
    let alive = true;
    setSearching(true);
    const t = setTimeout(() => {
      getAffiliateProducts(query.trim())
        .then((res) => alive && setProducts(res))
        .catch(() => alive && setProducts([]))
        .finally(() => alive && setSearching(false));
    }, query.trim() === '' ? 0 : 280);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  const addProduct = useCallback((p: AffiliateProduct) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qte: Math.min(next[i].qte + 1, Math.max(1, p.stock)) };
        return next;
      }
      return [...prev, { product: p, qte: 1, price: p.suggested || p.base }];
    });
  }, []);

  const inCart = useMemo(() => new Set(lines.map((l) => l.product.id)), [lines]);

  const setLine = (id: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, ...patch } : l)));
  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l.product.id !== id));

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.qte, 0), [lines]);
  const commission = useMemo(
    () => lines.reduce((s, l) => s + Math.max(0, l.price - l.product.base) * l.qte, 0),
    [lines],
  );
  const shippingNum = Math.max(0, Number(shipping) || 0);
  const total = subtotal + shippingNum;

  const belowFloor = lines.some((l) => l.price < l.product.base - 1e-6);

  const setCustomerField = (f: CustomerField, v: string) => {
    setCustomer((c) => ({ ...c, [f]: v }));
    if (fieldError === f) setFieldError(null);
  };

  const submit = async () => {
    setFieldError(null);
    setLineError(null);
    if (lines.length === 0) { toast.error('Ajoutez au moins un produit à la commande.'); return; }
    if (customer.phone.trim() === '') {
      setFieldError('phone');
      toast.error('Le numéro de téléphone du client est requis.');
      return;
    }
    if (belowFloor) { toast.error('Un prix est en dessous du prix affilié minimum.'); return; }

    setSubmitting(true);
    try {
      const res = await createAffiliateOrder({
        lines: lines.map((l) => ({ produit_id: l.product.id, qte: l.qte, prix_unitaire: Number(l.price.toFixed(3)) })),
        customer: {
          phone: customer.phone.trim(),
          nom: customer.nom.trim() || undefined,
          email: customer.email.trim() || undefined,
          region: customer.region.trim() || undefined,
          ville: customer.ville.trim() || undefined,
          adresse1: customer.adresse1.trim() || undefined,
          code_postale: customer.code_postale.trim() || undefined,
          note: customer.note.trim() || undefined,
        },
        shipping: shippingNum,
      });
      toast.success(`Commande ${res.numero} créée`, { description: `Commission estimée : ${fmtDT(res.commission)}` });
      router.replace('/affiliate/orders');
    } catch (e) {
      const err = e as AffiliateOrderError;
      toast.error(err.message || 'Création impossible.');
      if (err.field && (CUSTOMER_FIELDS as readonly string[]).includes(err.field)) setFieldError(err.field as CustomerField);
      if (err.line != null && lines[Number(err.line)]) setLineError(lines[Number(err.line)].product.id);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <LinkWithLoading href="/affiliate/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-brand">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Mes commandes
        </LinkWithLoading>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-1 sm:text-3xl">Nouvelle commande</h1>
        <p className="mt-1 text-sm text-ink-2">Choisissez les produits, fixez votre prix de vente, saisissez le client.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* LEFT: picker + cart */}
        <div className="space-y-6">
          {/* Search */}
          <section className="rounded-xl border border-hairline bg-elevated p-4 sm:p-5">
            <label htmlFor="prod-search" className="mb-2 block text-sm font-bold text-ink-1">1. Choisir les produits</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" aria-hidden />
              <input
                id="prod-search"
                type="text"
                inputMode="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un produit (nom ou code)…"
                className="h-12 w-full rounded-xl border border-hairline bg-canvas pl-11 pr-4 text-ink-1 shadow-sm placeholder:text-ink-3 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </div>

            <div className="mt-4">
              {searching ? (
                <ProductGridSkeleton />
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-ink-3">
                  <PackageSearch className="h-8 w-8" aria-hidden />
                  <p className="text-sm">Aucun produit trouvé{query.trim() ? ` pour « ${query.trim()} »` : ''}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {products.map((p) => (
                    <PickerCard key={p.id} product={p} added={inCart.has(p.id)} onAdd={() => addProduct(p)} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Cart */}
          <section className="rounded-xl border border-hairline bg-elevated p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-brand" aria-hidden />
              <h2 className="text-sm font-bold text-ink-1">2. Produits de la commande</h2>
              {lines.length > 0 && (
                <span className="ml-auto rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">{lines.length}</span>
              )}
            </div>
            {lines.length === 0 ? (
              <p className="rounded-lg border border-dashed border-rule bg-canvas px-4 py-8 text-center text-sm text-ink-3">
                Aucun produit ajouté. Cliquez sur un produit ci-dessus pour l’ajouter.
              </p>
            ) : (
              <div className="space-y-3">
                {lines.map((l) => (
                  <LineRow
                    key={l.product.id}
                    line={l}
                    hasError={lineError === l.product.id}
                    onQte={(qte) => setLine(l.product.id, { qte })}
                    onPrice={(price) => setLine(l.product.id, { price })}
                    onRemove={() => removeLine(l.product.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: customer + totals */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-xl border border-hairline bg-elevated p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-ink-1">3. Client &amp; livraison</h2>
            <div className="space-y-3">
              <Field label="Nom du client" value={customer.nom} onChange={(v) => setCustomerField('nom', v)} placeholder="Nom et prénom" />
              <Field label="Téléphone" required value={customer.phone} onChange={(v) => setCustomerField('phone', v)} placeholder="20 000 000" inputMode="tel" error={fieldError === 'phone'} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ville" value={customer.ville} onChange={(v) => setCustomerField('ville', v)} placeholder="Sousse" error={fieldError === 'ville'} />
                <Field label="Région" value={customer.region} onChange={(v) => setCustomerField('region', v)} placeholder="Sousse" error={fieldError === 'region'} />
              </div>
              <Field label="Adresse" value={customer.adresse1} onChange={(v) => setCustomerField('adresse1', v)} placeholder="Rue, immeuble…" error={fieldError === 'adresse1'} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code postal" value={customer.code_postale} onChange={(v) => setCustomerField('code_postale', v)} placeholder="4000" inputMode="numeric" />
                <Field label="Frais de livraison (DT)" value={shipping} onChange={setShipping} placeholder="0" inputMode="decimal" />
              </div>
              <Field label="Note (facultatif)" value={customer.note} onChange={(v) => setCustomerField('note', v)} placeholder="Instructions de livraison…" />
            </div>
          </section>

          <section className="rounded-xl border border-hairline bg-elevated p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-ink-1">Récapitulatif</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Sous-total" value={fmtDT(subtotal)} />
              <Row label="Livraison" value={fmtDT(shippingNum)} muted />
              <div className="my-2 border-t border-hairline" />
              <Row label="Total client" value={fmtDT(total)} strong />
              <div className="mt-3 flex items-center justify-between rounded-lg bg-brand/10 px-3 py-2">
                <dt className="text-sm font-semibold text-brand">Votre commission</dt>
                <dd className="font-display text-base font-bold tabular-nums text-brand">{fmtDT(commission)}</dd>
              </div>
            </dl>

            {belowFloor && (
              <p className="mt-3 text-xs font-medium text-destructive">
                Un prix de vente est inférieur au prix affilié minimum. Ajustez-le pour continuer.
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={submitting || lines.length === 0 || belowFloor}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 font-display text-[13.5px] font-bold uppercase tracking-[0.08em] text-on-brand shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Création…</> : <><Check className="h-4 w-4" aria-hidden /> Créer la commande</>}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function PickerCard({ product, added, onAdd }: { product: AffiliateProduct; added: boolean; onAdd: () => void }) {
  const out = product.stock <= 0;
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={out}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-canvas text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
        added ? 'border-brand' : 'border-hairline hover:border-rule-strong',
        out && 'cursor-not-allowed opacity-60',
      )}
    >
      <div className="relative aspect-square w-full bg-elevated">
        {product.image ? (
          <SafeImage src={product.image} alt={product.name} fill sizes="180px" retryOnError={false} className="object-contain p-2" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-ink-3"><ImageIcon className="h-8 w-8" aria-hidden /></span>
        )}
        <span className={cn(
          'absolute left-2 top-2 rounded-full border bg-elevated px-1.5 py-0.5 text-[10px] font-bold',
          out ? 'border-destructive/40 text-destructive' : 'border-ok/40 text-ok',
        )}>
          {out ? 'Rupture' : `Stock ${product.stock}`}
        </span>
        <span className={cn(
          'absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full text-on-brand shadow-sm transition-transform',
          added ? 'bg-ok' : 'bg-brand group-hover:scale-105',
        )}>
          {added ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-ink-1">{product.name}</p>
        <p className="mt-1 font-display text-sm font-bold tabular-nums text-brand">{fmtDT(product.suggested)}</p>
      </div>
    </button>
  );
}

function LineRow({
  line, hasError, onQte, onPrice, onRemove,
}: { line: Line; hasError: boolean; onQte: (q: number) => void; onPrice: (p: number) => void; onRemove: () => void }) {
  const { product, qte, price } = line;
  const gain = Math.max(0, price - product.base) * qte;
  const below = price < product.base - 1e-6;

  return (
    <div className={cn('flex gap-3 rounded-xl border bg-canvas p-3', hasError || below ? 'border-destructive' : 'border-hairline')}>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-elevated">
        {product.image ? (
          <SafeImage src={product.image} alt={product.name} fill sizes="64px" retryOnError={false} className="object-contain p-1" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-ink-3"><ImageIcon className="h-5 w-5" aria-hidden /></span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink-1">{product.name}</p>
          <button type="button" onClick={onRemove} aria-label="Retirer" className="-m-1 shrink-0 p-1 text-ink-3 transition-colors hover:text-destructive">
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-end gap-3">
          {/* Quantity stepper */}
          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-3">Qté</span>
            <div className="inline-flex items-center rounded-lg border border-hairline bg-elevated">
              <button type="button" onClick={() => onQte(Math.max(1, qte - 1))} aria-label="Diminuer" className="grid h-9 w-9 place-items-center text-ink-2 hover:text-ink-1"><Minus className="h-4 w-4" aria-hidden /></button>
              <input
                type="number" min={1} max={product.stock} value={qte}
                onChange={(e) => onQte(Math.min(product.stock, Math.max(1, Math.floor(Number(e.target.value) || 1))))}
                className="w-10 border-x border-hairline bg-transparent py-1.5 text-center text-sm font-semibold tabular-nums text-ink-1 [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button type="button" onClick={() => onQte(Math.min(product.stock, qte + 1))} aria-label="Augmenter" className="grid h-9 w-9 place-items-center text-ink-2 hover:text-ink-1"><Plus className="h-4 w-4" aria-hidden /></button>
            </div>
          </div>

          {/* Selling price */}
          <div>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-3">Prix de vente (DT)</span>
            <input
              type="number" min={product.base} step="0.5" value={price}
              onChange={(e) => onPrice(Math.max(0, Number(e.target.value) || 0))}
              className={cn('h-9 w-28 rounded-lg border bg-elevated px-2.5 text-sm font-semibold tabular-nums text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus', below ? 'border-destructive' : 'border-hairline focus-visible:border-brand')}
            />
          </div>

          {/* Gain */}
          <div className="ml-auto text-right">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-ink-3">Gain</span>
            <span className="font-display text-sm font-bold tabular-nums text-brand">{fmtDT(gain)}</span>
          </div>
        </div>
        {below && <p className="mt-1.5 text-xs font-medium text-destructive">Minimum : {fmtDT(product.base)}</p>}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, required, error, inputMode,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  required?: boolean; error?: boolean; inputMode?: 'text' | 'tel' | 'numeric' | 'decimal' | 'search';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-2">
        {label}{required && <span className="text-destructive"> *</span>}
      </span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-11 w-full rounded-lg border bg-canvas px-3 text-sm text-ink-1 shadow-sm placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          error ? 'border-destructive' : 'border-hairline focus-visible:border-brand',
        )}
      />
    </label>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={cn(strong ? 'font-semibold text-ink-1' : muted ? 'text-ink-3' : 'text-ink-2')}>{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'font-display text-base font-bold text-ink-1' : 'text-ink-2')}>{value}</dd>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-hairline bg-canvas">
          <div className="aspect-square w-full animate-pulse bg-sunken" />
          <div className="space-y-2 p-2.5">
            <div className="h-3 w-full animate-pulse rounded bg-sunken" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-sunken" />
          </div>
        </div>
      ))}
    </div>
  );
}
