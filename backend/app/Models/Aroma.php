<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Aroma extends Model
{
    protected $fillable = ['designation_fr'];

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_aromas');
    }
}
