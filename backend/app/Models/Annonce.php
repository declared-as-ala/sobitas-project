<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Annonce extends Model
{
    protected $fillable = [
        'image_1', 'image_2', 'image_3', 'image_4', 'image_5', 'image_6',
        'link_img_1', 'link_img_2', 'link_img_3', 'link_img_4', 'link_img_5', 'link_img_6',
        'products_default_cover',
    ];
}
