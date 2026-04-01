{{--
    Bottom-left: RIB then document N° (same order as admin backend).
    Pass documentNumero explicitly, or it falls back to $facture->numero.
--}}
@php
    $footerNumero = $documentNumero ?? ($facture->numero ?? '');
@endphp
<footer class="print-doc-footer">
    @if (!empty($coordonnee->rib))
        <div class="print-doc-footer__line print-doc-footer__rib">RIB : {{ $coordonnee->rib }}</div>
    @endif
    @if ($footerNumero !== '' && $footerNumero !== null)
        <div class="print-doc-footer__line print-doc-footer__numero">N° : {{ $footerNumero }}</div>
    @endif
</footer>
