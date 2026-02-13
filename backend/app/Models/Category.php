<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $table = 'categs';

    protected $fillable = [
        'designation_fr',
        'slug',
        'cover',
    ];

    public function sousCategories(): HasMany
    {
        return $this->hasMany(SousCategory::class, 'categorie_id');
    }

    // Keep alias for backward compat
    public function sous_categories(): HasMany
    {
        return $this->sousCategories();
    }
}
