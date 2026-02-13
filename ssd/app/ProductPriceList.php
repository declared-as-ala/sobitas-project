<?php

namespace App;

use Illuminate\Database\Eloquent\Model;


class ProductPriceList extends Model
{
    protected $table = 'product_price_lists';

    protected $fillable = [
        'designation',
    ];

    /**
     * Get the details for this price list.
     */
    public function details()
    {
        return $this->hasMany(DetailsProductPriceList::class, 'product_price_list_id');
    }
}
