<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SousCategory extends Model
{
    protected $table = 'sous_categories';

    protected $fillable = [
        'designation_fr',
        'slug',
        'categorie_id',
    ];

    public function categorie(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'categorie_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'sous_categorie_id');
    }
}
