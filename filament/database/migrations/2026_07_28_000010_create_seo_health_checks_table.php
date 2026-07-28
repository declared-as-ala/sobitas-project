<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stores the result of each automated SEO health check run.
 *
 * The point is REGRESSION DETECTION, not a pretty dashboard. Every serious problem found in this
 * codebase's SEO audit was invisible until someone looked with the right user-agent:
 *   - robots.txt silently forbade Googlebot from fetching any product image
 *   - four CMS pages declared sobitas.tn as their canonical
 *   - /pack-builder answered 200 to browsers and 404 to Googlebot
 *   - category pages served crawlers ~11% of their content
 *   - every product asserted a fabricated AggregateRating
 * None of those threw an error, appeared in a log, or failed a build. They were pure silence.
 *
 * Persisting each run lets the monitor compare against the PREVIOUS run and shout when a number
 * moves the wrong way — a sitemap that loses 200 URLs overnight is a catastrophe that no
 * absolute-threshold check would catch.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('seo_health_checks')) {
            return;
        }

        Schema::create('seo_health_checks', function (Blueprint $table) {
            $table->id();
            // Stable identifier for the check, e.g. "canonical_health". Compared run-over-run.
            $table->string('check', 64)->index();
            $table->string('status', 16); // pass | warn | fail
            $table->string('summary', 500);
            // Numeric value the check produced (URL count, failure count…), for trend comparison.
            $table->integer('value')->nullable();
            // Full detail: failing URLs, measured values, whatever the check gathered.
            $table->json('details')->nullable();
            $table->timestamps();

            $table->index(['check', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_health_checks');
    }
};
