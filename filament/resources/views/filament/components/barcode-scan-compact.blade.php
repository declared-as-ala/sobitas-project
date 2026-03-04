{{-- Barcode scan UI — Premium & Full width layout --}}
<div
    class="bl-barcode w-full bg-primary-50/50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 p-3 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-2"
    x-data="{ barcode: '' }"
    x-init="$nextTick(() => { if ($refs.barcodeInput) $refs.barcodeInput.focus(); })"
>
    <div class="flex items-center gap-2 text-primary-700 dark:text-primary-400 font-semibold text-sm shrink-0 pl-1">
        <x-filament::icon icon="heroicon-o-qr-code" class="w-5 h-5" />
        <span class="uppercase tracking-wider text-xs">Scan code-barres</span>
    </div>
    <div class="flex-1 relative">
        <input
            type="text"
            placeholder="Scannez puis appuyez sur Entrée..."
            x-model="barcode"
            x-ref="barcodeInput"
            @keydown.enter.prevent="
                let code = barcode.trim();
                if (code) {
                    $wire.addProductByBarcode(code);
                    barcode = '';
                    $nextTick(() => { if ($refs.barcodeInput) $refs.barcodeInput.focus(); });
                }
            "
            class="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-white/10 rounded-lg shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm py-2 pl-3 pr-16 transition-colors"
            autocomplete="off"
        />
        <div class="absolute inset-y-0 right-0 py-2 pr-2.5 flex items-center pointer-events-none text-xs text-gray-400 font-medium">
            <kbd class="font-sans border border-gray-200 dark:border-white/20 bg-gray-50 dark:bg-white/5 rounded px-1.5 py-0.5">Entrée ↵</kbd>
        </div>
    </div>
</div>
