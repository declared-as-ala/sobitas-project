Filament Admin – Project Structure Guide
This document explains how the Filament v4 admin is organized in the Sobitas project so you can quickly navigate, debug, and extend it.
1. High‑level layout
The Filament app lives under the filament/ Laravel project:
filament/app – PHP code (resources, pages, widgets, models, providers, controllers)
filament/config – Filament config (filament.php, etc.)
filament/routes/web.php – Filament-specific web routes (print, exports, etc.)
filament/resources/views – Blade views (Filament component overrides, print templates)
filament/resources/css/filament – Custom CSS for Filament UI
filament/tests – PHPUnit tests for the Filament app
Filament runs as the admin panel for back‑office workflows: orders, BL (bons de livraison), invoices, tickets, catalog, marketing, etc.
2. Panel setup & global styling
2.1 Panel provider
app/Providers/Filament/AdminPanelProvider.php
Registers the single admin panel:
->id('admin')
->login(Login::class) + ->profile() + password reset
Loads global CSS:
filament.components.custom-admin-styles (inline <style>)
resources/css/filament/topbar.css
resources/css/filament/doc-edit.css (document edit layout: BL, invoices, tickets)
Registers:
All Filament resources (Facture, FactureTva, Ticket, Product, Client, etc.)
Custom pages (Dashboard, stock pages, media, etc.)
Widgets (KPIs, charts, dashboard panels)
Middleware:
Uses standard Laravel/Filament middleware stack and Authenticate guard.
->spa() enables SPA-like navigation.
2.2 Global layout & CSS
resources/views/filament/components/custom-admin-styles.blade.php
Adjusts topbar and main content paddings.
Styles tables, badges, and base form controls (.fi-input).
Document-specific helpers:
.doc-totaux-sidebar – sticky totals panel on document edit pages
.doc-lines-repeater – compact styling for repeater rows (lines of BL/invoices)
Timeline panel (.doc-timeline-*) used by document history widgets.
resources/css/filament/doc-edit.css
Shared styles for document edit UIs:
Truncates long product labels in line items (white-space: nowrap; text-overflow: ellipsis).
Keeps inputs compact (max-height: 40px in line repeater).
Styles barcode scan block:
.bl-barcode, .bl-barcode-title, .bl-barcode-input, .bl-barcode-helper.
resources/css/filament/topbar.css
Additional layout tweaks for the admin topbar (loaded globally).
3. Resources (CRUD modules)
All Filament resources live in:
app/Filament/Resources/*Resource.php
Each resource typically has:
*Resource.php – main resource configuration (form, table, navigation).
Pages/* – CRUD pages (List, Create, Edit, sometimes custom actions).
RelationManagers/* – nested relations as tables (e.g. line items on documents).
Example: Bons de Livraison (BL)
app/Filament/Resources/FactureResource.php
protected static ?string $model = Facture::class;
Navigation:
Group: “Facturation & Tickets”
Label: “Bon de Livraison” / “Bons de Livraison”
Form (form()):
Uses Filament\Schemas Grid + Section components:
Left column (2/3): company info, Client section, Produits section.
Right column (1/3): Totaux section with sticky sidebar (doc-totaux-sidebar).
Client section:
Select client_id (relationship client) that auto‑fills address and phone.
Produits section:
Placeholder('barcode_scan') renders filament.components.barcode-scan-compact.
Repeater('details'):
Line layout: Produit (colSpan 7) | Qté (2) | P.U (2) | P.T (1).
afterStateUpdated recalculates prix_ht and prix_ttc.
->addActionLabel('Ajouter produit') for adding new product rows.
Table (table()):
BL list: number, status badge, linked Facture TVA, client, totals, created date.
Row actions:
Edit
convertToInvoice (BL → Facture TVA)
print (opens print modal with iframe)
Delete.
Pages for BL:
app/Filament/Resources/FactureResource/Pages/ListFactures.php
Basic ListRecords with a Create header action.
Pages/CreateFacture.php
Standard create page (extends CreateRecord).
Pages/EditFacture.php
Custom edit logic:
Heading/subheading: BL number + client/date/total meta line.
mutateFormDataBeforeFill and afterSave manage line items and stock adjustment.
addProductByBarcode($code) handles barcode scan:
Looks up product by code_product / 0{code}.
If found: increments quantity on existing line or adds new line.
If not: Filament danger notification.
Header actions:
Enregistrer (Actions\Action::make('save')->action('save')).
Annuler (redirects back to list).
Transformer en facture TVA (conversion wizard).
Imprimer (print modal).
Action group with Supprimer.
The same pattern exists for:
FactureTvaResource – VAT invoices.
TicketResource – tickets.
ProductResource, ClientResource, etc. – catalog and CRM.
4. Custom pages & widgets
Pages
app/Filament/Pages/*
Examples:
Dashboard – main KPIs.
Stock pages under Pages/Stock/* (dashboards, reports, alerts).
Marketing / communication pages (send SMS, send email).
These extend Filament\Pages\Page (or specialized base classes) and are registered in AdminPanelProvider.
Widgets
app/Filament/Widgets/*
Dashboard widgets: stats overview, charts, latest orders, stock KPI cards, etc.
Many document-related widgets (e.g. DocumentTimelineWidget) surface events/timeline on edit pages.
5. Controllers & routes specific to Filament
Routes
filament/routes/web.php
Public/form routes (outside panel but in the Filament app context).
Print routes for documents:
factures/{facture}/print – BL print (Bon de Livraison).
facture-tvas/{factureTva}/print – TVA invoice.
tickets/{ticket}/print – ticket.
product-price-lists/{productPriceList}/print – price list.
quotations/{quotation}/print – quote.
Download routes (PDF exports).
Small utilities (dashboard exports, email previews, stock reports, global search API).
Controllers
filament/app/Http/Controllers/*
GlobalSearchController – JSON API used by custom global search; fully scoped and returns only safe summary data (id, labels, etc.).
DocumentPdfController – generates/downloads PDFs for invoices, BL, quotes, tickets.
Other controllers for exports and previews.
6. Views – Filament overrides & print system
Filament components overrides
resources/views/filament/components/*
custom-admin-styles.blade.php – global style tweaks.
print-modal.blade.php – print preview modal:
Renders an iframe pointing to ?embed=1 print route.
Has buttons “Imprimer” and “Fermer”.
barcode-scan-compact.blade.php – compact barcode scan UI:
Uses Alpine state + $wire.addProductByBarcode.
Structured with .bl-barcode* classes to avoid Tailwind.
Company info blocks, conversion wizard summary, etc.
These Blade components are plugged into resources via Placeholder::make()->content(view(...)).
Print layout and templates
resources/views/print/*
layout.blade.php – shared standalone HTML layout for all prints:
<html><head>… @include('print.partials.print-styles') …</head><body class="print-doc-body">…
Optional toolbar (when not embed=1).
Slots for:
Company info
Document header (title, number, date)
Client card
Table (@yield('print-table'))
Totals and footer notes.
partials/print-styles.blade.php – A4 print CSS (no Filament UI).
Document-specific bodies:
print/bon-de-livraison.blade.php – BL line table.
print/facture-tva.blade.php, print/ticket.blade.php, print/devis.blade.php, etc.
The Filament actions for print always use the print modal + iframe, never the panel layout.
7. Authentication & authorization
app/Models/User.php – Filament user model:
Implements Filament\Models\Contracts\FilamentUser.
canAccessPanel(Panel $panel) gates admin access (based on role_id).
app/Providers/AuthServiceProvider.php – defines accessFilament gate used by Filament.
Only users with the right roles (role_id values) can enter the admin panel or access sensitive endpoints like global search.
8. Testing
filament/tests
Feature/* – feature tests for dashboard metrics, document services, etc.
Unit/* – unit tests.
CreatesApplication.php, TestCase.php – Laravel+Filament test harness.
Use these as templates when adding tests for new resources or workflows (e.g. BL edit, barcode, print).
9. Conventions & tips for new work
No Tailwind in custom Blade overrides: use classic CSS in custom-admin-styles.blade.php or resources/css/filament/*.css.
Prefer Filament components (Forms, Tables, Actions, Schemas) over raw HTML when building CRUD.
For documents (BL, Facture, Ticket):
Reuse the line item repeater pattern from FactureResource.
Reuse the print layout and print-modal for any new print/export features.
Place:
New resources in app/Filament/Resources.
Global, shared document styles in resources/css/filament/doc-edit.css.
Reusable bits of UI (e.g. barcode widgets, headers) in resources/views/filament/components.

---

## 10. Facture TVA Edit – Implementation summary (refactor plan)

### Fichiers modifiés / créés

| Fichier | Rôle |
|---------|------|
| `app/Filament/Resources/FactureTvaResource.php` | Form: sections Informations société, Client (+ email), Produits (doc-lines-repeater), Totaux, Résumé; recalcul temps réel (pourcentage_remise ↔ remise); Net à payer stylé; N° Document. |
| `app/Filament/Resources/FactureTvaResource/Pages/EditFactureTva.php` | getPageClasses (header non sticky), mutateFormDataBeforeFill (+ client_email, numero_display, resume_*), afterSave (persistance totaux), getFormActions, getHeaderActions (Envoyer, PDF, Imprimer, menu …). |
| `app/Filament/Resources/FactureTvaResource/Pages/CreateFactureTva.php` | afterCreate: persistance des totaux sur le record. |
| `app/Filament/Resources/FactureTvaResource.php` (recalculateFactureTvaTotals) | Sync pourcentage_remise, cap remise, arrondis 3 décimales. |
| `resources/views/filament/components/custom-admin-styles.blade.php` | Header non sticky scopé à `.fi-page-edit-facture-tva`; styles Net à payer (.doc-net-a-payer-input); badge TVA ligne (.doc-line-tva-badge). |
| `resources/views/print/invoice-layout.blade.php` | Script: `window.print()` automatique au load quand pas embed ni forPdf. |
| `app/Mail/FactureTvaSent.php` | Mailable: sujet « Votre facture #… », vue email, pièce jointe PDF (DomPDF). |
| `resources/views/emails/facture-tva-sent.blade.php` | Vue email (corps court + montant). |

### Résumé des changements

- **Layout / UI:** Deux colonnes (gauche: Informations société, Client avec email, Produits avec scan + repeater; droite: Totaux + Résumé). Net à payer en gros champ orange. Footer: « Enregistrer les modifications » (orange) et « Annuler ».
- **Header:** Non sticky uniquement sur la page Edit Facture TVA (classe `fi-page-edit-facture-tva`).
- **Recalcul temps réel:** Remise (montant) et Remise % synchronisés; modification de Remise, Remise %, Timbre déclenche la mise à jour immédiate des totaux (HT, HT après remise, TVA, TTC, Net à payer). Persistance des totaux en base après save (Edit + Create).
- **Actions header:** Envoyer (vérif client + email, envoi mail avec PDF en pièce jointe, toasts, log); PDF (lien téléchargement, nouvel onglet); Imprimer (nouvel onglet vers route print + `window.print()` auto); menu « … » (Supprimer).
- **Lignes produits:** Repeater avec classe `doc-lines-repeater` (row cards), select produit large, TVA (DT) en badge bleu, responsive (colonnes empilées sur petit écran).
- **Impression:** Page print ouvre en nouvel onglet, déclenche `window.print()` au chargement; toolbar masquée en @media print.

### Config mail (.env)

Pour que « Envoyer » envoie bien l’email au client, configurer dans `.env` par exemple :

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@votredomaine.com
MAIL_FROM_NAME="${APP_NAME}"
```

Pour tester sans SMTP réel : `MAIL_MAILER=log` (les emails sont écrits dans `storage/logs/laravel.log`).

### Checklist de test manuel (Facture TVA – Edit)

- [ ] **Header:** En scrollant, le header (titre + meta + boutons) défile avec la page (pas de sticky).
- [ ] **Envoyer** – Client avec email : clic « Envoyer » → toast succès, email reçu avec PDF en pièce jointe.
- [ ] **Envoyer** – Client sans email : toast erreur + proposition d’ouvrir le client.
- [ ] **PDF:** Clic « PDF » → nouvel onglet / téléchargement d’un PDF propre de la facture.
- [ ] **Imprimer:** Clic « Imprimer » → nouvel onglet → dialogue d’impression s’ouvre automatiquement; toolbar « Aperçu » masquée à l’impression.
- [ ] **Ajouter produit:** Clic « Ajouter produit » → nouvelle ligne avec Produit, Qté, P.U, TVA %, P.T/HT, TVA (DT); totaux mis à jour.
- [ ] **Recalcul:** Modifier Remise, Remise %, ou Timbre → Sous-total HT, HT après remise, TVA, Total TTC, Net à payer se mettent à jour immédiatement.
- [ ] **Enregistrer les modifications:** Sauvegarde puis rechargement → totaux et lignes persistés; PDF/print reflètent les bons montants.
- [ ] **Annuler:** Retour à la liste sans sauvegarder.