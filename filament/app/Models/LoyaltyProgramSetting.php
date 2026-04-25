<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Single-row overrides for {@see config('loyalty')}. Merged at runtime via {@see self::merged()}.
 */
class LoyaltyProgramSetting extends Model
{
    protected $table = 'loyalty_program_settings';

    protected $fillable = ['options'];

    protected $casts = [
        'options' => 'array',
    ];

    /** @var array<string, mixed>|null */
    protected static ?array $mergedCache = null;

    public static function forgetMergedCache(): void
    {
        self::$mergedCache = null;
    }

    /**
     * @return array<string, mixed>
     */
    public static function merged(): array
    {
        if (self::$mergedCache !== null) {
            return self::$mergedCache;
        }

        $base = config('loyalty', []);
        $row  = static::query()->first();
        if (! $row) {
            self::$mergedCache = $base;

            return self::$mergedCache;
        }

        $opts = is_array($row->options) ? $row->options : [];

        self::$mergedCache = array_merge($base, $opts);

        return self::$mergedCache;
    }

    public static function val(string $key, mixed $default = null): mixed
    {
        return data_get(self::merged(), $key, $default);
    }

    public static function singleton(): self
    {
        return static::query()->firstOrFail();
    }
}
