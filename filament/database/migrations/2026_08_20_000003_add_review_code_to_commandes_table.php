<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A short alias for `order_token`, so the review link fits in one SMS.
 *
 * ── THE ARITHMETIC THAT FORCED THIS ─────────────────────────────────────────────────────────
 * `order_token` is `bin2hex(random_bytes(32))` — 64 characters. The review link built from it is
 *
 *     https://protein.tn/avis/2f8a…64 hex characters…c1   =  88 characters
 *
 * An SMS segment is 160 characters. Put that link in a message with a greeting, an order number
 * and a reason, and the message is 2–3 segments — every one of them billed — before a single word
 * of the actual request. And a raw 64-character hex string in a text message reads, correctly, as
 * something not to tap.
 *
 * 10 characters from a 32-symbol alphabet is 32^10 ≈ 1.1 × 10^15 possibilities. Guessing one is
 * not a realistic attack against a rate-limited endpoint, and it takes the same link down to 34
 * characters — one segment, with room for a sentence that sounds like a person wrote it.
 *
 * The long token is NOT replaced. Emails keep using it (there is no cost to length there and no
 * reason to weaken a link that already works), every link already sent stays valid, and the
 * review endpoints accept either. This is an alias, not a migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('commandes', 'review_code')) {
            return;
        }

        Schema::table('commandes', function (Blueprint $table) {
            $table->string('review_code', 16)->nullable()->unique()->after('order_token');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('commandes', 'review_code')) {
            return;
        }

        Schema::table('commandes', function (Blueprint $table) {
            $table->dropUnique(['review_code']);
            $table->dropColumn('review_code');
        });
    }
};
