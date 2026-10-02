# Protinas rules — FINAL SPEC (commercial panel, 29/09/2026)

Paths in this spec say C:/mla; you are working in C:/mlp (same repo, git worktree on branch goal/protinas-blogs-2909).

## Final rules

- R1 ONE CEILING PER ORDER. The commercial discount (pack OR coupon, see R2) plus Protinas can never exceed 10 % of the goods subtotal. The goods subtotal uses server prices, promo prices included, shipping excluded. Protinas fill whatever room is left, in whole Protinas only, and any unused Protinas stay on the account. The old 50 % Protinas cap (MAX_REDEEM_FRACTION) is removed. One exception: a coupon the owner deliberately sets above 10 % is honoured on its own and leaves 0 room for Protinas.
- R2 COUPON OR PACK, NEVER BOTH. The server computes both and applies the larger one. On a tie the pack wins. A losing coupon is NOT consumed (no CouponRedemption row), so the customer keeps the code. Free-shipping coupons are not a goods discount, so they always combine with the pack.
- R3 PACK TIERS 3 / 5 / 7 % from 200 / 350 / 500 DT (today 5 / 8 / 12 %). The tier is chosen on the full goods subtotal. The percentage applies only to full-price lines, so promo lines count toward the threshold but are not discounted again. The pack stays opt-in through the pack-builder, as today.
- R4 EARNING. 1 Protina per 1 DT of goods actually paid (after pack, coupon and Protinas; shipping excluded). Points are credited on delivery and clawed back on cancel or return. 20 Protinas = 1 DT is unchanged, so 5 % comes back. Protinas spent no longer earn Protinas, which matches the till.
- R5 WELCOME BONUS: 300 Protinas (15 DT), UNLOCKED ON DELIVERY. SMS phone verification reserves the bonus (one per account, phone and email, as today) and shows it as 'en attente'. Reserving creates no ledger credit and no liability. The bonus is credited when the account's first order reaches a delivered status, or immediately if the account already has a delivered order. It is not credited if that delivery phone already unlocked another account's bonus. If the unlocking order is later cancelled or returned, the bonus goes back to pending. No expiry.
- R6 EXISTING BALANCES ARE GRANDFATHERED. Every point already on an account keeps its full value: 471.70 DT online across 31 holders, including the credited welcome bonuses. No delivery gate, no expiry. From the switch, only R1 applies to them, so 15 DT is fully usable from 150 DT of goods. Orders already placed, including 2026/0453, are not repriced, and cancellations still refund redeemed points.
- R7 THE SERVER SETS SHIPPING. 10 DT for home delivery when the goods subtotal before discounts is under 300 DT, otherwise 0. A valid free-shipping coupon also makes it 0. The frais_livraison the client sends is ignored.
- R8 THE SERVER IS THE ONLY CALCULATOR. One pricing service backs both the checkout quote and order creation. The storefront displays its breakdown and reads every rule from the API. The order stores pack, coupon and Protinas as separate amounts. If the client sends an expected total and it does not match, the server returns 409 and the customer re-confirms.
- R9 THE TILL CARD BECOMES THE SAME PROGRAMME. 1 point per DT paid, 20 points = 1 DT, so 5 % back instead of 10 %. Existing till balances are doubled once, keeping the same DT value (319 -> 638 pts = 31.90 DT). Points may cover at most 10 % of the ticket minus the ticket's other discounts. Minimum redemption is 100 points, so redemption starts on 50 DT tickets. This ships in the same deploy as the LoyaltyService.php:288 bug fix.
- R10 COUPON GOVERNANCE. The Filament coupon form shows a non-blocking warning above 10 %. Active coupons are audited before the switch.
- R11 EVERY NUMBER IS CONFIG. points_per_dt (online and till) carries value, so it may only change together with a balance-conversion migration.

## Config (every number env/config backed)

```json
{
 "loyalty.checkout.max_total_discount_percent": {
  "value": 10,
  "env": "LOYALTY_MAX_DISCOUNT_PERCENT",
  "note": "Ceiling on (pack OR coupon) + Protinas, as a % of the goods subtotal. Worst case with free shipping = 10 % + 10 DT/300 DT = 13.3 % given away."
 },
 "loyalty.checkout.delivery_fee_dt": {
  "value": 10,
  "env": "DELIVERY_FEE_DT"
 },
 "loyalty.checkout.free_delivery_from_dt": {
  "value": 300,
  "env": "FREE_DELIVERY_FROM_DT",
  "note": "Compared against gross goods, before any discount."
 },
 "loyalty.checkout.total_mismatch_tolerance_dt": {
  "value": 0.01,
  "env": "CHECKOUT_TOTAL_TOLERANCE_DT",
  "note": "Above this difference between expected_total and the server total, the API returns 409."
 },
 "loyalty.checkout.quote_throttle_per_minute": {
  "value": 60,
  "env": "CHECKOUT_QUOTE_THROTTLE"
 },
 "loyalty.pack.tiers": {
  "value": [
   {
    "from_dt": 200,
    "percent": 3
   },
   {
    "from_dt": 350,
    "percent": 5
   },
   {
    "from_dt": 500,
    "percent": 7
   }
  ],
  "env": "PACK_TIERS",
  "env_format": "200:3,350:5,500:7",
  "note": "An invalid value falls back to the defaults and logs a warning. Fallback lever if big baskets drop: 200:4,350:6,500:8."
 },
 "loyalty.pack.exclude_promo_lines": {
  "value": true,
  "env": "PACK_EXCLUDE_PROMO_LINES"
 },
 "loyalty.points.earn_per_dt": {
  "value": 1,
  "env": "PROTINAS_EARN_PER_DT"
 },
 "loyalty.points.points_per_dt": {
  "value": 20,
  "env": "PROTINAS_PER_DT",
  "note": "Carries value. Never change it without a balance-conversion migration."
 },
 "loyalty.rules_cache_seconds": {
  "value": 300,
  "env": "LOYALTY_RULES_CACHE_SECONDS",
  "note": "Cache-Control max-age on GET /api/loyalty/rules."
 },
 "welcome_bonus.points": {
  "value": 300,
  "env": "WELCOME_BONUS_POINTS",
  "note": "300 pts = 15 DT at 20 pts/DT. Replaces PhoneVerificationService::BONUS_DT/BONUS_POINTS."
 },
 "welcome_bonus.unlock_on_first_delivery": {
  "value": true,
  "env": "WELCOME_BONUS_UNLOCK_ON_DELIVERY",
  "note": "Kill-switch. false = credit at SMS as today (the 10 % ceiling still applies)."
 },
 "welcome_bonus.unique_delivery_phone": {
  "value": true,
  "env": "WELCOME_BONUS_UNIQUE_DELIVERY_PHONE"
 },
 "welcome_bonus.enabled": {
  "value": true,
  "env": "WELCOME_BONUS_ENABLED",
  "note": "existing"
 },
 "welcome_bonus.include_existing_customers": {
  "value": true,
  "env": "WELCOME_BONUS_INCLUDE_EXISTING",
  "note": "existing"
 },
 "welcome_bonus.daily_sms_limit": {
  "value": 100,
  "env": "PHONE_OTP_DAILY_SMS_LIMIT",
  "note": "existing"
 },
 "loyalty.till.earn_per_dt": {
  "value": 1,
  "env": "TILL_EARN_PER_DT",
  "note": "Points per DT actually paid on the ticket."
 },
 "loyalty.till.points_per_dt": {
  "value": 20,
  "env": "TILL_POINTS_PER_DT",
  "note": "Was 10. Carries value, so the conversion migration refuses to run unless this is 20."
 },
 "loyalty.till.max_total_discount_percent": {
  "value": 10,
  "env": "TILL_MAX_DISCOUNT_PERCENT",
  "note": "Points room = 10 % of the ticket minus manual, percent and affiliate discounts."
 },
 "loyalty.till.min_redeem_points": {
  "value": 100,
  "env": "TILL_MIN_REDEEM_POINTS",
  "note": "5 DT, so the first redemption is possible on a 50 DT ticket."
 },
 "loyalty.coupons.warn_above_percent": {
  "value": 10,
  "env": "COUPON_WARN_ABOVE_PERCENT",
  "note": "Filament warning only, not a block."
 },
 "reviews.points.award": {
  "value": "unchanged",
  "env": "existing",
  "note": "Review Protinas are ordinary Protinas and follow R1."
 },
 "one_off_not_config": {
  "till_balance_multiplier": 2,
  "note": "Hard-coded in the one-shot migration, not a runtime setting."
 }
}
```

## Implementation spec

Everything below is server-authoritative, and the backend and the storefront ship in ONE release. Paths are relative to C:/mla (backend = filament/, storefront = frontend/).

0. WHAT THE CODE DOES TODAY (checked 29/09)
- CommandeController.php:296-376 prices an order in this order:
  - it validates the coupon on all_price_ht;
  - it applies the pack on all_price_ht;
  - it caps points at 50 % of (goods − coupon − pack).
- Shipping comes from the client. Line 78 only validates min:0, line 150 copies the value and line 298 clamps it, so a crafted POST with 0 skips the 10 DT.
- Line 368 stores pack + points as a single `remise`. That is why the owner saw '45 DT of Protinas'.
- Till bug: LoyaltyService.php:288 passes the undefined $baseAfterRegularDiscount. The parameter was renamed to $baseHtBeforeLoyaltyDiscount in commit 46ec8c02 on 07/05/2026. Laravel turns the warning into an ErrorException inside TicketPosPage's save transaction (TicketPosPage.php:671), so every ticket saved with a loyalty card fails with 'Échec de l'enregistrement du ticket'. Confirm this in the prod laravel.log.

1. CONFIG
- Create filament/config/loyalty.php (env-backed) with the keys listed in `config`.
- Add points, unlock_on_first_delivery and unique_delivery_phone to config/welcome_bonus.php.
- Replace these constants with static accessors that read config:
  - PointsService::EARN_RATE and REDEEM_POINTS_PER_DT;
  - PackDiscountService::TIERS;
  - PhoneVerificationService::BONUS_DT and BONUS_POINTS;
  - LoyaltyService::POINTS_PER_DT, POINTS_PER_DT_VALUE and MIN_REDEEM_POINTS.
- Callers to update: PointsController.php:43, MemberDashboardController.php:57, TicketPosPage.php:203/208/224/226/751/756, and the ticket-pos.blade.php constants at 978-980.
- Delete MAX_REDEEM_FRACTION and maxRedeemableDt().
- PACK_TIERS is a 'from:percent' comma list, sorted ascending. An invalid value falls back to the defaults and logs a warning.
- After any env change, run php artisan config:clear.

2. PRICING: new pure service App\Services\CheckoutPricingService::price(lines, ?validCoupon, packRequested, ?lockedBalance, requestedPoints, homeDelivery)
It writes nothing to the database. It works in integer millimes (DT × 1000) and outputs 3-decimal values.
a. goods = Σ qty × Product::getEffectiveUnitPrice(). fullPriceGoods = the same sum over lines where !hasActivePromo().
b. shipping = (homeDelivery, i.e. commande.livraison ≠ 0, which defaults to 1) AND goods < free_delivery_from ? fee : 0. It uses gross goods, so the '300 DT' promise and the cart progress bar do not change. A valid free_shipping coupon sets it to 0.
c. pack = packRequested ? round(tierPercent(goods) × (exclude_promo_lines ? fullPriceGoods : goods) / 100) : 0.
d. couponGoods = CouponService::computeDiscount(coupon, goods, shipping)['discount_ht'] for percent and fixed coupons, otherwise 0. Coupon validation is unchanged.
e. Best of the two:
   - If couponGoods > pack, the coupon is applied and pack = 0.
   - Otherwise the pack is applied and a percent or fixed coupon is NOT applied (reason 'pack_better'). A tie goes to the pack, so the customer keeps the code.
   - free_shipping coupons never compete and are always applied.
f. commercial = the applied amount. ceiling = floor(goods × max_total_discount_percent / 100). room = max(0, ceiling − commercial). A coupon above 10 % therefore leaves room = 0 and is still honoured in full.
g. maxUsablePoints = min(balance, intdiv(room × points_per_dt, 1000)). Whole Protinas can never exceed the room: 18.950 DT gives exactly 379 pts, with no float drift. usedPoints = min(requested, maxUsablePoints). Requested > balance → 422 'Solde Protina insuffisant' (unchanged). A request above the maximum is clamped silently.
h. pointsDt = usedPoints / points_per_dt. goodsPaid = max(0, goods − commercial − pointsDt). total = goodsPaid + shipping.
i. earnPreview = floor(goodsPaid × earn_per_dt).

3. storeCommandeApi
- Keep the validation rules. frais_livraison is still accepted but IGNORED; delete the copy at line 150.
- Keep the existing sequence of token owner, hasVerifiedContact() and the user row lockForUpdate. Then call price() with the locked balance, replacing lines 296-376.
- Create a CouponRedemption only when the coupon was applied (free-shipping coupons included).
- Persist:
  - prix_ht = goods;
  - discount_ht, discount_ttc and the coupon_* snapshots only when the coupon was applied (otherwise null or 0);
  - NEW columns: pack_discount_ht decimal(10,3) default 0, points_discount_ht decimal(10,3) default 0, points_redeemed int unsigned default 0;
  - remise = pack + points (kept for legacy views);
  - discount_amount = commercial + points;
  - frais_livraison = the server shipping;
  - prix_ttc = total.
- The redeem ledger row stays as today (key order:{id}:redeem).
- New optional body field expected_total. If |total − expected_total| > tolerance, roll back the transaction and return 409 {message:'Le total de votre commande a changé.', pricing}.
- orderCreatedResponse adds `pricing`.

4. API
- GET /api/loyalty/rules is public, with Cache-Control max-age = rules_cache_seconds. It returns:
  {points_per_dt:20, earn_per_dt:1, max_total_discount_percent:10, pack:{tiers:[{from_dt:200,percent:3},{from_dt:350,percent:5},{from_dt:500,percent:7}], excludes_promo_lines:true, stacks_with_coupon:false}, delivery:{fee_dt:10, free_from_dt:300}, welcome:{points:300, value_dt:15, unlock:'first_delivered_order'}}.
- POST /api/checkout/quote takes optional Sanctum auth and is throttled at 60/min. It has NO side effects: no stock decrement, no coupon use, no ledger row. The body is the same as add_commande. It returns {pricing}, where pricing =
  {goods_dt, full_price_goods_dt, pack:{percent, amount_dt, applied}, coupon:{code, type, amount_dt, applied, reason: null|'pack_better'|<validateCoupon reason>}, free_shipping_reason: null|'threshold'|'coupon', ceiling_percent, ceiling_dt, room_dt, protinas:{balance, pending_welcome_points, max_usable_points, max_usable_dt, used_points, used_dt, remaining_points}, shipping_dt, total_discount_dt, total_discount_percent, total_dt, earn_on_delivery_points, next_pack_tier:{from_dt, percent, remaining_dt}|null}.
- The error bodies of points_to_redeem without auth, of an unverified contact and of a balance overrun are unchanged (422).
- /api/pack/quote keeps its shape and picks up the new tiers and the promo exclusion.
- GET /api/points/history and the member dashboard add welcome_status ('pending'|'awarded'|'claimable'|'phone_required'|'already_used'|'paused'|'not_eligible') and pending_welcome_points. Pending points are never counted in points_balance.

5. EARNING
- PointsService::earnableSpend drops the '+ redeemedValue' term. It becomes min(prix_ht, max(0, prix_ttc − frais_livraison)) × earn_per_dt, floored. Update the call in syncOnStatusChange.
- Everything else stays: delivered statuses credit once per commande; cancel or return claws back earned points and refunds redeemed ones.

6. WELCOME BONUS
- Migration: add to welcome_bonus_claims credited_at (nullable timestamp), unlocked_by_commande_id (nullable bigint) and unlock_phone_hash (nullable char(64), indexed). Backfill credited_at = created_at on ALL existing rows: the 32 claims were already credited, so nothing changes for them.
- PhoneVerificationService::awardWelcomeBonus inserts the claim with credited_at = null and points = config.
  - It credits immediately ONLY IF !unlock_on_first_delivery, or the user has ≥ 1 Commande with user_id = user and etat in PointsService::DELIVERED_STATUSES. Crediting = record(user,'earn',points,'Cadeau de bienvenue — 15 DT en Protinas',null,null,'welcome:{user_id}:unlock:0'), then set credited_at and welcome_bonus_awarded_at.
  - Otherwise it sets welcome_bonus_eligible = false and responds bonus_awarded = false, bonus_pending = true with the pending message.
- bonusStatus() checks the claim row FIRST: credited_at null → 'pending'; credited → 'awarded'.
- Make fingerprint() and normalize() public static so the unlock can reuse them.
- New WelcomeBonusService::unlockOnDelivery(User, Commande). PointsService::syncOnStatusChange calls it in the delivered branch right after earn(), wrapped in its own try/catch so it never blocks an admin status change. Steps:
  - Inside DB::transaction, lock the user's claim where credited_at is null. If there is none, return.
  - h = fingerprint(normalize(livraison_phone ?? phone)).
  - If unique_delivery_phone is on and another user's credited claim has phone_hash = h or unlock_phone_hash = h, log a warning and leave the claim pending.
  - Otherwise record an earn with key 'welcome:{user_id}:unlock:{commande_id}'. Only if that ledger row is newly created (wasRecentlyCreated), set credited_at = now, unlocked_by_commande_id, unlock_phone_hash = h and users.welcome_bonus_awarded_at = now.
- Reversal: in the cancelled or returned branch, if a claim has unlocked_by_commande_id = this commande:
  - write an adjustment of −points with key 'welcome:{user_id}:unlock-reversal:{commande_id}' (the balance floors at 0, like every clawback);
  - reset the claim to pending (credited_at, unlocked_by_commande_id and unlock_phone_hash back to null) and clear welcome_bonus_awarded_at.
- Guest orders never unlock the bonus.

7. TILL
- Fix line 288 to calculateEarnablePoints($baseHtBeforeLoyaltyDiscount, $loyaltyDiscount), which is floor(max(0, base − loyaltyDiscount) × till.earn_per_dt). This MUST ship together with the new rates, otherwise 10 % back goes live.
- New LoyaltyService::maxRedeemablePoints(ticketTotalHt, otherDiscountsHt, balance):
  - otherDiscountsHt = regular/manual + percent + affiliate discounts from TicketPosPage::computeTicketTotals().
  - room = max(0, floor(total × pct / 100) − otherDiscounts).
  - pts = min(balance, intdiv(room_millimes × points_per_dt, 1000)).
  - It returns pts ≥ min_redeem_points ? pts : 0.
  - Use it at TicketPosPage.php:203, 224 and 751, replacing floor(base_after_affilie × POINTS_PER_DT_VALUE).
- validateRedemption(client, points, ticketTotalHt, otherDiscountsHt) enforces the minimum, the balance AND the cap on the server. processTicketLoyalty receives these values from $totals.
- pointsToDiscount = points / till.points_per_dt.
- Migration 'till_points_to_20_per_dt':
  - It aborts unless config till.points_per_dt = 20.
  - For each client with a ledger sum > 0 and no row described 'Conversion barème 20 pts = 1 DT (valeur inchangée)', it inserts an 'adjustment' of +ledger sum and sets loyalty_points_balance = 2 × ledger sum, in one transaction.
  - It is idempotent (migrations table plus the per-client marker). Expected result: 2 clients, 319 → 638 pts.

8. ADMIN
- The CommandeResource view and the Facture/BL/Devis prints show separate lines:
  - 'Remise pack (x %)';
  - 'Code promo CODE';
  - 'Protinas (n pts)';
  - 'Total remises : y DT (z % des articles)'.
- Backfill old orders, for display only:
  - points_redeemed = −Σ ledger redeem points;
  - points_discount_ht = points_redeemed / 20;
  - pack_discount_ht = remise − points_discount_ht.
  After the backfill, 0453 reads Pack 30.32 + Protinas 15.00.
- Coupon form: a non-blocking warning when a percent coupon is above warn_above_percent, or a fixed coupon is above that % of its minimum basket.
- protinas:audit (on main since 43e91c47) adds:
  - the average discount % of goods;
  - the share of orders where the ceiling bound;
  - pending and unlocked welcome counts.

9. STOREFRONT
- util/loyaltyPoints.ts: delete MAX_REDEEM_FRACTION. Load /api/loyalty/rules, with the new values as fallback constants. Fix the comment block: spent Protinas no longer earn.
- checkout/CheckoutPage.tsx:
  - Remove the local maths at ~195-226 (subtotalAfterPack, maxRedeemablePoints, finalTotal).
  - Render `pricing` from POST /api/checkout/quote, debounced ~300 ms, on any change to cart, coupon, pack, points or login.
  - The Protinas slider max = protinas.max_usable_points.
  - Summary lines:
    - Sous-total articles;
    - Remise pack −x % OR Code PROMO;
    - Protinas utilisées;
    - Livraison (10 DT / Offerte);
    - Total à payer à la livraison;
    - the earn line.
  - Put the checkout sentence under the discount block.
  - coupon.applied = false with reason 'pack_better' shows the coupon-not-applied message.
  - Send expected_total = pricing.total_dt. On a 409, re-render the returned pricing and require a second tap.
- cart/page.tsx and pack-builder take the tiers, the next tier and the free-shipping bar from the rules. util/company.ts DELIVERY stays only as a fallback.
- The account pages FidelitySection and MemberDashboard get the new rules copy and an 'en attente' badge.
- verify-phone, the register conditions, AccountVerificationCard, VerificationArtwork and verify-email get the new welcome copy.
- components/account/OrderReceipt.tsx and account/orders/[id] show separate lines from pack_discount_ht / discount_ht / points_discount_ht.
- Run npm run prebuild before pushing.

10. TESTS
- One row per worked example.
- Coupon = pack tie → pack applied, coupon unconsumed.
- Free-shipping coupon + pack → both apply.
- A promo line counts for the tier but gets no pack %.
- Goods of exactly 200.000 → 3 %.
- A room of 18.950 → 379 pts.
- Guest with points → 422. Requested points > balance → 422.
- The unlock is idempotent on repeated livree saves.
- A return resets the welcome bonus to pending.
- Till: a 45 DT ticket → 0 redeemable.
- Locally PHP is lint-only; run the suite in CI.

11. ROLLOUT
- Pre-flight (read-only):
  1. take a protinas:audit snapshot;
  2. count the orders that reached a livree status in the last 30 days. The unlock rides the same observer as earning (only 4 orders ever earned points), so if this is near zero, fix the status sync first or ship with WELCOME_BONUS_UNLOCK_ON_DELIVERY=false;
  3. list the active coupons above 10 %;
  4. grep the prod laravel.log for 'Undefined variable $baseAfterRegularDiscount'.
- Deploy: migrate --force runs the 3 migrations (commandes columns + backfill, welcome claims, till conversion), then config:clear.
- Verify through the quote endpoint only. Do not place real orders to test (Aramex has no sandbox).
- The same day: the CGV clause and the account notice go live.
- Kill-switches: LOYALTY_MAX_DISCOUNT_PERCENT, PACK_TIERS, WELCOME_BONUS_UNLOCK_ON_DELIVERY.

12. NOT ADOPTED
- 60-day welcome expiry (P1): pointless once no liability exists before a paid delivery.
- Delivery gate on ALL balances (P2): it would make money already credited to 31 holders conditional.
- 100 DT minimum basket (P2): the proportional ceiling already scales redemption to the basket.
- COD-refusal freeze, staff-discount approval, per-card ticket limits and SMS receipts (P3): these are separate anti-fraud work and are not needed to stop the margin leak.
- Till at 1 pt per 2 DT with 10 pts = 1 DT (P2/P3): its 100-pt (10 DT) minimum is above the 10 % cap on every ticket under 100 DT, so a 60 DT ticket could never redeem.

13. KPIs at 30 and 60 days
- average discount % of goods (target ≤ 8 %);
- share of orders where the ceiling binds;
- AOV and the share of baskets ≥ 350 / ≥ 500 DT;
- welcome pending → unlocked, and 2nd order within 90 days;
- Protinas liability in DT;
- COD refusal rate;
- till tickets saved with a card.

## Customer copy (French, use verbatim unless it contradicts the code)

```json
{
 "checkout_line": "Code promo ou remise pack (la meilleure des deux) + Protinas : jusqu'à 10 % de vos articles ; les Protinas non utilisées restent sur votre compte.",
 "checkout_protinas_hint": "Utilisables sur cette commande : {max_dt} DT ({max_points} Protinas). Il vous restera {remaining_dt} DT sur votre compte.",
 "checkout_earn_line": "Vous gagnerez {earn_points} Protinas ({earn_dt} DT) à la livraison.",
 "checkout_coupon_not_applied": "Votre remise pack (−{pack_dt} DT) est plus avantageuse que ce code : elle est appliquée à sa place, et votre code reste valable pour une prochaine commande.",
 "checkout_total_changed": "Le total a été mis à jour : {total_dt} DT à payer à la livraison. Vérifiez puis confirmez.",
 "fidelity_page_rules": "1 Protina par dinar d'articles payé, créditée à la livraison (20 Protinas = 1 DT, soit 5 % reversés).\nÀ la commande, remise et Protinas se cumulent jusqu'à 10 % du montant de vos articles ; le reste de vos Protinas reste sur votre compte.\nCode promo et remise pack ne se cumulent pas : la plus avantageuse s'applique.\nCadeau de bienvenue : 300 Protinas (15 DT), créditées à la livraison de votre première commande.\nVos Protinas n'expirent pas. Commande annulée ou retournée : les Protinas utilisées vous sont rendues, celles gagnées sont retirées.",
 "welcome_bonus_line": "15 DT offerts (300 Protinas) : vérifiez votre téléphone, ils sont crédités à la livraison de votre première commande et utilisables dès la suivante.",
 "welcome_pending_badge": "15 DT en attente, crédités à la livraison de votre 1re commande",
 "phone_verified_pending_message": "Téléphone vérifié. Vos 300 Protinas (15 DT) seront créditées à la livraison de votre première commande.",
 "phone_verified_credited_message": "300 Protinas ajoutées : 15 DT à utiliser sur votre prochaine commande.",
 "welcome_conditions_register": "300 Protinas (15 DT), une seule fois par compte et par numéro, créditées à la livraison de votre première commande, puis utilisables dans la limite de 10 % de vos articles par commande.",
 "pack_banner": "Remise pack : −3 % dès 200 DT, −5 % dès 350 DT, −7 % dès 500 DT d'articles (hors articles en promo, non cumulable avec un code promo).",
 "existing_holders_account_notice": "Vos Protinas gardent toute leur valeur, sans date limite. À partir du 1er octobre 2026, remises et Protinas sont limitées à 10 % des articles de chaque commande : vos 15 DT de bienvenue s'utilisent en entier dès 150 DT d'achats.",
 "existing_holders_sms_optional": "protein.tn : vos Protinas gardent leur valeur, sans date limite. Des le 01/10, remises + Protinas : max 10% des articles par commande. Vos 15 DT : en entier des 150 DT.",
 "till_message": "Carte fidélité : 1 point par dinar payé, 20 points = 1 DT (5 % reversés). Utilisables dès 100 points, jusqu'à 10 % du ticket.",
 "till_conversion_notice": "Nouveau barème : 20 points = 1 DT. Nous avons doublé vos points : leur valeur en dinars ne change pas.",
 "cgv_clause": "Programme Protinas : 1 Protina par dinar d'articles payé, créditée à la livraison ; 20 Protinas = 1 DT. Par commande, la remise commerciale (code promo ou remise pack, non cumulables) et les Protinas utilisées ne peuvent dépasser 10 % du montant des articles, sauf code promo supérieur utilisé seul. Le cadeau de bienvenue (300 Protinas) est crédité à la livraison de la première commande du compte. Les soldes acquis avant le 1er octobre 2026 sont conservés intégralement et sans date d'expiration."
}
```

## Worked examples (make each one a test)

- ORDER 2026/0453 as stated: 379 DT of full-price goods, pack requested, no coupon. The customer holds the 300 Protinas credited before the switch (grandfathered). Pack tier ≥350 gives 5 % x 379 = 18.95 DT (was 8 % = 30.32). Ceiling 10 % x 379 = 37.90 DT, so the room is 18.95 DT = 379 Protinas. Balance 300, so all 300 are used = 15.00 DT. Shipping 0 (379 ≥ 300). Total discount 33.95 DT (8.96 %) instead of 45.32 DT (11.96 %): the shop keeps 11.37 DT more. The customer pays 345.05 DT (was 333.68) and earns floor(345.05) = 345 Protinas on delivery. Contribution at a 15 % margin, after absorbing ~10 DT of shipping: 56.85 − 33.95 − 10 = 12.90 DT (was 1.53 DT); at 20 %: 31.85 DT (was 20.48). The real 0453 is already placed and is NOT repriced; if it is cancelled or returned, the existing reversal refunds its 300 pts.
- SAME 379 DT BASKET, brand-new customer after the switch (SMS verified, 0 delivered orders). The 300 Protinas are 'en attente' and the balance is 0, so no Protinas are used. Discount = pack only: 18.95 DT (5.00 %). The customer pays 360.05 DT; the shop keeps 26.37 DT more than today; contribution at 15 %: 56.85 − 18.95 − 10 = 27.90 DT. On delivery: 360 Protinas earned + 300 welcome unlocked = 660 Protinas (33 DT). Next order, 200 DT with the pack: pack 3 % = 6.00 DT; ceiling 20.00 DT, so 14.00 DT of Protinas (280 pts); shipping 10 DT (under 300). The customer pays 190.00 DT, and 380 Protinas (19 DT) are left for later.
- ORDER 2026/0420: 776 DT, returning customer, pack requested, no coupon, no Protinas used. Pack tier ≥500 gives 7 % = 54.32 DT (was 12 % = 93.12). Ceiling 77.60 DT, so the room is 23.28 DT: he could have added 465 Protinas (23.25 DT). As placed: discount 54.32 DT (7.00 %), free shipping, he pays 721.68 DT (was 682.88), and the shop keeps 38.80 DT more. He earns 721 Protinas (36.05 DT) on delivery (682 under today's rules). Had he used 465+ Protinas: discount 77.57 DT (9.996 %), pays 698.43 DT, earns 698. Contribution at 15 %: 116.40 − 54.32 − 10 = 52.08 DT (was 13.28); at 20 %: 90.88 DT (was 52.08).
- 0420 VARIANT with a 10 % promo code: coupon 77.60 DT > pack 54.32 DT, so the coupon applies and the pack is dropped. The room is 0, so no Protinas. The customer pays 698.40 DT. Today the same code would stack: 77.60 + 93.12 + Protinas up to 50 % of the remainder, i.e. at least 170.72 DT off.
- 90 DT ORDER, returning customer holding 900 Protinas (45 DT). No pack (under 200), no coupon. Ceiling 10 % x 90 = 9.00 DT, so at most 180 Protinas: he uses 180 = 9.00 DT. Shipping 10 DT (90 < 300). He pays 90 − 9 + 10 = 91.00 DT, keeps 720 Protinas (36 DT), and earns floor(81.00) = 81 on delivery, for 801 in total. Today: the 50 % cap = 45 DT, so all 900 Protinas go on this one order and he pays 55.00 DT; at a 15 % margin the goods made 13.50 DT and the order LOST 31.50 DT. New rules: +4.50 DT (+9.00 at 20 %). The 720 left cover about four more such orders, or 20 DT on a 400 DT pack order.
- TILL TICKET, 60 DT, card holding 450 points (new scale), no other discount. Room = 10 % x 60 = 6.00 DT = 120 points, which is ≥ the 100 minimum, so 120 pts are redeemed = 6.00 DT. The customer pays 54.00 DT and earns 54 pts (2.70 DT, 5 %). Balance: 450 − 120 + 54 = 384 pts (19.20 DT). If those 450 were pre-switch points (old scale = 45.00 DT), the conversion makes them 900; the same ticket still uses 120, leaving 834 pts (41.70 DT). Today: 450 pts = 45 DT could pay 45 of the 60 DT (customer pays 15 DT; at a 15 % margin the ticket loses 36 DT). With the line-288 bug, the ticket fails to save as soon as the card is attached. Edge cases: a 45 DT ticket has a room of 4.50 DT = 90 pts, below 100, so it earns but cannot redeem. A 5 % manual discount on this 60 DT ticket leaves 3.00 DT = 60 pts, so no redemption.

## Existing balances
Nothing is confiscated, expired or re-gated.

ONLINE (users.points_balance: 31 holders, 471.70 DT)
- No conversion: 20 Protinas = 1 DT is unchanged, so every balance keeps its exact DT value. The balances get no delivery gate and no expiry.
- From the switch, the only new constraint is the 10 % per-order ceiling. A 15 DT balance is fully usable from 150 DT of goods; below that, the unused part stays on the account.
- The 32 existing welcome_bonus_claims rows are backfilled with credited_at = created_at. They count as already credited, so they are never made pending, gated or credited twice.
- Orders already placed keep their prices and redemptions. 2026/0453 keeps its 15 DT; if it is cancelled or returned, the existing reverseForCommande refunds the 300 pts.
- Old orders get pack_discount_ht, points_discount_ht and points_redeemed backfilled from the ledger. This is display only and moves no money; the owner will then see 0453 as 30.32 DT pack + 15.00 DT Protinas.

TILL (clients.loyalty_points_balance: 2 clients, 319 pts = 31.90 DT)
- First check that each balance equals its ledger sum (rebuildClientBalance).
- One idempotent migration adds an 'adjustment' ledger row of +(ledger sum) per client, marked 'Conversion barème 20 pts = 1 DT (valeur inchangée)', and sets the balance to twice the sum. 319 pts becomes 638 pts, still 31.90 DT.
- It refuses to run unless till.points_per_dt = 20, and it skips any client that already has the marker.
- It ships in the same deploy as the LoyaltyService.php:288 fix and the new till rates.

COMMUNICATION
- On switch day: the CGV clause and the account-page notice go live. Printed and on-screen till copy is updated.
- Optional, owner's decision: one SMS to the 31 online holders (about 31 SMS).
- Support may grant a one-off manual coupon to a holder who complains about the cap on a small basket.