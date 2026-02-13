<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommandeApiRequest;
use App\Models\Commande;
use App\Models\CommandeDetail;
use App\Models\Product;
use App\Services\OrderService;
use Illuminate\Http\Request;

class AdminCommandeController extends Controller
{
    public function __construct(
        private readonly OrderService $orderService,
    ) {}

    /**
     * Show commande creation form (admin).
     */
    public function showFacture()
    {
        $edit = 0;
        $produits = Product::where('qte', '>', 0)->get();

        return view('admin.facture', ['edit' => $edit, 'produits' => $produits]);
    }

    /**
     * Store a new commande (admin form).
     */
    public function storeFacture(Request $request)
    {
        $data = $this->extractFormData($request);
        $data['etat'] = 'Nouvelle Commande';

        $commande = $this->orderService->storeCommandeAdmin($data);

        return redirect()->route('admin.imprimer_commande', ['id' => $commande->id])->with([
            'message' => 'Commande enregistrée avec succès',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Store a new commande from API request (frontend).
     */
    public function storeCommandeApi(StoreCommandeApiRequest $request): array
    {
        $commande = $this->orderService->createFromApi($request->validated());

        return [
            'id' => $commande->id,
            'message' => 'Merci pour votre commande',
            'alert-type' => 'success',
        ];
    }

    /**
     * Update an existing commande (admin form).
     */
    public function updateFacture(Request $request, int $id)
    {
        $data = $this->extractFormData($request);
        $data['etat'] = $request->etat;
        $data['adresse1'] = $request->adresse1;
        $data['note'] = $request->note;
        $data['livraison_adresse1'] = $request->livraison_adresse1;
        $data['send_notif'] = $request->send_notif;

        $commande = $this->orderService->updateCommande($id, $data);

        return redirect()->route('admin.imprimer_commande', ['id' => $commande->id])->with([
            'message' => 'Commande mise à jour avec succès',
            'alert-type' => 'success',
        ]);
    }

    /**
     * Edit commande form (admin).
     */
    public function editFacture(int $id)
    {
        $facture = Commande::findOrFail($id);
        $detailsFacture = CommandeDetail::where('commande_id', $id)->get();
        $produits = Product::all();

        return view('admin.commande', [
            'facture' => $facture,
            'edit_length' => $detailsFacture->count(),
            'details_facture' => $detailsFacture,
            'edit' => true,
            'produits' => $produits,
        ]);
    }

    /**
     * Print commande view (admin).
     */
    public function imprimerFacture(int $id)
    {
        $facture = Commande::findOrFail($id);
        $detailsFacture = CommandeDetail::where('commande_id', $id)->get();
        $produits = Product::all();

        return view('admin.imprimer_commande', [
            'facture' => $facture,
            'edit_length' => $detailsFacture->count(),
            'details_facture' => $detailsFacture,
            'edit' => true,
            'produits' => $produits,
        ]);
    }

    /**
     * Get commande details (API).
     */
    public function details(int $id): array
    {
        $facture = Commande::findOrFail($id);
        $detailsFacture = CommandeDetail::where('commande_id', $id)
            ->with('product')
            ->get();

        return [
            'facture' => $facture,
            'details_facture' => $detailsFacture,
        ];
    }

    /**
     * Extract product data from legacy form format.
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
