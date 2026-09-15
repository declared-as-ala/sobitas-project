<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fix: public affiliate signups as "individual" (the DEFAULT public type) fail with
 * SQLSTATE[01000] 1265 "Data truncated for column 'type'" → HTTP 500.
 *
 * The live `affilies.type` column is a MySQL ENUM inherited from the old Partner schema
 * (built for coach|gym only). It rejects 'individual' and 'marketer' — the two types added
 * later for the public /partenaires form. The create migration declares `string('type', 16)`,
 * but the production column (restored from an older backup that predates that intent) is still
 * the narrower enum, so inserting 'individual' truncates to '' and, under strict mode, throws.
 *
 * The accepted type set is already enforced at the application layer (App\Enums\AffilieType +
 * Rule::in on the public endpoint), so the column only needs to be a plain string. Widen it to
 * VARCHAR(32). Existing 'coach'/'gym' rows keep their value unchanged (enum → varchar preserves
 * the label). Verified root cause: coach → 201, individual → 500 (1265) on the live endpoint.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('affilies', 'type')) {
            return;
        }

        // Raw MODIFY: an enum→varchar change is not expressible through the schema builder
        // without doctrine/dbal. Idempotent — re-running on an already-VARCHAR column is a no-op.
        DB::statement('ALTER TABLE `affilies` MODIFY `type` VARCHAR(32) NOT NULL');
    }

    public function down(): void
    {
        // Intentionally irreversible: restoring the narrow enum would re-break 'individual'
        // signups. Leaving the column as VARCHAR is strictly safer and loses no data.
    }
};
