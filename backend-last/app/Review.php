<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

use App\Models\User;

class Review extends Model
{
    protected $hidden = [
        'updated_at','publier'
    ];

    public function user(){
        return $this->belongsTo(User::class );
    }
}
