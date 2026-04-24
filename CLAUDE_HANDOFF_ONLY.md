# Protein.tn - Claude Handoff Only

## Project scope
- Production eCommerce platform.
- Frontend customer site: `frontend/` (Next.js).
- Admin/dashboard backend: `filament/` (Laravel + Filament v4).
- Existing production-critical flows: checkout, coupons, orders, stock, tickets, BL, invoices.

## High-confidence architecture map

### Backend (`filament/`)

#### Core domain models/tables in active use
- `app/Models/User.php` -> `users`
- `app/Models/Client.php` -> `clients`
- `app/Models/Product.php` -> `products`
- `app/Models/Commande.php` -> `commandes`
- `app/Models/CommandeDetail.php` -> `commande_details`
- `app/Models/Coupon.php` -> `coupons`
- `app/Models/CouponRedemption.php` -> `coupon_redemptions`
- `app/Models/Ticket.php` -> `tickets`
- `app/Models/Facture.php` -> `factures` (BL)
- `app/Models/FactureTva.php` -> `facture_tvas`
- `app/Models/Quotation.php` -> `quotations`

#### Coupon and order integration points
- Coupon API layer:
  - `app/Http/Controllers/Api/CouponController.php`
- Coupon logic:
  - `app/Services/CouponService.php`
- Order creation + coupon persistence:
  - `app/Http/Controllers/Api/CommandeController.php` (`storeCommandeApi`)
- Coupon/document propagation:
  - `app/Services/DocumentConversion/OrderToBlService.php`
  - `app/Services/DocumentConversion/BlToInvoiceService.php`

#### Lifecycle hook points (best for new partner/loyalty logic)
- Order creation API:
  - `app/Http/Controllers/Api/CommandeController.php`
- Status transition observer:
  - `app/Observers/CommandeObserver.php`
- API routes:
  - `routes/api.php`
- Print/document routes:
  - `routes/web.php`

#### Totals/pricing source of truth
- `app/Services/InvoiceCalculator.php`
- `app/Services/CouponService.php`

#### Filament panel/auth surface
- `app/Providers/Filament/AdminPanelProvider.php`
- `app/Providers/AuthServiceProvider.php`
- `app/Models/User.php` (`canAccessPanel`)
- Existing resources include: `CommandeResource`, `CouponResource`, `ClientResource`, `TicketResource`, `FactureResource`, `FactureTvaResource`, `QuotationResource`.

---

### Frontend (`frontend/`)

#### Auth/account surfaces
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/account/page.tsx`
- `src/app/account/OrdersSection.tsx`
- `src/app/account/orders/[id]/page.tsx`
- `src/contexts/AuthContext.tsx`

#### Checkout/coupon/order submit surfaces
- `src/app/cart/page.tsx`
- `src/app/checkout/CheckoutPage.tsx`
- `src/app/order-confirmation/[id]/page.tsx`
- `src/services/api.ts`
- `src/lib/orderPayload.ts`
- `src/app/api/orders/route.ts`

#### Best insertion points for loyalty UX
- Account loyalty section/tab: `src/app/account/page.tsx`
- Checkout redemption UI: `src/app/checkout/CheckoutPage.tsx`
- Shared types: `src/types/index.ts`
- API methods: `src/services/api.ts`

---

## Existing behavior constraints to preserve
- Keep checkout/order/coupon logic backward-compatible.
- Do not bypass `InvoiceCalculator`.
- Preserve coupon snapshot behavior used by BL/invoice flow.
- Avoid breaking stock updates tied to order/document flows.
- Use additive migrations and nullable extensions where possible.

## Suggested extension strategy (safe)
- Add new modules by extending current flow, not replacing it.
- Use service classes for new business logic.
- Use DB transactions around status-triggered financial/points writes.
- Implement strong idempotency per order and transaction type.
- Use ledger tables for commissions and points (append-only history).

## Known integration risks
- Decimal precision differences across existing money fields (2 vs 3 decimals) can cause reconciliation issues.
- Observer-based side effects can duplicate writes if idempotency is not enforced.
- Auth/roles have legacy assumptions; policy checks should be explicit for new partner panel.
- Keep API contracts stable for frontend checkout during rollout.

## Recommended immediate implementation anchors
- Backend:
  - `app/Http/Controllers/Api/CommandeController.php`
  - `app/Observers/CommandeObserver.php`
  - `app/Services/CouponService.php`
  - `app/Services/InvoiceCalculator.php`
  - `routes/api.php`
  - `routes/web.php`
- Frontend:
  - `src/app/checkout/CheckoutPage.tsx`
  - `src/services/api.ts`
  - `src/lib/orderPayload.ts`
  - `src/types/index.ts`
  - `src/app/account/page.tsx`
  - `src/contexts/AuthContext.tsx`

