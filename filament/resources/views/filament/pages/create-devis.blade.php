@php
    $coordinate = \App\Models\Coordinate::getCached();
    $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;

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
    } elseif (method_exists($livewire, 'form')) {
        try {
            $raw = $livewire->form->getRawState();
            $getLwData = is_array($raw) ? $raw : [];
        } catch (\Throwable) {
            $getLwData = [];
        }
        if ($getLwData === [] && isset($livewire->data) && is_array($livewire->data)) {
            $getLwData = $livewire->data;
        }
    }

    $detailsRaw = $getLwData['details'] ?? null;
    if (is_string($detailsRaw)) {
        $detailsRaw = json_decode($detailsRaw, true) ?? [];
    }
    $getLwData['details'] = is_array($detailsRaw) ? $detailsRaw : [];

    if (method_exists($livewire, 'getRecord') && ($rec = $livewire->getRecord())) {
        $rec->loadMissing('details', 'client');
        if (empty($getLwData['client_id']) && $rec->client_id) {
            $getLwData['client_id'] = $rec->client_id;
        }
        $c = $rec->client;
        if ($c) {
            if (($getLwData['client_adresse'] ?? '') === '' || ($getLwData['client_adresse'] ?? null) === null) {
                $getLwData['client_adresse'] = $c->adresse ?? '';
            }
            if (($getLwData['client_phone'] ?? '') === '' || ($getLwData['client_phone'] ?? null) === null) {
                $getLwData['client_phone'] = $c->phone_1 ?? '';
            }
            if (($getLwData['client_email'] ?? '') === '' || ($getLwData['client_email'] ?? null) === null) {
                $getLwData['client_email'] = $c->email ?? '';
            }
        }
        if ($getLwData['details'] === [] && $rec->details->isNotEmpty()) {
            $getLwData['details'] = $rec->details->map(fn ($d) => [
                'produit_id' => $d->produit_id,
                'qte' => $d->qte ?? $d->quantite ?? 0,
                'prix_unitaire' => $d->prix_unitaire,
                'tva_pct' => $d->tva ?? $defaultTva,
            ])->toArray();
        }
        if (! array_key_exists('remise', $getLwData) || $getLwData['remise'] === null) {
            $getLwData['remise'] = (float) ($rec->remise ?? 0);
        }
        if (! array_key_exists('pourcentage_remise', $getLwData) || $getLwData['pourcentage_remise'] === null) {
            $getLwData['pourcentage_remise'] = (float) ($rec->pourcentage_remise ?? 0);
        }
        if (! array_key_exists('timbre', $getLwData) || $getLwData['timbre'] === null) {
            $getLwData['timbre'] = (float) ($rec->timbre ?? 0);
        }
    }

    $selProductIds = collect($getLwData['details'] ?? [])->pluck('produit_id')->filter()->toArray();
    $selProducts = [];
    if (! empty($selProductIds)) {
        $selProducts = \App\Models\Product::whereIn('id', $selProductIds)
            ->get(['id', 'designation_fr', 'qte', 'code_product'])
            ->keyBy('id');
    }
    $selClientId = $getLwData['client_id'] ?? null;
    $selClient = $selClientId ? \App\Models\Client::find($selClientId) : null;
    $max = 100;
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
/* ── Force FULL WIDTH on Devis Pages using the .devis-page wrapper ─────────── */
body:has(.devis-page) .fi-main-ctn,
body:has(.devis-page) .fi-page,
body:has(.devis-page) .fi-resource-page,
body:has(.devis-page) form,
body:has(.devis-page) .fi-fo-component-ctn,
body:has(.devis-page) .fi-fo-view,
body:has(.devis-page) .fi-fo-view > div {
    max-width: 100% !important;
    width: 100% !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
}

body:has(.devis-page) .fi-page-header { display: none !important; }
body:has(.devis-page) .fi-form-actions { display: none !important; }
/* Hide the Filament form label wrapper around our ViewField */
body:has(.devis-page) [wire\:key] > .fi-fo-field-wrp-label { display: none !important; }

.dv-wrap{font-family:'Inter',Arial,sans-serif;padding:16px 24px;background:#f9fafb;min-height:100vh}

.dv-form{background:#fff;border-radius:12px;box-shadow:0 1px 8px rgba(0,0,0,.08);padding:24px}

.dv-top{display:flex;gap:24px;margin-bottom:20px;align-items:flex-start}
.dv-company{flex:0 0 42%}
.dv-company img{height:80px;object-fit:contain;margin-bottom:8px;display:block}
.dv-company h4{font-size:16px;font-weight:700;margin:0 0 4px;color:#1e293b}
.dv-company p{font-size:13px;color:#475569;margin:2px 0}

.dv-client{flex:1}
.dv-client-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.dv-client label{font-size:13px;font-weight:600;color:#374151}
.dv-client .form-field{margin-bottom:10px}
.dv-client input.dv-input{width:100%;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px;font-size:13px;color:#374151;background:#f8fafc}
.dv-client input.dv-input:disabled{background:#f1f5f9;color:#64748b}

.btn-ajouter-client{background:#2563eb;color:#fff;border:none;border-radius:6px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer}
.btn-annuler-client{background:#ef4444;color:#fff;border:none;border-radius:6px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer}

.dv-barcode{margin-bottom:16px}
.dv-barcode label{font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px}
.dv-barcode input{width:100%;border:1px solid #fdba74;border-radius:6px;padding:9px 14px;font-size:15px;background:#fff7ed}
.dv-barcode input:focus{outline:none;border-color:#f97316;box-shadow:0 0 0 2px rgba(249,115,22,.2)}

.dv-table-wrap{overflow-x:auto;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:12px}
.dv-table{width:100%;border-collapse:collapse;font-size:13px}
.dv-table thead th{background:#f8fafc;color:#334155;font-weight:700;text-transform:uppercase;padding:10px 8px;text-align:left;font-size:11px;letter-spacing:.05em;border-bottom:2px solid #e2e8f0;white-space:nowrap}
.dv-table tbody tr:nth-child(even){background:#fafaf9}
.dv-table tbody td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:middle}
.dv-table td .select2-container{min-width:220px;width:100%!important}
.dv-table td .select2-container--default .select2-selection--single{border:1px solid #cbd5e1;border-radius:6px;height:34px}
.dv-table td .select2-container--default .select2-selection--single .select2-selection__rendered{line-height:32px;font-size:13px}
.dv-table td .select2-container--default .select2-selection--single .select2-selection__arrow{height:32px}
.dv-table td input.tbl-input{border:1px solid #cbd5e1;border-radius:6px;padding:4px 8px;font-size:13px;width:80px;text-align:right;background:#fff;height:34px}
.dv-table td input.tbl-input:disabled{background:#f1f5f9;color:#64748b;border-color:transparent;font-weight:600}

.btn-add-row{background:#ecfdf5;color:#059669;border:1px dashed #34d399;border-radius:6px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:24px}
.btn-add-row:hover{background:#d1fae5;border-color:#10b981}
.btn-del-row{background:#fef2f2;color:#ef4444;border:1px solid #fecaca;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:12px}
.btn-del-row:hover{background:#fee2e2}

.dv-bottom{display:flex;gap:24px;margin-top:8px}
.dv-spacer{flex:1}
.dv-totals{flex:0 0 400px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
.dv-totals table{width:100%;border-collapse:collapse}
.dv-totals table td{padding:8px 12px;font-size:13px;border-bottom:1px solid #f1f5f9}
.dv-totals table td:first-child{color:#475569;font-weight:500}
.dv-totals table td:last-child{text-align:right}
.dv-totals table input.tot-input{width:120px;border:1px solid #cbd5e1;border-radius:5px;padding:4px 8px;font-size:13px;text-align:right;background:#fff}
.dv-totals table input.tot-input:disabled{background:#f8fafc;border-color:transparent;color:#1e293b;font-weight:700}
.dv-net-row{background:#eff6ff}
.dv-net-row td{font-size:15px!important;font-weight:800!important;color:#1e40af!important}

.dv-footer{margin-top:24px;text-align:right;border-top:1px solid #e2e8f0;padding-top:16px}
.btn-save{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:10px 32px;font-size:15px;font-weight:700;cursor:pointer}
.btn-save:hover{background:#1d4ed8}
</style>

<div class="devis-page" wire:ignore>
<div class="dv-wrap">
    <div class="dv-form">
        <div class="dv-top">
            <div class="dv-company">
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" alt="Sobitas" style="height:80px;object-fit:contain;margin-bottom:8px;display:block">
                @endif
                @if($coordinate)
                    <h4>{{ $coordinate->abbreviation ?? $coordinate->name_fr ?? '' }}</h4>
                    <p>{{ $coordinate->phone_1 }} @if($coordinate->phone_2) / {{ $coordinate->phone_2 }} @endif</p>
                    <p>{{ $coordinate->adresse_fr ?? $coordinate->adresse ?? '' }}</p>
                @endif
            </div>

            <div class="dv-client">
                <div class="dv-client-head">
                    <label>Client</label>
                    <button type="button" id="dv-btn-add-client" class="btn-ajouter-client">Ajouter Client(e)</button>
                </div>
                <div id="dv-select-client">
                    <div class="form-field">
                        <select id="dv_client_id" style="width:100%" onchange="dvSelectClient()">
                            <option value="">— Choisir un client —</option>
                            @if($selClient)
                                <option value="{{ $selClient->id }}" selected
                                    data-adresse="{{ e($selClient->adresse) }}"
                                    data-phone="{{ e($selClient->phone_1) }}">
                                    {{ $selClient->name }} ({{ $selClient->phone_1 }})
                                </option>
                            @endif
                        </select>
                    </div>
                    @php
                        $dvAdr = $getLwData['client_adresse'] ?? ($selClient?->adresse ?? '');
                        $dvPhone = $getLwData['client_phone'] ?? ($selClient?->phone_1 ?? '');
                    @endphp
                    <div class="form-field">
                        <label style="font-size:12px;color:#64748b;">Adresse</label>
                        <input class="dv-input" id="dv_adr" disabled value="{{ e($dvAdr) }}">
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;color:#64748b;">N°Tél</label>
                        <input class="dv-input" id="dv_phone" disabled value="{{ e($dvPhone) }}">
                    </div>
                </div>
            </div>
        </div>

        <div class="dv-barcode">
            <label>Scanner code à barre</label>
            <input type="number" id="dv_barcode" placeholder="barcode" autocomplete="off" autofocus onchange="dvScanner()">
        </div>

        <div class="dv-table-wrap">
            <table class="dv-table">
                <thead>
                    <tr>
                        <th style="min-width:280px">Produits</th>
                        <th style="min-width:70px">Qté</th>
                        <th style="min-width:90px">P.U HT</th>
                        <th style="min-width:90px">P.T HT</th>
                        <th style="min-width:70px">TVA %</th>
                        <th style="min-width:90px">TVA</th>
                        <th style="min-width:50px">#</th>
                    </tr>
                </thead>
                <tbody>
                    @for($i = 1; $i <= $max; $i++)
                    <tr id="dv-row-{{ $i }}" style="{{ $i > 1 ? 'display:none;' : '' }}">
                        <td>
                            <select id="dv_prod_{{ $i }}" style="width:100%" onchange="dvSelectProd({{ $i }})">
                                <option value="">— Choisir —</option>
                            </select>
                        </td>
                        <td><input type="number" class="tbl-input" id="dv_qte_{{ $i }}" value="1" min="0.001" step="1" onchange="dvCalculate()" oninput="dvCalculate()"></td>
                        <td><input type="number" class="tbl-input" id="dv_pu_{{ $i }}" value="0" min="0" step="0.001" onchange="dvCalculate()" oninput="dvCalculate()"></td>
                        <td><input type="number" class="tbl-input" id="dv_ptht_{{ $i }}" value="0" min="0" step="0.001" disabled></td>
                        <td><input type="number" class="tbl-input" id="dv_tva_{{ $i }}" value="{{ $defaultTva }}" min="0" step="1" disabled></td>
                        <td><input type="number" class="tbl-input" id="dv_val_tva_{{ $i }}" value="0" min="0" step="0.001" disabled></td>
                        <td><button type="button" class="btn-del-row" onclick="dvRemoveRow({{ $i }})">✕</button></td>
                    </tr>
                    @endfor
                </tbody>
            </table>
        </div>
        <button type="button" class="btn-add-row" onclick="dvAddRow()">+ Ajouter un produit</button>

        <div class="dv-bottom">
            <div class="dv-spacer"></div>
            <div class="dv-totals">
                <table>
                    <tr>
                        <td>Montant Total HT</td>
                        <td><input class="tot-input" id="dv_p_ht" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Montant Remise</td>
                        <td><input class="tot-input" id="dv_remise" value="0.000" step="0.001"
                                   onkeyup="dvCalculate('mt_remise')" onchange="dvCalculate('mt_remise')"></td>
                    </tr>
                    <tr>
                        <td>Pourcentage Remise %</td>
                        <td><input class="tot-input" id="dv_pourcent_remise" value="0" step="0.001"
                                   onkeyup="dvCalculate('pourcen_remise')" onchange="dvCalculate('pourcen_remise')"></td>
                    </tr>
                    <tr id="dv_ligne_apres_remise" style="display:none">
                        <td>HT après remise</td>
                        <td><input class="tot-input" id="dv_apres_remise" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Montant Totale TVA</td>
                        <td><input class="tot-input" id="dv_m_tt_tva" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Montant Totale TTC</td>
                        <td><input class="tot-input" id="dv_m_tt_ttc" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Timbre Fiscal</td>
                        <td><input class="tot-input" id="dv_timbre" value="{{ $coordinate->timbre ?? '1.000' }}" step="0.001"
                                   onkeyup="dvCalculate()" onchange="dvCalculate()"></td>
                    </tr>
                    <tr class="dv-net-row">
                        <td>Net à payer</td>
                        <td><input class="tot-input" id="dv_net" disabled value="0.000"></td>
                    </tr>
                </table>
            </div>
        </div>

        <div class="dv-footer">
            <button type="button" class="btn-save" onclick="dvSave()">💾 Enregistrer</button>
        </div>
    </div>
</div>
</div>

<script>
var dvMax = {{ $max }};
var dvDefaultTva = {{ $defaultTva }};

// Initialize Select2 and form after page load or SPA navigation
function dvInitializeForm() {
    // Destroy existing Select2 instances to prevent duplicates
    try {
        $('#dv_client_id').select2('destroy');
        for (let i = 1; i <= dvMax; i++) {
            $('#dv_prod_' + i).select2('destroy');
        }
    } catch (e) { /* Ignore if Select2 not initialized yet */ }
    
    // Re-initialize client select with Select2
    $('#dv_client_id').select2({
        placeholder: '— Choisir un client —',
        allowClear: true,
        width: '100%',
        ajax: {
            url: '/api/pos-clients',
            dataType: 'json',
            delay: 250,
            data: function (params) { return { q: params.term || '' }; },
            cache: true
        }
    });
    dvBindClientButtons();
    
    // Initialize all product selects dynamically
    // for (let i = 1; i <= dvMax; i++) { dvInitSelect2(i); }
    
    var initData = @json($getLwData);
    var selProducts = @json($selProducts);
    var dvHasDetailLines = initData && initData.details && Array.isArray(initData.details) && initData.details.some(function (r) { return r && r.produit_id; });

    if (initData && (initData.client_id || dvHasDetailLines)) {
        dvHydrate(initData, selProducts);
    } else {
        dvInitSelect2(1);
        dvCalculate();
    }
}

var _dvBootTimer = null;
function dvBootstrap() {
    if (!document.querySelector('.devis-page')) return;
    // Debounce: cancel any in-flight init, schedule a single one.
    // This collapses concurrent calls from document.ready + livewire:navigated
    // + spa-navigation-fix into exactly one dvInitializeForm() execution.
    clearTimeout(_dvBootTimer);
    _dvBootTimer = setTimeout(dvInitializeForm, 60);
}

// Full page load
$(document).ready(dvBootstrap);

// SPA navigation hook (called by spa-navigation-fix.blade.php on every navigation)
window.dvFormReinit = dvBootstrap;

// Register livewire:navigated listener only ONCE regardless of how many times
// this script block executes (every SPA navigation re-executes blade scripts).
// Without the guard, listeners accumulate and fire N times concurrently.
if (!window._dvNavListenerActive) {
    window._dvNavListenerActive = true;
    document.addEventListener('livewire:navigated', dvBootstrap);
}

function dvHydrate(data, selProducts) {
    if (data.client_id) {
        // Option is natively rendered, just let select2 pick it up, although we can trigger it too in case
        $('#dv_client_id').val(data.client_id).trigger('change');
        // Form state / server may carry contact fields; Select2 often omits them on preloaded options
        var adr = data.client_adresse || '';
        var tel = data.client_phone || '';
        if (!adr || !tel) {
            var $opt = $('#dv_client_id option:selected');
            if (!adr) adr = $opt.data('adresse') || '';
            if (!tel) tel = $opt.data('phone') || '';
        }
        document.getElementById('dv_adr').value = adr;
        document.getElementById('dv_phone').value = tel;
    }
    
    if (data.details && Array.isArray(data.details)) {
        let i = 1;
        data.details.forEach(item => {
            if (item.produit_id && i <= dvMax) {
                var r = document.getElementById('dv-row-' + i);
                if (r) r.style.display = '';
                dvInitSelect2(i);
                
                var $sel = $('#dv_prod_' + i);
                var pInfo = selProducts[item.produit_id];
                if (pInfo) {
                    var label = pInfo.designation_fr + ' (' + (pInfo.qte || 0) + ') - ' + (pInfo.code_product || '');
                    var newOption = new Option(label, item.produit_id, true, true);
                    $sel.append(newOption).trigger('change.select2');
                } else {
                    $sel.val(item.produit_id).trigger('change.select2');
                }
                
                document.getElementById('dv_qte_' + i).value = item.qte || 1;
                document.getElementById('dv_pu_' + i).value = item.prix_unitaire || 0;
                document.getElementById('dv_tva_' + i).value = item.tva_pct || dvDefaultTva;
                
                var opt = { qte: 9999 };
                document.getElementById('dv_qte_' + i).max = opt.qte;
                
                i++;
            }
        });
    }

    if (data.remise) document.getElementById('dv_remise').value = data.remise;
    if (data.pourcentage_remise) document.getElementById('dv_pourcent_remise').value = data.pourcentage_remise;
    if (data.timbre) document.getElementById('dv_timbre').value = data.timbre;
    
    dvCalculate();
}


function dvInitSelect2(i) {
    var $el = $('#dv_prod_' + i);
    if ($el.hasClass('select2-hidden-accessible')) return; // Already initialized
    $el.select2({ 
        placeholder: '— Choisir —', 
        allowClear: true, 
        width: '100%',
        ajax: {
            url: '/api/pos-products',
            dataType: 'json',
            delay: 250,
            data: function (params) { return { q: params.term || '' }; },
            cache: true
        },
        language: { noResults: function() { return 'Aucun résultat'; } } 
    });
    $('#dv_prod_' + i).on('change', function () { dvSelectProd(i); });
}

function dvSelectClient() {
    var adr = '';
    var phone = '';
    var sel = $('#dv_client_id').select2('data')[0];
    if (sel) {
        adr = sel.adresse || sel.adresse_client || '';
        phone = sel.phone_1 || sel.phone || '';
    }
    if (!adr && !phone) {
        var $opt = $('#dv_client_id option:selected');
        adr = $opt.data('adresse') || '';
        phone = $opt.data('phone') || '';
    }
    document.getElementById('dv_adr').value = adr;
    document.getElementById('dv_phone').value = phone;
}
$('#dv_client_id').on('change', function() { dvSelectClient(); });

function dvSelectProd(i) {
    var sel = $('#dv_prod_' + i).select2('data')[0];
    if (!sel || !sel.id) return;
    var prix = parseFloat(sel.prix || 0);
    var tva  = parseFloat(sel.tva || dvDefaultTva);
    document.getElementById('dv_pu_' + i).value  = prix.toFixed(3);
    document.getElementById('dv_tva_' + i).value = tva;
    dvCalculate();
}

function dvAddRow() {
    for (let i = 1; i <= dvMax; i++) {
        var r = document.getElementById('dv-row-' + i);
        if (r.style.display === 'none') {
            r.style.display = '';
            dvInitSelect2(i);
            $('#dv_prod_' + i).val('').trigger('change.select2');
            document.getElementById('dv_qte_' + i).value      = 1;
            document.getElementById('dv_pu_' + i).value       = 0;
            document.getElementById('dv_ptht_' + i).value     = 0;
            document.getElementById('dv_tva_' + i).value      = dvDefaultTva;
            document.getElementById('dv_val_tva_' + i).value  = 0;
            break;
        }
    }
}

function dvRemoveRow(i) {
    document.getElementById('dv-row-' + i).style.display = 'none';
    $('#dv_prod_' + i).val('').trigger('change.select2');
    document.getElementById('dv_qte_' + i).value = 0;
    document.getElementById('dv_pu_' + i).value  = 0;
    dvCalculate();
}

function dvCalculate(typeRemise) {
    var totalHt = 0, totalTva = 0;
    for (let i = 1; i <= dvMax; i++) {
        var r = document.getElementById('dv-row-' + i);
        if (!r || r.style.display === 'none') continue;
        var pid = $('#dv_prod_' + i).val();
        if (!pid) continue;
        var qte  = parseFloat(document.getElementById('dv_qte_' + i).value) || 0;
        var pu   = parseFloat(document.getElementById('dv_pu_' + i).value)  || 0;
        var tva  = parseFloat(document.getElementById('dv_tva_' + i).value) || 0;
        var ptht = qte * pu;
        var vTva = ptht * tva / 100;
        document.getElementById('dv_ptht_' + i).value    = ptht.toFixed(3);
        document.getElementById('dv_val_tva_' + i).value = vTva.toFixed(3);
        totalHt  += ptht;
        totalTva += vTva;
    }

    var remiseEl  = document.getElementById('dv_remise');
    var pctRemEl  = document.getElementById('dv_pourcent_remise');
    var totRemise = 0;

    if (typeRemise === 'mt_remise') {
        totRemise = parseFloat(remiseEl.value) || 0;
        pctRemEl.value = totalHt > 0 ? ((totRemise / totalHt) * 100).toFixed(3) : 0;
        totalTva = totalTva - (totalTva * (totRemise / totalHt || 0));
    } else if (typeRemise === 'pourcen_remise') {
        var pct = parseFloat(pctRemEl.value) || 0;
        totRemise = totalHt * pct / 100;
        remiseEl.value = totRemise.toFixed(3);
        totalTva = totalTva - (totalTva * pct / 100);
    } else {
        totRemise = parseFloat(remiseEl.value) || 0;
    }

    if (totRemise > 0) {
        document.getElementById('dv_ligne_apres_remise').style.display = '';
        document.getElementById('dv_apres_remise').value = (totalHt - totRemise).toFixed(3);
    } else {
        document.getElementById('dv_ligne_apres_remise').style.display = 'none';
    }

    var totalTtc = totalHt - totRemise + totalTva;
    var timbre   = parseFloat(document.getElementById('dv_timbre').value) || 0;
    var net      = totalTtc + timbre;

    document.getElementById('dv_p_ht').value     = totalHt.toFixed(3);
    document.getElementById('dv_m_tt_tva').value = totalTva.toFixed(3);
    document.getElementById('dv_m_tt_ttc').value = totalTtc.toFixed(3);
    document.getElementById('dv_net').value       = net.toFixed(3);
}

function dvScanner() {
    var barcodeInput = document.getElementById('dv_barcode');
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
                for (let i = 1; i <= dvMax; i++) {
                    var r = document.getElementById('dv-row-' + i);
                    if (r && r.style.display !== 'none' && $('#dv_prod_' + i).val() == found.id) { existingIdx = i; break; }
                }
                if (existingIdx > -1) {
                    var qteEl = document.getElementById('dv_qte_' + existingIdx);
                    qteEl.value = parseFloat(qteEl.value) + 1;
                    dvCalculate();
                } else {
                    dvAddRow();
                    for (let i = 1; i <= dvMax; i++) {
                        var r = document.getElementById('dv-row-' + i);
                        if (r && r.style.display !== 'none' && !$('#dv_prod_' + i).val()) {
                            var optionLabel = found.designation + ' (' + (found.qte ?? 0) + ') - ' + (found.code_product ?? '');
                            var newOption = new Option(optionLabel, found.id, true, true);
                            $('#dv_prod_' + i).append(newOption).trigger('change');
                            document.getElementById('dv_qte_' + i).value = 1;
                            document.getElementById('dv_pu_' + i).value  = parseFloat(found.prix_unitaire).toFixed(3);
                            document.getElementById('dv_tva_' + i).value = dvDefaultTva;
                            dvCalculate();
                            break;
                        }
                    }
                }
            } else {
                Swal.fire('Introuvable', 'Aucun produit trouvé', 'warning');
            }
        });
}

function dvBindClientButtons() {
    var addBtn = document.getElementById('dv-btn-add-client');
    if (addBtn) addBtn.onclick = dvCreateClient;
}

function dvCreateClient() {
    Swal.fire({
        title: 'Ajouter Client(e)',
        html:
            '<input id="dv_sw_name" class="swal2-input" placeholder="Nom et Prénom">' +
            '<input id="dv_sw_adresse" class="swal2-input" placeholder="Adresse">' +
            '<input id="dv_sw_phone" class="swal2-input" placeholder="Téléphone">' +
            '<input id="dv_sw_email" class="swal2-input" placeholder="Email (optionnel)">' +
            '<input id="dv_sw_mf" class="swal2-input" placeholder="Matricule Fiscal">',
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Créer le client',
        cancelButtonText: 'Annuler',
        preConfirm: function () {
            var name = (document.getElementById('dv_sw_name')?.value || '').trim();
            var adresse = (document.getElementById('dv_sw_adresse')?.value || '').trim();
            var phone = (document.getElementById('dv_sw_phone')?.value || '').trim();
            var email = (document.getElementById('dv_sw_email')?.value || '').trim();
            var matricule = (document.getElementById('dv_sw_mf')?.value || '').trim();
            if (!name) {
                Swal.showValidationMessage('Le nom du client est obligatoire');
                return false;
            }
            return { name: name, adresse: adresse, phone_1: phone, email: email || null, matricule: matricule };
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
            var $sel = $('#dv_client_id');
            $sel.append(new Option(label, client.id, true, true)).trigger('change');
            document.getElementById('dv_adr').value = client.adresse || '';
            document.getElementById('dv_phone').value = client.phone_1 || '';
            Swal.fire({ icon: 'success', title: 'Client créé', timer: 1200, showConfirmButton: false });
        })
        .catch(function (err) {
            console.error('dvCreateClient error', err);
            Swal.fire('Erreur', 'Impossible de créer le client. Vérifiez les informations.', 'error');
        });
    });
}

function dvSave() {
    var lines = [];
    for (let i = 1; i <= dvMax; i++) {
        var r = document.getElementById('dv-row-' + i);
        if (!r || r.style.display === 'none') continue;
        var pid = $('#dv_prod_' + i).val();
        if (!pid) continue;
        lines.push({ 
            produit_id: pid, 
            qte: document.getElementById('dv_qte_' + i).value, 
            prix_unitaire: document.getElementById('dv_pu_' + i).value, 
            tva_pct: document.getElementById('dv_tva_' + i).value 
        });
    }

    var clientId  = $('#dv_client_id').val();
    var remise    = document.getElementById('dv_remise').value;
    var pct       = document.getElementById('dv_pourcent_remise').value;
    var prixHt    = document.getElementById('dv_p_ht').value;
    var tva       = document.getElementById('dv_m_tt_tva').value;
    var prixTtc   = document.getElementById('dv_m_tt_ttc').value;
    var timbre    = document.getElementById('dv_timbre').value;
    var net       = document.getElementById('dv_net').value;

    if (!clientId) { 
        Swal.fire('Erreur', 'Veuillez choisir un client', 'warning'); 
        return; 
    }
    if (lines.length === 0) { 
        Swal.fire('Erreur', 'Ajoutez au moins un produit', 'warning'); 
        return; 
    }

    var saveBtn = document.querySelector('.devis-page .btn-save');
    if (saveBtn) saveBtn.disabled = true;
    function dvReleaseSaveBtn() {
        if (saveBtn) saveBtn.disabled = false;
    }

    // Prepare form data object
    var formData = {
        client_id: clientId,
        details: lines,
        remise: parseFloat(remise),
        pourcentage_remise: parseFloat(pct),
        prix_ht: parseFloat(prixHt),
        tva: parseFloat(tva),
        prix_ttc: parseFloat(prixTtc),
        timbre: parseFloat(timbre),
        net_a_payer: parseFloat(net),
        prix_ht_apres_remise: parseFloat(document.getElementById('dv_apres_remise')?.value || prixHt)
    };

    try {
        // Update Livewire form data with all required fields
        for (let key in formData) {
            @this.set('data.' + key, formData[key]);
        }

        setTimeout(function () {
            var req = @this.call('save');
            if (req && typeof req.finally === 'function') {
                req.finally(dvReleaseSaveBtn);
            } else if (req && typeof req.then === 'function') {
                req.then(dvReleaseSaveBtn).catch(dvReleaseSaveBtn);
            } else {
                setTimeout(dvReleaseSaveBtn, 1200);
            }
        }, 100);
    } catch (e) {
        console.error('Error saving form', e);
        Swal.fire('Erreur', 'Erreur lors de la sauvegarde: ' + (e.message || 'Erreur inconnue'), 'error');
        dvReleaseSaveBtn();
    }
}

document.addEventListener('keypress', function(e) {
    if (e.keyCode === 13 && e.target.id !== 'dv_barcode') e.preventDefault();
});
</script>
