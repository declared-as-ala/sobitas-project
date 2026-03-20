@php
    $coordinate = \App\Models\Coordinate::getCached();

    $getLwData = method_exists($getLivewire(), 'getRecord') && $getLivewire()->getRecord()
        ? $getLivewire()->data
        : [];

    $selProductIds = collect($getLwData['details'] ?? [])->pluck('produit_id')->filter()->toArray();
    $selProducts = [];
    if (!empty($selProductIds)) {
        $selProducts = \App\Models\Product::whereIn('id', $selProductIds)
            ->get(['id', 'designation_fr', 'code_product'])
            ->keyBy('id')
            ->toArray();
    }

    $max = 200;

    $logoPath = public_path('logo.png');
    $logoSrc  = is_file($logoPath)
        ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
        : null;
@endphp

<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet"/>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<style>
/* ── Force FULL WIDTH on Liste de Prix Pages ──────────────────────────────── */
body:has(.lp-page) .fi-main-ctn,
body:has(.lp-page) .fi-page,
body:has(.lp-page) .fi-resource-page,
body:has(.lp-page) form,
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

.lp-wrap { font-family: 'Inter', Arial, sans-serif; padding: 16px 24px; background: #f9fafb; min-height: 100vh; }
.lp-form { background: #fff; border-radius: 12px; box-shadow: 0 1px 8px rgba(0,0,0,.08); padding: 24px; }

.lp-top { display: flex; gap: 24px; margin-bottom: 20px; align-items: flex-start; }
.lp-company { flex: 0 0 42%; }
.lp-company img { height: 80px; object-fit: contain; margin-bottom: 8px; display: block; }
.lp-company h4 { font-size: 16px; font-weight: 700; margin: 0 0 4px; color: #1e293b; }
.lp-company p { font-size: 13px; color: #475569; margin: 2px 0; }

.lp-header-right { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.lp-title-block h2 { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 4px; text-transform: uppercase; letter-spacing: .04em; }
.lp-title-block p { font-size: 13px; color: #64748b; margin: 0; }

.lp-desig-block label { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px; }
.lp-desig-block input { width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px 14px; font-size: 14px; color: #1e293b; background: #fff; }
.lp-desig-block input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.2); }

.lp-barcode { margin-bottom: 16px; }
.lp-barcode label { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px; }
.lp-barcode input { width: 100%; border: 1px solid #fdba74; border-radius: 6px; padding: 9px 14px; font-size: 15px; background: #fff7ed; }
.lp-barcode input:focus { outline: none; border-color: #f97316; box-shadow: 0 0 0 2px rgba(249,115,22,.2); }

.lp-table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 12px; }
.lp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lp-table thead th { background: #f8fafc; color: #334155; font-weight: 700; text-transform: uppercase; padding: 10px 8px; text-align: left; font-size: 11px; letter-spacing: .05em; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
.lp-table tbody tr:nth-child(even) { background: #fafaf9; }
.lp-table tbody td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
.lp-table td .select2-container { min-width: 240px; width: 100% !important; }
.lp-table td .select2-container--default .select2-selection--single { border: 1px solid #cbd5e1; border-radius: 6px; height: 34px; }
.lp-table td .select2-container--default .select2-selection--single .select2-selection__rendered { line-height: 32px; font-size: 13px; }
.lp-table td .select2-container--default .select2-selection--single .select2-selection__arrow { height: 32px; }
.lp-table td input.tbl-input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 13px; width: 110px; text-align: right; background: #fff; height: 34px; }
.lp-table td input.tbl-input:disabled { background: #f1f5f9; color: #64748b; border-color: transparent; font-weight: 600; }
.lp-table td input.code-input { border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-size: 12px; width: 120px; background: #f8fafc; height: 34px; color: #64748b; }

.btn-add-row { background: #ecfdf5; color: #059669; border: 1px dashed #34d399; border-radius: 6px; padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 24px; }
.btn-add-row:hover { background: #d1fae5; border-color: #10b981; }
.btn-del-row { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
.btn-del-row:hover { background: #fee2e2; }

.lp-footer { margin-top: 24px; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
.lp-count { font-size: 13px; color: #64748b; }
.lp-count strong { color: #1e293b; }
.btn-save { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 10px 32px; font-size: 15px; font-weight: 700; cursor: pointer; }
.btn-save:hover { background: #1d4ed8; }
.btn-save:disabled { background: #93c5fd; cursor: not-allowed; }
</style>

<div class="lp-page" wire:ignore>
<div class="lp-wrap">
    <div class="lp-form">

        {{-- ── Top: company left + title/designation right ── --}}
        <div class="lp-top">
            <div class="lp-company">
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" alt="Sobitas">
                @endif
                @if($coordinate)
                    <h4>{{ $coordinate->abbreviation ?? $coordinate->name_fr ?? '' }}</h4>
                    <p>{{ $coordinate->phone_1 }}@if($coordinate->phone_2) / {{ $coordinate->phone_2 }}@endif</p>
                    <p>{{ $coordinate->adresse_fr ?? $coordinate->adresse ?? '' }}</p>
                @endif
            </div>

            <div class="lp-header-right">
                <div class="lp-title-block">
                    <h2>Liste de Prix</h2>
                    <p>Tarification produits</p>
                </div>
                <div class="lp-desig-block">
                    <label for="lp_designation">Désignation de la liste *</label>
                    <input type="text" id="lp_designation" placeholder="Ex : Prix Détail 2025"
                           value="{{ $getLwData['designation'] ?? '' }}"
                           oninput="lpUpdateCount()">
                </div>
            </div>
        </div>

        {{-- ── Barcode scanner ── --}}
        <div class="lp-barcode">
            <label>Scanner code à barre</label>
            <input type="number" id="lp_barcode" placeholder="Scannez ou saisissez un code barre..." autocomplete="off" onchange="lpScanner()">
        </div>

        {{-- ── Products table ── --}}
        <div class="lp-table-wrap">
            <table class="lp-table">
                <thead>
                    <tr>
                        <th style="width:30px">#</th>
                        <th style="min-width:260px">Produit</th>
                        <th style="min-width:120px">Code Barre</th>
                        <th style="min-width:120px">Prix Gros</th>
                        <th style="min-width:120px">Prix Unitaire</th>
                        <th style="width:50px"></th>
                    </tr>
                </thead>
                <tbody>
                    @for($i = 1; $i <= $max; $i++)
                    <tr id="lp-row-{{ $i }}" style="{{ $i > 1 ? 'display:none;' : '' }}">
                        <td style="color:#94a3b8;font-size:12px;text-align:center;">{{ $i }}</td>
                        <td>
                            <select id="lp_prod_{{ $i }}" style="width:100%" onchange="lpSelectProd({{ $i }})">
                                <option value="">— Choisir —</option>
                            </select>
                        </td>
                        <td><input type="text" class="code-input" id="lp_code_{{ $i }}" disabled value="" placeholder="—"></td>
                        <td><input type="number" class="tbl-input" id="lp_gros_{{ $i }}" value="0" min="0" step="0.001"></td>
                        <td><input type="number" class="tbl-input" id="lp_pu_{{ $i }}" value="0" min="0" step="0.001"></td>
                        <td><button type="button" class="btn-del-row" onclick="lpRemoveRow({{ $i }})">✕</button></td>
                    </tr>
                    @endfor
                </tbody>
            </table>
        </div>
        <button type="button" class="btn-add-row" onclick="lpAddRow()">+ Ajouter un produit</button>

        {{-- ── Footer ── --}}
        <div class="lp-footer">
            <div class="lp-count">Total produits : <strong id="lp_count">0</strong></div>
            <button type="button" class="btn-save" id="lp_save_btn" onclick="lpSave()">💾 Enregistrer</button>
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
            url: '/api/pos-products',
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

    fetch('/api/pos-barcode?code=' + encodeURIComponent(code))
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

    try {
        @this.set('data.designation', designation);
        @this.set('data.details', lines);
        setTimeout(function() {
            @this.call('save');
        }, 100);
    } catch(e) {
        console.error('Error saving', e);
        Swal.fire('Erreur', 'Erreur lors de la sauvegarde: ' + (e.message || 'Erreur inconnue'), 'error');
        if (saveBtn) saveBtn.disabled = false;
    }
}

document.addEventListener('keypress', function(e) {
    if (e.keyCode === 13 && e.target.id !== 'lp_barcode') e.preventDefault();
});
</script>
