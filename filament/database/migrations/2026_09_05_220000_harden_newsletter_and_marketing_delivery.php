<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('newsletters', function (Blueprint $table): void {
            if (! Schema::hasColumn('newsletters', 'confirmed_at')) {
                $table->timestamp('confirmed_at')->nullable()->index()->after('email');
            }
            if (! Schema::hasColumn('newsletters', 'confirmation_token_hash')) {
                $table->string('confirmation_token_hash', 64)->nullable()->after('confirmed_at');
            }
            if (! Schema::hasColumn('newsletters', 'confirmation_sent_at')) {
                $table->timestamp('confirmation_sent_at')->nullable()->after('confirmation_token_hash');
            }
            if (! Schema::hasColumn('newsletters', 'unsubscribed_at')) {
                $table->timestamp('unsubscribed_at')->nullable()->index()->after('confirmation_sent_at');
            }
            if (! Schema::hasColumn('newsletters', 'source')) {
                $table->string('source', 32)->default('storefront')->after('unsubscribed_at');
            }
        });

        // These rows came from the newsletter form itself. Preserve that explicit subscription
        // rather than forcing every existing subscriber through a surprise reconfirmation.
        $confirmedAt = Schema::hasColumn('newsletters', 'created_at')
            ? DB::raw('COALESCE(created_at, CURRENT_TIMESTAMP)')
            : now();
        DB::table('newsletters')->whereNull('confirmed_at')->update(['confirmed_at' => $confirmedAt]);

        Schema::table('marketing_campaigns', function (Blueprint $table): void {
            if (! Schema::hasColumn('marketing_campaigns', 'automation_key')) {
                $table->string('automation_key', 100)->nullable()->unique()->after('id');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'skipped')) {
                $table->unsignedInteger('skipped')->default(0)->after('failed');
            }
        });

        Schema::table('marketing_logs', function (Blueprint $table): void {
            if (! Schema::hasColumn('marketing_logs', 'idempotency_key')) {
                $table->string('idempotency_key', 100)->nullable()->unique()->after('id');
            }
        });
    }

    public function down(): void
    {
        // Delivery and consent history is business evidence. A rollback must not erase it.
    }
};
