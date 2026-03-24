@php
    $coordinate = \App\Models\Coordinate::getCached();
    $max = 100;

    // Get current Livewire form data (create or edit) so we can hydrate Select2 and totals.
    $getLwData = method_exists($getLivewire(), 'getRecord') && $getLivewire()->getRecord()
        ? $getLivewire()->data
        : [];

    // Preload selected products so Select2 can show proper labels immediately on edit.
    $selProductIds = collect($getLwData['details'] ?? [])->pluck('produit_id')->filter()->toArray();
    $selProducts = [];
    if (! empty($selProductIds)) {
        $selProducts = \App\Models\Product::whereIn('id', $selProductIds)
            ->get(['id', 'designation_fr', 'qte', 'code_product'])
            ->mapWithKeys(function ($p) {
                return [$p->id => [
                    'id' => $p->id,
                    'text' => $p->designation_fr . ' (' . ($p->qte ?? 0) . ') - ' . $p->code_product,
                    'designation_fr' => $p->designation_fr,
                    'qte' => $p->qte,
                    'code_product' => $p->code_product,
                ]];
            })
            ->toArray();
    }

    // Preload selected client so the client Select2 can render the label on edit without extra AJAX.
    $selClientId = $getLwData['client_id'] ?? null;
    $selClient = $selClientId ? \App\Models\Client::find($selClientId) : null;

    // Embed logo as base64 so it always works (no 404, no asset path issues)
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
/* ── Force FULL WIDTH on Bon de Livraison Pages using the .bl-page wrapper ─────────── */
body:has(.bl-page) .fi-main-ctn,
body:has(.bl-page) .fi-page,
body:has(.bl-page) .fi-resource-page,
body:has(.bl-page) form,
body:has(.bl-page) .fi-fo-component-ctn,
body:has(.bl-page) .fi-fo-view,
body:has(.bl-page) .fi-fo-view > div {
    max-width: 100% !important;
    width: 100% !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
}

body:has(.bl-page) .fi-page-header { display: none !important; }
body:has(.bl-page) .fi-form-actions { display: none !important; }
/* Hide the Filament form label wrapper around our ViewField */
body:has(.bl-page) [wire\:key] > .fi-fo-field-wrp-label { display: none !important; }

.bl-wrap{font-family:'Inter',Arial,sans-serif;padding:16px 24px;background:#f9fafb;min-height:100vh}

.bl-form{background:#fff;border-radius:12px;box-shadow:0 1px 8px rgba(0,0,0,.08);padding:24px}

.bl-top{display:flex;gap:24px;margin-bottom:20px;align-items:flex-start}
.bl-company{flex:0 0 42%}
.bl-company img{height:80px;object-fit:contain;margin-bottom:8px;display:block}
.bl-company h4{font-size:16px;font-weight:700;margin:0 0 4px;color:#1e293b}
.bl-company p{font-size:13px;color:#475569;margin:2px 0}

.bl-client{flex:1}
.bl-client-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.bl-client label{font-size:13px;font-weight:600;color:#374151}
.bl-client .form-field{margin-bottom:10px}
.bl-client input.bl-input{width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:13px;color:#374151;background:#f8fafc}
.bl-client input.bl-input:disabled{background:#f1f5f9;color:#64748b}

.btn-ajouter-client{background:#2563eb;color:#fff;border:none;border-radius:6px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer}
.btn-annuler-client{background:#ef4444;color:#fff;border:none;border-radius:6px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer}

.bl-barcode{margin-bottom:16px}
.bl-barcode label{font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px}
.bl-barcode input{width:100%;border:1px solid #fdba74;border-radius:6px;padding:9px 14px;font-size:15px;background:#fff7ed}
.bl-barcode input:focus{outline:none;border-color:#f97316;box-shadow:0 0 0 2px rgba(249,115,22,.2)}

.bl-table-wrap{overflow-x:auto;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:12px}
.bl-table{width:100%;border-collapse:collapse;font-size:13px}
.bl-table thead th{background:#f8fafc;color:#334155;font-weight:700;text-transform:uppercase;padding:10px 8px;text-align:left;font-size:11px;letter-spacing:.05em;border-bottom:2px solid #e2e8f0;white-space:nowrap}
.bl-table tbody tr:nth-child(even){background:#fafaf9}
.bl-table tbody td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:middle}
.bl-table td .select2-container{min-width:220px;width:100%!important}
.bl-table td .select2-container--default .select2-selection--single{border:1px solid #cbd5e1;border-radius:6px;height:34px}
.bl-table td .select2-container--default .select2-selection--single .select2-selection__rendered{line-height:32px;font-size:13px}
.bl-table td .select2-container--default .select2-selection--single .select2-selection__arrow{height:32px}
.bl-table td input.tbl-input{border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:13px;width:80px;text-align:right;background:#fff;height:34px}
.bl-table td input.tbl-input:disabled{background:#f1f5f9;color:#64748b;border-color:transparent;font-weight:600}

.btn-add-row{background:#ecfdf5;color:#059669;border:1px dashed #34d399;border-radius:6px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:24px}
.btn-add-row:hover{background:#d1fae5;border-color:#10b981}
.btn-del-row{background:#fef2f2;color:#ef4444;border:1px solid #fecaca;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:12px}
.btn-del-row:hover{background:#fee2e2}

.bl-bottom{display:flex;gap:24px;margin-top:8px}
.bl-spacer{flex:1}
.bl-totals{flex:0 0 380px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.bl-totals table{width:100%;border-collapse:collapse}
.bl-totals table td{padding:8px 12px;font-size:13px;border-bottom:1px solid #f1f5f9}
.bl-totals table td:first-child{color:#475569;font-weight:500}
.bl-totals table td:last-child{text-align:right}
.bl-totals table input.tot-input{width:120px;border:1px solid #cbd5e1;border-radius:5px;padding:4px 8px;font-size:13px;text-align:right;background:#fff}
.bl-totals table input.tot-input:disabled{background:#f8fafc;border-color:transparent;color:#1e293b;font-weight:700}
.bl-net-row{background:#eff6ff}
.bl-net-row td{font-size:15px!important;font-weight:800!important;color:#1e40af!important}

.bl-footer{margin-top:24px;text-align:right;border-top:1px solid #e2e8f0;padding-top:16px}
.btn-save{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:10px 32px;font-size:15px;font-weight:700;cursor:pointer}
.btn-save:hover{background:#1d4ed8}
</style>

<div class="bl-page" wire:ignore>
<div class="bl-wrap">
    <div class="bl-form">
        {{-- TOP ROW --}}
        <div class="bl-top">
            <div class="bl-company">
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" alt="Sobitas" style="height:80px;object-fit:contain;margin-bottom:8px;display:block">
                @endif
                @if($coordinate)
                    <h4>{{ $coordinate->abbreviation ?? $coordinate->name_fr ?? '' }}</h4>
                    <p>{{ $coordinate->phone_1 }} @if($coordinate->phone_2) / {{ $coordinate->phone_2 }} @endif</p>
                    <p>{{ $coordinate->adresse_fr ?? $coordinate->adresse ?? '' }}</p>
                @endif
            </div>

            <div class="bl-client">
                <div class="bl-client-head">
                    <label>Client</label>
                    <button type="button" id="bl-btn-add-client" class="btn-ajouter-client">Ajouter Client(e)</button>
                </div>
                <div id="bl-select-client">
                    <div class="form-field">
                        <select id="bl_client_id" style="width:100%">
                            <option value="">— Choisir un client —</option>
                            @if($selClient)
                                <option value="{{ $selClient->id }}" selected>
                                    {{ $selClient->name }} ({{ $selClient->phone_1 }})
                                </option>
                            @endif
                        </select>
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">Adresse :</label>
                        <input class="bl-input" id="bl_adr" disabled
                               value="{{ $selClient ? $selClient->adresse : '' }}">
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;color:#64748b;display:block;margin-bottom:4px;">N°Tél :</label>
                        <input class="bl-input" id="bl_phone" disabled
                               value="{{ $selClient ? $selClient->phone_1 : '' }}">
                    </div>
                </div>

                {{-- SHIPPING DETAILS (keep in DOM but hidden; used internally for saving/printing) --}}
                <div id="bl-shipping-details" style="display:none;">
                    <input class="bl-input" id="bl_livraison_nom">
                    <input class="bl-input" id="bl_livraison_phone">
                    <input class="bl-input" id="bl_livraison_email" type="email">
                    <input class="bl-input" id="bl_livraison_adresse1">
                    <input class="bl-input" id="bl_livraison_ville">
                    <input class="bl-input" id="bl_livraison_region">
                    <input class="bl-input" id="bl_livraison_cp">
                </div>
            </div>
        </div>

        {{-- BARCODE --}}
        <div class="bl-barcode">
            <label>Scanner code à barre</label>
            <input type="number" id="bl_barcode" placeholder="barcode" autocomplete="off" autofocus onchange="blScanner()">
        </div>

        {{-- PRODUCT TABLE --}}
        <div class="bl-table-wrap">
            <table class="bl-table" id="bl-products-table">
                <thead>
                    <tr>
                        <th style="min-width:280px">Produits</th>
                        <th style="min-width:70px">Qte</th>
                        <th style="min-width:90px">P.U</th>
                        <th style="min-width:90px">P.T</th>
                        <th style="min-width:50px">#</th>
                    </tr>
                </thead>
                <tbody>
                    @for($i = 1; $i <= $max; $i++)
                    <tr id="bl-row-{{ $i }}" style="{{ $i > 1 ? 'display:none;' : '' }}">
                        <td>
                            <select id="bl_prod_{{ $i }}" style="width:100%" onchange="blSelectProd({{ $i }})">
                                <option value="">— Choisir —</option>
                            </select>
                        </td>
                        <td><input type="number" class="tbl-input" id="bl_qte_{{ $i }}" value="1" min="0.001" step="1" onchange="blCalculate()" oninput="blCalculate()"></td>
                        <td><input type="number" class="tbl-input" id="bl_pu_{{ $i }}" value="0" min="0" step="0.001" onchange="blCalculate()" oninput="blCalculate()"></td>
                        <td><input type="number" class="tbl-input" id="bl_ptht_{{ $i }}" value="0" min="0" step="0.001" disabled></td>
                        <td><button type="button" class="btn-del-row" onclick="blRemoveRow({{ $i }})">✕</button></td>
                    </tr>
                    @endfor
                </tbody>
            </table>
        </div>
        <button type="button" class="btn-add-row" onclick="blAddRow()">Ajouter</button>

        {{-- TOTALS --}}
        <div class="bl-bottom">
            <div class="bl-spacer"></div>
            <div class="bl-totals">
                <table>
                    <tr>
                        <td>Montant Total</td>
                        <td><input class="tot-input" id="bl_p_ht" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Montant Remise</td>
                        <td><input class="tot-input" id="bl_remise" value="0.000" step="0.001"
                                   onkeyup="blCalculate('mt_remise')" onchange="blCalculate('mt_remise')"></td>
                    </tr>
                    <tr>
                        <td>Poucentage Remise %</td>
                        <td><input class="tot-input" id="bl_pourcent_remise" value="0" step="0.001"
                                   onkeyup="blCalculate('pourcen_remise')" onchange="blCalculate('pourcen_remise')"></td>
                    </tr>
                    <tr>
                        <td>Frais de livraison</td>
                        <td><input class="tot-input" id="bl_frais_livraison" value="0.000" step="0.001"
                                   onkeyup="blCalculate()" onchange="blCalculate()"></td>
                    </tr>
                    <tr class="bl-net-row">
                        <td>Net à payer</td>
                        <td><input class="tot-input" id="bl_net" disabled value="0.000"></td>
                    </tr>
                </table>
                <input type="hidden" id="bl_apres_remise" value="0">
            </div>
        </div>

        <div class="bl-footer">
            <button type="button" class="btn-save" onclick="blSave()">💾 Enregistrer</button>
        </div>
    </div>
</div>
</div>

<script>
var blMax = {{ $max }};
var blDefaultTva = 0;
var _blIsHydrating = false; // flag to suppress side-effects during programmatic hydration

function getBlWire() {
    var el = document.querySelector('.bl-page');
    if (!el) return null;
    var wireEl = el.closest('[wire\\:id]') || document.querySelector('[wire\\:id]');
    return (wireEl && window.Livewire) ? window.Livewire.find(wireEl.getAttribute('wire:id')) : null;
}

function blInitializeForm() {
    if (typeof jQuery === 'undefined' || typeof jQuery.fn.select2 === 'undefined') {
        setTimeout(blInitializeForm, 100);
        return;
    }

    try {
        if ($('#bl_client_id').hasClass('select2-hidden-accessible')) $('#bl_client_id').select2('destroy');
        for (var i = 1; i <= blMax; i++) {
            if ($('#bl_prod_' + i).hasClass('select2-hidden-accessible')) $('#bl_prod_' + i).select2('destroy');
        }
    } catch (e) {}

    @if($selClient)
        window.blInitialClientAdresse = @json($selClient->adresse ?? '');
        window.blInitialClientPhone   = @json($selClient->phone_1 ?? '');
    @else
        window.blInitialClientAdresse = '';
        window.blInitialClientPhone   = '';
    @endif

    $('#bl_client_id').select2({
        placeholder: '— Choisir un client —',
        allowClear: true,
        width: '100%',
        minimumInputLength: 0,
        ajax: {
            url: '/api/pos-clients',
            dataType: 'json',
            delay: 250,
            data: function (params) {
                return { q: params.term || '' };
            },
            processResults: function (data) {
                return { results: data.results || [] };
            },
            cache: false
        }
    });
    blBindClientButtons();

    // Fires on every client change; hydration flag suppresses side-effects during programmatic init
    $('#bl_client_id').off('change.bl').on('change.bl', function () {
        if (!_blIsHydrating) blSelectClient();
    });

    @php
        $formData = method_exists($getLivewire(), 'getRecord') && $getLivewire()->getRecord()
            ? $getLivewire()->data
            : [];
    @endphp
    var initData = @json($formData);
    var selProducts = @json($selProducts);

    if (initData && initData.client_id) {
        blHydrate(initData, selProducts);
    } else {
        blInitSelect2(1);
        blCalculate();
    }
}

var _blBootTimer = null;
function blBootstrap() {
    if (!document.querySelector('.bl-page')) return;
    // Debounce: collapse concurrent calls (document.ready + livewire:navigated
    // + spa-navigation-fix blFormReinit) into exactly one blInitializeForm() call.
    clearTimeout(_blBootTimer);
    _blBootTimer = setTimeout(blInitializeForm, 60);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', blBootstrap, { once: true });
} else {
    blBootstrap();
}

// SPA navigation hook (called by spa-navigation-fix.blade.php on every navigation)
window.blFormReinit = blBootstrap;

// Register livewire:navigated listener only ONCE regardless of how many times
// this script block executes (every SPA navigation re-executes blade scripts).
// Without the guard, listeners accumulate and fire N times concurrently.
if (!window._blNavListenerActive) {
    window._blNavListenerActive = true;
    document.addEventListener('livewire:navigated', blBootstrap);
}

function blHydrate(data, selProducts) {
    _blIsHydrating = true;

    // Hydrate client
    if (data.client_id) {
        var $client = $('#bl_client_id');

        // Ensure the option exists so Select2 can show it as the current selection
        if ($client.find('option[value="' + data.client_id + '"]').length === 0) {
            var label = '';
            @if($selClient)
                if (data.client_id == {{ $selClientId ?? 'null' }}) {
                    label = '{{ addslashes($selClient?->name ?? '') }} ({{ addslashes($selClient?->phone_1 ?? '') }})';
                }
            @endif
            if (!label) label = 'Client #' + data.client_id;
            $client.append(new Option(label, data.client_id, true, true));
        }

        // Set value — trigger('change') lets Select2 update its display;
        // _blIsHydrating flag prevents blSelectClient() from clearing the address fields.
        $client.val(data.client_id).trigger('change');
    }

    // Always restore address & phone from the PHP-rendered server data (authoritative source)
    var adrEl   = document.getElementById('bl_adr');
    var phoneEl = document.getElementById('bl_phone');
    if (adrEl)   adrEl.value   = window.blInitialClientAdresse || '';
    if (phoneEl) phoneEl.value = window.blInitialClientPhone   || '';

    // Hydrate product lines
    if (data.details) {
        var details = Array.isArray(data.details) ? data.details
                    : (typeof data.details === 'string' ? JSON.parse(data.details) : []);
        var rowIdx = 1;
        details.forEach(function (item) {
            if (!item.produit_id || rowIdx > blMax) return;

            var r = document.getElementById('bl-row-' + rowIdx);
            if (r) r.style.display = '';

            blInitSelect2(rowIdx);

            var $sel  = $('#bl_prod_' + rowIdx);
            var pInfo = selProducts && selProducts[item.produit_id] ? selProducts[item.produit_id] : null;
            var label = pInfo
                ? pInfo.text
                : (item.designation || ('Produit #' + item.produit_id));

            // Append the pre-selected option so Select2 shows the product name immediately
            if ($sel.find('option[value="' + item.produit_id + '"]').length === 0) {
                $sel.append(new Option(label, item.produit_id, true, true));
            }
            // Update Select2 display without firing blSelectProd (hydration flag is set)
            $sel.val(item.produit_id).trigger('change');

            // Set values AFTER the trigger so they are not overridden by blSelectProd
            document.getElementById('bl_qte_' + rowIdx).value = item.qte || 1;
            document.getElementById('bl_pu_' + rowIdx).value  = parseFloat(item.prix_unitaire || 0).toFixed(3);
            if (pInfo) document.getElementById('bl_qte_' + rowIdx).max = pInfo.qte || 9999;

            rowIdx++;
        });
    }

    // Hydrate totals & discounts
    if (data.remise !== undefined && data.remise !== null) {
        document.getElementById('bl_remise').value = data.remise;
    }
    if (data.pourcentage_remise !== undefined && data.pourcentage_remise !== null) {
        document.getElementById('bl_pourcent_remise').value = data.pourcentage_remise;
    }
    if (data.frais_livraison !== undefined && data.frais_livraison !== null) {
        document.getElementById('bl_frais_livraison').value = data.frais_livraison;
    }

    // Hydrate shipping details
    if (data.livraison_nom !== undefined) document.getElementById('bl_livraison_nom').value = data.livraison_nom || '';
    if (data.livraison_phone !== undefined) document.getElementById('bl_livraison_phone').value = data.livraison_phone || '';
    if (data.livraison_email !== undefined) document.getElementById('bl_livraison_email').value = data.livraison_email || '';
    if (data.livraison_adresse1 !== undefined) document.getElementById('bl_livraison_adresse1').value = data.livraison_adresse1 || '';
    if (data.livraison_ville !== undefined) document.getElementById('bl_livraison_ville').value = data.livraison_ville || '';
    if (data.livraison_region !== undefined) document.getElementById('bl_livraison_region').value = data.livraison_region || '';
    if (data.livraison_code_postale !== undefined) document.getElementById('bl_livraison_cp').value = data.livraison_code_postale || '';

    _blIsHydrating = false;
    blCalculate();
}

function blInitSelect2(i) {
    var $el = $('#bl_prod_' + i);
    if ($el.hasClass('select2-hidden-accessible')) {
        try { $el.select2('destroy'); } catch (e) {}
    }
    $el.select2({
        placeholder: '— Choisir —',
        allowClear: true,
        width: '100%',
        minimumInputLength: 0,
        ajax: {
            url: '/api/pos-products',
            dataType: 'json',
            delay: 250,
            data: function (params) { return { q: params.term || '' }; },
            processResults: function (data) { return { results: data.results || [] }; },
            cache: false
        },
        language: { noResults: function() { return 'Aucun résultat'; } }
    });
    $('#bl_prod_' + i).off('change.bl').on('change.bl', function () {
        if (!_blIsHydrating) blSelectProd(i);
    });
}

function blSelectClient() {
    var sel = $('#bl_client_id').select2('data')[0];
    if (!sel || !sel.id) return;

    var nom = sel.text ? sel.text.split('(')[0].trim() : '';

    // Only update address/phone when the data comes from an AJAX response (has adresse/phone_1 fields).
    // Static pre-rendered options don't carry these fields — skip to avoid clearing the display.
    if (sel.adresse !== undefined || sel.phone_1 !== undefined) {
        var adrInput = document.getElementById('bl_adr');
        if (adrInput) adrInput.value = sel.adresse || '';
        var phoneInput = document.getElementById('bl_phone');
        if (phoneInput) phoneInput.value = sel.phone_1 || '';

        // Populate livraison fields from client data
        document.getElementById('bl_livraison_nom').value     = nom;
        document.getElementById('bl_livraison_phone').value   = sel.phone_1 || '';
        document.getElementById('bl_livraison_email').value   = sel.email || '';
        document.getElementById('bl_livraison_adresse1').value = sel.adresse || '';
        document.getElementById('bl_livraison_ville').value   = sel.ville || '';
        document.getElementById('bl_livraison_region').value  = '';
        document.getElementById('bl_livraison_cp').value      = sel.code_postale || '';
    }
}

function blSelectProd(i) {
    var sel = $('#bl_prod_' + i).select2('data')[0];
    if (!sel || !sel.id) return;
    var prix = parseFloat(sel.prix || 0);
    var maxQ = parseFloat(sel.qte || 9999);
    document.getElementById('bl_pu_' + i).value  = prix.toFixed(3);
    document.getElementById('bl_qte_' + i).max   = maxQ;
    blCalculate();
}

function blAddRow() {
    for (let i = 1; i <= blMax; i++) {
        var r = document.getElementById('bl-row-' + i);
        if (r.style.display === 'none') {
            r.style.display = '';
            blInitSelect2(i);
            $('#bl_prod_' + i).val('').trigger('change.select2');
            document.getElementById('bl_qte_' + i).value  = 1;
            document.getElementById('bl_pu_' + i).value   = 0;
            document.getElementById('bl_ptht_' + i).value = 0;
            break;
        }
    }
}

function blRemoveRow(i) {
    document.getElementById('bl-row-' + i).style.display = 'none';
    $('#bl_prod_' + i).val('').trigger('change.select2');
    document.getElementById('bl_qte_' + i).value = 0;
    document.getElementById('bl_pu_' + i).value  = 0;
    blCalculate();
}

function blCalculate(typeRemise) {
    var totalHt = 0;
    for (let i = 1; i <= blMax; i++) {
        var r = document.getElementById('bl-row-' + i);
        if (!r || r.style.display === 'none') continue;
        var pid = $('#bl_prod_' + i).val();
        if (!pid) continue;
        var qte  = parseFloat(document.getElementById('bl_qte_' + i).value) || 0;
        var pu   = parseFloat(document.getElementById('bl_pu_' + i).value)  || 0;
        var ptht = qte * pu;
        document.getElementById('bl_ptht_' + i).value = ptht.toFixed(3);
        totalHt += ptht;
    }

    var remiseEl  = document.getElementById('bl_remise');
    var pctRemEl  = document.getElementById('bl_pourcent_remise');
    var totRemise = 0;

    if (typeRemise === 'mt_remise') {
        totRemise = parseFloat(remiseEl.value) || 0;
        pctRemEl.value = totalHt > 0 ? ((totRemise / totalHt) * 100).toFixed(3) : 0;
    } else if (typeRemise === 'pourcen_remise') {
        var pct = parseFloat(pctRemEl.value) || 0;
        totRemise = totalHt * pct / 100;
        remiseEl.value = totRemise.toFixed(3);
    } else {
        totRemise = parseFloat(remiseEl.value) || 0;
    }

    document.getElementById('bl_apres_remise').value = (totalHt - totRemise).toFixed(3);

    var frais = parseFloat(document.getElementById('bl_frais_livraison').value) || 0;
    var net = Math.max(0, totalHt - totRemise + frais);

    document.getElementById('bl_p_ht').value = totalHt.toFixed(3);
    document.getElementById('bl_net').value  = net.toFixed(3);
}

function blScanner() {
    var barcodeInput = document.getElementById('bl_barcode');
    var code = (parseInt(barcodeInput.value) + 1) + '';
    if (!code) return;
    
    barcodeInput.disabled = true;
    fetch('/api/pos-barcode?code=' + encodeURIComponent(code))
        .then(res => res.json())
        .then(found => {
            barcodeInput.disabled = false;
            barcodeInput.value = '';
            barcodeInput.focus();

            if (found) {
                var existingIdx = -1;
                for (let i = 1; i <= blMax; i++) {
                    var r = document.getElementById('bl-row-' + i);
                    if (r && r.style.display !== 'none' && $('#bl_prod_' + i).val() == found.id) { existingIdx = i; break; }
                }
                if (existingIdx > -1) {
                    var qteEl = document.getElementById('bl_qte_' + existingIdx);
                    qteEl.value = parseFloat(qteEl.value) + 1;
                    blCalculate();
                } else {
                    blAddRow();
                    for (let i = 1; i <= blMax; i++) {
                        var r = document.getElementById('bl-row-' + i);
                        if (r && r.style.display !== 'none' && !$('#bl_prod_' + i).val()) {
                            var optionLabel = found.designation + ' (' + (found.qte ?? 0) + ') - ' + (found.code_product ?? '');
                            var newOption = new Option(optionLabel, found.id, true, true);
                            $('#bl_prod_' + i).append(newOption).trigger('change');
                            document.getElementById('bl_qte_' + i).value = 1;
                            document.getElementById('bl_pu_' + i).value  = parseFloat(found.prix_unitaire).toFixed(3);
                            blCalculate();
                            break;
                        }
                    }
                }
            } else {
                Swal.fire('Introuvable', 'Aucun produit trouvé', 'warning');
            }
        });
}

function blBindClientButtons() {
    var addBtn = document.getElementById('bl-btn-add-client');
    if (addBtn) addBtn.onclick = blCreateClient;
}

function blCreateClient() {
    Swal.fire({
        title: 'Ajouter Client(e)',
        html:
            '<input id="bl_sw_name" class="swal2-input" placeholder="Nom et Prénom">' +
            '<input id="bl_sw_adresse" class="swal2-input" placeholder="Adresse">' +
            '<input id="bl_sw_phone" class="swal2-input" placeholder="Téléphone">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Créer le client',
        cancelButtonText: 'Annuler',
        preConfirm: function () {
            var name = (document.getElementById('bl_sw_name')?.value || '').trim();
            var adresse = (document.getElementById('bl_sw_adresse')?.value || '').trim();
            var phone = (document.getElementById('bl_sw_phone')?.value || '').trim();
            if (!name) {
                Swal.showValidationMessage('Le nom du client est obligatoire');
                return false;
            }
            return { name: name, adresse: adresse, phone_1: phone };
        }
    }).then(function (result) {
        if (!result.isConfirmed || !result.value) return;
        var payload = result.value;
        var csrfToken = document.querySelector('meta[name="csrf-token"]');
        Swal.showLoading();
        fetch('/api/pos-clients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': csrfToken ? csrfToken.getAttribute('content') : ''
            },
            body: JSON.stringify(payload)
        })
        .then(function (res) { return res.json(); })
        .then(function (client) {
            if (!client || !client.id) throw new Error('Création échouée');
            var label = client.text || (client.name ? client.name + (client.phone_1 ? ' (' + client.phone_1 + ')' : '') : ('Client #' + client.id));
            var $sel = $('#bl_client_id');
            $sel.append(new Option(label, client.id, true, true)).trigger('change');
            document.getElementById('bl_adr').value = client.adresse || '';
            document.getElementById('bl_phone').value = client.phone_1 || '';
            Swal.fire({ icon: 'success', title: 'Client créé', timer: 1200, showConfirmButton: false });
        })
        .catch(function (err) {
            console.error('blCreateClient error', err);
            Swal.fire('Erreur', 'Impossible de créer le client. Vérifiez les informations.', 'error');
        });
    });
}

function blSave() {
    var lines = [];
    for (var i = 1; i <= blMax; i++) {
        var r = document.getElementById('bl-row-' + i);
        if (!r || r.style.display === 'none') continue;
        var pid = $('#bl_prod_' + i).val();
        if (!pid) continue;
        lines.push({ produit_id: pid, qte: document.getElementById('bl_qte_' + i).value, prix_unitaire: document.getElementById('bl_pu_' + i).value });
    }

    var clientId  = $('#bl_client_id').val();
    var remise    = document.getElementById('bl_remise').value;
    var pct       = document.getElementById('bl_pourcent_remise').value;
    var prixHt    = document.getElementById('bl_p_ht').value;
    var net       = document.getElementById('bl_net').value;
    var frais     = document.getElementById('bl_frais_livraison')?.value || 0;

    if (!clientId) { Swal.fire('Erreur', 'Veuillez choisir un client', 'warning'); return; }
    if (lines.length === 0) { Swal.fire('Erreur', 'Ajoutez au moins un produit', 'warning'); return; }

    var wire = getBlWire();
    if (!wire) {
        Swal.fire('Erreur', 'Session expirée. Veuillez recharger la page.', 'error');
        return;
    }

    var saveBtn = document.querySelector('.btn-save');
    if (saveBtn) saveBtn.disabled = true;

    var formData = {
        client_id: clientId,
        details: lines,
        remise: parseFloat(remise),
        pourcentage_remise: parseFloat(pct),
        prix_ht: parseFloat(prixHt),
        frais_livraison: parseFloat(frais),
        net_a_payer: parseFloat(net),
        prix_ht_apres_remise: parseFloat(document.getElementById('bl_apres_remise')?.value || prixHt),
        tva: 0,
        prix_ttc: parseFloat(net),
        timbre: 0,
        nom: null,
        phone: null,
        email: null,
        adresse1: null,
        ville: null,
        region: null,
        code_postale: null,
        livraison_nom: document.getElementById('bl_livraison_nom')?.value || null,
        livraison_phone: document.getElementById('bl_livraison_phone')?.value || null,
        livraison_email: document.getElementById('bl_livraison_email')?.value || null,
        livraison_adresse1: document.getElementById('bl_livraison_adresse1')?.value || null,
        livraison_ville: document.getElementById('bl_livraison_ville')?.value || null,
        livraison_region: document.getElementById('bl_livraison_region')?.value || null,
        livraison_code_postale: document.getElementById('bl_livraison_cp')?.value || null
    };

    try {
        for (var key in formData) {
            wire.set('data.' + key, formData[key]);
        }
        setTimeout(function () {
            wire.call('save');
        }, 200);
    } catch (e) {
        console.error('BL save error', e);
        Swal.fire('Erreur', 'Erreur lors de la sauvegarde. Rechargez la page.', 'error');
        if (saveBtn) saveBtn.disabled = false;
    }
}

document.addEventListener('keypress', function(e) {
    if (e.keyCode === 13 && e.target.id !== 'bl_barcode') e.preventDefault();
});
</script>
