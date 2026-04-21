<?php $__env->startSection('content'); ?>
    <?php
        $coordonnee = App\Coordinate::first();
        //$produits = App\Product::all();

        $clients = App\Client::all();
        $max = 100;
    ?>
    <script>
        var max = 100;
    </script>


    <div class="page-content">
        <div class="analytics-container">
            <div class="Dashboard Dashboard--full">
                <form role="form" class="form-edit-add" id="myform" 
                    <?php if(@$edit): ?> action="<?php echo e(route('voyager.update_facture', @$facture->id)); ?>"  <?php else: ?> action="<?php echo e(route('voyager.store_facture')); ?>" <?php endif; ?>
                    method="POST">
                    <!-- PUT Method if we are editing -->
                    <?php if(@$edit): ?>
                        <?php echo e(method_field('PUT')); ?>

                    <?php endif; ?>
                    <?php echo csrf_field(); ?>
                    <input type="hidden"
                        <?php if(@$edit): ?> value="<?php echo e(@$edit_length); ?>" <?php else: ?> value="1" <?php endif; ?> id="nb_achat"
                        name="nb_achat">
                    <input type="hidden" value="0" id="nb_delete" name="nb_delete">

                    <input type="hidden" value="0" id="new_client" name="new_client">
                    <div class="panel-body">
                        <?php if(count($errors) > 0): ?>
                            <div class="alert alert-danger">
                                <ul>
                                    <?php $__currentLoopData = $errors->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                        <li><?php echo e($error); ?></li>
                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                </ul>
                            </div>
                        <?php endif; ?>
                        <div class="row" style="margin-left: 3px;margin-bottom: 3%;">
                            <!--Vendeur info Start-->
                            <div class="col-md-5" style="min-height: 150px;">
                                <img src="<?php echo e(Voyager::image($coordonnee->logo_facture)); ?>" alt=""
                                    style="height: 100px;">
                                <h4><?php echo e($coordonnee->abbreviation); ?></h4>
                                <p> <span></span> <?php echo e($coordonnee->phone_1); ?> <?php if($coordonnee->phone_2): ?>
                                        <span>/ <?php echo e($coordonnee->phone_2); ?></span>
                                    <?php endif; ?>
                                </p>
                                <p> <span></span> <?php echo e($coordonnee->adresse_fr); ?></p>
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
                                <?php if(!@$edit): ?>
                                    <div class="row">
                                        <a class="btn btn-primary" style="float: right; margin-right:16px;"
                                            onclick="addPatient()">Ajouter Client(e) </a>
                                    </div>
                                <?php endif; ?>
                                Client
                                <select name="client_id" id="select_client" class="form-control select2"
                                    onchange="selectClient()" <?php if(@$edit): ?> disabled <?php endif; ?>>
                                    <option value="">Choisir</option>
                                    <?php $__currentLoopData = $clients; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $client): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                        <option value="<?php echo e($client->id); ?>" data-adresse="<?php echo e($client->adresse); ?>"
                                            data-phone="<?php echo e($client->phone_1); ?>"
                                            <?php if(@$edit && @$facture->client_id == $client->id): ?> selected <?php endif; ?>>
                                            <?php echo e($client->name); ?> (<?php echo e($client->phone_1); ?>)
                                        </option>
                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                </select>
                                <p>Adresse : <input class="form-control" id="adr" disabled
                                        <?php if(@$edit): ?> value="<?php echo e(@$facture->client->adresse); ?>" <?php else: ?> value="" <?php endif; ?>>
                                </p>
                                <p>N°Tél : <input class="form-control" id="phone" disabled
                                        <?php if(@$edit): ?> value="<?php echo e(@$facture->client->phone_1); ?>" <?php else: ?> value="" <?php endif; ?>>
                                </p>
                            </div>
                            <!--Client info End-->
                        </div>
                        <!--Rows Start-->
                        <label>Scanner code à barre </label>
                        <input type="number" placeholder="barcode" id="barcode" class="form-control" autofocus
                            onchange="scanner(<?php echo e($produits); ?>)">
                        <br>
                        <!--Rows Start-->
                        <table class="table" class="row">
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
                                <?php
                                    $start = 1;
                                ?>
                                <?php if(@$edit && @$details_facture): ?>


                                    <?php $__currentLoopData = $details_facture; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $details): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                        <tr id="achat<?php echo e($start); ?>">
                                            <td style="min-width:300px">
                                                <select name="produit_id_<?php echo e($start); ?>" class="form-control select2"
                                                    id="select_produit<?php echo e($start); ?>"
                                                    onchange="selectProduit(<?php echo e($start); ?>)">

                                                    <?php $__currentLoopData = $produits; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $produit): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                                        <option value="<?php echo e($produit->id); ?>"
                                                            data-prix="<?php echo e(@$produit->prix); ?>"
                                                            data-qte="<?php echo e(@$produit->qte + $details->qte); ?>"
                                                            <?php if($details->produit_id == $produit->id): ?> selected <?php endif; ?>>
                                                            <?php echo e($produit->designation_fr); ?> (
                                                            <?php echo e(@$produit->qte + $details->qte); ?> )
                                                        </option>
                                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                                </select>
                                            </td>
                                            <td>
                                                <input type="number" id="qte<?php echo e($start); ?>"
                                                    name="qte<?php echo e($start); ?>" class="form-control" step="1"
                                                    <?php if(@$edit): ?> value="<?php echo e(@$details->qte); ?>" <?php else: ?> value="1" <?php endif; ?>
                                                    min="1"
                                                    <?php if(@$edit && @$facture->remise): ?> onkeyup="calculate('m_remise')"
                                                    onchange="calculate('m_remise')"
                                                    <?php else: ?>
                                                    onkeyup="calculate()"
                                                    onchange="calculate()" <?php endif; ?>>
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" min="0"
                                                    <?php if(@$edit): ?> value="<?php echo e(@$details->prix_unitaire); ?>" <?php else: ?> value="0" <?php endif; ?>
                                                    name="prix_unitaire<?php echo e($start); ?>" class="form-control"
                                                    id="p_unitaire<?php echo e($start); ?>" onkeyup="calculate()"
                                                    onchange="calculate()">
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" min="0"
                                                    <?php if(@$edit): ?> value="<?php echo e(@$details->prix_ht); ?>" <?php else: ?> value="0" <?php endif; ?>
                                                    name="p_t_ht<?php echo e($start); ?>" class="form-control"
                                                    id="p_t_ht<?php echo e($start); ?>" disabled>
                                            </td>
                                            
                                            <td>
                                                <a class="btn btn-danger" onclick="remove(<?php echo $start; ?>)"> <i
                                                        class="voyager-trash"></i></a>
                                            </td>
                                        </tr>

                                        <?php
                                            $start++;
                                        ?>
                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                <?php endif; ?>
                                <?php for($i = $start; $i < $max; $i++): ?>
                                    <tr id="achat<?php echo e($i); ?>">
                                        <td style="min-width:300px">
                                            <select name="produit_id_<?php echo e($i); ?>" class="form-control select2"
                                                id="select_produit<?php echo e($i); ?>"
                                                onchange="selectProduit(<?php echo e($i); ?>)">
                                                <option value="" selected disabled> Choisir..</option>
                                                <?php $__currentLoopData = $produits; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $produit): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                                    <option value="<?php echo e($produit->id); ?>"
                                                        data-prix="<?php echo e(@$produit->prix); ?>"
                                                        data-qte="<?php echo e(@$produit->qte); ?>">
                                                        <?php echo e($produit->designation_fr); ?> ( <?php echo e(@$produit->qte); ?> )</option>
                                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                            </select>
                                        </td>
                                        <td>
                                            <input type="number" id="qte<?php echo e($i); ?>"
                                                name="qte<?php echo e($i); ?>" class="form-control" step="1"
                                                value="1" min="1" onkeyup="calculate()"
                                                onchange="calculate()">
                                        </td>
                                        <td>
                                            <input type="number" step="0.001" min="0" value="0"
                                                name="prix_unitaire<?php echo e($i); ?>" class="form-control"
                                                id="p_unitaire<?php echo e($i); ?>" onkeyup="calculate()"
                                                onchange="calculate()">
                                        </td>
                                        <td>
                                            <input type="number" step="0.001" min="0" value="0"
                                                name="p_t_ht<?php echo e($i); ?>" class="form-control"
                                                id="p_t_ht<?php echo e($i); ?>" disabled>
                                        </td>
                                        
                                        <td>
                                            <a class="btn btn-danger" onclick="remove(<?php echo $i; ?>)"> <i
                                                    class="voyager-trash"></i></a>
                                        </td>
                                    </tr>
                                <?php endfor; ?>
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
                                                <?php if(@$edit): ?> value="<?php echo e(@$facture->prix_ht); ?>" <?php else: ?> value="0.000" <?php endif; ?>>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Montant Remise</td>
                                        <td><input name="m_remise" class="form-control" id="m_remise" step='0.001'
                                                <?php if(@$edit): ?> value="<?php echo e(@$facture->remise); ?>" <?php else: ?> value="0.000" <?php endif; ?>
                                                onkeyup="calculate('mt_remise')" onchange="calculate('mt_remise')"></td>
                                    </tr>
                                    <tr>
                                        <td>Poucentage Remise %</td>
                                        <td><input name="pourcent_remise" class="form-control" id="pourcen_remise"
                                                <?php if(@$edit): ?> value="<?php echo e(@$facture->pourcentage_remise); ?>" <?php else: ?> value="0" <?php endif; ?>
                                                onkeyup="calculate('pourcen_remise')"
                                                onchange="calculate('pourcen_remise')"></td>
                                    </tr>
                                    <tr id="ligne_apres_remise">
                                        <td>Net à payer </td>
                                        <td><input name="apres_remise" class="form-control" id="apres_remise"
                                                step='0.001'
                                                <?php if(@$edit): ?> value="<?php echo e(@$facture->prix_ht - @$facture->remise); ?>" <?php else: ?> value="0.000" <?php endif; ?>
                                                disabled></td>
                                    </tr>
                                    
                                    
                                    
                                    

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
<?php $__env->stopSection(); ?>

<?php $__env->startSection('javascript'); ?>

    <script>
        var editt = <?php echo e(@$edit ? 1 : 0); ?>

        var edit_length = <?php echo e(@$edit_length ? $edit_length : 0); ?>

        var j = 1;
        var hide = 2;
        if (editt == 1) {
            hide = edit_length + 1

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
             */
            var totale_remise = 0;
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


        function scanner(produits) {

            var barcode_input = document.getElementById('barcode');

            console.log(barcode_input)
            var barcode = (+barcode_input.value + 1) + ''

            console.log('barcode', barcode)
            if (barcode && produits.length > 0) {
                var search = produits.find((prod) => prod.code_product == barcode || prod.code_product == '0' + barcode)

                if (search) {
                    //alert(search.designation_fr)


                    var i = parseInt(document.getElementById('nb_achat').value) - parseInt(document.getElementById(
                        'nb_delete').value)

                    if (i == 1) {
                        var ii = `select_produit${i}`

                        console.log(ii)
                        var test_product = document.getElementById(ii)

                        console.log(test_product)
                        if (test_product.value == null || test_product.value == '') {

                        } else {

                            add()
                        }
                    } else {
                        add()

                    }
                    i = parseInt(document.getElementById('nb_achat').value) - parseInt(document.getElementById('nb_delete')
                        .value)

                    var psid = `#select_produit${i}`
                    console.log(psid)
                    var select_product = document.getElementById(psid)
                    $(psid).val(search.id + '').change();

                    selectProduit(i)

                    barcode_input.value = null
                    barcode_input.focus()
                } else {
                    // alert('notfound')
                    Swal.fire('Aucun produit trouvé', '', 'info')
                    barcode_input.value = null
                    barcode_input.focus()
                }
            } else {
                Swal.fire('Liste des produits est vide', '', 'info')
            }

        }


        const form = document.getElementById('myform')
        form.addEventListener('keypress', function(e) {
            if (e.keyCode == 13) {
                e.preventDefault()
            }
        })
    </script>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('voyager::master', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/html/resources/views/admin/facture.blade.php ENDPATH**/ ?>