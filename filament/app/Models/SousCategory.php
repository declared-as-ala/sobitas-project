<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SousCategory extends Model
{
    protected $table = 'sous_categories';

    protected $guarded = ['id'];

    public function categorie(): BelongsTo
    {
        return $this->belongsTo(Categ::class, 'categorie_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'sous_categorie_id');
    }
}
