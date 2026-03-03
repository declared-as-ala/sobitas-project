<div class="ftva-barcode">
    <div class="ftva-barcode-left">
        <div class="ftva-barcode-title">Scan de code-barres</div>
        <div class="ftva-barcode-sub">Scannez un code-barres puis appuyez sur Entrée</div>
    </div>
    <div class="ftva-barcode-right">
        <input
            class="ftva-barcode-input"
            placeholder="Code-barres..."
            wire:keydown.enter.prevent="addProductByBarcode($event.target.value); $event.target.value = ''"
        />
    </div>
</div>

