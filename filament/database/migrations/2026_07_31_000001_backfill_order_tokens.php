<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Give every existing order an order_token.
 *
 * Only the storefront checkout ever generated one, so orders created in the admin panel, by the
 * POS, or by import had none: 92 of 1,057 on the live database. The token is the only way to build
 * the login-free /avis/{token} review link, so roughly 91% of past customers could never have been
 * asked for a review — which is one half of why this shop has zero genuine reviews. (The other
 * half is that no order has ever been marked delivered.)
 *
 * Commande::booted() now sets it on creating(), so this is a one-time repair of history rather
 * than a recurring sweep.
 *
 * Chunked and idempotent: only rows with a NULL or empty token are touched, each gets its own
 * cryptographically random value, and re-running is a no-op. Deliberately uses the query builder
 * rather than Eloquent so no model events, observers or mail can fire while backfilling ~1,000
 * historical orders.
 */
return new class extends Migration
{
    public function up(): void
    {
        try {
            $updated = 0;

            do {
                $ids = DB::table('commandes')
                    ->where(function ($q) {
                        $q->whereNull('order_token')->orWhere('order_token', '');
                    })
                    ->limit(200)
                    ->pluck('id');

                foreach ($ids as $id) {
                    DB::table('commandes')
                        ->where('id', $id)
                        ->update(['order_token' => bin2hex(random_bytes(32))]);
                    $updated++;
                }
            } while ($ids->count() > 0);

            Log::info('order_token backfill complete', ['orders_updated' => $updated]);
        } catch (\Throwable $e) {
            // Never abort `migrate --force` over this — a missing token degrades one feature,
            // a failed migration blocks every migration queued behind it.
            Log::error('order_token backfill failed (continuing)', ['error' => $e->getMessage()]);
        }
    }

    public function down(): void
    {
        // Irreversible by design: clearing tokens would break every review link already emailed.
    }
};
