# Claude Context - Align Filament Print Pages With Backend

Goal: make Filament print outputs for **Devis**, **Ticket**, **Facture TVA**, and **Bon de Livraison (BL)** match backend print layouts/behavior.

Use this file as the minimal context to avoid token-heavy repo exploration.

---

## Scope

Documents to align:
- Devis
- Ticket
- Facture TVA
- Bon de Livraison

Alignment target:
- Visual structure (header, client block, lines table, totals, notes/footer)
- Data mapping and fallback behavior
- Print route behavior and download behavior

Do **not** refactor unrelated modules.

---

## Filament files (primary)

### Print blades
- `filament/resources/views/print/devis.blade.php`
- `filament/resources/views/print/ticket.blade.php`
- `filament/resources/views/print/facture-tva.blade.php`
- `filament/resources/views/print/bon-de-livraison.blade.php`
- Shared layouts:
  - `filament/resources/views/print/layout-backend.blade.php`
  - `filament/resources/views/print/layout.blade.php`
  - `filament/resources/views/print/invoice-layout-clean.blade.php`
  - `filament/resources/views/print/invoice-layout.blade.php`

### Print/Download controllers and routes
- `filament/app/Http/Controllers/DocumentPdfController.php`
- `filament/routes/web.php` (print routes + download routes)

### Related page views (form behavior that affects print data)
- `filament/resources/views/filament/pages/create-devis.blade.php`
- `filament/resources/views/filament/pages/create-facture-tva.blade.php`
- `filament/resources/views/filament/pages/create-facture-bl.blade.php`
- `filament/resources/views/filament/pages/ticket-pos.blade.php`

---

## Backend reference files (source of truth)

- `backend/resources/views/admin/imprimer_quotations.blade.php`
- `backend/resources/views/admin/imprimer_ticket.blade.php`
- `backend/resources/views/admin/imprimer_facture_tva.blade.php`
- `backend/resources/views/admin/imprimer_facture.blade.php` (BL/Facture style reference)
- Related non-print pages if needed:
  - `backend/resources/views/admin/quotations.blade.php`
  - `backend/resources/views/admin/ticket.blade.php`
  - `backend/resources/views/admin/facture_tva.blade.php`
  - `backend/resources/views/admin/facture.blade.php`

---

## Current known behavior (important)

- BL uses a merged single-line delivery address logic.
- BL print currently renders client block and merged address via model/accessor fallback logic.
- BL conversion from Commande uses `OrderToBlService` and saves merged address in BL fields.
- PDF downloads are generated in `DocumentPdfController`.

When changing print templates, preserve these existing BL data rules unless explicitly changing requirements.

---

## Data and mapping checkpoints

For each document type, verify these consistently between screen, print view, and PDF download:

1. Client identity fields:
- Name
- Email (if required)
- Phone
- Address

2. Line items:
- Product label
- Quantity
- Unit price
- Tax columns if applicable
- Line total formula (avoid double-tax or double-multiply bugs)

3. Totals block:
- HT
- Remise (amount + % when present)
- TVA (where applicable)
- Timbre (where applicable)
- Frais livraison (BL/Ticket flows where relevant)
- Net a payer / TTC final

4. Footer:
- Note text
- Company/legal details
- Terms text

---

## Route and rendering checklist

Confirm all print routes point to expected blade and data payload:
- BL print route and BL download route
- Devis print + download
- Facture TVA print + download
- Ticket print + download

Check:
- Date format
- Document number format
- Correct company coordinate source
- Back URL handling (if present in blade context)

---

## Non-goals (to keep token and risk low)

- Do not redesign all CSS globally.
- Do not change unrelated API/checkout logic.
- Do not rename routes unless absolutely required.
- Avoid broad refactors; patch per document template + controller payload only.

---

## Suggested minimal execution plan

1. Compare each backend print blade vs matching Filament print blade.
2. Patch Filament blade structure and labels to match backend.
3. Patch `DocumentPdfController` payload keys if any field mismatch is found.
4. Verify route outputs for print + download for all 4 documents.
5. Keep changes isolated to print/controller/route surface.

---

## Acceptance criteria

- Filament print pages for Devis/Ticket/Facture TVA/BL visually and structurally match backend references.
- Data rendered in client block, table, and totals is consistent with backend output.
- PDF downloads show same content as print views.
- No regression in create/edit flows caused by print changes.

