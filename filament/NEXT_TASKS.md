# 🎯 Current Mission (Filament vs Backend Alignment)

Goal:
Make Filament dashboard behave EXACTLY like backend (Voyager) in:
- design
- workflow
- print templates
- navigation

---

# ✅ Completed

## Print Pages — Retour button
- Fixed in `layout-backend.blade.php`: smart JS `printGoBack()` function
- Each route now passes `$backUrl` pointing to the correct edit page
- Fallback chain: backUrl → window.close() (if opener) → history.back() → /admin

## Fatal Error — `$view` static redeclaration
- Fixed `TopRegionsWidget`: `protected static string $view` → `protected string $view`
- Fixed `StatsOverview`: same fix (previous session)
- Scanned ALL widgets — no other occurrences

## BL frais_livraison
- Form blade: `bl_frais_livraison` now visible editable input (was hidden)
- `blCalculate()` JS now adds frais to net
- Print blade: "Frais de livraison" row added, fallback total corrected

---

# 🔥 High Priority Fixes (remaining)

## 1. Facture TVA Issues — NEXT
- When creating facture TVA → redirects to login ❌
- When opening facture TVA detail → empty page ❌

Fix:
- Investigate FactureTvaResource Create/Edit pages
- Check auth middleware, route binding, Livewire state
- Check if `facture_tvas` table has needed columns

---

## 2. Select Inputs Bug
Problem:
- client & product select (Select2) do NOT work after Livewire navigation
- only work after hard refresh ❌

Fix:
- Re-initialize Select2 on `livewire:navigated` event
- Ensure Select2 JS is loaded after Livewire SPA navigation

---

## 3. Commande → BL Conversion
- Add button "Convertir en Bon de livraison" in commande detail/edit page
- After conversion: redirect directly to BL print page
- Fix duplicated alignment in BL list page

---

## 4. Stock Module Refactor
Remove:
- Tableau de bord stock
- Produits & niveaux
- Alertes
- Rapports

Replace with ONE page "Gestion de stock" containing:
- Global stats (stock total, rupture, low stock)
- Table of products with filters
- Alerts (rupture / low stock)
- Export (excel / csv)
- Full control (edit stock, status)

---

## 5. SMS & Email Pages
- Fix loading "Préparation..." issue
- Add "Sélectionner tous" checkbox in both email and SMS tables

---

# ⚙️ Rules

- Backend (Voyager) = SOURCE OF TRUTH
- Filament must match backend behavior 100%
- No hacks → fix root causes
- Keep performance optimized
- Do NOT break existing features
