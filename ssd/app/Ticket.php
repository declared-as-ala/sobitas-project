<?php

namespace App;

use Illuminate\Database\Eloquent\Model;


class Ticket extends Model
{
    public function client(){
        return $this->belongsTo(Client::class , 'client_id' , 'id');
    }
}
