{{--
    Universal A4 print styles for ALL SOBITAS documents.
    Fully self-contained — no external CDN dependencies.
    Works reliably in browser, print preview, and DomPDF.
--}}
<style>
    /* ── Bootstrap-equivalent resets & utilities (inlined for reliability) ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        line-height: 1.15;
        -webkit-text-size-adjust: 100%;
    }
    img { vertical-align: middle; border-style: none; max-width: 100%; }
    table { border-collapse: collapse; }
    b, strong { font-weight: 700; }
    .mb-1 { margin-bottom: .25rem; }
    .mb-2 { margin-bottom: .5rem; }
    .mb-3 { margin-bottom: 1rem; }
    .mt-1 { margin-top: .25rem; }
    .mt-2 { margin-top: .5rem; }
    .mt-3 { margin-top: 1rem; }
    .me-1 { margin-right: .25rem; }
    .text-end { text-align: right; }
    .text-center { text-align: center; }
    .fw-bold { font-weight: 700; }
    .text-muted { color: #6c757d; }
    .text-uppercase { text-transform: uppercase; }
    .d-block { display: block; }
    .d-flex { display: flex; }
    .justify-content-between { justify-content: space-between; }
    .align-items-start { align-items: flex-start; }
    .w-100 { width: 100%; }

    /* ── Base ── */
    body.doc-a4-print {
        font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 10.5pt;
        color: #1e293b;
        background: #e9ecef;
        margin: 0;
        padding: 0;
        line-height: 1.5;
    }

    /* ── Page shell ── */
    .doc-a4-print .page-content {
        padding: 24px 0;
        min-height: 100vh;
    }
    .doc-a4-print #invoice {
        padding: 36px 40px 28px;
        max-width: 860px;
        margin: 0 auto;
        background: #fff;
        border-radius: 4px;
        box-shadow: 0 2px 12px rgba(0,0,0,.1);
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
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
    }
    .doc-a4-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #ff4000;
        color: #fff !important;
        border: none;
        border-radius: 6px;
        padding: 10px 24px;
        font-size: 10pt;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        line-height: 1.4;
        transition: all .2s ease;
        box-shadow: 0 1px 3px rgba(255,64,0,.25);
    }
    .doc-a4-btn:hover {
        background: #e03800;
        box-shadow: 0 2px 6px rgba(255,64,0,.35);
        transform: translateY(-1px);
    }
    .doc-a4-btn--muted {
        background: #64748b;
        box-shadow: 0 1px 3px rgba(100,116,139,.25);
    }
    .doc-a4-btn--muted:hover {
        background: #475569;
        box-shadow: 0 2px 6px rgba(100,116,139,.35);
    }

    /* ── Header ── */
    .doc-a4-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 3px solid #ff4000;
    }
    .doc-a4-header__brand {
        flex: 0 1 56%;
    }
    .doc-a4-header__meta {
        flex: 0 1 42%;
        text-align: right;
    }
    .doc-a4-header__meta h1 {
        margin: 0 0 8px;
        font-size: 22pt;
        font-weight: 800;
        letter-spacing: 0.04em;
        color: #0f172a;
        text-transform: uppercase;
        line-height: 1.1;
    }
    .doc-a4-meta-line {
        font-size: 10pt;
        color: #475569;
        line-height: 1.8;
    }
    .doc-a4-meta-line b {
        color: #334155;
        font-weight: 600;
    }
    .doc-a4-co-name {
        font-size: 13pt;
        font-weight: 700;
        margin: 6px 0 6px;
        color: #0f172a;
        letter-spacing: 0.01em;
    }
    .doc-a4-co-line {
        font-size: 9pt;
        color: #64748b;
        line-height: 1.65;
    }
    .doc-a4-co-line b {
        color: #475569;
        font-weight: 600;
    }

    /* ── Client block ── */
    .doc-a4-client {
        margin: 18px 0 16px;
        padding: 14px 16px;
        background: #f8fafc;
        border-radius: 8px;
        border-left: 4px solid #ff4000;
        border: 1px solid #e2e8f0;
        border-left: 4px solid #ff4000;
    }
    .doc-a4-client h2 {
        margin: 0 0 10px;
        font-size: 8.5pt;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #94a3b8;
        padding-bottom: 6px;
        border-bottom: 1px solid #e2e8f0;
    }
    .doc-a4-client p {
        margin: 0 0 4px;
        font-size: 9.5pt;
        color: #334155;
        line-height: 1.6;
    }
    .doc-a4-client p b {
        color: #475569;
        font-weight: 600;
        display: inline-block;
        min-width: 100px;
    }

    /* ── Product / lines table ── */
    .doc-a4-table-wrap { width: 100%; margin: 0; overflow: visible; }
    table.doc-a4-lines {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
        table-layout: fixed;
        font-size: 9.5pt;
        border: 1px solid #cbd5e1;
    }
    table.doc-a4-lines thead th {
        background: #ff4000 !important;
        background-color: #ff4000 !important;
        color: #fff !important;
        font-weight: 700;
        font-size: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        padding: 11px 10px;
        text-align: left;
        border: 1px solid #e65100;
        vertical-align: middle;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    table.doc-a4-lines thead th.doc-a4-col-num { width: 5%; text-align: center; }
    table.doc-a4-lines thead th.doc-a4-col-prod { width: 34%; }
    table.doc-a4-lines thead th.doc-a4-col-numcell { width: 11%; text-align: right; padding-right: 12px; }
    table.doc-a4-lines tbody td {
        padding: 9px 10px;
        border: 1px solid #e2e8f0;
        vertical-align: middle;
        background: #fff;
        font-size: 9.5pt;
        color: #334155;
    }
    table.doc-a4-lines tbody tr:nth-child(even) td {
        background: #f8fafc !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
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
        padding-right: 12px;
    }

    /* ── Totals block ── */
    .doc-a4-totals-wrap {
        width: 100%;
        margin-top: 16px;
        margin-bottom: 8px;
        display: flex;
        justify-content: flex-end;
    }
    table.doc-a4-totals {
        width: 380px;
        border-collapse: collapse;
        font-size: 10pt;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
    }
    table.doc-a4-totals td {
        padding: 7px 14px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
    }
    table.doc-a4-totals td:first-child {
        text-align: left;
        color: #64748b;
        font-weight: 500;
        white-space: nowrap;
        background: #f8fafc;
        width: 55%;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    table.doc-a4-totals td:last-child {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        color: #0f172a;
    }
    table.doc-a4-totals tr.doc-a4-totals__grand td {
        padding: 10px 14px;
        border-top: 2px solid #ff4000;
        border-bottom: none;
        font-size: 11pt;
        font-weight: 800;
        color: #0f172a;
    }
    table.doc-a4-totals tr.doc-a4-totals__grand td:first-child {
        font-weight: 800;
        color: #0f172a;
        background: #fff7ed !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    table.doc-a4-totals tr.doc-a4-totals__grand td:last-child {
        background: #fff7ed !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color: #c2410c;
        font-size: 12pt;
    }

    /* ── Note / Signature ── */
    .doc-a4-note {
        margin: 18px 0 10px;
        padding: 12px 16px;
        border-left: 4px solid #ff4000;
        background: #fffbeb;
        border-radius: 0 6px 6px 0;
        font-size: 9.5pt;
        color: #334155;
        line-height: 1.55;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .doc-a4-note strong {
        color: #c2410c;
        font-size: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        display: inline-block;
        margin-bottom: 2px;
    }
    .doc-a4-note-extra {
        margin-top: 8px;
        font-size: 9pt;
        color: #64748b;
        line-height: 1.5;
    }
    .doc-a4-payment-terms {
        margin: 10px 0 6px;
        font-size: 9pt;
        color: #94a3b8;
        font-style: italic;
    }
    .doc-a4-signature {
        margin: 16px 0 8px;
        text-align: right;
        padding-right: 40px;
        font-size: 10pt;
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 4px;
        text-decoration-thickness: 1px;
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
        table.doc-a4-lines tbody tr:nth-child(even) td,
        table.doc-a4-totals td:first-child,
        table.doc-a4-totals tr.doc-a4-totals__grand td,
        .doc-a4-note {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        .hide_print { display: none !important; }
        body.doc-a4-print {
            background: #fff;
        }
        .doc-a4-print .page-content {
            padding: 0;
            min-height: auto;
        }
        .doc-a4-print #invoice {
            padding: 0;
            max-width: none;
            box-shadow: none;
            border-radius: 0;
        }
        .doc-a4-toolbar { display: none !important; }
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
