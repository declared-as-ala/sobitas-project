{{-- Barcode scan UI — autofocus, simple $wire call (no Promise chain to avoid SPA/Alpine issues) --}}
<div
    class="bl-barcode"
    x-data="{ barcode: '' }"
    x-init="$nextTick(() => { if ($refs.barcodeInput) $refs.barcodeInput.focus(); })"
>
    <div class="bl-barcode-title">
        <x-filament::icon icon="heroicon-o-qr-code" class="bl-barcode-icon" />
        <span>Scan code-barres</span>
    </div>
    <div class="bl-barcode-input">
        <input
            type="text"
            placeholder="Code-barres… Scannez puis appuyez sur Entrée"
            x-model="barcode"
            x-ref="barcodeInput"
            @keydown.enter.prevent="
                if (barcode.trim()) {
                    $wire.addProductByBarcode(barcode.trim());
                    barcode = '';
                    $nextTick(() => { if ($refs.barcodeInput) $refs.barcodeInput.focus(); });
                }
            "
            class="fi-input"
            autocomplete="off"
        />
    </div>
</div>
