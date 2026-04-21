<?php

namespace App;

use Illuminate\Database\Eloquent\Model;


class SousCategory extends Model
{
    public function categorie(){
        return $this->belongsTo(Categ::class , 'categorie_id' , 'id');
    }
}
