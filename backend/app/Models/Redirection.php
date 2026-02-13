<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Redirection extends Model
{
    protected $fillable = ['source', 'destination'];

    protected $hidden = [
        'id',
        'created_at',
        'updated_at',
    ];
}
