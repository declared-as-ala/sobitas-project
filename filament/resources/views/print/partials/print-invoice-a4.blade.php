{{-- A4 Invoice print styles: SOBITAS brand orange, modern hierarchy, page-break safe --}}
<style>
    /* Brand */
    :root {
        --invoice-orange: #f97316;
        --invoice-orange-dark: #ea580c;
        --invoice-orange-light: #fff7ed;
        --invoice-gray-50: #f8fafc;
        --invoice-gray-100: #f1f5f9;
        --invoice-gray-200: #e2e8f0;
        --invoice-gray-500: #64748b;
        --invoice-gray-700: #334155;
        --invoice-gray-900: #0f172a;
    }

    @page {
        size: A4;
        margin: 12mm;
    }

    * { box-sizing: border-box; }
    .print-doc-body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: var(--invoice-gray-900); background: var(--invoice-gray-100); min-height: 100vh; }

    /* Toolbar (screen only) */
    .print-toolbar { max-width: 210mm; margin: 12px auto 0; padding: 0 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .print-toolbar-label { font-size: 13px; color: var(--invoice-gray-500); }
    .print-toolbar-actions { display: flex; gap: 8px; }
    .print-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
    .print-btn-icon { width: 18px; height: 18px; }
    .print-btn-primary { background: var(--invoice-orange); color: #fff; }
    .print-btn-primary:hover { background: var(--invoice-orange-dark); }
    .print-btn-ghost { background: #fff; color: var(--invoice-gray-700); border: 1px solid var(--invoice-gray-200); }
    .print-btn-ghost:hover { background: var(--invoice-gray-50); }

    /* Sheet */
    .invoice-sheet { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 0; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); overflow: hidden; }
    .invoice-sheet-inner { padding: 20px 24px 24px; }

    /* Header band (orange accent) */
    .invoice-header-band { height: 6px; background: linear-gradient(90deg, var(--invoice-orange), var(--invoice-orange-dark)); }

    /* Header: company left, doc right */
    .invoice-header { display: grid; grid-template-columns: 1fr auto; gap: 32px; align-items: start; padding: 24px 24px 20px; border-bottom: 1px solid var(--invoice-gray-200); }
    .invoice-company { }
    .invoice-logo { max-width: 250px; max-height: 100px; object-fit: contain; display: block; margin-bottom: 15px; }
    .invoice-company-name { font-size: 20px; font-weight: 800; color: var(--invoice-gray-900); letter-spacing: -0.02em; margin: 0 0 10px 0; }
    .invoice-company-meta { font-size: 11px; color: var(--invoice-gray-700); line-height: 1.65; }
    .invoice-company-meta a { color: var(--invoice-gray-700); }
    .invoice-company-legal { font-size: 10px; color: var(--invoice-gray-500); margin-top: 8px; }

    .invoice-doc-block { text-align: right; min-width: 200px; }
    .invoice-doc-title { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; color: var(--invoice-gray-900); margin: 0 0 12px 0; line-height: 1.1; }
    .invoice-doc-meta { font-size: 13px; color: var(--invoice-gray-700); }
    .invoice-doc-meta dt { display: inline; font-weight: 600; }
    .invoice-doc-meta dd { display: inline; margin: 0 0 0 6px; }
    .invoice-doc-meta dd::after { content: ''; display: block; }
    .invoice-status-badge { display: inline-block; margin-top: 10px; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .invoice-status-badge--draft { background: var(--invoice-gray-200); color: var(--invoice-gray-700); }
    .invoice-status-badge--issued { background: #dbeafe; color: #1d4ed8; }
    .invoice-status-badge--paid { background: #d1fae5; color: #047857; }
    .invoice-status-badge--partially_paid { background: #fef3c7; color: #b45309; }
    .invoice-status-badge--canceled { background: #fee2e2; color: #b91c1c; }

    /* Client card */
    .invoice-client { background: var(--invoice-gray-50); border: 1px solid var(--invoice-gray-200); border-radius: 10px; padding: 16px 20px; margin: 20px 24px; }
    .invoice-client-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--invoice-gray-500); margin-bottom: 6px; }
    .invoice-client-name { font-size: 15px; font-weight: 700; color: var(--invoice-gray-900); margin-bottom: 8px; }
    .invoice-client-details { font-size: 11px; color: var(--invoice-gray-700); line-height: 1.6; }

    /* Table */
    .invoice-table-wrap { margin: 20px 24px; border: 1px solid var(--invoice-gray-200); border-radius: 10px; overflow: hidden; }
    .invoice-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .invoice-table thead th { background: var(--invoice-gray-100); color: var(--invoice-gray-700); font-weight: 600; padding: 12px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid var(--invoice-gray-200); text-align: left; }
    .invoice-table thead th.num { text-align: right; }
    .invoice-table tbody td { padding: 10px 14px; border-bottom: 1px solid var(--invoice-gray-100); vertical-align: top; }
    .invoice-table tbody tr:nth-child(even) { background: #fafbfc; }
    .invoice-table tbody td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
    .invoice-table tbody td.designation { font-weight: 500; color: var(--invoice-gray-900); word-wrap: break-word; max-width: 220px; }

    /* Totals box (right, soft orange tint) */
    .invoice-totals-wrap { display: flex; justify-content: flex-end; margin: 20px 24px 24px; }
    .invoice-totals-box { width: 100%; max-width: 300px; background: linear-gradient(180deg, var(--invoice-orange-light) 0%, #fff 100%); border: 1px solid #fed7aa; border-radius: 10px; padding: 18px 22px; }
    .invoice-tot-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 12px; color: var(--invoice-gray-700); }
    .invoice-tot-row.invoice-tot-ttc,
    .invoice-tot-row.ttc { margin-top: 12px; padding-top: 14px; border-top: 1px dashed var(--invoice-gray-200); font-size: 14px; font-weight: 700; color: var(--invoice-gray-800); }
    .invoice-tot-amt { font-variant-numeric: tabular-nums; font-weight: 600; }
    .invoice-tot-row.invoice-tot-ttc .invoice-tot-amt,
    .invoice-tot-row.ttc .invoice-tot-amt { font-size: 16px; color: var(--invoice-gray-900); }

    .invoice-tot-row.net-a-payer { margin-top: 12px; padding-top: 14px; border-top: 2px solid var(--invoice-orange); font-size: 18px; font-weight: 800; color: var(--invoice-gray-900); }
    .invoice-tot-row.net-a-payer .invoice-tot-amt { font-size: 22px; color: var(--invoice-orange-dark); }

    /* Somme en lettres */
    .invoice-somme { margin: 0 24px 20px; padding: 12px 16px; background: var(--invoice-gray-50); border-radius: 8px; border-left: 4px solid var(--invoice-orange); font-size: 11px; color: var(--invoice-gray-700); font-style: italic; }

    /* Footer */
    .invoice-footer { margin: 0 24px 24px; padding-top: 20px; border-top: 1px solid var(--invoice-gray-200); }
    .invoice-payment-terms { font-size: 11px; color: var(--invoice-gray-500); margin-bottom: 16px; }
    .invoice-note { margin-bottom: 12px; padding: 12px 16px; background: var(--invoice-gray-50); border-radius: 8px; border-left: 4px solid var(--invoice-orange); font-size: 11px; color: var(--invoice-gray-700); }
    .invoice-signature { text-align: center; margin-top: 28px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--invoice-gray-500); }
    .invoice-rib { margin-top: 12px; font-size: 10px; color: var(--invoice-gray-500); text-align: center; }
    .invoice-thanks { margin-top: 16px; font-size: 11px; color: var(--invoice-gray-500); text-align: center; }

    /* Print-specific */
    @media print {
        .no-print, .print-toolbar { display: none !important; }
        .print-doc-body { background: #fff; }
        .invoice-sheet { margin: 0; padding: 0; box-shadow: none; border-radius: 0; width: 100% !important; max-width: none; min-height: auto; }
        .invoice-sheet-inner { padding: 0 12px 12px; }
        .invoice-header-band { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .invoice-header { padding: 16px 0 12px; break-after: avoid; }
        .invoice-client { margin: 12px 0; break-after: avoid; }
        .invoice-table-wrap { margin: 12px 0; }
        .invoice-table thead { display: table-header-group; }
        .invoice-table thead th { background: var(--invoice-gray-100) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .invoice-table tbody tr { break-inside: avoid; page-break-inside: avoid; }
        .invoice-table tbody tr:nth-child(even) { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .invoice-totals-wrap { break-inside: avoid; page-break-inside: avoid; margin: 12px 0; }
        .invoice-totals-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .invoice-footer { break-inside: avoid; page-break-inside: avoid; }
    }
</style>
