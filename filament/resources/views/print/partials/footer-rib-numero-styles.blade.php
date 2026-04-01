{{-- Shared CSS for RIB/N° footer: screen, browser print (fixed to A4 bottom + line), PDF fallback. Expects optional $forPdf. --}}
@php
    $isPdf = !empty($forPdf);
@endphp

/* ── RIB + N° footer (included by facture-tva, bon-de-livraison, devis) ── */
.print-doc-footer-wrap {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1px solid #bbb;
    text-align: left;
    clear: both;
}
.print-doc-footer {
    font-size: 14px;
    text-align: left !important;
    color: #000;
    border: none !important;
    padding: 4px 0 0;
    width: auto;
    max-width: 100%;
}
.print-doc-footer__line { line-height: 1.55; }
.print-doc-footer__numero { font-weight: 600; }

@if ($isPdf)
/* DomPDF / PDF download: no fixed positioning */
body.is-pdf-print .print-doc-footer-wrap {
    position: static !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    margin-top: 24px;
    padding-top: 10px;
    border-top: 1px solid #bbb;
    width: 100%;
    max-width: 100%;
}
@endif

@media print {
    @page {
        size: A4;
        margin: 12mm;
    }

    body:not(.is-pdf-print) #invoice,
    body:not(.is-pdf-print) .page-content {
        padding-bottom: 28mm !important;
    }

    /* Fixed to physical page bottom in Chrome/Edge print preview */
    body:not(.is-pdf-print) .print-doc-footer-wrap {
        position: fixed;
        left: 12mm;
        right: 12mm;
        bottom: 10mm;
        width: auto;
        max-width: calc(100% - 24mm);
        margin-top: 0;
        padding-top: 8px;
        padding-left: 0;
        border-top: 1px solid #aaa;
        z-index: 9999;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    body:not(.is-pdf-print) .print-doc-footer {
        padding: 0;
    }

    body.is-pdf-print .print-doc-footer-wrap {
        position: static !important;
        left: auto !important;
        right: auto !important;
        bottom: auto !important;
        margin-top: 20px;
        border-top: 1px solid #bbb;
    }
}
