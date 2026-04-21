<?php

namespace App;

use Illuminate\Database\Eloquent\Model;


class Product extends Model
{
    public function sous_categorie(){
        return $this->belongsTo(SousCategory::class , 'sous_categorie_id' , 'id');
    }

    public function tags(){
        return $this->belongsToMany(Tag::class , 'product_tags');
    }

    public function aromes(){
        return $this->belongsToMany(Aroma::class , 'product_aromas');
    }
    public function reviews(){
        return $this->hasMany(Review::class )->where('publier' , 1);
    }
}
