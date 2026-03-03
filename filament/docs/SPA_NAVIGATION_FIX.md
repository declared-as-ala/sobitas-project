# Filament SPA Navigation Fix – Root Cause & Deliverables

## 1. Navigation mode

- **Filament** is using **SPA mode** (`->spa()` in `AdminPanelProvider`). This uses Livewire’s SPA behaviour: links are followed via AJAX, and the page body (and optionally head) is replaced without a full reload.
- **Affected areas:** All admin pages that use Filament (Commandes, Factures, Clients, Devis, etc.). Any action (buttons, table row actions, modals, dropdowns) can become unresponsive after navigating from another page without a full refresh.

## 2. Root cause

- **Leftover overlays:** After SPA navigation, modal backdrops/overlays from the previous page can remain in the DOM. They sit on top of the new content (fixed, full-screen, high z-index) and intercept clicks, so buttons “don’t respond”.
- **No re-init on navigate:** Custom JS that runs only on initial load (e.g. `DOMContentLoaded`) is not run again after Livewire replaces the content. Anything that depends on the old DOM (e.g. third-party libs, or code that binds to elements that no longer exist) can break.
- **Filament/Livewire:** Alpine and Livewire re-bind when new HTML is injected, but orphaned nodes (e.g. old modal wrappers) are not automatically removed by the SPA swap.

So the main fix is: **on every SPA navigation, run a small global script that removes leftover backdrops/overlays and (optionally) re-runs custom init.**

## 3. Global fix (single shared place)

- **File:** `resources/views/filament/components/spa-navigation-fix.blade.php`
- **Included from:** `App\Providers\Filament\AdminPanelProvider` → `panels::body.end` (with NProgress).
- **Behaviour:**
  - Listens for `livewire:navigated` and runs `reinitAfterNavigate()`.
  - Listens for `livewire:initialized` (and fallback `DOMContentLoaded`) so the same logic runs on first load.
  - `reinitAfterNavigate()`:
    - **Remove orphaned overlays:** Removes elements whose class contains `backdrop`, `modal-backdrop`, or `overlay` and that are fixed and full-screen, so they no longer block clicks.
    - **Optional custom re-init:** If `window.filamentReinit` is defined, calls it so you can plug in extra JS that must run after each navigation.
  - **Debug:** Set `window.FILAMENT_SPA_DEBUG = true` in the console; then on each navigation you’ll see `[Filament SPA]` logs (e.g. `livewire:navigated`, “Removed N orphaned overlay(s)”).

No per-page hacks: one script in the panel body, one view, one hook.

## 4. Custom JS that needed re-init

- **Current custom JS in the panel:**
  - **NProgress** (loaded in `panels::body.end`): Used for loading bar; Livewire’s `wire:navigate` handles progress, so no re-init needed.
  - **Global search** (`global-search-wrapper` + Livewire component): Alpine/Livewire; re-bound when the topbar is part of the new page. No change.
  - **custom-admin-styles.blade.php:** CSS only; no JS re-init.
- **Moved/added:** Only the new **spa-navigation-fix** script was added. It runs on initial load and on every `livewire:navigated`. If you add custom JS that must run after each navigation, implement it in a function and assign it to `window.filamentReinit`; that function will be called from `reinitAfterNavigate()`.

## 5. Overlays / modals

- After navigation, the script removes leftover full-screen fixed elements that look like backdrops (class contains `backdrop`, `modal-backdrop`, or `overlay`). That prevents invisible overlays from blocking clicks. Filament’s in-page modals are not targeted; only orphaned backdrop-like divs are removed.

## 6. Regression protection (debug mode)

- In the browser console: `window.FILAMENT_SPA_DEBUG = true`
- Then navigate between admin pages (e.g. Commandes → Clients → Devis). You should see:
  - `[Filament SPA] livewire:navigated` after each navigation.
  - `[Filament SPA] Removed N orphaned overlay(s)` when such overlays were found and removed.
- Use this to confirm the script runs after each navigation and that overlay cleanup happens when applicable.

## 7. QA checklist

- [ ] Navigate via sidebar to 5+ different pages (e.g. Dashboard, Commandes, List commandes, Edit one, Factures, Clients, Devis) **without** full refresh. On each page, try at least one main action (e.g. “Créer”, “Créer BL”/Convertir, Edit, filters).
- [ ] **Commandes list:** Pagination, filters, table row actions (Edit, Convertir dropdown, SMS, Delete) work after having navigated from another page.
- [ ] **Modals:** Open a modal (e.g. confirmation), close it, then navigate away and back (or to another page). Buttons and modals still work; no stuck backdrop.
- [ ] **Dropdowns:** Action dropdowns (e.g. Convertir, “Autres actions”) open and close correctly after navigation.
- [ ] **Console:** No JS errors in the browser console after navigation.
- [ ] **Overlays:** No invisible layer blocking clicks (if you previously had that, it should be gone after applying the fix).

## 8. Commandes UX change (“Créer BL” → Convertir icon + dropdown)

- **Where:** `App\Filament\Resources\CommandeResource` → table `actions`.
- **Change:** The previous “Créer BL” text button was replaced by an **icon-only** dropdown:
  - **Trigger:** Icon only (e.g. `heroicon-o-arrow-path`), tooltip **“Convertir”** on hover.
  - **Dropdown:** One option: **“Convertir en Bon de livraison”** (same behaviour as before: confirmation modal → create BL → notification + redirect).
- **Visibility:** Unchanged: only visible when the commande has no linked facture (`! $record->factures()->exists()`).
