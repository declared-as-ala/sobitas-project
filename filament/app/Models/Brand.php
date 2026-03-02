<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    protected $table = 'brands';

    protected $guarded = ['id'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'brand_id');
    }
}
