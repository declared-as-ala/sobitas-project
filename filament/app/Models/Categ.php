<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Categ extends Model
{
    protected $table = 'categs';

    protected $fillable = [
        'designation_fr',
        'slug',
        'cover',
        'meta_title',
        'meta_description',
    ];

    public function sousCategories(): HasMany
    {
        return $this->hasMany(SousCategory::class, 'categorie_id');
    }

    public function products()
    {
        return Product::whereIn('sous_categorie_id', $this->sousCategories()->pluck('id'));
    }
}
