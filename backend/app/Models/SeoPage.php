<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoPage extends Model
{
    protected $fillable = [
        'page',
        'meta_title',
        'meta_description',
        'meta_keywords',
    ];

    protected $hidden = [
        'id',
        'created_at',
        'updated_at',
    ];
}
