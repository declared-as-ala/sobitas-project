<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommandeApiRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Public API endpoint
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'commande' => ['required', 'array'],
            'commande.livraison_nom' => ['nullable', 'string', 'max:255'],
            'commande.livraison_prenom' => ['nullable', 'string', 'max:255'],
            'commande.livraison_email' => ['nullable', 'email', 'max:255'],
            'commande.livraison_phone' => ['nullable', 'string', 'max:20'],
            'commande.livraison_region' => ['nullable', 'string', 'max:255'],
            'commande.livraison_ville' => ['nullable', 'string', 'max:255'],
            'commande.livraison_code_postale' => ['nullable', 'string', 'max:10'],
            'commande.livraison_adresse1' => ['nullable', 'string', 'max:500'],
            'commande.livraison_adresse2' => ['nullable', 'string', 'max:500'],
            'commande.livraison' => ['nullable', 'string', 'max:255'],
            'commande.frais_livraison' => ['nullable', 'numeric', 'min:0'],
            'commande.note' => ['nullable', 'string', 'max:1000'],
            'panier' => ['required', 'array', 'min:1'],
            'panier.*.produit_id' => ['required', 'integer', 'exists:products,id'],
            'panier.*.quantite' => ['required', 'integer', 'min:1'],
            'panier.*.prix_unitaire' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'panier.required' => 'Le panier ne peut pas être vide.',
            'panier.min' => 'Le panier doit contenir au moins un produit.',
            'panier.*.produit_id.exists' => 'Le produit sélectionné n\'existe pas.',
            'panier.*.quantite.min' => 'La quantité doit être au moins 1.',
            'panier.*.prix_unitaire.min' => 'Le prix unitaire ne peut pas être négatif.',
        ];
    }
}
