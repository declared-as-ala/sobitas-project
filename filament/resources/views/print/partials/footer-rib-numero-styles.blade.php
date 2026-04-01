{{-- Shared CSS for RIB footer: always in normal flow, pushed to bottom via flexbox --}}
@php $isPdf = !empty($forPdf); @endphp

.print-doc-footer-wrap {
    margin-top: auto;
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

@media print {
    @page {
        size: A4;
        margin: 12mm;
    }

    .print-doc-footer-wrap {
        margin-top: auto;
        padding-top: 0;
        border-top: 2px solid #ff4000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .print-doc-footer {
        padding: 6px 0 2px;
    }
}
