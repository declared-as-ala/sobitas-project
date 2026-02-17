# QA: Product detail mobile layout

Quick checklist for the mobile-first product page redesign. Test at breakpoints: **360px**, **390px**, **414px**, **768px** (and optionally 320px).

---

## Breakpoints to test

| Width | Device examples |
|-------|------------------|
| 360  | Small phones (e.g. Galaxy S8) |
| 390  | iPhone 14 Pro, many Androids |
| 414  | iPhone Plus / Pro Max |
| 768  | Tablet portrait / md breakpoint |

---

## 1) Sticky top bar (mobile only, &lt; 1024px)

- [ ] Bar is sticky at top: Back (left) | SOBITAS (center) | Cart (right).
- [ ] Back opens previous page.
- [ ] Center links to home (/).
- [ ] Cart opens cart drawer; badge shows item count when &gt; 0.
- [ ] No layout shift or overflow at 360, 390, 414.
- [ ] Bar has solid background (white/dark), border-bottom visible.

## 2) Product gallery

- [ ] Full-width image, aspect ratio 1:1 reserved (no CLS).
- [ ] Image loads with correct `sizes`; no horizontal overflow.
- [ ] Placeholder/error state shows correctly.

## 3) Info hierarchy (title, rating, price, stock)

- [ ] Title: max 2 lines (`line-clamp-2`), readable font size (18–22px range).
- [ ] Rating: stars + “(N avis)”;
- [ ] Tapping rating scrolls to `#reviews`.
- [ ] Price: main price prominent; old price + discount badge when promo.
- [ ] Stock: small text/badge (“En stock” / “Rupture”), not dominating layout.

## 4) Sticky bottom buy bar (mobile only)

- [ ] Visible at bottom with Total (left), “Ajouter” (primary), “Rapide” / Commande rapide (secondary).
- [ ] Total updates when quantity (or variant) changes.
- [ ] “Ajouter” adds to cart; “Rapide” opens quick-order drawer.
- [ ] Safe-area: bottom padding uses `env(safe-area-inset-bottom)` (e.g. notches/home indicator).
- [ ] Buttons min height 44–48px; no double CTAs in page body (only this bar for main actions).

## 5) Variants + quantity

- [ ] Arômes/variants: compact pills or controls; no huge vertical blocks.
- [ ] Quantity: stepper (- / number / +) compact; easy to tap (44px min).
- [ ] Total line updates with quantity.

## 6) Trust row

- [ ] One compact row: Paiement à la livraison · 24–72h · Authentiques (or similar).
- [ ] Small icons + one-line text; no big cards on mobile.

## 7) Accordions (mobile)

- [ ] Description: collapsed by default; “Lire plus” expands.
- [ ] Valeurs nutritionnelles: in accordion.
- [ ] Questions / FAQ: in accordion.
- [ ] Livraison & paiement: in accordion.
- [ ] No tabs on mobile; accordions only.

## 8) Reviews

- [ ] Compact summary: average rating + distribution + “Voir tous les avis” + “Écrire un avis” (if logged in).
- [ ] Only 2–3 review previews; then “Voir tous les avis” link.
- [ ] Spacing and typography readable at 360–414px.

## 9) Similar products

- [ ] Horizontal scroll carousel (snap); ~1.2 cards visible (e.g. 78% width).
- [ ] Cards compact: image + title (clamp) + price + add button.
- [ ] No full-width grid on mobile; grid only from md up.

## 10) Footer (mobile)

- [ ] Sections in accordions: Suivez-nous, Abonnez-vous, Contact, Services & Ventes, Navigation.
- [ ] “Retour en haut” (or “Haut”) visible and scrolls to top.
- [ ] Logo + Retour en haut in header strip of footer.

## 11) Retour en haut button (global)

- [ ] Fixed position above sticky buy bar on mobile (e.g. bottom ~5rem).
- [ ] Does not overlap buy bar; safe-area respected.
- [ ] On desktop, position unchanged (e.g. bottom-8 right-8).

## 12) General

- [ ] No horizontal overflow at 360, 390, 414, 768.
- [ ] Consistent spacing (e.g. 12/16/20px); buttons 44–48px min.
- [ ] Text: title 18–22px, body 14–16px; no tiny unreadable text.
- [ ] Line-clamp used for long product names/categories where needed.
- [ ] Desktop (lg): layout unchanged (2-col, tabs, grid similar products, no sticky top bar, no single sticky buy bar).

---

## Quick test URLs

- Product page (replace slug): `/shop/[slug]` or `/products/[id]`
- Test with: in-stock product, out-of-stock product, product with promo, product with many arômes.
