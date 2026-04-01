{{-- Shared CSS for RIB footer: screen, browser print (fixed to A4 bottom), PDF fallback --}}
@php $isPdf = !empty($forPdf); @endphp

.print-doc-footer-wrap {
    margin-top: 28px;
    padding-top: 0;
    border-top: 2px solid #ff4000;
    text-align: center;
    clear: both;
}
.print-doc-footer {
    font-size: 11px;
    text-align: center !important;
    color: #475569;
    border: none !important;
    padding: 8px 0 4px;
    width: auto;
    max-width: 100%;
    letter-spacing: 0.02em;
}
.print-doc-footer__rib {
    font-size: 12px;
    color: #334155;
    font-weight: 500;
    letter-spacing: 0.06em;
}
.print-doc-footer__rib-label {
    color: #ff4000;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 11px;
}

@if ($isPdf)
body.is-pdf-print .print-doc-footer-wrap {
    position: static !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    margin-top: 24px;
    padding-top: 0;
    border-top: 2px solid #ff4000;
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

    body:not(.is-pdf-print) .print-doc-footer-wrap {
        position: fixed;
        left: 12mm;
        right: 12mm;
        bottom: 8mm;
        width: auto;
        max-width: calc(100% - 24mm);
        margin-top: 0;
        padding-top: 0;
        border-top: 2px solid #ff4000;
        z-index: 9999;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    body:not(.is-pdf-print) .print-doc-footer {
        padding: 6px 0 2px;
    }

    body.is-pdf-print .print-doc-footer-wrap {
        position: static !important;
        left: auto !important;
        right: auto !important;
        bottom: auto !important;
        margin-top: 20px;
        border-top: 2px solid #ff4000;
    }
}
