<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\DetailsFactureTva;
use App\Models\DetailsQuotation;
use App\Models\FactureTva;
use App\Models\Product;
use App\Models\Quotation;
use App\Services\InvoiceService;
use Illuminate\Http\Request;

class AdminFacturationTvaController extends Controller
{
    public function __construct(
        private readonly InvoiceService $invoiceService,
    ) {}

    // ─── Facture TVA ────────────────────────────────────────────────

    /**
     * Show the facture TVA creation form.
     */
    public function showFacture()
    {
        $edit = 0;
        $produits = Product::where('qte', '>', 0)->get();

        return view('admin.facture_tva', ['edit' => $edit, 'produits' => $produits]);
    }

    /**
     * Store a new facture TVA.
     */
    public function storeFacture(Request $request)
    {
        $data = $this->extractFormData($request);
        $factureTva = $this->invoiceService->storeFactureTva($data);

        return redirect()->route('admin.imprimer_facture_tva', ['id' => $factureTva->id])->with([
            'message' => 'Facture TVA enregistrée avec succès',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Update an existing facture TVA.
     */
    public function updateFacture(Request $request, int $id)
    {
        $data = $this->extractFormData($request);
        $factureTva = $this->invoiceService->updateFactureTva($id, $data);

        return redirect()->route('admin.imprimer_facture_tva', ['id' => $factureTva->id])->with([
            'message' => 'Facture TVA mise à jour avec succès',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Edit facture TVA form.
     */
    public function editFacture(int $id)
    {
        $facture = FactureTva::findOrFail($id);
        $detailsFacture = DetailsFactureTva::where('facture_tva_id', $id)->get();
        $produits = Product::all();

        return view('admin.facture_tva', [
            'facture' => $facture,
            'edit_length' => $detailsFacture->count(),
            'details_facture' => $detailsFacture,
            'edit' => true,
            'produits' => $produits,
        ]);
    }

    /**
     * Print facture TVA view.
     */
    public function imprimerFacture(int $id)
    {
        $facture = FactureTva::findOrFail($id);
        $detailsFacture = DetailsFactureTva::where('facture_tva_id', $id)->get();
        $produits = Product::all();

        return view('admin.imprimer_facture_tva', [
            'facture' => $facture,
            'edit_length' => $detailsFacture->count(),
            'details_facture' => $detailsFacture,
            'edit' => true,
            'produits' => $produits,
        ]);
    }

    // ─── Quotations (Devis) ─────────────────────────────────────────

    /**
     * Show quotation creation form.
     */
    public function showQuotations()
    {
        $edit = 0;
        $produits = Product::where('qte', '>', 0)->get();

        return view('admin.quotations', ['edit' => $edit, 'produits' => $produits]);
    }

    /**
     * Store a new quotation.
     */
    public function storeQuotations(Request $request)
    {
        $data = $this->extractFormData($request);
        $quotation = $this->invoiceService->storeQuotation($data);

        return redirect()->route('admin.imprimer_quotations', ['id' => $quotation->id])->with([
            'message' => 'Devis enregistré avec succès',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Update an existing quotation.
     */
    public function updateQuotations(Request $request, int $id)
    {
        $data = $this->extractFormData($request);
        $quotation = $this->invoiceService->updateQuotation($id, $data);

        return redirect()->route('admin.imprimer_quotations', ['id' => $quotation->id])->with([
            'message' => 'Devis mis à jour avec succès',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Edit quotation form.
     */
    public function editQuotations(int $id)
    {
        $facture = Quotation::findOrFail($id);
        $detailsFacture = DetailsQuotation::where('quotation_id', $id)->get();
        $produits = Product::all();

        return view('admin.quotations', [
            'facture' => $facture,
            'edit_length' => $detailsFacture->count(),
            'details_facture' => $detailsFacture,
            'edit' => true,
            'produits' => $produits,
        ]);
    }

    /**
     * Print quotation view.
     */
    public function imprimerQuotations(int $id)
    {
        $facture = Quotation::findOrFail($id);
        $detailsFacture = DetailsQuotation::where('quotation_id', $id)->get();
        $produits = Product::all();

        return view('admin.imprimer_quotations', [
            'facture' => $facture,
            'edit_length' => $detailsFacture->count(),
            'details_facture' => $detailsFacture,
            'edit' => true,
            'produits' => $produits,
        ]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────

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
