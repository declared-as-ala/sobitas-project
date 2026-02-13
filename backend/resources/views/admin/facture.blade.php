@extends('layouts.admin')

@section('content')
    @php
        $coordonnee = App\Models\Coordinate::first();
        //$produits = App\Models\Product::all();

        $clients = App\Models\Client::all();
        $max = 100; // Maximum number of rows allowed
    @endphp
    <script>
        var max = 100; // Maximum number of rows allowed
        var produits = @json($produits); // Store products for dynamic row creation
    </script>


    <div class="page-content">
        <div class="analytics-container">
            <div class="Dashboard Dashboard--full">
                <form role="form" class="form-edit-add" id="myform" 
                    @if (@$edit) action="{{ route('admin.update_facture', @$facture->id) }}"  @else action="{{ route('admin.store_facture') }}" @endif
                    method="POST">
                    <!-- PUT Method if we are editing -->
                    @if (@$edit)
                        {{ method_field('PUT') }}
                    @endif
                    @csrf
                    <input type="hidden"
                        @if (@$edit) value="{{ @$edit_length }}" @else value="1" @endif id="nb_achat"
                        name="nb_achat">
                    <input type="hidden" value="0" id="nb_delete" name="nb_delete">

                    <input type="hidden" value="0" id="new_client" name="new_client">
                    <div class="panel-body">
                        @if (count($errors) > 0)
                            <div class="alert alert-danger">
                                <ul>
                                    @foreach ($errors->all() as $error)
                                        <li>{{ $error }}</li>
                                    @endforeach
                                </ul>
                            </div>
                        @endif
                        <div class="row" style="margin-left: 3px;margin-bottom: 3%;">
                            <!--Vendeur info Start-->
                            <div class="col-md-5" style="min-height: 150px;">
                                <img src="{{ asset('storage/' . $coordonnee->logo_facture) }}" alt=""
                                    style="height: 100px;">
                                <h4>{{ $coordonnee->abbreviation }}</h4>
                                <p> <span></span> {{ $coordonnee->phone_1 }} @if ($coordonnee->phone_2)
                                        <span>/ {{ $coordonnee->phone_2 }}</span>
                                    @endif
                                </p>
                                <p> <span></span> {{ $coordonnee->adresse_fr }}</p>
                            </div>
                            <!--Vendeur info End-->
                            <!--Ajouter client start -->
                            <div class="col-md-2"></div>
                            <div class="col-md-5" style="display:none; " id="ajoutPatient">
                                <div class="row">
                                    <a class="btn btn-danger" style="float: right; margin-right:16px;"
                                        onclick="annuler()">Annuler</a>
                                </div>
                                <div class="mb-3">
                                    <label for="exampleFormControlInput1" class="form-label">Nom et Prénom</label>
                                    <input type="text" class="form-control" id="name" placeholder="" name="name">
                                </div>
                                <div class="mb-3">
                                    <label for="exampleFormControlInput1" class="form-label"> Adresse</label>
                                    <input type="text" class="form-control" id="adresse" placeholder="" name="adresse">
                                </div>
                                <div class="mb-3">
                                    <label for="exampleFormControlInput1" class="form-label">Télephone</label>
                                    <input type="text" class="form-control" id="telephone" placeholder="" name="phone_1">
                                </div>
                                <div class="mb-3">
                                    <label for="exampleFormControlInput1" class="form-label">Matricule</label>
                                    <input type="text" class="form-control" id="matricule" placeholder=""
                                        name="matricule">
                                </div>
                            </div>
                            <!--ajouter client end-->
                            <!--Client info Start-->
                            <div class="col-md-5" style="min-height: 150px;" id="selectPatient">
                                @if (!@$edit)
                                    <div class="row">
                                        <a class="btn btn-primary" style="float: right; margin-right:16px;"
                                            onclick="addPatient()">Ajouter Client(e) </a>
                                    </div>
                                @endif
                                Client
                                <select name="client_id" id="select_client" class="form-control select2"
                                    onchange="selectClient()" @if (@$edit) disabled @endif>
                                    <option value="">Choisir</option>
                                    @foreach ($clients as $client)
                                        <option value="{{ $client->id }}" data-adresse="{{ $client->adresse }}"
                                            data-phone="{{ $client->phone_1 }}"
                                            @if (@$edit && @$facture->client_id == $client->id) selected @endif>
                                            {{ $client->name }} ({{ $client->phone_1 }})
                                        </option>
                                    @endforeach
                                </select>
                                <p>Adresse : <input class="form-control" id="adr" disabled
                                        @if (@$edit) value="{{ @$facture->client->adresse }}" @else value="" @endif>
                                </p>
                                <p>N°Tél : <input class="form-control" id="phone" disabled
                                        @if (@$edit) value="{{ @$facture->client->phone_1 }}" @else value="" @endif>
                                </p>
                            </div>
                            <!--Client info End-->
                        </div>
                        <!--Rows Start-->
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label for="barcode" style="font-weight: bold; margin-bottom: 5px;">
                                <i class="voyager-scan"></i> Scanner code à barre
                            </label>
                            <div style="position: relative;">
                                <input type="text" 
                                       placeholder="Scannez ou entrez le code à barre..." 
                                       id="barcode" 
                                       class="form-control" 
                                       autofocus
                                       style="font-size: 16px; padding: 12px; border: 2px solid #3498db; border-radius: 4px;"
                                       autocomplete="off">
                                <span id="barcode-status" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); display: none;">
                                    <i class="voyager-check" style="color: #27ae60;"></i>
                                </span>
                            </div>
                            <small class="text-muted" style="display: block; margin-top: 5px;">
                                Appuyez sur Entrée ou attendez après le scan
                            </small>
                        </div>
                        <!--Rows Start-->
                        <table class="table" class="row">
                            <thead>
                                <tr>
                                    <th scope="col">Produits</th>
                                    <th scope="col">Qté</th>
                                    <th scope="col">P.U</th>
                                    <th scope="col">P.T</th>
                                    {{-- <th scope="col">TVA (%)</th>
                                    <th scope="col">TVA</th> --}}
                                    <th scope="col">#</th>
                                </tr>
                            </thead>
                            <tbody id="product-rows">
                                @php
                                    $start = 1;
                                @endphp
                                @if (@$edit && @$details_facture)
                                    @foreach ($details_facture as $details)
                                        <tr id="achat{{ $start }}" data-row-index="{{ $start }}">
                                            <td style="min-width:300px">
                                                <select name="produit_id_{{ $start }}" class="form-control select2"
                                                    id="select_produit{{ $start }}"
                                                    onchange="selectProduit({{ $start }})">

                                                    @foreach ($produits as $produit)
                                                        <option value="{{ $produit->id }}"
                                                            data-prix="{{ @$produit->prix }}"
                                                            data-qte="{{ @$produit->qte + $details->qte }}"
                                                            @if ($details->produit_id == $produit->id) selected @endif>
                                                            {{ $produit->designation_fr }} (
                                                            {{ @$produit->qte + $details->qte }} )
                                                        </option>
                                                    @endforeach
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" id="qte{{ $start }}"
                                                    name="qte{{ $start }}" class="form-control" step="1"
                                                    @if (@$edit) value="{{ @$details->qte }}" @else value="1" @endif
                                                    min="1"
                                                    @if (@$edit && @$facture->remise) onkeyup="calculate('m_remise')"
                                                    onchange="calculate('m_remise')"
                                                    @else
                                                    onkeyup="calculate()"
                                                    onchange="calculate()" @endif>
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" min="0"
                                                    @if (@$edit) value="{{ @$details->prix_unitaire }}" @else value="0" @endif
                                                    name="prix_unitaire{{ $start }}" class="form-control"
                                                    id="p_unitaire{{ $start }}" onkeyup="calculate()"
                                                    onchange="calculate()">
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" min="0"
                                                    @if (@$edit) value="{{ @$details->prix_ht }}" @else value="0" @endif
                                                    name="p_t_ht{{ $start }}" class="form-control"
                                                    id="p_t_ht{{ $start }}" disabled>
                                            </td>
                                            {{--   <td>
                                                <input type="number" step="1" min="0"  @if (@$edit) value="{{ @$details->tva }}" @else value="0" @endif
                                                    name="tva{{ $start }}" class="form-control"
                                                    id="tva{{ $start }}" disabled>
                                            </td>
                                            <td>
                                                <input type="number" step="1" min="0"  @if (@$edit) value="{{ @$details->prix_ttc }}" @else value="0" @endif
                                                    name="val_tva{{ $start }}" class="form-control"
                                                    id="val_tva{{ $start }}" disabled>
                                            </td> --}}
                                            <td>
                                                <a class="btn btn-danger" onclick="remove(<?php echo $start; ?>)"> <i
                                                        class="voyager-trash"></i></a>
                                            </td>
                                        </tr>

                                        @php
                                            $start++;
                                        @endphp
                                    @endforeach
                                @else
                                    {{-- Only render 1 row initially for new invoices --}}
                                    <tr id="achat1" data-row-index="1">
                                        <td style="min-width:300px">
                                            <select name="produit_id_1" class="form-control select2"
                                                id="select_produit1"
                                                onchange="selectProduit(1)">
                                                <option value="" selected disabled> Choisir..</option>
                                                @foreach ($produits as $produit)
                                                    <option value="{{ $produit->id }}"
                                                        data-prix="{{ @$produit->prix }}"
                                                        data-qte="{{ @$produit->qte }}">
                                                        {{ $produit->designation_fr }} ( {{ @$produit->qte }} )</option>
                                                @endforeach
                                            </select>
                                        </td>
                                        <td>
                                            <input type="number" id="qte1"
                                                name="qte1" class="form-control" step="1"
                                                value="1" min="1" onkeyup="calculate()"
                                                onchange="calculate()">
                                        </td>
                                        <td>
                                            <input type="number" step="0.001" min="0" value="0"
                                                name="prix_unitaire1" class="form-control"
                                                id="p_unitaire1" onkeyup="calculate()"
                                                onchange="calculate()">
                                        </td>
                                        <td>
                                            <input type="number" step="0.001" min="0" value="0"
                                                name="p_t_ht1" class="form-control"
                                                id="p_t_ht1" disabled>
                                        </td>
                                        <td>
                                            <a class="btn btn-danger" onclick="remove(1)"> <i
                                                    class="voyager-trash"></i></a>
                                        </td>
                                    </tr>
                                @endif
                            </tbody>
                        </table>
                        <!--Rows End-->
                        <!--Add row start-->
                        <div class="row" style="margin-right: 0px;float: left;">
                            <a class="btn btn-primary" onclick="add()"> <i class="voyager-list-add"></i> Ajouter </a>
                        </div>
                        <!--Add row End-->
                        <!--Total Calcul Commande Start-->
                        <div class="row" style="margin-top: 7%;">
                            <div class="col-md-7">
                            </div>
                            <div class="col-md-5">
                                <table class="table">
                                    <tr>
                                        <td>Montant Total </td>
                                        <td style="width: 50%"><input name="prix_ht" class="form-control" disabled
                                                id="p_ht" step='0.001'
                                                @if (@$edit) value="{{ @$facture->prix_ht }}" @else value="0.000" @endif>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Montant Remise</td>
                                        <td><input name="m_remise" class="form-control" id="m_remise" step='0.001'
                                                @if (@$edit) value="{{ @$facture->remise }}" @else value="0.000" @endif
                                                onkeyup="calculate('mt_remise')" onchange="calculate('mt_remise')"></td>
                                    </tr>
                                    <tr>
                                        <td>Poucentage Remise %</td>
                                        <td><input name="pourcent_remise" class="form-control" id="pourcen_remise"
                                                @if (@$edit) value="{{ @$facture->pourcentage_remise }}" @else value="0" @endif
                                                onkeyup="calculate('pourcen_remise')"
                                                onchange="calculate('pourcen_remise')"></td>
                                    </tr>
                                    <tr id="ligne_apres_remise">
                                        <td>Net à payer </td>
                                        <td><input name="apres_remise" class="form-control" id="apres_remise"
                                                step='0.001'
                                                @if (@$edit) value="{{ @$facture->prix_ht - @$facture->remise }}" @else value="0.000" @endif
                                                disabled></td>
                                    </tr>
                                    {{--  <tr>
                                        <td>Montant Totale TVA</td>
                                        <td><input name="m_totale_tva" class="form-control" step='0.001'
                                                @if (@$edit) value="{{ @$facture->tva }}" @else value="0.000" @endif
                                                disabled id="m_tt_tva"></td>
                                    </tr> --}}
                                    {{--  <tr>
                                        <td>Net à payer </td>
                                        <td><input name="m_totale_ttc" class="form-control" step='0.001'
                                                @if (@$edit) value="{{ @$facture->prix_ttc  }}" @else value="0.000" @endif
                                                disabled id="m_tt_ttc"></td>
                                    </tr>  --}}
                                    {{--         <tr>
                                        <td>Timbre Fiscal</td>
                                        <td><input onkeyup="calculate()" onchange="calculate()" name="timbre_fiscal"
                                                class="form-control" type="number" id="m_timbre" step='0.001'
                                                @if (@$edit) value="{{ @$facture->timbre }}" @else  value="{{ $coordonnee->timbre }}" @endif>
                                        </td>
                                    </tr> --}}
                                    {{--      <tr>
                                        <td>Net à payer</td>
                                        <td><input name="net_payer" type="number" class="form-control" id="m_net"
                                                step='0.001'
                                                @if (@$edit) value="{{ @$facture->prix_ttc }}" @else value="0.000" @endif
                                                disabled></td>
                                    </tr> --}}

                                </table>
                            </div>
                        </div>
                </form>
                <div class="panel-footer">

                    <button type="submit" class="btn btn-primary save">Enregistrer</button>
                </div>
            </div>
        </div>
    </div>
@stop

@section('javascript')

    <script>
        var editt = {{ @$edit ? 1 : 0 }}
        var edit_length = {{ @$edit_length ? $edit_length : 0 }}
        var j = 1; // Current highest row index
        var nextRowId = 2; // Next available row ID for new rows
        
        // Initialize based on edit mode
        if (editt == 1) {
            j = edit_length;
            nextRowId = edit_length + 1;
            
            // Set up existing rows for editing
            for (let index = 1; index <= edit_length; index++) {
                var select = document.getElementById('select_produit' + index);
                if (select) {
                    select.required = true;
                    var option = select.options[select.selectedIndex];
                    if (option) {
                        var v_qte = option.getAttribute('data-qte');
                        var qteInput = document.getElementById('qte' + index);
                        if (qteInput && v_qte) {
                            qteInput.max = v_qte;
                        }
                    }
                }
            }
        } else {
            // For new invoice, start with 1 row
            j = 1;
            nextRowId = 2;
        }

        // Function to create a new product row dynamically
        function createProductRow(rowIndex) {
            var tbody = document.getElementById('product-rows');
            var row = document.createElement('tr');
            row.id = 'achat' + rowIndex;
            row.setAttribute('data-row-index', rowIndex);
            
            // Build products options HTML
            var productsOptions = '<option value="" selected disabled> Choisir..</option>';
            if (produits && produits.length > 0) {
                produits.forEach(function(produit) {
                    productsOptions += '<option value="' + produit.id + '" data-prix="' + (produit.prix || 0) + '" data-qte="' + (produit.qte || 0) + '">' + 
                        produit.designation_fr + ' ( ' + (produit.qte || 0) + ' )</option>';
                });
            }
            
            row.innerHTML = 
                '<td style="min-width:300px">' +
                    '<select name="produit_id_' + rowIndex + '" class="form-control select2" id="select_produit' + rowIndex + '" onchange="selectProduit(' + rowIndex + ')">' +
                        productsOptions +
                    '</select>' +
                '</td>' +
                '<td>' +
                    '<input type="number" id="qte' + rowIndex + '" name="qte' + rowIndex + '" class="form-control" step="1" value="1" min="1" onkeyup="calculate()" onchange="calculate()">' +
                '</td>' +
                '<td>' +
                    '<input type="number" step="0.001" min="0" value="0" name="prix_unitaire' + rowIndex + '" class="form-control" id="p_unitaire' + rowIndex + '" onkeyup="calculate()" onchange="calculate()">' +
                '</td>' +
                '<td>' +
                    '<input type="number" step="0.001" min="0" value="0" name="p_t_ht' + rowIndex + '" class="form-control" id="p_t_ht' + rowIndex + '" disabled>' +
                '</td>' +
                '<td>' +
                    '<a class="btn btn-danger" onclick="remove(' + rowIndex + ')"> <i class="voyager-trash"></i></a>' +
                '</td>';
            
            tbody.appendChild(row);
            
            // Initialize Select2 for the new select element
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $(row).find('.select2').select2();
            }
        }

        function add() {
            // Check if we've reached the maximum
            if (j >= max) {
                Swal.fire('Limite atteinte', 'Vous ne pouvez pas ajouter plus de ' + max + ' produits', 'warning');
                return;
            }
            
            var nb_achat = parseInt(document.getElementById('nb_achat').value);
            document.getElementById('nb_achat').value = nb_achat + 1;
            
            j = nextRowId;
            createProductRow(j);
            nextRowId = j + 1;
        }

        function remove(i) {
            var row = document.getElementById('achat' + i);
            if (!row) {
                return;
            }
            
            // Check if this is the last row and we're not in edit mode
            var totalVisibleRows = document.querySelectorAll('#product-rows tr[id^="achat"]').length;
            if (totalVisibleRows <= 1 && editt == 0) {
                Swal.fire('Attention', 'Vous devez avoir au moins un produit. Si vous souhaitez le vider, sélectionnez "Choisir.." dans la liste.', 'warning');
                return;
            }
            
            var select = document.getElementById('select_produit' + i);
            if (select) {
                select.required = false;
            }
            
            var nb_achat = parseInt(document.getElementById('nb_achat').value) || 0;
            if (nb_achat > 0) {
                document.getElementById('nb_achat').value = nb_achat - 1;
            }
            
            var nb_delete = parseInt(document.getElementById('nb_delete').value) || 0;
            document.getElementById('nb_delete').value = nb_delete + 1;
            
            // Remove the row from DOM (no need to clear values since we're removing it)
            row.remove();
            
            // Recalculate totals
            calculate();
        }


        function selectClient() {
            var select = document.getElementById('select_client')
            var option = select.options[select.selectedIndex]
            var tel = option.getAttribute('data-phone')
            var adresse = option.getAttribute('data-adresse')

            var id = select.value;
            var input_adress = document.getElementById('adr')
            input_adress.value = adresse;
            console.log(input_adress)

            var input_phone_1 = document.getElementById('phone')
            input_phone_1.value = tel;


        }

        function selectProduit(i) {
            var select = document.getElementById('select_produit' + i)
            select.required = true;
            var option = select.options[select.selectedIndex]
            var v_prix = option.getAttribute('data-prix')

            var v_qte = option.getAttribute('data-qte')

            document.getElementById('qte' + i).max = v_qte

            var id = select.value;

            var input_p_unitaire = document.getElementById('p_unitaire' + i);
            input_p_unitaire.value = v_prix;
            /*   var input_tva = document.getElementById('tva' + i);
              input_tva.value = v_tva; */

            var qte = document.getElementById('qte' + i).value;
            if (v_qte <= 0) {
                qte = 0
                document.getElementById('qte' + i).value = 0
                document.getElementById('qte' + i).min = 0
            }
            var p_t_ht = document.getElementById('p_t_ht' + i);
            var p_t_ht_valeur = v_prix * qte;
            p_t_ht.value = p_t_ht_valeur;
            console.log("v_prix : " + v_prix)
            console.log("qte : " + qte)
            /*             console.log("p_t_ht_valeur : " + p_t_ht_valeur)
             */
            calculate()
        }

        function calculate(type_remise) {
            var ligneApresRemise = document.getElementById('ligne_apres_remise');
            if (ligneApresRemise) {
                ligneApresRemise.style.display = "revert";
            }
            
            var m_totale_ht = 0;
            var totale_remise = 0;
            
            // Get all visible rows
            var rows = document.querySelectorAll('#product-rows tr[id^="achat"]');
            
            rows.forEach(function(row) {
                var rowId = row.id.replace('achat', '');
                var qteInput = document.getElementById('qte' + rowId);
                var prixInput = document.getElementById('p_unitaire' + rowId);
                var p_t_htInput = document.getElementById('p_t_ht' + rowId);
                
                if (qteInput && prixInput && p_t_htInput) {
                    var qte = parseFloat(qteInput.value) || 0;
                    var prix = parseFloat(prixInput.value) || 0;
                    var p_t_ht_valeur = prix * qte;
                    
                    p_t_htInput.value = p_t_ht_valeur.toFixed(3);
                    m_totale_ht += p_t_ht_valeur;
                }
            });
            var m_remise = document.getElementById('m_remise')
            var pourcentage_remise = document.getElementById('pourcen_remise')
            if (type_remise == 'mt_remise') {
                if (m_totale_ht != 0) {
                    pourcentage_remise.value = ((m_remise.value / m_totale_ht) * 100).toFixed(3)
                } else {
                    pourcentage_remise.value = 0
                }
            } else if (type_remise == 'pourcen_remise') {
                m_remise.value = (m_totale_ht * pourcentage_remise.value) / 100
            }
            if (type_remise) {
                totale_remise = m_remise.value
                // m_totale_tva = m_totale_tva - (m_totale_tva * pourcentage_remise.value / 100)
                document.getElementById('ligne_apres_remise').style.display = "revert"
                document.getElementById('apres_remise').value = (m_totale_ht - totale_remise).toFixed(3)
            } else {
                document.getElementById('ligne_apres_remise').style.display = "revert"
                document.getElementById('apres_remise').value = (m_totale_ht).toFixed(3)

            }
            if (totale_remise == 0) {
                //   document.getElementById('ligne_apres_remise').style.display = "none"
            }
            var m_totale_ttc = m_totale_ht - totale_remise /*  + m_totale_tva */
            // console.log('m_totale_tva : ' + m_totale_tva)
            console.log('m_totale_ht : ' + m_totale_ht)
            console.log('m_totale_ttc : ' + m_totale_ttc)

            var input_p_ht = document.getElementById('p_ht')
            input_p_ht.value = m_totale_ht.toFixed(3);


            /*   var input_totale_tva = document.getElementById('m_tt_tva')
              input_totale_tva.value = m_totale_tva.toFixed(3); */


            /*   var input_p_ttc = document.getElementById('m_tt_ttc')
                input_p_ttc.value = m_totale_ttc.toFixed(3);
     */
            /*  var input_timbre = document.getElementById('m_timbre').value */


            /*    var input_net = document.getElementById('m_net') */
            /*    if (input_timbre) {
                   input_net.value = (parseFloat(m_totale_ttc) + parseFloat(input_timbre)).toFixed(3);

               } else {
                   input_net.value = m_totale_ttc.toFixed(3)

               } */
        }

        function addPatient() {
            document.getElementById('new_client').value = 1;
            document.getElementById('ajoutPatient').style.display = "revert";
            document.getElementById('selectPatient').style.display = "none";
            document.getElementById('name').required = true;
            document.getElementById('adresse').required = true;
            document.getElementById('telephone').required = true;
            document.getElementById('select_patient').required = false;


        }

        function annuler() {
            document.getElementById('new_client').value = 0;
            document.getElementById('ajoutPatient').style.display = "none";
            document.getElementById('selectPatient').style.display = "revert";
            document.getElementById('name').value = null;
            document.getElementById('adresse').value = null;
            document.getElementById('telephone').value = null;
            document.getElementById('matricule').value = null;

            document.getElementById('name').required = false;
            document.getElementById('adresse').required = false;
            document.getElementById('telephone').required = false;
            document.getElementById('matricule').required = false;
            document.getElementById('select_patient').required = true;

        }


        // Debounce timer for barcode scanner
        var barcodeTimeout = null;
        var lastBarcodeValue = '';

        function scanner(produits) {
            var barcode_input = document.getElementById('barcode');
            var statusIcon = document.getElementById('barcode-status');

            // Normalize barcode: trim whitespace, remove line breaks and carriage returns
            var barcode = barcode_input.value
                .replace(/\r\n/g, '')
                .replace(/\n/g, '')
                .replace(/\r/g, '')
                .trim();

            // Only process if barcode has minimum length (typically barcodes are at least 3-4 characters)
            // and if the value has changed (to avoid processing the same barcode twice)
            if (barcode && barcode.length >= 3 && barcode !== lastBarcodeValue && produits && produits.length > 0) {
                lastBarcodeValue = barcode; // Store to prevent duplicate processing
                
                // Show processing state
                if (statusIcon) {
                    statusIcon.innerHTML = '<i class="voyager-refresh" style="color: #3498db; animation: spin 1s linear infinite;"></i>';
                    statusIcon.style.display = 'block';
                }
                
                // Try exact match first, then with leading zero variations
                var search = produits.find((prod) => {
                    var prodCode = String(prod.code_product || '').trim();
                    var normalizedBarcode = barcode;
                    // Try multiple matching strategies
                    return prodCode === normalizedBarcode || 
                           prodCode === '0' + normalizedBarcode || 
                           '0' + prodCode === normalizedBarcode ||
                           prodCode === normalizedBarcode.replace(/^0+/, '') ||
                           prodCode.replace(/^0+/, '') === normalizedBarcode;
                });

                if (search) {
                    // Check if product is already in the list - if so, increment quantity instead
                    var rows = document.querySelectorAll('#product-rows tr[id^="achat"]');
                    var existingRowId = null;
                    
                    for (var idx = 0; idx < rows.length; idx++) {
                        var rowId = rows[idx].id.replace('achat', '');
                        var select = document.getElementById('select_produit' + rowId);
                        if (select && select.value == search.id) {
                            existingRowId = rowId;
                            break;
                        }
                    }
                    
                    var targetRowId = null;
                    
                    if (existingRowId) {
                        // Product already exists - increment quantity
                        var qteInput = document.getElementById('qte' + existingRowId);
                        var currentQte = parseInt(qteInput.value) || 0;
                        var maxQte = parseInt(qteInput.max) || 999999;
                        
                        if (currentQte < maxQte) {
                            qteInput.value = currentQte + 1;
                            targetRowId = existingRowId;
                            
                            // Highlight the row briefly
                            var row = document.getElementById('achat' + existingRowId);
                            if (row) {
                                row.style.backgroundColor = '#d4edda';
                                setTimeout(function() {
                                    row.style.backgroundColor = '';
                                }, 1000);
                            }
                            
                            // Show success message
                            if (statusIcon) {
                                statusIcon.innerHTML = '<i class="voyager-check" style="color: #27ae60;"></i>';
                                setTimeout(function() {
                                    statusIcon.style.display = 'none';
                                }, 2000);
                            }
                            
                            // Scroll to the row
                            if (row) {
                                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                            
                            // Trigger calculation
                            calculate();
                        } else {
                            Swal.fire('Stock insuffisant', 'La quantité disponible est de ' + maxQte, 'warning');
                            if (statusIcon) {
                                statusIcon.style.display = 'none';
                            }
                        }
                    } else {
                        // Product not in list - add it
                        var foundEmptyRow = false;
                        
                        // Check if there's an empty row we can use
                        for (var idx = 0; idx < rows.length; idx++) {
                            var rowId = rows[idx].id.replace('achat', '');
                            var select = document.getElementById('select_produit' + rowId);
                            if (select && (!select.value || select.value === '')) {
                                targetRowId = rowId;
                                foundEmptyRow = true;
                                break;
                            }
                        }
                        
                        // If no empty row found, add a new one
                        if (!foundEmptyRow) {
                            add();
                            // Get the newly added row
                            rows = document.querySelectorAll('#product-rows tr[id^="achat"]');
                            if (rows.length > 0) {
                                var lastRow = rows[rows.length - 1];
                                targetRowId = lastRow.id.replace('achat', '');
                            }
                        }
                        
                        if (targetRowId) {
                            var psid = '#select_produit' + targetRowId;
                            var select_product = document.getElementById('select_produit' + targetRowId);
                            
                            if (select_product && typeof $ !== 'undefined' && $.fn.select2) {
                                $(psid).val(search.id + '').trigger('change');
                            } else if (select_product) {
                                select_product.value = search.id;
                                selectProduit(targetRowId);
                            }
                            
                            // Highlight the newly added row
                            var row = document.getElementById('achat' + targetRowId);
                            if (row) {
                                row.style.backgroundColor = '#d4edda';
                                setTimeout(function() {
                                    row.style.backgroundColor = '';
                                }, 1000);
                                
                                // Scroll to the row
                                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                            
                            // Show success
                            if (statusIcon) {
                                statusIcon.innerHTML = '<i class="voyager-check" style="color: #27ae60;"></i>';
                                setTimeout(function() {
                                    statusIcon.style.display = 'none';
                                }, 2000);
                            }
                        }
                    }

                    barcode_input.value = '';
                    lastBarcodeValue = ''; // Reset to allow rescanning
                    barcode_input.focus();
                    
                } else {
                    // Product not found
                    Swal.fire({
                        title: 'Produit non trouvé',
                        text: 'Le code à barre "' + barcode + '" n\'existe pas dans la base de données',
                        icon: 'info',
                        confirmButtonText: 'OK'
                    });
                    
                    if (statusIcon) {
                        statusIcon.innerHTML = '<i class="voyager-x" style="color: #e74c3c;"></i>';
                        setTimeout(function() {
                            statusIcon.style.display = 'none';
                        }, 2000);
                    }
                    
                    barcode_input.value = '';
                    lastBarcodeValue = ''; // Reset to allow rescanning
                    barcode_input.focus();
                }
            } else if(barcode && barcode.length < 3){
                // Barcode too short, wait for more input
                // Don't show error for short codes as user might still be typing
            } else if(!produits || produits.length === 0){
                Swal.fire('Erreur', 'La liste des produits est vide. Veuillez recharger la page.', 'error');
                if (statusIcon) {
                    statusIcon.style.display = 'none';
                }
            }
        }

        // Setup barcode input with debounced scanner
        document.addEventListener('DOMContentLoaded', function() {
            var barcode_input = document.getElementById('barcode');
            if(barcode_input) {
                // Keep focus on barcode input for better UX
                barcode_input.addEventListener('blur', function() {
                    // Refocus after a short delay to allow for clicks on other elements
                    setTimeout(function() {
                        if (document.activeElement !== barcode_input && 
                            document.activeElement.tagName !== 'BUTTON' &&
                            document.activeElement.tagName !== 'A') {
                            barcode_input.focus();
                        }
                    }, 100);
                });
                
                barcode_input.addEventListener('input', function(e) {
                    // Clear previous timeout
                    if(barcodeTimeout) {
                        clearTimeout(barcodeTimeout);
                    }
                    
                    // Wait 200ms after last input (barcode scanners send data very quickly)
                    // Increased to 200ms for better reliability with different scanners
                    barcodeTimeout = setTimeout(function() {
                        scanner(produits);
                    }, 200);
                });
                
                // Also handle Enter key for manual entry
                barcode_input.addEventListener('keypress', function(e) {
                    if(e.key === 'Enter') {
                        e.preventDefault();
                        if(barcodeTimeout) {
                            clearTimeout(barcodeTimeout);
                        }
                        scanner(produits);
                    }
                });
                
                // Prevent form submission on Enter in barcode field
                barcode_input.addEventListener('keydown', function(e) {
                    if(e.key === 'Enter') {
                        e.preventDefault();
                    }
                });
            }
        });
        
        // Add CSS for spinner animation
        if (!document.getElementById('barcode-scanner-styles')) {
            var style = document.createElement('style');
            style.id = 'barcode-scanner-styles';
            style.textContent = `
                @keyframes spin {
                    from { transform: translateY(-50%) rotate(0deg); }
                    to { transform: translateY(-50%) rotate(360deg); }
                }
                #barcode:focus {
                    border-color: #2980b9 !important;
                    box-shadow: 0 0 5px rgba(52, 152, 219, 0.3);
                }
            `;
            document.head.appendChild(style);
        }


        const form = document.getElementById('myform')
        form.addEventListener('keypress', function(e) {
            if (e.keyCode == 13) {
                e.preventDefault()
            }
        })
    </script>

@stop
