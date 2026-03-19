# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Laravel 12 + Filament v4 admin panel for the Sobitas marketplace. The UI language is French (labels, navigation groups, field names). Currency is TND (Tunisian Dinar).

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

## Architecture

### Filament panel structure
All admin UI lives under `app/Filament/`:

- **`Resources/`** — one `*Resource.php` per model + a `Pages/` subfolder with `List*`, `Create*`, `Edit*` classes. The Resource file defines the form schema (`Schema`), table columns, filters, and actions.
- **`Pages/`** — custom full-page views: `Dashboard`, `Stock`, `HistoriqueClient`, `MediaPage`, `SendEmail`, `SendSms`, `TicketPosPage`, `LowStockProducts`.
- **`Widgets/`** — dashboard widgets (charts, KPI cards, tables). All widgets listen to the `dashboardFilterUpdated` Livewire event to react to the global period filter.
- **`Support/`** — shared traits/services. `DashboardHeaderActions` trait drives the period-filter preset, refresh, and CSV export on the dashboard.

### Dashboard period filter
The dashboard uses a global `?period=` query-string preset (default `30d`). Widgets must listen to the `dashboardFilterUpdated` Livewire event — do **not** use `$refresh` dispatch as it re-mounts widgets and resets the filter. The URL is always the source of truth; the session key `dashboard.filter.preset` mirrors it.

### Resource conventions
- Model field names use French slugs: `designation_fr`, `publier`, `rupture`, etc.
- Forms use `Filament\Schemas\Schema` (Filament v4 API), not the older `Filament\Forms\Form`.
- Navigation groups used: `Catalogue`, `Ventes`, `Clients`, `Marketing`, `SEO`, `Administration`.
- Slug fields are auto-generated from `designation_fr` and kept in sync via `->live(onBlur: true)` + `afterStateUpdated`.
- Stock/rupture logic: `qte <= 0` automatically sets `rupture = 1`, and vice versa — keep this bidirectional sync when editing stock fields.

### Key models
`Product` (with `tags`, `aromes` many-to-many), `Commande` (orders), `Client`, `Facture`, `Quotation`, `CreditNote`, `Ticket`, `Article`, `Annonce`, `SeoPage`, `Redirection`, `Newsletter`, `ProductPriceList`.

### Performance notes
`FilamentServiceProvider` defers Livewire hydration via `requestIdleCallback` to reduce first-paint blocking. Do not remove this optimization.

### Media
Files are stored on the `public` disk under `storage2/app/public/` (symlinked). Use `->disk('public')` on all `FileUpload` components.
