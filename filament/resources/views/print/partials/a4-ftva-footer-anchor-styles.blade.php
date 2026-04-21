{{--
    FTVA-style print documents (BL, Devis, Facture TVA):
    - Page column fills ~one A4 sheet; bottom block grows so RIB + signature sit low.
    - Long tables: natural flow; footer block stays after totals (no overlap).
--}}
<style>
    .ftva-page.ftva-page--footer-anchor {
        display: flex;
        flex-direction: column;
        min-height: 268mm;
    }

    body.doc-a4-print:not(.is-pdf-print) .ftva-page.ftva-page--footer-anchor {
        min-height: min(268mm, calc(100vh - 140px));
    }

    body.doc-a4-print.is-pdf-print .ftva-page.ftva-page--footer-anchor {
        min-height: 272mm;
    }

    .ftva-page--footer-anchor > .ftva-bottom {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        min-height: 0;
        margin-top: 10px;
        page-break-inside: avoid;
        break-inside: avoid;
    }

    .ftva-page--footer-anchor .ftva-bottom__spacer {
        flex: 1 1 auto;
        min-height: 18mm;
    }

    .ftva-page--footer-anchor .ftva-sig-rib {
        flex-shrink: 0;
        margin-top: 0;
    }

    @media print {
        .ftva-page.ftva-page--footer-anchor {
            min-height: 272mm;
        }
    }
</style>
