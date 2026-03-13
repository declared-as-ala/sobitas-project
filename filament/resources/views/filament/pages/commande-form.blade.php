@php
    $coordinate = \App\Models\Coordinate::getCached();
    $clients    = \App\Models\Client::orderBy('name')->get(['id','name','adresse','email','phone_1','ville','code_postal']);
    $products   = \App\Models\Product::select('id','code_product','designation_fr','prix','qte')
                    ->orderBy('designation_fr')
                    ->get();
    $max = 100;

    $logoPath = public_path('logo.png');
    $logoSrc  = is_file($logoPath)
        ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
        : null;

    $record = $this->record;
    $isEdit = $record !== null;
@endphp

<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet"/>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<style>
/* ── Force FULL WIDTH on Commande Edit Pages ─────────── */
body:has(.commande-edit-page) .fi-main-ctn,
body:has(.commande-edit-page) .fi-page,
body:has(.commande-edit-page) .fi-resource-page,
body:has(.commande-edit-page) form,
body:has(.commande-edit-page) .fi-fo-component-ctn,
body:has(.commande-edit-page) .fi-fo-view,
body:has(.commande-edit-page) .fi-fo-view > div {
    max-width: 100% !important;
    width: 100% !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
}

/* Hide native form acts & redundant elements if needed */
body:has(.commande-edit-page) .fi-form-actions { display: none !important; }
body:has(.commande-edit-page) [wire\:key] > .fi-fo-field-wrp-label { display: none !important; }

.cmd-wrap { font-family: 'Inter', Arial, sans-serif; padding: 16px 24px; background: #f9fafb; min-height: 100vh; }
.cmd-form { background: #fff; border-radius: 12px; box-shadow: 0 1px 8px rgba(0,0,0,.08); padding: 24px; border-top: 4px solid #f97316; }

/* Header Layout */
.cmd-top { display: flex; gap: 24px; justify-content: space-between; margin-bottom: 30px; align-items: flex-start; }
.cmd-company { flex: 0 0 45%; }
.cmd-company img { height: 80px; object-fit: contain; margin-bottom: 8px; display: block; }
.cmd-company h4 { font-size: 16px; font-weight: 700; margin: 0 0 4px; color: #1e293b; text-transform: uppercase; }
.cmd-company p { font-size: 13px; color: #475569; margin: 2px 0; }

.cmd-client-box { flex: 0 0 45%; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
.cmd-client-box label { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 4px; display: block; text-transform: uppercase; letter-spacing: 0.05em; }
.cmd-input-group { margin-bottom: 12px; }
.cmd-input { width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 14px; color: #1e293b; background: #fff; }
.cmd-input:disabled { background: #f1f5f9; color: #64748b; }

/* Two Information Blocks (Facturation & Livraison) */
.cmd-info-blocks { display: flex; gap: 32px; margin-bottom: 30px; border-top: 1px solid #e2e8f0; padding-top: 24px; }
.cmd-info-col { flex: 1; }
.cmd-info-title { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #f8fafc; padding-bottom: 8px; }
.cmd-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }

/* Products Table */
.cmd-table-wrap { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; background: #fff; }
.cmd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.cmd-table thead th { background: #f1f5f9; color: #475569; font-weight: 600; text-transform: uppercase; padding: 12px; text-align: left; font-size: 11px; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
.cmd-table tbody tr:nth-child(even) { background: #f8fafc; }
.cmd-table tbody td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
.cmd-table td .select2-container { width: 100% !important; min-width: 300px; }
.cmd-table td .select2-selection--single { border: 1px solid #cbd5e1; border-radius: 6px; height: 36px; padding: 4px; }
.cmd-table td .select2-selection__rendered { line-height: 26px; font-size: 13px; color: #334155; }
.cmd-table td input.tbl-input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 13px; width: 100%; text-align: right; background: #fff; height: 36px; }
.cmd-table td input.tbl-input:disabled { background: #f1f5f9; border-color: transparent; font-weight: 600; color: #1e293b; }

.btn-add-row { background: #3b82f6; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.btn-add-row:hover { background: #2563eb; }
.btn-del-row { background: #ef4444; color: #fff; border: none; border-radius: 4px; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; font-weight: bold; }
.btn-del-row:hover { background: #dc2626; }

/* Totals Panel */
.cmd-bottom { display: flex; justify-content: flex-end; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 24px; }
.cmd-totals { width: 450px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
.cmd-total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 13px; color: #475569; }
.cmd-total-row.net { font-size: 16px; font-weight: 800; color: #1e293b; border-top: 2px solid #e2e8f0; padding-top: 12px; margin-top: 4px; }
.tot-input { width: 140px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 14px; text-align: right; background: #fff; font-weight: 600; }
.tot-input:disabled { background: #f1f5f9; border-color: transparent; color: #334155; }

/* Footer Actions */
.cmd-footer { margin-top: 32px; padding: 16px 24px; background: #f8fafc; border-radius: 0 0 12px 12px; display: flex; gap: 16px; }
.btn-save { background: #34d399; color: #fff; border: none; border-radius: 6px; padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-save:hover { background: #10b981; }
</style>

<div class="commande-edit-page">
<div class="cmd-wrap">
    <div class="cmd-form">
        
        <!-- Header: Logo & Client Selection -->
        <div class="cmd-top">
            <div class="cmd-company">
                @if($logoSrc)
                    <img src="{{ $logoSrc }}" alt="Logo">
                @endif
                @if($coordinate)
                    <h4>{{ $coordinate->name_fr ?? $coordinate->abbreviation ?? 'STE' }}</h4>
                    <p>{{ $coordinate->phone_1 }}</p>
                    <p>{{ $coordinate->adresse_fr ?? $coordinate->adresse ?? '' }}</p>
                @endif
            </div>

            <div class="cmd-client-box">
                <label>Client</label>
                <div class="cmd-input-group">
                    <select id="cmd_client_id" class="cmd-input" style="width:100%" onchange="cmdSelectClient()">
                        <option value="">— Choisir un client —</option>
                        @foreach($clients as $c)
                            <option value="{{ $c->id }}" 
                                    data-nom="{{ $c->name }}" 
                                    data-adr="{{ $c->adresse }}" 
                                    data-phone="{{ $c->phone_1 }}"
                                    data-email="{{ $c->email }}"
                                    data-region="{{ $c->ville }}"
                                    data-cp="{{ $c->code_postal }}">
                                {{ $c->name }} ({{ $c->phone_1 }})
                            </option>
                        @endforeach
                    </select>
                </div>
            </div>
        </div>

        <!-- Middle: Facturation & Livraison Infos -->
        <div class="cmd-info-blocks">
            <div class="cmd-info-col">
                <div class="cmd-info-title">Informations de Facturation</div>
                <div class="cmd-grid-2">
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Nom</label>
                        <input type="text" id="cmd_nom" class="cmd-input" value="{{ $data['nom'] ?? '' }}">
                    </div>
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Prénom</label>
                        <input type="text" id="cmd_prenom" class="cmd-input" value="{{ $data['prenom'] ?? '' }}">
                    </div>
                </div>
                <div class="cmd-grid-2">
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Email</label>
                        <input type="email" id="cmd_email" class="cmd-input" value="{{ $data['email'] ?? '' }}">
                    </div>
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Téléphone</label>
                        <input type="text" id="cmd_phone" class="cmd-input" value="{{ $data['phone'] ?? '' }}">
                    </div>
                </div>
                <div class="cmd-grid-2">
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Région / Ville</label>
                        <input type="text" id="cmd_region" class="cmd-input" value="{{ $data['region'] ?? '' }}">
                    </div>
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Code Postal</label>
                        <input type="text" id="cmd_cp" class="cmd-input" value="{{ $data['code_postale'] ?? '' }}">
                    </div>
                </div>
                <div class="cmd-input-group" style="margin-top:12px;">
                    <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Adresse</label>
                    <input type="text" id="cmd_adresse" class="cmd-input" value="{{ $data['adresse1'] ?? '' }}">
                </div>
            </div>

            <div class="cmd-info-col">
                <div class="cmd-info-title">Informations de Livraison 
                    <button type="button" onclick="cmdCopyFactToLiv()" style="float:right;font-size:11px;color:#3b82f6;background:none;border:none;cursor:pointer;">Copier facturation</button>
                </div>
                <div class="cmd-grid-2">
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Nom</label>
                        <input type="text" id="cmd_l_nom" class="cmd-input" value="{{ $data['livraison_nom'] ?? '' }}">
                    </div>
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Prénom</label>
                        <input type="text" id="cmd_l_prenom" class="cmd-input" value="{{ $data['livraison_prenom'] ?? '' }}">
                    </div>
                </div>
                <div class="cmd-grid-2">
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Email</label>
                        <input type="email" id="cmd_l_email" class="cmd-input" value="{{ $data['livraison_email'] ?? '' }}">
                    </div>
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Téléphone</label>
                        <input type="text" id="cmd_l_phone" class="cmd-input" value="{{ $data['livraison_phone'] ?? '' }}">
                    </div>
                </div>
                <div class="cmd-grid-2">
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Région / Ville</label>
                        <input type="text" id="cmd_l_region" class="cmd-input" value="{{ $data['livraison_region'] ?? '' }}">
                    </div>
                    <div>
                        <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Code Postal</label>
                        <input type="text" id="cmd_l_cp" class="cmd-input" value="{{ $data['livraison_code_postale'] ?? '' }}">
                    </div>
                </div>
                <div class="cmd-input-group" style="margin-top:12px;">
                    <label class="cmd-client-box label" style="font-size:11px;color:#64748b;">Adresse</label>
                    <input type="text" id="cmd_l_adresse" class="cmd-input" value="{{ $data['livraison_adresse1'] ?? '' }}">
                </div>
            </div>
        </div>

        <!-- Products -->
        <div class="cmd-table-wrap">
            <table class="cmd-table">
                <thead>
                    <tr>
                        <th style="min-width:350px">Produits</th>
                        <th style="width:100px">Qté</th>
                        <th style="width:120px">P.U TTC</th>
                        <th style="width:120px">P.T TTC</th>
                        <th style="width:50px"></th>
                    </tr>
                </thead>
                <tbody id="cmd-tbody">
                    @for($i = 1; $i <= $max; $i++)
                    <tr id="cmd-row-{{ $i }}" style="display:none;">
                        <td>
                            <select id="cmd_prod_{{ $i }}" style="width:100%" onchange="cmdSelectProd({{ $i }})">
                                <option value="">— Choisir un produit —</option>
                                @foreach($products as $p)
                                    <option value="{{ $p->id }}" data-prix="{{ $p->getEffectiveUnitPrice() }}">
                                        {{ $p->designation_fr }} ({{ $p->qte }} en stock) - {{ $p->code_product }}
                                    </option>
                                @endforeach
                            </select>
                        </td>
                        <td><input type="number" class="tbl-input" id="cmd_qte_{{ $i }}" value="1" min="1" step="1" onchange="cmdCalculate()" oninput="cmdCalculate()"></td>
                        <td><input type="number" class="tbl-input" id="cmd_pu_{{ $i }}" value="0.000" min="0" step="0.001" onchange="cmdCalculate()" oninput="cmdCalculate()"></td>
                        <td><input type="number" class="tbl-input" id="cmd_pt_{{ $i }}" value="0.000" disabled></td>
                        <td style="text-align:center"><button type="button" class="btn-del-row" onclick="cmdRemoveRow({{ $i }})">✕</button></td>
                    </tr>
                    @endfor
                </tbody>
            </table>
        </div>
        <button type="button" class="btn-add-row" onclick="cmdAddRow()">+ Ajouter</button>

        <!-- Totals & Options -->
        <div class="cmd-bottom">
            <div class="cmd-totals">
                <div class="cmd-total-row">
                    <span>État de commande</span>
                    <select id="cmd_etat" class="cmd-input" style="width:180px;">
                        <option value="nouvelle_commande" {{ ($data['etat'] ?? '') == 'nouvelle_commande' ? 'selected' : '' }}>Nouvelle Commande</option>
                        <option value="en_cours_de_preparation" {{ ($data['etat'] ?? '') == 'en_cours_de_preparation' ? 'selected' : '' }}>En cours de préparation</option>
                        <option value="prete" {{ ($data['etat'] ?? '') == 'prete' ? 'selected' : '' }}>Prête</option>
                        <option value="en_cours_de_livraison" {{ ($data['etat'] ?? '') == 'en_cours_de_livraison' ? 'selected' : '' }}>En cours de livraison</option>
                        <option value="expidee" {{ ($data['etat'] ?? '') == 'expidee' ? 'selected' : '' }}>Expédiée</option>
                        <option value="annuler" {{ ($data['etat'] ?? '') == 'annuler' ? 'selected' : '' }}>Annulée</option>
                    </select>
                </div>
                <div class="cmd-total-row">
                    <span>Montant Total</span>
                    <input class="tot-input" id="cmd_total_ttc" value="0.000" disabled>
                </div>
                <div class="cmd-total-row">
                    <span>Frais de livraison</span>
                    <input class="tot-input" id="cmd_frais" value="{{ $data['frais_livraison'] ?? '0.000' }}" type="number" step="0.001" onchange="cmdCalculate()" oninput="cmdCalculate()">
                </div>
                <div class="cmd-total-row net">
                    <span>Net à payer</span>
                    <input class="tot-input" style="background:transparent;border:none;font-size:18px;color:#1e40af;" id="cmd_net" value="0.000" disabled>
                </div>
            </div>
        </div>

    </div>
    
    <div style="margin-top: 16px;">
        <button type="button" class="btn-save" onclick="cmdSave()">Enregistrer les modifications</button>
    </div>
</div>
</div>

<script>
var cmdMax = {{ $max }};

$(document).ready(function() {
    $('#cmd_client_id').select2({ placeholder: '— Choisir un client —', allowClear: true, width: '100%' });
    
    // Set pre-selected client if creating from generic / having a user_id
    let savedClient = '{{ $data["user_id"] ?? "" }}';
    if(savedClient) {
        $('#cmd_client_id').val(savedClient).trigger('change.select2');
    }

    for (let i = 1; i <= cmdMax; i++) { 
        $('#cmd_prod_' + i).select2({ placeholder: '— Choisir un produit —', allowClear: true, width: '100%' });
    }

    // Pre-fill existing rows if any
    let existingLines = @json($data['details'] ?? []);
    if(existingLines.length > 0) {
        let i = 1;
        existingLines.forEach(line => {
            if(i <= cmdMax && line.produit_id) {
                $('#cmd-row-' + i).show();
                $('#cmd_prod_' + i).val(line.produit_id).trigger('change.select2');
                $('#cmd_qte_' + i).val(line.qte || 1);
                $('#cmd_pu_' + i).val(parseFloat(line.prix_unitaire).toFixed(3));
                i++;
            }
        });
    } else {
        // Show first row by default if empty
        $('#cmd-row-1').show();
    }
    
    cmdCalculate();
});

function cmdSelectClient() {
    var sel = document.getElementById('cmd_client_id');
    if (!sel || !sel.value) return;
    var opt = sel.options[sel.selectedIndex];
    
    // Autofill Facturation
    document.getElementById('cmd_nom').value = opt.getAttribute('data-nom') || '';
    document.getElementById('cmd_email').value = opt.getAttribute('data-email') || '';
    document.getElementById('cmd_phone').value = opt.getAttribute('data-phone') || '';
    document.getElementById('cmd_region').value = opt.getAttribute('data-region') || '';
    document.getElementById('cmd_cp').value = opt.getAttribute('data-cp') || '';
    document.getElementById('cmd_adresse').value = opt.getAttribute('data-adr') || '';
    
    // Auto-copy to Livraison
    cmdCopyFactToLiv();
}

function cmdCopyFactToLiv() {
    document.getElementById('cmd_l_nom').value = document.getElementById('cmd_nom').value;
    document.getElementById('cmd_l_prenom').value = document.getElementById('cmd_prenom').value;
    document.getElementById('cmd_l_email').value = document.getElementById('cmd_email').value;
    document.getElementById('cmd_l_phone').value = document.getElementById('cmd_phone').value;
    document.getElementById('cmd_l_region').value = document.getElementById('cmd_region').value;
    document.getElementById('cmd_l_cp').value = document.getElementById('cmd_cp').value;
    document.getElementById('cmd_l_adresse').value = document.getElementById('cmd_adresse').value;
}

function cmdSelectProd(i) {
    var sel = document.getElementById('cmd_prod_' + i);
    if (!sel || !sel.value) return;
    var opt = sel.options[sel.selectedIndex];
    var prix = parseFloat(opt.getAttribute('data-prix') || 0);
    document.getElementById('cmd_pu_' + i).value = prix.toFixed(3);
    cmdCalculate();
}

function cmdAddRow() {
    for (let i = 1; i <= cmdMax; i++) {
        var r = document.getElementById('cmd-row-' + i);
        if (r.style.display === 'none') {
            r.style.display = '';
            $('#cmd_prod_' + i).val('').trigger('change.select2');
            document.getElementById('cmd_qte_' + i).value = 1;
            document.getElementById('cmd_pu_' + i).value = '0.000';
            document.getElementById('cmd_pt_' + i).value = '0.000';
            break;
        }
    }
}

function cmdRemoveRow(i) {
    document.getElementById('cmd-row-' + i).style.display = 'none';
    $('#cmd_prod_' + i).val('').trigger('change.select2');
    document.getElementById('cmd_qte_' + i).value = 1;
    document.getElementById('cmd_pu_' + i).value = '0.000';
    document.getElementById('cmd_pt_' + i).value = '0.000';
    cmdCalculate();
}

function cmdCalculate() {
    var totalTtc = 0;
    for (let i = 1; i <= cmdMax; i++) {
        var r = document.getElementById('cmd-row-' + i);
        if (!r || r.style.display === 'none') continue;
        
        var pid = $('#cmd_prod_' + i).val();
        if (!pid) continue;
        
        var qte = parseFloat(document.getElementById('cmd_qte_' + i).value) || 0;
        var pu = parseFloat(document.getElementById('cmd_pu_' + i).value) || 0;
        var pt = qte * pu;
        
        document.getElementById('cmd_pt_' + i).value = pt.toFixed(3);
        totalTtc += pt;
    }
    document.getElementById('cmd_total_ttc').value = totalTtc.toFixed(3);
    
    var frais = parseFloat(document.getElementById('cmd_frais').value) || 0;
    var net = totalTtc + frais;
    document.getElementById('cmd_net').value = net.toFixed(3);
}

function cmdSave() {
    var lines = [];
    for (let i = 1; i <= cmdMax; i++) {
        var r = document.getElementById('cmd-row-' + i);
        if (!r || r.style.display === 'none') continue;
        var pid = $('#cmd_prod_' + i).val();
        if (!pid) continue;
        
        lines.push({
            produit_id: pid,
            qte: parseFloat(document.getElementById('cmd_qte_' + i).value) || 1,
            prix_unitaire: parseFloat(document.getElementById('cmd_pu_' + i).value) || 0
        });
    }

    if (lines.length === 0) {
        Swal.fire('Erreur', 'Ajoutez au moins un produit', 'warning');
        return;
    }
    
    @this.set('data.user_id', $('#cmd_client_id').val() || null);
    @this.set('data.nom', document.getElementById('cmd_nom').value);
    @this.set('data.prenom', document.getElementById('cmd_prenom').value);
    @this.set('data.email', document.getElementById('cmd_email').value);
    @this.set('data.phone', document.getElementById('cmd_phone').value);
    @this.set('data.region', document.getElementById('cmd_region').value);
    @this.set('data.code_postale', document.getElementById('cmd_cp').value);
    @this.set('data.adresse1', document.getElementById('cmd_adresse').value);

    @this.set('data.livraison_nom', document.getElementById('cmd_l_nom').value);
    @this.set('data.livraison_prenom', document.getElementById('cmd_l_prenom').value);
    @this.set('data.livraison_email', document.getElementById('cmd_l_email').value);
    @this.set('data.livraison_phone', document.getElementById('cmd_l_phone').value);
    @this.set('data.livraison_region', document.getElementById('cmd_l_region').value);
    @this.set('data.livraison_code_postale', document.getElementById('cmd_l_cp').value);
    @this.set('data.livraison_adresse1', document.getElementById('cmd_l_adresse').value);

    @this.set('data.etat', document.getElementById('cmd_etat').value);
    @this.set('data.frais_livraison', parseFloat(document.getElementById('cmd_frais').value) || 0);
    @this.set('data.prix_ttc', parseFloat(document.getElementById('cmd_net').value) || 0);

    @this.set('data.details', lines);

    // Call native livewire save function
    setTimeout(() => {
        var topSaveBtn = document.querySelector('[wire\\:click*="saveTop"]');
        if (topSaveBtn) { 
            topSaveBtn.click(); 
        } else { 
            if ({{ $isEdit ? 'true' : 'false' }}) {
                @this.call('save');
            } else {
                @this.call('create');
            }
        }
    }, 200);
}
</script>
