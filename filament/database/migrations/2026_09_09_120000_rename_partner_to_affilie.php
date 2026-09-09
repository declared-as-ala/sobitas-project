<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rename the whole Partner module to Affilié.
 *
 * ── WHY A MIGRATION AND NOT AN EDIT OF THE ORIGINALS ────────────────────────────────────────
 * Laravel records applied migrations by FILENAME in the `migrations` table. Renaming
 * 2026_05_07_120000_create_partners_table.php would make Laravel consider it unseen and run it
 * again on the next deploy — creating a table that already exists, or worse, re-running column
 * additions. The original migrations are historical records and are deliberately untouched.
 *
 * ── WHY EVERY STEP IS GUARDED ───────────────────────────────────────────────────────────────
 * At the time of writing the production database is unavailable (the VPS was compromised and
 * suspended) and will be restored from a backup taken roughly three weeks earlier. That backup
 * predates some of the columns below. This migration therefore asserts nothing about what exists:
 * every rename checks first, so it is safe to run against the old backup, a fresh build, or a
 * database that has already been partly renamed. Running it twice is a no-op.
 *
 * `renameColumn` needs doctrine/dbal on older Laravel; on Laravel 12 it is native, so no extra
 * dependency is pulled in.
 */
return new class extends Migration
{
    /** table => new name */
    private const TABLES = [
        'partners' => 'affilies',
        'partner_codes' => 'affilie_codes',
        'partner_transactions' => 'affilie_transactions',
        'partner_payouts' => 'affilie_payouts',
        'partner_commission_transactions' => 'affilie_commission_transactions',
    ];

    /**
     * Columns to rename, keyed by the table they live on AFTER the table rename above.
     * `coupons` and `tickets` are not partner tables but carry partner-named columns.
     */
    private const COLUMNS = [
        'affilies' => [],
        'affilie_codes' => ['partner_id' => 'affilie_id'],
        'affilie_payouts' => ['partner_id' => 'affilie_id'],
        'affilie_transactions' => [
            'partner_id' => 'affilie_id',
            'partner_code_id' => 'affilie_code_id',
        ],
        'affilie_commission_transactions' => [
            'partner_id' => 'affilie_id',
            'partner_code_id' => 'affilie_code_id',
        ],
        'coupons' => [
            'partner_id' => 'affilie_id',
            'is_partner_code' => 'is_affilie_code',
            'partner_commission_rate' => 'affilie_commission_rate',
        ],
        'tickets' => [
            'partner_id' => 'affilie_id',
            'partner_code_id' => 'affilie_code_id',
            'partner_code_fk' => 'affilie_code_fk',
            'partner_code_snapshot' => 'affilie_code_snapshot',
            'partner_discount_amount' => 'affilie_discount_amount',
            'partner_commission_amount' => 'affilie_commission_amount',
            'partner_commission_base' => 'affilie_commission_base',
            'partner_commission_rate' => 'affilie_commission_rate',
            'partner_commission_processed_at' => 'affilie_commission_processed_at',
        ],
    ];

    public function up(): void
    {
        foreach (self::TABLES as $from => $to) {
            if (Schema::hasTable($from) && ! Schema::hasTable($to)) {
                Schema::rename($from, $to);
            }
        }

        foreach (self::COLUMNS as $table => $map) {
            if (! Schema::hasTable($table) || $map === []) {
                continue;
            }
            Schema::table($table, function (Blueprint $t) use ($table, $map): void {
                foreach ($map as $from => $to) {
                    // Both checks matter: the source must exist AND the destination must not,
                    // so a partially-applied run resumes instead of throwing.
                    if (Schema::hasColumn($table, $from) && ! Schema::hasColumn($table, $to)) {
                        $t->renameColumn($from, $to);
                    }
                }
            });
        }
    }

    public function down(): void
    {
        foreach (self::COLUMNS as $table => $map) {
            if (! Schema::hasTable($table) || $map === []) {
                continue;
            }
            Schema::table($table, function (Blueprint $t) use ($table, $map): void {
                foreach ($map as $from => $to) {
                    if (Schema::hasColumn($table, $to) && ! Schema::hasColumn($table, $from)) {
                        $t->renameColumn($to, $from);
                    }
                }
            });
        }

        foreach (array_reverse(self::TABLES, true) as $from => $to) {
            if (Schema::hasTable($to) && ! Schema::hasTable($from)) {
                Schema::rename($to, $from);
            }
        }
    }
};
