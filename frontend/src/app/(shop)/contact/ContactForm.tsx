'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
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

export function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
       * The phone number is appended to the message rather than sent as its own field.
       *
       * `sendContact` posts to an endpoint that accepts name / email / message and nothing else,
       * so a fourth key would be silently dropped — and a form that asks for a number it then
       * throws away is worse than one that never asked. Asking is still right: this is a
       * cash-on-delivery shop where the reply that actually closes the loop is a phone call.
       * When the endpoint grows a `phone` column, move it out of the body.
       */
      const message = formData.phone.trim()
        ? `${formData.message}\n\n— Téléphone : ${formData.phone.trim()}`
        : formData.message;
      await sendContact({ name: formData.name, email: formData.email, message });
      toast.success('Message envoyé. Nous vous répondons sous 24 h ouvrées.');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'envoi du message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-hairline bg-elevated p-5 sm:p-6">
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
      <p className="mt-3 text-center text-xs text-ink-3">
        Réponse sous 24 h ouvrées. Pour une commande urgente, appelez-nous.
      </p>
    </form>
  );
}
