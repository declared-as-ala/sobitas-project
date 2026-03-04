{{-- Barcode scan UI — full width, autofocus, French labels --}}
<div
    class="bl-barcode"
    x-data="{ barcode: '', scanning: false }"
    x-init="$nextTick(() => $refs.barcodeInput && $refs.barcodeInput.focus())"
>
    <div class="bl-barcode-title">
        <x-filament::icon icon="heroicon-o-qr-code" class="bl-barcode-icon" />
        <span>Scanner</span>
    </div>
    <div class="bl-barcode-input">
        <input
            type="text"
            placeholder="Code-barres…"
            x-model="barcode"
            x-ref="barcodeInput"
            :disabled="scanning"
            @keydown.enter.prevent="
                if (barcode && barcode.trim()) {
                    scanning = true;
                    $wire.addProductByBarcode(barcode.trim()).then(() => {
                        barcode = '';
                        scanning = false;
                        $nextTick(() => $refs.barcodeInput && $refs.barcodeInput.focus());
                    }).catch(() => {
                        scanning = false;
                    });
                }
            "
            class="fi-input"
            autocomplete="off"
        />
        <p class="bl-barcode-helper">
            Scannez ou saisissez le code, puis appuyez sur <kbd>Entrée</kbd>.
        </p>
    </div>
</div>
