# How totals are computed with coupon + TVA

## Accounting rule (Tunisia VAT practice)

- **Discount is applied to the HT (excl. tax) base first.**
- **TVA is then computed on the net HT** (after discount).
- **Timbre** (stamp duty), if used, is added after TVA.
- **Livraison** (shipping) is added last; it can be zeroed by a "free_shipping" coupon.

## Formula

1. **Sous-total HT** = sum of line items (quantity × unit price HT).
2. **Remise (code promo)** = computed from the coupon:
   - **Percent**: `remise_ht = sous_total_ht × (value / 100)`, capped by `max_discount_amount` if set.
   - **Fixed**: `remise_ht = min(value, sous_total_ht)`.
   - **Free shipping**: no HT discount; shipping is set to 0.
3. **Net HT** = Sous-total HT − Remise HT.
4. **TVA** = Net HT × (taux TVA / 100). The TVA rate comes from `Coordinate::getCached()->tva` (e.g. 19%).
5. **Timbre** = from `Coordinate::getCached()->timbre` (e.g. 0.5 DT).
6. **Total TTC** = Net HT + TVA + Timbre + Frais de livraison.

## Where it is applied

- **Storefront (Next.js)**  
  The apply-coupon API returns `totals` (subtotal_ht, discount_ht, net_ht, tva, timbre, frais_livraison, total_ttc) using the same logic so the cart/checkout summary matches the backend.

- **Order creation (Laravel)**  
  When placing an order with a valid `coupon_code`, the backend:
  - Re-validates the coupon (never trusts the frontend).
  - Computes discount via `CouponService::computeDiscount()`.
  - Saves on the order: `coupon_id`, `coupon_code_snapshot`, `coupon_type_snapshot`, `coupon_value_snapshot`, `discount_ht`, `discount_ttc`.
  - Sets `prix_ht` = sous-total HT (items), then `prix_ttc` = net HT − discount_ht + frais_livraison (current commande flow does not add TVA/timbre on the order record; discount is applied to HT and reflected in prix_ttc).

- **Print / documents**  
  Facture and Ticket print views show "Code promo: XXX" and "Remise (code promo): -Y DT" when the linked Commande has a coupon snapshot. Totals on the document are those stored on the order/facture.

## Consistency

- Coupon snapshot (code, type, value) is stored on the order so that history remains correct even if the coupon is later edited or deleted.
- Redemptions are recorded in `coupon_redemptions` (coupon_id, order_id, client_id, phone/email snapshot, discount_amount_ht, discount_amount_ttc) for analytics and usage limits.
