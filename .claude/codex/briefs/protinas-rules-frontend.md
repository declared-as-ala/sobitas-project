# Protinas: storefront (phase B) — same session, same worktree C:/mlp

Implement spec section 9 of `.claude/codex/briefs/protinas-rules-spec.md` in `frontend/`, against the API you built in phase A
(`GET /api/loyalty/rules`, `POST /api/checkout/quote`, order response `pricing`, 409 on `expected_total` mismatch,
`welcome_status` / `pending_welcome_points` on points history + member dashboard). Customer copy: use the French strings in the
spec's "Customer copy" block.

1. `src/util/loyaltyPoints.ts`: delete MAX_REDEEM_FRACTION, fallback constants = new values, add a cached rules loader; fix the
   header comment (spent Protinas no longer earn; the 10 % ceiling; coupon OR pack).
2. `src/app/(shop)/checkout/CheckoutPage.tsx`: remove the local discount/points/total maths; render the server `pricing` from
   POST /api/checkout/quote (debounced ~300 ms on cart/coupon/pack/points/login changes; keep the last good quote visible while
   refreshing; on quote failure show the existing totals with a clear "total confirmé à la validation" note rather than blocking).
   Protinas slider max = `protinas.max_usable_points`. Summary lines: Sous-total articles · Remise pack −x % OR Code PROMO ·
   Protinas utilisées · Livraison (10 DT / Offerte) · Total à payer à la livraison · earn line. Coupon not applied (`pack_better`)
   → the spec's message. Send `expected_total`; on 409 re-render the returned pricing and require a second tap.
3. Cart page + pack-builder: tiers, next tier and free-shipping bar from the rules (company.ts DELIVERY only as fallback).
4. Account: FidelitySection + MemberDashboard rules copy and an "en attente" welcome badge; verify-phone, register conditions,
   AccountVerificationCard, VerificationArtwork, verify-email → new welcome copy (credited on delivery of the first order).
5. OrderReceipt + account/orders/[id] + order confirmation: separate lines from pack_discount_ht / discount_ht /
   points_discount_ht when present (old orders: fall back to what they show today).
6. `frontend/redirects.js` line ~34 uses `require()` for `./src/generated/blogMerges2909.json` and fails `npm run lint`
   (no-require-imports) — make lint pass without changing behaviour (e.g. a scoped eslint-disable comment with the reason, or
   `fs.readFileSync` + JSON.parse if that rule allows it). Do NOT touch the generated blog blocks in blogSeoConfig.ts /
   commercialSeoMap.ts or middleware.ts beyond that.

Constraints: design system (read `.claude/skills/protein-ui/SKILL.md`), French only, ≥44 px targets, both themes, no new colours.
Checkout must keep working if the quote endpoint is slow or down. Verify: `npm run lint`, `npm run typecheck`,
`npm run lint:design`, `npm run prebuild`. Do NOT commit. Report per file + RISKS.
