<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coordinate extends Model
{
    protected $fillable = [
        'name', 'adresse', 'email', 'phone_1', 'phone_2',
        'fax', 'facebook', 'instagram', 'youtube', 'tva',
        'logo', 'logo_2',
    ];

    protected function casts(): array
    {
        return [
            'tva' => 'decimal:2',
        ];
    }
}
