<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class ProductAroma extends Pivot
{
    protected $table = 'product_aromas';

    public $timestamps = false;
}
