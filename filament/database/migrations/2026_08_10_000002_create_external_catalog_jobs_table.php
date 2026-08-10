<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per import run, so an interrupted 20,000-product import resumes instead of restarting.
 *
 * ── WHAT THIS TABLE IS AND IS NOT ─────────────────────────────────────────────────────────
 * It is NOT the resume mechanism. Resume lives on `external_catalog_products.status`: work is
 * selected by querying for rows in a state, so a worker that dies mid-batch loses nothing — the
 * rows it had not finished are still `queued`, and the next worker picks them up. A cursor stored
 * here and nowhere else would be exactly the fragile design the owner asked to avoid.
 *
 * This table is the OBSERVABILITY and CONTROL surface: what is running, how far it got, what failed,
 * and the pause/cancel flag a long run checks between batches. The counters are what the admin
 * dashboard reads, so progress is measured rather than animated — 12,847/28,430 has to be a fact.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('external_catalog_jobs')) {
            return;
        }

        Schema::create('external_catalog_jobs', function (Blueprint $table): void {
            $table->id();

            $table->string('provider', 20)->default('iherb');
            // discover | hydrate | promote | sync
            $table->string('kind', 20);
            // pending | discovering | running | paused | completed | failed | cancelled
            $table->string('status', 20)->default('pending');

            // Free-form resume hint for the phase that has one (e.g. which sitemap file was last
            // read). Row status remains the authority for per-product work.
            $table->string('cursor', 255)->nullable();

            $table->unsignedInteger('discovered')->default(0);
            $table->unsignedInteger('queued')->default(0);
            $table->unsignedInteger('processed')->default(0);
            $table->unsignedInteger('created')->default(0);
            $table->unsignedInteger('updated')->default(0);
            $table->unsignedInteger('skipped')->default(0);
            $table->unsignedInteger('failed')->default(0);

            // Bounded: the last N failures with their reason. A job row must stay small enough to
            // read in the admin — the full failure detail lives on each product row's status_reason.
            $table->json('errors')->nullable();
            $table->json('options')->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('heartbeat_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['provider', 'kind', 'status'], 'ecj_provider_kind_status_index');
            $table->index('status', 'ecj_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_catalog_jobs');
    }
};
