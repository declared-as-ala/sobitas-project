{{--
    Bottom: RIB then document N°. Wrapper enables shared print CSS (fixed A4 footer + line).
    Pass documentNumero explicitly, or it falls back to $facture->numero.
--}}
@php
    $footerNumero = $documentNumero ?? ($facture->numero ?? '');
    $showFooter = ! empty($coordonnee->rib) || ($footerNumero !== '' && $footerNumero !== null);
@endphp
@if ($showFooter)
<div class="print-doc-footer-wrap">
    <footer class="print-doc-footer">
        @if (!empty($coordonnee->rib))
            <div class="print-doc-footer__line print-doc-footer__rib">RIB : {{ $coordonnee->rib }}</div>
        @endif
        @if ($footerNumero !== '' && $footerNumero !== null)
            <div class="print-doc-footer__line print-doc-footer__numero">N° : {{ $footerNumero }}</div>
        @endif
    </footer>
</div>
@endif
