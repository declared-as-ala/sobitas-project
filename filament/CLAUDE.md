# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Laravel 12 + Filament v4 admin panel for the **Sobitas** marketplace (protein supplements, Tunisia).
- UI language: **French** (all labels, navigation groups, field names, notifications)
- Currency: **TND** (Tunisian Dinar), always 3 decimal places (`number_format($n, 3, '.', ' ')`)
- Stack: Laravel 12, Filament v4, Livewire 3, Alpine.js, Tailwind CSS, Vite

---

## Commands

```bash
# First-time setup
composer install && npm install
composer run setup   # copies .env, generates key, migrates, seeds, links storage

# Development
php artisan serve
npm run dev          # Vite + Tailwind

# Build
npm run build

# Code quality
composer run cs      # Pint (code style fixer — run before committing)
composer run test    # PHPStan static analysis
php artisan test     # PHPUnit
```

---

## Directory Structure

```
app/
  Enums/               # BlStatus, InvoiceStatus, etc.
  Filament/
    Pages/             # Dashboard, Stock, HistoriqueClient, MediaPage, SendEmail, SendSms, TicketPosPage, LowStockProducts
    Resources/         # One *Resource.php per model + Pages/ subfolder (List*, Create*, Edit*)
    Support/           # DashboardHeaderActions trait
    Widgets/           # All dashboard widgets
  Http/Controllers/    # DocumentPdfController (BL, FactureTva, Devis, Ticket PDF)
  Models/              # All Eloquent models
  Services/
    InvoiceCalculator.php          # Single source of truth for all totals
    RevenueService.php             # Revenue aggregations for dashboard
    DateRangeFilterService.php     # Period filter helper
    NumberSequenceService.php      # Auto-numbering for BL, Facture, etc.
    DocumentConversion/
      OrderToBlService.php         # Commande → BL (Facture)
      OrderToTicketBlService.php   # Commande → Ticket BL
      BlToInvoiceService.php       # BL → FactureTva
resources/
  views/
    filament/
      pages/
        create-facture-bl.blade.php   # Custom BL create/edit form (JS-heavy, Select2, barcode)
      widgets/                         # Custom blade views for each custom widget
    print/
      bon-de-livraison.blade.php    # BL print/PDF template
      facture-tva.blade.php         # Facture TVA print/PDF template
      devis.blade.php               # Devis print/PDF template
      ticket.blade.php              # Ticket print/PDF template
      layout-backend.blade.php      # Shared print layout
routes/
  web.php                           # Includes factures.print, facture-tva.print, etc.
```

---

## Architecture

### Filament panel structure
All admin UI lives under `app/Filament/`:

- **`Resources/`** — one `*Resource.php` per model + a `Pages/` subfolder with `List*`, `Create*`, `Edit*` classes. The Resource file defines the form schema (`Schema`), table columns, filters, and actions.
- **`Pages/`** — custom full-page views: `Dashboard`, `Stock`, `HistoriqueClient`, `MediaPage`, `SendEmail`, `SendSms`, `TicketPosPage`, `LowStockProducts`.
- **`Widgets/`** — dashboard widgets (charts, KPI cards, tables). All widgets listen to the `dashboardFilterUpdated` Livewire event to react to the global period filter.
- **`Support/`** — shared traits/services. `DashboardHeaderActions` trait drives the period-filter preset, refresh, and CSV export on the dashboard.

### Filament v4 API — important differences from v3
- Forms use `Filament\Schemas\Schema` (NOT the older `Filament\Forms\Form`)
- Grid/Section use `Filament\Schemas\Components\Grid` and `Filament\Schemas\Components\Section`
- `$view` on widgets must be `protected string $view` (non-static) — parent declares it non-static

### Resource conventions
- Model field names use French slugs: `designation_fr`, `publier`, `rupture`, etc.
- Navigation groups: `Catalogue`, `Ventes`, `Clients`, `Marketing`, `SEO`, `Administration`, `Facturation & Tickets`
- Slug fields auto-generated from `designation_fr` via `->live(onBlur: true)` + `afterStateUpdated`
- Stock/rupture logic: `qte <= 0` automatically sets `rupture = 1`, and vice versa — keep bidirectional sync

---

## Key Models & Tables

| Model | Table | Notes |
|---|---|---|
| `Product` | `products` | `designation_fr`, `publier`, `rupture`, `qte`, `code_product`. Many-to-many: `tags`, `aromes` |
| `Commande` | `commandes` | Orders. Fields: `etat`, `prix_ht`, `prix_ttc`, `remise`, `frais_livraison`, `region`, `ville`, `client_id` |
| `Client` | `clients` | `name`, `email`, `phone_1`, `phone_2`, `adresse`, `region`, `ville`, `code_postale` |
| `Facture` | `factures` | **Bon de Livraison (BL)**. Fields: `numero`, `client_id`, `commande_id`, `status` (BlStatus), `prix_ht`, `remise`, `pourcentage_remise`, `prix_ht_apres_remise`, `frais_livraison`, `tva`, `timbre`, `prix_ttc`, `net_a_payer`, plus `livraison_*` shipping fields |
| `DetailsFacture` | `details_factures` | BL line items: `facture_id`, `produit_id`, `qte`, `prix_unitaire`, `prix_ttc` |
| `FactureTva` | `facture_tvas` | TVA invoices. Has `facture_id` FK to BL |
| `Ticket` | `tickets` | POS tickets + `type=bon_livraison` for ticket-style BLs |
| `DetailsTicket` | `details_tickets` | Ticket line items |
| `Quotation` | `quotations` | Devis/quotes |
| `Article` | `articles` | Blog articles |
| `Annonce` | `annonces` | Announcements |
| `SeoPage` | `seo_pages` | SEO pages |
| `Coordinate` | `coordinates` | Company info (name, address, phone, TVA rate, RC, MF, logo) — use `Coordinate::getCached()` |
| `ProductPriceList` | `product_price_lists` | Client-specific price lists |

---

## Bon de Livraison (BL) — Complete Flow

**The BL system uses the `Facture` model.**

### Create/Edit Form
- `FactureResource.php` — defines form schema (all Hidden fields + one custom ViewField)
- `resources/views/filament/pages/create-facture-bl.blade.php` — the full interactive UI (Select2 client/product, barcode scanner, JS totals)
- `CreateFacture.php` / `EditFacture.php` — Livewire page classes with `recalculateTotals()`, `addProductByBarcode()`, `mutateFormDataBeforeCreate/Fill`, `afterCreate/Save`

### Totals calculation — ALWAYS use InvoiceCalculator
```php
$calc = \App\Services\InvoiceCalculator::calculate(
    $details,           // array of ['produit_id', 'qte', 'prix_unitaire', 'tva_pct']
    $remise,            // float
    $timbre,            // float (0 for BL)
    $defaultTva,        // 0 for BL (HT only), 19 for FactureTva
    $fraisLivraison,    // float — MUST be included for BL
    $ignoreTva          // true for BL
);
// Returns: total_ht_brut, remise, pourcentage_remise, prix_ht_apres_remise,
//          tva, timbre, frais_livraison, prix_ttc, net_a_payer
```
`net_a_payer = prix_ttc + timbre + frais_livraison`

### Print/PDF
- Route: `factures.print` → `routes/web.php` → renders `print/bon-de-livraison.blade.php`
- PDF download: `DocumentPdfController::downloadFacture()` → same blade via DomPDF
- Controller passes: `calc_total_ht`, `calc_remise`, `calc_frais`, `calc_net_a_payer`, `calc_pourcentage_remise`
- Print blade reads: `$calc_frais ?? $facture->frais_livraison ?? 0` for frais_livraison

### BL Status (BlStatus enum)
- `draft` → Brouillon
- `issued` → Émis
- `delivered` → Livré

### Conversion services
- `OrderToBlService` — Commande → Facture (BL), maps livraison fields, includes frais_livraison
- `BlToInvoiceService` — Facture → FactureTva (drops frais_livraison, applies TVA)

---

## Dashboard

### Widgets (in sort order)
| Widget | Sort | Span | Description |
|---|---|---|---|
| `QuickActionsWidget` | -200 | full | Action buttons (create ticket, client, product…) |
| `ClientHistoriqueSearchWidget` | -150 | full | Client search with order history |
| `DashboardHeaderWidget` | -100 | full | Period filter presets + refresh |
| `StatsOverview` | 4 | 2/3 cols | 4 KPI cards (CA HT, Produits, Clients, Commandes) |
| `RevenueBySourcePieChart` | 5 | 1/3 col | Doughnut: Tickets / BLs / Factures TVA |
| `RevenueChart` | 6 | full | Bar chart: daily revenue evolution |
| `TopProductsWidget` | 8 | full | Top 10 products table |
| `TopRegionsWidget` | 9 | full | Top Régions + Top Clients side by side |

### Dashboard column layout: `['default'=>1, 'sm'=>1, 'md'=>3, 'xl'=>3]`

### Period filter
- Global session key: `dashboard.filter.preset` (values: `7d`, `30d`, `90d`, `365d`, `custom`)
- All widgets call `DateRangeFilterService::getPeriod($preset, $customStart, $customEnd)`
- Listen to `dashboardFilterUpdated` Livewire event via `#[On('dashboardFilterUpdated')]`
- Do NOT use `$refresh` dispatch — it re-mounts widgets and loses filter state

### StatsOverview custom view
- View: `resources/views/filament/widgets/stats-overview.blade.php`
- Custom 4-card grid with sparklines, color-coded accent bars, hover effects
- Override: `protected string $view = 'filament.widgets.stats-overview';` (non-static!)

### RevenueBySourcePieChart
- Type: `doughnut` (62% cutout)
- Colors: indigo (Tickets), amber (BLs), emerald (Factures TVA)
- `maxHeight: 380px`

---

## Print System

All print templates extend `print/layout-backend.blade.php`.

| Route name | Controller method | Template |
|---|---|---|
| `factures.print` | (web.php direct) | `print/bon-de-livraison.blade.php` |
| `factures.pdf` | `downloadFacture` | `print/bon-de-livraison.blade.php` |
| `facture-tva.print` / `.pdf` | `downloadFactureTva` | `print/facture-tva.blade.php` |
| `quotations.print` / `.pdf` | `downloadQuotation` | `print/devis.blade.php` |
| `tickets.print` / `.pdf` | `downloadTicket` | `print/ticket.blade.php` |

**PDF library:** `barryvdh/laravel-dompdf` — `\Barryvdh\DomPDF\Facade\Pdf::loadView(...)`

---

## Revenue Service

`RevenueService` provides:
- `revenueHt($start, $end)` — total HT from tickets + BLs + factureTvas
- `revenueTtc($start, $end)` — total TTC
- `dailyRevenueHt($start, $days)` — array of daily HT values (for sparklines)
- `revenueSourcesHt($start, $end)` — `['tickets'=>x, 'bls'=>y, 'facture_tvas'=>z]`

---

## Performance Notes

- `FilamentServiceProvider` defers Livewire hydration via `requestIdleCallback` — do not remove
- Dashboard widgets use `Cache::remember($key, $seconds, fn)` — typical TTL 120–180s
- Cache keys pattern: `dashboard:{widget_name}:{startYmd}_{endYmd}`
- `Coordinate::getCached()` uses its own cache — prefer over `Coordinate::first()`

---

## Media

Files stored on `public` disk under `storage2/app/public/` (symlinked).
Use `->disk('public')` on all `FileUpload` components.

---

## Number Formatting

```php
// Currency (3 decimals, space thousands separator)
number_format($amount, 3, '.', ' ') . ' DT'

// In blade print templates — $fmt closure defined at top:
$fmt = fn($n) => number_format((float)$n, 3, '.', ' ');
```

---

## Known Patterns & Gotchas

1. **BL frais_livraison** — must be included in `InvoiceCalculator::calculate()` call AND displayed in the print tfoot. The form blade (`create-facture-bl.blade.php`) has a visible `bl_frais_livraison` input; `blCalculate()` JS adds it to net. Print blade uses `$calc_frais ?? $facture->frais_livraison ?? 0`.

2. **Filament v4 `$view` override** — must be `protected string $view` (non-static). Parent `StatsOverviewWidget` declares it non-static, so `protected static string $view` causes a fatal error.

3. **Widget refresh** — use `#[On('dashboardFilterUpdated')] public function refresh(): void {}` — never `$this->dispatch('$refresh')`.

4. **BL form is a custom ViewField** — `FactureResource::form()` uses `Forms\Components\ViewField::make('bl_pos_view')->view('filament.pages.create-facture-bl')`. All other fields are `Hidden`. The JS in the blade manually syncs values to Livewire via `$wire.set()`.

5. **Stock sync on BL save** — `EditFacture::afterSave()` increments stock back for old lines then decrements for new lines. `CreateFacture::afterCreate()` decrements stock. Never skip this.

6. **Commande etat values** — `nouvelle_commande`, `en_cours_de_preparation`, `expidee`, `livree`, `annulee`, `retournee`

7. **Navigation group** for BL/Facture resources is `'Facturation & Tickets'`

8. **TopRegionsWidget** — queries `commandes.region` grouped by region for orders + `clients` joined to `commandes` for top clients. Both respect the global period filter.

9. **Custom blade widgets** must wrap content in `<x-filament-widgets::widget>` to get the card shell.

10. **`Get` / `Set` live at `Filament\Schemas\Components\Utilities\*` in v4** — `Filament\Forms\Get`
    does NOT exist (filament/forms v4.2.0 ships only `FormsComponent`, `FormsServiceProvider` and
    `helpers` at the root of `src/`). A leftover v3 hint is invisible until the closure runs, so it
    can sit in a shipped file for weeks.

    That is exactly what made `/products/create` return 500 while editing a product worked: the two
    broken hints were inside a `Repeater` item, and `CreateRecord::fillForm()` calls
    `$this->form->fill()` with **no arguments** — the call that applies component defaults — while
    `Repeater::setUp()` defaults to one empty item. Create instantiated the item and crashed; edit
    fills from the record, skips defaults, renders zero items, and never touched the bug.

    Run `php artisan filament:check-classes` before deploying. It resolves every Filament class
    name referenced under `app/` through the file's `use` aliases and fails on any that
    `class_exists()` cannot find.

11. **A repeater `itemLabel` must be defensive.** `fn (array $state) => $state['q']` throws twice
    over: `array` is non-nullable and Filament passes null for a fresh item, and a missing key is an
    `Undefined array key` ErrorException. Both are fatal, and an item LABEL must never be able to
    fail the render of the form it decorates. Type it `?array` and reach for keys with `??`.
