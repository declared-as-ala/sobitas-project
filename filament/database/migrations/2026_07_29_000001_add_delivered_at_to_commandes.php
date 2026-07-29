<?php

use App\Services\PointsService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * commandes.delivered_at — when the order actually reached a delivered status.
 *
 * The review-request email is moving from "the instant the admin flips the status" to
 * "N days after delivery", so the customer has actually tried the product before being asked.
 * That needs a delivery timestamp and the table has none. `updated_at` is not a substitute:
 * any later admin edit bumps it, which would silently postpone — or re-arm — the request.
 *
 * RAW SQL ON PURPOSE. Schema::hasColumn has twice returned false on this database for columns
 * that demonstrably exist, which turned two guarded migrations into silent no-ops. Asking MySQL
 * directly and treating "duplicate column" as success is the only idempotence that has held here.
 */
return new class extends Migration
{
    public function up(): void
    {
        // No ->after(): the legacy `commandes` table has repeatedly lacked assumed after-targets,
        // and a missing target makes ADD COLUMN throw, which aborts `migrate --force` and blocks
        // every migration queued behind it. Column position is cosmetic.
        try {
            DB::statement('ALTER TABLE `commandes` ADD COLUMN `delivered_at` TIMESTAMP NULL DEFAULT NULL');
        } catch (\Throwable $e) {
            // 1060 = duplicate column, i.e. already applied. Anything else is worth seeing, but
            // must never abort the run.
            if (! str_contains($e->getMessage(), '1060')) {
                Log::error('add commandes.delivered_at failed (continuing)', ['error' => $e->getMessage()]);
            }
        }

        try {
            DB::statement('CREATE INDEX `idx_commandes_delivered_at` ON `commandes` (`delivered_at`)');
        } catch (\Throwable $e) {
            if (! str_contains($e->getMessage(), '1061')) { // 1061 = duplicate key
                Log::error('index commandes.delivered_at failed (continuing)', ['error' => $e->getMessage()]);
            }
        }

        // Backfill already-delivered orders with `updated_at` as the best available estimate.
        //
        // Without this every historical order would read delivered_at = NULL, and a sweep that
        // treats NULL as "not delivered yet" would ignore them forever, while one that treats it
        // as "delivered now" would queue the entire back catalogue for email at once. Neither is
        // acceptable, so we write the honest approximation and let the sweep's age window decide.
        try {
            $placeholders = implode(',', array_fill(0, count(PointsService::DELIVERED_STATUSES), '?'));
            DB::update(
                "UPDATE `commandes` SET `delivered_at` = `updated_at`
                 WHERE `delivered_at` IS NULL AND `etat` IN ({$placeholders})",
                PointsService::DELIVERED_STATUSES
            );
        } catch (\Throwable $e) {
            Log::error('backfill commandes.delivered_at failed (continuing)', ['error' => $e->getMessage()]);
        }
    }

    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE `commandes` DROP COLUMN `delivered_at`');
        } catch (\Throwable $e) {
            // already gone
        }
    }
};
