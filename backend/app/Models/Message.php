<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'msg_welcome',
        'msg_passez_commande',
        'msg_etat_commande',
    ];
}
