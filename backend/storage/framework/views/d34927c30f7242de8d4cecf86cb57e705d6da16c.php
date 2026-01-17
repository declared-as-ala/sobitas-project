<?php $__env->startSection('content'); ?>
    <?php
        $coordonnee = App\Coordinate::first();
        $produits = App\Product::all();
        $max = 100;
    ?>
    <script>
        var max = 100;
    </script>

    <div class="page-content">
        <div class="analytics-container">
            <div class="Dashboard Dashboard--full">
                <form role="form" class="form-edit-add" id="myform"
                    <?php if(@$edit): ?> action="<?php echo e(route('voyager.pricelist.update', @$pricelist->id)); ?>"
                    <?php else: ?> action="<?php echo e(route('voyager.pricelist.store')); ?>" <?php endif; ?>
                    method="POST">
                    <?php if(@$edit): ?>
                        <?php echo e(method_field('PUT')); ?>

                    <?php endif; ?>
                    <?php echo csrf_field(); ?>
                    <input type="hidden"
                        <?php if(@$edit): ?> value="<?php echo e(@$edit_length); ?>" <?php else: ?> value="1" <?php endif; ?> id="nb_product"
                        name="nb_product">
                    <input type="hidden" value="0" id="nb_delete" name="nb_delete">

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

                        <!-- Price List Header -->
                        <div class="row" style="margin-left: 3px;margin-bottom: 3%;">
                            <div class="col-md-5">
                                <img src="<?php echo e(Voyager::image($coordonnee->logo_facture)); ?>" alt=""
                                    style="height: 100px;">
                                <h4><?php echo e($coordonnee->abbreviation); ?></h4>
                                <p> <span></span> <?php echo e($coordonnee->phone_1); ?> <?php if($coordonnee->phone_2): ?>
                                        <span>/ <?php echo e($coordonnee->phone_2); ?></span>
                                    <?php endif; ?>
                                </p>
                            </div>

                            <div class="col-md-2"></div>

                            <div class="col-md-5">
                                <div class="mb-3">
                                    <label for="designation" class="form-label">Désignation Liste de Prix</label>
                                    <input type="text" class="form-control" id="designation"
                                        placeholder="Ex: Prix Détail 2025" name="designation" required
                                        <?php if(@$edit): ?> value="<?php echo e(@$pricelist->designation); ?>" <?php endif; ?>>
                                </div>
                            </div>
                        </div>

                        <!-- Barcode Scanner -->
                        <label>Scanner code à barre </label>
                        <input type="text" placeholder="barcode" id="barcode" class="form-control" autofocus
                            onchange="scanner(<?php echo e($produits); ?>)">
                        <br>

                        <!-- Products Table -->
                        <table class="table">
                            <thead>
                                <tr>
                                    <th scope="col">Produits</th>
                                    <th scope="col">Code Barre</th>
                                    <th scope="col">Prix Gros</th>
                                    <th scope="col">Prix Unitaire</th>
                                    <th scope="col">#</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                    $start = 1;
                                ?>
                                <?php if(@$edit && @$details_pricelist): ?>
                                    <?php $__currentLoopData = $details_pricelist; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $details): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                        <tr id="product<?php echo e($start); ?>">
                                            <td style="min-width:300px">
                                                <select name="produit_id_<?php echo e($start); ?>"
                                                    class="form-control select2" id="select_produit<?php echo e($start); ?>"
                                                    onchange="selectProduit(<?php echo e($start); ?>)">
                                                    <?php $__currentLoopData = $produits; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $produit): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                                        <option value="<?php echo e($produit->id); ?>"
                                                            data-code="<?php echo e(@$produit->code_product); ?>"
                                                            data-prix="<?php echo e(@$produit->prix); ?>"
                                                            <?php if($details->product_id == $produit->id): ?> selected <?php endif; ?>>
                                                            <?php echo e($produit->designation_fr); ?>

                                                        </option>
                                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                                </select>
                                            </td>
                                            <td>
                                                <input type="text" id="code<?php echo e($start); ?>"
                                                    class="form-control" disabled
                                                    value="<?php echo e(@$details->product->code_product); ?>">
                                            </td>
                                             <td>
                                                <input type="number" step="0.001" min="0"
                                                    value="<?php echo e(@$details->prix_gros); ?>"
                                                    name="prix_gros<?php echo e($start); ?>" class="form-control"
                                                    id="p_gros<?php echo e($start); ?>">
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" min="0"
                                                    value="<?php echo e(@$details->prix_unitaire); ?>"
                                                    name="prix_unitaire<?php echo e($start); ?>" class="form-control"
                                                    id="p_unitaire<?php echo e($start); ?>" required>
                                            </td>

                                            <td>
                                                <a class="btn btn-danger" onclick="remove(<?php echo e($start); ?>)">
                                                    <i class="voyager-trash"></i>
                                                </a>
                                            </td>
                                        </tr>
                                        <?php
                                            $start++;
                                        ?>
                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                <?php endif; ?>

                                <?php for($i = $start; $i < $max; $i++): ?>
                                    <tr id="product<?php echo e($i); ?>">
                                        <td style="min-width:300px">
                                            <select name="produit_id_<?php echo e($i); ?>" class="form-control select2"
                                                id="select_produit<?php echo e($i); ?>"
                                                onchange="selectProduit(<?php echo e($i); ?>)">
                                                <option value="" selected disabled> Choisir..</option>
                                                <?php $__currentLoopData = $produits; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $produit): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                                    <option value="<?php echo e($produit->id); ?>"
                                                        data-code="<?php echo e(@$produit->code_product); ?>"
                                                        data-prix="<?php echo e(@$produit->prix); ?>">
                                                        <?php echo e($produit->designation_fr); ?>

                                                    </option>
                                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                            </select>
                                        </td>
                                        <td>
                                            <input type="text" id="code<?php echo e($i); ?>"
                                                class="form-control" disabled value="">
                                        </td>
                                          <td>
                                            <input type="number" step="0.001" min="0" value="0"
                                                name="prix_gros<?php echo e($i); ?>" class="form-control"
                                                id="p_gros<?php echo e($i); ?>">
                                        </td>
                                        <td>
                                            <input type="number" step="0.001" min="0" value="0"
                                                name="prix_unitaire<?php echo e($i); ?>" class="form-control"
                                                id="p_unitaire<?php echo e($i); ?>">
                                        </td>

                                        <td>
                                            <a class="btn btn-danger" onclick="remove(<?php echo e($i); ?>)">
                                                <i class="voyager-trash"></i>
                                            </a>
                                        </td>
                                    </tr>
                                <?php endfor; ?>
                            </tbody>
                        </table>

                        <!-- Add Row Button -->
                        <div class="row" style="margin-right: 0px;float: left;">
                            <a class="btn btn-primary" onclick="add()">
                                <i class="voyager-list-add"></i> Ajouter
                            </a>
                        </div>
                    </div>

                <div class="panel-footer">
                    <button type="submit" class="btn btn-primary save">Enregistrer</button>
                </div>
                </form>

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
                var select = document.getElementById('select_produit' + index)
                select.required = true;
            }
        }

        for (let i = hide; i < max; i++) {
            var element = document.getElementById('product' + i)
            element.style.display = "none";
        }

        function add() {
            var nb_product = parseInt(document.getElementById('nb_product').value);
            document.getElementById('nb_product').value = nb_product + 1;
            j = j + 1;
            var element = document.getElementById('product' + j)
            element.style.display = "revert";
        }

        function remove(i) {
            var select = document.getElementById('select_produit' + i)
            select.required = false;
            var nb_product = parseInt(document.getElementById('nb_product').value);
            var nb_delete = parseInt(document.getElementById('nb_delete').value);
            document.getElementById('nb_product').value = nb_product - 1;
            document.getElementById('nb_delete').value = nb_delete + 1

            var element = document.getElementById('product' + i)
            element.style.display = "none";
            select.value = null;
        }

        function selectProduit(i) {
            var select = document.getElementById('select_produit' + i)
            select.required = true;
            var option = select.options[select.selectedIndex]
            var v_prix = option.getAttribute('data-prix')
            var v_code = option.getAttribute('data-code')

            var input_p_unitaire = document.getElementById('p_unitaire' + i);
            input_p_unitaire.value = v_prix;

            var input_code = document.getElementById('code' + i);
            input_code.value = v_code;
        }

        function scanner(produits) {
            var barcode_input = document.getElementById('barcode');
            var barcode = barcode_input.value.trim();

            if (barcode && produits.length > 0) {
                var search = produits.find((prod) => prod.code_product == barcode || prod.code_product == '0' + barcode)

                if (search) {
                    var i = parseInt(document.getElementById('nb_product').value) - parseInt(document.getElementById('nb_delete').value)

                    if (i == 1) {
                        var test_product = document.getElementById('select_produit' + i)
                        if (test_product.value == null || test_product.value == '') {
                            // Keep current row
                        } else {
                            add()
                        }
                    } else {
                        add()
                    }

                    i = parseInt(document.getElementById('nb_product').value) - parseInt(document.getElementById('nb_delete').value)

                    var psid = '#select_produit' + i
                    $(psid).val(search.id + '').change();
                    selectProduit(i)

                    barcode_input.value = null
                    barcode_input.focus()
                } else {
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

<?php echo $__env->make('voyager::master', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH C:\xampp\htdocs\SOBITAS-FULL-PROJECT\backend\resources\views/admin/price_lists.blade.php ENDPATH**/ ?>