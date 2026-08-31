<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailVerificationOtp extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'attempts' => 'integer',
        'expires_at' => 'datetime',
        'consumed_at' => 'datetime',
    ];
}
