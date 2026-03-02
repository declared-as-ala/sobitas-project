<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Message extends Model
{
    protected $table = 'messages';

    protected $guarded = ['id'];

    /**
     * Get the singleton SMS template record with caching.
     * This table has only 1 row and rarely changes.
     */
    public static function getCached(): ?self
    {
        return Cache::remember('message:template', 3600, function () {
            return static::first();
        });
    }

    /**
     * Clear the cache when the model is saved or deleted.
     */
    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('message:template'));
        static::deleted(fn () => Cache::forget('message:template'));
    }
}
