<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets an affiliate REQUEST a payout-method change from their dashboard without being able to
 * change it themselves — the method stays "géré par l'équipe". The request lives on two nullable
 * columns; an admin approves it (copying it onto payment_method and clearing the request) or
 * refuses it (clearing the request) from the affiliate's profile. Additive only: no existing row
 * is touched, so this is safe to run on production.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('affilies')) {
            return;
        }

        Schema::table('affilies', function (Blueprint $table): void {
            if (! Schema::hasColumn('affilies', 'payment_method_requested')) {
                $table->string('payment_method_requested', 64)->nullable()->after('payment_method');
            }
            if (! Schema::hasColumn('affilies', 'payment_method_requested_at')) {
                $table->timestamp('payment_method_requested_at')->nullable()->after('payment_method_requested');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('affilies')) {
            return;
        }

        Schema::table('affilies', function (Blueprint $table): void {
            foreach (['payment_method_requested', 'payment_method_requested_at'] as $column) {
                if (Schema::hasColumn('affilies', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
