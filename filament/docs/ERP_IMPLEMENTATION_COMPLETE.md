# ERP-Lite Implementation — COMPLETE

Implementation matches the plan in `ERP_IMPLEMENTATION_PLAN.md`. Summary of what was done.

---

## ✅ Phase 0 — Database & Models

### Migrations (`filament/database/migrations/`)

| File | Purpose |
|------|---------|
| `2026_02_26_200001_add_document_chain_foreign_keys.php` | `commandes.quotation_id`, `factures.commande_id`, `facture_tvas.facture_id` |
| `2026_02_26_200002_add_status_to_documents.php` | `quotations.status`, `factures.status`, `facture_tvas.status`, `tickets.status` (default `draft`) |
| `2026_02_26_200003_create_payments_table.php` | `payments` (facture_tva_id, commande_id, method, amount, currency, status, provider_ref, paid_at) |
| `2026_02_26_200004_create_credit_notes_table.php` | `credit_notes` (facture_tva_id, numero, total_ht, total_ttc, status, issued_at) |
| `2026_02_26_200005_create_credit_note_details_table.php` | `credit_note_details` (snapshots per line) |
| `2026_02_26_200006_create_number_sequences_table.php` | `number_sequences` (name, year, last_number) for BL/FA/AV/DV |
| `2026_02_26_200007_create_audit_logs_table.php` | `audit_logs` (user_id, action, entity_type, entity_id, before, after) |
| `2026_02_26_200008_backfill_number_sequences.php` | Backfill sequences from existing factures/facture_tvas/quotations count per year |

**Run:** `php artisan migrate` (from `filament` directory or project root where filament migrations are registered).

### Models & Enums

- **Enums:** `QuotationStatus`, `BlStatus`, `InvoiceStatus`, `PaymentStatus`, `CreditNoteStatus` (`app/Enums/`).
- **Models updated:** `Quotation` (status, commandes()), `Commande` (STATUS_NEW, quotation_id, quotation(), factures(), payments()), `Facture` (commande_id, status, commande(), factureTvas()), `FactureTva` (facture_id, status, facture(), payments(), creditNotes()), `Ticket` (unchanged; status column added by migration).
- **New models:** `Payment`, `CreditNote`, `CreditNoteDetail`, `AuditLog`, `NumberSequence`.

---

## ✅ Phase 1 — Conversions & UI

### Services

- **`NumberSequenceService`** — `nextBl()`, `nextFacture()`, `nextAvoir()`, `nextDevis()` (format PREFIX-YYYY-NNNN).
- **`QuotationConversionService`** — `convertToOrder(Quotation)` → creates Commande, sets quotation_id, copies lines.
- **`OrderToBlService`** — `createBlFromOrder(Commande, ?quantities)` → creates Facture (BL), sets commande_id; no stock decrement.
- **`BlToInvoiceService`** — `createInvoiceFromBl(Facture)` → creates FactureTva, sets facture_id; no stock decrement.
- **`PaymentService`** — `recordPayment(FactureTva, amount, method, ...)` → creates Payment, sets invoice status to paid/partially_paid.

### Convert buttons (header actions)

- **Edit Quotation:** « Transformer en commande » (visible if no linked commande) → redirect to Edit Commande.
- **Edit Commande:** « Créer BL » (visible if no linked BL) → redirect to Edit Facture (BL).
- **Edit Facture (BL):** « Transformer en facture TVA » (visible if no linked invoice) → redirect to Edit FactureTva.
- **Edit FactureTva:** « Enregistrer paiement » (modal: amount, method, optional ref/date), « Créer un avoir » (link to create CreditNote with invoice pre-filled).

### Document links in subheadings

- **Edit Commande:** shows « Devis : #X » and/or « BL : #X » when linked.
- **Edit Facture:** shows « Commande : #X » and « Facture TVA : #Y » when linked.
- **Edit FactureTva:** shows « BL : #X » and « Encaissé : X DT » when linked / when payments exist.

### Status columns

- **Facture** and **FactureTva** list tables show a **Statut** badge (draft/issued/paid/etc.).

### Credit notes (Avoirs)

- **CreditNoteResource** — List, Create, Edit. Create can be opened with `?facture_tva_id=…` to pre-fill invoice and totals.
- **Edit CreditNote:** « Émettre l’avoir » sets status to issued and issued_at.

---

## ✅ API & Stock

- **Commande::STATUS_NEW** — Constant added: `'nouvelle_commande'` (fixes API bug).
- **API `POST /add_commande`** — Stock validation (reject if qte > product.qte) and **stock decrement** on order creation (inside transaction).

---

## 🔲 Not done (optional / Phase 2+)

- **Dashboard CA** — Logic for « CA Facturé » and « CA Encaissé » (plan §8) not implemented; current dashboard unchanged.
- **Refunds table** — Not created; refunds can be added later.
- **Stock ledger** — `stock_movements` table exists but is not used in order/invoice flows.
- **Reserved stock** — No `reserved_qty` or reservation flow yet.
- **Full document timeline widget** — Only subheading links; no dedicated timeline component.
- **Permissions** — No new gates/policies (devis.manage, invoice.issue, etc.).

---

## Rollout

1. Run migrations: `php artisan migrate`.
2. Existing Facture/FactureTva/Quotation rows get `status = 'draft'` by default.
3. New conversions use BL-YYYY-NNNN, FA-YYYY-NNNN, AV-YYYY-NNNN; manual create still uses YYYY/NNNN for numero where unchanged in code.
4. Backfill migration sets `number_sequences` from current year counts so next BL/FA/AV numbers follow existing data.

Implementation is **complete** for Phase 0 and Phase 1 as above.
