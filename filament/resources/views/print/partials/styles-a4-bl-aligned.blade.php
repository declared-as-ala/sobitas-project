{{--
    Shared A4 print styles for Facture TVA + Devis — aligned with Bon de livraison visual language.
    Does not replace BL templates; BL keeps its own bl-* classes.
--}}
<style>
    html {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    body.doc-a4-print {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 11pt;
        color: #1a1a1a;
        background: #fff;
    }
    .doc-a4-print #invoice {
        padding: 24px 28px 32px;
        max-width: 900px;
        margin: 0 auto;
        box-sizing: border-box;
    }
    /* DomPDF / short pages: fill page so footer sits lower; browser print uses flex column below */
    body.doc-a4-print.is-pdf-print #invoice.doc-a4-shell {
        min-height: 280mm;
        padding-bottom: 20mm;
        display: flex;
        flex-direction: column;
    }
    body.doc-a4-print.is-pdf-print #invoice.doc-a4-shell > .invoice {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
    }
    body.doc-a4-print.is-pdf-print #invoice.doc-a4-shell .doc-a4-main-wrap {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
    }
    body.doc-a4-print.is-pdf-print #invoice.doc-a4-shell .doc-a4-main-wrap > main {
        flex: 1 1 auto;
    }

    .doc-a4-toolbar { text-align: right; margin-bottom: 10px; }
    .doc-a4-btn {
        display: inline-block;
        background: #2563eb;
        color: #fff !important;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        font-size: 10pt;
        font-weight: 600;
        text-decoration: none;
        margin-left: 8px;
    }
    .doc-a4-btn--muted { background: #64748b; }

    .doc-a4-header {
        display: table;
        width: 100%;
        margin-bottom: 16px;
        padding-bottom: 14px;
        border-bottom: 3px solid #ff4000;
    }
    .doc-a4-header__brand { display: table-cell; vertical-align: top; width: 58%; }
    .doc-a4-header__meta { display: table-cell; vertical-align: top; width: 42%; text-align: right; }
    .doc-a4-header__meta h1 {
        margin: 0 0 8px;
        font-size: 22pt;
        font-weight: 800;
        letter-spacing: 0.03em;
        color: #0f172a;
        text-transform: uppercase;
    }
    .doc-a4-header__meta .doc-a4-meta-line { font-size: 10.5pt; color: #334155; line-height: 1.6; }
    .doc-a4-co-name { font-size: 13pt; font-weight: 700; margin: 8px 0 6px; color: #0f172a; }
    .doc-a4-co-line { font-size: 9.5pt; color: #475569; line-height: 1.55; }

    .doc-a4-client {
        margin: 14px 0 12px;
        padding: 10px 12px;
        background: #f8fafc;
        border-radius: 6px;
        border-left: 4px solid #ff4000;
    }
    .doc-a4-client h2 {
        margin: 0 0 8px;
        font-size: 9pt;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
    }
    .doc-a4-client p { margin: 0 0 4px; font-size: 10pt; color: #334155; }

    .doc-a4-table-wrap { width: 100%; margin: 0; overflow: visible; }
    table.doc-a4-lines {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
        table-layout: fixed;
        font-size: 10pt;
        border: 1px solid #e2e8f0;
    }
    table.doc-a4-lines thead th {
        background: #ff4000 !important;
        background-color: #ff4000 !important;
        color: #fff !important;
        font-weight: 700;
        font-size: 8.5pt;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 10px 10px;
        text-align: left;
        border: 1px solid #ff4000;
        vertical-align: middle;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    table.doc-a4-lines thead th.doc-a4-col-num { width: 5%; text-align: center; }
    table.doc-a4-lines thead th.doc-a4-col-prod { width: 34%; }
    table.doc-a4-lines thead th.doc-a4-col-numcell { width: 11%; text-align: right; }
    table.doc-a4-lines tbody td {
        padding: 9px 10px;
        border: 1px solid #e2e8f0;
        vertical-align: middle;
        background: #fff;
    }
    table.doc-a4-lines tbody tr:nth-child(even) td { background: #f8fafc; }
    table.doc-a4-lines .doc-a4-td-num { text-align: center; color: #64748b; font-weight: 600; }
    table.doc-a4-lines .doc-a4-td-prod { text-align: left; font-weight: 600; color: #0f172a; word-wrap: break-word; }
    table.doc-a4-lines .doc-a4-td-right { text-align: right; font-variant-numeric: tabular-nums; }

    .doc-a4-totals-wrap { width: 100%; margin-top: 12px; margin-bottom: 6px; }
    table.doc-a4-totals {
        width: 100%;
        max-width: 360px;
        margin-left: auto;
        border-collapse: collapse;
        font-size: 10.5pt;
    }
    table.doc-a4-totals td {
        padding: 5px 0 5px 8px;
        border: none;
        vertical-align: middle;
    }
    table.doc-a4-totals td:first-child {
        text-align: left;
        color: #475569;
        font-weight: 500;
        white-space: nowrap;
    }
    table.doc-a4-totals td:last-child {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        color: #0f172a;
        width: 42%;
    }
    table.doc-a4-totals tr.doc-a4-totals__grand td {
        padding-top: 10px;
        padding-bottom: 8px;
        border-top: 2px solid #0f172a;
        font-size: 12pt;
        font-weight: 800;
        color: #0f172a;
    }
    table.doc-a4-totals tr.doc-a4-totals__grand td:first-child { font-weight: 800; color: #0f172a; }
    table.doc-a4-totals tr.doc-a4-totals__grand td:last-child {
        background: #fff7ed !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        padding-left: 12px;
        padding-right: 12px;
        border-radius: 4px;
    }

    .doc-a4-note {
        margin: 14px 0 10px;
        padding: 10px 12px 10px 14px;
        border-left: 4px solid #ff4000;
        background: #fffbeb;
        font-size: 10pt;
        color: #334155;
        line-height: 1.45;
    }
    .doc-a4-note strong { color: #c2410c; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.05em; }
    .doc-a4-note-extra { margin-top: 8px; font-size: 9.5pt; color: #475569; }
    .doc-a4-payment-terms { margin: 10px 0 6px; font-size: 9.5pt; color: #64748b; }
    .doc-a4-signature {
        margin: 12px 0 6px;
        padding-left: 140px;
        font-size: 10pt;
        font-weight: 600;
        text-decoration: underline;
        color: #0f172a;
    }

    .hide_print { display: initial; }
    @media print {
        html, body, table.doc-a4-lines thead th, table.doc-a4-totals tr.doc-a4-totals__grand td:last-child {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .hide_print { display: none !important; }
        .doc-a4-print #invoice { padding: 0; max-width: none; }
        .doc-a4-toolbar { display: none; }
        body.doc-a4-print { background: #fff; }
    }

    /* Footer: wrap matches footer-rib-numero-styles.blade.php (.print-doc-footer-wrap) */
    body.doc-a4-print:not(.is-pdf-print) #invoice.doc-a4-shell,
    body.doc-a4-print:not(.is-pdf-print) .page-content {
        padding-bottom: 28mm !important;
    }
    body.doc-a4-print.is-pdf-print .doc-a4-footer-wrap {
        margin-top: auto;
        padding-top: 16px;
    }

    @include('print.partials.footer-rib-numero-styles', ['forPdf' => $forPdf ?? null])
</style>
