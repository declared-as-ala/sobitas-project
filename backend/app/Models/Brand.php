<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brand extends Model
{
    protected $fillable = [
        'designation_fr',
        'logo',
        'alt_cover',
    ];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
