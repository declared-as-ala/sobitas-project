# Protinas v3 — decisions that override or complete the spec

The spec is `.claude/codex/briefs/protinas-v3-spec.md` (final design after 3 designers + 3 judges).
The current-code map is `.claude/codex/briefs/protinas-v3-codemap.md` (line numbers at 4bbc6db8 — re-check them).
The brute-force economics model is `.claude/codex/briefs/protinas-v3-engine.py`.
Where this file and the spec disagree, THIS FILE WINS.

## Owner requirements (02/10/2026, verbatim intent)
1. Pack discount also applies to promo products (the promo price is the real price).
2. Customers may use Protinas as they want — up to 100 % of the products and to pay the delivery — but the shop must ALWAYS win.
3. The 15 DT welcome gift (300 Protinas) is credited IMMEDIATELY at phone verification.
4. Best commercial system: the shop always wins while customers feel they are the winners.

## Rollout: no manual env flips (nobody can edit the VPS .env from here)
- Code defaults ARE the launch values: `loyalty.rules_version` default **3**, `pack.exclude_promo_lines` default **false**,
  `welcome_bonus.unlock_on_first_delivery` default **false**. Version 2 stays selectable by env for instant rollback.
- Drop `PROTINAS_V3_SINCE`. "Legacy" is decided per ORDER by `commandes.pricing_version IS NULL`, and per GIFT ROW by
  `expires_at IS NULL` (every gift that exists at deploy time keeps no expiry).
- The wallet split (spec §E step 3) runs INSIDE the deploy migration by calling the same service as
  `php artisan protinas:split-wallets [--apply]` (idempotent; the command stays for re-runs and for a dry-run report).
  The migration MUST NEVER THROW (it runs in `migrate --force` during deploy): wrap in try/catch, Log::critical on failure,
  and the wallet service must degrade safely when the split has not run (see spec F3: missing gift column ⇒ treat the
  whole balance as gift, i.e. budget-bounded — never as free money).
- After the split, the same migration releases every pending welcome claim (`credited_at IS NULL`) as a gift with
  `expires_at = NULL` (grandfathered), idempotent key `welcome:{uid}:unlock:0`, also never throwing.
- `/api/loyalty/rules` cache (`rules_cache_seconds`) must not serve v2 rules after deploy: key the cache by rules_version
  or bust it in the migration.

## Scope
- IN: spec F0 (admin save keeps cash-on-delivery = prix_ttc — a live bug today), F1–F9, F11, F12.
- OUT for now: F10 till 100 % (the till stays at its current 10 % ceiling; do not touch TicketPosPage/LoyaltyService till
  logic beyond what compiles). SMS reminders: implement behind `PROTINAS_SMS_REMINDERS` default **false** (WinSMS balance is 0).
- ADD: a private "Prix d'achat" field (`products.prix_achat`, nullable decimal) in the Filament product form so the owner
  can enter real costs; it must NEVER appear in any public API payload (add to the model's `$hidden`, and check every
  explicit `select()` / resource that serialises products). Beware the partial-select save trap: never save a Product
  loaded with a partial column list.
- Aramex with 0 DT to collect: read how the Aramex shipment payload is built (COD amount / `CODS` service). If a 0-DT COD
  shipment could be rejected or mis-created, make the payload correct for 0 cash (no COD service / amount 0 handled) OR
  make the push refuse with a clear French message so staff ship it manually — choose the safer one and explain.
  NEVER call Aramex, never run any send/push/cancel/refresh code path. Aramex has no sandbox.

## Hard rules for every agent
- Work ONLY in the git worktree `C:/mlv` (branch feat/protinas-v3). Do not commit, push, stash, reset or checkout.
- Laravel cannot boot locally (no vendor/): lint every PHP file with `/c/xampp/php/php.exe -l`. Tests run later in CI.
- `.github/workflows/vps-run.yml`: add task cases ONLY in the "Resolve the task" step and the choice list; the ssh
  `with.script` must stay under 21,000 characters (measure with python yaml after editing; today ≈20,179). Preserve the
  file's line endings.
- Storefront: French only, design tokens only (`npm run lint:design`), ≥44 px targets, both themes. Verify with
  `npm run lint`, `npm run typecheck`, `npm run lint:design`, `npm run prebuild` (restore
  `src/generated/categoryContentDates.ts` afterwards with `git checkout --` on that one file only).
- Never put secrets in files. Never mark up fabricated reviews.
- Money is integer millimes end to end; every rounding direction must favour the shop by at most 49 millimes as the spec says.
