<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class MarketingSetting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function get(string $key, mixed $default = null): mixed
    {
        try {
            $setting = Cache::remember("marketing_setting.{$key}", 300, function () use ($key) {
                return static::where('key', $key)->first();
            });
            return $setting?->value ?? $default;
        } catch (\Throwable) {
            return $default;
        }
    }

    public static function set(string $key, mixed $value): void
    {
        try {
            static::updateOrCreate(['key' => $key], ['value' => $value]);
            Cache::forget("marketing_setting.{$key}");
        } catch (\Throwable) {
            // Table may not exist yet
        }
    }
}
