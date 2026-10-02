## A. Summary for the owner

Your customers will have two kinds of Protinas.

**Earned Protinas** come from money they already paid you: 1 Protina per DT paid for products. They become usable 14 days after delivery, which covers the legal return period. They work like cash. A customer can pay any part of an order with them, up to 100 % of the products, plus the 10 DT delivery. They never expire. You lose nothing, because each one was already counted as a cost on an earlier order that made a profit.

**Gift Protinas** are your money. These are the 15 DT welcome gift and the review rewards. The welcome gift goes into the account the moment the phone number is verified. Checkout applies gifts automatically, but only as much as the order can pay for. The full 15 DT applies from 180 DT of products; a smaller basket gets part of it. Gifts can also pay the delivery.

**The pack discount now counts products on promo.**

**One hidden check protects you on every order.** It adds up everything you give away (pack or promo code, the gift, free delivery). That total can never be more than your margin minus a 3 DT safety amount. So any order that gets a discount or a gift still earns you at least 3 DT. The customer never sees a percentage.

**Refused parcels:** we keep 400 Protinas (20 DT, the two courier trips). A parcel paid fully with Protinas costs you nothing if it is refused.

**What customers see:** big Protina numbers, "Vous économisez X DT", the delivery line crossed out when Protinas pay it, and one sentence of rules.

**Three things are needed before launch:**
1. **Fix a bug that already exists.** When staff save an order in the admin, for example to change its status, the order total is rewritten without the discounts. Aramex can then collect the full price.
2. **Confirm that your lowest real margin on promo prices is at least 15 %**, or give me the real number. Everything above depends on it. At 15 %, a 10 % promo code loses money. The admin will show you the safe maximum, which is 5 %.
3. **Top up WinSMS.** Without SMS there is no phone check, so nobody can receive the welcome gift.

---

## B. Final rules

Notation (per order, worked in integer millimes):

| Symbol | Meaning |
|---|---|
| P | Programme products at their real (promo) price. Machines are excluded. |
| F | Delivery fee actually charged |
| D | The one commercial discount: pack or code |
| G | Gift Protinas used |
| m | Margin floor |
| e | Earn rate, 1/20 = 5 % |
| K | Courier cost per trip |
| S | Safety amount |

| # | Rule | Parameter | Config key / env | Why the shop keeps winning |
|---|---|---|---|---|
| 1 | **Value.** 20 Protinas = 1 DT, so 1 Protina = 0.050 DT. | 20 | `loyalty.points.points_per_dt` / `PROTINAS_PER_DT=20` | Scale unchanged. |
| 2 | **Earning.** 1 Protina per DT of programme products paid in cash, counted after the pack/code and after Protinas spent on products. Delivery and machines earn nothing. The base is frozen at checkout and credited at delivery. Guests and orders created in the admin earn nothing (kept). | 1 per DT | `loyalty.points.earn_per_dt` / `PROTINAS_EARN_PER_DT=1`; column `commandes.earn_base_dt` | Only cash the shop keeps earns. The 5 % cost is reserved inside every order's budget (rule 6). |
| 3 | **Earn hold.** Earned Protinas become spendable 14 days after delivery and show as "en attente" from day 0. Orders created before launch have no hold. | 14 days | `loyalty.points.earn_hold_days` / `PROTINAS_EARN_HOLD_DAYS=14` | Covers the legal withdrawal window (10 working days) and Aramex status corrections, so earn → spend → return cannot create a debt. |
| 4 | **Two wallets, one total shown:** *Gagnées* and *Cadeau*. | — | `users.gift_points_balance`, `user_point_transactions.bucket` | Earned = prepaid money; gift = unfunded. |
| 5 | **Earned Protinas are free to use.** Up to 100 % of products plus delivery, any amount, and they stack with pack, code and gift. Points pay the delivery first, then products. "Tout utiliser" takes the total to exactly 0.000; the shop absorbs at most 49 millimes. Never expire. Need a verified phone or email (kept) and no debt. | 100 %, delivery yes, min cash 0 | `loyalty.points.earned_max_percent` / `PROTINAS_EARNED_MAX_PERCENT=100`; `loyalty.points.cover_shipping` / `PROTINAS_COVER_SHIPPING=true`; `loyalty.points.min_cash_dt` / `PROTINAS_MIN_CASH_DT=0` | Each one was booked as a cost on an earlier order that was already in profit. Spending it is the same as cash, so it drops out of the proof. |
| 6 | **Hidden order budget.** `A = (m − 5 %)·P + F − K − S`. Pack or code ≤ `A ÷ 0.95`. Gift ≤ `A − 0.95·D`. When `products.prix_achat` is filled, `(price − prix_achat)·qty` replaces `m·price` for that line. A, m, K and S are never sent to the browser. | m=15 %, K=10 DT, S=3 DT | `loyalty.budget.margin_floor_percent` / `LOYALTY_MARGIN_FLOOR_PERCENT=15`; `loyalty.budget.courier_cost_dt` / `LOYALTY_COURIER_COST_DT=10`; `loyalty.budget.safety_dt` / `LOYALTY_SAFETY_DT=3`; new nullable `products.prix_achat` | Any order that receives a giveaway nets ≥ S = 3 DT when the real margin is at least the floor. Verified on 1,001,772 baskets, 0 violations (§C). |
| 7 | **Pack.** −3 % / −5 % / −7 % from 200 / 350 / 500 DT of programme products, **promo lines included**. Opt-in from the pack-builder (kept). Capped to the budget, which never bites at 15 %. | tiers kept | `PACK_TIERS=200:3,350:5,500:7`; `loyalty.pack.exclude_promo_lines` / `PACK_EXCLUDE_PROMO_LINES=false` (code default flipped) | Fits the budget at any margin ≥ 14.25 % and shrinks automatically below that. |
| 8 | **One discount per order.** Code or pack, the larger wins; the pack wins a tie; the losing code is not consumed (kept). Gift and earned Protinas stack, the gift only inside rule 6. | — | — | Only one giveaway per order, and it sits inside the budget. |
| 9 | **Codes are guarded by default** (capped to the budget at checkout). The admin form shows the safe maximum when a code is created: 5 % from 60 DT at a 15 % floor; a fixed 15 DT from 173 DT. A per-code "perte acceptée" switch honours a code in full. A free-delivery code needs `A ≥ 0` with F = 0, which means from 130 DT. | guard on | `loyalty.coupons.margin_guard` / `COUPON_MARGIN_GUARD=true`; new `coupons.allow_over_budget` (default false, existing codes included) | The owner cannot create a losing code by accident, and a leaked code cannot drain money. |
| 10 | **Delivery.** 10 DT when programme products are under 300 DT, free from 300. The client's value is ignored and only `livraison=1` is accepted (kept). Delivery can be paid with 200 Protinas. | 10 / 300 | `DELIVERY_FEE_DT=10`, `FREE_DELIVERY_FROM_DT=300` | Free delivery shows up as F = 0 inside A, so its 10 DT is always paid for by the budget. |
| 11 | **Welcome gift.** 300 gift Protinas (15 DT) **credited at phone OTP verification**. Once per account, phone and email (kept, plus the existing SMS limits). Applied automatically. The full 15 DT applies from 180 DT of products. Can pay the delivery. Valid 60 days for new gifts. | 300 pts, 60 days | `welcome_bonus.unlock_on_first_delivery` / `WELCOME_BONUS_UNLOCK_ON_DELIVERY=false` (code default flipped); `loyalty.gift.valid_days` / `PROTINAS_GIFT_VALID_DAYS=60` | Usable only inside a paid order's budget, so even a farmed SIM leaves ≥ 3 DT. |
| 12 | **Gift spending order.** Gift first, soonest expiry first, then earned (oldest first). The gift is applied automatically; "Garder pour plus tard" removes it. | on | `loyalty.gift.auto_apply` / `PROTINAS_GIFT_AUTO_APPLY=true` | Gifts get used, which drives conversion, before they expire. |
| 13 | **Reviews.** 10 gift Protinas, or 50 for a verified purchase (kept); valid 60 days; taken back if the review is unpublished. | kept | `config/reviews.php`, `PROTINAS_GIFT_VALID_DAYS` | Gift, so bounded by rule 6. |
| 14 | **Cancelled before dispatch** (`!wasDispatched()`): everything comes back. Gift Protinas keep their expiry, or get +7 days if it has passed. | 7 days grace | `loyalty.gift.refund_grace_days=7` | No courier cost was incurred. |
| 15 | **Refused or returned after dispatch.** The shop keeps `min(400, Protinas used)`, earned first, then gift. The rest comes back. Protinas earned on that order are taken back. The admin can waive the deposit in one click ("Rendre la retenue Protinas"). Only applies to orders priced under v3. | 400 | `loyalty.refusal.forfeit_points` / `PROTINAS_REFUSAL_FORFEIT_POINTS=400` | 400 = 2 courier trips × 10 DT, so a refused 0-cash order nets exactly 0. |
| 16 | **Clawbacks are never forgiven.** A shortfall becomes `points_debt`; the next earnings repay it first; nothing can be spent while debt > 0. An order delivered after its points were refunded is debited again. On a return, the admin sees "à déduire du remboursement". | — | `users.points_debt` | Closes gaps 1 and 2 of today's system (forgiven clawback, cancel → re-deliver). |
| 17 | **Cash-on-delivery confirmation (blocking).** If cash due is under 20 DT, or Protinas are ≥ 50 % of the amount due, the order must be confirmed by a call to the **account's verified phone** before "Envoyer vers Aramex" is enabled. | 20 DT / 50 % | `loyalty.cod.confirm_below_cash_dt` / `PROTINAS_CONFIRM_BELOW_CASH_DT=20`; `loyalty.cod.confirm_points_share_percent` / `PROTINAS_CONFIRM_POINTS_SHARE=50` | Stops a stolen account being cashed out, and stops unchecked 0-cash dispatches. The first such order doubles as the live Aramex test with no cash to collect. |
| 18 | **Repeat refusers.** 2 refusals after dispatch within 90 days → gift frozen for 90 days and every order needs confirmation. Earned Protinas stay usable. | 2 / 90 / 90 | `PROTINAS_REFUSAL_FREEZE_AFTER=2`, `PROTINAS_REFUSAL_WINDOW_DAYS=90`, `PROTINAS_REFUSAL_FREEZE_DAYS=90` | Abusers lose free money. Earned is already protected by rule 15. |
| 19 | **Machines are outside the programme.** Cardio Fitness and Matériel de Musculation, the 41 in-stock items from 350 to 35,000 DT: no pack, no gift, no earning. They do not count toward 200/350/500 or toward 300. Earned Protinas can pay for them. | 2 subcategories | `loyalty.program.excluded_subcategory_slugs` / `LOYALTY_EXCLUDED_SUBCATEGORIES=materiel-de-musculation,cardio-fitness` | Unknown margins and freight costs never fund a giveaway. |
| 20 | **Expiry.** Earned: never. Gift: 60 days for new ones; gifts that already exist never expire. Reminders 7 days and 1 day before, by email, plus SMS only if switched on. | 7,1 / SMS off | `loyalty.gift.reminder_days=7,1`; `loyalty.gift.sms_reminders` / `PROTINAS_SMS_REMINDERS=false` | Creates urgency without breaking the published "n'expirent pas" promise. |
| 21 | **Welcome delivery-phone check at use.** If on, gift Protinas do not apply when the delivery phone belongs to another account's welcome claim. | **off** | `welcome_bonus.unique_delivery_phone` / `WELCOME_BONUS_UNIQUE_DELIVERY_PHONE=false` (now checked when the gift is used) | Money-safe without it, because of rule 6. A deliberate choice, not a silent loss: the audit reports delivery phones shared by gift spenders, and the switch is one env flip. |
| 22 | **Till.** Separate ledger; everything there counts as earned; 20 = 1 DT; earning is immediate; minimum 100 Protinas. 100 % of the ticket only after ticket-cancel reversal ships and is verified. | 10 → 100 | `TILL_MAX_DISCOUNT_PERCENT` | A cancelled ticket can never be cashed out. |
| 23 | **Server pricing.** The quote is the only calculator; `expected_total` / 409 (kept). The v2 code path stays for rollback. | v3 | `loyalty.rules_version` / `LOYALTY_RULES_VERSION=3` (2 = the 02/10 rules); `PROTINAS_V3_SINCE` | One env flag rolls back. |

**The only rule sentence the customer sees at checkout:**
« Vos Protinas règlent vos articles et la livraison ; si un colis est refusé après l'envoi, 400 Protinas sont retenues pour l'aller-retour et le reste vous est rendu. »

Everything else on the checkout page is an amount or a single contextual hint.

---

## C. Worst-case proof

**Assumptions**

| Input | Value |
|---|---|
| Engine settings | m = 15 %, K = 10 DT, S = 3 DT, e = 5 % |
| Real margin on the promo price, tested | 15 / 20 / 30 %. No cost price exists in the repo; 15 % is the stress value, 20 % central. |
| Courier | 10 DT per trip (stress); a refusal costs 2 trips = 20 DT. At the central 8 DT, add +2.00 to every delivered row and +4.00 to every refusal row. |
| Breakage | 0: every Protina is spent |
| Discounts | Counted at TTC value |
| Refused goods | Go back to stock |

**Proof**

For a delivered order, the change in the shop's position (cash profit, minus new Protinas owed, plus earned Protinas retired) is:

ΔV = m·P + F − K − D − G − earn

Earned Protinas spent (R) drop out of this formula.

- Since earn ≤ 5 %·(P − D), the budget gives ΔV ≥ A + S − 0.95·D − G ≥ **S**.
- An order with no giveaway is untouched; its ΔV is just m·P + F − K − earn.
- Lifetime cash profit = ΣΔV + 0.05 × unspent earned Protinas, which is ≥ 0. Earned Protinas exist only after cash is delivered, are held 14 days, and are never forgiven (rules 3 and 16).

**Brute-force check** (`C:\Users\kouss\AppData\Local\Temp\claude\C--Users-kouss-OneDrive-Desktop-work-seo\b26fd762-b2a4-4b29-852f-055bd09e1960\scratchpad\final\engine.py`):
- Grid: P from 0.001 to 3,000 DT × pack on/off × codes (5/10/20 %, fixed 20/50, free delivery) × gift 0/300/10,000 × earned 0/∞.
- **1,001,772 baskets, 0 violations.**
- The smallest ΔV among orders with any giveaway is **3.000 DT**.
- The pack is never capped at m = 15.

**Results** ("Cash" = cash profit on that order; "Net" = ΔV)

| # | Case | What the engine does | Cash at door (DT) | Cash 15 / 20 / 30 % | Net 15 / 20 / 30 % |
|---|---|---|---|---|---|
| 1 | Cheapest item (gloves 30) + delivery, all earned | 800 earned (200 delivery + 600 products), earns 0, phone confirmation | 0.000 | −35.50 / −34.00 / −31.00 | **+4.50 / +6.00 / +9.00** |
| 1b | Same customer, lifetime | Those 800 needed ≥ 800 DT of earlier cash orders, whose 40 DT was already booked | — | — | ≥ +4.50 on this order, on top of earlier orders that were already in profit |
| 1c | Creatine 59, all earned | 1,380 earned | 0.000 | −60.15 / −57.20 / −51.30 | **+8.85 / +11.80 / +17.70** |
| 2a | Welcome, never orders | Gift sits unused | — | 0 (one OTP SMS) | 0 |
| 2b | Welcome only, gloves 30 | Gift room 0 → gift 0; earns 30 | 40.000 | +4.50 / +6.00 / +9.00 | **+3.00 / +4.50 / +7.50** |
| 2c | Welcome only, creatine 59 | Gift 58 pts (2.90, on delivery); earns 59 | 66.100 | +5.95 / +8.90 / +14.80 | **+3.00 / +5.95 / +11.85** |
| 2d | Welcome only, 150 | Gift 240 pts (12.00); earns 148 | 148.000 | +10.50 / +18.00 / +33.00 | **+3.10 / +10.60 / +25.60** |
| 2e | Welcome only, 180 | Full gift 300 pts (15.00); earns 175 | 175.000 | +12.00 / +21.00 / +39.00 | **+3.25 / +12.25 / +30.25** |
| 2f | Welcome only, 300 (free delivery) | Gift 15.00; earns 285 | 285.000 | +20.00 / +35.00 / +65.00 | **+5.75 / +20.75 / +50.75** |
| 3a | Pack 7 % on 500 of promo items + gift | Pack 35.000 + gift 75 pts (3.75); earns 461 | 461.250 | +26.25 / +51.25 / +101.25 | **+3.20 / +28.20 / +78.20** |
| 3b | Same + earned for the rest | + 9,225 earned; earns 0 | 0.000 | −435.00 / −410.00 / −360.00 | **+26.25 / +51.25 / +101.25** |
| 3c | Pack 5 % on 350 + gift | Pack 17.500 + gift 107 pts (5.35) | 327.150 | +19.65 / +37.15 / +72.15 | **+3.30 / +20.80 / +55.80** |
| 3d | Pack 3 % on 300 + gift | Pack 9.000 + gift 169 pts (8.45) | 282.550 | +17.55 / +32.55 / +62.55 | **+3.45 / +18.45 / +48.45** |
| 3e | Pack 3 % on 200 + gift | Pack 6.000 + gift 226 pts (11.30) | 192.700 | +12.70 / +22.70 / +42.70 | **+3.10 / +13.10 / +33.10** |
| 3f | Pack 7 % on 776 (the 0420 basket) | Pack 54.320 | 721.680 | +52.08 / +90.88 / +168.48 | +16.03 / +54.83 / +132.43 |
| 4a | 0-cash gloves (row 1) refused after dispatch | Keep 400 earned, refund 400; goods back to stock | 0 | −20.00 | **0.00** (+4.00 at an 8 DT courier) |
| 4b | 3b refused after dispatch | Keep 400 earned; gift 75 + 8,825 earned refunded | 0 | −20.00 | **0.00** |
| 4c | Cash order using 100 earned, refused | Keep 100 | — | −20.00 | −15.00 (a pure cash refusal today: −20) |
| 4d | Gift-only order (180), refused | Keep 300 gift; this releases no real money | — | −20.00 | −20.00, the same as any cash refusal today, paid for by S: 3 DT per delivered order covers ≈13 % refusals |
| 5 | 10 farmed SIMs, 180 DT each | Each needs a real paid order; gift capped by the budget | 175.000 each | +12.00 each at 15 % | **+3.25 per number (+32.50 total)**. The farmer pays 50–70 DT of SIMs to save 150 DT on 1,800 DT, about 5 %. On gloves the gift is 0. |
| 6a | 5 % code at 300 + gift | Code 15.000 beats pack 9; gift 55 pts (2.75) | 282.250 | +17.25 / +32.25 / +62.25 | **+3.15 / +18.15 / +48.15** |
| 6b | New 10 % code at 300 (guarded) | Code capped to 17.894; gift 0 | 282.106 | +17.11 / +32.11 / +62.11 | **+3.01 / +18.01 / +48.01** |
| 6c | Existing 10 % code, owner ticked "perte acceptée", at 300 | 30.000 honoured | 270.000 | +5.00 / +20.00 / +50.00 | **−8.50** / +6.50 / +36.50 (outside the guarantee by owner choice) |
| 6d | Free-delivery code at 150 + gift | F = 0; gift 40 pts (2.00) | 148.000 | +10.50 / +18.00 / +33.00 | **+3.10 / +10.60 / +25.60** |
| 6e | 20 % code at 200 (guarded) | Capped to 17.894 | 192.106 | +12.11 / +22.11 / +42.11 | **+3.01 / +13.01 / +33.01** |
| 7a | Delivery paid with 200 earned, 100 DT basket | Earns 100 | 100.000 | +5.00 / +10.00 / +20.00 | +10.00 / +15.00 / +25.00 |
| 7b | Delivery partly paid by the gift, 100 DT | Gift 140 pts (7.00) | 103.000 | +8.00 / +13.00 / +23.00 | **+3.00 / +8.00 / +18.00** |
| 7c | Gift pays the whole delivery (from 130 DT) | Gift 200 pts | 130.000 | +9.50 / +16.00 / +29.00 | **+3.00 / +9.50 / +22.50** |
| 8 | Machine 5,200 DT | No pack, gift or earning; 10 DT delivery; earned Protinas may pay | — | Same as today minus every giveaway | — |
| 9 | Margin below the floor | 3a at a real 13 % with the floor left at 15 | 461.250 | +16.25 | **−6.80** |
| 9b | Floor set to the real 13 % | Pack auto-capped to 28.421, gift 0 | 471.579 | +26.58 | +3.03 |

**Minimum real margin each pack tier needs on its own** (S = 3, K = 10):

| Tier | Margin needed |
|---|---|
| 200 / 3 % | 9.35 % |
| 300 / 3 % | 12.18 % |
| 350 / 5 % | 13.46 % |
| 500 / 7 % | **14.25 %** |

**Thresholds published by `/loyalty/rules`:**

| | m = 15 % | m = 20 % |
|---|---|---|
| Full welcome gift from | 180 DT | 120 DT |
| Free-delivery code from | 130 DT | 87 DT |
| Safe code | 5 % from 60 DT | 10 % from 60 DT |

---

## D. Customer-facing French copy

Amounts use the existing `formatDt` format. All example numbers come from the engine.

### D1. Checkout summary (`CheckoutPage`, `CheckoutFooterCTA`)

**New customer, 180 DT, welcome applied automatically:**
```
Articles (3)                                    180,000 DT
Livraison                                        10,000 DT
Cadeau de bienvenue (300 Protinas)              −15,000 DT
Total à payer à la livraison                    175,000 DT
Vous économisez 15,000 DT sur cette commande.
+175 Protinas à la livraison (8,750 DT pour la prochaine)
```

**Pack at 500 DT + welcome:**
```
Articles (6)                                    500,000 DT
Remise pack −7 % (promos comprises)             −35,000 DT
Livraison                                          Offerte
Cadeau de bienvenue (75 Protinas)                −3,750 DT
Total à payer à la livraison                    461,250 DT
Vous économisez 48,750 DT sur cette commande.
+461 Protinas à la livraison (23,050 DT pour la prochaine)
Vous gardez 225 Protinas cadeau pour votre prochaine commande.
```

**Pack at 200 DT, 660 earned, "Tout utiliser":**
```
Articles (2)                                    200,000 DT
Remise pack −3 %                                 −6,000 DT
Livraison                      10,000 DT (barré)  Réglée avec 200 Protinas
Vos Protinas (460)                              −23,000 DT
Total à payer à la livraison                    171,000 DT
Vous économisez 39,000 DT sur cette commande.
+171 Protinas à la livraison (8,550 DT pour la prochaine)
```

**Notes on the summary:**
- **0 DT to pay:** « Rien à payer à la livraison : vos Protinas règlent toute la commande. Nous vous appelons pour confirmer avant l'envoi. »
- **Order needs confirmation (rule 17):** « Nous vous appelons au {numéro vérifié masqué} pour confirmer avant l'envoi. »
- **Savings line:** counts pack, code, Protinas and free delivery. It never counts crossed-out prices (Loi 98-40).
- **Pack beats the code:** « Votre remise pack est plus avantageuse que le code {CODE} : nous l'avons gardée. Votre code reste utilisable plus tard. »
- **Guarded code (rare once the admin shows safe codes):** « Code {CODE} : −{x} DT, le maximum de ce code sur ce panier. »
- **Free-delivery code below its minimum:** « Ce code offre la livraison dès {x} DT d'articles. »

### D2. Protinas block (`LoyaltyPointsRedeemer`)

**Fixed parts:**
- **Title:** « Payer avec mes Protinas »
- **Balance:** « Disponibles : 1 540 Protinas = 77,000 DT ». With pending points, add « · 175 en attente, disponibles le 16/10 ».
- **Gift line:** « Cadeau de bienvenue appliqué : −15,000 DT », with the link « Garder pour plus tard ».
- **Chips:**
  - « Payer la livraison · 200 Protinas » (only while delivery is still due in cash)
  - « Tout utiliser · 1 540 Protinas »
  - « Choisir un montant »
- **Slider label:** « Protinas utilisées : {n} = −{dt} DT ». Steps of 20 Protinas; the last step equals the exact total.
- **Under the slider:** « Il vous restera {r} Protinas ({rdt} DT). »
- **Rule sentence, always shown:** « Vos Protinas règlent vos articles et la livraison ; si un colis est refusé après l'envoi, 400 Protinas sont retenues pour l'aller-retour et le reste vous est rendu. »

**Contextual hint** (at most one at a time):

| Situation | Hint |
|---|---|
| Small basket | « Votre cadeau : {x} DT sur ce panier — les 15 DT en entier dès 180 DT d'articles. » |
| Gift room reduced by a pack or code | « Avec votre remise pack, {x} DT de cadeau s'appliquent ici ; vous gardez {r} Protinas cadeau pour la prochaine commande. » |
| Gift frozen | « Vos Protinas cadeau sont suspendues jusqu'au {date} après 2 colis refusés. Vos Protinas gagnées restent utilisables. » |
| Debt | « Solde à compenser : {n} Protinas (commande {N} retournée). Vos prochains achats le compensent automatiquement. » |
| Account not verified | « Vérifiez votre téléphone ou votre email pour utiliser vos Protinas. » |

### D3. Delivery paid with Protinas

| Where | Copy |
|---|---|
| Chosen | The delivery line is crossed out: « ~~10,000 DT~~ Réglée avec 200 Protinas » |
| Cart progress bar | « Plus que {x} DT pour la livraison offerte, ou réglez-la avec 200 Protinas. » → « Livraison offerte » |
| Pack progress bar | « Encore {x} DT pour passer à −{p} % sur tout le pack (promos comprises). » |
| Cart, pack-builder (replaces "hors articles en promo") | « Remise pack : −3 % dès 200 DT, −5 % dès 350 DT, −7 % dès 500 DT, promos comprises. Non cumulable avec un code promo : la meilleure remise s'applique. » |

### D4. Welcome, right after phone verification (`VerifyPhonePage`)

- **Title:** « Vos 15 DT sont là »
- **Body:** « 300 Protinas cadeau viennent d'être ajoutées à votre compte. Elles s'appliquent toutes seules à votre prochaine commande : les 15 DT en entier dès 180 DT d'articles, et elles peuvent aussi régler la livraison. À utiliser avant le {date}. »
- **Button:** « Faire mes achats »
- **Already claimed:** « Ce numéro a déjà reçu le cadeau de bienvenue. Vous gagnez 1 Protina par DT à chaque commande livrée. »
- **Teaser before verification** (register page, verification card, dashboard, verify-email page, artwork): « Vérifiez votre numéro : 15 DT offerts tout de suite. »

### D5. Account wallet (`FidelitySection`, `MemberDashboard`)

**Header and tiles:**
- **Header:** « 1 540 Protinas = 77,000 DT »
- **Gagnées:** « Gagnées · 1 240 (62,000 DT) — utilisables sans limite, livraison comprise. Elles n'expirent jamais. »
- **Cadeau, new gift:** « Cadeau · 300 (15,000 DT) — à utiliser avant le {date}. En entier dès 180 DT d'articles. »
- **Cadeau, grandfathered gift:** « Cadeau · 300 (15,000 DT) — sans date limite. En entier dès 180 DT d'articles. »
- **En attente:** « En attente · 175 — disponibles le 16/10/2026 (délai de retour). »
- **En route:** « En route : +210 Protinas à la livraison de la commande 2026/0471. »
- **Savings counter:** « Depuis votre inscription, vous avez économisé 143,500 DT. »

**« Comment ça marche »:**
1. « 1 Protina par DT payé pour vos articles, disponible 14 jours après la livraison. »
2. « 20 Protinas = 1 DT, utilisables jusqu'à 100 % de vos articles et la livraison. »
3. « Cadeau de bienvenue : 15 DT dès la vérification de votre numéro, en entier dès 180 DT d'articles. »
4. « Remise pack (promos comprises) ou code promo : la meilleure des deux s'applique. »
5. « Colis refusé après l'envoi : 400 Protinas retenues pour l'aller-retour, le reste vous est rendu. Annulation avant l'envoi : tout vous est rendu. »

**History lines:**
- « Cadeau de bienvenue — 15 DT en Protinas (valable jusqu'au {date}) »
- « Protinas utilisées sur commande {N} (dont 200 pour la livraison) »
- « Commande {N} annulée avant l'envoi : {n} Protinas rendues »
- « Commande {N} refusée : 400 Protinas retenues (transport aller-retour), {r} rendues »
- « Protinas cadeau expirées »
- « Protinas réutilisées : commande {N} finalement livrée »

**Delivered email:**
- Subject: « Livrée ! +{n} Protinas pour vous »
- Body: « … disponibles le {date}. Solde : {b} Protinas = {dt} DT. »

### D6. Expiry reminders (`protinas:gift-reminders`)

| Channel | Copy |
|---|---|
| Email D-7, subject | « Vos 15 DT vous attendent encore 7 jours » |
| Email D-7, body | « Vos 300 Protinas cadeau expirent le {date}. Elles s'appliquent toutes seules à votre commande : en entier dès 180 DT d'articles, et elles peuvent régler la livraison. [Faire mes achats] » |
| Email D-1, subject | « Dernier jour pour vos 15 DT » |
| SMS D-7 (GSM-7, only if `PROTINAS_SMS_REMINDERS=true`) | `protein.tn : vos 15 DT offerts expirent le {jj/mm}. En entier des 180 DT d'articles, ils reglent aussi la livraison : protein.tn` |
| SMS D-1 | `protein.tn : dernier jour pour vos 15 DT offerts (300 Protinas). protein.tn` |
| Site banner | « Vos 15 DT cadeau expirent le {date} — ils s'appliquent tout seuls à votre commande. » |

### D7. Admin copy

- **Badge:** « À confirmer par téléphone ({numéro vérifié}) »
- **Button:** « Confirmé par téléphone »
- **Aramex send blocked:** « Confirmez la commande par téléphone avant l'envoi »
- **Return panel:** « Protinas à déduire du remboursement : {x} DT »
- **Action:** « Rendre la retenue Protinas »
- **Delivery field helper:** « Livraison réglée en Protinas : 10,000 DT »

---

## E. Migration of existing data

**Order of steps** (DB backup first; each vps-run is checked by the counts it prints, because a green check mark is not proof):

1. **Ship PR 0** (the cash-on-delivery fix, §F0) on its own. Run `protinas:audit` to list orders where `prix_ttc ≠ prix_ht − discount_ht − remise + frais_livraison`. Fix each one before creating any delivery note or sending to Aramex.
2. **Deploy the schema and ledger code with `LOYALTY_RULES_VERSION=2`.** Pricing does not change, but `record()` now writes `bucket`.
3. **vps-run `protinas-split-wallets-dry`, read the report, then `protinas-split-wallets` (`--apply`).**
4. **Flip the env:**
   - `LOYALTY_RULES_VERSION=3`
   - `PROTINAS_V3_SINCE=<now>`
   - `PACK_EXCLUDE_PROMO_LINES=false`
   - `WELCOME_BONUS_UNLOCK_ON_DELIVERY=false`

   Then `config:clear` and flush the `/loyalty/rules` cache.
5. **vps-run `welcome-release-pending`, then `protinas-check-rules`, `protinas-coupons-review` and `protinas-audit`.**
6. **Top up WinSMS.** Then the owner sends the launch email to gift holders: « Vos 15 DT de bienvenue sont utilisables dès maintenant, même pour la livraison. »

**What happens to each piece of existing data**

| Data | Handling | Result |
|---|---|---|
| All ledger rows | Classified as in the code map §2: `commande_id` → earned; `review_id`, a `welcome:%` key or a `Cadeau de bienvenue%` description → gift. | `bucket` set on every row. |
| **30 welcome gifts already credited** (legacy rows, no key) | Gift. `remaining` = 300 − past spending, with past spending charged gift-first, which favours the customer. `expires_at` = NULL, so they keep the no-expiry promise. | `users.gift_points_balance` ≈ 300 each. |
| ~3 earned holders | Earned = `points_balance` − gift remaining. Available at once (no hold). | Total value unchanged (≈ 450–480 DT gift, ≈ 25–45 DT earned). |
| Balances that drifted because of the 0-floor | One hidden `adjustment` row per user, key `migration:wallets:{uid}`. `points_balance` stays the truth. Forgiven clawbacks are **not** turned into debts. | Ledger sum = balance − debt from then on. |
| **Pending claims** (reserved since 02/10, `credited_at` NULL) | Released by `welcome-release-pending` after the flip, as gift, key `welcome:{uid}:unlock:0`. `expires_at` = NULL when `claim.created_at < PROTINAS_V3_SINCE`. | Expected 0 to a few, since WinSMS is at 0; the command prints the count. |
| **Till cards** (3 per the 02/10 doubling; one brief said 2, so `protinas:audit` recounts) | Untouched: separate ledger, already on 20 = 1 DT. `TILL_MAX_DISCOUNT_PERCENT` stays 10 until `reverseTicket` is shipped and verified. | No change for those customers. |
| **Orders in flight** (`pricing_version` NULL) | Never repriced; stored columns and delivery note unchanged. Earning uses the legacy `earnableSpend` with no hold. Cancel or refusal gives a full refund (old terms). `reverseUnlock` stays for orders that unlocked a welcome. The re-debit on cancel → deliver applies to all orders (it fixes a shop-loss bug). | Customers get exactly what they were promised. |
| Orders cancelled and then delivered **before** the deploy | Not debited retroactively; listed by `protinas:audit`; the owner decides. | — |
| Existing coupons | All get `allow_over_budget=false` (guard on). `protinas:coupons-review` prints each active code's worst case. The owner ticks "perte acceptée" only on codes chosen deliberately. | No code can lose money unless the owner decides it should. |
| Open checkout tabs | The next tap gets a 409 with the new total (existing flow); old bundles do the same. | One extra tap. |
| Products | `prix_achat` NULL means the 15 % floor is used until the owner fills costs. | — |

**Rollback:** `LOYALTY_RULES_VERSION=2` + `config:clear`. Wallet columns stay; they are harmless.

---

## F. Implementation plan

Paths are under `C:/mls`. Stage each file by explicit path; parallel sessions run on this repo. Run `npm run prebuild` before pushing the storefront. A reviewer reads the real diff of every batch.

### F0. Prerequisite PR: cash on delivery must equal `prix_ttc` (blocks launch; the bug exists today)

Verified at `4bbc6db8`: an admin save of an order (which also happens on routine status changes) runs `EditCommande::afterSave()` L196-200, which writes `prix_ttc = prixHt + frais` and drops `remise` and `discount_ht`. Then the fallback at `OrderToBlService.php` L124-135 runs whenever `frais <= 0`. It derives `frais = prix_ttc − lines + remise = remise`, so the delivery note's `net_a_payer` becomes the full price of the lines. Today that hits orders of 300 DT or more with a pack or points; under v3 it would hit every order whose delivery was paid with Protinas.

| File | Change |
|---|---|
| `filament/app/Filament/Resources/CommandeResource/Pages/EditCommande.php` `afterSave()` L196-200 | `prix_ttc = max(0, round(prixHt − (float)discount_ht − (float)remise + frais, 3))`, using the stored values. |
| `filament/resources/views/filament/pages/commande-form.blade.php` | L581: `apres_remise = ht − remise − discount + frais`, with hidden read-only remise and discount fields. L626 `cmdSave` keeps sending it. L294-306 adds the helper « Livraison réglée en Protinas ». |
| `filament/app/Services/DocumentConversion/OrderToBlService.php` | L124-135: derive the fee only when `pricing_version IS NULL` and the order has no pack, points or coupon. After `InvoiceCalculator::calculate`: if the order came from the API and `abs(net_a_payer − prix_ttc) > 0.01`, throw a clear exception and refuse to create the delivery note. |
| `filament/app/Filament/Resources/FactureResource.php` L193-198 ("Envoyer vers Aramex") | Disabled, with a tooltip, when the delivery note's `net_a_payer` ≠ the source order's `prix_ttc`, or when the order has `requires_phone_confirmation` and no `phone_confirmed_at`. |
| `ProtinasAudit` | New section listing orders that break the identity. |

**Tests for F0:**

| Test | Expected |
|---|---|
| `OrderAdminSaveKeepsCashOnDeliveryTest::test_status_save_keeps_total` | 330.000 goods, pack 9.900, 100 Protinas (5.000) → `remise` 14.900, frais 0, `prix_ttc` 315.100. After an admin status save, `prix_ttc` is still 315.100 and the delivery note's `net_a_payer` is 315.100 (today: 330.000). |
| `…::test_zero_cash_order_stays_zero` | Gloves paid with 800 Protinas: `prix_ttc` 0 after save, `net_a_payer` 0. |

### F1. Config

**`filament/config/loyalty.php`:**
- add `rules_version` (3) and `v3_since`;
- add `budget.{margin_floor_percent 15, courier_cost_dt 10, safety_dt 3}`;
- extend `points` with `{earned_max_percent 100, cover_shipping true, min_cash_dt 0, earn_hold_days 14}`;
- add `gift.{valid_days 60, refund_grace_days 7, reminder_days [7,1], sms_reminders false, auto_apply true}`;
- add `refusal.{forfeit_points 400, freeze_after 2, window_days 90, freeze_days 90}`;
- add `cod.{confirm_below_cash_dt 20, confirm_points_share_percent 50}`;
- add `program.excluded_subcategory_slugs`;
- add `coupons.margin_guard` (true);
- change the `pack.exclude_promo_lines` default to false;
- leave `till.max_total_discount_percent` at 10;
- keep `checkout.max_total_discount_percent` for the v2 path only.

**`filament/config/welcome_bonus.php`:** `unlock_on_first_delivery` default false; `unique_delivery_phone` default false (new meaning: checked when the gift is used).

### F2. Migration `2026_10_xx_000001_protinas_wallets_v3.php`

Every step is guarded with `Schema::hasColumn`.

| Table | Changes |
|---|---|
| `users` | `gift_points_balance` uint 0, `points_debt` uint 0, `gift_frozen_until` ts NULL, `cod_confirm_until` ts NULL |
| `user_point_transactions` | `bucket` varchar(8) default `'earned'`, `expires_at` NULL, `remaining` int NULL, `available_at` NULL; indexes `(user_id,bucket,expires_at)` and `(user_id,available_at)` |
| `commandes` | `pricing_version` tinyint NULL, `points_redeemed_gift` int 0, `points_shipping_dt` dec(10,3) 0, `earn_base_dt` dec(10,3) NULL, `budget_dt` dec(10,3) NULL, `requires_phone_confirmation` bool 0, `phone_confirmed_at` NULL, `phone_confirmed_by` NULL, `protinas_forfeited` int 0, `protinas_forfeit_waived` bool 0 |
| `coupons` | `allow_over_budget` bool 0 |
| `products` | `prix_achat` dec(10,3) NULL |
| `welcome_bonus_claims` | `used_phone_hash` NULL (indexed), `used_by_commande_id` NULL |

### F3. New classes

**`app/Support/ProtinaWallet.php`** (value object): `total`, `earnedSpendable`, `earnedPending`, `nextAvailableAt`, `gift`, `giftExpiresAt`, `debt`, `giftFrozenUntil`, `blockedReason`.

**`app/Services/ProtinaWalletService.php`:**
- `forUser(User)`: earned spendable = balance − gift − pending earn rows (`available_at > now`). When the gift column is missing, the whole balance counts as gift.
- `consumeGift(User, int)`: FIFO by `expires_at` with NULLs last; returns the latest expiry consumed.
- `creditGift()`.
- `refundGift(expiry)`: expiry = max(original, now + 7 days).
- `expireDue()`.

**`app/Services/OrderBudget.php`:**
- `budget(programmeLines, int shippingChargedMm): int` returns `A_mm = Σcosted(price−prix_achat)·qty + intdiv(m·uncosted,100) − intdiv(earn·P, ppd) + F − K − S`.
- `maxCommercial(A) = A>0 ? intdiv(A·ppd, ppd−earn) : 0`.
- `giftRoom(A, D) = max(0, A − ceil(D·(ppd−earn)/ppd))`.
- `safeCouponPercent(minOrder)`, `safeFixedFrom(value)`, `giftFullFromDt()`, `freeShippingCodeFromDt()`.

### F4. `app/Services/CheckoutPricingService.php`

- **Signature:** `price()` L24 gains trailing `?ProtinaWallet $wallet = null, bool $useGift = true`. It dispatches on `config('loyalty.rules_version')`: 2 → `priceV2()` (today's body moved unchanged); 3 → `priceV3()`. A null wallet in v3 means an empty wallet (guest).
- **`priceV3()` steps:**
  1. Split programme and excluded lines, using `Product::isLoyaltyExcluded()`. It reads `sousCategorie->slug`, so eager-load the relation in both controllers.
  2. F from programme goods; the pack tier and base on programme goods, promo lines included.
  3. Code: on programme goods. A free-delivery code sets F = 0 and is refused with a reason when `A < 0.95·pack`.
  4. A, then cap the pack to `maxCommercial`. Cap the code too unless `allow_over_budget`. Pick the winner (tie → pack).
  5. Gift: if used, frozen or debt → 0; otherwise `min(gift, intdiv(giftRoom·20, 1000))`, capped by the amount due.
  6. Earned: debt → 0; otherwise `min(requested, earnedSpendable, ceil((due − giftValue − minCash)·20/1000))`.
  7. Value = `min(points·50, remaining)`. `onShip = min(F, value)`. `onGoods = value − onShip`. `earnBase = max(0, P − D − onGoods)`. `total = due − value`.
  8. `requires_phone_confirmation = total < 20 DT || value ≥ 50 % of due`.
- **Output keys:**
  - `goods_dt`, `programme_goods_dt`, `excluded_goods_dt`;
  - `pack.{percent, amount_dt, capped}`, `coupon.{applied, amount_dt, capped, reason}`;
  - `shipping_gross_dt`, `shipping_dt` (net);
  - `protinas.{earned_spendable, earned_pending, pending_available_at, gift_balance, gift_expires_at, debt_points, gift_frozen_until, max_gift_points, max_earned_points, max_usable_points, used_points, used_gift_points, used_earned_points, used_dt, used_on_shipping_dt, used_on_goods_dt, gift_full_from_dt, gift_left_points, blocked_reason}`;
  - `savings_dt`, `total_dt`, `earn_on_delivery_points`, `earn_available_after_days`, `requires_phone_confirmation`.
  - **Removed in v3:** `ceiling_*`, `room_dt`. **Never exposed:** A, m, K, S.

### F5. `app/Http/Controllers/Api/CommandeController.php`

- **Validation (store and quote, L91-105 and L551-555):** add `use_gift` boolean. `points_to_redeem` now means earned Protinas.
- **`storeCommandeApi` L363-384:** lock the user row whenever the account is logged in. Build `ProtinaWalletService::forUser($locked)`. Return 422 when there is debt and points were requested. If `unique_delivery_phone` is on and the `livraison_phone` hash matches another account's claim (`phone_hash`, `unlock_phone_hash` or `used_phone_hash`), set `$useGift=false` with reason `welcome_phone_used`.
- **L395-399:** pass the wallet and `use_gift`.
- **Column writes, L415-437:**

| Column | Value |
|---|---|
| `points_discount_ht` | `used_on_goods_dt` |
| `points_shipping_dt` | `used_on_shipping_dt` |
| `frais_livraison` | net |
| `remise` | pack + `used_on_goods_dt` |
| `points_redeemed` | total |
| `points_redeemed_gift` | gift points |
| `earn_base_dt`, `budget_dt` | from pricing |
| `pricing_version` | 3 |
| `requires_phone_confirmation` | from pricing |

  Identity kept: `prix_ttc = prix_ht − discount_ht − remise + frais_livraison`.
- **Redeem rows, L439-443:** two rows. `order:{id}:redeem` (earned bucket) and `order:{id}:redeem-gift` (`consumeGift`, latest expiry stored on the row). On first gift use, set `welcome_bonus_claims.used_phone_hash` and `used_by_commande_id`.
- **`quote()` L555-619:** same wallet (no lock); pass `livraison_phone` when present.
- **`refuseLegacyClientMismatch` L511-536:** 422 only when requested > balance or pack + code are both requested. The message cites `max_usable_points` only.
- **`storedPricing` L674-688 and `details()` L696-703:** add the new columns.

### F6. `app/Services/PointsService.php`

- **`record()` L398-457:** trailing `string $bucket='earned', ?\DateTimeInterface $expiresAt=null, ?\DateTimeInterface $availableAt=null, bool $allowDebt=false`.
  - Writes the new columns only when they exist (`ProtinaLedgerSecurityTest` builds its own schema).
  - Keeps `gift_points_balance` up to date and sets `remaining` on gift credits.
  - When `$allowDebt` is true, the shortfall goes to `points_debt` instead of the L430-433 floor.
  - Credits to the earned bucket repay debt first.
- **`earnableSpend()` L78-82:** return `earn_base_dt` when it is set (legacy formula otherwise).
- **`earn()` L244:** earned bucket; `availableAt = now + hold` for v3 orders, NULL for legacy orders.
- **`syncOnStatusChange()` L145-197:**
  - `unlockOnDelivery` only while the switch is on;
  - on delivered, if a redeem refund exists, re-debit with key `order:{id}:redeem:v{n}` (`allowDebt`);
  - pass the `Commande` to the reversal.
- **`reverseForCommande(User, Commande, string)`, replacing the private L205 version:** dedupe by versioned key, not by sign.

| Case | Behaviour |
|---|---|
| Legacy order, or not dispatched, or deposit waived | Full refund: `:redeem-refund`, and `:redeem-refund-gift` back to gift with `refundGift(expiry)` |
| Otherwise | `keep = min(400, used)`, earned first; refund the remainder; store `protinas_forfeited` |
| Order had already earned | Claw back with `:earn-reversal` (`allowDebt`), and set the earn row's `available_at` to now |
| Then | Count dispatched v3 refusals in the last 90 days; at 2 or more, set `gift_frozen_until` and `cod_confirm_until` = now + 90 days |

- **New:** `waiveForfeit(Commande)`, key `order:{id}:forfeit-refund`.
- **`awardForReview` L292-340:** gift bucket, `expiresAt = now + 60 days`.
- **`reverseForReview`:** takes from gift, then earned, then debt.
- **`computeRedemption` L93-118:** delete it together with its unit test.

### F7. Other services and controllers

- **`app/Services/WelcomeBonusService.php` `creditPending` L65-85:** gift bucket; `expiresAt` NULL if the claim was created before `v3_since`, otherwise now + 60 days. `unlockOnDelivery` and `reverseUnlock` stay for legacy orders only.
- **`app/Services/PhoneVerificationService.php` `result()` L102-106:** add the expiry date and « en entier dès {gift_full_from_dt} DT d'articles ».
- **`app/Services/PackDiscountService.php` L37-61 (fix the docblock at L14) and `PackController::quote` L42-69:** drop excluded lines when product ids are sent.
- **`CouponService::computeDiscount` L104-136:** base = programme goods.
- **`app/Http/Controllers/Api/LoyaltyRulesController.php` L13-33:**
  - publishes `version`, `earned{max_percent, cover_shipping, hold_days, expires:false}`, `gift{full_from_dt, valid_days, auto_apply}`, `delivery{fee_dt, free_from_dt, points:200}`, `pack{tiers, excludes_promo_lines:false}`, `welcome.unlock`, `refusal.forfeit_points`;
  - drops `max_total_discount_percent` in v3.
- **Customer APIs:** `PointsController::history` L22-50, `MemberDashboardController` L43-71, and the `ClientController` profile L594-619, select L675-676 and totals L768-793 return the wallet split, pending, expiry, debt, `lifetime_savings_dt` and the delivery paid with Protinas. They hide `migration:` rows.
- **Comment fix:** `AffilieTransactionService.php` L477-479. The commission base is unchanged (it stays on cash).

### F8. Admin and print

- **`CommandeResource`:**
  - "À confirmer" badge column and filter;
  - action "Confirmé par téléphone", which shows the verified account phone and sets `phone_confirmed_at`/`phone_confirmed_by`;
  - action "Rendre la retenue Protinas";
  - return panel « à déduire du remboursement »;
  - convert summary L537-560.
- **`commande-form.blade.php` L294-306:** split of gift / earned / delivery paid with Protinas, plus the budget.
- **`CouponResource` L62-64:** replace the 10 % warning with « Remise sûre max : {x} % dès {y} DT » (or « montant sûr dès {y} DT ») from `OrderBudget`, plus an `allow_over_budget` toggle labelled « Accepter une perte possible » that needs a confirmation.
- **Print views:** `print/bon-de-livraison.blade.php` L37-52, `print/facture-tva.blade.php` L33-50, `emails/documents/facture-tva.blade.php`, `admin/imprimer_facture.blade.php` L393-408, `devis.blade.php` → « Livraison 10,000 / Réglée en Protinas −10,000 ».

### F9. Commands (`routes/console.php`, plus vps-run entries)

| Command | Schedule | What it does |
|---|---|---|
| `protinas:split-wallets [--apply]` | one-off | Migration from §E |
| `protinas:expire` | daily 03:30 | Writes `type=expiry`, key `expiry:{txid}` |
| `protinas:gift-reminders` | daily 10:15 | Email, plus `SendSmsJob` when enabled; key `gift-reminder:{txid}:{d}` |
| `protinas:check-rules` | at deploy | Prints the §C table for the live config; exit 1 if any pack tier needs more than the floor |
| `protinas:coupons-review` | — | Each active code's worst case |
| `WelcomeReleasePending` | — | Grandfathers pre-v3 claims |
| `ProtinasAudit` | — | Updates at L41-55, 91-96, 116 (`goods = prix_ht`), 148-161, 229-234. Adds: buckets add up; ledger = balance − debt; delivery phones shared by gift spenders; monthly liability (earned × 0.050 DT, gift separately) |

### F10. Till

- `LoyaltyService::reverseTicket(Ticket)`, keys `ticket:{id}:reversal`, called from the `TicketResource` delete path, `EditTicket` and the `TicketPosPage` cancel path.
- `maxRedeemablePoints` L205 and `validateRedemption` already read `till.max_total_discount_percent`; the env flips to 100 after the reversal is verified.

### F11. Storefront (`frontend/src`)

| File | Change |
|---|---|
| `util/checkoutPricing.ts` L6-22 | New types |
| `util/loyaltyPoints.ts` | L17-31: remove `MAX_TOTAL_DISCOUNT_PERCENT`; fallbacks `welcome.unlock:'phone_verification'`, `excludes_promo_lines:false`. L64-67: the maximum comes only from the server. |
| `app/(shop)/checkout/CheckoutPage.tsx` | Quote body L175-234 sends `use_gift` and `points_to_redeem` (earned). Redeemer at L743-763 and L926-935. Rows L938-1014: crossed-out delivery, gift line, Protinas line, savings line. L973: remove the 10 % copy. L977-997: shipping row. L761 and L1014: earn line uses `earn_on_delivery_points`. 409 flow (L470-476) unchanged. |
| `CheckoutFooterCTA.tsx` L102-116 | Same lines |
| `app/components/loyalty/LoyaltyPointsRedeemer.tsx` | Chips, slider (step 20, exact last step), gift line with « Garder pour plus tard », hints, rule sentence |
| `app/(shop)/cart/page.tsx` L109-114, 334-335, 374 and `pack-builder/wizard/StepWelcome.tsx` L90 | Copy driven by the rules endpoint, plus both progress bars |
| `OrderReceipt.tsx` L88-127, `OrderDocument.tsx` L34-43 | Delivery paid with Protinas |
| Welcome copy | `VerifyPhonePage.tsx` L127, 128, 137, 147; `AccountVerificationCard.tsx` L59, 61; `FidelitySection.tsx` L139-148; `MemberDashboard.tsx` L54-56, 128-129, 185-186; `RegisterPage.tsx` L194; `VerifyEmailPage.tsx` L108; `VerificationArtwork.tsx` L48, 55 |
| `scripts/check-loyalty-copy.mjs` (new, in prebuild) | Fails on "hors articles en promo", "première commande livrée" or a hard-coded "10 %" in the components listed above |
| `scripts/measure-phone-verification.mjs` L100-110 | Keep "Vos 15 DT sont là"; drop the pending-state steps |

### F12. Tests (run in CI; locally only `php -l` works)

**Existing tests:**

| Test | Change |
|---|---|
| `ProtinasPricingCommerceTest`, `CheckoutOrderCreationCommerceTest` | Pin `loyalty.rules_version=2` in `setUp`. All current numbers stay, which proves the rollback path. |
| `ProtinasPricingCommerceTest::test_quote_ignores_client_shipping…` | `welcome.unlock` → `'phone_verification'` |
| `CustomerAuthFlowTest::test_default_phone_proof_reserves_welcome_points_until_delivery` | Pin the switch on and rename to `…_when_delivery_unlock_is_on` |
| `Unit/PointsServiceTest::test_legacy_redemption_helper…` | Delete together with `computeRedemption` |
| `WelcomeBonusCommerceTest` | Already pins the switch; unchanged |
| `ProtinaLedgerSecurityTest` | Unchanged, provided `record()` guards the new columns |

**New `ProtinasV3PricingTest`** (m=15, K=10, S=3):

| Scenario | Expected |
|---|---|
| 200 DT pack + 660 earned | Pack 6.000; 200 Protinas on delivery + 460 on products; total 171.000; earns 171; 0 left |
| 90 DT + 900 earned | Total 55.000; `frais_livraison` 0; `points_shipping_dt` 10.000; `remise` 35.000; earns 55 |
| 776 DT pack + 500 earned | Pack 54.320; total 696.680; earns 696 |
| Gloves, all earned | 800 used; total 0.000; `remise` 30.000; `requires_phone_confirmation` true |
| Gift room (gift balance 300) | 30 → 0; 59 → 58; 100 → 140; 130 → 200; 150 → 240; 180 → 300; 300 → 300; 200+pack → 226; 300+pack → 169; 350+pack → 107; 500+pack → 75 |
| Pack on promo lines | 200 DT all-promo → 6.000 (v2 pinned → 0) |
| Floor 13 % | 500 DT pack capped to 28.421, `capped=true`, gift 0 |
| Codes | New 10 % at 300 → 17.894 capped, total 282.106. `allow_over_budget` 10 % → 30.000, total 270.000. 5 % at 300 beats pack: 15.000, gift 55, total 282.250. 20 % at 200 → 17.894. |
| Free-delivery code | Refused at 129 DT; accepted at 130 DT; at 150 DT + gift → gift 40, total 148.000 |
| Machines | 5,200 DT treadmill + 200 DT whey + pack → pack 6.000 on the whey only; delivery 10 charged; earns on the whey cash only |
| Rounding | Due 40.030 → 801 Protinas, total 0.000 |
| Property test | P = 1…3,000 DT, step 1 × pack × codes (5/10/20 %, fixed 20/50, free delivery) × gift 0/300/10,000 × earned 0/∞ → net ≥ min(3.000, net without giveaways) at a real 15 % |
| `/loyalty/rules` v3 payload | `gift.full_from_dt` 180; no margin keys |

**New `ProtinasV3LifecycleTest`:**

| Scenario | Expected |
|---|---|
| Column identity | Holds on 6 baskets |
| Earn hold | Delivered → 175 pending, 0 spendable; at +14 days → 175 spendable |
| Cancel before dispatch | Everything refunded; gift keeps its expiry, or now + 7 days if past |
| Refusal after dispatch | 800 earned used → keep 400, refund 400. 300 gift + 300 earned → keep 300 earned + 100 gift, refund 200 gift. 100 earned → keep 100. |
| Waiver | Refunds `protinas_forfeited` exactly once |
| 2 refusals in 90 days | `gift_frozen_until` set; earned still spendable |
| Cancel → deliver | Re-debits; debt if already spent |
| Return after spending | Debt 175, `max_usable_points` 0; next earn of 200 → debt 0, balance 25 |
| Legacy order | Full refund and the old earn formula |
| Phone verification | Gift of 300, key `welcome:{uid}:unlock:0`, expires in 60 days |
| `protinas:expire`, `gift-reminders` | Idempotent when run twice |
| `unique_delivery_phone` | Off → gift applies; on → gift 0, earned unchanged |
| Review award | Goes to the gift bucket |
| `split-wallets` | Welcome 300 + earn 120 + redeem 100 → gift 200 / earned 120; legacy-only welcome → gift 300 with no expiry; drift reconciled; totals unchanged |

**Till:** `test_till_ticket_cancel_reverses`, `test_till_100_percent_after_flag`.

---

## G. Parameters the owner can tune later via env

| Parameter | Env | Default | Effect of changing it |
|---|---|---|---|
| Margin floor | `LOYALTY_MARGIN_FLOOR_PERCENT` | **15** | **Confirm it, or fill `products.prix_achat`, before launch.** At 20: full gift from 120 DT and 10 % codes are safe. At 13: the 7 % tier shrinks automatically, so set `PACK_TIERS=200:3,350:5,500:5` to avoid a visibly capped tier. |
| Courier cost per trip | `LOYALTY_COURIER_COST_DT` | 10 | Set it to the real Aramex rate; a lower rate gives more gift room. |
| Safety amount per order | `LOYALTY_SAFETY_DT` | 3 | Set ≈ refusal share × 20 DT once real `etat` counts are known. |
| Earn rate / scale | `PROTINAS_EARN_PER_DT` / `PROTINAS_PER_DT` | 1 / 20 | A higher earn rate shrinks the budget automatically. Run "double Protinas" campaigns as gift Protinas instead. |
| Earn hold | `PROTINAS_EARN_HOLD_DAYS` | 14 | 7 feels faster but adds debt risk; 0 relies on debt alone. |
| Gift validity | `PROTINAS_GIFT_VALID_DAYS` | 60 | 0 = never expires; 30 = more urgency. |
| SMS reminders | `PROTINAS_SMS_REMINDERS` | false | Turn on once WinSMS has credit. |
| Gift auto-apply | `PROTINAS_GIFT_AUTO_APPLY` | true | — |
| Refusal deposit | `PROTINAS_REFUSAL_FORFEIT_POINTS` | 400 | Below 400, a refused 0-cash order loses (400 − x) × 0.05 DT. |
| Repeat-refuser freeze | `PROTINAS_REFUSAL_FREEZE_AFTER` / `_WINDOW_DAYS` / `_FREEZE_DAYS` | 2 / 90 / 90 | — |
| Phone confirmation | `PROTINAS_CONFIRM_BELOW_CASH_DT` / `PROTINAS_CONFIRM_POINTS_SHARE` | 20 / 50 | Operations load against fraud risk. |
| Minimum cash at the door | `PROTINAS_MIN_CASH_DT` | 0 | Set to 1 if the first supervised Aramex shipment with nothing to collect is rejected. |
| Pack tiers | `PACK_TIERS` | 200:3,350:5,500:7 | `check-rules` prints the minimum margin each tier needs. Automatic pack on every cart is not built (opt-in stays). |
| Pack on promo lines | `PACK_EXCLUDE_PROMO_LINES` | false | — |
| Code guard | `COUPON_MARGIN_GUARD` (+ per-code "perte acceptée") | true | — |
| Machines out of the programme | `LOYALTY_EXCLUDED_SUBCATEGORIES` | materiel-de-musculation,cardio-fitness | Confirm these hold the 41 machines and no normal parcels. |
| Welcome amount / unlock | `WELCOME_BONUS_POINTS` / `WELCOME_BONUS_UNLOCK_ON_DELIVERY` | 300 / false | — |
| Welcome delivery-phone check | `WELCOME_BONUS_UNIQUE_DELIVERY_PHONE` | false | Turn on if the audit shows one delivery phone across several gift accounts. |
| Delivery | `DELIVERY_FEE_DT` / `FREE_DELIVERY_FROM_DT` | 10 / 300 | — |
| Till ceiling | `TILL_MAX_DISCOUNT_PERCENT` | 10 | Set 100 after `reverseTicket` is verified live. |
| Rules version | `LOYALTY_RULES_VERSION` / `PROTINAS_V3_SINCE` | 3 / launch timestamp | 2 = instant rollback. |

**Owner decisions outside env:**
- Top up WinSMS. No OTP means no welcome gift.
- Fill `prix_achat` for the 159 in-stock products.
- Pull the real refusal rate from `etat` counts.
- Review existing coupons.
- Commission: affiliates are paid on cash, so it drops on orders paid with Protinas. That is the default.
- Have a lawyer check the crossed-out prices under Loi 98-40. Savings shown to customers never count them.

---

Nothing in `C:/mls` was modified; I only read files at HEAD `4bbc6db8`. Code checked to confirm facts:
- `EditCommande.php` L138-200
- `commande-form.blade.php` L575-630
- `OrderToBlService.php` L85-145
- `Commande::wasDispatched` L431-457
- `CheckoutPricingService::price` L24-54
- `PointsService::record` L398-457
- `CommandeController` L360-445
- `config/loyalty.php`
- `config/welcome_bonus.php`
- `LoyaltyRulesController`

The 41 machines are exactly the Cardio Fitness (8) and Matériel de Musculation (33) subcategories. The engine model behind §C is `C:\Users\kouss\AppData\Local\Temp\claude\C--Users-kouss-OneDrive-Desktop-work-seo\b26fd762-b2a4-4b29-852f-055bd09e1960\scratchpad\final\engine.py`.