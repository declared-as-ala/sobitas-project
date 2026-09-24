# WhatsApp order confirmation

Sends the customer a WhatsApp message asking them to confirm their order. Built on the **Meta
(Facebook) WhatsApp Cloud API** — the official, ban-safe channel.

The code ships **inert**: nothing is sent until the env vars below are set. Once configured, staff
send it per order with the **WhatsApp** button on the order, or you flip on automatic sending.

## What you (the owner) must set up once

1. **Meta Business + WhatsApp Business Account.** In [business.facebook.com](https://business.facebook.com)
   create/verify the business, then add **WhatsApp** and a sender phone number
   (a number not already on a personal WhatsApp).
2. **Permanent access token.** Business Settings → Users → **System users** → create one → generate a
   token with `whatsapp_business_messaging` + `whatsapp_business_management`. This is a real secret.
3. **Phone number id.** WhatsApp → API setup → copy the sender's **Phone number ID**.
4. **Message template.** Because we message the customer *before* they write to us, Meta requires a
   **pre-approved template** (free-form text is only allowed inside a 24h window the customer opens).
   Create a template (WhatsApp Manager → Message templates) with a **body of three variables in this
   order**: `{{1}}` client name, `{{2}}` order number, `{{3}}` total. Example FR body:

   > Bonjour {{1}}, votre commande n°{{2}} d'un montant de {{3}} a bien été reçue. Répondez OUI pour la confirmer. — SOBITAS

   Submit it for approval; note its **name** and **language** (e.g. `fr`).

## The env vars (VPS `.env`, never committed)

```
WHATSAPP_TOKEN=EAAG...                 # the permanent token from step 2
WHATSAPP_PHONE_NUMBER_ID=1234567890    # step 3
WHATSAPP_TEMPLATE=confirmation_commande # the approved template name from step 4
WHATSAPP_TEMPLATE_LANG=fr
WHATSAPP_API_VERSION=v21.0
WHATSAPP_AUTOSEND=false                 # true = message the customer automatically on every new order
```

After editing `.env` on the VPS, run `php artisan config:clear` (or redeploy) so the values load.

## How it behaves

- **Manual (default):** a **WhatsApp** button appears on each order once the token + number id are
  set. Click it → the customer is sent the confirmation. The button confirms before sending and
  won't double-send silently (it records `whatsapp_confirmation_sent_at`).
- **Automatic (opt-in):** set `WHATSAPP_AUTOSEND=true` and every new **direct customer** order sends
  the confirmation on creation. **Affiliate orders are skipped** — they arrive already sold and
  paid-on-delivery, so there is no customer to confirm with.
- **Idempotent:** an order is never messaged twice for the same confirmation unless a human forces a
  resend from the button.
- **Safe:** all of it is wrapped so a WhatsApp outage can never break order creation; failures are
  logged (`storage/logs`, daily channel) with the real Meta error (unapproved template, number not
  on WhatsApp, expired token…).

## Files

- `config/services.php` → `services.whatsapp.*`
- `app/Services/WhatsAppService.php` — the sender (template or, for testing, plain text)
- `app/Jobs/SendWhatsAppConfirmationJob.php` — queued, one attempt, idempotent
- `app/Filament/Resources/CommandeResource.php` — the **WhatsApp** row action
- `app/Observers/CommandeObserver.php` — the gated auto-send on order creation
- migration `…_add_whatsapp_confirmation_sent_at_to_commandes` — the sent-stamp
