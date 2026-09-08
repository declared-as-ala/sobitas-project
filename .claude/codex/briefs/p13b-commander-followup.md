# Phase 13b — yes, relax it. The route is stricter than the API it calls.

You asked:

> May I update the quick-order server validation to allow empty email while preserving payload field
> names and all other validation?

**Yes.** You were right to stop — the brief did contradict the code — but the contradiction resolves
in your favour, and here is the evidence so you do not have to take it on trust.

`filament/app/Http/Controllers/Api/CommandeController.php`, `storeCommandeApi()`:

```php
'commande.livraison_nom'    => ['required', 'string', 'max:255'],
'commande.livraison_prenom' => ['nullable', 'string', 'max:255'],
'commande.livraison_phone'  => ['required', 'string', 'max:20', 'regex:/^(?:(?:\+|00)216[\s-]?)?[2-9](?:[\s-]?\d){7}$/'],
'commande.livraison_email'  => ['nullable', 'email', 'max:255'],
'commande.email'            => ['nullable', 'email', 'max:255'],
```

So the real backend already treats email as **nullable** and requires only the delivery name and
phone. `frontend/src/app/api/quick-order/route.ts:98` rejecting empty email with `"Email requis."`
is our own route being stricter than the API it forwards to. Relaxing it does not weaken a backend
rule — it stops contradicting one.

## Do

1. **Make email optional end to end**: the field, the route at `:98`, and anything downstream that
   assumes a non-empty string. Keep the format check for a NON-EMPTY value (`:100`) — an address
   that is provided must still be valid. Send an empty/absent `livraison_email` rather than a
   placeholder; the column is nullable.
2. Note `livraison_prenom` is nullable while `livraison_nom` is required — that is what makes the
   single "Nom complet" field safe. Split on the last space and send both when a surname is present;
   when there is only one word, send it as `livraison_nom` and leave `livraison_prenom` empty. Do
   not send `-` or `.` as filler.
3. Everything else in `p13-commander-maintenant.md` stands: phone stays required, cut the extra
   copy, aim for no scroll on 390×844.
4. **The 300 DT free-shipping threshold you found hardcoded**: check whether the cart/checkout
   derives its own threshold from config or API data. If it does, read from the same source here —
   two places disagreeing about free shipping is a promise we might break. If nothing else derives
   it and 300 is only in this component, say so and leave the number alone but note it; do not
   invent a config key.
5. You also found the delivery-address fields required by the API. If the sheet currently collects
   them, keep collecting them — do not drop a required field to shorten the form. Report which they
   are so I can raise it with the owner separately.

## Don't

- Do not change payload field names, the honeypot, or the phone regex.
- Do not touch `GoogleReviewsSection.tsx`, `ReviewMarquee.*`, `BrandsSection.tsx`,
  `VentesFlashSection.tsx`, `FlashDealCard.tsx`, `loyalty/*`, `reviews/ReviewComposer.tsx`,
  `reviews/ReviewThread.tsx`, the blog route, `layout.tsx`, `globals.css` or
  `content/categories/*.json` — all carry concurrent work.
- Do not commit, stage or push. **No network.**

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p13b npm run build   # a dist dir that does not exist yet
```

Report the field list before and after, the sheet height at 390 and 1440, whether the confirm button
needs scrolling, every line of copy removed, how you split the full name, and what you concluded
about the 300 DT threshold.
