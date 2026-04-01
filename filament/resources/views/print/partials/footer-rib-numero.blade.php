{{-- RIB footer — centered at page bottom with orange accent line --}}
<footer class="print-doc-footer">
    @if (!empty($coordonnee->rib))
        <div class="print-doc-footer__rib">
            <span class="print-doc-footer__rib-label">RIB :</span> {{ $coordonnee->rib }}
        </div>
    @endif
</footer>
