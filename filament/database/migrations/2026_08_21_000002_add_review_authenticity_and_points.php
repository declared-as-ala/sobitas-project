<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ── PAYING FOR REVIEWS CHANGES WHAT A FAKE REVIEW IS WORTH ──────────────────────────────────
 * Owner, 21/08/2026: *"make ppl can earn points by reviewing products, but make it smart to detect
 * if the review is real or just botting."*
 *
 * Those two halves are one feature, not two. A review on this site earns loyalty points; points
 * are redeemable at 20 to the dinar; so **a fake review mints currency**. Before this, the worst a
 * bot could do was put text on a page. After it, a bot that clears moderation is a printing press,
 * and every weakness in the filter has a cash value.
 *
 * That is why the columns below exist, and why the authenticity ones are not optional extras:
 *
 *   reviews.authenticity_score     0–100. What the checks below believed, kept so a decision can
 *                                  be re-examined months later instead of re-litigated.
 *   reviews.authenticity_signals   WHICH checks fired, as JSON. A score with no reasons is a
 *                                  number nobody can argue with, which is the wrong property for
 *                                  something that withholds money from a real customer.
 *   reviews.compose_ms             How long the form was open before submit. Stored rather than
 *                                  merely tested, because the useful threshold is one this
 *                                  catalogue's own distribution has to tell us — a number picked
 *                                  in advance is a number that is wrong for this shop.
 *   reviews.text_hash              Indexed hash of the normalised text — "has this paragraph been
 *                                  posted before, anywhere?" is the highest-signal bot check
 *                                  available and has to be O(1) to be affordable per submission.
 *   reviews.points_awarded         Belt to the ledger's braces (see below).
 *
 *   user_point_transactions.review_id   The dedupe key for a review award, and the exact mirror
 *                                       of how `commande_id` already dedupes order points:
 *                                       `where('review_id', X)->where('type','earn')->exists()`.
 *
 * ── WHY review_id AND NOT A NEW `type` ──────────────────────────────────────────────────────
 * `user_point_transactions.type` is an ENUM. Adding a value means ALTER TABLE on an enum, on a
 * legacy production database, for a distinction the description string already carries. A nullable
 * indexed column costs nothing and cannot fail the way an enum change can.
 *
 * ── WHY points_awarded EXISTS WHEN THE LEDGER ALREADY DEDUPES ───────────────────────────────
 * The ledger is authoritative and the flag is a cache. It is here because the alternative to
 * reading it is a query against `user_point_transactions` for every review rendered in an admin
 * list, and because a human reading the reviews table should be able to see, without a join,
 * which rows have been paid for.
 *
 * Idempotent and independently guarded, like every review migration before it.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->safeAdd('reviews', 'authenticity_score', fn (Blueprint $t) => $t->unsignedTinyInteger('authenticity_score')->nullable()->index());
        $this->safeAdd('reviews', 'authenticity_signals', fn (Blueprint $t) => $t->json('authenticity_signals')->nullable());
        $this->safeAdd('reviews', 'compose_ms', fn (Blueprint $t) => $t->unsignedInteger('compose_ms')->nullable());

        /*
         * SHA-1 of the review text, normalised (lowercased, punctuation and repeated whitespace
         * stripped). INDEXED, because the question it answers — "has this exact paragraph been
         * posted before, on any product, ever?" — is the single highest-signal bot check there is,
         * and it has to be an O(1) lookup or it will not be run on every submission.
         *
         * A human writing about two different proteins does not produce byte-identical prose. A
         * script pasting the same enthusiastic paragraph across forty listings does, and that is
         * the shape of review farming everywhere it has ever been studied.
         */
        $this->safeAdd('reviews', 'text_hash', fn (Blueprint $t) => $t->char('text_hash', 40)->nullable()->index());
        $this->safeAdd('reviews', 'points_awarded', fn (Blueprint $t) => $t->boolean('points_awarded')->default(false)->index());

        $this->safeAdd('user_point_transactions', 'review_id', fn (Blueprint $t) => $t->unsignedBigInteger('review_id')->nullable()->index());
    }

    private function safeAdd(string $table, string $column, \Closure $add): void
    {
        try {
            if (Schema::hasTable($table) && ! Schema::hasColumn($table, $column)) {
                Schema::table($table, $add);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("migration add {$table}.{$column} failed (continuing)", ['error' => $e->getMessage()]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('reviews')) {
            Schema::table('reviews', function (Blueprint $table) {
                foreach (['authenticity_score', 'authenticity_signals', 'compose_ms', 'points_awarded', 'text_hash'] as $col) {
                    if (Schema::hasColumn('reviews', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('user_point_transactions') && Schema::hasColumn('user_point_transactions', 'review_id')) {
            Schema::table('user_point_transactions', function (Blueprint $table) {
                $table->dropColumn('review_id');
            });
        }
    }
};
