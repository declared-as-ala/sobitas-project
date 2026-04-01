{{--
    Bottom: Centered RIB with a horizontal line. Fixed explicitly at the bottom of the printed page.
--}}
<style>
    .print-doc-footer {
        text-align: center !important;
        border-top: 1px solid #b4b4b4 !important;
        padding-top: 10px !important;
        width: 100% !important;
        max-width: 100% !important;
        margin-top: 30px;
        color: #000;
        font-size: 13px;
    }
    @media print {
        .invoice .print-doc-footer {
            position: fixed !important;
            bottom: 10px !important;
            left: 0 !important;
            right: 0 !important;
            page-break-after: auto !important;
        }
        main {
            padding-bottom: 50px !important;
        }
    }
    .print-doc-footer__line { line-height: 1.5; }
</style>

<footer class="print-doc-footer">
    @if (!empty($coordonnee->rib))
        <div class="print-doc-footer__line print-doc-footer__rib">RIB : {{ $coordonnee->rib }}</div>
    @endif
</footer>
