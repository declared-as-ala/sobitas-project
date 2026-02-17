# QA: Commande rapide (Quick order)

## Regression: Cart / Panier

- [ ] **Ajouter au panier** still adds the product to the cart with the selected quantity.
- [ ] Cart drawer/page still shows items; quick order does **not** add items to the cart.
- [ ] Checkout from cart (full flow) still works; quick order does **not** clear the cart.
- [ ] Quantity selector and stock limits still apply for "Ajouter au panier".

## Quick order flow

- [ ] "Commander vite" opens the drawer (and "Vite" on mobile sticky bar).
- [ ] Form: Nom & Prénom, Téléphone, Ville/Gouvernorat, Adresse, Note (optional). Honeypot not visible.
- [ ] Validation: required fields and phone format (8 digits) show inline errors.
- [ ] Submit shows loading then success screen with reference number.
- [ ] Errors (e.g. backend down) show toast and keep form data.
- [ ] Analytics: `quick_order_open`, `quick_order_submit`, `quick_order_success` (if gtag present).

## API

- [ ] `POST /api/quick-order` returns 429 after 5 requests per minute per IP.
- [ ] Honeypot field (e.g. `website` filled) returns success without creating order.
