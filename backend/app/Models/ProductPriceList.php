<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductPriceList extends Model
{
    protected $table = 'product_price_lists';

    protected $fillable = ['designation'];

    public function details(): HasMany
    {
        return $this->hasMany(DetailsProductPriceList::class, 'product_price_list_id');
    }
}
