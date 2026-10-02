**Protinas / pack / coupon / welcome / delivery: current-system map**
Repo `C:/mls`, HEAD `4bbc6db8` (02/10, "Protinas rules — one discount per order, 10 % ceiling, server-priced checkout"). Read-only: nothing was modified.

There are two separate ledgers that never mix:
- **Online:** `users.points_balance` plus `user_point_transactions`, run by PointsService.
- **Shop till:** `clients.loyalty_points_balance` plus `loyalty_point_transactions`, run by LoyaltyService.

## 1. Current rules (file:line, exact behaviour)

### 1.1 One pricing engine
`filament/app/Services/CheckoutPricingService.php` `price()` (L24-122) works entirely in integer millimes. Two endpoints call it:
- `quote()`: `CommandeController.php:617-619`. Route `api.php:120`, throttle `checkout-quote`, set in `AppServiceProvider` (60/min per user or IP).
- `storeCommandeApi()`: `CommandeController.php:395-399`.

`homeDelivery` is hard-coded `true` in both calls. The rules are published at `GET /api/loyalty/rules` (`LoyaltyRulesController.php:13-33`, cached 300 s).

**Goods** (L33-42):
- `goods` = Σ `getEffectiveUnitPrice()` × qty. That is the promo price when `hasActivePromo()` is true (`Product.php:341-365`).
- `fullPriceGoods` = the same sum over non-promo lines only.

### 1.2 Pack (opt-in)
- **Opt-in:** applies only when the request sends `pack_discount=true`. The storefront sets that only from the pack-builder (`PackBuilderClient.tsx:266` → `CartContext` localStorage `cart_pack_discount`).
- **Tier choice:** taken on the gross `goods`, promo lines included (L45, `PackDiscountService::percentForSubtotal` L37-47).
- **Tiers:** `config/loyalty.php:3-7`, env `PACK_TIERS` parsed at L9-26. Values: 200 → 3 %, 350 → 5 %, 500 → 7 %.
- **Promo exclusion:** the pack base is `fullPriceGoods` when `loyalty.pack.exclude_promo_lines` is true (default true; `loyalty.php:38`, env `PACK_EXCLUDE_PROMO_LINES`). Applied at CheckoutPricingService L46 and `PackDiscountService::amountForSubtotal` L60-61 (used by `PackController::quote` L42/56/68-69, the `/pack/quote` endpoint).
- **Effect:** promo lines count toward the threshold but get no pack discount.

### 1.3 Coupon vs pack (L52-72)
- **Validation:** `CouponService::validateCoupon` checks active, channel, dates, `min_order_amount` against goods, total and per-client limits.
- **Amount:** `computeDiscount` (L104-136). A percentage applies to the whole `goods`, promo lines included, capped by `max_discount_amount`. A fixed amount is `min(value, goods)`. Both are rounded to 2 decimals.
- **Winner:** the coupon is applied only if `couponAmount > packAmount`; then `packAmount = 0`. On a tie the pack wins with reason `pack_better`, and the losing coupon is not consumed: no `CouponRedemption` row (`CommandeController:446`).
- **Exception:** a free-shipping coupon only zeroes shipping and is marked applied. It keeps the pack, so pack + free shipping + Protinas all stack.

### 1.4 Ceilings (L73-84)
- `commercial` = pack + applied coupon.
- `ceiling` = `intdiv(goods × max_total_discount_percent, 100)`. The percentage is `loyalty.checkout.max_total_discount_percent`, env `LOYALTY_MAX_DISCOUNT_PERCENT`, default 10 (`loyalty.php:30`).
- `room` = `max(0, ceiling − commercial)`. An owner coupon above 10 % is honoured on its own and leaves 0 room for points.
- `maxPoints` = `min(balance, intdiv(room × points_per_dt, 1000))`. At 20 points per DT one point is exactly 50 millimes, so it is floored to whole points.
- `requested > balance` throws a `DomainException`; both controllers return a 422 before it gets there.
- **Shipping is never covered by points:** `goodsPaid = max(0, goods − commercial − points)`, and total = `goodsPaid + shipping`.
- **Legacy helper:** `PointsService::computeRedemption` (L93-118) applies the same 10 % rule. It is only used by the unit test.

### 1.5 Delivery (L48-50)
- 10 DT when gross goods are under 300 DT; otherwise 0. Config `loyalty.php:31-32`, env `DELIVERY_FEE_DT` and `FREE_DELIVERY_FROM_DT`.
- The client's `frais_livraison` is accepted but ignored (`CommandeController:105`).
- `commande.livraison` only accepts `1` (`:104` and quote `:555`), so a crafted 0 or array gets a 422.
- Validation already accepts `points_to_redeem`; there is no field that could cover the delivery fee.

### 1.6 Order creation and storage (CommandeController)
- **Stock:** decremented atomically (L297-313). Server prices only.
- **Identity:** only the Sanctum token owner can spend or earn points.
- **`authenticated_user_id`:**
  - API checkout writes the user id (L215) or 0 for a guest (L220-222).
  - `Commande::creating` forces 0 on every other creation path (admin form, devis conversion, affiliate desk), so those orders never earn.
- **Spending points** requires:
  - `hasVerifiedContact()` = email OR phone verified (`User.php:52-55`; checked at L371 and quote L571);
  - a locked user row (L377-383).
- **409:** when `|server total − expected_total|` exceeds 0.01 DT (tolerance config `loyalty.php:33`). Thrown at L401-413 inside the transaction, so stock, the order number and the client row all roll back. The body carries `pricing`.
- **Legacy guard** (no `expected_total`): `refuseLegacyClientMismatch` L511-536 returns 422 when:
  - requested points exceed `used_points` (message cites `max_usable_points` and `ceiling_percent`), or
  - pack and a non-free-shipping coupon are both requested while the pack tier is above 0.
- **Columns written** (L415-437):

| Column | Value |
|---|---|
| `prix_ht` | gross goods |
| `discount_ht` | coupon only |
| `discount_ttc` | coupon only |
| `pack_discount_ht` | pack |
| `points_discount_ht` | points in DT |
| `points_redeemed` | points used |
| `remise` | pack + points (not the coupon) |
| `discount_amount` | total discount |
| `frais_livraison` | server shipping |
| `prix_ttc` | total to pay |

- **Redeem ledger row:** L439-443, key `order:{id}:redeem`.
- **Replay:** `storedPricing` (L674-688) rebuilds the pricing from the stored columns.
- **Storefront:**
  - `CheckoutPage.tsx` quotes on every change (L175-234) and sends `expected_total = visiblePricing.total_dt` (L373-377).
  - A 409 shows the new total and needs a second tap (L470-476).
  - The order proxy passes `pricing` through on errors (`api/orders/route.ts:54`, guarded by `scripts/check-order-error-proxy.mjs`).

### 1.7 Earning: timing and base
- **Trigger:** `CommandeObserver::updated` L112-128, on `wasChanged('etat')`, calls `PointsService::syncOnStatusChange` (L145-197).
- **Delivered statuses:** `livree`, `livrée`, `livre` (PointsService L43). They are set by:
  - the Aramex sync (`AramexTrackingSync.php:335-336`, uses `save()`);
  - the admin bulk "mark delivered" (`CommandeResource.php:364-371`, skips `annuler`).
- **User resolution:** `authenticated_user_id`; NULL means a legacy order and falls back to `user_id`; 0 means guest and is skipped (L147-160).
- **Base:** `earnableSpend(prix_ttc, frais_livraison, prix_ht)` = `min(prix_ht, prix_ttc − frais)` (L78-82), then `floor(DT × earn_per_dt)` (L63-70). Config `loyalty.php:41-42`: 1 point per DT earned, 20 points = 1 DT, so 5 % back. Spent points and shipping do not earn.
- **Dedupe:** any `earn` row for that `commande_id` (L252-258), plus key `order:{id}:earn`. The quote's preview is `earn_on_delivery_points` (CheckoutPricingService L117).

### 1.8 Reversal on cancel / return / refusal
- **Statuses:** `CANCELLED_STATUSES` (L46) = annuler, annulee, annulée, retour, retourner, retournee, retournée.
- **Refusal is not its own status.** The admin dropdown (`Commande::getStatusOptions` L304-314 and the `commande-form.blade.php:318-324` select) offers only `annuler`, and Aramex never writes a negative status (`AramexTrackingSync:88`). A refused or returned parcel is therefore `annuler`.
- **`reverseForCommande`** (L205-238):
  - claws back earned points (`adjustment` −earned, key `order:{id}:earn-reversal`);
  - refunds redeemed points (`adjustment` +redeemed, key `order:{id}:redeem-refund`);
  - each happens once, deduped by the sign of an existing adjustment.
- **Then `WelcomeBonusService::reverseUnlock`** (L151-187), only if this order unlocked the welcome bonus.
- **Stock** is restored only for `annuler` (`CommandeObserver:228-231`, `restoreStockForCancelledOrder`).
- **Balance floor:** `record()` floors the balance at 0 (L430-433) but writes the full negative row. A clawback of points that were already spent is silently forgiven, and the balance drifts from the ledger sum. `ProtinasAudit` L91-96 reports that drift.

### 1.9 Welcome bonus
- **Amount and switches** (`config/welcome_bonus.php`):

| Line | Key | Default | Env |
|---|---|---|---|
| 4 | `points` | 300 (15 DT) | — |
| 5 | `unlock_on_first_delivery` | true | `WELCOME_BONUS_UNLOCK_ON_DELIVERY` |
| 6 | `unique_delivery_phone` | true | — |
| 7 | `enabled` | true | — |
| 9 | `include_existing_customers` | true | — |
| 11 | `daily_sms_limit` | 100 | — |

- **Eligibility:** `PhoneVerificationService::bonusStatus` L40-61 returns `awarded`, `pending`, `claimable`, `paused`, `not_eligible` (role ≠ 2), `phone_required` or `already_used`. `already_used` means the phone hash or email hash already sits in `welcome_bonus_claims`, which has unique `user_id`, `phone_hash` and `email_hash` (migration `2026_09_03_160000:44-46`; no FK, so deleting the account never pays twice).
- **What phone verification does now:** `verify()` L241-265 → `awardWelcomeBonus` L64-95 inserts a claim with `credited_at` NULL, which is only a reservation: no ledger row. Then:
  - if the account already has a delivered order, it calls `unlockOnDelivery(user, that order)` (L91-94);
  - if the switch is off, it calls `creditPending` (L84-86).
- **Release on delivery:** `syncOnStatusChange` → `WelcomeBonusService::unlockOnDelivery` (L92-140):
  - requires `authenticated_user_id == user`;
  - if the delivery-phone fingerprint already unlocked another account, it refuses;
  - credits with key `welcome:{uid}:unlock:{commandeId}`, versioned `:v` after reversals (L26-51);
  - sets `credited_at`, `unlocked_by_commande_id`, `unlock_phone_hash` and `users.welcome_bonus_awarded_at`.
- **`reverseUnlock`** recovers `min(balance, points)`. If nothing can be recovered the claim stays credited; if part is recovered, the claim goes back to pending for that amount only.
- **Kill switch already built:** with the switch off, `creditPending` (L65-85) credits immediately with key `welcome:{uid}:unlock:0`; slot 0 is never reversed.
  - `claim-bonus` (`api.php:293`) credits pending claims.
  - `protinas:welcome-release-pending [--apply]` (`WelcomeReleasePending.php`) refuses while the switch is on (L46-50) and credits every pending claim (L55-71).
  - `/loyalty/rules` then reports `welcome.unlock = 'phone_verification'` (`LoyaltyRulesController:31`).
- **Before 02/10** the welcome bonus was credited at verification itself, with description `'Cadeau de bienvenue — 15 DT en points'` and no idempotency key (`git show 4bbc6db8^:…PhoneVerificationService.php:63`).

### 1.10 OTP and SMS gateway
- **Gateway:** WinSMS Pro, HTTP GET `https://www.winsmspro.com/sms/sms/api` with `action=send-sms`, `api_key`, `to`, `from`, `sms` (`SmsService.php:13, 100-150`; config `services.sms.api_key` / `sender_id`, env `SMS_API_KEY` / `SMS_SENDER_ID`). Text is normalised to GSM-7.
- **Sending:** synchronous inside the request, no retries (`PhoneVerificationService:176-184`).
- **Code:** 6 digits, hashed, valid 180 s, 5 attempts.
- **Limits** (L148-164): resend after 60 s; 3 per hour and 5 per day per user-or-phone; 5 per hour and 15 per day per IP; 100 per day shop-wide; plus route throttle `3,60` (`api.php:291`). The allocation runs under `Cache::lock`.
- **Email verification never awards the welcome bonus.** `EmailVerificationOtpService::verify` L62-110 only sets `email_verified_at` and reconciles reviews; the mail is queued on the `auth` queue (L54). Google sign-in sets `email_verified_at` and `welcome_bonus_eligible` (`ClientController:314, 338`) but awards nothing. An email-only account is `phone_required` for the bonus, yet may still spend points (`hasVerifiedContact`).

### 1.11 Reviews
- `ReviewObserver` L95-138 calls `PointsService::awardForReview` (L292-340): 10 points, or 50 for a verified purchase (`config/reviews.php:125, 128`).
- Requires phone verification, a minimum comment length, and `ReviewAuthenticity` `may_earn_points`.
- Key `review:{rid}:award`. Clawed back when the review is unpublished (`reverseForReview` L349-388, key `review:{rid}:reversal`).

### 1.12 Expiry
- None, online or at the till. Nothing writes type `expiry`.
- The enum already has it in both ledgers (`2026_07_13_000002…:20`, `2026_04_25_000003…:20`), with an admin label in `UserPointTransactionResource:36`.
- Customer copy promises no expiry: `FidelitySection.tsx:145-146` and `MemberDashboard.tsx:186`. Spec R5/R6 also says no expiry and that existing balances are grandfathered.

### 1.13 Admin and till
- **Online points have no admin write path.** `UserPointTransactionResource` is read-only (`canCreate` false at L103). `CommandeResource` and `commande-form.blade.php:294-306` only display the pack / coupon / Protinas breakdown.
- **Till** (`TicketPosPage`, `LoyaltyService`):

| Rule | Value / location |
|---|---|
| Earn per DT | 1 (`loyalty.php:45-50`) |
| Points per DT | 20 |
| Ceiling | 10 % of the ticket, minus manual and affiliate discounts |
| Minimum redemption | 100 points (`maxRedeemablePoints` L205-212, `validateRedemption` L214-236) |
| Earn timing | immediate on ticket save |
| Earn amount | `floor(base_after_affilie − loyalty_discount)` (`processTicketLoyalty` L240-349, called at `TicketPosPage:665-681`) |
| Ticket-cancel reversal | none |
| Manual adjustment | `adjustPoints` (L353-386) exists but nothing calls it |
| Admin balance field | disabled (`ClientResource:73-78`) |

- Online Protinas cannot be used at the till and the reverse is also true.

### 1.14 Storefront consumers
- **Pricing type:** `src/util/checkoutPricing.ts:6-22`.
- **Fallbacks:** `src/util/loyaltyPoints.ts`. Constants L17-31 (`MAX_TOTAL_DISCOUNT_PERCENT=10`; welcome `unlock: 'first_delivered_order'`) and `maxRedeemablePoints` fallback L64-67.
- **Checkout and summary UI:**
  - redeemer: `CheckoutPage.tsx:743-763` (mobile) and 926-935 (desktop);
  - breakdown rows: 938-1014;
  - "jusqu'à {max_total_discount_percent} % de vos articles": L973 and `CheckoutFooterCTA.tsx:115`;
  - shipping line: L977-997;
  - earn line for guests: L761 and L1014 use `total_dt − shipping_dt`.
- **Redeemer component:** `LoyaltyPointsRedeemer.tsx` is generic; its maximum comes from the server.
- **Cart:** `cart/page.tsx:109-114, 334-335` hard-codes "(hors articles en promo, non cumulable avec un code promo)"; earn line at L374.
- **Pack-builder:** `wizard/StepWelcome.tsx:90` hard-codes the same text.
- **Order receipt:** `OrderReceipt.tsx:88-127` and `OrderDocument.tsx:34-43` render rows from the server `totals`; the reconciliation is in `ClientController.php:768-793`.
- **Welcome "delivery" copy, hard-coded:**
  - `VerifyPhonePage.tsx:127, 128, 137, 147`
  - `AccountVerificationCard.tsx:59, 61`
  - `FidelitySection.tsx:139-148`
  - `MemberDashboard.tsx:54-56, 128-129, 185`
  - `RegisterPage.tsx:194`
  - `VerifyEmailPage.tsx:108`
  - `VerificationArtwork.tsx:48, 55`
- **APIs exposing welcome state:** `PointsController::history` (L22-50: `welcome_status`, `pending_welcome_points`, last 50 rows), `MemberDashboardController:43-44, 56-71`, `ClientController` profile L594-619.

## 2. Ledger anatomy: can it tell sources apart today?

Every write goes through `PointsService::record()` (L398-457). It locks the user row and dedupes on `idempotency_key` (unique, nullable, added 05/09 by migration `2026_09_05_120000:19`). Rows written before 05/09 have a NULL key. `review_id` was added 21/08.

| Source | type | Sign | commande_id | review_id | idempotency_key | description |
|---|---|---|---|---|---|---|
| Order earn | earn | + | set | – | `order:{cid}:earn` | "Protinas gagnées (commande N livrée)" |
| Earn clawback | adjustment | − | set | – | `order:{cid}:earn-reversal` | "Annulation des Protinas gagnées (commande N)" |
| Redeem | redeem | − | set | – | `order:{cid}:redeem` | "Protinas utilisées sur commande N" |
| Redeem refund | adjustment | + | set | – | `order:{cid}:redeem-refund` | "Remboursement des Protinas utilisées (commande N)" |
| Review award | earn | + | – | set | `review:{rid}:award` | "Protinas pour votre avis — …" |
| Review clawback | adjustment | − | – | set | `review:{rid}:reversal` | "Annulation des Protinas d'avis (avis retiré)" |
| Welcome (since 02/10) | earn | + | – | – | `welcome:{uid}:unlock:{slot}[:{v}]` (slot = commande id, or 0 for an immediate credit) | "Cadeau de bienvenue — 15 DT en Protinas" |
| Welcome (legacy) | earn | + | – | – | NULL | "Cadeau de bienvenue — 15 DT en points" |
| Welcome reversal | adjustment | − | – | – | `welcome:{uid}:unlock-reversal:{slot}[:{v}]` | "Annulation du cadeau de bienvenue" |

**Credits can be told apart.** `commande_id` marks an order earn, `review_id` marks a review, and a description starting `Cadeau de bienvenue%` or a key starting `welcome:` marks the welcome bonus. `ProtinasAudit` L46-55 already classifies rows this way.

**Current bucket balances cannot be derived.** Redeem rows do not say which credits they consumed. The 0-floor in `record()` also makes the ledger sum differ from `points_balance` for some users. Any earned/gift split needs an allocation policy and a backfill: oldest first (FIFO), or gift first, or earned first. The data is small: 31 holders and 471.70 DT at 29/09 per the spec.

## 3. What has to change

### (a) Points up to 100 % of goods plus the delivery fee
**Backend: pricing**
- `CheckoutPricingService.php:73-86`: separate the commercial ceiling from the points ceiling.
  - New config, e.g. `loyalty.points.max_percent=100` and `loyalty.points.cover_shipping=true` in `loyalty.php:40-43`.
  - Points room = `goods − commercial + shipping`.
  - Split `points_goods` and `points_shipping`; `total = goodsPaid + (shipping − points_shipping)`.
  - Decide the rounding for the last fraction under 50 millimes: floor leaves up to 0.049 DT to collect cash on delivery; otherwise consume one more point.
  - New output keys (e.g. `protinas.used_on_shipping_dt`, `shipping_gross_dt`). `ceiling_*` and `room_dt` change meaning.
  - Keep `earn_on_delivery_points` on `goodsPaid`.
- `LoyaltyRulesController:18`: publish the new keys.
- `CommandeController:518-527`: the legacy-guard message cites `ceiling_percent`.

**Backend: what gets stored (money risk)**
`CommandeController:431` puts `remise = pack + all points`. `OrderToBlService` L96-98 passes `remise` (+ coupon) to `InvoiceCalculator::calculate`, which caps `remise` at goods HT (`InvoiceCalculator:42-43`). The bon de livraison would then show `net_a_payer = 0 + 10 DT`. The Aramex cash-on-delivery amount is read from that bon de livraison (`$bl->net_a_payer`, `AramexService:127, 255-258`), so the courier would collect 10 DT the customer was told is 0.

Fix: write only the goods part of points into `remise`, and either:
- store `frais_livraison` net of the points that covered it, plus a new column (e.g. `points_shipping_dt`, new migration) for display; or
- teach `OrderToBlService:100/125-137` to subtract it.

With a net `frais_livraison`, these stay correct without change:
- `earnableSpend` (PointsService:78-82);
- `orderCommissionBase` (`AffilieTransactionService:483-492`);
- the receipt residual (`ClientController:778`).

**Backend: also update**
- `storedPricing` (`CommandeController:674-688`), `details()` select (`CommandeController:696-703`), and `ClientController` select L675-676 plus the totals block L768-793.
- Print views: `bon-de-livraison.blade.php:37-52`, `facture-tva.blade.php:33-50`, `admin/imprimer_facture.blade.php:393-408`, `devis.blade.php`.
- `CommandeResource` convert summary L537-560 and `commande-form.blade.php:294-306`.
- `ProtinasAudit` L41-43, 116, 148-161, 229-234.
- `PointsService::computeRedemption` L103.
- **Return policy:** `reverseForCommande` refunds every redeemed point, including the part that paid shipping, even after dispatch. To protect the shop, refund only the goods part when `Commande::wasDispatched()` (L431-457) is true.
- **Aramex:** a 0-DT order makes Aramex create a non-COD shipment (services `''`). Aramex has no sandbox, so this needs one live check.

**Storefront**
- `checkoutPricing.ts` type; `loyaltyPoints.ts:17-31, 64-67`.
- `CheckoutPage.tsx:754, 973, 977-997, 1010`; `CheckoutFooterCTA.tsx:102-116` (show "Livraison 10 DT" and a Protinas line covering it).
- `OrderReceipt.tsx`, `OrderDocument.tsx`.
- 10 % copy in `FidelitySection.tsx:142, 146`, `MemberDashboard.tsx:128`, `RegisterPage.tsx:194`, `VerifyPhonePage.tsx:137`.

**Tests that break** (numbers recomputed under the new rule):
- `ProtinasPricingCommerceTest`:
  - `test_worked_order`:
    - "next 200 basket after 660 points": 33 DT used instead of 14; total 171 instead of 190; earns 161 instead of 180; 0 points left instead of 380.
    - "0420 maximum whole points": 25 DT used instead of 23.25; total 696.68 instead of 698.43.
    - "90 DT basket with 900 points": 45 DT used instead of 9; total 55 instead of 91.
    - The other three datasets still pass.
  - `test_0420_coupon_takes_place_of_pack_and_leaves_no_point_room`: 500 points used instead of 0; total 673.40.
  - `test_owner_coupon_above_ceiling_is_honoured_alone…`: 500 points used; total 155 instead of 180.
  - `test_exactly_200_starts_three_percent_tier_and_room_18950_is_379_points`: `room_dt` and `max_usable_points` change.
- `CheckoutOrderCreationCommerceTest`:
  - `test_900_points_on_90_dt_debits_only_the_180_the_ceiling_allows`;
  - `test_legacy_client_without_expected_total_cannot_overspend_points`: no 422 any more, the order is created.
- `Unit/PointsServiceTest::test_legacy_redemption_helper_uses_the_new_ten_percent_ceiling`: does not pin config, so it breaks if `computeRedemption` or `LOYALTY_MAX_DISCOUNT_PERCENT` changes.
- If the till follows the same rule: `ProtinasPricingCommerceTest::test_till_60_dt_and_45_dt_examples`.

### (b) Pack tiers on promo lines too
- **Config only:** set `PACK_EXCLUDE_PROMO_LINES=false` in the VPS `.env`, then `config:clear`. `CheckoutPricingService:46` and `PackDiscountService:60` (also `/pack/quote`) then use gross goods; `/loyalty/rules` reports `excludes_promo_lines:false`.
- **Copy:**
  - `cart/page.tsx:334` and `wizard/StepWelcome.tsx:90`: drive "hors articles en promo" from `rules.pack.excludes_promo_lines`;
  - `loyaltyPoints.ts:28` fallback;
  - stale docblock `PackDiscountService.php:14`.
- **Side effect:** a larger pack beats coupons more often, because coupons must be strictly greater to win.
- **Tests:** none break with the config flip, because both pricing test classes pin `exclude_promo_lines=true`. Removing the flag in code breaks `test_promo_line_counts_for_tier_but_gets_no_pack_discount` (3.0 becomes 6.0).

### (c) Welcome bonus credited at phone verification
- **Config only:** `WELCOME_BONUS_UNLOCK_ON_DELIVERY=false`, then `php artisan protinas:welcome-release-pending --apply` (vps-run `welcome-release-pending`) for claims already reserved.
  - The verify path then credits at once (`PhoneVerificationService:84-86`).
  - Pending claims show as `claimable` with the "Recevoir mes 15 DT" button.
  - `result()` messages (L102-106) adapt automatically.
  - These credits use slot 0 and are never reversed.
- **What still protects the shop** (once credits are immediate, the delivery-phone uniqueness check no longer applies):
  - unique phone, email and account hashes in `welcome_bonus_claims`;
  - the SMS limits;
  - points can only be spent after a verified contact.
- **Copy:** every welcome "delivery" location listed in §1.14 should switch on `rules.welcome.unlock`; also `loyaltyPoints.ts:30` and `MemberDashboardController:67`.
- **Tests:** none break with the config flip. All welcome tests pin the switch, and `CustomerAuthFlowTest` setUp already runs with false (L90).
  - Deleting the delivery-unlock code would break 9 of the 10 `WelcomeBonusCommerceTest` tests (all except `test_legacy_welcome_claim_is_backfilled…`), `CustomerAuthFlowTest::test_default_phone_proof_reserves_welcome_points_until_delivery`, and the `welcome.unlock` assertion in `ProtinasPricingCommerceTest::test_quote_ignores_client_shipping…`.
  - Frontend script `scripts/measure-phone-verification.mjs` (L100, 103, 110) asserts the "Recevoir mes 15 DT" and "Vos 15 DT sont là" headings.

### (d) Earned vs gift buckets
- **Schema:**
  - add `bucket` (`earned` / `gift`) to `user_point_transactions`, guarded by `Schema::hasColumn` like `review_id` and `idempotency_key`;
  - add a gift balance on `users`, or lots (see (e));
  - add an allocation table (redeem tx → credit tx/lot, points) so refunds return to the same bucket.
- **Backfill:** classify credits with the §2 rules; allocate historical redeems by a chosen policy.
- **Code:**
  - `record()` gains a bucket parameter; redeem splits by policy under the existing lock. Callers: `CommandeController:440`, `WelcomeBonusService:73, 126, 169`, PointsService L216/228/261/311/369.
  - `price()` needs per-bucket balances, so the signature changes: `CommandeController:364-378, 395`; quote L574 and L617.
  - `reverseForCommande` refunds per allocation.
  - `reverseUnlock` and `reverseForReview` claw back from gift.
  - `PointsController::history`, `ClientController` profile, `MemberDashboardController`, `FidelitySection`, `LoyaltyPointsRedeemer` show the split.
  - `ProtinasAudit` L46-55 switches to the column.
- **Tests:** an unguarded new NOT NULL column breaks every test that hand-builds `user_point_transactions`: `ProtinaLedgerSecurityTest` (both tests), `WelcomeBonusCommerceTest` (all), `CheckoutOrderCreationCommerceTest` (points tests), and the `CustomerAuthFlowTest` welcome tests. A changed `record()` signature breaks the direct calls in `ProtinaLedgerSecurityTest` and in `WelcomeBonusCommerceTest` L250 and L267. A changed `price()` signature breaks `ProtinasPricingCommerceTest::price()` (L54-60) and the direct call at L132.
- **Why buckets matter:** order-earned points (5 %) are funded by cash already paid. Welcome (15 DT) and review (0.5 or 2.5 DT) points are not, so a gift-specific limit is where the shop's protection lives.

### (e) Expiry per bucket
- **Mechanism:** add `expires_at` and `remaining` on credit rows, or a lots table. A scheduled `protinas:expire` command writes `type=expiry` rows (key `expiry:{lot}`) and zeroes the lot. The enum value already exists.
- **Reminders:** SMS or email before expiry, via `SendSmsJob` with an idempotency key.
- **Simpler alternative:** expire the whole earned balance after N months with no activity; this needs no lots.
- **Copy and policy conflict:** `FidelitySection:145-146`, `MemberDashboard:186` and spec R6 promise no expiry for existing balances. That needs a grandfathering decision and possibly a CGV clause (CMS content, not in the repo).
- **Tests:** none assert "no expiry"; breakage only comes through shared schema, as in (d).

## 4. Gaps where the shop loses today
1. **Clawback forgiven when points are already spent:** an earn clawback or welcome reversal larger than the balance is floored to 0 (`record()` L430-433). A customer keeps the discount bought with points from a returned order.
2. **Cancel then re-deliver:** an order set to `annuler` refunds the redeemed points. If the edit form (it can move `annuler` back to `expidee`) or Aramex later marks it `livree`, the points are never debited again, but the goods are delivered.
3. **Refusals are free for the customer:** they are recorded as `annuler`, which refunds every spent point; there is no shipping forfeit. With 100 % coverage, an all-points order refused at the door costs the shop shipping both ways.
4. **No reversal at the till** when a ticket is cancelled.
5. **Stale text:**
   - `ProtinasAudit.php:116` computes `goods = prix_ht + remise`, which double-counts now that `prix_ht` is gross.
   - The comment at `AffilieTransactionService.php:477-479` still says spent points earn.