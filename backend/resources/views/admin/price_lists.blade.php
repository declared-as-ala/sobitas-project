@extends('layouts.admin')

@section('content')
    @php
        $coordonnee = App\Models\Coordinate::first();
        $produits = App\Models\Product::all();
        $max = 100;
    @endphp
    <script>
        var max = 100;
    </script>

    <div class="page-content">
        <div class="analytics-container">
            <div class="Dashboard Dashboard--full">
                <form role="form" class="form-edit-add" id="myform"
                    @if (@$edit) action="{{ route('admin.pricelist.update', @$pricelist->id) }}"
                    @else action="{{ route('admin.pricelist.store') }}" @endif
                    method="POST">
                    @if (@$edit)
                        {{ method_field('PUT') }}
                    @endif
                    @csrf
                    <input type="hidden"
                        @if (@$edit) value="{{ @$edit_length }}" @else value="1" @endif id="nb_product"
                        name="nb_product">
                    <input type="hidden" value="0" id="nb_delete" name="nb_delete">

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

                        <!-- Price List Header -->
                        <div class="row" style="margin-left: 3px;margin-bottom: 3%;">
                            <div class="col-md-5">
                                <img src="{{ asset('storage/' . $coordonnee->logo_facture) }}" alt=""
                                    style="height: 100px;">
                                <h4>{{ $coordonnee->abbreviation }}</h4>
                                <p> <span></span> {{ $coordonnee->phone_1 }} @if ($coordonnee->phone_2)
                                        <span>/ {{ $coordonnee->phone_2 }}</span>
                                    @endif
                                </p>
                            </div>

                            <div class="col-md-2"></div>

                            <div class="col-md-5">
                                <div class="mb-3">
                                    <label for="designation" class="form-label">Désignation Liste de Prix</label>
                                    <input type="text" class="form-control" id="designation"
                                        placeholder="Ex: Prix Détail 2025" name="designation" required
                                        @if (@$edit) value="{{ @$pricelist->designation }}" @endif>
                                </div>
                            </div>
                        </div>

                        <!-- Barcode Scanner -->
                        <label>Scanner code à barre </label>
                        <input type="text" placeholder="barcode" id="barcode" class="form-control" autofocus
                            onchange="scanner({{ $produits }})">
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
                                @php
                                    $start = 1;
                                @endphp
                                @if (@$edit && @$details_pricelist)
                                    @foreach ($details_pricelist as $details)
                                        <tr id="product{{ $start }}">
                                            <td style="min-width:300px">
                                                <select name="produit_id_{{ $start }}"
                                                    class="form-control select2" id="select_produit{{ $start }}"
                                                    onchange="selectProduit({{ $start }})">
                                                    @foreach ($produits as $produit)
                                                        <option value="{{ $produit->id }}"
                                                            data-code="{{ @$produit->code_product }}"
                                                            data-prix="{{ @$produit->prix }}"
                                                            @if ($details->product_id == $produit->id) selected @endif>
                                                            {{ $produit->designation_fr }}
                                                        </option>
                                                    @endforeach
                                                </select>
                                            </td>
                                            <td>
                                                <input type="text" id="code{{ $start }}"
                                                    class="form-control" disabled
                                                    value="{{ @$details->product->code_product }}">
                                            </td>
                                             <td>
                                                <input type="number" step="0.001" min="0"
                                                    value="{{ @$details->prix_gros }}"
                                                    name="prix_gros{{ $start }}" class="form-control"
                                                    id="p_gros{{ $start }}">
                                            </td>
                                            <td>
                                                <input type="number" step="0.001" min="0"
                                                    value="{{ @$details->prix_unitaire }}"
                                                    name="prix_unitaire{{ $start }}" class="form-control"
                                                    id="p_unitaire{{ $start }}" required>
                                            </td>

                                            <td>
                                                <a class="btn btn-danger" onclick="remove({{ $start }})">
                                                    <i class="voyager-trash"></i>
                                                </a>
                                            </td>
                                        </tr>
                                        @php
                                            $start++;
                                        @endphp
                                    @endforeach
                                @endif

                                @for ($i = $start; $i < $max; $i++)
                                    <tr id="product{{ $i }}">
                                        <td style="min-width:300px">
                                            <select name="produit_id_{{ $i }}" class="form-control select2"
                                                id="select_produit{{ $i }}"
                                                onchange="selectProduit({{ $i }})">
                                                <option value="" selected disabled> Choisir..</option>
                                                @foreach ($produits as $produit)
                                                    <option value="{{ $produit->id }}"
                                                        data-code="{{ @$produit->code_product }}"
                                                        data-prix="{{ @$produit->prix }}">
                                                        {{ $produit->designation_fr }}
                                                    </option>
                                                @endforeach
                                            </select>
                                        </td>
                                        <td>
                                            <input type="text" id="code{{ $i }}"
                                                class="form-control" disabled value="">
                                        </td>
                                          <td>
                                            <input type="number" step="0.001" min="0" value="0"
                                                name="prix_gros{{ $i }}" class="form-control"
                                                id="p_gros{{ $i }}">
                                        </td>
                                        <td>
                                            <input type="number" step="0.001" min="0" value="0"
                                                name="prix_unitaire{{ $i }}" class="form-control"
                                                id="p_unitaire{{ $i }}">
                                        </td>

                                        <td>
                                            <a class="btn btn-danger" onclick="remove({{ $i }})">
                                                <i class="voyager-trash"></i>
                                            </a>
                                        </td>
                                    </tr>
                                @endfor
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
@stop

@section('javascript')
    <script>
        var editt = {{ @$edit ? 1 : 0 }}
        var edit_length = {{ @$edit_length ? $edit_length : 0 }}
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
@stop
