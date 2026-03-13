@php
    $coordinate = \App\Models\Coordinate::getCached();
    $clients    = \App\Models\Client::orderBy('name')->get(['id','name','adresse','phone_1']);
    $products   = \App\Models\Product::select('id','code_product','designation_fr','prix','qte')
                    ->orderBy('designation_fr')
                    ->get();
    $max = 100;
    $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
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

#dv-add-client{display:none}
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

<div class="devis-page">
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
                    <button type="button" class="btn-ajouter-client" onclick="dvAddClient()">Ajouter Client(e)</button>
                </div>
                <div id="dv-select-client">
                    <div class="form-field">
                        <select id="dv_client_id" style="width:100%" onchange="dvSelectClient()">
                            <option value="">— Choisir un client —</option>
                            @foreach($clients as $c)
                                <option value="{{ $c->id }}" data-adresse="{{ $c->adresse }}" data-phone="{{ $c->phone_1 }}">
                                    {{ $c->name }} ({{ $c->phone_1 }})
                                </option>
                            @endforeach
                        </select>
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;color:#64748b;">Adresse</label>
                        <input class="dv-input" id="dv_adr" disabled value="">
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;color:#64748b;">N°Tél</label>
                        <input class="dv-input" id="dv_phone" disabled value="">
                    </div>
                </div>
                <div id="dv-add-client">
                    <div style="margin-bottom:8px;text-align:right;">
                        <button type="button" class="btn-annuler-client" onclick="dvAnnulerClient()">Annuler</button>
                    </div>
                    <div class="form-field"><label style="font-size:12px;">Nom et Prénom</label>
                        <input class="dv-input" style="background:#fff;" id="dv_new_name" placeholder="Nom..."></div>
                    <div class="form-field"><label style="font-size:12px;">Adresse</label>
                        <input class="dv-input" style="background:#fff;" id="dv_new_adresse"></div>
                    <div class="form-field"><label style="font-size:12px;">Téléphone</label>
                        <input class="dv-input" style="background:#fff;" id="dv_new_phone"></div>
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
                                @foreach($products as $p)
                                    <option value="{{ $p->id }}" data-prix="{{ $p->getEffectivePriceHt() }}" data-qte="{{ $p->qte }}" data-tva="{{ $defaultTva }}">
                                        {{ $p->designation_fr }} ({{ $p->qte }}) - {{ $p->code_product }}
                                    </option>
                                @endforeach
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

$(document).ready(function () {
    $('#dv_client_id').select2({ placeholder: '— Choisir un client —', allowClear: true, width: '100%' });
    for (let i = 1; i <= dvMax; i++) { dvInitSelect2(i); }
    
    // Hydrate existing data if in Edit mode using Livewire's form data
    @php
        $formData = method_exists($getLivewire(), 'getRecord') && $getLivewire()->getRecord() ? $getLivewire()->data : [];
    @endphp
    var initData = @json($formData);
    
    if (initData && initData.client_id) {
        dvHydrate(initData);
    } else {
        dvCalculate();
    }
});

function dvHydrate(data) {
    if (data.client_id) {
        $('#dv_client_id').val(data.client_id).trigger('change');
    }
    
    if (data.details && Array.isArray(data.details)) {
        let i = 1;
        data.details.forEach(item => {
            if (item.produit_id && i <= dvMax) {
                var r = document.getElementById('dv-row-' + i);
                if (r) r.style.display = '';
                
                var $sel = $('#dv_prod_' + i);
                $sel.val(item.produit_id).trigger('change.select2');
                
                document.getElementById('dv_qte_' + i).value = item.qte || 1;
                document.getElementById('dv_pu_' + i).value = item.prix_unitaire || 0;
                document.getElementById('dv_tva_' + i).value = item.tva_pct || dvDefaultTva;
                
                var opt = $sel.find('option:selected');
                if (opt.length) {
                    document.getElementById('dv_qte_' + i).max = opt.attr('data-qte') || 9999;
                }
                
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
    $('#dv_prod_' + i).select2({ placeholder: '— Choisir —', allowClear: true, width: '100%', language: { noResults: function() { return 'Aucun résultat'; } } });
    $('#dv_prod_' + i).on('change', function () { dvSelectProd(i); });
}

function dvSelectClient() {
    var sel = document.getElementById('dv_client_id');
    var opt = sel.options[sel.selectedIndex];
    document.getElementById('dv_adr').value   = opt.getAttribute('data-adresse') ?? '';
    document.getElementById('dv_phone').value = opt.getAttribute('data-phone') ?? '';
}
$('#dv_client_id').on('change', function() { dvSelectClient(); });

function dvSelectProd(i) {
    var sel = document.getElementById('dv_prod_' + i);
    if (!sel || !sel.value) return;
    var opt  = sel.options[sel.selectedIndex];
    var prix = parseFloat(opt.getAttribute('data-prix') ?? 0);
    var tva  = parseFloat(opt.getAttribute('data-tva') ?? dvDefaultTva);
    document.getElementById('dv_pu_' + i).value  = prix.toFixed(3);
    document.getElementById('dv_tva_' + i).value = tva;
    dvCalculate();
}

function dvAddRow() {
    for (let i = 1; i <= dvMax; i++) {
        var r = document.getElementById('dv-row-' + i);
        if (r.style.display === 'none') {
            r.style.display = '';
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
    var found = null;
    var opts = document.getElementById('dv_prod_1').options;
    for (let o of opts) {
        var codePart = o.text.split(' - ').pop().trim();
        if (codePart === code || codePart === '0' + code) {
            found = { id: o.value, prix: o.getAttribute('data-prix'), tva: o.getAttribute('data-tva') };
            break;
        }
    }
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
                    $('#dv_prod_' + i).val(found.id).trigger('change');
                    document.getElementById('dv_qte_' + i).value = 1;
                    document.getElementById('dv_pu_' + i).value  = parseFloat(found.prix).toFixed(3);
                    document.getElementById('dv_tva_' + i).value = found.tva;
                    dvCalculate();
                    break;
                }
            }
        }
    } else {
        Swal.fire('Introuvable', 'Aucun produit trouvé', 'warning');
    }
    barcodeInput.value = '';
    barcodeInput.focus();
}

function dvAddClient() {
    document.getElementById('dv-select-client').style.display = 'none';
    document.getElementById('dv-add-client').style.display    = '';
}
function dvAnnulerClient() {
    document.getElementById('dv-select-client').style.display = '';
    document.getElementById('dv-add-client').style.display    = 'none';
}

function dvSave() {
    var lines = [];
    for (let i = 1; i <= dvMax; i++) {
        var r = document.getElementById('dv-row-' + i);
        if (!r || r.style.display === 'none') continue;
        var pid = $('#dv_prod_' + i).val();
        if (!pid) continue;
        lines.push({ produit_id: pid, qte: document.getElementById('dv_qte_' + i).value, prix_unitaire: document.getElementById('dv_pu_' + i).value, tva_pct: document.getElementById('dv_tva_' + i).value });
    }

    var clientId  = $('#dv_client_id').val();
    var remise    = document.getElementById('dv_remise').value;
    var pct       = document.getElementById('dv_pourcent_remise').value;
    var prixHt    = document.getElementById('dv_p_ht').value;
    var tva       = document.getElementById('dv_m_tt_tva').value;
    var prixTtc   = document.getElementById('dv_m_tt_ttc').value;
    var timbre    = document.getElementById('dv_timbre').value;
    var net       = document.getElementById('dv_net').value;

    if (!clientId) { Swal.fire('Erreur', 'Veuillez choisir un client', 'warning'); return; }
    if (lines.length === 0) { Swal.fire('Erreur', 'Ajoutez au moins un produit', 'warning'); return; }

    @this.set('data.client_id', clientId);
    @this.set('data.details', lines);
    @this.set('data.remise', parseFloat(remise));
    @this.set('data.pourcentage_remise', parseFloat(pct));
    @this.set('data.prix_ht', parseFloat(prixHt));
    @this.set('data.tva', parseFloat(tva));
    @this.set('data.prix_ttc', parseFloat(prixTtc));
    @this.set('data.timbre', parseFloat(timbre));
    @this.set('data.net_a_payer', parseFloat(net));
    @this.set('data.prix_ht_apres_remise', parseFloat(document.getElementById('dv_apres_remise')?.value || prixHt));

    setTimeout(() => {
        var btn = document.querySelector('[wire\\:click*="save"], button[type="submit"]');
        if (btn) { btn.click(); } else { @this.call('save'); }
    }, 200);
}

document.addEventListener('keypress', function(e) {
    if (e.keyCode === 13 && e.target.id !== 'dv_barcode') e.preventDefault();
});
</script>
