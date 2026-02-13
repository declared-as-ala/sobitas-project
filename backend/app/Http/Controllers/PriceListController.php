<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\DetailsProductPriceList;
use App\Models\Product;
use App\Models\ProductPriceList;
use Illuminate\Http\Request;
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
     * Store a newly created price list.
     */
    public function store(Request $request)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'nb_product' => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $pricelist = ProductPriceList::create([
                'designation' => $request->designation,
            ]);

            $this->saveDetails($request, $pricelist->id);

            DB::commit();

            return redirect()
                ->route('admin.pricelists.print', $pricelist->id)
                ->with([
                    'message' => 'Liste de prix créée avec succès',
                    'alert-type' => 'success',
                ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()
                ->back()
                ->withInput()
                ->with([
                    'message' => 'Erreur lors de la création: ' . $e->getMessage(),
                    'alert-type' => 'error',
                ]);
        }
    }

    /**
     * Show the form for editing the specified price list.
     */
    public function edit(int $id)
    {
        $pricelist = ProductPriceList::findOrFail($id);
        $details_pricelist = DetailsProductPriceList::where('product_price_list_id', $id)->get();
        $produits = Product::all();

        return view('admin.price_lists', [
            'pricelist' => $pricelist,
            'details_pricelist' => $details_pricelist,
            'produits' => $produits,
            'edit' => true,
            'edit_length' => $details_pricelist->count(),
        ]);
    }

    /**
     * Update the specified price list.
     */
    public function update(Request $request, int $id)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'nb_product' => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $pricelist = ProductPriceList::findOrFail($id);
            $pricelist->update(['designation' => $request->designation]);

            // Delete old details and recreate
            DetailsProductPriceList::where('product_price_list_id', $id)->delete();
            $this->saveDetails($request, $pricelist->id);

            DB::commit();

            return redirect()
                ->route('admin.pricelists.print', $pricelist->id)
                ->with([
                    'message' => 'Liste de prix mise à jour avec succès',
                    'alert-type' => 'success',
                ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()
                ->back()
                ->withInput()
                ->with([
                    'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage(),
                    'alert-type' => 'error',
                ]);
        }
    }

    /**
     * Print price list view.
     */
    public function print(int $id)
    {
        $pricelist = ProductPriceList::findOrFail($id);
        $details_pricelist = DetailsProductPriceList::where('product_price_list_id', $id)
            ->with('product')
            ->get();

        return view('admin.imprimer_pricelist', compact('pricelist', 'details_pricelist'));
    }

    /**
     * Save price list details from form data.
     */
    private function saveDetails(Request $request, int $priceListId): void
    {
        $nbProduct = (int) $request->nb_product;

        for ($i = 1; $i <= $nbProduct; $i++) {
            $produitId = $request->input('produit_id_' . $i);

            if ($produitId) {
                DetailsProductPriceList::create([
                    'product_price_list_id' => $priceListId,
                    'product_id' => $produitId,
                    'prix_unitaire' => $request->input('prix_unitaire' . $i) ?? 0,
                    'prix_gros' => $request->input('prix_gros' . $i) ?? 0,
                ]);
            }
        }
    }
}
