{{-- Print modal: iframe loads print URL, button triggers print in same page (no new tab) --}}
<div class="filament-print-modal-content space-y-4" x-data="{}">
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-2" style="min-height: 420px;">
        <iframe
            src="{{ $printUrl }}"
            class="filament-print-iframe w-full rounded-lg border-0 bg-white"
            style="height: 70vh; min-height: 400px;"
            title="Aperçu impression"
        ></iframe>
    </div>
    <div class="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <button
            type="button"
            onclick="try { var f = document.querySelector('.filament-print-iframe'); if (f && f.contentWindow) f.contentWindow.print(); else window.print(); } catch (e) { window.open('{{ $printUrl }}', '_blank', 'width=800,height=600'); }"
            class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
            <svg class="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m0-.096a42.415 42.415 0 0110.56 0m-10.56 0L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" /></svg>
            Imprimer
        </button>
    </div>
</div>
