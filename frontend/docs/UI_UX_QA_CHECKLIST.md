# UI/UX updates – QA checklist

## 1) Variant / Arôme position (Product Detail)
- [ ] **Mobile:** Order is: Category line (link + code) → Arômes disponibles → Stock/Promo badges → Quantity.
- [ ] **Desktop (center column):** Arômes are directly under the category line (brand • category • code), above rating and key points.
- [ ] **Desktop (buy box):** Quantity remains in the right column; no change to logic.

## 2) Similar products – mobile carousel
- [ ] **Mobile:** “Produits similaires” is a horizontal scroll carousel with snap (scroll-snap).
- [ ] **Desktop:** Grid 4 columns unchanged.
- [ ] Each card shows: image, title (clamp), price, add/Commander buttons (compact variant).

## 3) Breadcrumb at top (Product Detail)
- [ ] Breadcrumb appears at the top of the product page: Accueil › Boutique › [Category] › [Subcategory] › Product name.
- [ ] All segments except the last are links (category pages).
- [ ] Last segment is current page (no link), `aria-current="page"`.
- [ ] BreadcrumbList JSON-LD is still output by the server (SEO unchanged).

## 4) Price filter – orange accent (Shop)
- [ ] In Shop filters, the **Prix** slider uses orange accent: track fill and thumb border/ring (e.g. orange-500 #F97316).
- [ ] Same orange accent in both mobile filter sheet and desktop filter panel.

## 5) Favorites (Favoris)
- [ ] **Navbar:** Heart icon next to cart, with badge count when count > 0 (mobile and desktop).
- [ ] **Page /favoris:** Lists favorited products in a responsive grid (2 cols mobile, 4 desktop). Empty state with link to shop.
- [ ] **Product cards:** Heart icon (top-right) toggles add/remove from favorites; state is instant and does not affect cart.
- [ ] **Product detail page:** Favoris button uses the same favorites context (toggle adds/removes; state persists).
- [ ] Favorites persist in `localStorage` (key: `sobitas_favoris`). Clearing storage clears favorites.
- [ ] Cart/panier logic unchanged (add to cart, quantity, quick order unaffected).

## 6) Vente Flash card background (Home)
- [ ] “Vente Flash” product cards use **white** background (not gray).
- [ ] Shadows and borders remain subtle (e.g. shadow-md, border not too heavy).

## 7) Navbar label – Marques → Brands
- [ ] Menu item for the brands page shows exact text **“Brands”** (not “MARQUES”).
- [ ] Route `/brands` and behavior unchanged.

---

## Responsive verification
- [ ] **360 / 390 / 414 px:** Product detail (breadcrumb, arômes order, quantity, sticky bar); Shop filters (mobile sheet, price slider orange); Favoris page grid; Navbar heart + cart.
- [ ] **768 px:** Product detail (layout); Similar products (carousel vs grid breakpoint); Favoris grid.
- [ ] **1024 / 1280 px:** Product detail (3 columns, buy box sticky); Shop (desktop filters, price slider orange); Favoris (4-col grid); Navbar (Brands, heart, cart).

## Regression
- [ ] Cart: add to cart, quantity, drawer, checkout flow unchanged.
- [ ] Quick order modal and “Commander maintenant” unchanged.
- [ ] Product detail: variations/arômes selection logic unchanged (only layout order and breadcrumb added).
