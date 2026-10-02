# Protinas: stop the margin leak — BACKEND (phase A of 2)

Read `.claude/codex/briefs/protinas-rules-spec.md` in full first. It is the decided spec (commercial panel, owner-mandated:
"a client used Protinas and took 45 DT off — find a solution and apply it"). Measured facts that drove it: order 2026/0453 got
30.32 DT pack (8 %) + 15 DT welcome Protinas = 45.32 DT; 31 of 32 welcome-bonus claimers never had a delivered order; points could
cover 50 % of the goods; the client can send `frais_livraison: 0`; LoyaltyService.php line ~288 uses an undefined `$baseAfterRegularDiscount`.

Implement spec sections 1–8 and 10 in `filament/` (backend only — the storefront is phase B, a follow-up in this same session):
1. `config/loyalty.php` + `config/welcome_bonus.php` keys; constants → config accessors; keep public constant NAMES as thin
   aliases where other code/tests reference them, so nothing breaks (grep every reference).
2. `App\Services\CheckoutPricingService` — pure, millimes, exactly spec §2 (goods, server shipping, pack on full-price lines,
   coupon OR pack (larger wins, tie → pack, losing coupon NOT consumed), 10 % ceiling, whole Protinas, earn preview).
3. `CommandeController::storeCommandeApi` uses it (spec §3). Keep EVERYTHING else in that method intact: idempotency key/payload
   hash, token-owner binding, hasVerifiedContact, lockForUpdate, stock handling, affiliate attribution, coupon redemption rows,
   the redeem ledger key `order:{id}:redeem`, notifications. `frais_livraison` from the client is ignored. New columns via a
   migration: pack_discount_ht, points_discount_ht, points_redeemed (+ display-only backfill from the ledger for old orders).
   Optional `expected_total` → 409 with `pricing` when it differs by more than the tolerance.
4. `GET /api/loyalty/rules` (public, cached) and `POST /api/checkout/quote` (no side effects, optional Sanctum, throttled) exactly as
   spec §4; `/api/pack/quote` picks up the new tiers; points history + member dashboard expose `welcome_status`,
   `pending_welcome_points`.
5. Earning per spec §5. 6. Welcome bonus unlock-on-first-delivery per spec §6 (migration with backfill `credited_at = created_at`
   for all existing claims so nobody loses anything; `WelcomeBonusService::unlockOnDelivery` + reversal; kill-switch env).
7. Till per spec §7: fix the undefined variable, new rates, 10 % cap incl. other ticket discounts, min 100 pts, server-side
   validation, idempotent conversion migration that doubles existing till balances (value unchanged). Update TicketPosPage +
   its blade constants.
8. Admin: CommandeResource shows separate discount lines; coupon form non-blocking warning above 10 %; extend
   `protinas:audit` with: orders reaching a delivered status in the last 30/90 days, active coupons above 10 %, pending/unlocked
   welcome counts, average discount % of goods and share of orders where the ceiling bound.
10. Tests: add PHPUnit feature tests (in-memory SQLite, same style as `tests/Feature/*Commerce*`/`OrderIdentityAndNotificationTest`)
   for every worked example and every edge case listed in spec §10, and add the new test files to the `commerce-flow-tests`
   task list in `.github/workflows/vps-run.yml` (both the scp `source:` list and the ARGS line) so they run on the server.

Constraints: PHP locally is lint-only (`/c/xampp/php/php.exe -l`), lint every PHP file you touch. Migrations must be idempotent
(`Schema::hasColumn` guards) and safe on the live MySQL. Existing balances are never reduced. Do NOT commit. Do NOT touch the
storefront yet except nothing. If the spec contradicts the code, say so in RISKS instead of guessing.

Report: files changed, what each does, how each worked example resolves (numbers), the exact API shapes, open RISKS.
