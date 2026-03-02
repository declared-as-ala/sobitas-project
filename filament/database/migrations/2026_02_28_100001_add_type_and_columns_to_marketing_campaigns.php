<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('marketing_campaigns')) {
            return;
        }

        Schema::table('marketing_campaigns', function (Blueprint $table) {
            if (! Schema::hasColumn('marketing_campaigns', 'type')) {
                $table->string('type', 10)->default('email')->after('id');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'template_key')) {
                $table->string('template_key', 64)->nullable()->after('type');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'template_vars')) {
                $table->json('template_vars')->nullable()->after('template_key');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'subject')) {
                $table->string('subject')->nullable()->after('template_vars');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'body_override')) {
                $table->text('body_override')->nullable()->after('subject');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'recipients')) {
                $table->json('recipients')->after('body_override');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'total')) {
                $table->unsignedInteger('total')->default(0)->after('recipients');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'sent')) {
                $table->unsignedInteger('sent')->default(0)->after('total');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'failed')) {
                $table->unsignedInteger('failed')->default(0)->after('sent');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'status')) {
                $table->string('status', 20)->default('queued')->after('failed');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'started_at')) {
                $table->timestamp('started_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('marketing_campaigns', 'finished_at')) {
                $table->timestamp('finished_at')->nullable()->after('started_at');
            }
        });
    }

    public function down(): void
    {
        // Optional: drop added columns; leave table as-is for safety
    }
};
