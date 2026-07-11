<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The `redirections` table backs App\Models\Redirection + RedirectionResource (admin can define
 * 301/302/410 rules) and the /api/redirections endpoint the frontend middleware consults to fix
 * the "Not found (404)" bucket in Search Console.
 *
 * The Redirection model + Filament resource already shipped, but no migration ever created the
 * table — so /api/redirections 500'd. This migration is IDEMPOTENT on purpose: on the live DB the
 * table may already have been hand-created (which is why the API errored on a column mismatch), so
 * we create it only if absent and otherwise just add any missing columns. Never destructive on up().
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('redirections')) {
            Schema::create('redirections', function (Blueprint $table) {
                $table->id();
                $table->string('old_url', 500);
                $table->string('new_url', 500)->nullable(); // null for 410 (Gone)
                $table->unsignedSmallInteger('code')->default(301); // 301 | 302 | 410
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->index('old_url');
            });

            return;
        }

        // Table pre-exists (possibly hand-created) — reconcile the columns the app needs without
        // touching existing data. We standardise on `code` (what RedirectionResource writes).
        Schema::table('redirections', function (Blueprint $table) {
            if (! Schema::hasColumn('redirections', 'old_url')) {
                $table->string('old_url', 500)->nullable();
            }
            if (! Schema::hasColumn('redirections', 'new_url')) {
                $table->string('new_url', 500)->nullable();
            }
            if (! Schema::hasColumn('redirections', 'code')) {
                $table->unsignedSmallInteger('code')->default(301);
            }
            if (! Schema::hasColumn('redirections', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
            if (! Schema::hasColumn('redirections', 'created_at')) {
                $table->timestamps();
            }
        });
    }

    public function down(): void
    {
        // Deliberate rollback only. Guarded so a stray rollback can't error on an already-absent table.
        Schema::dropIfExists('redirections');
    }
};
