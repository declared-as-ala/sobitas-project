<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Archive, not delete: staff put an order away rather than removing it.
 *
 * `archived_at` is a plain nullable timestamp — NOT Laravel SoftDeletes. The distinction matters:
 * SoftDeletes installs a GLOBAL scope, so every query for a Commande anywhere in the app (revenue
 * widgets, the API, affiliate commission jobs) would silently drop archived orders. Archiving is
 * meant to hide an order from the admin working list, not to erase it from the books. So the hiding
 * is applied only in CommandeResource's table filter; the data stays fully visible to everything
 * else that reads a Commande.
 *
 * Additive and idempotent: a nullable column added at the end of the table is an INSTANT change in
 * MySQL 8, and the guard means a re-run (or a partially-applied deploy) never errors.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('commandes', 'archived_at')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->timestamp('archived_at')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('commandes', 'archived_at')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->dropColumn('archived_at');
            });
        }
    }
};
