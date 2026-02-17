# QA: Quick Order from Product Cards + Product Detail

## Scope
- **Commander maintenant** opens the same Quick Order modal from listing pages (product cards) and from the product detail page.
- Cart/panier logic is unchanged.

## Checklist

### Listing pages (shop / category / search)
- [ ] **Mobile**: Each product card shows two buttons: "Commander maintenant" (primary, amber) and "Ajouter au panier". Tapping "Commander maintenant" opens the modal without navigating; product title remains a link to the product page.
- [ ] **Desktop**: Hover on card shows overlay with "Commander maintenant" and "Ajouter au panier". Click "Commander maintenant" opens the modal without navigating.
- [ ] **SEO**: Product title is still a link (`/shop/[slug]`). Quick order button does not replace the product page link.

### Product detail page
- [ ] **Desktop**: "Commander maintenant" and "Ajouter au panier" open the same modal / stay on page respectively. Modal opens with current page quantity and shows quantity stepper + variant if aromes.
- [ ] **Mobile**: Sticky bar "Commander maintenant" opens the same modal with current quantity.

### Quick Order modal (from card or detail)
- [ ] **Product summary** at top: image, name, price, discount badge, stock.
- [ ] **Quantité**: Stepper (+/-) inside modal; total updates live when quantity changes.
- [ ] **Délégation / Gouvernorat**: Required; dropdown with all options.
- [ ] **Variants**: If product has arômes, "Arôme / Variante" selector is shown and required.
- [ ] **Sticky footer**: Total + trust line + "Confirmer la commande". Total = unit price × quantity.
- [ ] **Autofocus**: Téléphone field gets focus when modal opens.
- [ ] **Validation**: Inline (phone, gouvernorat, address). Success: "Commande confirmée" + reference + WhatsApp CTA.
- [ ] **Mobile**: Bottom sheet, opaque white, scroll lock. **Desktop**: Centered modal, max-width 520px.

### Cart
- [ ] Adding to cart from cards or detail still works. Quick order does not clear or change cart state.
- [ ] Closing the modal does not affect cart.

### Edge cases
- [ ] Out of stock: "Commander maintenant" disabled on card; in modal, quantity stepper disabled when out of stock.
- [ ] Product with no variants: no variant selector in modal.
- [ ] Product with variants: variant selector shown; first variant pre-selected when opened from card.
