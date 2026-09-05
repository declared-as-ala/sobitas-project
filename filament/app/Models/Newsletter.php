<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Newsletter extends Model
{
    protected $table = 'newsletters';

    protected $guarded = ['id'];

    protected $casts = [
        'confirmed_at' => 'datetime',
        'confirmation_sent_at' => 'datetime',
        'unsubscribed_at' => 'datetime',
    ];

    public function scopeSubscribed($query)
    {
        return $query->whereNotNull('confirmed_at')->whereNull('unsubscribed_at');
    }
}
