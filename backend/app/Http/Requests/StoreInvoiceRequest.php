<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvoiceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Will be replaced by Filament policies
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'nom' => ['nullable', 'string', 'max:255'],
            'prenom' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'remise' => ['nullable', 'numeric', 'min:0'],
            'pourcentage_remise' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tva' => ['nullable', 'numeric', 'min:0'],
            'timbre' => ['nullable', 'numeric', 'min:0'],
            'nb_achat' => ['nullable', 'integer', 'min:0'],
            'nb_delete' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
