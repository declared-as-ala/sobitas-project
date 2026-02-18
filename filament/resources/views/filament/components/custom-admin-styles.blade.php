{{-- Modern fiche/card styling for Devis, Tickets, Factures + print behavior --}}
<style>
    /* Card / Section styling (SaaS-style) */
    .fi-section-content-ctn {
        border-radius: 14px;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
        padding: 20px 24px;
    }
    .fi-ta-table {
        border-radius: 12px;
        overflow: hidden;
    }
    .fi-ta-table tbody tr:nth-child(even) {
        background-color: rgb(249 250 251 / 0.8);
    }
    .dark .fi-ta-table tbody tr:nth-child(even) {
        background-color: rgb(30 41 59 / 0.4);
    }
    .fi-ta-table td.fi-ta-col-total,
    .fi-ta-table td[data-money],
    .fi-ta-table th:has(+ th) .fi-ta-text-item {
        text-align: right;
    }
    /* Status badges (reusable) */
    .badge-statut-brouillon { background-color: #6b7280; color: #fff; }
    .badge-statut-valide { background-color: #059669; color: #fff; }
    .badge-statut-refuse { background-color: #dc2626; color: #fff; }
    .badge-statut-attente { background-color: #d97706; color: #fff; }
    /* Print: only show content when printing from modal */
    @media print {
        body * {
            visibility: hidden;
        }
        .print-section,
        .print-section * {
            visibility: visible;
        }
        .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            z-index: 9999;
        }
    }
</style>
