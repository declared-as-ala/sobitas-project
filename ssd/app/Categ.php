<?php

namespace App;

use Illuminate\Database\Eloquent\Model;


class Categ extends Model
{
    public function sous_categories(){
        return $this->hasMany(SousCategory::class , 'categorie_id' , 'id');
    }
}
