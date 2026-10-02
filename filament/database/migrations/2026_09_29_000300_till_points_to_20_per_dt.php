<?php

use App\Services\TillPointsConversion;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Log;

/**
 * The shop-till card moves from 10 pts = 1 DT to 20 pts = 1 DT (same scale as online Protinas).
 * Every card's balance is DOUBLED once so its value in dinars does not change. The per-client work
 * (column guards for the legacy ledger, stored-balance-wins rule, marker) lives in
 * App\Services\TillPointsConversion, shared with `php artisan protinas:till-convert` so the same
 * conversion can be re-run from vps-run (task till-points-convert-apply).
 *
 * ⚠️ THIS MIGRATION MUST NEVER THROW. It runs inside the deploy's `migrate --force`; an exception
 * fails the whole backend release. So:
 *   - rate not 20     → nothing to convert, logged, return (the old rate is still in force);
 *   - a client fails  → counted; the others still convert; Log::critical names the failures and
 *                       `protinas:audit` lists every card left unconverted while the rate is 20.
 * Idempotent: a client that already carries the marker row is skipped.
 */
return new class extends Migration
{
    public function up(): void
    {
        try {
            $result = app(TillPointsConversion::class)->run();
        } catch (\Throwable $e) {
            Log::critical('till points conversion crashed: cards were NOT doubled; run vps-run till-points-convert-apply', [
                'error' => $e->getMessage(),
            ]);

            return;
        }

        if ($result['failed'] > 0) {
            Log::critical('till points conversion: some cards were NOT doubled while the till now runs at 20 pts = 1 DT; run vps-run till-points-convert-apply', $result);

            return;
        }
        Log::info('till points conversion', $result);
    }

    public function down(): void
    {
        // Value-preserving and logged; not reversed automatically.
    }
};
