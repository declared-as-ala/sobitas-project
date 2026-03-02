{{-- Print A4 design system - professional, high contrast, repeat header --}}
<style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    .print-doc-body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.45; color: #1a1a1a; background: #f1f5f9; min-height: 100vh; }
    .print-toolbar { max-width: 210mm; margin: 12px auto 0; padding: 0 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .print-toolbar-label { font-size: 13px; color: #64748b; }
    .print-toolbar-actions { display: flex; gap: 8px; }
    .print-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
    .print-btn-icon { width: 18px; height: 18px; }
    .print-btn-primary { background: #f97316; color: #fff; }
    .print-btn-primary:hover { background: #ea580c; }
    .print-btn-ghost { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
    .print-btn-ghost:hover { background: #f8fafc; }

    .print-sheet { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 20px 24px; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .print-header { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .print-logo { max-width: 160px; max-height: 48px; object-fit: contain; }
    .print-company-name { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 8px; }
    .print-company-meta { font-size: 12px; color: #475569; line-height: 1.6; margin-top: 8px; }
    .print-doc-info { text-align: right; }
    .print-doc-title { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a; margin: 0 0 6px 0; }
    .print-doc-accent { width: 48px; height: 4px; background: linear-gradient(90deg, #f97316, #ea580c); border-radius: 2px; margin-left: auto; margin-bottom: 12px; }
    .print-meta { font-size: 13px; color: #475569; margin: 0; }
    .print-meta dt { font-weight: 600; color: #334155; margin-top: 4px; }
    .print-meta dd { margin: 0; }

    .print-client { background: #f8fafc; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
    .print-client-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 6px; }
    .print-client-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .print-client-details { font-size: 12px; color: #475569; line-height: 1.6; }

    .print-table-wrap { margin-bottom: 24px; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
    .print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .print-table thead th { background: #f1f5f9; color: #334155; font-weight: 600; text-align: left; padding: 12px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 2px solid #e2e8f0; }
    .print-table thead th.num { text-align: right; }
    .print-table tbody td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; }
    .print-table tbody tr:nth-child(even) { background: #fafbfc; }
    .print-table tbody td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
    .print-table tbody td.prod { font-weight: 600; color: #0f172a; }

    .print-totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 24px; }
    .print-totals-card { width: 100%; max-width: 280px; background: linear-gradient(180deg, #fff 0%, #fff7ed 100%); border-radius: 10px; padding: 16px 20px; border: 1px solid #fed7aa; }
    .print-tot-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 13px; color: #475569; }
    .print-tot-row.ttc { margin-top: 10px; padding-top: 14px; border-top: 2px solid #f97316; font-size: 17px; font-weight: 800; color: #0f172a; }
    .print-tot-amt { font-variant-numeric: tabular-nums; font-weight: 600; }
    .print-tot-row.ttc .print-tot-amt { font-size: 18px; color: #c2410c; }

    .print-footer { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .print-payment-terms { font-size: 12px; color: #64748b; margin-bottom: 12px; }
    .print-note { margin-bottom: 12px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #f97316; font-size: 12px; }
    .print-signature { margin-top: 16px; text-align: center; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
    .print-rib { margin-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }

    @media print {
        .no-print, .print-toolbar { display: none !important; }
        .print-doc-body { background: #fff; }
        .print-sheet { margin: 0; padding: 0; box-shadow: none; border-radius: 0; width: 100% !important; max-width: none; }
        .print-table thead { display: table-header-group; }
        .print-table tr { break-inside: avoid; page-break-inside: avoid; }
        .print-table tbody tr:nth-child(even) { background: #f8fafc; }
        .print-header { break-after: avoid; }
        .print-client { break-after: avoid; }
        .print-totals-card { break-inside: avoid; }
        .print-footer { break-inside: avoid; }
    }
</style>
