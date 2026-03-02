{{-- Compact barcode input: single line, small, integrated --}}
<div class="doc-barcode-compact" x-data="{ barcode: '' }" x-init="$nextTick(() => $refs.barcodeInput?.focus())">
    <div class="flex items-center gap-2">
        <x-filament::icon icon="heroicon-o-qr-code" class="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
        <input
            type="text"
            placeholder="Code-barres puis Entrée"
            x-model="barcode"
            x-ref="barcodeInput"
            @keydown.enter.prevent="
                if (barcode.trim()) {
                    $wire.addProductByBarcode(barcode.trim());
                    barcode = '';
                    $nextTick(() => $refs.barcodeInput?.focus());
                }
            "
            class="fi-input block w-full max-w-xs rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:border-white/10 dark:bg-white/5 text-sm py-1.5"
        />
    </div>
</div>
