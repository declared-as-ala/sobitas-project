{{--
    RIB + document N°. Layout/position comes from footer-rib-numero-styles (fixed bottom on browser print; static flow for PDF).
--}}
<div class="print-doc-footer-wrap">
    <footer class="print-doc-footer">
        @if (!empty($coordonnee->rib))
            <div class="print-doc-footer__line print-doc-footer__rib">RIB : {{ $coordonnee->rib }}</div>
        @endif
        @if (!empty($documentNumero))
            <div class="print-doc-footer__line print-doc-footer__numero">N° {{ $documentNumero }}</div>
        @endif
    </footer>
</div>
