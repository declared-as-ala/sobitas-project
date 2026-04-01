{{--
    Universal A4 print styles for ALL SOBITAS documents.
    Bootstrap 5 for grid/utilities + custom SOBITAS design tokens.
--}}
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
    *, *::before, *::after { box-sizing: border-box; }
    html {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    body.doc-a4-print {
        font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 10.5pt;
        color: #1e293b;
        background: #f1f5f9;
        margin: 0;
        padding: 0;
    }

    /* ── Page shell ── */
    .doc-a4-print .page-content {
        padding: 20px 0;
    }
    .doc-a4-print #invoice {
        padding: 32px 36px 28px;
        max-width: 860px;
        margin: 0 auto;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 1px 6px rgba(0,0,0,.08);
    }

    /* ── PDF flex layout ── */
    body.doc-a4-print.is-pdf-print {
        background: #fff;
    }
    body.doc-a4-print.is-pdf-print #invoice.doc-a4-shell {
        min-height: 282mm;
        padding-bottom: 18mm;
        display: flex;
        flex-direction: column;
        box-shadow: none;
        border-radius: 0;
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

    /* ── Toolbar (screen only) ── */
    .doc-a4-toolbar {
        text-align: right;
        margin-bottom: 14px;
        padding-bottom: 10px;
    }
    .doc-a4-btn {
        display: inline-block;
        background: #ff4000;
        color: #fff !important;
        border: none;
        border-radius: 6px;
        padding: 9px 22px;
        font-size: 10pt;
        font-weight: 600;
        text-decoration: none;
        margin-left: 8px;
        cursor: pointer;
        line-height: 1.4;
        transition: background .15s;
    }
    .doc-a4-btn:hover { background: #e03800; }
    .doc-a4-btn--muted { background: #64748b; }
    .doc-a4-btn--muted:hover { background: #475569; }

    /* ── Header ── */
    .doc-a4-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 3px solid #ff4000;
    }
    .doc-a4-header__brand {
        flex: 0 1 58%;
    }
    .doc-a4-header__meta {
        flex: 0 1 40%;
        text-align: right;
    }
    .doc-a4-header__meta h1 {
        margin: 0 0 6px;
        font-size: 24pt;
        font-weight: 800;
        letter-spacing: 0.04em;
        color: #0f172a;
        text-transform: uppercase;
    }
    .doc-a4-meta-line {
        font-size: 10pt;
        color: #475569;
        line-height: 1.7;
    }
    .doc-a4-meta-line b {
        color: #334155;
    }
    .doc-a4-co-name {
        font-size: 12pt;
        font-weight: 700;
        margin: 6px 0 5px;
        color: #0f172a;
    }
    .doc-a4-co-line {
        font-size: 9pt;
        color: #64748b;
        line-height: 1.6;
    }
    .doc-a4-co-line b {
        color: #475569;
        font-weight: 600;
    }

    /* ── Client block ── */
    .doc-a4-client {
        margin: 16px 0 14px;
        padding: 12px 14px;
        background: #f8fafc;
        border-radius: 8px;
        border-left: 4px solid #ff4000;
    }
    .doc-a4-client h2 {
        margin: 0 0 8px;
        font-size: 8.5pt;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #94a3b8;
    }
    .doc-a4-client p {
        margin: 0 0 3px;
        font-size: 9.5pt;
        color: #334155;
    }
    .doc-a4-client p b {
        color: #475569;
        font-weight: 600;
        min-width: 140px;
        display: inline-block;
    }

    /* ── Product / lines table ── */
    .doc-a4-table-wrap { width: 100%; margin: 0; overflow: visible; }
    table.doc-a4-lines {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
        table-layout: fixed;
        font-size: 9.5pt;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
    }
    table.doc-a4-lines thead th {
        background: #ff4000 !important;
        background-color: #ff4000 !important;
        color: #fff !important;
        font-weight: 700;
        font-size: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.06em;
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
        padding: 8px 10px;
        border: 1px solid #e2e8f0;
        vertical-align: middle;
        background: #fff;
        font-size: 9.5pt;
    }
    table.doc-a4-lines tbody tr:nth-child(even) td {
        background: #f8fafc;
    }
    table.doc-a4-lines tbody tr:hover td {
        background: #fff7ed;
    }
    table.doc-a4-lines .doc-a4-td-num {
        text-align: center;
        color: #94a3b8;
        font-weight: 700;
        font-size: 9pt;
    }
    table.doc-a4-lines .doc-a4-td-prod {
        text-align: left;
        font-weight: 600;
        color: #0f172a;
        word-wrap: break-word;
    }
    table.doc-a4-lines .doc-a4-td-right {
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: #334155;
    }

    /* ── Totals block ── */
    .doc-a4-totals-wrap { width: 100%; margin-top: 14px; margin-bottom: 6px; }
    table.doc-a4-totals {
        width: 100%;
        max-width: 380px;
        margin-left: auto;
        border-collapse: collapse;
        font-size: 10pt;
    }
    table.doc-a4-totals td {
        padding: 5px 0 5px 10px;
        border: none;
        vertical-align: middle;
    }
    table.doc-a4-totals td:first-child {
        text-align: right;
        color: #64748b;
        font-weight: 500;
        white-space: nowrap;
        padding-right: 16px;
    }
    table.doc-a4-totals td:last-child {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        color: #0f172a;
        width: 40%;
    }
    table.doc-a4-totals tr.doc-a4-totals__grand td {
        padding-top: 10px;
        padding-bottom: 10px;
        border-top: 2px solid #0f172a;
        font-size: 11.5pt;
        font-weight: 800;
        color: #0f172a;
    }
    table.doc-a4-totals tr.doc-a4-totals__grand td:first-child {
        font-weight: 800;
        color: #0f172a;
    }
    table.doc-a4-totals tr.doc-a4-totals__grand td:last-child {
        background: #fff7ed !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        padding: 8px 14px;
        border-radius: 6px;
        color: #c2410c;
        font-size: 12pt;
    }

    /* ── Note / Signature ── */
    .doc-a4-note {
        margin: 16px 0 10px;
        padding: 10px 14px 10px 16px;
        border-left: 4px solid #ff4000;
        background: #fffbeb;
        border-radius: 0 6px 6px 0;
        font-size: 9.5pt;
        color: #334155;
        line-height: 1.5;
    }
    .doc-a4-note strong {
        color: #c2410c;
        font-size: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }
    .doc-a4-note-extra {
        margin-top: 8px;
        font-size: 9pt;
        color: #64748b;
    }
    .doc-a4-payment-terms {
        margin: 10px 0 6px;
        font-size: 9pt;
        color: #94a3b8;
        font-style: italic;
    }
    .doc-a4-signature {
        margin: 14px 0 6px;
        text-align: right;
        padding-right: 40px;
        font-size: 10pt;
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 4px;
        color: #0f172a;
    }

    /* ── Summary line ── */
    .doc-a4-summary {
        margin-top: 14px;
        text-align: right;
        font-size: 10pt;
        color: #475569;
    }
    .doc-a4-summary strong {
        font-weight: 700;
        color: #0f172a;
    }

    /* ── Print media ── */
    .hide_print { display: initial; }
    @media print {
        html, body,
        table.doc-a4-lines thead th,
        table.doc-a4-totals tr.doc-a4-totals__grand td:last-child {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .hide_print { display: none !important; }
        body.doc-a4-print {
            background: #fff;
        }
        .doc-a4-print #invoice {
            padding: 0;
            max-width: none;
            box-shadow: none;
            border-radius: 0;
        }
        .doc-a4-print .page-content {
            padding: 0;
        }
        .doc-a4-toolbar { display: none; }
    }

    /* ── Footer positioning ── */
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
