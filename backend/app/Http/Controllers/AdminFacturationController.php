<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\DetailsFacture;
use App\Models\Facture;
use App\Models\Product;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminFacturationController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
    ) {}

    /**
     * Show the invoice creation form.
     */
    public function showFacture()
    {
        $edit = 0;
        $produits = Product::where('qte', '>', 0)->get();

        return view('admin.facture', ['edit' => $edit, 'produits' => $produits]);
    }

    /**
     * Store a new facture.
     */
    public function storeFacture(Request $request)
    {
        $data = $this->extractFormData($request);
        $facture = $this->invoiceService->storeFacture($data);

        return redirect()->route('admin.imprimer_facture', ['id' => $facture->id])->with([
            'message' => 'Facture enregistrée avec succès',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Update an existing facture.
     */
    public function updateFacture(Request $request, int $id)
    {
        $data = $this->extractFormData($request);
        $facture = $this->invoiceService->updateFacture($id, $data);

        return redirect()->route('admin.imprimer_facture', ['id' => $facture->id])->with([
            'message' => 'Facture mise à jour avec succès',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Edit facture form.
     */
    public function editFacture(int $id)
    {
        $facture = Facture::findOrFail($id);
        $detailsFacture = DetailsFacture::where('facture_id', $id)->get();
        $produits = Product::all();

        return view('admin.facture', [
            'facture' => $facture,
            'edit_length' => $detailsFacture->count(),
            'details_facture' => $detailsFacture,
            'edit' => true,
            'produits' => $produits,
        ]);
    }

    /**
     * Print facture view.
     */
    public function imprimerFacture(int $id)
    {
        $facture = Facture::findOrFail($id);
        $detailsFacture = DetailsFacture::where('facture_id', $id)->get();
        $produits = Product::all();

        return view('admin.imprimer_facture', [
            'facture' => $facture,
            'edit_length' => $detailsFacture->count(),
            'details_facture' => $detailsFacture,
            'edit' => true,
            'produits' => $produits,
        ]);
    }

    /**
     * Extract product data from the legacy form format (produit_id_1, qte1, etc.)
     */
    private function extractFormData(Request $request): array
    {
        $data = $request->all();
        $products = [];

        $nbAchat = (int) ($request->nb_achat ?? 0);
        $nbDelete = (int) ($request->nb_delete ?? 0);

        for ($i = 1; $i <= $nbAchat + $nbDelete; $i++) {
            $produitId = $request->input('produit_id_' . $i);
            $qte = $request->input('qte' . $i);

            if ($produitId && $qte) {
                $products[] = [
                    'produit_id' => $produitId,
                    'qte' => $qte,
                    'prix_unitaire' => $request->input('prix_unitaire' . $i),
                ];
            }
        }

        $data['products'] = $products;

        return $data;
    }
}
