<?php

namespace App;

use Illuminate\Database\Eloquent\Model;


class Slide extends Model
{
    protected $hidden = [
        'id',
        'created_at',
        'updated_at',
    ];
}
