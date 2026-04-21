<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\ProductPriceList;
use App\DetailsProductPriceList;
use App\Product;
use Illuminate\Support\Facades\DB;

class PriceListController extends Controller
{
    /**
     * Show the form for creating a new price list.
     */
    public function create()
    {
        $produits = Product::all();

        return view('admin.price_lists', compact('produits'));
    }

    /**
     * Store a newly created price list in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'nb_product' => 'required|integer|min:1',
        ]);

        DB::beginTransaction();

        try {
            // Create the price list
            $pricelist = new ProductPriceList();
            $pricelist->designation = $request->designation;
            $pricelist->save();

            // Get the number of products
            $nb_product = intval($request->nb_product);
            $nb_delete = intval($request->nb_delete);
            $total_products = $nb_product - $nb_delete;

            // Save product details
            for ($i = 1; $i <= $nb_product; $i++) {
                $produit_id = $request->input('produit_id_' . $i);

                if ($produit_id) {
                    $detail = new DetailsProductPriceList();
                    $detail->product_price_list_id = $pricelist->id;
                    $detail->product_id = $produit_id;
                    $detail->prix_unitaire = $request->input('prix_unitaire' . $i) ?? 0;
                    $detail->prix_gros = $request->input('prix_gros' . $i) ?? 0;
                    $detail->save();
                }
            }

            DB::commit();

            return redirect()
                ->route('voyager.pricelists.print' , $pricelist->id)
                ->with([
                    'message' => "Liste de prix créée avec succès",
                    'alert-type' => 'success'
                ]);

        } catch (\Exception $e) {
            DB::rollback();

            return redirect()
                ->back()
                ->withInput()
                ->with([
                    'message' => "Erreur lors de la création: " . $e->getMessage(),
                    'alert-type' => 'error'
                ]);
        }
    }

    /**
     * Show the form for editing the specified price list.
     */
    public function edit($id)
    {
        $pricelist = ProductPriceList::findOrFail($id);
        $details_pricelist = DetailsProductPriceList::where('product_price_list_id', $id)->get();
        $produits = Product::all();

        $edit = true;
        $edit_length = $details_pricelist->count();

        return view('admin.price_lists', compact(
            'pricelist',
            'details_pricelist',
            'produits',
            'edit',
            'edit_length'
        ));
    }

    /**
     * Update the specified price list in storage.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'nb_product' => 'required|integer|min:1',
        ]);

        DB::beginTransaction();

        try {
            // Update the price list
            $pricelist = ProductPriceList::findOrFail($id);
            $pricelist->designation = $request->designation;
            $pricelist->save();

            // Delete all existing details
            DetailsProductPriceList::where('product_price_list_id', $id)->delete();

            // Get the number of products
            $nb_product = intval($request->nb_product);
            $nb_delete = intval($request->nb_delete);

            // Save updated product details
            for ($i = 1; $i <= $nb_product; $i++) {
                $produit_id = $request->input('produit_id_' . $i);

                if ($produit_id) {
                    $detail = new DetailsProductPriceList();
                    $detail->product_price_list_id = $pricelist->id;
                    $detail->product_id = $produit_id;
                    $detail->prix_unitaire = $request->input('prix_unitaire' . $i) ?? 0;
                    $detail->prix_gros = $request->input('prix_gros' . $i) ?? 0;
                    $detail->save();
                }
            }

            DB::commit();

            return redirect()
                ->route('voyager.pricelists.print', $pricelist->id)
                ->with([
                    'message' => "Liste de prix mise à jour avec succès",
                    'alert-type' => 'success'
                ]);

        } catch (\Exception $e) {
            DB::rollback();

            return redirect()
                ->back()
                ->withInput()
                ->with([
                    'message' => "Erreur lors de la mise à jour: " . $e->getMessage(),
                    'alert-type' => 'error'
                ]);
        }
    }
        public function print($id)
    {
        $pricelist = ProductPriceList::findOrFail($id);
        $details_pricelist = DetailsProductPriceList::where('product_price_list_id', $id)
            ->with('product')
            ->get();

        return view('admin.imprimer_pricelist', compact('pricelist', 'details_pricelist'));
    }
}
