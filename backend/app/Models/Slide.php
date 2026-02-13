<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Slide extends Model
{
    protected $fillable = [
        'image',
        'link',
        'type',
        'order',
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];
}
