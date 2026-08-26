<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationDelivery extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'attempts' => 'integer',
        'sent_at' => 'datetime',
    ];
}
