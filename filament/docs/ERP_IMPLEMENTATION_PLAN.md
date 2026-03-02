# ERP-Lite Implementation Plan — Document Chain, CA, Payments, Stock

**Version:** 1.0  
**Scope:** Filament admin app (+ shared DB with backend/API).  
**Principle:** Phased rollout, no breaking changes to existing production flows.

---

## 1. Current State Summary

### 1.1 Document Tables & Relations (As-Is)

| Document       | Table (header)     | Details table           | Status column     | Links (FKs)   |
|----------------|--------------------|--------------------------|-------------------|---------------|
| Devis          | `quotations`       | `details_quotations`     | `statut` (nullable) | `client_id` only |
| Commande       | `commandes`        | `commande_details`       | `etat`            | `user_id` only |
| BL (Ticket)    | `tickets`          | `details_tickets`        | **None**          | `client_id` only |
| Facture (BL)   | `factures`         | `details_factures`       | **None**          | `client_id` only |
| Facture TVA    | `facture_tvas`     | `details_facture_tvas`   | **None**          | `client_id` only |
| Payment        | **Does not exist** | —                        | —                 | —             |
| Avoir          | **Does not exist** | —                        | —                 | —             |

- **Quotations:** `filament/app/Models/Quotation.php`, `DetailsQuotation.php`. Migration added `statut` (string, nullable). No workflow (draft/sent/accepted).
- **Commandes:** `filament/app/Models/Commande.php`, `CommandeDetail.php`. `etat`: nouvelle_commande → … → expidee | annuler. **Bug:** API uses `Commande::STATUS_NEW` which is undefined (should be `'nouvelle_commande'`).
- **Tickets:** `filament/app/Models/Ticket.php`, `DetailsTicket.php`. No status; no link to commande.
- **Facture / FactureTva:** `filament/app/Models/Facture.php`, `Facture.php`, `DetailsFacture.php`, `DetailsFactureTva.php`. No status; no link to ticket/commande.

### 1.2 CA (Chiffre d’affaires) Today

- **Filament DashboardMetricsService** (`filament/app/Services/DashboardMetricsService.php`): GMV and revenue use **commandes only** (excluding `annuler`). No factures/tickets in this service.
- **Filament DashboardExportController** (`filament/app/Http/Controllers/DashboardExportController.php`): Revenue = **factures + facture_tvas + tickets** (UNION ALL, by `created_at`). Commandes used for counts/shipped only.
- **Backend** (see `backend/WORKFLOW_AND_CA_ANALYSIS.md`): CA = factures + facture_tvas + tickets + commandes (etat = expidee) → risk of **double counting** when same sale exists as both commande expidee and facture/ticket.

### 1.3 Stock

- **Admin (Filament):** Facture, FactureTva, Quotation create/update **decrement** `products.qte`. Ticket (BL) in backend decrements; Filament TicketResource to be confirmed.
- **API:** `filament/app/Http/Controllers/Api/CommandeController.php` — **no stock decrement** on order creation → oversell risk.
- **StockMovement:** Table and model exist (`filament/database/migrations/2026_02_25_100000_create_stock_movements_table.php`, `filament/app/Models/StockMovement.php`) but not used in order/invoice flows.

### 1.4 Naming Clarification

- **Facture** (table `factures`) = Bon de livraison (BL) in the UI (Filament label "Bon de Livraison").
- **FactureTva** = real accounting invoice (TVA).
- **Ticket** = another delivery-note-like entity (legacy BL?). Target workflow treats **Facture as BL** and **FactureTva as Invoice**.

---

## 2. Target Workflow & Conventions

- **Chain:** Devis → Commande → BL (Facture) → Facture TVA (Invoice) → Payment → Avoir (if needed).
- **Devis:** Pre-sale; no revenue; no stock deduction (reservation optional later).
- **Commande:** Can reserve stock; CA not from commande once BL/Invoice exist.
- **BL (Facture):** Source of truth for delivered quantities; created from Commande.
- **Facture TVA:** Preferentially created from BL; official accounting document.
- **CA Facturé:** SUM(invoices total_ttc WHERE status IN (issued, paid, partially_paid)) − SUM(credit_notes total WHERE issued).
- **CA Encaissé:** SUM(payments.amount WHERE status=succeeded) − SUM(refunds).
- **Corrections:** Only via Avoir (credit note), never “convert invoice back to devis”.

---

## 3. Database Migrations (Exact List)

All migrations in: `filament/database/migrations/`.

### Phase 0 — Links & statuses (non-breaking)

| # | Migration file (suggested name) | Purpose |
|---|--------------------------------|--------|
| 1 | `2026_02_26_200001_add_quote_id_to_commandes.php` | `commandes.quotation_id` nullable FK → quotations.id |
| 2 | `2026_02_26_200002_add_order_id_to_factures.php` | `factures.commande_id` nullable FK → commandes.id (BL from order) |
| 3 | `2026_02_26_200003_add_delivery_note_id_to_facture_tvas.php` | `facture_tvas.facture_id` nullable FK → factures.id (invoice from BL) |
| 4 | `2026_02_26_200004_add_status_to_quotations.php` | Ensure `quotations.statut` enum-like: draft, sent, accepted, rejected, expired (or keep string, document allowed values) |
| 5 | `2026_02_26_200005_add_status_to_factures.php` | `factures.status` (draft, issued, delivered) |
| 6 | `2026_02_26_200006_add_status_to_facture_tvas.php` | `facture_tvas.status` (draft, issued, paid, partially_paid, canceled) |
| 7 | `2026_02_26_200007_add_status_to_tickets.php` | `tickets.status` (draft, issued, delivered) — optional if Ticket is deprecated in favor of Facture as BL |

### Phase 0 — Payments & credit notes

| # | Migration file | Purpose |
|---|----------------|---------|
| 8 | `2026_02_26_200008_create_payments_table.php` | id, invoice_id (FK facture_tvas.id), order_id (nullable), method (COD/Stripe/PayPal), amount, currency (default TND), status (pending/succeeded/failed/refunded), provider_ref, paid_at, created_at, updated_at. Indexes: invoice_id, order_id, status, paid_at. |
| 9 | `2026_02_26_200009_create_credit_notes_table.php` | id, facture_tva_id (FK, required), numero (unique), total_ht, total_ttc, status (draft/issued), issued_at, created_at, updated_at. |
| 10 | `2026_02_26_200010_create_credit_note_details_table.php` | id, credit_note_id, product_id, qte, unit_price_ht, discount, tva_rate, total_ht, total_ttc (snapshots). |
| 11 | `2026_02_26_200011_create_refunds_table.php` | id, payment_id, credit_note_id (nullable), amount, status, created_at. (Optional: can be Phase 3.) |

### Phase 0 — Snapshot columns (item tables)

Ensure line items store accounting snapshot; add if missing:

| # | Migration file | Purpose |
|---|----------------|---------|
| 12 | `2026_02_26_200012_add_snapshot_columns_to_detail_tables.php` | For `details_factures`, `details_facture_tvas`, `commande_details`, `details_quotations`, `details_tickets`: add where missing: unit_price_ht, discount, tva_rate, total_ht, total_ttc (so CA doesn’t depend on current product price). |

### Phase 0 — Numbering

| # | Migration file | Purpose |
|---|----------------|---------|
| 13 | `2026_02_26_200013_create_number_sequences_table.php` | Table: id, name (e.g. DV, BL, FA, AV), year, last_number (int), updated_at. Unique (name, year). Used for DV-YYYY-XXXX, BL-YYYY-XXXX, FA-YYYY-XXXX, AV-YYYY-XXXX with lock for concurrency. |

### Phase 2/4 — Stock

| # | Migration file | Purpose |
|---|----------------|---------|
| 14 | (Phase 4) `2026_02_26_200014_add_reserved_qty_to_products.php` | `products.reserved_qty` default 0; available = qte - reserved_qty. |
| 15 | (Phase 4) Optional reserved_stock table | If reservations are per-order: order_id, product_id, qty, released_at. |

### Audit

| # | Migration file | Purpose |
|---|----------------|---------|
| 16 | `2026_02_26_200016_create_audit_logs_table.php` | id, user_id, action, entity_type, entity_id, before (JSON), after (JSON), created_at. Indexes: entity_type, entity_id, created_at, user_id. |

---

## 4. Model & Relation Changes (Exact Paths)

| File | Changes |
|------|--------|
| `filament/app/Models/Quotation.php` | Add `status` accessor/scopes if using enum; add `commandes()` hasMany(Commande::class, 'quotation_id') |
| `filament/app/Models/Commande.php` | Add `quotation_id` fillable; `quotation()` belongsTo; `factures()` hasMany(Facture::class, 'commande_id'); `payments()` hasMany(Payment::class). Fix constant: add `public const STATUS_NEW = 'nouvelle_commande';` |
| `filament/app/Models/Ticket.php` | Add `status`; optionally `commande_id` if Ticket stays as BL variant |
| `filament/app/Models/Facture.php` | Add `commande_id`, `status`; `commande()` belongsTo; `factureTvas()` hasMany(FactureTva::class, 'facture_id') |
| `filament/app/Models/FactureTva.php` | Add `facture_id` (delivery_note_id), `status`; `facture()` belongsTo; `payments()` hasMany; `creditNotes()` hasMany(CreditNote::class) |
| **New** `filament/app/Models/Payment.php` | BelongsTo FactureTva, Commande (optional); fillable: invoice_id, order_id, method, amount, currency, status, provider_ref, paid_at |
| **New** `filament/app/Models/CreditNote.php` | BelongsTo FactureTva; hasMany CreditNoteDetail; status |
| **New** `filament/app/Models/CreditNoteDetail.php` | BelongsTo CreditNote, Product; snapshot columns |
| **New** `filament/app/Models/Refund.php` | Optional; belongsTo Payment, CreditNote |
| **New** `filament/app/Models/NumberSequence.php` | Or service-only, no model; table used with lock |
| **New** `filament/app/Models/AuditLog.php` | Polymorphic or entity_type/entity_id; user_id, action, before, after |

---

## 5. Conversion Services (Transactional, Audited)

Location: `filament/app/Services/DocumentConversion/` (or `filament/app/Services/`).

| Service class | Method(s) | Responsibility |
|---------------|-----------|----------------|
| `QuotationConversionService` | `convertToOrder(Quotation $quote): Commande` | Copy header + lines to Commande with snapshots; set commande.quotation_id; audit log; return Commande |
| `OrderToBlService` | `createBlFromOrder(Commande $order, ?array $quantities = null): Facture` | Create Facture (BL) from order lines (quantities editable before issue); set facture.commande_id; optional stock reserve → deduct when BL issued |
| `BlToInvoiceService` | `createInvoiceFromBl(Facture $bl): FactureTva` | Create FactureTva from BL lines; set facture_tva.facture_id; status draft; audit |
| (Optional) `OrderToInvoiceService` | `createInvoiceFromOrder(...)` | Only if business rule “invoice before BL” is needed |

All methods must:
- Run inside `DB::transaction()`
- Write to `audit_logs` (before/after, references)
- Use `NumberSequenceService::getNext('BL')` etc. for numbering
- Not change existing document status from issued/paid (only draft → issued by explicit action)

**NumberSequenceService** (`filament/app/Services/NumberSequenceService.php`): `getNext(string $name): string` (e.g. BL-2026-0001). Use lockForUpdate() on the sequence row.

---

## 6. Status Enums / Values

Centralize in `filament/app/Enums/` (or config/constants):

| Enum / config | Values |
|---------------|--------|
| QuotationStatus | draft, sent, accepted, rejected, expired |
| OrderStatus | (existing etat) pending, confirmed, preparing, shipped, delivered, canceled — map existing etat to these where needed |
| BlStatus (Facture) | draft, issued, delivered |
| InvoiceStatus (FactureTva) | draft, issued, paid, partially_paid, canceled |
| PaymentStatus | pending, succeeded, failed, refunded |
| CreditNoteStatus | draft, issued |

---

## 7. Admin UI Changes (Filament — Exact Paths)

### 7.1 Convert buttons & actions

| Resource / Page | File(s) | Add action(s) |
|----------------|---------|----------------|
| Devis (view/edit) | `filament/app/Filament/Resources/QuotationResource/Pages/ViewQuotation.php` or Edit | Header: “Envoyer”, “Accepter”, “Refuser”, “Transformer en commande” (calls QuotationConversionService, redirect to new Commande edit). |
| Commande (view/edit) | `filament/app/Filament/Resources/CommandeResource/Pages/ViewCommande.php` or Edit | “Créer BL” → OrderToBlService, redirect to Facture (BL) edit. |
| BL (Facture) view/edit | `filament/app/Filament/Resources/FactureResource/Pages/EditFacture.php` | “Transformer en facture TVA” → BlToInvoiceService, redirect to FactureTva edit. |
| Facture TVA view/edit | `filament/app/Filament/Resources/FactureTvaResource/Pages/EditFactureTva.php` | “Marquer payée”, “Enregistrer paiement”, “Créer un avoir” (→ new CreditNote from invoice). |
| Credit note (new resource) | `filament/app/Filament/Resources/CreditNoteResource.php` + Pages | “Émettre avoir”; list/detail. |

### 7.2 Document timeline widget

- **New component:** `filament/app/Filament/Widgets/DocumentTimelineWidget.php` (or Livewire component).
- **View:** Blade partial `filament/resources/views/filament/widgets/document-timeline.blade.php`.
- **Data:** Given a root (quotation_id OR commande_id OR facture_id OR facture_tva_id), load chain: Quotation → Commande(s) → Facture(s) → FactureTva(s) → Payments, CreditNotes. Show for each: number, status, date, total; clickable link to record.
- **Placement:** On View/Edit pages of Quotation, Commande, Facture, FactureTva (as a card/section “Chaîne du document”).

### 7.3 New resources

| Resource | Path | Notes |
|----------|------|--------|
| CreditNoteResource | `filament/app/Filament/Resources/CreditNoteResource.php` | CRUD + issue action |
| PaymentResource (optional) | `filament/app/Filament/Resources/PaymentResource.php` | Or only “Enregistrer paiement” modal on Invoice page |

### 7.4 Status badges

- Add status column + badge to: QuotationResource, FactureResource, FactureTvaResource, TicketResource (if kept). CommandeResource already has etat.

---

## 8. Dashboard CA Rebuild (Exact Logic)

**New service or extend:** `filament/app/Services/RevenueReportingService.php` (or dedicated methods in DashboardMetricsService).

- **CA Facturé (accounting):**
  - `SUM(facture_tvas.prix_ttc)` WHERE `status IN ('issued','paid','partially_paid')` AND date in range
  - `− SUM(credit_notes.total_ttc)` WHERE `status = 'issued'` AND date in range
- **CA Encaissé (cash):**
  - `SUM(payments.amount)` WHERE `status = 'succeeded'` AND paid_at in range
  - `− SUM(refunds.amount)` (when refunds table exists)

**Rules:**
- Do **not** include `factures` (BL) in CA Facturé (BL is not the accounting invoice).
- Do **not** include `tickets` in CA once Facture/FactureTva chain is used (or define rule: e.g. tickets only if no facture_tva linked to same sale).
- Do **not** include `commandes.prix_ttc` in CA when an invoice (FactureTva) or BL (Facture) linked to that order exists (to avoid double count). Option: “CA Commande” = only commandes with etat=expidee and no linked facture_tva; then dashboard can show “CA Facturé” and “CA Encaissé” as primary.

**Files to change:**
- `filament/app/Services/DashboardMetricsService.php`: Add methods `getCAFacture()`, `getCAEncaisse()`; keep existing GMV/getNetRevenue for comparison during Phase 2.
- `filament/app/Http/Controllers/DashboardExportController.php`: Switch revenue export to CA Facturé / CA Encaissé when flag or phase enabled.
- Widgets that show revenue: `filament/app/Filament/Widgets/*` — add cards for CA Facturé and CA Encaissé; optionally keep old “GMV” card during rollout.

---

## 9. Payments Module

### 9.1 Backend

- **Model:** `filament/app/Models/Payment.php` (see §4).
- **Store:** `filament/app/Services/PaymentService.php` — `recordPayment(FactureTva $invoice, float $amount, string $method, ...): Payment`; update invoice status to paid/partially_paid; optional: balance_due on facture_tvas.
- **Migration:** Add `facture_tvas.balance_due` (nullable) and/or compute from total_ttc − SUM(payments.amount WHERE status=succeeded).

### 9.2 Endpoints (Filament = admin only; no public API required for payments if all via admin)

| Method | Route / usage | Purpose |
|--------|----------------|---------|
| — | Filament action only | “Enregistrer paiement” opens modal; form: amount, method (COD/Stripe/PayPal), optional provider_ref, paid_at. Submit → PaymentService::recordPayment. |

If you need API for gateway webhooks (Stripe/PayPal):

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `filament/routes/api.php` or web: `payment/webhook/stripe` | Stripe webhook: create Payment, update invoice. |

### 9.3 UI

- FactureTva edit page: button “Enregistrer paiement” → modal → PaymentService.
- Optional: `PaymentResource` list/filter by invoice, date, method.

---

## 10. Credit Notes (Avoir)

- **Create:** From FactureTva (copy lines as snapshots; total_ttc negative or stored as positive with “credit” type). Link credit_note.facture_tva_id.
- **Issue:** Status draft → issued; update CA Facturé (subtract).
- **Optional:** Refund payment (link refund to payment_id and credit_note_id).

Files: `CreditNoteResource`, `CreditNoteConversionService` (create from invoice), `filament/app/Filament/Resources/CreditNoteResource/Pages/CreateCreditNote.php` (pre-fill from invoice).

---

## 11. Stock (Phased)

### Phase 1 (now)

- **API orders:** In `filament/app/Http/Controllers/Api/CommandeController.php`, inside the transaction, after saving CommandeDetail: `Product::where('id', $productId)->decrement('qte', $qte)` (with out-of-stock check before committing). Add server-side check: reject order if any line has qte > product.qte.
- **Consistency:** Ensure all places that “sell” (Facture, FactureTva, Quotation if it ever deducts, Ticket) use the same decrement logic; consider centralizing in a `StockService::decrementForSale(reference_type, reference_id, lines)`.

### Phase 2 (pro)

- **Ledger:** Every change to `products.qte` (and reserved_qty) goes through `StockService` and writes to `stock_movements` (qty_before, qty_change, qty_after, type, reason, reference_type/id).
- **Reserved stock:** On Commande confirm, reserve; on cancel release; on BL issued deduct from qte and release reservation. Add `products.reserved_qty` and/or `reserved_stock` table.
- **Dashboard:** Low stock alerts, available = qte − reserved_qty.

---

## 12. Numbering (Safe Under Load)

- **Table:** `number_sequences` (name, year, last_number). Use `lockForUpdate()` in a transaction when generating next number.
- **Format:** DV-YYYY-XXXX, BL-YYYY-XXXX, FA-YYYY-XXXX, AV-YYYY-XXXX.
- **Service:** `NumberSequenceService::getNext('BL')` → `'BL-2026-0001'`.
- **Migration:** Backfill existing factures/quotations/commandes numbers into sequence table if you want to avoid renumbering (e.g. set last_number from MAX per year).

---

## 13. Permissions & Audit

- **Permissions (Filament/Policies):** devis.manage, order.manage, bl.manage, invoice.issue, payment.record, credit_note.issue, stock.adjust. Add to roles as needed.
- **Audit:** On every conversion (devis→order, order→BL, BL→invoice), and on payment record / credit note issue, append to `audit_logs`: user_id, action (e.g. `quotation.converted_to_order`), entity_type, entity_id, before (JSON), after (JSON).

---

## 14. Migration Plan (Phased Rollout)

| Phase | Scope | Risk | Rollback |
|-------|--------|------|----------|
| **Phase 0** | Add columns (quotation_id, commande_id, facture_id, status), new tables (payments, credit_notes, audit_logs, number_sequences). Do not change existing queries to use new columns. | Low | Migrations down; new tables can stay empty. |
| **Phase 1** | Implement conversion services + convert buttons + document timeline UI. New flows create links; old flows still work without links. | Low | Hide convert buttons via feature flag; conversions are additive. |
| **Phase 2** | Switch dashboard CA to “CA Facturé” and “CA Encaissé”; run old and new side-by-side for one period; then remove old CA from dashboard. | Medium | Feature flag to choose old vs new CA; keep old query in code until verified. |
| **Phase 3** | Payments + credit notes in daily use; enforce “invoice paid” for CA Encaissé. | Low | Payments/credit notes are additive. |
| **Phase 4** | Stock ledger + reserved stock; all stock changes via StockService. | Medium | Keep current qte updates; ledger is additive; reserved_qty can default to 0. |

**Backward compatibility:**
- Existing Facture/FactureTva/Commande without new FKs remain valid; status defaults to `draft` or `issued` (document current behavior as “issued” for legacy).
- Existing CA logic remains in code behind a config flag until Phase 2 is validated.

---

## 15. Endpoint List (Summary)

| Type | Endpoint / location | Purpose |
|------|---------------------|---------|
| Existing API | POST `filament/routes/api.php`: `/add_commande` | Create order (add stock decrement in Phase 1). |
| Existing API | GET `/commande/{id}` | Order details. |
| Filament | All document CRUD | Via FilamentResource (Quotation, Commande, Facture, FactureTva, Ticket). |
| Filament | Convert actions | Livewire actions calling QuotationConversionService, OrderToBlService, BlToInvoiceService (no new HTTP routes). |
| Filament | Record payment | Modal form → PaymentService (no new route). |
| Optional | POST `/payment/webhook/stripe` | Stripe webhook (if needed). |

---

## 16. QA & Edge Cases

- **Partial shipment:** BL can have quantities < order; conversion Order→BL allows editing qty; invoice from BL uses BL quantities.
- **Partial invoice:** Multiple BLs per order allowed? (Define: one BL per order or many.) Multiple invoices per BL? (Usually one invoice per BL.)
- **Cancellation:** Order canceled → release reserve; do not create BL/Invoice from canceled order. Invoice “canceled” only via credit note (Avoir).
- **Return:** Create Avoir linked to invoice; optionally refund payment.
- **Duplicate prevention:** Conversions create new records with links; “Convert” button hidden or disabled once target exists (e.g. “Already converted” if commande.quotation_id = this devis and commande exists).
- **Numbering:** Concurrent requests use sequence lock; no duplicate BL/FA numbers.
- **Stock:** Out-of-stock on order creation (API): reject or allow with backorder flag; on BL creation from order: validate available qty before creating.

---

## 17. File Path Index (Quick Reference)

| Purpose | Path |
|---------|------|
| Models | `filament/app/Models/` (Quotation, Commande, Facture, FactureTva, Ticket, Payment, CreditNote, CreditNoteDetail, AuditLog, StockMovement) |
| Migrations | `filament/database/migrations/` (see §3) |
| Conversion services | `filament/app/Services/DocumentConversion/QuotationConversionService.php`, `OrderToBlService.php`, `BlToInvoiceService.php` |
| Numbering | `filament/app/Services/NumberSequenceService.php` |
| Payment | `filament/app/Services/PaymentService.php` |
| Revenue reporting | `filament/app/Services/RevenueReportingService.php` or `DashboardMetricsService.php` |
| Dashboard CA | `filament/app/Services/DashboardMetricsService.php`, `DashboardExportController.php` |
| Filament resources | `filament/app/Filament/Resources/QuotationResource.php`, `CommandeResource.php`, `FactureResource.php`, `FactureTvaResource.php`, `CreditNoteResource.php` |
| Timeline widget | `filament/app/Filament/Widgets/DocumentTimelineWidget.php` + view |
| API order | `filament/app/Http/Controllers/Api/CommandeController.php` |
| Enums | `filament/app/Enums/QuotationStatus.php`, `InvoiceStatus.php`, `PaymentStatus.php`, etc. |

---

**Next step:** Implement Phase 0 migrations and model changes, then Phase 1 conversion services and UI (convert buttons + timeline), without changing existing CA logic. After validation, Phase 2 CA switch and Phase 3 payments/credit notes.
