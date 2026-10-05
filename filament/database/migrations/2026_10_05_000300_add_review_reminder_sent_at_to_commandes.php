<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `commandes.review_reminder_sent_at` — the per-order marker of the ONE review reminder email.
 *
 * `reviews:send-due-requests` sends a second, last email to a delivered order whose first review
 * request went out `reviews.reminder_after_days` days ago and that still has no linked review. The
 * marker is what makes that "at most once": the pass selects `review_reminder_sent_at IS NULL` and
 * stamps it only after the mail was handed to the mailer.
 *
 * Separate from `review_request_sent_at` (the first email) and `review_request_sms_sent_at` (the
 * SMS) for the same reason those two are separate: each channel and each step is asked at most
 * once, and one marker cannot say which of them already happened.
 *
 * Nullable, no default, no backfill: every existing order starts "not reminded", and the pass's
 * own window (first email >= 5 days ago, delivery <= 45 days ago) bounds who can receive one.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('commandes') || Schema::hasColumn('commandes', 'review_reminder_sent_at')) {
            return;
        }

        Schema::table('commandes', function (Blueprint $table): void {
            $table->timestamp('review_reminder_sent_at')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('commandes') || ! Schema::hasColumn('commandes', 'review_reminder_sent_at')) {
            return;
        }

        Schema::table('commandes', function (Blueprint $table): void {
            $table->dropColumn('review_reminder_sent_at');
        });
    }
};
