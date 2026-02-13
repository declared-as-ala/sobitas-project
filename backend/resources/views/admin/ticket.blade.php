@extends('layouts.admin')

@section('content')
    @php
        $coordonnee = App\Models\Coordinate::first();
        //$produits = App\Models\Product::all();

        $clients = App\Models\Client::all();
        $max = 100;
    @endphp
    <script>
        var max = 100;
    </script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>


    <div class="page-content">
        <div class="analytics-container">
            <div class="Dashboard Dashboard--full">
                <form role="form" id="myform" class="form-edit-add" @if(@$edit) action="{{ route('admin.update_ticket' , @$ticket->id) }}"  @else action="{{ route('admin.store_ticket') }}" @endif method="POST">
                    <!-- PUT Method if we are editing -->
                    @if (@$edit)
                        {{ method_field('PUT') }}
                    @endif
                    @csrf
                    <input type="hidden" @if(@$edit) value="{{ @$edit_length }}" @else value="1" @endif id="nb_achat" name="nb_achat">
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
                                            onclick="addPatient()">Ajouter Client(e)</a>
                                    </div>
                                @endif
                                Client
                                <select name="client_id" id="select_client" class="form-control select2"
                                    onchange="selectClient()" @if (@$edit) disabled @endif>
                                    <option value="">Choisir</option>
                                    @foreach ($clients as $client)
                                        <option value="{{ $client->id }}" data-adresse="{{ $client->adresse }}"
                                            data-phone="{{ $client->phone_1 }}"
                                            @if (@$edit && @$ticket->client_id == $client->id) selected @endif>
                                            {{ $client->name }} ({{ $client->phone_1 }})
                                        </option>
                                    @endforeach
                                </select>
                                <p>Adresse : <input class="form-control" id="adr" disabled
                                        @if (@$edit) value="{{ @$ticket->client->adresse }}" @else value="" @endif>
                                </p>
                                <p>N°Tél : <input class="form-control" id="phone" disabled
                                        @if (@$edit) value="{{ @$ticket->client->phone_1 }}" @else value="" @endif>
                                </p>
                            </div>
                            <!--Client info End-->
                        </div>
                        <!--Rows Start-->
                        <label>Scanner code à barre </label>
                        <input type="text" placeholder="barcode" id="barcode"  class="form-control" autofocus>
                        <br>
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
                            <tbody>
                                @php
                                    $start = 1;
                                @endphp
                                @if (@$edit && @$details_ticket)


                                    @foreach ($details_ticket as $details)

                                        <tr id="achat{{ $start }}">
                                            <td style="min-width:300px">
                                                <select name="produit_id_{{ $start }}" class="form-control select2"
                                                    id="select_produit{{ $start }}"
                                                    onchange="selectProduit({{ $start }})">

                                                    @foreach ($produits as $produit)
                                                        <option value="{{ $produit->id }}"
                                                            data-prix="{{ @$produit->prix }}"
                                                            data-qte="{{ @$produit->qte + $details->qte }}"

                                                            @if ($details->produit_id == $produit->id) selected @endif>
                                                            {{ $produit->designation_fr }} ( {{ @$produit->qte + $details->qte }} )
                                                            <span>{{ @$produit->code_product }}</span>
                                                        </option>
                                                    @endforeach
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" id="qte{{ $start }}"
                                                    name="qte{{ $start }}" class="form-control" step="1"
                                                    @if (@$edit) value="{{ @$details->qte }}" @else value="1" @endif min="1"
                                                    @if(@$edit && @$ticket->remise)
                                                    onkeyup="calculate('m_remise')"
                                                    onchange="calculate('m_remise')"
                                                    @else
                                                    onkeyup="calculate()"
                                                    onchange="calculate()"

                                                    @endif>
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" min="0"   @if (@$edit) value="{{ @$details->prix_unitaire }}" @else value="0" @endif
                                                    name="prix_unitaire{{ $start }}" class="form-control"
                                                    id="p_unitaire{{ $start }}" onkeyup="calculate()"
                                                    onchange="calculate()">
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" min="0"  @if (@$edit) value="{{ @$details->prix_ht }}" @else value="0" @endif
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
                                @endif
                                @for ($i = $start; $i < $max; $i++)
                                    <tr id="achat{{ $i }}">
                                        <td style="min-width:300px">
                                            <select name="produit_id_{{ $i }}" class="form-control select2"
                                                id="select_produit{{ $i }}"
                                                onchange="selectProduit({{ $i }})">
                                                <option value="" selected disabled> Choisir..</option>
                                                @foreach ($produits as $produit)
                                                    <option value="{{ $produit->id }}"
                                                        data-prix="{{ @$produit->prix }}"
                                                        data-qte="{{ @$produit->qte }}">
                                                        {{ $produit->designation_fr }} ( {{ @$produit->qte }} )
                                                        <span >{{ @$produit->code_product }}</span></option>
                                                @endforeach
                                            </select>
                                        </td>
                                        <td>
                                            <input type="number" id="qte{{ $i }}"
                                                name="qte{{ $i }}" class="form-control" step="1"
                                                value="1" min="1" onkeyup="calculate()"
                                                onchange="calculate()">
                                        </td>
                                        <td>
                                            <input type="number" step="0.001" min="0" value="0"
                                                name="prix_unitaire{{ $i }}" class="form-control"
                                                id="p_unitaire{{ $i }}" onkeyup="calculate()"
                                                onchange="calculate()">
                                        </td>
                                        <td>
                                            <input type="number" step="0.001" min="0" value="0"
                                                name="p_t_ht{{ $i }}" class="form-control"
                                                id="p_t_ht{{ $i }}" disabled>
                                        </td>
                                    {{--     <td>
                                            <input type="number" step="1" min="0" value="0"
                                                name="tva{{ $i }}" class="form-control"
                                                id="tva{{ $i }}" disabled>
                                        </td>
                                        <td>
                                            <input type="number" step="1" min="0" value="0"
                                                name="val_tva{{ $i }}" class="form-control"
                                                id="val_tva{{ $i }}" disabled>
                                        </td> --}}
                                        <td>
                                            <a class="btn btn-danger" onclick="remove(<?php echo $i; ?>)"> <i
                                                    class="voyager-trash"></i></a>
                                        </td>
                                    </tr>
                                @endfor
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
                                                @if (@$edit) value="{{ @$ticket->prix_ht }}" @else value="0.000" @endif>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Montant Remise</td>
                                        <td><input name="m_remise" class="form-control" id="m_remise" step='0.001'
                                                @if (@$edit) value="{{ @$ticket->remise }}" @else value="0.000" @endif
                                                onkeyup="calculate('mt_remise')" onchange="calculate('mt_remise')"></td>
                                    </tr>
                                    <tr>
                                        <td>Poucentage Remise %</td>
                                        <td><input name="pourcent_remise" class="form-control" id="pourcen_remise"
                                                @if (@$edit) value="{{ @$ticket->pourcentage_remise }}" @else value="0" @endif
                                                onkeyup="calculate('pourcen_remise')"
                                                onchange="calculate('pourcen_remise')"></td>
                                    </tr>
                                     <tr id="ligne_apres_remise"
                                      >
                                        <td>Net à payer </td>
                                        <td><input name="apres_remise" class="form-control" id="apres_remise"
                                                step='0.001'
                                                @if (@$edit) value="{{ @$ticket->prix_ht - @$ticket->remise }}" @else value="0.000" @endif
                                                disabled></td>
                                    </tr>
                                   {{--  <tr>
                                        <td>Montant Totale TVA</td>
                                        <td><input name="m_totale_tva" class="form-control" step='0.001'
                                                @if (@$edit) value="{{ @$ticket->tva }}" @else value="0.000" @endif
                                                disabled id="m_tt_tva"></td>
                                    </tr> --}}
                                  {{--  <tr>
                                        <td>Net à payer </td>
                                        <td><input name="m_totale_ttc" class="form-control" step='0.001'
                                                @if (@$edit) value="{{ @$ticket->prix_ttc  }}" @else value="0.000" @endif
                                                disabled id="m_tt_ttc"></td>
                                    </tr>  --}}
                            {{--         <tr>
                                        <td>Timbre Fiscal</td>
                                        <td><input onkeyup="calculate()" onchange="calculate()" name="timbre_fiscal"
                                                class="form-control" type="number" id="m_timbre" step='0.001'
                                                @if (@$edit) value="{{ @$ticket->timbre }}" @else  value="{{ $coordonnee->timbre }}" @endif>
                                        </td>
                                    </tr> --}}
                               {{--      <tr>
                                        <td>Net à payer</td>
                                        <td><input name="net_payer" type="number" class="form-control" id="m_net"
                                                step='0.001'
                                                @if (@$edit) value="{{ @$ticket->prix_ttc }}" @else value="0.000" @endif
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
        var edit_length = {{ @$edit_length ? $edit_length :  0}}
        var j = 1;
        var hide = 2;
        if(editt == 1){
            hide = edit_length +1

            j = edit_length
            for (let index = 1; index <= edit_length; index++) {
                console.log(index)

                var select = document.getElementById('select_produit' + index)
                select.required = true;
                var option = select.options[select.selectedIndex]
                var v_qte = option.getAttribute('data-qte')

                console.log(v_qte)
                document.getElementById('qte' + index).max = v_qte

            }

        }
        for (let i = hide; i < max; i++) {
            var element = document.getElementById('achat' + i)
            element.style.display = "none";
        }

        function add() {
            var nb_achat = parseInt(document.getElementById('nb_achat').value);
            document.getElementById('nb_achat').value = nb_achat + 1;
            j = j + 1;
            var element = document.getElementById('achat' + j)
            element.style.display = "revert";
        }

        function remove(i) {
            var select = document.getElementById('select_produit' + i)
            select.required = false;
            var nb_achat = parseInt(document.getElementById('nb_achat').value);
            document.getElementById('nb_achat').value = nb_achat - 1;
            var nb_delete = parseInt(document.getElementById('nb_delete').value);

            document.getElementById('nb_delete').value = nb_delete + 1
            var qte = document.getElementById('qte' + i)
            qte.value = null
            var element = document.getElementById('achat' + i)
            element.style.display = "none";

            calculate()
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
            document.getElementById('ligne_apres_remise').style.display = "revert"
            /*var qte = document.getElementById('qte' + i).value;
            var p_t_ht = document.getElementById('p_t_ht' + i);
            var p_t_ht_valeur = v_prix * qte;
            p_t_ht.value = p_t_ht_valeur;*/
            //console.log('calculate with parametre : ' + type_remise);
            var m_totale_ht = 0
/*             var m_totale_tva = 0
 */            var totale_remise = 0;
            for (let i = 1; i <= j; i++) {
                var qte = document.getElementById('qte' + i).value;
                var prix = document.getElementById('p_unitaire' + i).value;
                /**MAJ PTTHT_for_service Start***/
                var p_t_ht = document.getElementById('p_t_ht' + i);
                var p_t_ht_valeur = prix * qte;
                p_t_ht.value = p_t_ht_valeur;
                /**MAJ PTTHT_for_service End***/
               // var tva = document.getElementById('tva' + i).value;
                /**MAJ TVA_for_service Start***/
               // var val_tva = document.getElementById('val_tva' + i);
               /*  var montant_tva_for_service = (p_t_ht_valeur * tva) / 100;
                val_tva.value = montant_tva_for_service; */
                /**MAJ TVA_for_service End***/
                m_totale_ht += (prix * qte)
               /*  m_totale_tva += (p_t_ht_valeur * tva / 100); */
            }
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
            }else{
                document.getElementById('ligne_apres_remise').style.display = "revert"
                document.getElementById('apres_remise').value = (m_totale_ht).toFixed(3)

            }
            if (totale_remise == 0) {
             //   document.getElementById('ligne_apres_remise').style.display = "none"
            }
            var m_totale_ttc = m_totale_ht - totale_remise/*  + m_totale_tva */
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
    </script>


<script>

// Debounce timer for barcode scanner
var barcodeTimeout = null;
var lastBarcodeValue = '';

function scanner(produits){
    var barcode_input = document.getElementById('barcode');

    // Normalize barcode: trim whitespace, remove line breaks and carriage returns
    var barcode = barcode_input.value
        .replace(/\r\n/g, '')
        .replace(/\n/g, '')
        .replace(/\r/g, '')
        .trim();

    console.log('Raw barcode value:', barcode_input.value);
    console.log('Normalized barcode:', barcode);

    // Only process if barcode has minimum length (typically barcodes are at least 3-4 characters)
    // and if the value has changed (to avoid processing the same barcode twice)
    if(barcode && barcode.length >= 3 && barcode !== lastBarcodeValue && produits.length > 0){
        lastBarcodeValue = barcode; // Store to prevent duplicate processing
        // Try exact match first, then with leading zero
        var search = produits.find((prod)=> {
            var prodCode = String(prod.code_product || '').trim();
            return prodCode === barcode || prodCode === '0' + barcode || '0' + prodCode === barcode;
        })

        if(search){
            //alert(search.designation_fr)


            var i = parseInt(document.getElementById('nb_achat').value) - parseInt(document.getElementById('nb_delete').value)

           if(i == 1 ){
            var ii =`select_produit${i}`

            console.log(ii)
            var test_product = document.getElementById(ii)

            console.log(test_product)
            if(test_product.value == null || test_product.value == ''){

            }else{

              add()
            }
           }else{
            add()

           }
           i = parseInt(document.getElementById('nb_achat').value) - parseInt(document.getElementById('nb_delete').value)

            var psid = `#select_produit${i}`
            console.log(psid)
            var select_product = document.getElementById(psid)
            $(psid).val(search.id+'').change();

            selectProduit(i)

            barcode_input.value = ''
            lastBarcodeValue = ''; // Reset to allow rescanning
            barcode_input.focus()
        }else{
           // alert('notfound')
            Swal.fire('Aucun produit trouvé' , '' , 'info')
            barcode_input.value = ''
            lastBarcodeValue = ''; // Reset to allow rescanning
            barcode_input.focus()
        }
    }else if(barcode && barcode.length < 3){
        // Barcode too short, wait for more input
        console.log('Barcode too short, waiting for more input...');
    }else if(!produits || produits.length === 0){
        Swal.fire('Liste des produits est vide' , '' , 'info')
    }

}

// Setup barcode input with debounced scanner
document.addEventListener('DOMContentLoaded', function() {
    var barcode_input = document.getElementById('barcode');
    if(barcode_input) {
        barcode_input.addEventListener('input', function(e) {
            // Clear previous timeout
            if(barcodeTimeout) {
                clearTimeout(barcodeTimeout);
            }
            
            // Wait 150ms after last input (barcode scanners send data very quickly)
            barcodeTimeout = setTimeout(function() {
                scanner({{$produits}});
            }, 150);
        });
        
        // Also handle Enter key for manual entry
        barcode_input.addEventListener('keypress', function(e) {
            if(e.key === 'Enter') {
                e.preventDefault();
                if(barcodeTimeout) {
                    clearTimeout(barcodeTimeout);
                }
                scanner({{$produits}});
            }
        });
    }
});


const form = document.getElementById('myform')
form.addEventListener('keypress' , function(e){
    if(e.keyCode == 13){
        e.preventDefault()
    }
})
</script>
@stop
