@php
    $coordinate = \App\Models\Coordinate::getCached();
    $clients    = \App\Models\Client::orderBy('name')->get(['id','name','adresse','phone_1']);
    $products   = \App\Models\Product::where('qte', '>', 0)
                    ->select('id','code_product','designation_fr','prix','qte')
                    ->orderBy('designation_fr')
                    ->get();
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

#bl-add-client{display:none}
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

<div class="bl-page">
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
                    <button type="button" class="btn-ajouter-client" onclick="blAddClient()">Ajouter Client(e)</button>
                </div>
                <div id="bl-select-client">
                    <div class="form-field">
                        <select id="bl_client_id" style="width:100%" onchange="blSelectClient()">
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
                        <input class="bl-input" id="bl_adr" disabled value="">
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;color:#64748b;">N°Tél</label>
                        <input class="bl-input" id="bl_phone" disabled value="">
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;color:#64748b;">Frais Livraison (TND)</label>
                        <input class="bl-input" style="background:#fff;" id="bl_frais_livraison" type="number" step="0.001" value="0" onchange="blCalculate()" oninput="blCalculate()">
                    </div>
                </div>
                <div id="bl-add-client">
                    <div style="margin-bottom:8px;text-align:right;">
                        <button type="button" class="btn-annuler-client" onclick="blAnnulerClient()">Annuler</button>
                    </div>
                    <div class="form-field"><label style="font-size:12px;">Nom et Prénom</label>
                        <input class="bl-input" style="background:#fff;" id="bl_new_name" name="new_client_name" placeholder="Nom..."></div>
                    <div class="form-field"><label style="font-size:12px;">Adresse</label>
                        <input class="bl-input" style="background:#fff;" id="bl_new_adresse" name="new_client_adresse"></div>
                    <div class="form-field"><label style="font-size:12px;">Téléphone</label>
                        <input class="bl-input" style="background:#fff;" id="bl_new_phone" name="new_client_phone"></div>
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
                        <th style="min-width:70px">Qté</th>
                        <th style="min-width:90px">P.U HT</th>
                        <th style="min-width:90px">P.T HT</th>
                        <th style="min-width:50px">#</th>
                    </tr>
                </thead>
                <tbody>
                    @for($i = 1; $i <= $max; $i++)
                    <tr id="bl-row-{{ $i }}" style="{{ $i > 1 ? 'display:none;' : '' }}">
                        <td>
                            <select id="bl_prod_{{ $i }}" style="width:100%" onchange="blSelectProd({{ $i }})">
                                <option value="">— Choisir —</option>
                                @foreach($products as $p)
                                    <option value="{{ $p->id }}" data-prix="{{ $p->getEffectivePriceHt() }}" data-qte="{{ $p->qte }}">
                                        {{ $p->designation_fr }} ({{ $p->qte }}) - {{ $p->code_product }}
                                    </option>
                                @endforeach
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
        <button type="button" class="btn-add-row" onclick="blAddRow()">+ Ajouter un produit</button>

        {{-- TOTALS --}}
        <div class="bl-bottom">
            <div class="bl-spacer"></div>
            <div class="bl-totals">
                <table>
                    <tr>
                        <td>Montant Total HT</td>
                        <td><input class="tot-input" id="bl_p_ht" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Montant Remise</td>
                        <td><input class="tot-input" id="bl_remise" value="0.000" step="0.001"
                                   onkeyup="blCalculate('mt_remise')" onchange="blCalculate('mt_remise')"></td>
                    </tr>
                    <tr>
                        <td>Pourcentage Remise %</td>
                        <td><input class="tot-input" id="bl_pourcent_remise" value="0" step="0.001"
                                   onkeyup="blCalculate('pourcen_remise')" onchange="blCalculate('pourcen_remise')"></td>
                    </tr>
                    <tr id="bl_ligne_apres_remise" style="display:none">
                        <td>HT après remise</td>
                        <td><input class="tot-input" id="bl_apres_remise" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Frais Livraison</td>
                        <td><input class="tot-input" id="bl_frais_display" disabled value="0.000"></td>
                    </tr>
                    <tr class="bl-net-row">
                        <td>Net à payer</td>
                        <td><input class="tot-input" id="bl_net" disabled value="0.000"></td>
                    </tr>
                </table>
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

$(document).ready(function () {
    $('#bl_client_id').select2({ placeholder: '— Choisir un client —', allowClear: true, width: '100%' });
    for (let i = 1; i <= blMax; i++) { blInitSelect2(i); }
    
    // Hydrate existing data if in Edit mode using Livewire's form data
    @php
        $formData = method_exists($getLivewire(), 'getRecord') && $getLivewire()->getRecord() ? $getLivewire()->data : [];
    @endphp
    var initData = @json($formData);
    
    if (initData && initData.client_id) {
        blHydrate(initData);
    } else {
        blCalculate();
    }
});

function blHydrate(data) {
    if (data.client_id) {
        $('#bl_client_id').val(data.client_id).trigger('change');
    }
    
    if (data.details && Array.isArray(data.details)) {
        let i = 1;
        data.details.forEach(item => {
            if (item.produit_id && i <= blMax) {
                var r = document.getElementById('bl-row-' + i);
                if (r) r.style.display = '';
                
                // Set the Select2 value without triggering its full onchange yet to avoid recalculation loops
                var $sel = $('#bl_prod_' + i);
                $sel.val(item.produit_id).trigger('change.select2');
                
                document.getElementById('bl_qte_' + i).value = item.qte || 1;
                document.getElementById('bl_pu_' + i).value = item.prix_unitaire || 0;
                
                // Get constraints from the selected option
                var opt = $sel.find('option:selected');
                if (opt.length) {
                    document.getElementById('bl_qte_' + i).max = opt.attr('data-qte') || 9999;
                }
                
                i++;
            }
        });
    }

    if (data.remise) document.getElementById('bl_remise').value = data.remise;
    if (data.pourcentage_remise) document.getElementById('bl_pourcent_remise').value = data.pourcentage_remise;
    if (data.frais_livraison) document.getElementById('bl_frais_livraison').value = data.frais_livraison;
    
    blCalculate();
}


function blInitSelect2(i) {
    $('#bl_prod_' + i).select2({ placeholder: '— Choisir —', allowClear: true, width: '100%', language: { noResults: function() { return 'Aucun résultat'; } } });
    $('#bl_prod_' + i).on('change', function () { blSelectProd(i); });
}

function blSelectClient() {
    var sel = document.getElementById('bl_client_id');
    var opt = sel.options[sel.selectedIndex];
    document.getElementById('bl_adr').value   = opt.getAttribute('data-adresse') ?? '';
    document.getElementById('bl_phone').value = opt.getAttribute('data-phone') ?? '';
}
$('#bl_client_id').on('change', function() { blSelectClient(); });

function blSelectProd(i) {
    var sel = document.getElementById('bl_prod_' + i);
    if (!sel || !sel.value) return;
    var opt  = sel.options[sel.selectedIndex];
    var prix = parseFloat(opt.getAttribute('data-prix') ?? 0);
    var maxQ = parseFloat(opt.getAttribute('data-qte') ?? 9999);
    document.getElementById('bl_pu_' + i).value  = prix.toFixed(3);
    document.getElementById('bl_qte_' + i).max   = maxQ;
    blCalculate();
}

function blAddRow() {
    for (let i = 1; i <= blMax; i++) {
        var r = document.getElementById('bl-row-' + i);
        if (r.style.display === 'none') {
            r.style.display = '';
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

    if (totRemise > 0) {
        document.getElementById('bl_ligne_apres_remise').style.display = '';
        document.getElementById('bl_apres_remise').value = (totalHt - totRemise).toFixed(3);
    } else {
        document.getElementById('bl_ligne_apres_remise').style.display = 'none';
    }

    var frais = parseFloat(document.getElementById('bl_frais_livraison')?.value) || 0;
    var net   = totalHt - totRemise + frais;

    document.getElementById('bl_p_ht').value       = totalHt.toFixed(3);
    document.getElementById('bl_frais_display').value = frais.toFixed(3);
    document.getElementById('bl_net').value         = net.toFixed(3);
}

function blScanner() {
    var barcodeInput = document.getElementById('bl_barcode');
    var code = (parseInt(barcodeInput.value) + 1) + '';
    if (!code) return;
    var found = null;
    var opts = document.getElementById('bl_prod_1').options;
    for (let o of opts) {
        var codePart = o.text.split(' - ').pop().trim();
        if (codePart === code || codePart === '0' + code) {
            found = { id: o.value, prix: o.getAttribute('data-prix'), qte: o.getAttribute('data-qte') };
            break;
        }
    }
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
                    $('#bl_prod_' + i).val(found.id).trigger('change');
                    document.getElementById('bl_qte_' + i).value = 1;
                    document.getElementById('bl_pu_' + i).value  = parseFloat(found.prix).toFixed(3);
                    blCalculate();
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

function blAddClient() {
    document.getElementById('bl-select-client').style.display = 'none';
    document.getElementById('bl-add-client').style.display    = '';
}
function blAnnulerClient() {
    document.getElementById('bl-select-client').style.display = '';
    document.getElementById('bl-add-client').style.display    = 'none';
    ['bl_new_name','bl_new_adresse','bl_new_phone'].forEach(id => { var el = document.getElementById(id); if(el) el.value = ''; });
}

function blSave() {
    var lines = [];
    for (let i = 1; i <= blMax; i++) {
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

    @this.set('data.client_id', clientId);
    @this.set('data.details', lines);
    @this.set('data.remise', parseFloat(remise));
    @this.set('data.pourcentage_remise', parseFloat(pct));
    @this.set('data.prix_ht', parseFloat(prixHt));
    @this.set('data.frais_livraison', parseFloat(frais));
    @this.set('data.net_a_payer', parseFloat(net));
    @this.set('data.prix_ht_apres_remise', parseFloat(document.getElementById('bl_apres_remise')?.value || prixHt));
    @this.set('data.tva', 0);
    @this.set('data.prix_ttc', parseFloat(net));
    @this.set('data.timbre', 0);

    setTimeout(() => {
        var btn = document.querySelector('[wire\\:click*="save"], button[type="submit"]');
        if (btn) { btn.click(); } else { @this.call('save'); }
    }, 200);
}

document.addEventListener('keypress', function(e) {
    if (e.keyCode === 13 && e.target.id !== 'bl_barcode') e.preventDefault();
});
</script>
