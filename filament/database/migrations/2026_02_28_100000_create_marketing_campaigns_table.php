<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('marketing_campaigns')) {
            return;
        }

        Schema::create('marketing_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('type', 10); // email | sms
            $table->string('template_key', 64)->nullable();
            $table->json('template_vars')->nullable();
            $table->string('subject')->nullable();
            $table->text('body_override')->nullable();
            $table->json('recipients'); // [{email|phone_1, client_id}, ...]
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('sent')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->string('status', 20)->default('queued'); // queued | sending | done | failed | cancelled
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_campaigns');
    }
};
