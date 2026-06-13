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

    /* ── Blog article — Rédaction (Visuel / HTML + SEO metrics) ─────────────── */
    .article-redaction-section.fi-section .fi-section-content-ctn {
        border-radius: 14px;
        border: 1px solid rgb(226 232 240 / 0.95);
        background: linear-gradient(165deg, rgb(248 250 252) 0%, rgb(255 255 255) 45%, rgb(255 255 255) 100%);
        box-shadow: 0 1px 2px rgb(15 23 42 / 0.04), 0 4px 24px -4px rgb(59 130 246 / 0.06);
    }
    .dark .article-redaction-section.fi-section .fi-section-content-ctn {
        border-color: rgb(51 65 85 / 0.85);
        background: linear-gradient(165deg, rgb(30 41 59 / 0.5) 0%, rgb(15 23 42 / 0.55) 100%);
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
    }

    .article-redaction-section .fi-fo-toggle-buttons-wrp {
        margin-bottom: 0.35rem;
    }

    .article-redaction-rich-editor .fi-fo-rich-editor {
        border-radius: 12px;
        border: 1px solid rgb(226 232 240);
        box-shadow: 0 1px 2px rgb(15 23 42 / 0.05);
        overflow: hidden;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .article-redaction-rich-editor .fi-fo-rich-editor:focus-within {
        border-color: rgb(147 197 253);
        box-shadow: 0 0 0 3px rgb(59 130 246 / 0.12);
    }
    .dark .article-redaction-rich-editor .fi-fo-rich-editor {
        border-color: rgb(51 65 85);
    }
    .dark .article-redaction-rich-editor .fi-fo-rich-editor:focus-within {
        border-color: rgb(96 165 250 / 0.5);
        box-shadow: 0 0 0 3px rgb(59 130 246 / 0.18);
    }

    .article-redaction-html-field textarea.article-html-source-input {
        min-height: 22rem;
        border-radius: 12px !important;
        border: 1px solid rgb(226 232 240) !important;
        padding: 1rem 1.125rem !important;
        line-height: 1.55;
        background: rgb(252 252 253);
        box-shadow: inset 0 1px 2px rgb(15 23 42 / 0.04);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .article-redaction-html-field textarea.article-html-source-input:focus {
        border-color: rgb(147 197 253) !important;
        box-shadow: inset 0 1px 2px rgb(15 23 42 / 0.04), 0 0 0 3px rgb(59 130 246 / 0.12) !important;
    }
    .dark .article-redaction-html-field textarea.article-html-source-input {
        border-color: rgb(51 65 85) !important;
        background: rgb(15 23 42 / 0.72);
        color: rgb(226 232 240);
    }
    .dark .article-redaction-html-field textarea.article-html-source-input:focus {
        border-color: rgb(96 165 250 / 0.45) !important;
        box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.2), 0 0 0 3px rgb(59 130 246 / 0.2) !important;
    }

    .article-seo-metrics {
        margin-top: 0.5rem;
        border-radius: 12px;
        border: 1px solid rgb(226 232 240 / 0.95);
        background: rgb(255 255 255);
        padding: 1rem 1.125rem 1.125rem;
        box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
    }
    .dark .article-seo-metrics {
        border-color: rgb(51 65 85 / 0.9);
        background: rgb(15 23 42 / 0.4);
    }

    .article-seo-metrics__header {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 0.875rem;
    }
    .article-seo-metrics__icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.375rem;
        height: 2.375rem;
        border-radius: 10px;
        color: rgb(37 99 235);
        background: linear-gradient(145deg, rgb(219 234 254), rgb(239 246 255));
        border: 1px solid rgb(191 219 254 / 0.8);
    }
    .dark .article-seo-metrics__icon {
        color: rgb(147 197 253);
        background: linear-gradient(145deg, rgb(30 58 138 / 0.45), rgb(30 64 175 / 0.35));
        border-color: rgb(59 130 246 / 0.35);
    }
    .article-seo-metrics__title {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: rgb(15 23 42);
    }
    .dark .article-seo-metrics__title {
        color: rgb(248 250 252);
    }
    .article-seo-metrics__subtitle {
        margin: 0.125rem 0 0;
        font-size: 0.6875rem;
        line-height: 1.35;
        color: rgb(100 116 139);
    }
    .dark .article-seo-metrics__subtitle {
        color: rgb(148 163 184);
    }

    .article-seo-metrics__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
    }
    @media (min-width: 640px) {
        .article-seo-metrics__grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }
    @media (min-width: 1024px) {
        .article-seo-metrics__grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
        }
    }

    .article-seo-metrics__tile {
        border-radius: 10px;
        padding: 0.5rem 0.625rem;
        background: rgb(248 250 252);
        border: 1px solid rgb(241 245 249);
        min-height: 3.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        transition: background 0.15s ease, border-color 0.15s ease;
    }
    .article-seo-metrics__tile:hover {
        border-color: rgb(226 232 240);
        background: rgb(255 255 255);
    }
    .dark .article-seo-metrics__tile {
        background: rgb(30 41 59 / 0.45);
        border-color: rgb(51 65 85 / 0.6);
    }
    .dark .article-seo-metrics__tile:hover {
        border-color: rgb(71 85 105 / 0.8);
        background: rgb(30 41 59 / 0.65);
    }
    .article-seo-metrics__tile-label {
        margin: 0;
        font-size: 0.5625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgb(100 116 139);
    }
    .dark .article-seo-metrics__tile-label {
        color: rgb(148 163 184);
    }
    .article-seo-metrics__tile-value {
        margin: 0.125rem 0 0;
        font-size: 1.125rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
        color: rgb(15 23 42);
        line-height: 1.2;
    }
    .dark .article-seo-metrics__tile-value {
        color: rgb(248 250 252);
    }

    .article-seo-metrics__excerpt {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px dashed rgb(226 232 240);
    }
    .dark .article-seo-metrics__excerpt {
        border-top-color: rgb(51 65 85);
    }
    .article-seo-metrics__excerpt-label {
        display: block;
        font-size: 0.5625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: rgb(100 116 139);
        margin-bottom: 0.25rem;
    }
    .dark .article-seo-metrics__excerpt-label {
        color: rgb(148 163 184);
    }
    .article-seo-metrics__excerpt-body {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.45;
        color: rgb(71 85 105);
    }
    .dark .article-seo-metrics__excerpt-body {
        color: rgb(203 213 225);
    }


    /* ═══════════════════════════════════════════════════════════════
       SIDEBAR — Bootstrap 5 Visual Design System
       Light sidebar (matches Filament default), color-coded groups, per-item icons
    ═══════════════════════════════════════════════════════════════ */

    /* ── Load Bootstrap Icons font (no CSS collision with Tailwind) ── */
    @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css');

    /* ── CSS Variables ──────────────────────────────────────────── */
    :root {
        --sb-bg:            transparent;
        --sb-bg-hover:      rgba(59,130,246,0.07);
        --sb-bg-active:     rgba(59,130,246,0.10);
        --sb-border:        rgba(226,232,240,0.8);
        --sb-text:          #475569;
        --sb-text-active:   #0f172a;
        --sb-text-label:    #64748b;
        --sb-radius:        10px;
        --sb-item-radius:   8px;
        --sb-transition:    all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
        --sb-shadow:        none;
        /* Group accent colors */
        --color-commandes:      #3b82f6;
        --color-facturation:    #10b981;
        --color-clients:        #f59e0b;
        --color-vente:          #f97316;
        --color-catalogue:      #8b5cf6;
        --color-blog:           #06b6d4;
        --color-marketing:      #ec4899;
        --color-partenaires:    #14b8a6;
        --color-seo:            #84cc16;
        --color-parametres:     #6366f1;
        --color-systeme:        #ef4444;
    }

    /* ── Sidebar Container ──────────────────────────────────────── */
    /* No background override — let Filament's own light/dark theming control it */

    /* Sidebar inner scroll area */
    .fi-sidebar-nav {
        padding: 0.5rem 0.5rem 1.5rem !important;
        overflow-y: auto !important;
        scrollbar-width: thin;
        scrollbar-color: rgba(148,163,184,0.3) transparent;
    }
    .fi-sidebar-nav::-webkit-scrollbar { width: 4px; }
    .fi-sidebar-nav::-webkit-scrollbar-track { background: transparent; }
    .fi-sidebar-nav::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 2px; }

    /* ── Group Wrapper ──────────────────────────────────────────── */
    .fi-sidebar-group {
        margin: 0.3rem 0 !important;
        border-radius: var(--sb-radius) !important;
        overflow: visible !important;
        border-left: none !important;
        background: transparent !important;
        transition: var(--sb-transition) !important;
    }

    /* ── Group Header / Label ───────────────────────────────────── */
    .fi-sidebar-group-header {
        display: flex !important;
        align-items: center !important;
        gap: 0.5rem !important;
        padding: 0.45rem 0.65rem !important;
        margin-bottom: 0.1rem !important;
        border-radius: 7px !important;
        border-bottom: none !important;
        cursor: pointer !important;
        transition: var(--sb-transition) !important;
    }
    .fi-sidebar-group-header:hover {
        background: rgba(59,130,246,0.05) !important;
    }

    .fi-sidebar-group-label {
        font-size: 0.6875rem !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.08em !important;
        color: var(--sb-text-label) !important;
    }

    /* Group chevron/toggle icon */
    .fi-sidebar-group-header svg:last-child {
        margin-left: auto !important;
        width: 0.875rem !important;
        height: 0.875rem !important;
        color: #94a3b8 !important;
        transition: transform 0.2s ease !important;
    }

    /* ── Nav Items ──────────────────────────────────────────────── */
    .fi-sidebar-item {
        margin: 0.0625rem 0 !important;
    }

    .fi-sidebar-item-button {
        display: flex !important;
        align-items: center !important;
        gap: 0.6rem !important;
        width: 100% !important;
        padding: 0.525rem 0.75rem !important;
        border-radius: var(--sb-item-radius) !important;
        font-size: 0.835rem !important;
        font-weight: 500 !important;
        color: var(--sb-text) !important;
        text-decoration: none !important;
        background: transparent !important;
        border: none !important;
        transition: var(--sb-transition) !important;
        position: relative !important;
        overflow: hidden !important;
        cursor: pointer !important;
    }

    .fi-sidebar-item-button::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: transparent;
        transition: var(--sb-transition);
    }

    /* Hover state */
    .fi-sidebar-item-button:hover {
        background: var(--sb-bg-hover) !important;
        color: var(--sb-text-active) !important;
        transform: translateX(3px) !important;
    }
    .fi-sidebar-item-button:hover::before {
        background: var(--sb-accent, #3b82f6);
        opacity: 0.5;
    }

    /* Active state */
    .fi-sidebar-item-active .fi-sidebar-item-button,
    .fi-sidebar-item-button[aria-current="page"] {
        background: var(--sb-bg-active) !important;
        color: var(--sb-text-active) !important;
        font-weight: 600 !important;
    }
    .fi-sidebar-item-active .fi-sidebar-item-button::before,
    .fi-sidebar-item-button[aria-current="page"]::before {
        background: var(--sb-accent, #3b82f6) !important;
        opacity: 1;
    }

    /* ── Item Icons (Heroicons from Filament) ───────────────────── */
    .fi-sidebar-item-icon {
        width: 1.2rem !important;
        height: 1.2rem !important;
        flex-shrink: 0 !important;
        opacity: 0.7 !important;
        transition: var(--sb-transition) !important;
    }
    .fi-sidebar-item-button:hover .fi-sidebar-item-icon,
    .fi-sidebar-item-active .fi-sidebar-item-icon {
        opacity: 1 !important;
    }

    /* ── Bootstrap Icon Prefix (injected by JS) ─────────────────── */
    .sb-bi {
        font-family: "bootstrap-icons" !important;
        font-size: 1rem !important;
        line-height: 1 !important;
        flex-shrink: 0 !important;
        width: 1.1rem !important;
        text-align: center !important;
        opacity: 0.75;
        transition: var(--sb-transition) !important;
    }
    .fi-sidebar-item-button:hover .sb-bi,
    .fi-sidebar-item-active .sb-bi {
        opacity: 1 !important;
    }

    /* ═══════════════════════════════════════════════════════════
       COLOR-CODED GROUPS — Accent borders + colored icons/labels
    ═══════════════════════════════════════════════════════════ */

    /* Shared group accent pill */
    .fi-sidebar-group[data-sb-group] .fi-sidebar-group-label {
        display: flex !important;
        align-items: center !important;
        gap: 0.4rem !important;
    }
    .fi-sidebar-group[data-sb-group] .fi-sidebar-group-header {
        border-left: 3px solid !important;
        padding-left: 0.6rem !important;
        border-radius: 0 7px 7px 0 !important;
    }

    /* ── Commandes (Blue) ── */
    .fi-sidebar-group[data-sb-group="commandes"] {
        --sb-accent: var(--color-commandes);
    }
    .fi-sidebar-group[data-sb-group="commandes"] .fi-sidebar-group-header {
        border-left-color: var(--color-commandes) !important;
    }
    .fi-sidebar-group[data-sb-group="commandes"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="commandes"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-commandes) !important;
    }
    .fi-sidebar-group[data-sb-group="commandes"] .fi-sidebar-item-active .fi-sidebar-item-button::before,
    .fi-sidebar-group[data-sb-group="commandes"] .fi-sidebar-item-button:hover::before {
        background: var(--color-commandes) !important;
    }
    .fi-sidebar-group[data-sb-group="commandes"] .fi-sidebar-item-active .sb-bi,
    .fi-sidebar-group[data-sb-group="commandes"] .fi-sidebar-item-active .fi-sidebar-item-icon {
        color: var(--color-commandes) !important;
    }

    /* ── Facturation (Emerald) ── */
    .fi-sidebar-group[data-sb-group="facturation"] {
        --sb-accent: var(--color-facturation);
    }
    .fi-sidebar-group[data-sb-group="facturation"] .fi-sidebar-group-header {
        border-left-color: var(--color-facturation) !important;
    }
    .fi-sidebar-group[data-sb-group="facturation"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="facturation"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-facturation) !important;
    }
    .fi-sidebar-group[data-sb-group="facturation"] .fi-sidebar-item-active .fi-sidebar-item-button::before,
    .fi-sidebar-group[data-sb-group="facturation"] .fi-sidebar-item-button:hover::before {
        background: var(--color-facturation) !important;
    }
    .fi-sidebar-group[data-sb-group="facturation"] .fi-sidebar-item-active .sb-bi,
    .fi-sidebar-group[data-sb-group="facturation"] .fi-sidebar-item-active .fi-sidebar-item-icon {
        color: var(--color-facturation) !important;
    }

    /* ── Clients (Amber) ── */
    .fi-sidebar-group[data-sb-group="clients"] {
        --sb-accent: var(--color-clients);
    }
    .fi-sidebar-group[data-sb-group="clients"] .fi-sidebar-group-header {
        border-left-color: var(--color-clients) !important;
    }
    .fi-sidebar-group[data-sb-group="clients"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="clients"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-clients) !important;
    }
    .fi-sidebar-group[data-sb-group="clients"] .fi-sidebar-item-active .fi-sidebar-item-button::before,
    .fi-sidebar-group[data-sb-group="clients"] .fi-sidebar-item-button:hover::before {
        background: var(--color-clients) !important;
    }
    .fi-sidebar-group[data-sb-group="clients"] .fi-sidebar-item-active .sb-bi,
    .fi-sidebar-group[data-sb-group="clients"] .fi-sidebar-item-active .fi-sidebar-item-icon {
        color: var(--color-clients) !important;
    }

    /* ── Vente (Orange) ── */
    .fi-sidebar-group[data-sb-group="vente"] {
        --sb-accent: var(--color-vente);
    }
    .fi-sidebar-group[data-sb-group="vente"] .fi-sidebar-group-header {
        border-left-color: var(--color-vente) !important;
    }
    .fi-sidebar-group[data-sb-group="vente"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="vente"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-vente) !important;
    }
    .fi-sidebar-group[data-sb-group="vente"] .fi-sidebar-item-active .fi-sidebar-item-button::before,
    .fi-sidebar-group[data-sb-group="vente"] .fi-sidebar-item-button:hover::before {
        background: var(--color-vente) !important;
    }
    .fi-sidebar-group[data-sb-group="vente"] .fi-sidebar-item-active .sb-bi,
    .fi-sidebar-group[data-sb-group="vente"] .fi-sidebar-item-active .fi-sidebar-item-icon {
        color: var(--color-vente) !important;
    }

    /* ── Catalogue (Violet) ── */
    .fi-sidebar-group[data-sb-group="catalogue"] {
        --sb-accent: var(--color-catalogue);
    }
    .fi-sidebar-group[data-sb-group="catalogue"] .fi-sidebar-group-header {
        border-left-color: var(--color-catalogue) !important;
    }
    .fi-sidebar-group[data-sb-group="catalogue"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="catalogue"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-catalogue) !important;
    }
    .fi-sidebar-group[data-sb-group="catalogue"] .fi-sidebar-item-active .fi-sidebar-item-button::before,
    .fi-sidebar-group[data-sb-group="catalogue"] .fi-sidebar-item-button:hover::before {
        background: var(--color-catalogue) !important;
    }
    .fi-sidebar-group[data-sb-group="catalogue"] .fi-sidebar-item-active .sb-bi,
    .fi-sidebar-group[data-sb-group="catalogue"] .fi-sidebar-item-active .fi-sidebar-item-icon {
        color: var(--color-catalogue) !important;
    }

    /* ── Blog (Cyan) ── */
    .fi-sidebar-group[data-sb-group="blog"] {
        --sb-accent: var(--color-blog);
    }
    .fi-sidebar-group[data-sb-group="blog"] .fi-sidebar-group-header {
        border-left-color: var(--color-blog) !important;
    }
    .fi-sidebar-group[data-sb-group="blog"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="blog"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-blog) !important;
    }
    .fi-sidebar-group[data-sb-group="blog"] .fi-sidebar-item-active .fi-sidebar-item-button::before,
    .fi-sidebar-group[data-sb-group="blog"] .fi-sidebar-item-button:hover::before {
        background: var(--color-blog) !important;
    }
    .fi-sidebar-group[data-sb-group="blog"] .fi-sidebar-item-active .sb-bi,
    .fi-sidebar-group[data-sb-group="blog"] .fi-sidebar-item-active .fi-sidebar-item-icon {
        color: var(--color-blog) !important;
    }

    /* ── Marketing (Pink) ── */
    .fi-sidebar-group[data-sb-group="marketing"] {
        --sb-accent: var(--color-marketing);
    }
    .fi-sidebar-group[data-sb-group="marketing"] .fi-sidebar-group-header {
        border-left-color: var(--color-marketing) !important;
    }
    .fi-sidebar-group[data-sb-group="marketing"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="marketing"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-marketing) !important;
    }
    .fi-sidebar-group[data-sb-group="marketing"] .fi-sidebar-item-active .fi-sidebar-item-button::before,
    .fi-sidebar-group[data-sb-group="marketing"] .fi-sidebar-item-button:hover::before {
        background: var(--color-marketing) !important;
    }
    .fi-sidebar-group[data-sb-group="marketing"] .fi-sidebar-item-active .sb-bi,
    .fi-sidebar-group[data-sb-group="marketing"] .fi-sidebar-item-active .fi-sidebar-item-icon {
        color: var(--color-marketing) !important;
    }

    /* ── Partenaires (Teal) ── */
    .fi-sidebar-group[data-sb-group="partenaires"] {
        --sb-accent: var(--color-partenaires);
    }
    .fi-sidebar-group[data-sb-group="partenaires"] .fi-sidebar-group-header {
        border-left-color: var(--color-partenaires) !important;
    }
    .fi-sidebar-group[data-sb-group="partenaires"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="partenaires"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-partenaires) !important;
    }
    .fi-sidebar-group[data-sb-group="partenaires"] .fi-sidebar-item-active .fi-sidebar-item-button::before,
    .fi-sidebar-group[data-sb-group="partenaires"] .fi-sidebar-item-button:hover::before {
        background: var(--color-partenaires) !important;
    }
    .fi-sidebar-group[data-sb-group="partenaires"] .fi-sidebar-item-active .sb-bi,
    .fi-sidebar-group[data-sb-group="partenaires"] .fi-sidebar-item-active .fi-sidebar-item-icon {
        color: var(--color-partenaires) !important;
    }

    /* ── SEO (Lime) ── */
    .fi-sidebar-group[data-sb-group="seo"] {
        --sb-accent: var(--color-seo);
    }
    .fi-sidebar-group[data-sb-group="seo"] .fi-sidebar-group-header {
        border-left-color: var(--color-seo) !important;
    }
    .fi-sidebar-group[data-sb-group="seo"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="seo"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-seo) !important;
    }
    .fi-sidebar-group[data-sb-group="seo"] .fi-sidebar-item-active .fi-sidebar-item-button::before,
    .fi-sidebar-group[data-sb-group="seo"] .fi-sidebar-item-button:hover::before {
        background: var(--color-seo) !important;
    }
    .fi-sidebar-group[data-sb-group="seo"] .fi-sidebar-item-active .sb-bi,
    .fi-sidebar-group[data-sb-group="seo"] .fi-sidebar-item-active .fi-sidebar-item-icon {
        color: var(--color-seo) !important;
    }

    /* ── Paramètres (Slate) ── */
    .fi-sidebar-group[data-sb-group="parametres"] {
        --sb-accent: var(--color-parametres);
    }
    .fi-sidebar-group[data-sb-group="parametres"] .fi-sidebar-group-header {
        border-left-color: var(--color-parametres) !important;
    }
    .fi-sidebar-group[data-sb-group="parametres"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="parametres"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-parametres) !important;
    }

    /* ── Système (Indigo) ── */
    .fi-sidebar-group[data-sb-group="systeme"] {
        --sb-accent: var(--color-systeme);
    }
    .fi-sidebar-group[data-sb-group="systeme"] .fi-sidebar-group-header {
        border-left-color: var(--color-systeme) !important;
    }
    .fi-sidebar-group[data-sb-group="systeme"] .fi-sidebar-group-label,
    .fi-sidebar-group[data-sb-group="systeme"] .fi-sidebar-group-header svg:first-of-type {
        color: var(--color-systeme) !important;
    }

    /* ── Main content: proper offset from sidebar ──────────────── */
    @media (min-width: 1024px) {
        .fi-main-ctn.fi-main-ctn-sidebar-open .fi-main {
            padding-left: 2rem !important;
        }
    }
</style>


<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

<script>
(function () {
    'use strict';

    /* ── Group → data attribute key mapping ── */
    const GROUP_MAP = [
        { match: 'commande',     key: 'commandes'   },
        { match: 'factur',       key: 'facturation' },
        { match: 'ticket',       key: 'facturation' },
        { match: 'client',       key: 'clients'     },
        { match: 'vente',        key: 'vente'       },
        { match: 'coupon',       key: 'vente'       },
        { match: 'catalogue',    key: 'catalogue'   },
        { match: 'blog',         key: 'blog'        },
        { match: 'marketing',    key: 'marketing'   },
        { match: 'partenaire',   key: 'partenaires' },
        { match: 'seo',          key: 'seo'         },
        { match: 'param',        key: 'parametres'  },
        { match: 'syst',         key: 'systeme'     },
    ];

    /* ── Per-item icon lookup (Bootstrap Icons codepoints via class) ── */
    const ICON_MAP = [
        /* Commandes */
        { match: 'commande',               icon: 'bi-cart-check'                   },
        /* Facturation */
        { match: 'bon de livraison',        icon: 'bi-truck'                        },
        { match: 'bons de livraison',       icon: 'bi-truck'                        },
        { match: 'facture tva',             icon: 'bi-receipt'                      },
        { match: 'factures tva',            icon: 'bi-receipt'                      },
        { match: 'avoir',                   icon: 'bi-arrow-counterclockwise'       },
        { match: 'note de cr',              icon: 'bi-arrow-counterclockwise'       },
        { match: 'devis',                   icon: 'bi-file-earmark-check'           },
        { match: 'liste de prix',           icon: 'bi-tags'                         },
        { match: 'ticket',                  icon: 'bi-ticket-perforated'            },
        /* Clients */
        { match: 'client',                  icon: 'bi-people'                       },
        { match: 'fidélit',                 icon: 'bi-award'                        },
        { match: 'fidelit',                 icon: 'bi-award'                        },
        { match: 'carte',                   icon: 'bi-credit-card'                  },
        { match: 'cartes',                  icon: 'bi-credit-card'                  },
        { match: 'batch',                   icon: 'bi-stack'                        },
        { match: 'transaction',             icon: 'bi-arrow-left-right'             },
        /* Vente */
        { match: 'coupon',                  icon: 'bi-percent'                      },
        /* Catalogue */
        { match: 'produit',                 icon: 'bi-box-seam'                     },
        { match: 'catégorie',               icon: 'bi-grid'                         },
        { match: 'categorie',               icon: 'bi-grid'                         },
        { match: 'sous-catégorie',          icon: 'bi-diagram-3'                    },
        { match: 'sous-categorie',          icon: 'bi-diagram-3'                    },
        { match: 'marque',                  icon: 'bi-shield-check'                 },
        { match: 'arôme',                   icon: 'bi-droplet'                      },
        { match: 'arome',                   icon: 'bi-droplet'                      },
        { match: 'tag',                     icon: 'bi-tag'                          },
        /* Blog */
        { match: 'article',                 icon: 'bi-newspaper'                    },
        { match: "type d'article",          icon: 'bi-journals'                     },
        /* Partenaires */
        { match: 'partenaire',              icon: 'bi-handshake'                    },
        { match: 'code promo',              icon: 'bi-qr-code'                      },
        { match: 'commission',              icon: 'bi-cash-stack'                   },
        { match: 'coach',                   icon: 'bi-person-video3'                },
        { match: 'gym',                     icon: 'bi-building'                     },
        /* Marketing */
        { match: 'contact',                 icon: 'bi-envelope'                     },
        { match: 'newsletter',              icon: 'bi-at'                           },
        { match: 'faq',                     icon: 'bi-question-circle'              },
        { match: 'service',                 icon: 'bi-tools'                        },
        { match: 'modèle',                  icon: 'bi-palette'                      },
        { match: 'modele',                  icon: 'bi-palette'                      },
        { match: 'message',                 icon: 'bi-chat-dots'                    },
        /* SEO */
        { match: 'redirection',             icon: 'bi-arrow-repeat'                 },
        { match: 'avis',                    icon: 'bi-star'                         },
        { match: 'page seo',                icon: 'bi-search'                       },
        { match: 'pages seo',               icon: 'bi-search'                       },
        /* Paramètres */
        { match: 'page',                    icon: 'bi-file-text'                    },
        { match: 'diapositive',             icon: 'bi-images'                       },
        { match: 'slide',                   icon: 'bi-images'                       },
        { match: 'annonce',                 icon: 'bi-megaphone'                    },
        { match: 'navigation',              icon: 'bi-list-nested'                  },
        { match: 'coordonn',                icon: 'bi-geo-alt'                      },
        /* Système */
        { match: 'utilisateur',             icon: 'bi-person-gear'                  },
        { match: 'user',                    icon: 'bi-person-gear'                  },
        /* Dashboard fallback */
        { match: 'dashboard',               icon: 'bi-speedometer2'                 },
        { match: 'tableau de bord',         icon: 'bi-speedometer2'                 },
    ];

    function getIcon(label) {
        const lower = label.toLowerCase();
        for (const entry of ICON_MAP) {
            if (lower.includes(entry.match)) return entry.icon;
        }
        return null;
    }

    function getGroupKey(label) {
        const lower = label.toLowerCase();
        for (const entry of GROUP_MAP) {
            if (lower.includes(entry.match)) return entry.key;
        }
        return null;
    }

    function enhanceSidebar() {
        /* 1 — Apply color group keys */
        document.querySelectorAll('.fi-sidebar-group-label').forEach(label => {
            const group = label.closest('.fi-sidebar-group');
            if (!group) return;
            const key = getGroupKey(label.textContent.trim());
            if (key) group.setAttribute('data-sb-group', key);
        });

        /* 2 — Inject Bootstrap Icons per nav item
           Filament v3 renders: <a class="fi-sidebar-item-button">
             <svg class="fi-sidebar-item-icon">...</svg>
             <span class="truncate">Label Text</span>
           </a>
           We add a <i class="bi ..."> BEFORE the truncate span.
        */
        document.querySelectorAll('.fi-sidebar-item-button').forEach(btn => {
            if (btn.querySelector('.sb-bi')) return; // already processed

            /* Try all known Filament v3 label selectors */
            const labelEl =
                btn.querySelector('span.truncate') ||
                btn.querySelector('.fi-sidebar-item-label') ||
                btn.querySelector('span:not([class*="icon"])') ||
                [...btn.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());

            if (!labelEl) return;

            const labelText = (labelEl.textContent || labelEl.nodeValue || '').trim();
            if (!labelText) return;

            const iconClass = getIcon(labelText);
            if (!iconClass) return;

            const bi = document.createElement('i');
            bi.className = `bi ${iconClass} sb-bi`;
            bi.setAttribute('aria-hidden', 'true');
            bi.title = labelText;

            /* Insert the Bootstrap Icon right before the label span */
            labelEl.parentNode.insertBefore(bi, labelEl);
        });
    }

    /* Run immediately, on DOMContentLoaded, and on every Livewire SPA navigation */
    function tryRun() {
        if (document.querySelector('.fi-sidebar')) {
            enhanceSidebar();
        }
    }

    document.addEventListener('DOMContentLoaded', tryRun);
    document.addEventListener('livewire:navigated', tryRun);
    document.addEventListener('livewire:navigate', tryRun);

    /* Alpine / Livewire init fallback */
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        tryRun();
        /* Retry a bit later for Livewire hydration */
        setTimeout(tryRun, 400);
        setTimeout(tryRun, 1200);
    }

    /* MutationObserver for dynamic sidebar rendering */
    const observer = new MutationObserver(() => {
        if (document.querySelector('.fi-sidebar-item-button:not(:has(.sb-bi))')) {
            enhanceSidebar();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
</script>

