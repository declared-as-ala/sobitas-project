<?php

namespace App;

use Illuminate\Database\Eloquent\Model;


class Redirection extends Model
{
    protected $hidden = [
        'id',
        'created_at',
        'updated_at',
    ];
}
