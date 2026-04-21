# 🎯 Current Mission (Filament vs Backend Alignment)

Goal: Make Filament behave EXACTLY like backend (Voyager) in design, workflow, print templates, navigation.

---

# ✅ Completed

## Docker: Livewire ComponentNotFoundException (top-regions-widget)
- Root cause: `composer dump-autoload` never ran after new widget files were added to the image
- Fix: `docker-entrypoint.sh` now runs `composer dump-autoload --optimize` + `php artisan optimize:clear` before building caches on every container start
- New classes are always discovered on restart

## Print Pages — Retour button
- Fixed `layout-backend.blade.php`: smart `printGoBack()` JS function
- Every print route (`factures.print`, `facture-tvas.print`, `tickets.print`, `quotations.print`, `product-price-lists.print`) now passes `$backUrl` → correct resource edit page
- Fallback chain: backUrl → window.close() (if opener) → history.back() → /admin

## Fatal Error — `$view` static redeclaration
- Fixed `TopRegionsWidget` + `StatsOverview`: `protected static string $view` → `protected string $view`
- Scanned ALL widgets in app/Filament/Widgets/ — no other occurrences

## BL frais_livraison
- Form blade: `bl_frais_livraison` now a visible editable input row (was hidden)
- `blCalculate()` JS now adds frais to net total
- Print blade: "Frais de livraison" row added to tfoot, fallback total corrected, inWords() uses correct total

---

# 🔥 Remaining — High Priority

## 1. Facture TVA Issues — NEXT
- Creating facture TVA → redirects to login ❌
- Opening facture TVA detail → empty page ❌

Investigation so far:
- PHP logic in CreateFactureTva / EditFactureTva looks correct
- Form uses custom ViewField → `create-facture-tva.blade.php`
- Blade init: `$getLivewire()->getRecord()` check at line 7 — may throw on create (no record yet)
- `wire.call('save')` → Filament's CreateRecord → redirect may hit auth issue

Fix needed:
- Check if `$getLivewire()->getRecord()` is safe on create page (no record)
- Check if redirect after save goes to a valid authenticated route
- Verify `facture-tvas.print` route is accessible post-save

---

## 2. Select Inputs Bug
- Client & product Select2 inputs do NOT work after Livewire SPA navigation
- Only work after hard refresh ❌

Fix:
- `spa-navigation-fix.blade.php` calls `window.ftvaFormReinit()` and `window.blFormReinit()` on `livewire:navigated`
- Verify these reinit functions exist and properly re-initialize Select2 after navigation
- Confirm jQuery and Select2 are loaded before reinit fires

---

## 3. Commande → BL Conversion
- Add "Convertir en Bon de livraison" button on commande edit/detail page
- After conversion: redirect to BL print page
- Fix duplicated column alignment in BL list page

---

## 4. Stock Module Refactor
Remove: Tableau de bord stock, Produits & niveaux, Alertes, Rapports
Replace with ONE "Gestion de stock" page:
- Global stats (total, rupture, low stock)
- Product table with filters
- Alerts section
- Export (CSV / Excel)
- Inline stock edit

---

## 5. SMS & Email Pages
- Fix "Préparation..." loading hang
- Add "Sélectionner tous" checkbox to both tables

---

# ⚙️ Rules

- Backend (Voyager) = SOURCE OF TRUTH
- No hacks → fix root causes
- Keep performance optimized
- Do NOT break existing features
