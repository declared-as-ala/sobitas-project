<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One official brand video per product.
 *
 * ── WHY A COLUMN AND NOT AN EMBED IN THE DESCRIPTION ──────────────────────────────────────
 * The obvious implementation is to let someone paste an <iframe> into description_fr. That is also
 * how a product page that takes payment acquires an arbitrary third-party frame: the HTML sanitiser
 * forbids iframes outright precisely because a description field is reachable by an importer, and
 * an iframe is a full execution context wearing a video's clothes.
 *
 * So the video is stored as an IDENTIFIER — eleven characters we validate — and the markup is
 * written by our own component. Nothing that arrives from outside becomes markup.
 *
 * ── WHY "OFFICIAL" IS PART OF THE DATA ────────────────────────────────────────────────────
 * A review of a product is not the manufacturer's video. Embedding a random YouTuber's opinion on
 * our own product page hands our page to their claims, which we have not checked and cannot stand
 * behind. The channel is recorded so that "is this actually the brand?" stays an answerable
 * question after the person who added it has gone.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products') || Schema::hasColumn('products', 'official_video')) {
            return;
        }

        Schema::table('products', function (Blueprint $table): void {
            // {youtube_id, title, channel, source_url, verified_at}
            $table->json('official_video')->nullable()->after('nutrition_facts');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'official_video')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->dropColumn('official_video');
            });
        }
    }
};
