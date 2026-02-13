<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => 'required|integer|exists:produits,id',
            'stars' => 'nullable|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ];
    }
}
