<x-filament-panels::page>
@php
    $fmt = fn($n) => number_format((float)$n, 3, '.', ' ');
    $logoPath = public_path('logo.png');
    $logoUrl = is_file($logoPath)
        ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
        : asset('logo.png');
    $clients = \App\Models\Client::orderBy('name')->get(['id','name','adresse','phone_1']);
    $products = \App\Models\Product::query()
        ->select('id','designation_fr','prix','promo','promo_expiration_date')
        ->orderBy('designation_fr')
        ->get();
    $productMap = $products->mapWithKeys(fn($p) => [$p->id => $p->designation_fr])->all();
@endphp

<style>
/* ── POS reset ── */
.fi-page-ticket-pos .fi-page-header { display: none !important; }

.pos-wrap {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 13px;
    color: #222;
    padding: 12px 18px;
    max-width: 100%;
}

/* ── Top row ── */
.pos-top {
    display: flex;
    gap: 24px;
    margin-bottom: 14px;
}

.pos-company {
    flex: 0 0 260px;
}

.pos-company img.pos-logo {
    max-width: 200px;
    max-height: 80px;
    object-fit: contain;
    display: block;
    margin-bottom: 6px;
}

.pos-company .pos-company-name {
    font-weight: 700;
    font-size: 14px;
    color: #ff4a00;
}

.pos-company .pos-company-info {
    font-size: 11px;
    color: #555;
    line-height: 1.5;
}

.pos-client-block {
    flex: 1;
    position: relative;
}

.pos-add-client-btn {
    position: absolute;
    top: 0;
    right: 0;
    background: #17a2b8;
    color: #fff;
    border: 0;
    border-radius: 4px;
    padding: 5px 12px;
    font-size: 12px;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
}

.pos-add-client-btn:hover { background: #138496; }

.pos-field {
    display: flex;
    flex-direction: column;
    margin-bottom: 8px;
}

.pos-field label {
    font-size: 11px;
    color: #666;
    margin-bottom: 3px;
}

.pos-field select,
.pos-field input[type="text"],
.pos-field input[type="number"] {
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 5px 8px;
    font-size: 13px;
    width: 100%;
    background: #fff;
}

.pos-field select { max-width: 400px; }

.pos-field input[readonly],
.pos-field input[disabled] {
    background: #f5f5f5;
    color: #555;
}

/* ── Barcode bar ── */
.pos-barcode-bar {
    margin-bottom: 10px;
}

.pos-barcode-bar label {
    display: block;
    font-size: 11px;
    color: #666;
    margin-bottom: 3px;
}

.pos-barcode-input {
    width: 100%;
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 7px 10px;
    font-size: 13px;
}

.pos-barcode-input:focus {
    outline: none;
    border-color: #ff4a00;
    box-shadow: 0 0 0 2px rgba(255,74,0,.15);
}

/* ── Product Table ── */
.pos-table-wrap { overflow-x: auto; margin-bottom: 10px; }

.pos-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.pos-table thead th {
    background: #ff4a00;
    color: #fff;
    font-weight: 600;
    text-transform: uppercase;
    padding: 7px 8px;
    text-align: left;
    white-space: nowrap;
    font-size: 11px;
}

.pos-table thead th.th-num { text-align: right; }
.pos-table thead th.th-center { text-align: center; }

.pos-table tbody tr:nth-child(even) { background: #f9f9f9; }
.pos-table tbody tr:hover { background: #fff5f0; }

.pos-table tbody td {
    padding: 4px 6px;
    border-bottom: 1px solid #eee;
    vertical-align: middle;
}

.pos-table tbody td select,
.pos-table tbody td input {
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
    width: 100%;
    background: #fff;
}

.pos-table tbody td input[readonly],
.pos-table tbody td input[disabled] {
    background: #f0f0f0;
    color: #555;
    text-align: right;
}

.pos-table tbody td.td-num input { text-align: right; }

.pos-table tfoot td {
    padding: 6px 8px;
    border-top: 2px solid #ccc;
}

/* ── Add row button ── */
.pos-btn-add {
    background: #e8f5e9;
    color: #2e7d32;
    border: 1px solid #a5d6a7;
    border-radius: 4px;
    padding: 5px 14px;
    font-size: 12px;
    cursor: pointer;
    margin-bottom: 16px;
}
.pos-btn-add:hover { background: #c8e6c9; }

/* ── Delete btn ── */
.pos-btn-del {
    background: #dc3545;
    color: #fff;
    border: 0;
    border-radius: 3px;
    padding: 4px 9px;
    cursor: pointer;
    font-size: 13px;
}
.pos-btn-del:hover { background: #c82333; }

/* ── Totals block ── */
.pos-totals-wrap {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 16px;
}

.pos-totals {
    width: 360px;
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
}

.pos-tot-row {
    display: flex;
    align-items: center;
    border-bottom: 1px solid #eee;
}

.pos-tot-row:last-child { border-bottom: none; }

.pos-tot-label {
    flex: 1;
    padding: 7px 10px;
    font-size: 12px;
    color: #555;
    background: #f8f8f8;
    border-right: 1px solid #eee;
}

.pos-tot-value {
    width: 140px;
    padding: 5px 8px;
}

.pos-tot-value input {
    width: 100%;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
    text-align: right;
    background: #fff;
}

.pos-tot-value input[readonly] {
    background: #f0f0f0;
    color: #444;
}

.pos-tot-row.row-net .pos-tot-label {
    font-weight: 700;
    color: #222;
}

.pos-tot-row.row-net .pos-tot-value input {
    font-weight: 700;
    font-size: 14px;
    background: #fff8e1;
    border-color: #ffc107;
}

/* ── Footer ── */
.pos-footer {
    padding-top: 4px;
}

.pos-btn-save {
    background: #007bff;
    color: #fff;
    border: 0;
    border-radius: 4px;
    padding: 9px 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

.pos-btn-save:hover { background: #0069d9; }

/* ── Responsive ── */
@media (max-width: 768px) {
    .pos-top { flex-direction: column; }
    .pos-company { flex: none; }
    .pos-totals { width: 100%; }
    .pos-totals-wrap { justify-content: stretch; }
}
</style>

<div class="pos-wrap" id="pos-ticket-root">

    {{-- ── TOP ROW ── --}}
    <div class="pos-top">

        {{-- LEFT: Company info --}}
        <div class="pos-company">
            <img src="{{ $logoUrl }}" alt="Logo" class="pos-logo" onerror="this.style.display='none'">
        </div>

        {{-- RIGHT: Client block --}}
        <div class="pos-client-block">
            <div class="pos-field">
                <label>Client (optionnel)</label>
                <select wire:model.live="client_id">
                    <option value="">— Choisir —</option>
                    @foreach($clients as $c)
                        <option value="{{ $c->id }}" {{ $client_id == $c->id ? 'selected' : '' }}>{{ $c->name }}</option>
                    @endforeach
                </select>
            </div>

            <div class="pos-field">
                <label>Adresse</label>
                <input type="text" wire:model="client_adresse" readonly placeholder="—">
            </div>

            <div class="pos-field">
                <label>N° Tél</label>
                <input type="text" wire:model="client_phone" readonly placeholder="—">
            </div>
        </div>
    </div>

    {{-- ── BARCODE SCAN ── --}}
    <div class="pos-barcode-bar">
        <label>Scanner code à barre</label>
        <input type="text"
               class="pos-barcode-input"
               placeholder="barcode"
               wire:model="barcode"
               wire:keydown.enter.prevent="scanBarcode"
               id="pos-barcode-input"
               autocomplete="off">
    </div>

    {{-- ── PRODUCTS TABLE ── --}}
    <div class="pos-table-wrap">
        <table class="pos-table">
            <thead>
                <tr>
                    <th style="width:40%">Produits</th>
                    <th class="th-center" style="width:8%">Qté</th>
                    <th class="th-num" style="width:20%">P.U</th>
                    <th class="th-num" style="width:20%">P.T</th>
                    <th class="th-center" style="width:6%">×</th>
                </tr>
            </thead>
            <tbody>
                @foreach($lines as $i => $line)
                @php
                    $lineTotal = (float)($line['qte'] ?? 0) * (float)($line['prix_unitaire'] ?? 0);
                @endphp
                <tr wire:key="line-{{ $i }}">
                    <td>
                        <select wire:change="lineProductChanged({{ $i }}, $event.target.value)"
                                id="pos-prod-{{ $i }}">
                            <option value="">— Choisir un produit —</option>
                            @foreach($products as $p)
                                <option value="{{ $p->id }}" {{ (int)($line['produit_id'] ?? 0) === $p->id ? 'selected' : '' }}>
                                    {{ $p->designation_fr }}
                                </option>
                            @endforeach
                        </select>
                    </td>
                    <td class="td-num" style="text-align:center">
                        <input type="number"
                               wire:model.lazy="lines.{{ $i }}.qte"
                               min="0.001"
                               step="1"
                               wire:change="updatedLines">
                    </td>
                    <td class="td-num">
                        <input type="number"
                               wire:model.lazy="lines.{{ $i }}.prix_unitaire"
                               min="0"
                               step="0.001"
                               wire:change="updatedLines">
                    </td>
                    <td class="td-num">
                        <input type="text"
                               value="{{ $fmt($lineTotal) }}"
                               readonly>
                    </td>
                    <td style="text-align:center">
                        <button type="button"
                                class="pos-btn-del"
                                wire:click="removeLine({{ $i }})">🗑</button>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <button type="button" class="pos-btn-add" wire:click="addLine">++ Ajouter</button>

    {{-- ── TOTALS ── --}}
    <div class="pos-totals-wrap">
        <div class="pos-totals">
            <div class="pos-tot-row">
                <div class="pos-tot-label">Montant Total</div>
                <div class="pos-tot-value">
                    <input type="text" value="{{ $fmt($prix_ht) }}" readonly>
                </div>
            </div>
            <div class="pos-tot-row">
                <div class="pos-tot-label">Montant Remise</div>
                <div class="pos-tot-value">
                    <input type="number" wire:model.lazy="remise" step="0.001" min="0" wire:change="updatedRemise">
                </div>
            </div>
            <div class="pos-tot-row">
                <div class="pos-tot-label">Pourcentage Remise %</div>
                <div class="pos-tot-value">
                    <input type="number" wire:model.lazy="pourcentage_remise" step="0.1" min="0" max="100" wire:change="updatedPourcentageRemise">
                </div>
            </div>
            <div class="pos-tot-row row-net">
                <div class="pos-tot-label">Net à payer</div>
                <div class="pos-tot-value">
                    <input type="text" value="{{ $fmt($prix_ttc) }}" readonly>
                </div>
            </div>
        </div>
    </div>

    {{-- ── FOOTER: Save button ── --}}
    <div class="pos-footer">
        <button type="button" class="pos-btn-save" wire:click="save" wire:loading.attr="disabled">
            <span wire:loading.remove>Enregistrer</span>
            <span wire:loading>Enregistrement…</span>
        </button>
    </div>

</div>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        // Re-focus barcode input after scan
        Livewire.on('barcode-focus', () => {
            setTimeout(() => {
                const el = document.getElementById('pos-barcode-input');
                if (el) el.focus();
            }, 100);
        });
    });
</script>

</x-filament-panels::page>
