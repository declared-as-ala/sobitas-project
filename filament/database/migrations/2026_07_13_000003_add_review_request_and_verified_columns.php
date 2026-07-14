<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Supports the post-delivery review-request engine:
 *  - commandes.review_request_sent_at : once-only guard so a delivered order
 *    triggers exactly one review-request email.
 *  - reviews.commande_id + reviews.verified : link a review to the order it came
 *    from (enables "Achat vérifié" and dedupe of one review per order+product).
 *
 * Idempotent (guarded by Schema::hasColumn) — safe to run repeatedly.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('commandes') && ! Schema::hasColumn('commandes', 'review_request_sent_at')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->timestamp('review_request_sent_at')->nullable()->after('sms_sent');
            });
        }

        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                if (! Schema::hasColumn('reviews', 'commande_id')) {
                    $table->unsignedBigInteger('commande_id')->nullable()->index()->after('product_id');
                }
                if (! Schema::hasColumn('reviews', 'verified')) {
                    $table->boolean('verified')->default(false)->after('publier');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('commandes') && Schema::hasColumn('commandes', 'review_request_sent_at')) {
            Schema::table('commandes', function (Blueprint $table) {
                $table->dropColumn('review_request_sent_at');
            });
        }
        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                foreach (['commande_id', 'verified'] as $col) {
                    if (Schema::hasColumn('reviews', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
