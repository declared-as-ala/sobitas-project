# From "expédiée" to a review on the product page

*Written 20/08/2026. Owner's ask: "check the aramex api to automatically when aramex put a command
delivered we update it automatically in our db", and "run the review sender".*

---

## The finding first

The review engine was never broken. **Nothing ever told it an order had arrived.**

Live database, read 20/08/2026: **1,082 orders, and not one has ever been `livree`.** 1,057 of them
still sit at `nouvelle_commande`. Everything downstream of delivery hangs off that one value:

```
commandes.etat = 'livree'
        │
        └── CommandeObserver::updated()
              ├── delivered_at          ← the clock the review sweep measures against
              ├── PointsService         ← loyalty points, awarded on delivery
              ├── SendSmsJob            ← the status SMS to the customer
              └── reviews:send-due-requests can now see the order
```

So: no points have ever been awarded, no delivery SMS has ever gone out, and
`reviews:send-due-requests` — scheduled daily at 10:00 since July, working correctly every single
morning — has found an empty result set every time. Running it today still sends **zero** emails,
because zero orders are delivered. That is the honest answer to "run the review sender": there is
nothing yet for it to send.

Aramex knew. `AramexService::trackShipment()` has always worked, and the dashboard widget showed
the right status — but only when somebody pressed *Actualiser*, and all it wrote was
`factures.aramex_status`. It never touched the order.

---

## What now happens

`aramex:sync-tracking` runs **hourly between 08:00 and 20:00**. For every BL with a HAWB that is
not already settled it asks Aramex for the latest update, writes the code to
`factures.aramex_status`, and — when the code is in `config('aramex.delivered_codes')` — sets the
linked order to `livree` with a normal `save()`, so the observer fires.

Business hours only, because a courier does not scan a parcel at 03:00 and each run costs one
Aramex request per shipment in flight.

---

## Do this once, before you trust it

**Verify the delivered code against the real account.**

```bash
php artisan migrate                          # commandes.review_code, users.google_id
php artisan aramex:sync-tracking --dry-run
```

`--dry-run` writes nothing. It prints every shipment whose status moved and, in the last column,
every order it *would* mark delivered. Take a parcel you know arrived and check what code Aramex
reports for it against the `Vers` column.

`SH006` is the default because that is what this codebase has always mapped to *Livré* in the
dashboard widget. **Aramex update codes vary by account and product group.** If yours differs, add
it to `delivered_codes` in `config/aramex.php` — never edit the service.

Getting this wrong in the eager direction means asking somebody to review a parcel they have not
received, which is why it is a config list with a dry run rather than a literal in a loop.

Once the codes check out, let it run and watch the first day:

```bash
tail -f storage/logs/laravel.log | grep "Aramex: order marked delivered"
```

Three days after the first real delivery, the 10:00 sweep sends the first review request this shop
has ever sent. `reviews.request_delay_days` is that 3.

---

## The back catalogue

The hourly sync only sees shipments that have a HAWB. Orders delivered months ago, by hand, with no
Aramex record, stay where they are — and that is deliberate: **turning this on must not email a
year of customers about parcels they have forgotten.**

`reviews:send-due-requests` refuses them too. It only considers orders delivered between
`request_delay_days` (3) and `request_max_age_days` (21) ago.

If you *do* want to ask older customers, that is `reviews:backfill-requests`, which is manual and
has its own `--dry-run`. Read it before you run it.

---

## The review request itself

**Email** — rewritten as a letter. What it replaced was a marketing template: a red gradient hero,
a row of five ⭐, "Votre avis compte !", "Cela ne prend que 30 secondes", a gradient button, "Merci
pour votre confiance 🙏". Every one of those is a device a reader has seen a hundred times.

The new one gives a reason instead, and the reason is true: we took down 203 reviews because none
of them had a purchase behind it, so the product pages show nothing at all today. It also invites a
bad review as plainly as a good one — partly because review-gating is against Google's rules, and
mostly because a request that only wants stars reads as insincere.

Subject went from `Comment s'est passée votre commande ? Donnez votre avis ⭐ — Protein.tn`
(truncated to `Comment s'est passée votre comm…` on a phone) to `Votre avis sur la commande #1234`.
Reply-To is the shop, because the body invites a reply.

**SMS** — written, and **off by default**:

```dotenv
REVIEW_REQUEST_SMS_ENABLED=true
```

It will convert better than the email — every customer here gives a phone number and far fewer read
email — and it costs money per send, so that is the owner's call, not a default.

It is **one segment**, not three, and that is why `commandes.review_code` exists. The review link
built from `order_token` is 88 characters, which alone is more than half a message; the short code
takes it to 34. A 64-character hex string in a text message also reads, correctly, as something not
to tap.

---

## Do the emails and the SMS actually arrive?

```bash
php artisan notifications:doctor                       # config only, sends nothing
php artisan notifications:doctor --order=1234          # + the real messages for that order
php artisan notifications:doctor --order=1234 --send-email=vous@exemple.tn
php artisan notifications:doctor --order=1234 --send-sms=+216XXXXXXXX
```

Nothing is sent unless you pass an address or a number, and it goes **to what you passed**, never
to the customer on the order.

Two things it will tell you about this install, and both are worth acting on:

**Order confirmations are sent from a personal Gmail.** `MAIL_FROM_ADDRESS` and the SMTP username
are `bitoutawalid@gmail.com`, and `ADMIN_EMAILS` defaults to the same address. So a customer who
has just ordered — and paid nothing, and is waiting for a parcel — gets their confirmation from a
personal Gmail rather than from `contact@protein.tn`. That reads as a scam, and it caps the shop at
a free Gmail account's daily send limit.

**That mailbox's app password is committed to this repository.** It was a literal in
`config/mail.php` with no `env()` around it. The config now reads the environment with the old
values as fallback, so nothing breaks on deploy — but **the password should be revoked and
reissued**, and the new one belongs in `filament/.env`:

```dotenv
MAIL_HOST=…
MAIL_USERNAME=contact@protein.tn
MAIL_PASSWORD=…                      # the NEW one
MAIL_FROM_ADDRESS=contact@protein.tn
ADMIN_EMAILS=contact@protein.tn
FRONTEND_URL=https://protein.tn      # or reset links point at admin.protein.tn
```

**The SMS gateway's answer used to be thrown away.** `Http::get($apiUrl);`, return value discarded
— so an empty credit balance, a revoked key or a blocked sender id looked exactly like a
successful send. It is checked and logged now.

And the order-confirmation SMS carried `✅` and `🙌`. One character outside GSM-7 switches the whole
message to UCS-2, where a segment is 70 characters instead of 160 — so those two glyphs were
turning a one-segment confirmation into three, **on every order this shop has ever taken**.
`SmsService::toGsm7()` transliterates what it can and drops what it cannot; `é è à ù ç` are in the
GSM-7 alphabet and are left alone.

---

## Deploy checklist

```bash
php artisan migrate                    # google_id, review_code, contact phone/subject
php artisan config:clear
php artisan aramex:sync-tracking --dry-run     # verify the delivered code, then let the schedule run
php artisan notifications:doctor               # read both warnings
```

And confirm the **scheduler container** is running (`schedule:work`) — without it neither the
Aramex sync nor the review sweep exists.
