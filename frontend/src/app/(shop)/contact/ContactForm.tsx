'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle, Send } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { sendContact } from '@/services/api';
import { toast } from 'sonner';

/**
 * The only client island on /contact.
 *
 * The page used to be one `'use client'` component: the address, the opening hours, the map
 * poster and every heading shipped as client JavaScript so that three input fields could hold
 * state. Splitting the form out is the whole reason the rest of the page is now a server
 * component — nothing else on it has any state at all.
 */
const FIELD_LABEL = 'mb-1.5 block text-sm font-medium text-ink-1';

/**
 * What the enquiry is about, asked as five buttons rather than a free-text line.
 *
 * It costs the visitor one tap and it is the difference between an inbox of messages all titled
 * "[Contact] Ahmed" and one that can be triaged at a glance — which matters because this form now
 * actually reaches a person. The five are the real categories of message a supplement shop gets;
 * "Autre" exists so nobody is forced into a wrong one.
 */
const SUBJECTS = ['Commande', 'Disponibilité', 'Conseil produit', 'Livraison', 'Autre'] as const;

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '' as string,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  /*
   * Filled AFTER mount, in an effect, and that placement is the whole point.
   *
   * A lazy useState initialiser looks tidier and is wrong here: it runs on the SERVER too, where
   * there is no location, so the server renders an empty textarea and the client's first render
   * produces a full one — a hydration mismatch on a form, which React resolves by discarding and
   * re-rendering. An effect runs only on the client and only after hydration has matched.
   *
   * window.location rather than useSearchParams(): the hook is a dynamic API and would opt
   * /contact out of static rendering entirely, which is a large price for prefilling one textarea.
   */
  useEffect(() => {
    let produit = '';
    try {
      produit = new URLSearchParams(window.location.search).get('produit') ?? '';
    } catch {
      return;
    }
    if (!produit) return;
    setFormData((prev) =>
      prev.message
        ? prev // never clobber something the shopper has already typed
        : {
            ...prev,
            message: `Bonjour, je souhaite commander ce produit : ${produit}.\n\nMerci de me confirmer la disponibilité, le prix et le délai.`,
          }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      /*
       * THE PHONE IS ITS OWN FIELD AGAIN.
       *
       * It used to be appended to the bottom of the message as "— Téléphone : …", because the
       * endpoint accepted name/email/message and nothing else and a fourth key would have been
       * silently dropped. Both halves of that are fixed as of 20/08/2026: sendContact() validates
       * and stores `phone` and `subject`, and the admin notification prints the number as a
       * tel: link at the top of the mail rather than as the last line of a paragraph.
       */
      const honeypot = (e.currentTarget as HTMLFormElement).elements.namedItem(
        'company'
      ) as HTMLInputElement | null;

      await sendContact({
        name: formData.name.trim(),
        email: formData.email.trim(),
        message: formData.message.trim(),
        phone: formData.phone.trim() || undefined,
        subject: formData.subject || undefined,
        company: honeypot?.value || undefined,
      });
      toast.success('Message envoyé. Nous vous répondons sous 24 h ouvrées.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setSent(true);
    } catch (error: any) {
      /*
       * 422 is a validation refusal and 429 is the rate limiter (6/min per IP), and both have a
       * useful thing to say. Everything else gets the generic line — a transport failure's real
       * message is a stack trace nobody can act on.
       */
      const status = error?.response?.status;
      if (status === 429) {
        toast.error('Trop de tentatives. Réessayez dans une minute.');
      } else if (status === 422) {
        toast.error('Vérifiez les champs : un e-mail valide et un message sont nécessaires.');
      } else {
        toast.error(
          error?.response?.data?.message ||
            'Envoi impossible pour le moment. Appelez-nous au 27 612 500.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * A CONFIRMATION THAT REPLACES THE FORM, not just a toast.
   *
   * A toast is gone in four seconds and leaves the filled form on screen, which is exactly the
   * state that makes people press Envoyer a second time — and this endpoint now sends two real
   * emails per press. Swapping the form for a receipt says the thing happened, says when to expect
   * an answer, and offers the faster channel. "Écrire un autre message" restores the form.
   */
  if (sent) {
    return (
      <div className="rounded-2xl border border-ok/30 bg-elevated p-6 text-center sm:p-8">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ok/10 text-ok">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="font-display text-lg font-bold uppercase tracking-wide text-ink-1">
          Message envoyé
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-2">
          Une copie vient de partir vers votre boîte mail. Nous répondons sous 24 h ouvrées, du
          lundi au samedi de 10 h à 19 h 30.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a
            href="https://wa.me/21627612500"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            C’est urgent — WhatsApp
          </a>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rule px-5 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand"
          >
            Écrire un autre message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate={false}
      className="relative rounded-2xl border border-hairline bg-elevated p-5 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={FIELD_LABEL}>
            Nom complet <span className="text-brand">*</span>
          </label>
          <Input
            id="contact-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-11 rounded-xl"
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={FIELD_LABEL}>
            Email <span className="text-brand">*</span>
          </label>
          <Input
            id="contact-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="h-11 rounded-xl"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="contact-phone" className={FIELD_LABEL}>
          Téléphone <span className="text-ink-3">(facultatif)</span>
        </label>
        <Input
          id="contact-phone"
          type="tel"
          inputMode="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="h-11 rounded-xl"
          autoComplete="tel"
          placeholder="Ex. 27 612 500"
        />
        <p className="mt-1.5 text-xs text-ink-3">Laissez-le si vous préférez qu’on vous rappelle.</p>
      </div>

      <fieldset className="mt-4">
        <legend className={FIELD_LABEL}>
          Sujet <span className="text-ink-3">(facultatif)</span>
        </legend>
        {/* Buttons with aria-pressed rather than a <select>: five options fit on one row from
            `sm`, a native select on Android opens a full-screen wheel for the same five, and the
            chosen value stays visible while the message is written. */}
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => {
            const active = formData.subject === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => setFormData({ ...formData, subject: active ? '' : s })}
                className={`min-h-[36px] rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                  active
                    ? 'border-brand bg-brand/[0.08] text-brand'
                    : 'border-hairline bg-canvas text-ink-2 hover:border-brand hover:text-brand'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/*
        HONEYPOT. Not `display: none` and not `hidden` — the crude bots this stops do read the
        computed style, and a genuinely hidden field is the one they know to skip. Off-screen,
        zero-size, aria-hidden, tabIndex -1 and autoComplete off: unreachable by pointer, by tab
        and by a screen reader, present in the DOM for anything that fills every input it finds.
        The server answers a filled one with success and stores nothing — see sendContact().
      */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="mt-4">
        <label htmlFor="contact-message" className={FIELD_LABEL}>
          Message <span className="text-brand">*</span>
        </label>
        <Textarea
          id="contact-message"
          rows={6}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="rounded-xl"
          placeholder="Votre objectif, le produit concerné, votre ville…"
          required
        />
      </div>

      <Button
        type="submit"
        className="mt-5 h-12 w-full rounded-xl bg-brand font-display font-semibold uppercase tracking-wide text-on-brand hover:bg-brand-hover"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            Envoi en cours…
          </>
        ) : (
          <>
            <Send className="me-2 h-4 w-4" />
            Envoyer le message
          </>
        )}
      </Button>
      <p className="mt-3 text-center text-xs leading-relaxed text-ink-3">
        Réponse sous 24 h ouvrées, et une copie part vers votre boîte mail. Pour une commande
        urgente,{' '}
        <a href="tel:+21627612500" className="font-semibold text-brand hover:underline">
          appelez le 27 612 500
        </a>
        .
      </p>
    </form>
  );
}
