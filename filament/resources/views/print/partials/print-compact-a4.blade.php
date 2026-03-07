{{-- Compact A4 print: 15+ lines per page, small margins, repeat thead, avoid break on totals --}}
<style>
    @page { size: A4; margin: 8mm 10mm; }
    .print-sheet { padding: 10px 14px 14px; }
    .print-header { margin-bottom: 12px; padding-bottom: 10px; gap: 16px; }
    .print-header .print-doc-title { font-size: 20px; margin-bottom: 4px; }
    .print-header .print-meta { font-size: 11px; }
    .print-client { padding: 8px 12px; margin-bottom: 10px; }
    .print-client-label { margin-bottom: 2px; font-size: 9px; }
    .print-client-name { font-size: 12px; margin-bottom: 4px; }
    .print-client-details { font-size: 10px; line-height: 1.35; }
    .print-table-wrap { margin-bottom: 10px; }
    .print-table { font-size: 10px; line-height: 1.15; }
    .print-table thead th { padding: 4px 6px; font-size: 9px; }
    .print-table tbody td { padding: 3px 6px; border-bottom: 1px solid #e2e8f0; }
    .print-table tbody td.prod { word-break: break-word; max-width: 0; line-height: 1.2; }
    .print-totals-wrap { margin-bottom: 10px; }
    .print-totals-card { padding: 8px 12px; max-width: 240px; }
    .print-tot-row { padding: 4px 0; font-size: 11px; }
    .print-tot-row.ttc { margin-top: 6px; padding-top: 8px; font-size: 14px; }
    .print-tot-row.ttc .print-tot-amt { font-size: 15px; }
    .print-footer { margin-top: 10px; padding-top: 10px; }
    .print-signature { margin-top: 8px; font-size: 10px; }
    .print-rib { margin-top: 6px; font-size: 10px; }
    @media print {
        .print-table thead { display: table-header-group; }
        .print-table tbody tr { break-inside: auto; page-break-inside: auto; }
        .print-totals-wrap { break-inside: avoid; page-break-inside: avoid; }
        .print-footer { break-inside: avoid; page-break-inside: avoid; }
    }
</style>
