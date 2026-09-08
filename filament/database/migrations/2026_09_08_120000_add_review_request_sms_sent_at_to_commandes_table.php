<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `commandes.review_request_sms_sent_at` — the once-only guard for the review request BY SMS.
 *
 * ── WHY A SECOND COLUMN AND NOT THE EXISTING ONE ────────────────────────────────────────────
 * `review_request_sent_at` means "this order was emailed". Reusing it for the text message would
 * make the two channels indistinguishable, and this shop needs them apart in both directions:
 *
 *   - two of the three orders currently due have NO usable email address (cash on delivery, phone
 *     confirmed, email left blank or mistyped). They must be reachable by SMS while
 *     `review_request_sent_at` stays null forever, because no email was ever sent;
 *   - the 33 orders emailed on 08/09/2026 already carry `review_request_sent_at`. They were never
 *     texted — the SMS path was off — and folding the channels together would mark them "asked"
 *     and lock them out of the one channel that actually reaches them.
 *
 * So: one column per channel, each stamped by the sender that owns it, each gating only its own
 * sweep. An order can legitimately end up with one, the other, or both.
 *
 * NO ->after(): per 2026_07_13_000003, the legacy `commandes` table has been missing after-targets
 * before, and a missing after-target makes ADD COLUMN throw, which aborts `migrate --force` and
 * silently blocks every later migration. Column position is cosmetic. Guarded by hasColumn so it
 * is safe to re-run.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('commandes') || Schema::hasColumn('commandes', 'review_request_sms_sent_at')) {
            return;
        }

        Schema::table('commandes', function (Blueprint $table) {
            $table->timestamp('review_request_sms_sent_at')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('commandes') || ! Schema::hasColumn('commandes', 'review_request_sms_sent_at')) {
            return;
        }

        Schema::table('commandes', function (Blueprint $table) {
            $table->dropColumn('review_request_sms_sent_at');
        });
    }
};
