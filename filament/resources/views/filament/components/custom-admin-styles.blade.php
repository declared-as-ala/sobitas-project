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
    /* Main content: top padding so content does not render under the sticky header */
    .fi-main-ctn {
        padding-top: 0;
    }
    .fi-main-ctn .fi-main {
        padding-top: 4rem;
        padding-left: 1.5rem;
        padding-right: 1.5rem;
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

    /* ── Document pages: header scrolls normally (no sticky overlap) ─────────── */
    .fi-page-header-main-ctn {
        position: static;
        top: auto;
        z-index: auto;
        background: var(--fi-body-bg, #fff);
        box-shadow: none;
        padding: 12px 0;
        margin: 0 0 12px 0;
        padding-left: 0;
        padding-right: 0;
    }
    .dark .fi-page-header-main-ctn { background: var(--fi-body-bg); }
    /* Large, obvious header actions */
    .fi-page-header-main-ctn .fi-header-actions .fi-btn {
        min-height: 44px;
        padding: 0.5rem 1rem;
        font-weight: 600;
        border-radius: 10px;
    }
    .fi-page-header-main-ctn .fi-header-actions .fi-btn:first-child {
        background-color: rgb(249 115 22);
        color: #fff;
        border-color: rgb(249 115 22);
    }
    .fi-page-header-main-ctn .fi-header-actions .fi-btn:first-child:hover {
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

    /* Conversion wizard summary */
    .convert-wizard-summary { padding: 8px 0; }
    .convert-wizard-label { font-size: 0.75rem; font-weight: 600; color: rgb(107 114 128); margin-bottom: 8px; }
    .convert-wizard-dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; font-size: 0.875rem; }
    .convert-wizard-dl dt { color: rgb(107 114 128); }
    .convert-wizard-dl dd { margin: 0; }
    .convert-wizard-hint { margin-top: 16px; font-size: 0.8125rem; color: rgb(107 114 128); }
</style>
