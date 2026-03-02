<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class NumberSequence extends Model
{
    protected $table = 'number_sequences';

    protected $fillable = ['name', 'year', 'last_number'];

    protected $casts = [
        'year' => 'integer',
        'last_number' => 'integer',
    ];

    /**
     * Get next number for the given prefix and year (e.g. BL, 2026) with lock.
     */
    public static function getNextFor(string $name, int $year): int
    {
        return (int) DB::transaction(function () use ($name, $year) {
            $seq = self::where('name', $name)->where('year', $year)->lockForUpdate()->first();
            if (!$seq) {
                $seq = self::create(['name' => $name, 'year' => $year, 'last_number' => 0]);
            }
            $seq->increment('last_number');
            return $seq->fresh()->last_number;
        });
    }
}
