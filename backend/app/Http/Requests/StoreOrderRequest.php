<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'commande' => 'required|array',
            'commande.livraison_nom' => 'nullable|string|max:255',
            'commande.livraison_prenom' => 'nullable|string|max:255',
            'commande.livraison_email' => 'nullable|email|max:255',
            'commande.livraison_phone' => 'nullable|string|max:20',
            'commande.livraison_region' => 'nullable|string|max:255',
            'commande.livraison_ville' => 'nullable|string|max:255',
            'commande.livraison_adresse1' => 'nullable|string|max:500',
            'commande.livraison' => 'nullable|integer',
            'commande.frais_livraison' => 'nullable|numeric|min:0',
            'panier' => 'required|array|min:1',
            'panier.*.produit_id' => 'required|integer|exists:produits,id',
            'panier.*.quantite' => 'required|integer|min:1',
            'panier.*.prix_unitaire' => 'required|numeric|min:0',
        ];
    }
}
