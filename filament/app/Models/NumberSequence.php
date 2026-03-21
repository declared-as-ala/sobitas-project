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
     * Get next number for the given prefix and year (e.g. CMD, 2026) with lock.
     *
     * Uses INSERT IGNORE before lockForUpdate so concurrent requests never both
     * see "no row" and try to create it simultaneously (which would produce a
     * race condition despite the UNIQUE constraint on name+year).
     */
    public static function getNextFor(string $name, int $year): int
    {
        return (int) DB::transaction(function () use ($name, $year) {
            // Ensure the row exists (INSERT IGNORE is a no-op if it already does).
            DB::statement(
                'INSERT IGNORE INTO number_sequences (name, year, last_number, created_at, updated_at)
                 VALUES (?, ?, 0, NOW(), NOW())',
                [$name, $year]
            );

            // Lock the row for the duration of this transaction then increment.
            $seq = self::where('name', $name)->where('year', $year)->lockForUpdate()->firstOrFail();
            $seq->increment('last_number');

            return $seq->fresh()->last_number;
        });
    }
}
