# ERP UI/UX — Document workflow (visible changes)

## What was unclear before and how it was fixed

**Before:** Convert actions (Devis → Commande, Commande → BL, BL → Facture TVA) were small header buttons or hidden in menus; the document chain (Devis → Commande → BL → Facture TVA → Paiement → Avoir) was not visible; list pages had no status filters or row “Convert” actions.

**After:**
- **Sticky action bar** on every document detail page: primary button (orange) = main conversion or “Enregistrer paiement” / “Créer avoir”; secondary = Imprimer or other; “Autres actions” dropdown for the rest.
- **Conversion wizard:** Clicking any “Convert” button opens a modal with a short summary (source N°, client, date, lignes, total TTC) and a “Confirmer la conversion” button. After confirmation, the user is redirected to the new document with a success notification.
- **Document timeline** (“Chaîne de documents”) below the header on Devis, Commande, BL, Facture TVA and Ticket edit pages. Each node shows label, number (or “Non créé”), status, date, total; nodes are clickable when the document exists; “Créer à partir de…” appears where applicable.
- **List pages:** Status filter (Devis: statut; Commandes: already had etat; BL: status). Row actions: Edit, **Transformer en commande** / **Créer BL** / **Transformer en facture TVA** (when applicable), Print, Delete.
- **Visual refresh:** Sticky header, larger primary/secondary buttons (44px min), white cards and timeline panel with borders/shadows, orange primary, badges for statuses.

---

## Files changed

### New files
- `app/Services/DocumentChainService.php` — Builds chain nodes (Devis → … → Avoir) for a given record and document type.
- `app/Livewire/DocumentTimeline.php` — Livewire component that resolves the current document from the route and renders the timeline.
- `app/Filament/Widgets/DocumentTimelineWidget.php` — Filament widget that embeds the Livewire timeline (used in document edit pages).
- `resources/views/filament/livewire/document-timeline.blade.php` — Timeline card markup (nodes, links, “Non créé”, status).
- `resources/views/filament/widgets/document-timeline-widget.blade.php` — Wrapper that renders `@livewire('document-timeline')`.
- `resources/views/filament/components/convert-wizard-summary.blade.php` — Modal content for conversion (source doc summary + hint).
- `docs/ERP_UI_UX_DOCUMENT_WORKFLOW.md` — This file.

### Modified files
- `resources/views/filament/components/custom-admin-styles.blade.php` — Sticky header, large header actions, timeline card and node styles, conversion wizard summary styles.
- `app/Filament/Resources/QuotationResource/Pages/EditQuotation.php` — `getHeaderWidgets()` (timeline), header actions: Primary “Transformer en commande”, Secondary “Imprimer”, ActionGroup “Autres actions”; conversion modal with summary.
- `app/Filament/Resources/QuotationResource.php` — Table: filter `statut` (Brouillon / En attente / Validé / Refusé); row action “Transformer en commande” (when no commande yet).
- `app/Filament/Resources/CommandeResource/Pages/EditCommande.php` — `getHeaderWidgets()`, Primary “Créer BL”, Secondary “Imprimer” (when BL exists), conversion modal with summary, ActionGroup.
- `app/Filament/Resources/CommandeResource.php` — Table: row action “Créer BL” (when no BL yet).
- `app/Filament/Resources/FactureResource/Pages/EditFacture.php` — `getHeaderWidgets()`, Primary “Transformer en facture TVA”, Secondary “Imprimer”, conversion modal, ActionGroup.
- `app/Filament/Resources/FactureResource.php` — Table: filter `status` (Brouillon / Émis / Livré); row action “Transformer en facture TVA” (when no facture TVA and `facture_id` column exists).
- `app/Filament/Resources/FactureTvaResource/Pages/EditFactureTva.php` — `getHeaderWidgets()`, Primary “Enregistrer paiement”, Secondary “Créer un avoir”, Print and Delete in ActionGroup “Autres actions”, size Large on main actions.
- `app/Filament/Resources/TicketResource/Pages/EditTicket.php` — `getHeaderWidgets()`, Primary “Créer facture TVA” (link to create), Secondary “Imprimer”, ActionGroup.

---

## Page-by-page (after change)

| Page | Sticky bar (primary → secondary → more) | Timeline | Conversion modal |
|------|------------------------------------------|----------|------------------|
| **Devis (edit)** | Transformer en commande → Imprimer → Autres (Dupliquer, Supprimer) | Oui (Devis → Commande → BL → Facture TVA → Paiement → Avoir) | Résumé + Confirmer la conversion |
| **Commande (edit)** | Créer BL → Imprimer (si BL) → Autres | Oui | Résumé + Confirmer |
| **BL (edit)** | Transformer en facture TVA → Imprimer → Autres | Oui | Résumé + Confirmer |
| **Facture TVA (edit)** | Enregistrer paiement → Créer un avoir → Autres (Imprimer, Supprimer) | Oui | — |
| **Ticket (edit)** | Créer facture TVA → Imprimer → Autres | Oui (Ticket seul) | — |

---

## QA checklist

- [ ] **Devis**
  - Liste : filtre Statut (Brouillon, En attente, etc.), bouton “Transformer en commande” sur une ligne sans commande, ouverture du modal puis confirmation → redirection vers la commande créée.
  - Fiche : barre sticky avec “Transformer en commande” (orange) et “Imprimer”; timeline avec au moins “Devis” (courant) et “Commande” (Non créé ou lien); clic “Confirmer la conversion” dans le modal → redirection vers la nouvelle commande.
- [ ] **Commande**
  - Liste : action “Créer BL” sur une commande sans BL → confirmation → redirection vers le BL.
  - Fiche : “Créer BL (Bon de livraison)” en primary, “Imprimer” (si BL existe); timeline avec Devis / Commande / BL / …; conversion avec résumé.
- [ ] **BL**
  - Liste : filtre Statut, action “Transformer en facture TVA” (si pas encore de facture TVA) → confirmation → redirection vers la facture TVA.
  - Fiche : “Transformer en facture TVA” en primary, “Imprimer”; timeline; conversion avec résumé.
- [ ] **Facture TVA**
  - Fiche : “Enregistrer paiement” et “Créer un avoir” en primary/secondary; “Imprimer” et “Supprimer” dans “Autres actions”; timeline visible.
- [ ] **Ticket**
  - Fiche : “Créer facture TVA” (lien création) et “Imprimer”; timeline (Ticket).
- [ ] **Global**
  - Header reste visible au scroll (sticky).
  - Boutons principaux bien visibles (taille, couleur orange).
  - Aucune régression : création / édition / suppression / impression inchangées hors UI.
  - Desktop 1440px et 1024px; timeline lisible sur mobile (retour à la ligne).

---

## Technique

- **Timeline:** `DocumentChainService::getChain($record, $type)` retourne les nœuds; `DocumentTimeline` (Livewire) détermine la ressource et l’id depuis la route (`segments` + param `record`), charge le modèle et appelle le service.
- **Conversions:** Inchangées (QuotationConversionService, OrderToBlService, BlToInvoiceService); seuls les modals et le libellé “Confirmer la conversion” ont été ajoutés.
- **Compatibilité:** Si `facture_tvas.facture_id` ou la table `payments` n’existe pas, les parties concernées (lien BL ↔ Facture TVA, encaissements) restent masquées ou sans erreur (guards existants).
