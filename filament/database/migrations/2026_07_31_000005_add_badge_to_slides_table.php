<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optional short badge shown above the slide headline ("NOUVEAUTÉ", "PROMO", "-30%").
 *
 * The hero already renders titre / sous_titre / cta_label as real HTML over the artwork. The badge
 * is the one element of the approved hero design with nowhere to come from, and hardcoding it would
 * mean the owner cannot change or remove it without a deploy.
 *
 * Short on purpose: 24 chars. It renders as a small uppercase pill and anything longer wraps and
 * breaks the headline block it sits above.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('slides', function (Blueprint $table) {
            if (! Schema::hasColumn('slides', 'badge')) {
                $table->string('badge', 24)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('slides', function (Blueprint $table) {
            if (Schema::hasColumn('slides', 'badge')) {
                $table->dropColumn('badge');
            }
        });
    }
};
