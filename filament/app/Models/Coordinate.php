<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Coordinate extends Model
{
    protected $table = 'coordinates';

    protected $guarded = ['id'];

    /**
     * Get the singleton coordinate record with caching.
     * This table has only 1 row and rarely changes.
     */
    public static function getCached(): ?self
    {
        return Cache::remember('coordinate:singleton', 3600, function () {
            return static::first();
        });
    }

    /**
     * Clear the cache when the model is saved or deleted.
     */
    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('coordinate:singleton'));
        static::deleted(fn () => Cache::forget('coordinate:singleton'));
    }
}
