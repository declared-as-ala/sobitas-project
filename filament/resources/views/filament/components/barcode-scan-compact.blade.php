{{-- Barcode scan UI - POS style, no Tailwind utilities --}}
<div
    class="bl-barcode"
    x-data="{ barcode: '' }"
    x-init="$nextTick(() => $refs.barcodeInput && $refs.barcodeInput.focus())"
>
    <div class="bl-barcode-title">
        <x-filament::icon icon="heroicon-o-qr-code" class="bl-barcode-icon" />
        <span>Scan code-barres</span>
    </div>
    <div class="bl-barcode-input">
        <input
            type="text"
            placeholder="Code-barres…"
            x-model="barcode"
            x-ref="barcodeInput"
            @keydown.enter.prevent="
                if (barcode && barcode.trim()) {
                    $wire.addProductByBarcode(barcode.trim());
                    barcode = '';
                    $nextTick(() => $refs.barcodeInput && $refs.barcodeInput.focus());
                }
            "
            class="fi-input"
        />
        <p class="bl-barcode-helper">
            Scannez puis appuyez sur Entrée.
        </p>
    </div>
</div>
