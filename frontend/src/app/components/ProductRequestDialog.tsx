'use client';

/**
 * "Demander ce produit" — asked and answered WITHOUT leaving the product page.
 *
 * ── WHAT THIS REPLACES, AND HOW BIG IT IS ────────────────────────────────────────────────────
 * Owner: *"when a product is demandé, don't push to the contact us page, make a dialog inside
 * where he demands it."*
 *
 * `ProductCard` sent every back-order product to `/contact?produit={name}`. Its own comment
 * records the scale: **10,535 of 10,669 cards**. That is not an edge case, it is the default
 * state of the catalogue — so the site's most common product CTA was "go to a different page,
 * find the form, and type the product name back in from memory".
 *
 * Every step of that is a place to lose someone: a navigation, a page load, a general-purpose
 * form that does not know what they were looking at, and a message they have to compose
 * themselves. The product context is on screen at the moment of intent and then thrown away.
 *
 * ── WHY IT REUSES /contact RATHER THAN A NEW ENDPOINT ────────────────────────────────────────
 * `sendContact` already posts `{name, email, message}` and already works. A new endpoint would
 * mean a backend deploy, and the VPS is currently unreachable — so the version that ships today
 * is the one that changes no contract. The product, its price and its URL are composed INTO the
 * message, which means whoever reads the inbox gets more than the old flow gave them, not less.
 *
 * If a dedicated `product_requests` table is wanted later, this component is where the call
 * changes and nothing else moves.
 *
 * ── PHONE IS THE FIELD THAT MATTERS HERE ─────────────────────────────────────────────────────
 * This shop is cash-on-delivery and its customers are reached by phone; an email address is how
 * you file a request, a phone number is how you close one. So the phone is required and sits
 * first, and it is carried in the message body rather than in a new API field — same reason as
 * above. Email stays required only because the existing `/contact` validator expects it, which is
 * a constraint worth removing on the next backend pass, not worth guessing at while it is
 * unreachable.
 */

import { useCallback, useState } from 'react';
import { Mail, Loader2, Check, Phone, User, MessageSquare } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/app/components/ui/sheet';
import { Button } from '@/app/components/ui/button';
import { sendContact } from '@/services/api';

export interface ProductRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  /** Canonical path, so the message tells the reader exactly which product this is. */
  productPath?: string;
  /** Displayed price, purely so the request carries what the customer was looking at. */
  priceText?: string;
}

export function ProductRequestDialog({
  open,
  onOpenChange,
  productName,
  productPath,
  priceText,
}: ProductRequestDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const reset = useCallback(() => {
    setSent(false);
    setSending(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (sending) return;

      setSending(true);
      try {
        /* The message is COMPOSED here rather than typed by the customer. The old flow asked a
           person who had just found a product to describe it again in free text, which is how a
           request arrives as "le produit vert 2kg" and cannot be actioned. */
        const lines = [
          `Demande de produit : ${productName}`,
          productPath ? `Page : https://protein.tn${productPath}` : null,
          priceText ? `Prix affiché : ${priceText}` : null,
          `Téléphone : ${phone}`,
          note.trim() ? `\nMessage du client :\n${note.trim()}` : null,
        ].filter(Boolean);

        await sendContact({ name, email, message: lines.join('\n') });

        setSent(true);
        toast.success('Demande envoyée. Nous vous rappelons rapidement.');
      } catch {
        /* Deliberately NOT closing on failure: the customer's typing is still in the form and
           closing would discard it along with the only copy of their phone number. */
        toast.error("L'envoi a échoué. Réessayez ou appelez-nous directement.");
      } finally {
        setSending(false);
      }
    },
    [sending, name, email, phone, note, productName, productPath, priceText]
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      {/* `bottom` on phones is the reachable edge for a one-handed grip, and this opens from a
          card the thumb just touched. From `sm` it returns to the side sheet the rest of the site
          uses, so it is not a new pattern on desktop. */}
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-2xl border-hairline bg-elevated sm:inset-y-0 sm:right-0 sm:h-full sm:max-w-md sm:rounded-none"
      >
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="font-display font-compressed text-2xl font-extrabold uppercase tracking-tight text-ink-1">
            Demander ce produit
          </SheetTitle>
          <SheetDescription className="text-sm text-ink-3">
            {/* The product is NAMED here. The old destination was a blank form that had no idea
                what the visitor had been looking at. */}
            <span className="font-semibold text-ink-1">{productName}</span>
            {priceText ? <> — {priceText}</> : null}
          </SheetDescription>
        </SheetHeader>

        {sent ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-hairline bg-sunken">
              <Check className="h-8 w-8 text-brand" aria-hidden="true" />
            </div>
            <p className="font-display font-compressed text-xl font-extrabold uppercase tracking-tight text-ink-1">
              Demande envoyée
            </p>
            <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-ink-3">
              Nous vérifions la disponibilité de <strong className="text-ink-1">{productName}</strong> et
              nous vous rappelons sur le {phone}.
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="mt-6 h-12 w-full max-w-xs rounded-xl bg-brand font-display font-semibold uppercase tracking-wide text-on-brand hover:bg-brand-hover"
            >
              Continuer les achats
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            <Field id="pr-name" label="Nom complet" icon={<User className="h-4 w-4" aria-hidden="true" />}>
              <input
                id="pr-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={INPUT}
                placeholder="Votre nom"
              />
            </Field>

            {/* FIRST after the name, and required: this is a cash-on-delivery shop and the phone
                is how a request actually gets closed. */}
            <Field id="pr-phone" label="Téléphone" icon={<Phone className="h-4 w-4" aria-hidden="true" />}>
              <input
                id="pr-phone"
                required
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className={INPUT}
                placeholder="+216 ..."
              />
            </Field>

            <Field id="pr-email" label="Email" icon={<Mail className="h-4 w-4" aria-hidden="true" />}>
              <input
                id="pr-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={INPUT}
                placeholder="vous@exemple.com"
              />
            </Field>

            <Field
              id="pr-note"
              label="Message (optionnel)"
              icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
            >
              <textarea
                id="pr-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`${INPUT} resize-none`}
                placeholder="Quantité, arôme souhaité…"
              />
            </Field>

            <Button
              type="submit"
              disabled={sending}
              className="h-12 w-full rounded-xl bg-brand font-display font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Envoi…
                </>
              ) : (
                'Envoyer la demande'
              )}
            </Button>

            <p className="text-center text-xs leading-relaxed text-ink-3">
              Livraison partout en Tunisie · Paiement à la livraison
            </p>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

const INPUT =
  'w-full rounded-xl border border-hairline bg-sunken px-3 py-2.5 text-sm text-ink-1 outline-none transition-colors placeholder:text-ink-3 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-focus';

/** A labelled row. `<label htmlFor>` rather than a wrapping label, so the icon is not clickable text. */
function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-sm font-medium text-ink-2">
        <span className="text-ink-3">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}
