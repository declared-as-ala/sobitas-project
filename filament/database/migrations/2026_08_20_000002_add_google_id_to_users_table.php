<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Link a customer account to the Google account that signs into it.
 *
 * WHY A COLUMN AND NOT "MATCH ON EMAIL EVERY TIME"
 * Matching on email alone works right up until someone changes the email on their Protein.tn
 * account — at which point their Google sign-in silently creates a SECOND account and their order
 * history disappears from under them. The `sub` claim in a Google ID token is stable for the life
 * of the Google account and never changes, even when the address on it does. That is the identity
 * we store; the email is only ever used to find an existing account the first time.
 *
 * Nullable, because every account that exists today has no Google link and most never will.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'google_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            // Google's `sub` is a numeric string of up to 255 chars by spec (21 in practice).
            // `unique` is the point of the column: one Google account, one user row.
            $table->string('google_id', 64)->nullable()->unique()->after('email');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'google_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id']);
            $table->dropColumn('google_id');
        });
    }
};
