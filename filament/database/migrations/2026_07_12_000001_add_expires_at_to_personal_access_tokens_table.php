<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Laravel Sanctum ^4.0's HasApiTokens::createToken() INSERTs an `expires_at` value, but the live
 * `personal_access_tokens` table was created by the old (pre-3.3) migration that has no such column.
 * Result: every createToken() threw "Unknown column 'expires_at'" → HTTP 500 on BOTH /login and
 * /register (they each mint a token). That fully blocked signup AND login.
 *
 * This idempotent migration adds the missing column on the production DB (the original create
 * migration is already marked "run", so editing it alone would never reach prod).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (
            Schema::hasTable('personal_access_tokens')
            && ! Schema::hasColumn('personal_access_tokens', 'expires_at')
        ) {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                $table->timestamp('expires_at')->nullable()->after('last_used_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('personal_access_tokens', 'expires_at')) {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                $table->dropColumn('expires_at');
            });
        }
    }
};
