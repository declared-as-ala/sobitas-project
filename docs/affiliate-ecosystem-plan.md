# Affiliate ecosystem — build plan

**Date:** 09/09/2026 · **Status:** planning → build
**Decision:** EXTEND the existing `Partner` module, renamed throughout to **Affilié**. Do not clone it.

---

## 0. Why extend rather than build new

A case-insensitive search for `affili` across the backend returns nothing — but a **Partner** module
exists and already implements, correctly, five things this feature needs:

- application records with `pending / active / suspended / rejected`
- per-partner `default_commission_rate` (the margin)
- an **immutable money ledger** (`partner_transactions`): signed `decimal(14,3)` amount,
  `balance_after`, `type`, `status`, JSON `metadata`, `created_by`
- denormalised wallet balances (`current_balance`, `total_earned`, `total_paid`)
- payouts, promo codes, and a **dedicated Filament panel** for the partner themselves

`PartnerTransactionService` encodes money discipline that took real incidents to learn:
`DB::transaction`, `lockForUpdate` on both parties, idempotency guards, compensating negative rows
instead of edits, `round(…, 3)` with epsilon comparison.

**Cloning that into a parallel `Affilie*` service would mean two implementations of the same money
logic, drifting apart, each needing every bug fixed twice.** One ledger, one audit trail.

---

## 1. What already works (do not rebuild)

| Concern | Where |
|---|---|
| Ledger + balances | `partner_transactions`, `PartnerTransactionService` |
| Payout recording | `recordPartnerPayment()`, `partner_payouts` |
| Reversal pattern | negative row + `metadata.reverses_transaction_id` |
| Self-service panel | `app/Filament/Partner/**` (dashboard, ledger, payments) |
| Admin resource | `PartnerResource` (+ unregistered Coach/Gym subclasses) |
| Referral codes | `partner_codes`, `Coupon.partner_id / is_partner_code / applies_channel` |
| Balance rebuild | replay routine in migration `2026_05_08_160200` |

## 2. What does not exist (the actual build)

1. **Commission on website orders.** `partner_transactions` has `ticket_id` only — no `commande_id`.
   `commandes` has no `partner_id`. Commission is POS-only today.
   The bridge was half-designed: `Coupon::allowsWebsite()` exists and **nothing calls it**.
2. **Accrual on delivery.** POS commission fires at sale time. There is no delivery-gated accrual.
3. **Affiliate-created orders.** The partner panel's sale-ticket resource is list-only.
4. **KYC.** No document upload of any kind. Every `FileUpload` in the app uses `disk('public')` —
   world-readable by URL. ID cards need a private disk.
5. **OTP** on phone and email.
6. **Approve / reject in the UI.** `PartnerStatus` has `pending` and `rejected`, the table defaults
   to `pending`, but the admin Select offers only Active/Suspended. **Every application submitted
   through /partenaires is stuck in `pending` with no path out.** This is a live bug.
7. **`individual` and `marketer`** partner types.
8. ~~**Per-affiliate subdomain attribution** (`x.protein.tn`).~~ **BUILT.** `ali.protein.tn` serves
   the storefront, middleware resolves the label against `/api/affilie-subdomains/{sub}` and writes
   the `pt_aff` cookie, and `CommandeController` re-resolves it to set `commandes.affilie_id`.
   Every non-apex host is `noindex, nofollow` so no duplicate storefront can be indexed. Inert until
   the wildcard DNS + origin certificate in `docs/PARTNER-SUBDOMAINS.md` exist. The commission
   ACCRUAL (item 2 above) is still missing — the link is written, the ledger row is not.
9. **Return fee** charged back to the affiliate.
10. **Weekly (Friday) payout batch.**

---

## 3. The money model — as specified by the owner

One running balance per affiliate. Every event is a signed, immutable row.

| Event | Row | Status |
|---|---|---|
| Affiliate creates order | commission `+X` | `pending` |
| Order reaches `livree` | (same row) | `confirmed` — payable |
| Friday payout | payout `−X` | `paid` |
| Parcel returned | commission reversal `−X`, **plus** return fee `−10 DT` | |

**Rules**

- **The return fee is the affiliate's, never the shop's.** Deducted from balance if funded.
- **If unfunded, the balance goes negative and stays as a debt**, netted off future commissions.
- Therefore: **fees may overdraw; payouts may not.** `recordPartnerPayment()` currently refuses to
  overdraw — that guard is correct for payouts and must NOT be applied to fees.
- Accrual is gated on delivery for the same reason loyalty points are. `PointsService` records it:
  > *"these are cash-on-delivery orders, so crediting points before the customer has paid/received
  > would let a place-then-cancel loop farm points."*
  The same exploit with commission is worth more money.

**Open decisions (owner):** fee amount fixed vs per-affiliate · admin waiver action ·
debt ceiling before new orders are blocked · Friday batch automatic vs admin-confirmed.

---

## 4. Delivery vocabulary — use ONE source

`PointsService::DELIVERED_STATUSES = ['livree','livrée','livre']`
`PointsService::CANCELLED_STATUSES` = 7 spellings, of which the admin UI only ever emits `annuler`.

Accrual and reversal must read these constants, not new literals, so there is one delivery
vocabulary in the system rather than two. Drive from `CommandeObserver::updated()` on
`wasChanged('etat')`, mirroring `PointsService::syncOnStatusChange()`.

Aramex promotes an order to `livree` only for codes in `config('aramex.delivered_codes')`
(`SH005, SH006, SH234, SH496, SH534`) and reads the **full** tracking history, taking the earliest
delivery event — both are fixes for real incidents; do not bypass them.

---

## 5. Schema additions

```
commandes                +partner_id (FK, nullable, index)
                         +partner_code_id (FK, nullable)
                         +partner_commission_processed_at (timestamp, nullable)
partner_transactions     +commande_id (nullable, index)   -- mirrors ticket_id
partners                 +KYC: id_document_front, id_document_back, kyc_status,
                                kyc_reviewed_at, kyc_reviewed_by, kyc_reject_reason
                         +verification: phone_verified_at, email_verified_at
                         +subdomain (unique, nullable)
                         +return_fee_override (nullable)
```

Plus a rename of every `partner*` table to `affilie*`, with defensive `Schema::hasTable` guards so
it is safe to run before or after the database restore.

---

## 6. Rename map (owner: "I don't want to see partner")

| From | To |
|---|---|
| `partners` | `affilies` |
| `partner_transactions` | `affilie_transactions` |
| `partner_payouts` | `affilie_payouts` |
| `partner_codes` | `affilie_codes` |
| `Partner*` models / enums / services | `Affilie*` |
| `app/Filament/Partner/**` | `app/Filament/Affilie/**` |
| panel id `partner`, path `/partner` | `affilies`, `/affilies` |
| nav group "Partenaires" | "Affiliés" |

`partner_commission_transactions` is already **superseded** by `partner_transactions`
(migration `2026_05_08_160200` migrated the rows across). Do not carry it forward.

---

## 7. Frontend

- **Accès Pro** (header) → affiliate landing with two clear actions: **Se connecter** and
  **Devenir affilié**. Today it points at `/partenaires`, a lead-capture form only.
- Signup: type (individual / coach / gym / marketer) → identity + contact → **ID card, both sides**
  → phone OTP → email OTP → submitted for review.
- Login sends the affiliate to their panel. Proposal: `affilie.protein.tn` (Cloudflare CNAME) so a
  coach never sees `admin.protein.tn`.
- Subdomain attribution: `{code}.protein.tn` sets the attribution cookie already anticipated by
  `PartnerApplication.referred_by_code`.

---

## 8. Known hazards to respect

- **Filament v4.2** — `protected string $view` must be **non-static**; the form signature is
  `form(Schema $schema)`; actions come from `Filament\Actions`, not `Filament\Tables\Actions`.
- **No auto-discovery.** A resource is invisible until registered in the panel provider array.
- **KYC must not use `disk('public')`.** Every existing upload does; ID cards would be
  world-readable by URL.
- **`AFFILIATE_LOYALTY_README.md` at the repo root is stale and aspirational.** It documents columns
  and rates that do not exist. Do not design from it.
- Two parallel loyalty economies already exist (`users.points_balance` for the storefront,
  `clients.loyalty_points_balance` for POS). Do not add a third.
- `DocumentPdfController::downloadFacture()` re-implements BL totals instead of calling
  `InvoiceCalculator` — a second arithmetic path that will diverge. Do not add a third.

---

## 9. Security — separate from this feature, urgent

`config/aramex.php` holds **live production Aramex credentials as hardcoded literals**
(`username`, `password`, `account_number`, `account_pin`), `sandbox = false`, **committed to git**.
The VPS that held this repo was compromised. These credentials authorise creating COD shipments and
collecting cash. **Rotate with Aramex and move to `.env`.**
