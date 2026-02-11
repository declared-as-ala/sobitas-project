<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetailsProductPriceList extends Model
{
    protected $table = 'details_product_price_lists';

    protected $guarded = ['id'];

    protected $casts = [
        'quantite' => 'integer',
        'prix_unitaire' => 'float',
    ];

    public $timestamps = false;

    public function priceList(): BelongsTo
    {
        return $this->belongsTo(ProductPriceList::class, 'product_price_list_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'produit_id');
    }
}
