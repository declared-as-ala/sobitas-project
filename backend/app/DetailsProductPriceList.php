<?php

namespace App;

use Illuminate\Database\Eloquent\Model;


class DetailsProductPriceList extends Model
{
    protected $table = 'details_product_price_lists';

    protected $fillable = [
        'product_price_list_id',
        'product_id',
        'prix_unitaire',
        'prix_gros',
    ];

    /**
     * Get the price list that owns this detail.
     */
    public function priceList()
    {
        return $this->belongsTo(ProductPriceList::class, 'product_price_list_id');
    }

    /**
     * Get the product associated with this detail.
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
