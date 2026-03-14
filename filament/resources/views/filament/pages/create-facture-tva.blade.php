@php
    $coordinate = \App\Models\Coordinate::getCached();
    $clients    = [];
    $products   = [];
    $max        = 100;
    $defaultTva = $coordinate && isset($coordinate->tva) ? (float) $coordinate->tva : 19;
    $logoPath   = public_path('logo.png');
    $logoSrc    = is_file($logoPath)
        ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
        : null;
@endphp

{{-- Select2 CSS --}}
<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet"/>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<style>
/* Force full width on ALL Filament wrappers */
.fi-simple-layout,.fi-simple-main,
.fi-layout,.fi-layout-sidebar,
.fi-main,.fi-main-ctn,
.fi-page,.fi-resource-page,
.fi-page-content,.fi-content,
[class*="fi-"][class*="-ctn"],
.fi-body .fi-main > .fi-main-ctn { max-width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
.fi-page-header { display: none !important; }
.fi-form-actions { display: none !important; }

/* ── WRAPPER ─────────────────────────────────────────────────── */
.ftva-wrap { font-family: 'Inter', Arial, sans-serif; padding: 16px 24px; background: #f9fafb; min-height: 100vh; }
.ftva-form { background: #fff; border-radius: 12px; box-shadow: 0 1px 8px rgba(0,0,0,.08); padding: 24px; }

/* ── TOP ROW ─────────────────────────────────────────────────── */
.ftva-top { display: flex; gap: 24px; margin-bottom: 20px; align-items: flex-start; }
.ftva-company { flex: 0 0 42%; }
.ftva-company img { height: 80px; object-fit: contain; margin-bottom: 8px; display: block; }
.ftva-company h4 { font-size: 16px; font-weight: 700; margin: 0 0 4px; color: #1e293b; }
.ftva-company p  { font-size: 13px; color: #475569; margin: 2px 0; }

.ftva-client { flex: 1; }
.ftva-client-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.ftva-client label { font-size: 13px; font-weight: 600; color: #374151; }
.ftva-client .form-field { margin-bottom: 10px; }
.ftva-client input.fc-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 10px; font-size: 13px; color: #374151; background: #f8fafc; }
.ftva-client input.fc-input:disabled { background: #f1f5f9; color: #64748b; }

/* Add-client toggle block */
#ftva-add-client { display: none; }
.btn-ajouter-client { background: #2563eb; color: #fff; border: none; border-radius: 6px; padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-annuler-client { background: #ef4444; color: #fff; border: none; border-radius: 6px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-ajouter-client:hover { background: #1d4ed8; }
.btn-annuler-client:hover { background: #dc2626; }

/* ── BARCODE ─────────────────────────────────────────────────── */
.ftva-barcode { margin-bottom: 16px; }
.ftva-barcode label { font-size: 13px; font-weight: 600; color: #374151; display: block; margin-bottom: 6px; }
.ftva-barcode input { width: 100%; border: 1px solid #fdba74; border-radius: 6px; padding: 9px 14px; font-size: 15px; background: #fff7ed; }
.ftva-barcode input:focus { outline: none; border-color: #f97316; box-shadow: 0 0 0 2px rgba(249,115,22,.2); }

/* ── PRODUCT TABLE ───────────────────────────────────────────── */
.ftva-table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 12px; }
.ftva-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ftva-table thead th { background: #f8fafc; color: #334155; font-weight: 700; text-transform: uppercase; padding: 10px 8px; text-align: left; font-size: 11px; letter-spacing: .05em; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }
.ftva-table tbody tr:nth-child(even) { background: #fafaf9; }
.ftva-table tbody td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
.ftva-table td .select2-container { min-width: 220px; width: 100% !important; }
.ftva-table td .select2-container--default .select2-selection--single { border: 1px solid #cbd5e1; border-radius: 6px; height: 34px; }
.ftva-table td .select2-container--default .select2-selection--single .select2-selection__rendered { line-height: 32px; font-size: 13px; }
.ftva-table td .select2-container--default .select2-selection--single .select2-selection__arrow { height: 32px; }
.ftva-table td input.tbl-input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 13px; width: 80px; text-align: right; background: #fff; height: 34px; }
.ftva-table td input.tbl-input:disabled { background: #f1f5f9; color: #64748b; border-color: transparent; font-weight: 600; }

/* ── ADD ROW BUTTON ──────────────────────────────────────────── */
.btn-add-row { background: #ecfdf5; color: #059669; border: 1px dashed #34d399; border-radius: 6px; padding: 8px 20px; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 24px; }
.btn-add-row:hover { background: #d1fae5; border-color: #10b981; }
.btn-del-row { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; border-radius: 6px; padding: 5px 10px; cursor: pointer; font-size: 12px; }
.btn-del-row:hover { background: #fee2e2; }

/* ── TOTALS ──────────────────────────────────────────────────── */
.ftva-bottom { display: flex; gap: 24px; margin-top: 8px; }
.ftva-spacer { flex: 1; }
.ftva-totals { flex: 0 0 420px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.ftva-totals table { width: 100%; border-collapse: collapse; }
.ftva-totals table td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
.ftva-totals table td:first-child { color: #475569; font-weight: 500; }
.ftva-totals table td:last-child { text-align: right; }
.ftva-totals table input.tot-input { width: 120px; border: 1px solid #cbd5e1; border-radius: 5px; padding: 4px 8px; font-size: 13px; text-align: right; background: #fff; }
.ftva-totals table input.tot-input:disabled { background: #f8fafc; border-color: transparent; color: #1e293b; font-weight: 700; }
.ftva-net-row { background: #eff6ff; }
.ftva-net-row td { font-size: 15px !important; font-weight: 800 !important; color: #1e40af !important; }

/* ── FOOTER ──────────────────────────────────────────────────── */
.ftva-footer { margin-top: 24px; text-align: right; border-top: 1px solid #e2e8f0; padding-top: 16px; }
.btn-save { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 10px 32px; font-size: 15px; font-weight: 700; cursor: pointer; }
.btn-save:hover { background: #1d4ed8; }
</style>

<div class="ftva-wrap" id="ftva-main">
    <div class="ftva-form">

        {{-- TOP ROW --}}
        <div class="ftva-top">
            {{-- Company Info --}}
            <div class="ftva-company">
                <img src="{{ $logoSrc ?? asset('logo.png') }}" alt="Sobitas" onerror="this.style.display='none'">
                @if($coordinate)
                    <h4>{{ $coordinate->abbreviation ?? $coordinate->name_fr ?? '' }}</h4>
                    <p>{{ $coordinate->phone_1 }} @if($coordinate->phone_2) / {{ $coordinate->phone_2 }} @endif</p>
                    <p>{{ $coordinate->adresse_fr ?? $coordinate->adresse ?? '' }}</p>
                @endif
            </div>

            {{-- Client Select --}}
            <div class="ftva-client">
                <div class="ftva-client-head">
                    <label>Client</label>
                    <button type="button" class="btn-ajouter-client" onclick="ftvaAddClient()">Ajouter Client(e)</button>
                </div>

                {{-- Select Client --}}
                <div id="ftva-select-client">
                    <div class="form-field">
                        <select id="ftva_client_id" name="ftva_client_id" style="width:100%" onchange="ftvaSelectClient()">
                            <option value="">— Choisir un client —</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;color:#64748b;">Adresse</label>
                        <input class="fc-input" id="ftva_adr" disabled value="">
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;color:#64748b;">N°Tél</label>
                        <input class="fc-input" id="ftva_phone" disabled value="">
                    </div>
                </div>

                {{-- Add Client Form --}}
                <div id="ftva-add-client">
                    <div style="margin-bottom:8px;text-align:right;">
                        <button type="button" class="btn-annuler-client" onclick="ftvaAnnulerClient()">Annuler</button>
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;">Nom et Prénom</label>
                        <input class="fc-input" style="background:#fff;" id="new_name" name="new_client_name" placeholder="Nom...">
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;">Adresse</label>
                        <input class="fc-input" style="background:#fff;" id="new_adresse" name="new_client_adresse">
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;">Téléphone</label>
                        <input class="fc-input" style="background:#fff;" id="new_phone" name="new_client_phone">
                    </div>
                    <div class="form-field">
                        <label style="font-size:12px;">Matricule Fiscal</label>
                        <input class="fc-input" style="background:#fff;" id="new_mf" name="new_client_mf">
                    </div>
                </div>
            </div>
        </div>

        {{-- BARCODE --}}
        <div class="ftva-barcode">
            <label>Scanner code à barre</label>
            <input type="number" id="ftva_barcode" placeholder="barcode" autocomplete="off"
                   autofocus onchange="ftvaScanner()">
        </div>

        {{-- PRODUCT TABLE --}}
        <div class="ftva-table-wrap">
            <table class="ftva-table" id="ftva-products-table">
                <thead>
                    <tr>
                        <th style="min-width:280px">Produits</th>
                        <th style="min-width:70px">Qté</th>
                        <th style="min-width:90px">P.U HT</th>
                        <th style="min-width:90px">P.T/HT</th>
                        <th style="min-width:70px">TVA %</th>
                        <th style="min-width:90px">TVA</th>
                        <th style="min-width:50px">#</th>
                    </tr>
                </thead>
                <tbody>
                    @for ($i = 1; $i <= $max; $i++)
                    <tr id="ftva-row-{{ $i }}" style="{{ $i > 1 ? 'display:none;' : '' }}">
                        <td>
                            <select id="ftva_prod_{{ $i }}" name="ftva_prod_{{ $i }}"
                                    style="width:100%" onchange="ftvaSelectProd({{ $i }})">
                                <option value="">— Choisir —</option>
                            </select>
                        </td>
                        <td><input type="number" class="tbl-input" id="ftva_qte_{{ $i }}" value="1" min="0.001" step="1" onchange="ftvaCalculate()" oninput="ftvaCalculate()"></td>
                        <td><input type="number" class="tbl-input" id="ftva_pu_{{ $i }}" value="0" min="0" step="0.001" onchange="ftvaCalculate()" oninput="ftvaCalculate()"></td>
                        <td><input type="number" class="tbl-input" id="ftva_ptht_{{ $i }}" value="0" min="0" step="0.001" disabled></td>
                        <td><input type="number" class="tbl-input" id="ftva_tva_{{ $i }}" value="{{ $defaultTva }}" min="0" step="1" disabled></td>
                        <td><input type="number" class="tbl-input" id="ftva_val_tva_{{ $i }}" value="0" min="0" step="0.001" disabled></td>
                        <td><button type="button" class="btn-del-row" onclick="ftvaRemoveRow({{ $i }})">✕</button></td>
                    </tr>
                    @endfor
                </tbody>
            </table>
        </div>

        <button type="button" class="btn-add-row" onclick="ftvaAddRow()">+ Ajouter un produit</button>

        {{-- TOTALS --}}
        <div class="ftva-bottom">
            <div class="ftva-spacer"></div>
            <div class="ftva-totals">
                <table>
                    <tr>
                        <td>Montant Total HT</td>
                        <td><input class="tot-input" id="ftva_p_ht" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Montant Remise</td>
                        <td><input class="tot-input" id="ftva_remise" value="0.000" step="0.001"
                                   onkeyup="ftvaCalculate('mt_remise')" onchange="ftvaCalculate('mt_remise')"></td>
                    </tr>
                    <tr>
                        <td>Pourcentage Remise %</td>
                        <td><input class="tot-input" id="ftva_pourcent_remise" value="0" step="0.001"
                                   onkeyup="ftvaCalculate('pourcen_remise')" onchange="ftvaCalculate('pourcen_remise')"></td>
                    </tr>
                    <tr id="ftva_ligne_apres_remise" style="display:none">
                        <td>HT après remise</td>
                        <td><input class="tot-input" id="ftva_apres_remise" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Montant Totale TVA</td>
                        <td><input class="tot-input" id="ftva_m_tt_tva" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Montant Totale TTC</td>
                        <td><input class="tot-input" id="ftva_m_tt_ttc" disabled value="0.000"></td>
                    </tr>
                    <tr>
                        <td>Timbre Fiscal</td>
                        <td><input class="tot-input" id="ftva_timbre" value="{{ $coordinate->timbre ?? '1.000' }}" step="0.001"
                                   onkeyup="ftvaCalculate()" onchange="ftvaCalculate()"></td>
                    </tr>
                    <tr class="ftva-net-row">
                        <td>Net à payer</td>
                        <td><input class="tot-input" id="ftva_net" disabled value="0.000"></td>
                    </tr>
                </table>
            </div>
        </div>

        {{-- FOOTER --}}
        <div class="ftva-footer">
            <button type="button" class="btn-save" onclick="ftvaSave()">💾 Enregistrer</button>
        </div>

    </div>
</div>

<script>
var ftvaMax = {{ $max }};
var ftvaJ   = 1;  // last visible row
var ftvaDefaultTva = {{ $defaultTva }};

$(document).ready(function () {
    // Init Select2 for client
    $('#ftva_client_id').select2({
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

    // Init Select2 for all product rows
    for (let i = 1; i <= ftvaMax; i++) {
        ftvaInitSelect2(i);
    }

    ftvaCalculate();
});

function ftvaInitSelect2(i) {
    $('#ftva_prod_' + i).select2({
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
    $('#ftva_prod_' + i).on('change', function () {
        ftvaSelectProd(i);
    });
}

function ftvaSelectClient() {
    var sel = $('#ftva_client_id').select2('data')[0];
    if (!sel) return;
    document.getElementById('ftva_adr').value   = sel.adresse || '';
    document.getElementById('ftva_phone').value = sel.phone_1 || '';
}

$('#ftva_client_id').on('change', function() { ftvaSelectClient(); });

function ftvaSelectProd(i) {
    var sel = $('#ftva_prod_' + i).select2('data')[0];
    if (!sel || !sel.id) return;
    var prix = parseFloat(sel.prix || 0);
    var tva  = parseFloat(sel.tva || ftvaDefaultTva);
    var maxQ = parseFloat(sel.qte || 9999);
    document.getElementById('ftva_pu_' + i).value  = prix.toFixed(3);
    document.getElementById('ftva_tva_' + i).value = tva;
    document.getElementById('ftva_qte_' + i).max   = maxQ;
    ftvaCalculate();
}

function ftvaAddRow() {
    for (let i = 1; i <= ftvaMax; i++) {
        var r = document.getElementById('ftva-row-' + i);
        if (r.style.display === 'none') {
            r.style.display = '';
            $('#ftva_prod_' + i).val('').trigger('change.select2');
            document.getElementById('ftva_qte_' + i).value = 1;
            document.getElementById('ftva_pu_' + i).value  = 0;
            document.getElementById('ftva_ptht_' + i).value= 0;
            document.getElementById('ftva_tva_' + i).value = ftvaDefaultTva;
            document.getElementById('ftva_val_tva_' + i).value = 0;
            ftvaJ = i;
            break;
        }
    }
}

function ftvaRemoveRow(i) {
    var r = document.getElementById('ftva-row-' + i);
    r.style.display = 'none';
    $('#ftva_prod_' + i).val('').trigger('change.select2');
    document.getElementById('ftva_qte_' + i).value = 0;
    document.getElementById('ftva_pu_' + i).value  = 0;
    ftvaCalculate();
}

function ftvaCalculate(typeRemise) {
    var totalHt  = 0;
    var totalTva = 0;

    for (let i = 1; i <= ftvaMax; i++) {
        var r = document.getElementById('ftva-row-' + i);
        if (!r || r.style.display === 'none') continue;
        var pid = $('#ftva_prod_' + i).val();
        if (!pid) continue;
        var qte  = parseFloat(document.getElementById('ftva_qte_' + i).value) || 0;
        var pu   = parseFloat(document.getElementById('ftva_pu_' + i).value)  || 0;
        var tva  = parseFloat(document.getElementById('ftva_tva_' + i).value) || 0;
        var ptht = qte * pu;
        var valTva = ptht * tva / 100;
        document.getElementById('ftva_ptht_' + i).value    = ptht.toFixed(3);
        document.getElementById('ftva_val_tva_' + i).value = valTva.toFixed(3);
        totalHt  += ptht;
        totalTva += valTva;
    }

    var remiseEl   = document.getElementById('ftva_remise');
    var pctRemEl   = document.getElementById('ftva_pourcent_remise');
    var totRemise  = 0;

    if (typeRemise === 'mt_remise') {
        totRemise = parseFloat(remiseEl.value) || 0;
        pctRemEl.value = totalHt > 0 ? ((totRemise / totalHt) * 100).toFixed(3) : 0;
        totalTva = totalTva - (totalTva * (totRemise / totalHt || 0));
    } else if (typeRemise === 'pourcen_remise') {
        var pct = parseFloat(pctRemEl.value) || 0;
        totRemise = (totalHt * pct / 100);
        remiseEl.value = totRemise.toFixed(3);
        totalTva = totalTva - (totalTva * pct / 100);
    } else {
        totRemise = parseFloat(remiseEl.value) || 0;
    }

    if (totRemise > 0) {
        document.getElementById('ftva_ligne_apres_remise').style.display = '';
        document.getElementById('ftva_apres_remise').value = (totalHt - totRemise).toFixed(3);
    } else {
        document.getElementById('ftva_ligne_apres_remise').style.display = 'none';
    }

    var totalTtc = totalHt - totRemise + totalTva;
    var timbre   = parseFloat(document.getElementById('ftva_timbre').value) || 0;
    var net      = totalTtc + timbre;

    document.getElementById('ftva_p_ht').value    = totalHt.toFixed(3);
    document.getElementById('ftva_m_tt_tva').value= totalTva.toFixed(3);
    document.getElementById('ftva_m_tt_ttc').value= totalTtc.toFixed(3);
    document.getElementById('ftva_net').value      = net.toFixed(3);
}

function ftvaScanner() {
    var barcodeInput = document.getElementById('ftva_barcode');
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
                for (let i = 1; i <= ftvaMax; i++) {
                    var r = document.getElementById('ftva-row-' + i);
                    if (r && r.style.display !== 'none' && $('#ftva_prod_' + i).val() == found.id) { existingIdx = i; break; }
                }
                if (existingIdx > -1) {
                    var qteEl = document.getElementById('ftva_qte_' + existingIdx);
                    qteEl.value = parseFloat(qteEl.value) + 1;
                    ftvaCalculate();
                } else {
                    ftvaAddRow();
                    for (let i = 1; i <= ftvaMax; i++) {
                        var r = document.getElementById('ftva-row-' + i);
                        if (r && r.style.display !== 'none' && !$('#ftva_prod_' + i).val()) {
                            var newOption = new Option(found.designation, found.id, true, true);
                            $('#ftva_prod_' + i).append(newOption).trigger('change');
                            document.getElementById('ftva_qte_' + i).value = 1;
                            document.getElementById('ftva_pu_' + i).value  = parseFloat(found.prix_unitaire).toFixed(3);
                            document.getElementById('ftva_tva_' + i).value = ftvaDefaultTva;
                            ftvaCalculate();
                            break;
                        }
                    }
                }
            } else {
                Swal.fire('Introuvable', 'Aucun produit trouvé', 'warning');
            }
        });
}

function ftvaAddClient() {
    document.getElementById('ftva-select-client').style.display = 'none';
    document.getElementById('ftva-add-client').style.display    = '';
}

function ftvaAnnulerClient() {
    document.getElementById('ftva-select-client').style.display = '';
    document.getElementById('ftva-add-client').style.display    = 'none';
    ['new_name','new_adresse','new_phone','new_mf'].forEach(id => {
        var el = document.getElementById(id); if(el) el.value = '';
    });
}

function ftvaSave() {
    // Build the data and submit via Livewire / wire:
    // Collect all visible rows
    var lines = [];
    for (let i = 1; i <= ftvaMax; i++) {
        var r = document.getElementById('ftva-row-' + i);
        if (!r || r.style.display === 'none') continue;
        var pid = $('#ftva_prod_' + i).val();
        if (!pid) continue;
        lines.push({
            produit_id:    pid,
            qte:           document.getElementById('ftva_qte_' + i).value,
            prix_unitaire: document.getElementById('ftva_pu_' + i).value,
            tva_pct:       document.getElementById('ftva_tva_' + i).value,
        });
    }

    var clientId   = $('#ftva_client_id').val();
    var remise     = document.getElementById('ftva_remise').value;
    var timbre     = document.getElementById('ftva_timbre').value;
    var pct        = document.getElementById('ftva_pourcent_remise').value;
    var prixHt     = document.getElementById('ftva_p_ht').value;
    var tva        = document.getElementById('ftva_m_tt_tva').value;
    var prixTtc    = document.getElementById('ftva_m_tt_ttc').value;
    var netAPayer  = document.getElementById('ftva_net').value;

    if (!clientId) { Swal.fire('Erreur', 'Veuillez choisir un client', 'warning'); return; }
    if (lines.length === 0) { Swal.fire('Erreur', 'Ajoutez au moins un produit', 'warning'); return; }

    // Push to Livewire form via hidden fields
    @this.set('data.client_id', clientId);
    @this.set('data.details', lines);
    @this.set('data.remise', parseFloat(remise));
    @this.set('data.pourcentage_remise', parseFloat(pct));
    @this.set('data.prix_ht', parseFloat(prixHt));
    @this.set('data.tva', parseFloat(tva));
    @this.set('data.prix_ttc', parseFloat(prixTtc));
    @this.set('data.timbre', parseFloat(timbre));
    @this.set('data.net_a_payer', parseFloat(netAPayer));
    @this.set('data.prix_ht_apres_remise', parseFloat(document.getElementById('ftva_apres_remise')?.value || prixHt));

    // Submit the Filament form
    setTimeout(() => {
        var btn = document.querySelector('[wire\\:click*="save"], button[type="submit"]');
        if (btn) {
            btn.click();
        } else {
            @this.call('save');
        }
    }, 200);
}

// Prevent Enter key from adding new row accidentally
document.addEventListener('keypress', function(e) {
    if (e.keyCode === 13 && e.target.id !== 'ftva_barcode') {
        e.preventDefault();
    }
});
</script>
