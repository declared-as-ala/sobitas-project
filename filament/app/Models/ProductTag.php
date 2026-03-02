<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class ProductTag extends Pivot
{
    protected $table = 'product_tags';

    public $timestamps = false;
}
