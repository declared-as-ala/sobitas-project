# QA: Commande rapide (Quick order)

## Regression: Cart / Panier (must remain 100% unchanged)

- [ ] **Ajouter au panier** still adds the product to the cart with the selected quantity.
- [ ] Cart drawer/page still shows items; quick order does **not** add items to the cart.
- [ ] Checkout from cart (full flow) still works; quick order does **not** clear or modify the cart.
- [ ] Quantity selector and stock limits still apply for "Ajouter au panier".
- [ ] Quick order works even when the cart already has items (separate pipeline).

## Quick order flow

- [ ] **"Commander vite"** (and "Vite" on mobile sticky bar) opens the quick-order drawer/modal.
- [ ] Form order: **Téléphone** (required, autofocus), Nom & Prénom (optional), Ville/Gouvernorat (required), Adresse (required), Note (optional). Honeypot not visible.
- [ ] Validation: phone (8 digits), city, address required; short inline errors (e.g. "8 chiffres", "Gouvernorat requis").
- [ ] Total shown clearly (price × qty); trust line: "Paiement à la livraison · Livraison 24–72h · Produits authentiques".
- [ ] Submit: "Confirmer la commande" shows loading then success screen with **Référence** and "Commande confirmée".
- [ ] Success: **WhatsApp CTA** "Confirmer sur WhatsApp" with pre-filled message (ref, product, qty, phone, city, address).
- [ ] Errors (e.g. backend down) show toast and inline message; form data kept.
- [ ] Analytics: `quick_order_open`, `quick_order_submit`, `quick_order_success`, `quick_order_fail` (if gtag present).

## API

- [ ] `POST /api/quick-order` accepts: productId, qty, phone, city, address; customerName optional; note, variantId optional.
- [ ] Returns 429 after 5 requests per minute per IP (rate limit).
- [ ] Honeypot field `website` (filled) returns success without creating order.
- [ ] Response: `{ orderId, status, numero }` for success.

## UI

- [ ] Primary CTA red; "Commander vite" visible next to "Ajouter au panier" on product detail (desktop and mobile).
- [ ] Drawer: mobile-first, clean; big inputs, single screen, no multi-step.
