<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = [
        'designation_fr',
        'slug',
        'description',
        'cover',
        'publier',
        'meta_title',
        'meta_description',
    ];

    protected function casts(): array
    {
        return [
            'publier' => 'boolean',
        ];
    }

    public function scopePublished($query)
    {
        return $query->where('publier', 1);
    }
}
