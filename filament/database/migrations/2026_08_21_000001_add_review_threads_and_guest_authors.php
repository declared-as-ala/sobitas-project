<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ── AN AVIS BECOMES A CONVERSATION, AND A GUEST CAN START ONE ───────────────────────────────
 * Owner, 21/08/2026: *"make it an advanced reviews system, where users can put a review and other
 * users can reply on them … and make a system for anonymous reviews without an account."*
 *
 * Two additions, and they are deliberately separate things:
 *
 *   reviews.author_name / author_email   a review written by somebody with no account. `user_id`
 *                                        stays null and the display name lives on the row itself.
 *   review_replies                       the thread under a review.
 *
 * ── WHY author_email IS HERE AND WILL NEVER BE SENT TO THE BROWSER ──────────────────────────
 * It is not a contact detail we want; it is the only handle on a guest author. It lets an admin
 * answer a complaint, lets the moderator see one person posting eight reviews in a minute, and
 * lets a future "confirm your review" mail exist. Every API response in this codebase selects
 * columns explicitly for reviews (`ApisController` line ~732) and the reply endpoints do the same,
 * so the column is unreachable from the storefront by construction. Do not add it to a `select *`.
 *
 * `ip_hash` is a SHA-256 of the address plus the app key, never the address. It answers "is this
 * the same submitter as the last three" without the shop storing anybody's IP in clear.
 *
 * ── WHY replies ARE THEIR OWN TABLE AND NOT A parent_id ON reviews ──────────────────────────
 * A review carries a STAR RATING and feeds `Review::scopeAttested`, which feeds the product's
 * aggregateRating and its JSON-LD. A reply carries no rating and must never touch any of that.
 * Modelling replies as reviews-with-a-parent would put rows with no stars inside the one query
 * Google reads, and every aggregate in the codebase would need a `whereNull('parent_id')` added to
 * it — a guarantee that holds only as long as nobody forgets. A separate table cannot be forgotten.
 *
 * `parent_id` inside review_replies is one level of ATTRIBUTION, not a tree: it records which reply
 * is being answered so the UI can show "en réponse à …". Rendering stays two levels deep. Unbounded
 * nesting on a phone is unreadable, and it is the thing that turns a product page into a forum.
 *
 * Idempotent and independently guarded, exactly like the two review migrations before it: a single
 * ADD COLUMN failure on this legacy database must never abort `migrate --force` and block every
 * later migration in the chain.
 */
return new class extends Migration
{
    public function up(): void
    {
        // NO ->after(): the legacy `reviews` table's column order is not what a fresh install
        // would produce, and a missing after-target makes ADD COLUMN throw. Position is cosmetic.
        $this->safeAdd('reviews', 'author_name', fn (Blueprint $t) => $t->string('author_name', 60)->nullable());
        $this->safeAdd('reviews', 'author_email', fn (Blueprint $t) => $t->string('author_email', 190)->nullable());
        $this->safeAdd('reviews', 'ip_hash', fn (Blueprint $t) => $t->string('ip_hash', 64)->nullable()->index());

        if (Schema::hasTable('review_replies')) {
            return;
        }

        try {
            Schema::create('review_replies', function (Blueprint $table) {
                $table->id();

                // No foreign key constraint, deliberately. `reviews` is a legacy MyISAM-era table
                // on this database and the rest of the schema links to it by plain indexed column
                // (see reviews.commande_id). An FK here would fail to create on some environments
                // and take the whole migration with it. Orphans are swept, not prevented.
                $table->unsignedBigInteger('review_id')->index();
                $table->unsignedBigInteger('parent_id')->nullable()->index();

                $table->unsignedBigInteger('user_id')->nullable()->index();
                $table->string('author_name', 60)->nullable();
                $table->string('author_email', 190)->nullable();

                $table->text('body');

                // Held by default. Publishing is a decision made by ReviewReplyObserver from the
                // moderator's verdict plus config, never by the shape of the insert — the same
                // posture the reviews table has after the 07_28 unpublish migration.
                $table->boolean('publier')->default(false)->index();

                // A reply written from the admin panel. Rendered as "Protein.tn" with a badge, and
                // always published: it is the shop speaking, and it is the single most valuable
                // reply on any product page.
                $table->boolean('is_staff')->default(false);

                $table->json('ai_moderation')->nullable();
                $table->timestamp('ai_checked_at')->nullable();
                $table->string('ip_hash', 64)->nullable()->index();

                $table->timestamps();

                // The one query the storefront makes: published replies of one review, oldest
                // first so a conversation reads top to bottom.
                $table->index(['review_id', 'publier', 'created_at'], 'idx_replies_thread');
            });
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('migration create review_replies failed (continuing)', ['error' => $e->getMessage()]);
        }
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
        Schema::dropIfExists('review_replies');

        if (! Schema::hasTable('reviews')) {
            return;
        }

        Schema::table('reviews', function (Blueprint $table) {
            foreach (['author_name', 'author_email', 'ip_hash'] as $col) {
                if (Schema::hasColumn('reviews', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
