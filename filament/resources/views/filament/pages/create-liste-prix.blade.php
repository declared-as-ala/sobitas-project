@php
    $coordinate = \App\Models\Coordinate::getCached();

    $livewire = $getLivewire();
    $getLwData = [];

    if (method_exists($livewire, 'getRecord') && $livewire->getRecord()) {
        if (isset($livewire->data) && is_array($livewire->data)) {
            $getLwData = $livewire->data;
        }
        if ($getLwData === [] && method_exists($livewire, 'form')) {
            try {
                $raw = $livewire->form->getRawState();
                $getLwData = is_array($raw) ? $raw : [];
            } catch (\Throwable) {
                $getLwData = [];
            }
        }
    }

    $detailsRaw = $getLwData['details'] ?? null;
    if (is_string($detailsRaw)) {
        $detailsRaw = json_decode($detailsRaw, true) ?? [];
    }
    $getLwData['details'] = is_array($detailsRaw) ? $detailsRaw : [];

    // Edit: if form state lost encoding / wrong path, hydrate from DB so rows and labels load
    if (method_exists($livewire, 'getRecord') && ($rec = $livewire->getRecord())) {
        $rec->loadMissing('details');
        if ($getLwData['details'] === [] && $rec->details->isNotEmpty()) {
            $getLwData['designation'] = $getLwData['designation'] ?? $rec->designation;
            $getLwData['details'] = $rec->details->map(fn ($d) => [
                'produit_id' => $d->product_id,
                'prix_unitaire' => $d->prix_unitaire,
                'prix_gros' => $d->prix_gros ?? 0,
            ])->toArray();
        }
    }

    $selProductIds = collect($getLwData['details'] ?? [])->pluck('produit_id')->filter()->toArray();
    $selProducts = [];
    if (!empty($selProductIds)) {
        $selProducts = \App\Models\Product::whereIn('id', $selProductIds)
            ->get(['id', 'designation_fr', 'code_product'])
            ->keyBy('id')
            ->toArray();
    }

    $max = 200;

    $logoUrl = \App\Models\Coordinate::publicBrandLogoUrl();
    $logoPath = public_path('logo.png');
    $logoSrc  = is_file($logoPath)
        ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
        : null;
@endphp

{{-- No Bootstrap here: global Bootstrap CSS breaks Filament .fi-topbar flex (logo + user menu stuck left). --}}
<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet"/>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<style>
/* ── Force FULL WIDTH on Liste de Prix (do NOT target `form` — breaks Filament layout) ── */
body:has(.lp-page) .fi-main-ctn,
body:has(.lp-page) .fi-page,
body:has(.lp-page) .fi-resource-page,
body:has(.lp-page) .fi-fo-component-ctn,
body:has(.lp-page) .fi-fo-view,
body:has(.lp-page) .fi-fo-view > div {
    max-width: 100% !important;
    width: 100% !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
}
body:has(.lp-page) .fi-page-header { display: none !important; }
body:has(.lp-page) .fi-form-actions { display: none !important; }
body:has(.lp-page) [wire\:key] > .fi-fo-field-wrp-label { display: none !important; }

/* ── Restore Filament topbar: logo/start left, notifications + profile right ── */
body:has(.lp-page) .fi-topbar-ctn {
    width: 100% !important;
}
body:has(.lp-page) nav.fi-topbar {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    width: 100% !important;
    justify-content: flex-start !important;
}
body:has(.lp-page) .fi-topbar-end {
    margin-inline-start: auto !important;
    display: flex !important;
    align-items: center !important;
    flex-wrap: nowrap !important;
    gap: 0.35rem;
}

/* ── Aligné sur backend/resources/views/admin/price_lists.blade.php (Voyager) ── */
.lp-wrap { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 16px 24px; background: #f5f5f5; min-height: 100vh; }
.lp-form { background: #fff; border: 1px solid #e3e3e3; border-radius: 4px; padding: 20px; }

.lp-header-row {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    margin-left: 3px;
    margin-bottom: 3%;
    align-items: flex-start;
}
.lp-header-row .lp-company { flex: 1 1 260px; min-width: 200px; max-width: 100%; }
.lp-header-row .lp-desig-col { flex: 1 1 260px; min-width: 200px; max-width: 100%; }
.lp-mb-3 { margin-bottom: 1rem; }
.lp-form-control {
    width: 100%;
    border: 1px solid #ced4da;
    border-radius: 4px;
    padding: 0.375rem 0.75rem;
    font-size: 1rem;
    line-height: 1.5;
    background: #fff;
    color: #212529;
}
.lp-form-control:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0,123,255,.25);
}
.lp-btn {
    display: inline-block;
    font-weight: 400;
    text-align: center;
    vertical-align: middle;
    padding: 0.375rem 0.75rem;
    font-size: 1rem;
    line-height: 1.5;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
}
.lp-btn-primary { color: #fff; background-color: #007bff; border-color: #007bff; }
.lp-btn-primary:hover { background-color: #0069d9; border-color: #0062cc; }
.lp-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
.lp-btn-danger { color: #fff; background-color: #dc3545; border-color: #dc3545; padding: 0.25rem 0.5rem; font-size: 0.875rem; }
.lp-btn-danger:hover { background-color: #c82333; }
.lp-td-num { color: #6c757d; text-align: center; font-size: 12px; }

.lp-company img { height: 100px; object-fit: contain; display: block; margin-bottom: 8px; }
.lp-company h4 { font-size: 1.1rem; font-weight: 700; margin: 0 0 6px; }
.lp-company p { font-size: 14px; margin: 0; }

.lp-desig-block label { font-weight: 600; }
.lp-barcode label { font-weight: 600; display: block; margin-bottom: 6px; }

.lp-table-wrap { overflow-x: auto; margin-bottom: 12px; }
.lp-table { width: 100%; font-size: 13px; margin-bottom: 0; }
.lp-table thead th {
    background: #ff4000 !important;
    color: #fff !important;
    font-weight: 600 !important;
    text-transform: none;
    padding: 10px 8px !important;
    border-color: #ff4000 !important;
    vertical-align: middle;
}
.lp-table tbody td { padding: 8px; vertical-align: middle; border-top: 1px solid #dee2e6; }
.lp-table tbody tr:nth-child(odd) { background: #fafafa; }
.lp-table td .select2-container { min-width: 260px; width: 100% !important; }
.lp-table td .select2-container--default .select2-selection--single { min-height: 38px; border: 1px solid #ced4da; border-radius: 4px; }
.lp-table td .select2-container--default .select2-selection--single .select2-selection__rendered { line-height: 36px; padding-left: 8px; }
.lp-table td .select2-container--default .select2-selection--single .select2-selection__arrow { height: 36px; }
.lp-table td input.tbl-input { width: 100%; max-width: 140px; text-align: right; }
.lp-table td input.code-input { background: #e9ecef; }

.lp-add-wrap { float: left; margin-bottom: 24px; }
.lp-footer { clear: both; margin-top: 16px; padding-top: 16px; border-top: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; }
.lp-count { font-size: 14px; color: #6c757d; }
.lp-count strong { color: #212529; }
</style>

<div class="lp-page" wire:ignore>
<div class="lp-wrap">
    <div class="lp-form">

        <div class="lp-header-row">
            <div class="lp-company">
                @if($logoUrl)
                    <img src="{{ $logoUrl }}" alt="{{ $coordinate->abbreviation ?? 'Sobitas' }}">
                @elseif($logoSrc)
                    <img src="{{ $logoSrc }}" alt="Sobitas">
                @endif
                @if($coordinate)
                    <h4>{{ $coordinate->abbreviation ?? $coordinate->name_fr ?? '' }}</h4>
                    <p><span></span> {{ $coordinate->phone_1 }}@if($coordinate->phone_2) / {{ $coordinate->phone_2 }}@endif</p>
                @endif
            </div>
            <div class="lp-desig-col">
                <div class="lp-desig-block lp-mb-3">
                    <label for="lp_designation">Désignation Liste de Prix</label>
                    <input type="text" class="lp-form-control" id="lp_designation" placeholder="Ex: Prix Détail 2025" required
                           value="{{ $getLwData['designation'] ?? '' }}"
                           oninput="lpUpdateCount()">
                </div>
            </div>
        </div>

        <div class="lp-barcode lp-mb-3">
            <label>Scanner code à barre</label>
            <input type="text" class="lp-form-control" id="lp_barcode" placeholder="barcode" autocomplete="off" onchange="lpScanner()">
        </div>

        <div class="lp-table-wrap">
            <table class="lp-table">
                <thead>
                    <tr>
                        <th scope="col" style="width:2.5rem">#</th>
                        <th scope="col">Produits</th>
                        <th scope="col">Code Barre</th>
                        <th scope="col">Prix Gros</th>
                        <th scope="col">Prix Unitaire</th>
                        <th scope="col" style="width:3rem"></th>
                    </tr>
                </thead>
                <tbody>
                    @for($i = 1; $i <= $max; $i++)
                    <tr id="lp-row-{{ $i }}" style="{{ $i > 1 ? 'display:none;' : '' }}">
                        <td class="lp-td-num">{{ $i }}</td>
                        <td style="min-width:300px">
                            <select id="lp_prod_{{ $i }}" class="lp-form-control" style="width:100%" onchange="lpSelectProd({{ $i }})">
                                <option value="">— Choisir —</option>
                            </select>
                        </td>
                        <td><input type="text" class="lp-form-control code-input" id="lp_code_{{ $i }}" disabled value="" placeholder="—"></td>
                        <td><input type="number" class="lp-form-control tbl-input" id="lp_gros_{{ $i }}" value="0" min="0" step="0.001"></td>
                        <td><input type="number" class="lp-form-control tbl-input" id="lp_pu_{{ $i }}" value="0" min="0" step="0.001"></td>
                        <td>
                            <button type="button" class="lp-btn lp-btn-danger" onclick="lpRemoveRow({{ $i }})" title="Supprimer">✕</button>
                        </td>
                    </tr>
                    @endfor
                </tbody>
            </table>
        </div>

        <div class="lp-add-wrap">
            <button type="button" class="lp-btn lp-btn-primary" onclick="lpAddRow()">+ Ajouter</button>
        </div>

        <div class="lp-footer">
            <div class="lp-count">Total produits : <strong id="lp_count">0</strong></div>
            <button type="button" class="lp-btn lp-btn-primary save" id="lp_save_btn" onclick="lpSave()">Enregistrer</button>
        </div>

    </div>
</div>
</div>

<script>
var lpMax = {{ $max }};

function lpInitializeForm() {
    try {
        for (let i = 1; i <= lpMax; i++) {
            var $el = $('#lp_prod_' + i);
            if ($el.hasClass('select2-hidden-accessible')) $el.select2('destroy');
        }
    } catch(e) {}

    var initData  = @json($getLwData);
    var selProds  = @json($selProducts);

    if (initData && initData.details && typeof initData.details === 'string') {
        try { initData.details = JSON.parse(initData.details); } catch (e) { initData.details = []; }
    }
    if (initData && initData.details && Array.isArray(initData.details) && initData.details.length > 0) {
        lpHydrate(initData, selProds);
    } else {
        lpInitSelect2(1);
        lpUpdateCount();
    }
}

$(document).ready(function() { lpInitializeForm(); });

window.lpFormReinit = function() {
    setTimeout(function() { lpInitializeForm(); }, 50);
};

if (typeof window.Livewire !== 'undefined') {
    document.addEventListener('livewire:initialized', function() {
        setTimeout(function() { lpInitializeForm(); }, 50);
    });
}

function lpHydrate(data, selProds) {
    var details = data.details || [];
    var i = 1;
    details.forEach(function(item) {
        if (!item.produit_id || i > lpMax) return;
        var r = document.getElementById('lp-row-' + i);
        if (r) r.style.display = '';
        lpInitSelect2(i);

        var $sel = $('#lp_prod_' + i);
        var pInfo = selProds[item.produit_id];
        if (pInfo) {
            var label = pInfo.designation_fr + (pInfo.code_product ? ' - ' + pInfo.code_product : '');
            var newOption = new Option(label, item.produit_id, true, true);
            $sel.append(newOption).trigger('change.select2');
            document.getElementById('lp_code_' + i).value = pInfo.code_product || '';
        } else {
            $sel.val(item.produit_id).trigger('change.select2');
        }

        document.getElementById('lp_gros_' + i).value = parseFloat(item.prix_gros || 0).toFixed(3);
        document.getElementById('lp_pu_' + i).value   = parseFloat(item.prix_unitaire || 0).toFixed(3);
        i++;
    });
    lpUpdateCount();
}

function lpInitSelect2(i) {
    var $el = $('#lp_prod_' + i);
    if ($el.hasClass('select2-hidden-accessible')) return;
    $el.select2({
        placeholder: '— Choisir —',
        allowClear: true,
        width: '100%',
        ajax: {
            url: @json(route('api.pos-products')),
            dataType: 'json',
            delay: 250,
            data: function(params) { return { q: params.term || '' }; },
            cache: true
        },
        language: { noResults: function() { return 'Aucun résultat'; } }
    });
    $el.on('change', function() { lpSelectProd(i); });
}

function lpSelectProd(i) {
    var sel = $('#lp_prod_' + i).select2('data')[0];
    if (!sel || !sel.id) {
        document.getElementById('lp_code_' + i).value = '';
        return;
    }
    document.getElementById('lp_code_' + i).value = sel.code_product || '';
    document.getElementById('lp_pu_' + i).value   = parseFloat(sel.prix || 0).toFixed(3);
    lpUpdateCount();
}

function lpAddRow() {
    for (let i = 1; i <= lpMax; i++) {
        var r = document.getElementById('lp-row-' + i);
        if (r && r.style.display === 'none') {
            r.style.display = '';
            lpInitSelect2(i);
            $('#lp_prod_' + i).val('').trigger('change.select2');
            document.getElementById('lp_code_' + i).value = '';
            document.getElementById('lp_gros_' + i).value = '0';
            document.getElementById('lp_pu_' + i).value   = '0';
            lpUpdateCount();
            break;
        }
    }
}

function lpRemoveRow(i) {
    document.getElementById('lp-row-' + i).style.display = 'none';
    $('#lp_prod_' + i).val('').trigger('change.select2');
    document.getElementById('lp_code_' + i).value = '';
    document.getElementById('lp_gros_' + i).value = '0';
    document.getElementById('lp_pu_' + i).value   = '0';
    lpUpdateCount();
}

function lpUpdateCount() {
    var count = 0;
    for (let i = 1; i <= lpMax; i++) {
        var r = document.getElementById('lp-row-' + i);
        if (r && r.style.display !== 'none' && $('#lp_prod_' + i).val()) count++;
    }
    document.getElementById('lp_count').textContent = count;
}

function lpScanner() {
    var barcodeInput = document.getElementById('lp_barcode');
    var raw = barcodeInput.value.trim();
    if (!raw) return;
    var code = (parseInt(raw) + 1) + '';
    barcodeInput.disabled = true;

    fetch(@json(url(route('api.pos-barcode'))) + '?code=' + encodeURIComponent(code))
        .then(res => res.json())
        .then(found => {
            barcodeInput.disabled = false;
            barcodeInput.value = '';
            barcodeInput.focus();

            if (found) {
                // Check if product already in list
                for (let i = 1; i <= lpMax; i++) {
                    var r = document.getElementById('lp-row-' + i);
                    if (r && r.style.display !== 'none' && $('#lp_prod_' + i).val() == found.id) {
                        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Produit déjà dans la liste', showConfirmButton: false, timer: 2000 });
                        return;
                    }
                }
                lpAddRow();
                for (let i = 1; i <= lpMax; i++) {
                    var r = document.getElementById('lp-row-' + i);
                    if (r && r.style.display !== 'none' && !$('#lp_prod_' + i).val()) {
                        var label = found.designation + (found.code_product ? ' - ' + found.code_product : '');
                        var newOption = new Option(label, found.id, true, true);
                        $('#lp_prod_' + i).append(newOption).trigger('change');
                        document.getElementById('lp_code_' + i).value = found.code_product || '';
                        document.getElementById('lp_pu_' + i).value   = parseFloat(found.prix_unitaire || 0).toFixed(3);
                        lpUpdateCount();
                        break;
                    }
                }
            } else {
                Swal.fire('Introuvable', 'Aucun produit trouvé', 'warning');
            }
        })
        .catch(() => {
            barcodeInput.disabled = false;
            barcodeInput.value = '';
        });
}

function lpSave() {
    var designation = document.getElementById('lp_designation').value.trim();
    if (!designation) {
        Swal.fire('Erreur', 'Veuillez saisir la désignation de la liste', 'warning');
        document.getElementById('lp_designation').focus();
        return;
    }

    var lines = [];
    for (let i = 1; i <= lpMax; i++) {
        var r = document.getElementById('lp-row-' + i);
        if (!r || r.style.display === 'none') continue;
        var pid = $('#lp_prod_' + i).val();
        if (!pid) continue;
        lines.push({
            produit_id:    pid,
            prix_gros:     parseFloat(document.getElementById('lp_gros_' + i).value) || 0,
            prix_unitaire: parseFloat(document.getElementById('lp_pu_' + i).value)   || 0,
        });
    }

    if (lines.length === 0) {
        Swal.fire('Erreur', 'Ajoutez au moins un produit', 'warning');
        return;
    }

    var saveBtn = document.getElementById('lp_save_btn');
    if (saveBtn) saveBtn.disabled = true;
    function lpReleaseSaveBtn() {
        if (saveBtn) saveBtn.disabled = false;
    }

    try {
        @this.set('data.designation', designation);
        @this.set('data.details', lines);
        setTimeout(function() {
            var req = @this.call('save');
            if (req && typeof req.finally === 'function') {
                req.finally(lpReleaseSaveBtn);
            } else if (req && typeof req.then === 'function') {
                req.then(lpReleaseSaveBtn).catch(lpReleaseSaveBtn);
            } else {
                setTimeout(lpReleaseSaveBtn, 1200);
            }
        }, 100);
    } catch(e) {
        console.error('Error saving', e);
        Swal.fire('Erreur', 'Erreur lors de la sauvegarde: ' + (e.message || 'Erreur inconnue'), 'error');
        lpReleaseSaveBtn();
    }
}

document.addEventListener('keypress', function(e) {
    if (e.keyCode === 13 && e.target.id !== 'lp_barcode') e.preventDefault();
});
</script>
