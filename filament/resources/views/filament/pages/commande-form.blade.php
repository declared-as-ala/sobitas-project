@php
    $coordinate = \App\Models\Coordinate::getCached();
    $data   = $this->form->getRawState();

    $record = $this->record;
    $isEdit = $record !== null;

    // Load details directly from the Eloquent relationship in edit mode.
    // Reading from getRawState()['details'] is unreliable: Livewire serialises
    // nested arrays in Hidden fields to JSON and may return null/empty on the
    // first render before JS hydration completes.
    if ($isEdit && $record) {
        $record->loadMissing('details');
        $detailsRows = $record->details->map(fn ($d) => [
            'produit_id'    => $d->produit_id,
            'qte'           => $d->qte,
            'prix_unitaire' => $d->prix_unitaire,
        ])->toArray();
    } else {
        $detailsRows = [];
    }

    $selProductIds = collect($detailsRows)->pluck('produit_id')->filter()->toArray();
    $selProducts = [];
    if (!empty($selProductIds)) {
        $selProducts = \App\Models\Product::whereIn('id', $selProductIds)->get(['id','designation_fr','code_product','qte'])->keyBy('id');
    }

    // Resolve client for display (user_id holds the client FK on commandes)
    $selClientId = $record?->user_id ?? $data['user_id'] ?? null;
    $selClient = $selClientId ? \App\Models\Client::find($selClientId) : null;
    $max = 100;

    $logoPath = public_path('logo.png');
    $logoSrc  = is_file($logoPath)
        ? 'data:' . (mime_content_type($logoPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($logoPath))
        : null;
@endphp

<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet"/>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<script>var max = {{ $max }};</script>

<style>
/* ── Force FULL WIDTH on Commande Pages ─────────── */
body:has(.commande-edit-page) .fi-main-ctn,
body:has(.commande-edit-page) .fi-page,
body:has(.commande-edit-page) form,
body:has(.commande-edit-page) .fi-fo-component-ctn,
body:has(.commande-edit-page) .fi-fo-view,
body:has(.commande-edit-page) .fi-fo-view > div {
    max-width: 100% !important;
    width: 100% !important;
    padding-left: 12px !important;
    padding-right: 12px !important;
}
body:has(.commande-edit-page) .fi-form-actions { display: none !important; }

/* Bootstrap-like styles matching backend */
.page-content { padding: 20px; }
.analytics-container .Dashboard { background: #fff; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.1); padding: 20px; }
.panel-footer { padding: 16px 0 0; border-top: 1px solid #ddd; margin-top: 20px; }
.panel-body { padding: 0; }

.form-control {
    display: block;
    width: 100%;
    padding: 6px 12px;
    font-size: 14px;
    line-height: 1.42857143;
    color: #555;
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
    margin-bottom: 4px;
}
.form-control:focus { border-color: #66afe9; outline: 0; }
.form-control:disabled { background-color: #eee; }
.form-control.select2 { display: none; }

.btn { display: inline-block; padding: 6px 12px; font-size: 14px; font-weight: 400; line-height: 1.42857143; text-align: center; cursor: pointer; border: 1px solid transparent; border-radius: 4px; text-decoration: none; }
.btn-primary { color: #fff; background-color: #337ab7; border-color: #2e6da4; }
.btn-primary:hover { background-color: #286090; }
.btn-danger  { color: #fff; background-color: #d9534f; border-color: #d43f3a; }
.btn-danger:hover  { background-color: #c9302c; }

.table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
.table th, .table td { padding: 8px; border: 1px solid #ddd; vertical-align: middle; }
.table thead th { background: #f5f5f5; font-weight: 600; }

.row { display: flex; flex-wrap: wrap; margin-left: -15px; margin-right: -15px; }
.col-md-2 { flex: 0 0 16.666%; max-width: 16.666%; padding: 0 15px; }
.col-md-5 { flex: 0 0 41.666%; max-width: 41.666%; padding: 0 15px; }
.col-md-6 { flex: 0 0 50%; max-width: 50%; padding: 0 15px; }
.col-md-7 { flex: 0 0 58.333%; max-width: 58.333%; padding: 0 15px; }
.col-md-12 { flex: 0 0 100%; max-width: 100%; padding: 0 15px; }

.text-gray-light { color: #777; font-size: 14px; }
.mb-3 { margin-bottom: 12px; }
.form-label { font-weight: 600; font-size: 13px; display: block; margin-bottom: 4px; }
.alert-danger { background: #f2dede; border: 1px solid #ebccd1; color: #a94442; padding: 12px; border-radius: 4px; margin-bottom: 16px; }
.select2-container { width: 100% !important; }
.select2-selection--single { border: 1px solid #ccc !important; border-radius: 4px !important; height: 34px !important; }
.select2-selection__rendered { line-height: 32px !important; }
</style>

<div class="commande-edit-page">
<div class="page-content">
    <div class="analytics-container">
        <div class="Dashboard Dashboard--full">

            <div class="panel-body">

                {{-- Company + Client header row --}}
                <div class="row" style="margin-bottom: 3%;">
                    {{-- Company info --}}
                    <div class="col-md-5" style="min-height:150px;">
                        @if($logoSrc)
                            <img src="{{ $logoSrc }}" alt="Logo" style="height:100px;">
                        @endif
                        @if($coordinate)
                            <h4>{{ $coordinate->abbreviation ?? $coordinate->name_fr ?? 'STE' }}</h4>
                            <p>{{ $coordinate->phone_1 }}
                                @if($coordinate->phone_2) / {{ $coordinate->phone_2 }} @endif
                            </p>
                            <p>{{ $coordinate->adresse_fr ?? $coordinate->adresse ?? '' }}</p>
                        @endif
                    </div>

                    <div class="col-md-2"></div>

                    {{-- Ajouter client inline form (hidden by default) --}}
                    <div class="col-md-5" style="display:none;" id="ajoutPatient">
                        <div class="row" style="justify-content:flex-end; margin-bottom:8px;">
                            <a class="btn btn-danger" onclick="annuler()">Annuler</a>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nom et Prénom</label>
                            <input type="text" class="form-control" id="new_name" placeholder="">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Adresse</label>
                            <input type="text" class="form-control" id="new_adresse" placeholder="">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Téléphone</label>
                            <input type="text" class="form-control" id="new_telephone" placeholder="">
                        </div>
                    </div>

                    {{-- Client select --}}
                    <div class="col-md-5" style="min-height:150px;" id="selectPatient">
                        <div class="row" style="justify-content:flex-end; margin-bottom:8px;">
                            <a class="btn btn-primary" onclick="addPatient()">Ajouter Client(e)</a>
                        </div>
                        Client
                        <select id="select_client" class="form-control select2" onchange="selectClient()">
                            <option value="">Choisir</option>
                            @if($selClient)
                                <option value="{{ $selClient->id }}" selected
                                    data-adresse="{{ $selClient->adresse }}"
                                    data-phone="{{ $selClient->phone_1 }}"
                                    data-email="{{ $selClient->email }}"
                                    data-ville="{{ $selClient->ville }}"
                                    data-cp="{{ $selClient->code_postale }}">
                                    {{ $selClient->name }} ({{ $selClient->phone_1 }})
                                </option>
                            @endif
                        </select>
                        <p>Adresse : <input class="form-control" id="adr" disabled value="{{ $data['adresse1'] ?? '' }}"></p>
                        <p>N°Tél : <input class="form-control" id="phone_disp" disabled value="{{ $data['phone'] ?? '' }}"></p>
                    </div>
                </div>

                {{-- Hidden billing fields (kept for save logic / client auto-fill) --}}
                <div style="display:none">
                    <input id="cmd_nom"     value="{{ $data['nom']    ?? '' }}">
                    <input id="cmd_prenom"  value="{{ $data['prenom'] ?? '' }}">
                    <input id="cmd_email"   value="{{ $data['email']  ?? '' }}">
                    <input id="cmd_phone"   value="{{ $data['phone']  ?? '' }}">
                    <input id="cmd_adresse" value="{{ $data['adresse1'] ?? '' }}">
                    <input id="cmd_ville"   value="{{ $data['ville']  ?? '' }}">
                    <input id="cmd_region"  value="{{ $data['region'] ?? '' }}">
                    <input id="cmd_cp"      value="{{ $data['code_postale'] ?? '' }}">
                </div>

                {{-- Delivery info --}}
                <div class="row">
                    <div class="col-md-12">
                        <h5 class="text-gray-light">INFORMATIONS DE LIVRAISON</h5>
                        <hr style="margin:9px">
                        <div class="row">
                            <div class="col-md-6">
                                <b class="to"><b>Nom et prénom:</b>
                                    <input class="form-control" id="cmd_l_nom"    value="{{ $data['livraison_nom']    ?? '' }}" placeholder="Nom">
                                    <input class="form-control" id="cmd_l_prenom" value="{{ $data['livraison_prenom'] ?? '' }}" placeholder="Prénom">
                                </b>
                                <div><b>Email:</b> <input class="form-control" id="cmd_l_email" type="email" value="{{ $data['livraison_email'] ?? '' }}" placeholder="Email"></div>
                                <div><b>Téléphone:</b> <input class="form-control" id="cmd_l_phone" value="{{ $data['livraison_phone'] ?? '' }}" placeholder="Téléphone"></div>
                            </div>
                            <div class="col-md-6">
                                <div><b>Adresse:</b> <input class="form-control" id="cmd_l_adresse" value="{{ $data['livraison_adresse1'] ?? '' }}" placeholder="Adresse"></div>
                                <div><b>Ville:</b> <input class="form-control" id="cmd_l_ville" value="{{ $data['livraison_ville'] ?? '' }}" placeholder="Ville"></div>
                                <div><b>Région (Gouvernorat):</b> <input class="form-control" id="cmd_l_region" value="{{ $data['livraison_region'] ?? '' }}" placeholder="Région"></div>
                                <div><b>Code Postal:</b> <input class="form-control" id="cmd_l_cp" value="{{ $data['livraison_code_postale'] ?? '' }}" placeholder="Code Postal"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {{-- Products table --}}
                <table class="table" style="margin-top:24px;">
                    <thead>
                        <tr>
                            <th scope="col">Produits</th>
                            <th scope="col">Qté</th>
                            <th scope="col">P.U</th>
                            <th scope="col">P.T</th>
                            <th scope="col">#</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for($i = 1; $i <= $max; $i++)
                        <tr id="achat{{ $i }}" style="display:none;">
                            <td style="min-width:300px;">
                                <select name="produit_id_{{ $i }}" class="form-control select2" id="select_produit{{ $i }}" onchange="selectProduit({{ $i }})">
                                    <option value="" selected disabled>Choisir..</option>
                                </select>
                            </td>
                            <td><input type="number" id="qte{{ $i }}" class="form-control" step="1" value="1" min="1" onkeyup="calculate()" onchange="calculate()"></td>
                            <td><input type="number" step="0.001" min="0" value="0" id="p_unitaire{{ $i }}" class="form-control" onkeyup="calculate()" onchange="calculate()"></td>
                            <td><input type="number" step="0.001" min="0" value="0" id="p_t_ht{{ $i }}" class="form-control" disabled></td>
                            <td><a class="btn btn-danger" onclick="removeRow({{ $i }})">✕</a></td>
                        </tr>
                        @endfor
                    </tbody>
                </table>

                {{-- Add row button --}}
                <div class="row" style="margin-bottom:16px;">
                    <a class="btn btn-primary" onclick="addRow()">+ Ajouter</a>
                </div>

                {{-- Totals --}}
                <div class="row" style="margin-top:5%;">
                    <div class="col-md-7"></div>
                    <div class="col-md-5">
                        <table class="table">
                            <tr>
                                <td>Montant Total</td>
                                <td style="width:50%"><input class="form-control" disabled id="p_ht" step="0.001" value="{{ $data['prix_ht'] ?? '0.000' }}"></td>
                            </tr>
                            <tr>
                                <td>Frais de livraison</td>
                                <td><input class="form-control" id="frais_livraison" step="0.001" value="{{ $data['frais_livraison'] ?? '0.000' }}" onkeyup="calculate()" onchange="calculate()"></td>
                            </tr>
                            <tr id="ligne_apres_remise">
                                <td>Net à payer</td>
                                <td><input class="form-control" id="apres_remise" step="0.001" value="{{ ($data['prix_ttc'] ?? 0) ?: '0.000' }}" disabled></td>
                            </tr>
                        </table>
                        <div class="col-md-12">
                            <label class="form-label">Etat de commande</label>
                            <select class="form-control" id="cmd_etat">
                                <option value="nouvelle_commande"      {{ ($data['etat'] ?? '') == 'nouvelle_commande'      ? 'selected' : '' }}>Nouvelle Commande</option>
                                <option value="en_cours_de_preparation"{{ ($data['etat'] ?? '') == 'en_cours_de_preparation'? 'selected' : '' }}>En cours de préparations</option>
                                <option value="prete"                  {{ ($data['etat'] ?? '') == 'prete'                  ? 'selected' : '' }}>Prête</option>
                                <option value="en_cours_de_livraison"  {{ ($data['etat'] ?? '') == 'en_cours_de_livraison'  ? 'selected' : '' }}>En cours de livraison</option>
                                <option value="expidee"                {{ ($data['etat'] ?? '') == 'expidee'                ? 'selected' : '' }}>Expidée</option>
                                <option value="annuler"                {{ ($data['etat'] ?? '') == 'annuler'                ? 'selected' : '' }}>Annuler</option>
                            </select>
                            <div style="margin-top:10px;">
                                <input type="checkbox" id="cmd_notifier_client" {{ ($data['notifier_client'] ?? false) ? 'checked' : '' }}>
                                <label for="cmd_notifier_client" style="cursor:pointer; margin-left:6px;">Notifier le client par l'état de commande</label>
                            </div>
                        </div>
                    </div>
                </div>

            </div>{{-- /panel-body --}}

            <div class="panel-footer">
                <button type="button" class="btn btn-primary" onclick="cmdSave()">Enregistrer</button>
            </div>

        </div>{{-- /Dashboard --}}
    </div>{{-- /analytics-container --}}
</div>{{-- /page-content --}}
</div>{{-- /commande-edit-page --}}

<script>
var editt = {{ $isEdit ? 1 : 0 }};
var j = 0;
var cmdMax = {{ $max }};

$(document).ready(function() {
    // Init select2 for client
    $('#select_client').select2({ 
        placeholder: 'Choisir', 
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

    // Init select2 for all product rows dynamically
    // for (let i = 1; i <= cmdMax; i++) {
    //     $('#select_produit' + i).select2({ 
    //         placeholder: 'Choisir..', 
    //         allowClear: true, 
    //         width: '100%',
    //         ajax: {
    //             url: '/api/pos-products',
    //             dataType: 'json',
    //             delay: 250,
    //             data: function (params) { return { q: params.term || '' }; },
    //             cache: true
    //         }
    //     });
    // }

    var selProducts = @json($selProducts);
    var existingLines = @json($detailsRows);
    if (existingLines.length > 0) {
        existingLines.forEach(function(line) {
            if (line.produit_id && j < cmdMax) {
                j++;
                document.getElementById('achat' + j).style.display = '';
                cmdInitSelect2(j);
                var pInfo = selProducts[line.produit_id];
                if (pInfo) {
                    var newOption = new Option(pInfo.designation_fr + ' (' + (pInfo.qte||0) + ') — ' + pInfo.code_product, line.produit_id, true, true);
                    $('#select_produit' + j).append(newOption).trigger('change.select2');
                } else {
                    $('#select_produit' + j).val(line.produit_id).trigger('change.select2');
                }
                document.getElementById('qte' + j).value = line.qte || 1;
                document.getElementById('p_unitaire' + j).value = parseFloat(line.prix_unitaire || 0).toFixed(3);
            }
        });
    } else {
        // Show one empty row by default
        j = 1;
        document.getElementById('achat1').style.display = '';
        cmdInitSelect2(1);
    }
    calculate();
});

function cmdInitSelect2(i) {
    var $el = $('#select_produit' + i);
    if ($el.hasClass('select2-hidden-accessible')) return; // Already initialized
    $el.select2({ 
        placeholder: 'Choisir..', 
        allowClear: true, 
        width: '100%',
        ajax: {
            url: '/api/pos-products',
            dataType: 'json',
            delay: 250,
            data: function (params) { return { q: params.term || '' }; },
            cache: true
        }
    });
}

function addPatient() {
    document.getElementById('ajoutPatient').style.display = 'revert';
    document.getElementById('selectPatient').style.display = 'none';
}

function annuler() {
    document.getElementById('ajoutPatient').style.display = 'none';
    document.getElementById('selectPatient').style.display = 'revert';
    document.getElementById('new_name').value = '';
    document.getElementById('new_adresse').value = '';
    document.getElementById('new_telephone').value = '';
}

function selectClient() {
    var sel = $('#select_client').select2('data')[0];
    if (!sel || !sel.id) return;
    
    var adresse = sel.adresse || '';
    var tel     = sel.phone_1 || '';
    var email   = sel.email || '';
    var ville   = sel.ville || '';
    var cp      = sel.code_postale || '';
    var nom     = sel.text ? sel.text.split('(')[0].trim() : '';

    document.getElementById('adr').value      = adresse;
    document.getElementById('phone_disp').value= tel;

    // Fill facturation
    document.getElementById('cmd_nom').value    = nom;
    document.getElementById('cmd_email').value  = email;
    document.getElementById('cmd_phone').value  = tel;
    document.getElementById('cmd_adresse').value= adresse;
    document.getElementById('cmd_ville').value  = ville;
    document.getElementById('cmd_region').value = cp ? '' : ''; // Assume region isn't readily available in client, leave as user input or map appropriately if needed
    document.getElementById('cmd_cp').value     = cp;

    // Auto-copy to livraison
    cmdCopyFactToLiv();
}

function cmdCopyFactToLiv() {
    document.getElementById('cmd_l_nom').value    = document.getElementById('cmd_nom').value;
    document.getElementById('cmd_l_prenom').value = document.getElementById('cmd_prenom').value;
    document.getElementById('cmd_l_email').value  = document.getElementById('cmd_email').value;
    document.getElementById('cmd_l_phone').value  = document.getElementById('cmd_phone').value;
    document.getElementById('cmd_l_adresse').value= document.getElementById('cmd_adresse').value;
    document.getElementById('cmd_l_ville').value  = document.getElementById('cmd_ville').value;
    document.getElementById('cmd_l_region').value = document.getElementById('cmd_region').value;
    document.getElementById('cmd_l_cp').value     = document.getElementById('cmd_cp').value;
}

function selectProduit(i) {
    var sel = $('#select_produit' + i).select2('data')[0];
    if (!sel || !sel.id) return;
    var prix   = parseFloat(sel.prix || 0);
    var qte    = parseFloat(document.getElementById('qte' + i).value) || 1;
    document.getElementById('p_unitaire' + i).value = prix.toFixed(3);
    document.getElementById('p_t_ht' + i).value = (prix * qte).toFixed(3);
    calculate();
}

function addRow() {
    if (j < cmdMax) {
        j++;
        document.getElementById('achat' + j).style.display = '';
        cmdInitSelect2(j);
        $('#select_produit' + j).val('').trigger('change.select2');
        document.getElementById('qte' + j).value = 1;
        document.getElementById('p_unitaire' + j).value = '0.000';
        document.getElementById('p_t_ht' + j).value = '0.000';
    }
}

function removeRow(i) {
    var el = document.getElementById('achat' + i);
    el.style.display = 'none';
    $('#select_produit' + i).val('').trigger('change.select2');
    document.getElementById('qte' + i).value = 1;
    document.getElementById('p_unitaire' + i).value = '0.000';
    document.getElementById('p_t_ht' + i).value = '0.000';
    calculate();
}

function calculate() {
    var m_totale_ht = 0;
    for (let i = 1; i <= j; i++) {
        var el = document.getElementById('achat' + i);
        if (!el || el.style.display === 'none') continue;
        var pid = $('#select_produit' + i).val();
        if (!pid) continue;
        var qte  = parseFloat(document.getElementById('qte' + i).value) || 0;
        var prix = parseFloat(document.getElementById('p_unitaire' + i).value) || 0;
        var pt   = qte * prix;
        document.getElementById('p_t_ht' + i).value = pt.toFixed(3);
        m_totale_ht += pt;
    }
    var frais = parseFloat(document.getElementById('frais_livraison').value) || 0;
    document.getElementById('p_ht').value        = m_totale_ht.toFixed(3);
    document.getElementById('apres_remise').value = (m_totale_ht + frais).toFixed(3);
}

function cmdSave() {
    var lines = [];
    for (let i = 1; i <= j; i++) {
        var el = document.getElementById('achat' + i);
        if (!el || el.style.display === 'none') continue;
        var pid = $('#select_produit' + i).val();
        if (!pid) continue;
        lines.push({
            produit_id:    pid,
            qte:           parseFloat(document.getElementById('qte' + i).value) || 1,
            prix_unitaire: parseFloat(document.getElementById('p_unitaire' + i).value) || 0
        });
    }

    if (lines.length === 0) {
        Swal.fire('Erreur', 'Ajoutez au moins un produit', 'warning');
        return;
    }

    @this.set('data.user_id', $('#select_client').val() || null);
    @this.set('data.nom',    document.getElementById('cmd_nom').value);
    @this.set('data.prenom', document.getElementById('cmd_prenom').value);
    @this.set('data.email',  document.getElementById('cmd_email').value);
    @this.set('data.phone',  document.getElementById('cmd_phone').value);
    @this.set('data.ville',  document.getElementById('cmd_ville').value);
    @this.set('data.region', document.getElementById('cmd_region').value);
    @this.set('data.code_postale', document.getElementById('cmd_cp').value);
    @this.set('data.adresse1',     document.getElementById('cmd_adresse').value);

    @this.set('data.livraison_nom',         document.getElementById('cmd_l_nom').value);
    @this.set('data.livraison_prenom',      document.getElementById('cmd_l_prenom').value);
    @this.set('data.livraison_email',       document.getElementById('cmd_l_email').value);
    @this.set('data.livraison_phone',       document.getElementById('cmd_l_phone').value);
    @this.set('data.livraison_adresse1',    document.getElementById('cmd_l_adresse').value);
    @this.set('data.livraison_ville',       document.getElementById('cmd_l_ville').value);
    @this.set('data.livraison_region',      document.getElementById('cmd_l_region').value);
    @this.set('data.livraison_code_postale',document.getElementById('cmd_l_cp').value);

    @this.set('data.etat',            document.getElementById('cmd_etat').value);
    @this.set('data.notifier_client', document.getElementById('cmd_notifier_client').checked);
    @this.set('data.frais_livraison', parseFloat(document.getElementById('frais_livraison').value) || 0);
    @this.set('data.prix_ttc',        parseFloat(document.getElementById('apres_remise').value) || 0);
    @this.set('data.details', lines);

    setTimeout(() => {
        // Try clicking the native Filament save action
        var btn = document.querySelector('[wire\\:click*="saveTop"]') || document.querySelector('[wire\\:click*="save"]');
        if (btn) {
            btn.click();
        } else {
            @this.call(editt ? 'save' : 'create');
        }
    }, 200);
}
</script>
