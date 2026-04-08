{{-- Design system: Facturation ERP-lite — cards, tables, badges, spacing (see docs/DESIGN_SYSTEM.md) --}}
<style>
    /* ── Sticky topbar: header stays fixed on scroll, content has top padding ───────────────────── */
    .fi-topbar {
        position: sticky;
        top: 0;
        z-index: 40;
        background: var(--fi-body-bg, #fff);
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.06);
    }
    .dark .fi-topbar {
        background: var(--fi-body-bg);
    }
    .fi-main-ctn {
        padding-top: 0;
    }
    .fi-main-ctn .fi-main {
        padding-top: 1rem;
        padding-left: 1.25rem;
        padding-right: 1.25rem;
    }
    /* Dashboard: tighter top, wider content */
    .fi-page.fi-dashboard .fi-page-header { display: none !important; }
    .fi-page.fi-dashboard .fi-header { display: none !important; }
    .fi-page.fi-dashboard .fi-main {
        padding-top: 0.75rem;
    }
    .fi-page.fi-dashboard .fi-widgets {
        gap: 0.75rem;
    }
    @media (min-width: 1280px) {
        .fi-page.fi-dashboard .fi-main {
            max-width: 1440px;
            margin-left: auto;
            margin-right: auto;
        }
    }
    /* Ensure dropdowns (e.g. global search, user menu) appear above content */
    .fi-topbar [x-data],
    .fi-dropdown-content {
        z-index: 50;
    }

    /* Main content gutter: clear spacing between sidebar and page content (Devis, Commandes, Tickets, Factures) */
    @media (min-width: 1024px) {
        .fi-main-ctn.fi-main-ctn-sidebar-open .fi-main {
            padding-left: 2rem;
        }
    }

    /* Spacing scale 8/12/16/24 */
    .fi-section-content-ctn {
        border-radius: 12px;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
        padding: 20px 24px;
    }
    /* ⚠️ CRITICAL: doc-section-produits must NOT clip the select dropdown.
       box-shadow alone doesn't cause a stacking context, but transform/filter do.
       Adding overflow:visible here to ensure the dropdown escapes. */
    .doc-section-produits .fi-section-content-ctn,
    .doc-section-produits .fi-section-content,
    .doc-section-produits > div {
        overflow: visible !important;
    }
    .fi-ta-table {
        border-radius: 12px;
        overflow: hidden;
    }
    .fi-ta-table thead th {
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }
    .fi-ta-table tbody tr:hover {
        background-color: rgb(249 250 251 / 0.9);
    }
    .dark .fi-ta-table tbody tr:hover {
        background-color: rgb(30 41 59 / 0.5);
    }
    .fi-ta-table tbody tr:nth-child(even) {
        background-color: rgb(249 250 251 / 0.6);
    }
    .dark .fi-ta-table tbody tr:nth-child(even) {
        background-color: rgb(30 41 59 / 0.35);
    }
    .fi-ta-table td.fi-ta-col-total,
    .fi-ta-table td[data-money],
    .fi-ta-table th:has(+ th) .fi-ta-text-item {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }
    /* Primary actions: orange brand */
    .fi-btn-primary,
    .fi-btn-primary:hover {
        --tw-bg-opacity: 1;
        background-color: rgb(249 115 22 / var(--tw-bg-opacity));
    }
    /* Status badges */
    .badge-statut-brouillon { background-color: #6b7280; color: #fff; border-radius: 9999px; padding: 0.25rem 0.625rem; font-size: 0.75rem; font-weight: 500; }
    .badge-statut-valide { background-color: #059669; color: #fff; border-radius: 9999px; padding: 0.25rem 0.625rem; font-size: 0.75rem; font-weight: 500; }
    .badge-statut-refuse { background-color: #dc2626; color: #fff; border-radius: 9999px; padding: 0.25rem 0.625rem; font-size: 0.75rem; font-weight: 500; }
    .badge-statut-attente { background-color: #d97706; color: #fff; border-radius: 9999px; padding: 0.25rem 0.625rem; font-size: 0.75rem; font-weight: 500; }
    /* Form controls: min height for touch */
    .fi-input {
        min-height: 44px;
        border-radius: 8px;
    }
    @media print {
        body * { visibility: hidden; }
        .print-section, .print-section * { visibility: visible; }
        .print-section { position: absolute; left: 0; top: 0; width: 100%; z-index: 9999; }
    }

    /* ── Facture TVA edit page only: header scrolls with page (no sticky) ────── */
    .fi-page-edit-facture-tva .fi-page-header-main-ctn {
        position: static !important;
        top: auto !important;
        z-index: auto;
        background: var(--fi-body-bg, #fff);
        box-shadow: none;
        padding: 12px 0;
        margin: 0 0 12px 0;
        padding-left: 0;
        padding-right: 0;
    }
    .dark .fi-page-edit-facture-tva .fi-page-header-main-ctn { background: var(--fi-body-bg); }
    /* Large, obvious header actions on Facture edit */
    .fi-page-edit-facture-tva .fi-page-header-main-ctn .fi-header-actions .fi-btn {
        min-height: 44px;
        padding: 0.5rem 1rem;
        font-weight: 600;
        border-radius: 10px;
    }
    .fi-page-edit-facture-tva .fi-page-header-main-ctn .fi-header-actions .fi-btn:first-child {
        background-color: rgb(249 115 22);
        color: #fff;
        border-color: rgb(249 115 22);
    }
    .fi-page-edit-facture-tva .fi-page-header-main-ctn .fi-header-actions .fi-btn:first-child:hover {
        background-color: rgb(234 88 12);
        color: #fff;
    }

    /* ── Document edit: two-column layout + sticky Totaux ─────────────────────── */
    .doc-totaux-sidebar {
        position: sticky;
        top: 5rem;
        align-self: start;
    }
    @media (max-width: 1023px) {
        .doc-totaux-sidebar { position: relative; top: 0; }
    }
    /* Net à payer: gros bouton orange (Facture TVA) */
    .doc-net-a-payer-input.fi-input,
    .doc-net-a-payer-input.input {
        font-size: 1.125rem;
        font-weight: 700;
        background-color: rgb(255 237 213);
        border: 2px solid rgb(249 115 22);
        color: rgb(194 65 12);
    }
    .dark .doc-net-a-payer-input.fi-input,
    .dark .doc-net-a-payer-input.input {
        background-color: rgb(67 20 7);
        border-color: rgb(249 115 22);
        color: rgb(254 215 170);
    }
    /* Tighter spacing on document edit sections */
    .fi-fo-section.doc-section-compact .fi-section-content-ctn {
        padding: 12px 16px;
    }
    /* Compact line items: repeater rows */
    .doc-lines-repeater .fi-fo-repeater-items > div {
        padding: 8px 12px;
        border-radius: 8px;
        margin-bottom: 6px;
        border: 1px solid rgb(229 231 235);
    }
    .dark .doc-lines-repeater .fi-fo-repeater-items > div {
        border-color: rgb(75 85 99);
    }
    .doc-lines-repeater .fi-fo-field-wrp-label { font-size: 0.75rem; }
    .doc-lines-repeater .fi-input { min-height: 36px; }
    .doc-line-tva-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 9999px;
        background: rgb(219 234 254);
        color: rgb(29 78 216);
        font-size: 0.8125rem;
        font-weight: 500;
    }
    .dark .doc-line-tva-badge {
        background: rgb(30 58 138);
        color: rgb(191 219 254);
    }
    /* Company compact already in blade */
    .doc-company-compact { max-width: 320px; }

    /* ── Document timeline panel ────────────────────────────────────────────── */
    .doc-timeline-wrap { margin-bottom: 24px; }
    .doc-timeline-card {
        background: var(--fi-body-bg, #fff);
        border: 1px solid rgb(229 231 235);
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.04);
    }
    .dark .doc-timeline-card { border-color: rgb(55 65 81); }
    .doc-timeline-title {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgb(107 114 128);
        margin-bottom: 12px;
    }
    .doc-timeline-track {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 4px;
    }
    .doc-timeline-node {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    .doc-timeline-node-inner {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 8px;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgb(249 250 251);
        border: 1px solid rgb(229 231 235);
        font-size: 0.8125rem;
    }
    .dark .doc-timeline-node-inner { background: rgb(55 65 81); border-color: rgb(75 85 99); }
    .doc-timeline-node-inner--link {
        text-decoration: none;
        color: inherit;
    }
    .doc-timeline-node-inner--link:hover {
        background: rgb(243 244 246);
        border-color: rgb(249 115 22);
    }
    .dark .doc-timeline-node-inner--link:hover { background: rgb(75 85 99); }
    .doc-timeline-node--current .doc-timeline-node-inner {
        background: rgb(255 237 213);
        border-color: rgb(249 115 22);
        font-weight: 600;
    }
    .dark .doc-timeline-node--current .doc-timeline-node-inner { background: rgb(67 20 7); border-color: rgb(249 115 22); }
    .doc-timeline-node-label { font-weight: 500; }
    .doc-timeline-node-number { color: rgb(30 64 175); font-variant-numeric: tabular-nums; }
    .doc-timeline-node-empty { color: rgb(107 114 128); font-style: italic; }
    .doc-timeline-node-status { font-size: 0.6875rem; padding: 2px 6px; border-radius: 9999px; background: rgb(209 213 219); color: rgb(55 65 81); }
    .doc-timeline-node-date, .doc-timeline-node-total { color: rgb(107 114 128); font-size: 0.75rem; }
    .doc-timeline-arrow { color: rgb(156 163 175); padding: 0 4px; font-size: 0.875rem; }
    .doc-badge { display: inline-block; }
    .doc-btn { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; text-decoration: none; }
    .doc-btn--primary { background: rgb(249 115 22); color: #fff; border: none; }
    .doc-btn--primary:hover { background: rgb(234 88 12); color: #fff; }
    .doc-btn--sm { padding: 2px 8px; font-size: 0.6875rem; }

    /* ── Conversion wizard modal ────────────────────────────────────────── */
    .cw-root {
        display: flex;
        align-items: stretch;
        gap: 12px;
        padding: 4px 0;
    }
    .cw-card {
        flex: 1;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 14px 16px;
    }
    .dark .cw-card { background: rgb(30 41 59); border-color: rgb(55 65 81); }
    .cw-card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
    }
    .cw-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }
    .cw-badge--source {
        background: #e0e7ff;
        color: #3730a3;
    }
    .dark .cw-badge--source { background: rgb(49 46 129 / 0.4); color: #a5b4fc; }
    .cw-number {
        font-size: 0.875rem;
        font-weight: 700;
        color: #111827;
        font-variant-numeric: tabular-nums;
    }
    .dark .cw-number { color: #f1f5f9; }
    .cw-dl {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 12px;
    }
    .cw-dl-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.8125rem;
    }
    .cw-dl-row dt {
        color: #6b7280;
        font-weight: 500;
    }
    .cw-dl-row dd {
        color: #111827;
        font-weight: 500;
        margin: 0;
    }
    .dark .cw-dl-row dt { color: #9ca3af; }
    .dark .cw-dl-row dd { color: #e5e7eb; }
    .cw-totals {
        border-top: 1px solid #e5e7eb;
        padding-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .dark .cw-totals { border-color: rgb(55 65 81); }
    .cw-totals-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.8125rem;
        color: #374151;
    }
    .dark .cw-totals-row { color: #d1d5db; }
    .cw-totals-row--dim {
        color: #9ca3af;
        font-size: 0.75rem;
    }
    .cw-totals-row--total {
        font-weight: 700;
        font-size: 0.875rem;
        color: #111827;
        border-top: 1px solid #e5e7eb;
        padding-top: 4px;
        margin-top: 2px;
    }
    .dark .cw-totals-row--total { color: #f9fafb; border-color: rgb(55 65 81); }
    .cw-arrow {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: #9ca3af;
    }
    .cw-target {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        border-radius: 10px;
        border: 1.5px solid;
        min-width: 170px;
    }
    .cw-target-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .cw-target-label {
        font-size: 0.875rem;
        font-weight: 700;
        line-height: 1.3;
    }
    .cw-target-hint {
        font-size: 0.6875rem;
        color: #6b7280;
        margin-top: 1px;
    }
    .dark .cw-target-hint { color: #9ca3af; }
    @media (max-width: 540px) {
        .cw-root { flex-direction: column; align-items: center; }
        .cw-arrow svg { transform: rotate(90deg); }
        .cw-target { min-width: auto; width: 100%; }
    }

    /* ── Products table: compact, responsive, no horizontal scroll ────────────── */
    .fi-resource-table-container {
        width: 100%;
        overflow-x: hidden !important;
    }
    
    .fi-ta-table.fi-resource-table {
        table-layout: fixed !important;
        width: 100% !important;
    }

    /* Compact table rows */
    .fi-ta-table.fi-resource-table thead th {
        padding: 0.625rem 0.75rem !important;
        font-size: 0.6875rem !important;
    }

    .fi-ta-table.fi-resource-table tbody td {
        padding: 0.75rem 0.75rem !important;
        font-size: 0.8125rem !important;
        vertical-align: middle !important;
    }

    /* Text columns: truncate with ellipsis */
    .fi-ta-table.fi-resource-table tbody td .fi-ta-text-item,
    .fi-ta-table.fi-resource-table tbody td .fi-ta-text-item-label {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        display: block !important;
    }

    /* Badge styling: smaller and more compact */
    .fi-ta-table.fi-resource-table tbody td .fi-badge {
        font-size: 0.6875rem !important;
        padding: 0.125rem 0.5rem !important;
    }

    /* Premium hover effect */
    .fi-ta-table.fi-resource-table tbody tr {
        transition: all 0.15s ease;
    }

    .fi-ta-table.fi-resource-table tbody tr:hover {
        background-color: rgba(59, 130, 246, 0.04) !important;
        transform: translateX(2px);
    }

    /* Icon columns: smaller */
    .fi-ta-table.fi-resource-table tbody td .fi-ta-icon-item {
        width: 1.125rem !important;
        height: 1.125rem !important;
    }

    /* Money columns: right-aligned with tabular nums */
    .fi-ta-table.fi-resource-table tbody td .fi-ta-money-item {
        text-align: right !important;
        font-variant-numeric: tabular-nums !important;
        font-weight: 500 !important;
    }

    /* ── Products list page specific styles ──────────────────────────────────── */
    .products-list-page .fi-resource-table-container {
        width: 100% !important;
        max-width: 100vw !important;
        overflow-x: hidden !important;
    }
    
    /* Compact and premium table design */
    .products-list-page .fi-ta-table {
        font-size: 0.8125rem !important;
    }
    
    .products-list-page .fi-ta-table thead th {
        background: linear-gradient(to bottom, #f8fafc, #f1f5f9) !important;
        border-bottom: 2px solid #e2e8f0 !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        font-size: 0.6875rem !important;
        color: #475569 !important;
        padding: 0.75rem 0.5rem !important;
    }
    
    .products-list-page .fi-ta-table tbody td {
        padding: 0.625rem 0.5rem !important;
        border-bottom: 1px solid #f1f5f9 !important;
    }
    
    /* Premium row hover */
    .products-list-page .fi-ta-table tbody tr {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    .products-list-page .fi-ta-table tbody tr:hover {
        background: linear-gradient(to right, rgba(59, 130, 246, 0.03), rgba(59, 130, 246, 0.06)) !important;
        box-shadow: inset 3px 0 0 0 #3b82f6 !important;
    }
</style>
