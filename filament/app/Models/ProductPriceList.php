<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductPriceList extends Model
{
    protected $table = 'product_price_lists';

    protected $guarded = ['id'];

    protected $casts = [
        'prix_total' => 'float',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(DetailsProductPriceList::class, 'product_price_list_id');
    }
}
