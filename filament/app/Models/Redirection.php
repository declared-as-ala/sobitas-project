<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Redirection extends Model
{
    protected $table = 'redirections';

    protected $guarded = ['id'];

    protected $casts = [
        'code' => 'integer',
        'is_active' => 'boolean',
    ];

    /** Only rules the admin has left enabled. */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', 1);
    }
}
