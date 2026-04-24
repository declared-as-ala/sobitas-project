# Protein.tn - Handoff + Prompt v2

## Part A) Codebase Handoff (Token-Efficient)

### Stack and scope
- Backend admin: Laravel 12 + Filament v4 in `filament/`
- Frontend customer app: Next.js in `frontend/`
- Production-sensitive logic already live: checkout, coupons, orders, invoices, BL, ticket, stock.

### Backend architecture map (`filament/`)

#### Core models/tables already in use
- `app/Models/User.php` -> `users`
- `app/Models/Client.php` -> `clients`
- `app/Models/Commande.php` -> `commandes`
- `app/Models/CommandeDetail.php` -> `commande_details`
- `app/Models/Coupon.php` -> `coupons`
- `app/Models/CouponRedemption.php` -> `coupon_redemptions`
- `app/Models/Facture.php` -> `factures` (BL)
- `app/Models/FactureTva.php` -> `facture_tvas`
- `app/Models/Ticket.php` -> `tickets`
- `app/Models/Quotation.php` -> `quotations`

#### Existing coupon/order integration points
- Coupon apply/remove API:
  - `app/Http/Controllers/Api/CouponController.php`
- Coupon business logic:
  - `app/Services/CouponService.php`
- Order creation and coupon snapshot persistence:
  - `app/Http/Controllers/Api/CommandeController.php` (`storeCommandeApi`)
- Coupon propagation to documents:
  - `app/Services/DocumentConversion/OrderToBlService.php`
  - `app/Services/DocumentConversion/BlToInvoiceService.php`

#### Status lifecycle integration points
- API routes: `routes/api.php`
- Web/print routes: `routes/web.php`
- Order status observer hook:
  - `app/Observers/CommandeObserver.php`

#### Canonical totals / pricing engines
- `app/Services/InvoiceCalculator.php` (source of truth for totals)
- `app/Services/CouponService.php`

#### Filament panel/auth
- `app/Providers/Filament/AdminPanelProvider.php`
- `app/Providers/AuthServiceProvider.php`
- `app/Models/User.php` (`canAccessPanel`)

#### Existing resources to extend
- `CommandeResource`, `CouponResource`, `ClientResource`, `TicketResource`, `FactureResource`, `FactureTvaResource`, `QuotationResource`.

### Frontend architecture map (`frontend/`)

#### Customer auth/account
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/account/page.tsx`
- `src/app/account/OrdersSection.tsx`
- `src/app/account/orders/[id]/page.tsx`
- `src/contexts/AuthContext.tsx`

#### Checkout/coupon/order submit
- `src/app/cart/page.tsx`
- `src/app/checkout/CheckoutPage.tsx`
- `src/app/order-confirmation/[id]/page.tsx`
- `src/services/api.ts`
- `src/lib/orderPayload.ts`
- `src/app/api/orders/route.ts`

#### Best places to add loyalty UX
- Account tab/page: `src/app/account/page.tsx`
- Checkout redemption UI: `src/app/checkout/CheckoutPage.tsx`
- Shared types: `src/types/index.ts`
- API client methods: `src/services/api.ts`

### Non-breaking constraints
- Do not break existing order/coupon/document flow.
- Keep `InvoiceCalculator` as totals source.
- Preserve coupon snapshots and existing discount fields.
- Use additive migrations and compatibility-safe nullable columns.
- Enforce idempotency for commission/points creation and reversal.

---

## Part B) Ready Prompt v2 (Copy/Paste to Claude)

You are a senior Laravel Filament v4 + Next.js eCommerce architect.

I have a production eCommerce project called protein.tn.

Current stack:
- Backend admin: Laravel + Filament v4 in `filament/`
- Frontend customer site: Next.js in `frontend/`
- Existing modules in production: products, orders, coupons, stock, invoices, delivery notes, customers, frontend API consumption

Critical rule:
- Do not break existing checkout, order, coupon, invoice, product, and stock logic.
- Reuse existing totals engines and order lifecycle hooks.

Use this handoff map and do not re-scan the whole repo unless absolutely needed:

Backend key files:
- `filament/app/Http/Controllers/Api/CommandeController.php`
- `filament/app/Http/Controllers/Api/CouponController.php`
- `filament/app/Services/CouponService.php`
- `filament/app/Services/InvoiceCalculator.php`
- `filament/app/Observers/CommandeObserver.php`
- `filament/app/Services/DocumentConversion/OrderToBlService.php`
- `filament/app/Services/DocumentConversion/BlToInvoiceService.php`
- `filament/routes/api.php`
- `filament/routes/web.php`
- `filament/app/Providers/Filament/AdminPanelProvider.php`

Frontend key files:
- `frontend/src/app/checkout/CheckoutPage.tsx`
- `frontend/src/lib/orderPayload.ts`
- `frontend/src/services/api.ts`
- `frontend/src/types/index.ts`
- `frontend/src/app/account/page.tsx`
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/app/api/orders/route.ts`

Implement 3 business modules:
1) Unified Partner/Affiliate module (type = coach|gym)
2) Partner commission ledger + payouts
3) Loyalty card + QR + points

Do NOT duplicate logic between coach and gym.

### Business rules

Partner:
- One unified `partners` system with `type = coach|gym`
- Promo codes can belong to partners
- Default commission rate 10%
- Commission base: eligible subtotal after discount, excluding delivery
- Create commission only on paid/completed/delivered order stage (adapt to current order statuses)
- Reverse on cancelled/refunded
- Never delete ledger history

Loyalty:
- 1 DT spent = 1 point
- 10 points = 1 DT
- Configurable values:
  - points_per_currency
  - points_to_currency_rate
  - min redeem points
  - max discount %
  - include/exclude delivery
  - earn on discounted orders yes/no
- Earn on paid/delivered only
- No points on amount paid by points
- Reverse points on cancellation/refund

### Required schema additions (compatibility-safe)

Create migrations (additive, nullable where required, preserve existing data):

1) `partners`
- id
- user_id nullable FK
- type enum coach|gym
- name
- business_name nullable
- email
- phone
- address
- avatar nullable
- status enum pending|active|suspended
- commission_rate decimal(8,2) default 10.00
- payout_method nullable
- bank_name nullable
- rib_or_iban nullable
- notes nullable
- timestamps

2) extend coupon table (`coupons`)
- partner_id nullable FK
- commission_rate nullable
- ensure coupon code unique (if not already)
- keep all existing coupon behavior working

3) `partner_commission_transactions` (ledger)
- id
- partner_id FK
- order_id nullable FK
- promo_code_id nullable FK
- type enum commission|payout|reversal|adjustment
- amount decimal(14,3)
- balance_after decimal(14,3) nullable
- status enum pending|confirmed|cancelled|paid
- description nullable
- metadata json nullable
- created_by nullable FK
- timestamps

4) `partner_payouts`
- id
- partner_id FK
- amount decimal(14,3)
- status enum pending|paid|cancelled
- paid_at nullable
- payment_reference nullable
- admin_note nullable
- created_by nullable FK
- timestamps

5) `loyalty_cards`
- id
- client_id (or user_id based on existing customer model; prefer client linkage in this project)
- card_number unique
- qr_token unique (secure random)
- status enum active|suspended|lost
- issued_at
- timestamps

6) `loyalty_point_transactions` (ledger)
- id
- client_id (or user_id aligned with chosen ownership)
- order_id nullable FK
- type enum earn|redeem|reversal|adjustment
- points integer
- monetary_value decimal(14,3) nullable
- description nullable
- metadata json nullable
- created_by nullable FK
- timestamps

### Architecture requirements

Implement clean services (no heavy logic in controllers/resources):
- `PartnerCommissionService`
- `LoyaltyService`

Use DB transactions and idempotency:
- one commission earn per order
- one loyalty earn per order
- one loyalty redeem per order
- one reversal per cancellation/refund event

Preferred hook strategy:
- Initial attribution at order creation in `CommandeController@storeCommandeApi`
- Confirm/reverse on status transition in `CommandeObserver`

### Filament admin deliverables (French UI)

Create resources/pages:
- Partenaires
- Codes promo partenaires
- Commissions partenaires
- Paiements partenaires
- Cartes fidélité
- Transactions points

Admin features:
- create coach/gym partner
- assign promo codes
- set commission rate
- see partner generated orders
- total earned / available / paid / pending
- payout workflow + history
- date/type/status filters

### Partner dashboard

Add restricted partner panel at `/partner`:
- Tableau de bord
- Mes gains
- Mes commandes
- Mon code promo
- Historique des paiements
- Profil de paiement

Must be isolated:
- partner sees only own data
- no access to global orders/customers/settings/products of others
- secure with policies/gates/roles

### Frontend deliverables

Customer account:
- Ma carte fidélité
- Mes points
- Historique des points
- Valeur disponible (DT)
- QR card display

Checkout:
- Redeem points UI and validation
- reflect discount in totals
- send redemption payload safely

### QR + printable card

Generate secure QR from `qr_token` (not raw IDs).
Add printable loyalty card view with:
- logo
- customer name
- card number
- QR
- points rules

### Output format required from you

1) First give a short integration plan mapped to exact files.
2) Then implement in small safe commits/steps:
   - migrations
   - models/relations
   - services
   - lifecycle hooks
   - Filament resources/panel restrictions
   - frontend endpoints/UI
3) Include manual test checklist for:
   - coach/gym commission
   - payout
   - points earn
   - points redeem
   - cancellation reversal
   - duplicate status trigger idempotency

Do not remove or rewrite existing production flows unless required; extend them safely.

